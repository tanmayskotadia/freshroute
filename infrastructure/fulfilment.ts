import { Duration, RemovalPolicy, CfnParameter, CfnOutput } from "aws-cdk-lib";
import type { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sources from "aws-cdk-lib/aws-lambda-event-sources";
import type * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import type * as s3 from "aws-cdk-lib/aws-s3";
import type * as cognito from "aws-cdk-lib/aws-cognito";
export function provisionFulfilment(
  scope: Construct,
  props: {
    activity: dynamodb.Table;
    reports: s3.Bucket;
    code: lambda.Code;
    api: lambda.Function;
    apiRole: iam.Role;
    pool: cognito.UserPool;
  },
) {
  const email = new CfnParameter(scope, "RescueNotificationEmail", {
    type: "String",
    noEcho: true,
    description: "Authorized project recipient; SNS confirmation is required.",
    allowedPattern: "[^@\\s]+@[^@\\s]+\\.[^@\\s]+",
  });
  const topic = new sns.Topic(scope, "RescueUpdates", {
    topicName: "FreshRouteRescueUpdates",
    displayName: "FreshRoute rescue updates",
    enforceSSL: true,
  });
  new sns.CfnSubscription(scope, "RescueEmail", {
    topicArn: topic.topicArn,
    protocol: "email",
    endpoint: email.valueAsString,
    filterPolicy: { recipientEmail: [email.valueAsString] },
    filterPolicyScope: "MessageAttributes",
  });
  const deadLetter = new sqs.Queue(scope, "PostDecisionDeadLetter", {
    queueName: "FreshRoutePostDecisionDLQ",
    retentionPeriod: Duration.days(14),
    encryption: sqs.QueueEncryption.SQS_MANAGED,
    enforceSSL: true,
  });
  const streamFailures = new sqs.Queue(scope, "OutboxStreamFailures", {
    queueName: "FreshRouteOutboxStreamFailures",
    retentionPeriod: Duration.days(14),
    encryption: sqs.QueueEncryption.SQS_MANAGED,
    enforceSSL: true,
  });
  const queue = new sqs.Queue(scope, "PostDecisionQueue", {
    queueName: "FreshRoutePostDecision",
    visibilityTimeout: Duration.seconds(270),
    retentionPeriod: Duration.days(4),
    encryption: sqs.QueueEncryption.SQS_MANAGED,
    enforceSSL: true,
    deadLetterQueue: { queue: deadLetter, maxReceiveCount: 3 },
  });
  function worker(
    id: string,
    handler: string,
    environment: Record<string, string>,
    timeout: number,
  ) {
    const group = new logs.LogGroup(scope, `${id}Logs`, {
      logGroupName: `/freshroute/${id.toLowerCase()}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const role = new iam.Role(scope, `${id}Role`, {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    group.grantWrite(role);
    const fn = new lambda.Function(scope, id, {
      functionName: `FreshRoute${id}`,
      handler,
      code: props.code,
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      role,
      logGroup: group,
      memorySize: 256,
      timeout: Duration.seconds(timeout),
      environment,
    });
    return { fn, role };
  }
  const bridge = worker(
    "OutboxBridge",
    "outboxBridge.handler",
    { POST_DECISION_QUEUE_URL: queue.queueUrl },
    30,
  );
  queue.grantSendMessages(bridge.role);
  bridge.fn.addEventSource(
    new sources.DynamoEventSource(props.activity, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      batchSize: 10,
      retryAttempts: 3,
      maxRecordAge: Duration.hours(1),
      bisectBatchOnError: true,
      reportBatchItemFailures: true,
      onFailure: new sources.SqsDlq(streamFailures),
      filters: [
        lambda.FilterCriteria.filter({
          eventName: lambda.FilterRule.isEqual("INSERT"),
          dynamodb: {
            NewImage: { kind: { S: lambda.FilterRule.isEqual("outbox") } },
          },
        }),
      ],
    }),
  );
  const processor = worker(
    "PostDecisionWorker",
    "postDecisionWorker.handler",
    {
      ACTIVITY_TABLE: props.activity.tableName,
      REPORTS_BUCKET: props.reports.bucketName,
      USER_POOL_ID: props.pool.userPoolId,
      RESCUE_TOPIC_ARN: topic.topicArn,
    },
    45,
  );
  processor.role.addToPolicy(
    new iam.PolicyStatement({
      actions: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"],
      resources: [props.activity.tableArn],
    }),
  );
  props.reports.grantPut(processor.role, "exports/*");
  topic.grantPublish(processor.role);
  processor.role.addToPolicy(
    new iam.PolicyStatement({
      actions: ["cognito-idp:AdminGetUser"],
      resources: [props.pool.userPoolArn],
    }),
  );
  processor.fn.addEventSource(
    new sources.SqsEventSource(queue, {
      batchSize: 1,
      maxConcurrency: 2,
      reportBatchItemFailures: true,
    }),
  );
  props.reports.grantRead(props.apiRole, "exports/*");
  props.api.addEnvironment("REPORTS_BUCKET", props.reports.bucketName);
  new CfnOutput(scope, "RescueTopicArn", { value: topic.topicArn });
  new CfnOutput(scope, "PostDecisionQueueUrl", { value: queue.queueUrl });
  new CfnOutput(scope, "PostDecisionDLQUrl", { value: deadLetter.queueUrl });
  new CfnOutput(scope, "OutboxFailureQueueUrl", {
    value: streamFailures.queueUrl,
  });
}
