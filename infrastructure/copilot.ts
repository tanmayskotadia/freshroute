import {
  Duration,
  RemovalPolicy,
  CfnOutput,
  Stack,
  CfnParameter,
  CfnCondition,
  Fn,
} from "aws-cdk-lib";
import type { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import type * as dynamodb from "aws-cdk-lib/aws-dynamodb";
export function provisionCopilot(
  scope: Construct,
  props: {
    code: lambda.Code;
    runs: dynamodb.Table;
    activity: dynamodb.Table;
    clientId: string;
    poolId: string;
  },
) {
  const provider = new CfnParameter(scope, "AiProvider", {
    type: "String",
    default: "groq",
    allowedValues: ["groq", "bedrock"],
  });
  const model = new CfnParameter(scope, "AiModelId", {
    type: "String",
    default: "openai/gpt-oss-20b",
  });
  const usesKey = new CfnCondition(scope, "AiUsesApiKey", {
    expression: Fn.conditionEquals(provider.valueAsString, "groq"),
  });
  const group = new logs.LogGroup(scope, "CopilotLogs", {
    logGroupName: "/freshroute/copilot",
    retention: logs.RetentionDays.ONE_WEEK,
    removalPolicy: RemovalPolicy.DESTROY,
  });
  const role = new iam.Role(scope, "CopilotRole", {
    assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    description:
      "Copilot reads saved runs; writes only AI cache and quota partitions; cannot mutate workspaces or capacity.",
  });
  group.grantWrite(role);
  role.addToPolicy(
    new iam.PolicyStatement({
      actions: ["dynamodb:GetItem"],
      resources: [props.runs.tableArn, props.activity.tableArn],
    }),
  );
  role.addToPolicy(
    new iam.PolicyStatement({
      actions: ["dynamodb:PutItem", "dynamodb:UpdateItem"],
      resources: [props.activity.tableArn],
      conditions: {
        "ForAllValues:StringLike": { "dynamodb:LeadingKeys": ["AI#*"] },
        Null: { "dynamodb:LeadingKeys": "false" },
      },
    }),
  );
  role.addToPolicy(
    new iam.PolicyStatement({
      actions: ["bedrock:InvokeModel"],
      resources: [
        `arn:aws:bedrock:${Stack.of(scope).region}:${Stack.of(scope).account}:inference-profile/apac.amazon.nova-micro-v1:0`,
        ...[
          "ap-south-1",
          "ap-southeast-1",
          "ap-southeast-2",
          "ap-northeast-1",
          "ap-northeast-2",
          "ap-northeast-3",
        ].map(
          (r) =>
            `arn:aws:bedrock:${r}::foundation-model/amazon.nova-micro-v1:0`,
        ),
      ],
    }),
  );
  const fn = new lambda.Function(scope, "Copilot", {
    functionName: "FreshRouteCopilot",
    runtime: lambda.Runtime.NODEJS_24_X,
    architecture: lambda.Architecture.ARM_64,
    code: props.code,
    handler: "copilot.handler",
    role,
    logGroup: group,
    memorySize: 256,
    timeout: Duration.seconds(18),
    environment: {
      RUNS_TABLE: props.runs.tableName,
      ACTIVITY_TABLE: props.activity.tableName,
      CLIENT_ID: props.clientId,
      USER_POOL_ID: props.poolId,
      BEDROCK_MODEL_ID: "apac.amazon.nova-micro-v1:0",
      AI_PROVIDER: provider.valueAsString,
      AI_MODEL_ID: model.valueAsString,
      AI_API_KEY: Fn.conditionIf(
        usesKey.logicalId,
        "{{resolve:secretsmanager:freshroute/copilot-api-key:SecretString:apiKey}}",
        "",
      ).toString(),
    },
  });
  new CfnOutput(scope, "CopilotFunctionName", { value: fn.functionName });
  return fn;
}
