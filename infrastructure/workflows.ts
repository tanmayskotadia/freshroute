import { Duration, RemovalPolicy, Stack, ArnFormat } from "aws-cdk-lib";
import type { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as sources from "aws-cdk-lib/aws-lambda-event-sources";
import type * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import type * as s3 from "aws-cdk-lib/aws-s3";
export function provisionWorkflows(
  scope: Construct,
  props: {
    tables: Record<string, dynamodb.Table>;
    data: s3.Bucket;
    code: lambda.Code;
    api: lambda.Function;
    apiRole: iam.Role;
  },
) {
  const environment = {
    DATA_BUCKET: props.data.bucketName,
    ...Object.fromEntries(
      Object.entries(props.tables).map(([name, table]) => [
        name.toUpperCase() + "_TABLE",
        table.tableName,
      ]),
    ),
  };
  function worker(id: string, handler: string) {
    const group = new logs.LogGroup(scope, `${id}Logs`, {
      logGroupName: `/freshroute/${id.toLowerCase()}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const role = new iam.Role(scope, `${id}Role`, {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    group.grantWrite(role);
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
        ],
        resources: Object.values(props.tables).map((t) => t.tableArn),
      }),
    );
    const fn = new lambda.Function(scope, id, {
      functionName: `FreshRoute${id}`,
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      code: props.code,
      handler,
      role,
      logGroup: group,
      memorySize: 256,
      timeout: Duration.seconds(30),
      environment,
    });
    return { fn, role };
  }
  const dlq = new sqs.Queue(scope, "ImportDeadLetter", {
    queueName: "FreshRouteImportDLQ",
    retentionPeriod: Duration.days(14),
    enforceSSL: true,
    encryption: sqs.QueueEncryption.SQS_MANAGED,
  });
  const queue = new sqs.Queue(scope, "ImportQueue", {
    queueName: "FreshRouteImports",
    visibilityTimeout: Duration.seconds(180),
    retentionPeriod: Duration.days(4),
    deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },
    enforceSSL: true,
    encryption: sqs.QueueEncryption.SQS_MANAGED,
  });
  const importer = worker("ImportWorker", "importWorker.handler");
  importer.role.addToPolicy(
    new iam.PolicyStatement({
      actions: ["s3:GetObjectVersion"],
      resources: [props.data.arnForObjects("quarantine/*")],
    }),
  );
  importer.fn.addEventSource(
    new sources.SqsEventSource(queue, {
      batchSize: 1,
      reportBatchItemFailures: true,
      maxConcurrency: 2,
    }),
  );
  const calculator = worker("AnalysisWorker", "analysisWorker.handler");
  const payload = (action: string) =>
    sfn.TaskInput.fromObject({
      action,
      owner: sfn.JsonPath.stringAt("$.owner"),
      jobId: sfn.JsonPath.stringAt("$.jobId"),
    });
  const validate = new tasks.LambdaInvoke(scope, "ValidateAnalysisInputs", {
    lambdaFunction: calculator.fn,
    payload: payload("validate"),
    payloadResponseOnly: true,
  });
  const calculate = new tasks.LambdaInvoke(scope, "CalculateAndPersist", {
    lambdaFunction: calculator.fn,
    payload: payload("calculate"),
    payloadResponseOnly: true,
  });
  calculate.addRetry({
    errors: ["WorkspaceConflict"],
    interval: Duration.seconds(1),
    maxAttempts: 3,
    backoffRate: 2,
  });
  const fail = new tasks.LambdaInvoke(scope, "RecordAnalysisFailure", {
    lambdaFunction: calculator.fn,
    payload: payload("fail"),
    payloadResponseOnly: true,
  });
  const failed = new sfn.Fail(scope, "AnalysisFailed", {
    error: "AnalysisFailed",
    cause: "Inspect the owner-scoped job for safe error details.",
  });
  fail.next(failed);
  validate.addCatch(fail, { errors: ["States.ALL"], resultPath: "$.failure" });
  calculate.addCatch(fail, { errors: ["States.ALL"], resultPath: "$.failure" });
  const group = new logs.LogGroup(scope, "AnalysisWorkflowLogs", {
    logGroupName: "/freshroute/analysis-workflow",
    retention: logs.RetentionDays.ONE_WEEK,
    removalPolicy: RemovalPolicy.DESTROY,
  });
  const workflowRole = new iam.Role(scope, "AnalysisWorkflowRole", {
    assumedBy: new iam.ServicePrincipal("states.amazonaws.com", {
      conditions: {
        StringEquals: { "aws:SourceAccount": Stack.of(scope).account },
        ArnLike: {
          "aws:SourceArn": Stack.of(scope).formatArn({
            service: "states",
            resource: "stateMachine",
            resourceName: "FreshRouteAnalysis",
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          }),
        },
      },
    }),
  });
  const machine = new sfn.StateMachine(scope, "AnalysisWorkflow", {
    role: workflowRole,
    stateMachineName: "FreshRouteAnalysis",
    stateMachineType: sfn.StateMachineType.STANDARD,
    definitionBody: sfn.DefinitionBody.fromChainable(
      validate
        .next(calculate)
        .next(new sfn.Succeed(scope, "AnalysisCompleted")),
    ),
    timeout: Duration.minutes(3),
    logs: {
      destination: group,
      level: sfn.LogLevel.ALL,
      includeExecutionData: false,
    },
  });
  machine.grantStartExecution(props.apiRole);
  queue.grantSendMessages(props.apiRole);
  props.apiRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ["s3:PutObject", "s3:GetObject", "s3:GetObjectVersion"],
      resources: [props.data.arnForObjects("quarantine/*")],
    }),
  );
  props.apiRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ["dynamodb:Query"],
      resources: [`${props.tables.Activity.tableArn}/index/JobsByOwnerTime`],
    }),
  );
  props.api.addEnvironment("DATA_BUCKET", props.data.bucketName);
  props.api.addEnvironment("IMPORT_QUEUE_URL", queue.queueUrl);
  props.api.addEnvironment(
    "ANALYSIS_STATE_MACHINE_ARN",
    machine.stateMachineArn,
  );
  return { machine, queue, dlq };
}
