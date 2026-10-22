import { provisionWorkflows } from "./workflows.ts";
import { provisionFulfilment } from "./fulfilment.ts";
import { readFileSync } from "node:fs";
import {
  App,
  Stack,
  Duration,
  RemovalPolicy,
  CfnOutput,
  Tags,
  CfnParameter,
  BootstraplessSynthesizer,
} from "aws-cdk-lib";
import type { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kms from "aws-cdk-lib/aws-kms";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";

const account = process.env.FRESHROUTE_ACCOUNT || "118462784511";
const region = process.env.FRESHROUTE_REGION || "ap-south-1";
class Foundation extends Stack {
  buckets: Record<string, s3.Bucket> = {};
  tables: Record<string, dynamodb.Table> = {};
  website!: string;
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      env: { account, region },
      synthesizer: new BootstraplessSynthesizer(),
      terminationProtection: true,
      description: "FreshRoute Phase 4 retained storage and encryption",
    });
    const key = new kms.Key(this, "DataKey", {
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN,
      description: "FreshRoute reports and audit encryption",
    });
    for (const name of ["web", "data", "reports", "audit"]) {
      const bucket = new s3.Bucket(this, name, {
        bucketName: `freshroute-${account}-${region}-${name}`,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        versioned: true,
        objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
        encryption: ["reports", "audit"].includes(name)
          ? s3.BucketEncryption.KMS
          : s3.BucketEncryption.S3_MANAGED,
        encryptionKey: ["reports", "audit"].includes(name) ? key : undefined,
        bucketKeyEnabled: ["reports", "audit"].includes(name),
        removalPolicy: RemovalPolicy.RETAIN,
        lifecycleRules:
          name === "data"
            ? [
                {
                  id: "ExpireQuarantine",
                  prefix: "quarantine/",
                  expiration: Duration.days(7),
                  noncurrentVersionExpiration: Duration.days(7),
                  abortIncompleteMultipartUploadAfter: Duration.days(1),
                },
              ]
            : name === "reports"
              ? [
                  {
                    id: "ExpireReports",
                    prefix: "exports/",
                    expiration: Duration.days(30),
                    noncurrentVersionExpiration: Duration.days(30),
                  },
                ]
              : name === "audit"
                ? [
                    {
                      id: "AuditArchive",
                      prefix: "audit/",
                      transitions: [
                        {
                          storageClass:
                            s3.StorageClass.GLACIER_INSTANT_RETRIEVAL,
                          transitionAfter: Duration.days(90),
                        },
                      ],
                    },
                  ]
                : [
                    {
                      id: "OldWebVersions",
                      noncurrentVersionExpiration: Duration.days(30),
                    },
                  ],
      });
      this.buckets[name] = bucket;
      new CfnOutput(this, `${name}Bucket`, { value: bucket.bucketName });
    }
    for (const name of ["Shipments", "Runs", "Destinations", "Activity"]) {
      const table = new dynamodb.Table(this, name, {
        tableName: `FreshRoute${name}`,
        partitionKey: { name: "owner", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "id", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        encryption: dynamodb.TableEncryption.AWS_MANAGED,
        pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
        deletionProtection: true,
        stream:
          name === "Activity" ? dynamodb.StreamViewType.NEW_IMAGE : undefined,
        removalPolicy: RemovalPolicy.RETAIN,
      });
      if (name === "Activity")
        table.addGlobalSecondaryIndex({
          indexName: "JobsByOwnerTime",
          partitionKey: { name: "owner", type: dynamodb.AttributeType.STRING },
          sortKey: {
            name: "jobCreatedAt",
            type: dynamodb.AttributeType.STRING,
          },
          projectionType: dynamodb.ProjectionType.ALL,
        });
      this.tables[name] = table;
      new CfnOutput(this, `${name}Table`, { value: table.tableName });
    }
    new CfnOutput(this, "EncryptionKey", { value: key.keyArn });
    if (this.node.tryGetContext("cloudFront") === "enabled") {
      const router = new cloudfront.Function(this, "SpaRoutes", {
        code: cloudfront.FunctionCode.fromInline(
          "function handler(event) { var r = event.request; if (r.uri === '/' || /^\\/(overview|shipments|rescue|runs|network|history|settings|evidence|welcome|sign-in|auth|operations|fulfilment)(\\/|$)/.test(r.uri) && !/\\.[^/]+$/.test(r.uri)) r.uri = '/index.html'; return r; }",
        ),
        runtime: cloudfront.FunctionRuntime.JS_2_0,
      });
      const responseHeaders = new cloudfront.ResponseHeadersPolicy(
        this,
        "WebHeaders",
        {
          securityHeadersBehavior: {
            contentSecurityPolicy: {
              contentSecurityPolicy:
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://*.amazonaws.com https://*.amazoncognito.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
              override: true,
            },
            contentTypeOptions: { override: true },
            frameOptions: {
              frameOption: cloudfront.HeadersFrameOption.DENY,
              override: true,
            },
            strictTransportSecurity: {
              accessControlMaxAge: Duration.days(365),
              includeSubdomains: true,
              override: true,
            },
            referrerPolicy: {
              referrerPolicy: cloudfront.HeadersReferrerPolicy.NO_REFERRER,
              override: true,
            },
          },
        },
      );
      const origin = origins.S3BucketOrigin.withOriginAccessControl(
        this.buckets.web,
      );
      const base = {
        origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: responseHeaders,
        compress: true,
      };
      const distribution = new cloudfront.Distribution(this, "Web", {
        defaultRootObject: "index.html",
        priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
        defaultBehavior: {
          ...base,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          functionAssociations: [
            {
              function: router,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
        additionalBehaviors: {
          "cloud-config.json": {
            ...base,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          },
          "index.html": {
            ...base,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          },
        },
      });
      this.website = `https://${distribution.distributionDomainName}`;
      new CfnOutput(this, "WebsiteUrl", { value: this.website });
      new CfnOutput(this, "DistributionId", {
        value: distribution.distributionId,
      });
    } else {
      const webLogs = new logs.LogGroup(this, "FallbackWebLogs", {
        logGroupName: "/freshroute/web",
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      });
      const webRole = new iam.Role(this, "FallbackWebRole", {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        description: "Public static frontend reads only the private web bucket",
      });
      webLogs.grantWrite(webRole);
      this.buckets.web.grantRead(webRole);
      const webFunction = new lambda.Function(this, "FallbackWebFunction", {
        functionName: "FreshRouteWeb",
        runtime: lambda.Runtime.NODEJS_24_X,
        architecture: lambda.Architecture.ARM_64,
        code: lambda.Code.fromInline(
          readFileSync(
            new URL("../server/static.cjs", import.meta.url),
            "utf8",
          ),
        ),
        handler: "index.handler",
        role: webRole,
        logGroup: webLogs,
        memorySize: 256,
        timeout: Duration.seconds(15),
        environment: { WEB_BUCKET: this.buckets.web.bucketName },
      });
      const frontDoor = new apigw.HttpApi(this, "FallbackWebApi", {
        apiName: "FreshRouteHttpsWeb",
        defaultIntegration: new HttpLambdaIntegration("StaticWeb", webFunction),
      });
      const webStage = frontDoor.defaultStage!.node
        .defaultChild as apigw.CfnStage;
      webStage.defaultRouteSettings = {
        throttlingBurstLimit: 30,
        throttlingRateLimit: 15,
      };
      this.website = frontDoor.apiEndpoint;
      new CfnOutput(this, "WebsiteUrl", { value: this.website });
      new CfnOutput(this, "HostingMode", {
        value:
          "API Gateway HTTPS fallback; CloudFront requires account verification",
      });
    }
    this.buckets.data.addCorsRule({
      allowedOrigins: [
        this.website,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
      ],
      allowedMethods: [s3.HttpMethods.PUT],
      allowedHeaders: ["*"],
      exposedHeaders: ["ETag", "x-amz-version-id"],
      maxAge: 300,
    });
  }
}
class Application extends Stack {
  constructor(scope: Construct, id: string, foundation: Foundation) {
    super(scope, id, {
      env: { account, region },
      synthesizer: new BootstraplessSynthesizer(),
      description: "FreshRoute Phase 4 authenticated serverless application",
    });
    const artifactVersion = new CfnParameter(this, "ApiArtifactVersion", {
      type: "String",
    });
    const artifactKey = new CfnParameter(this, "ApiArtifactKey", {
      type: "String",
      default: "releases/phase4/api.zip",
    });
    const website = foundation.website;
    const pool = new cognito.UserPool(this, "Users", {
      userPoolName: "FreshRouteUsers",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      passwordPolicy: {
        minLength: 12,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { otp: true, sms: false },
      featurePlan: cognito.FeaturePlan.LITE,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const domain = pool.addDomain("Login", {
      cognitoDomain: { domainPrefix: `freshroute-${account}` },
    });
    const client = pool.addClient("Browser", {
      userPoolClientName: "FreshRouteWeb",
      generateSecret: false,
      authFlows: { userSrp: true, adminUserPassword: true },
      preventUserExistenceErrors: true,
      enableTokenRevocation: true,
      accessTokenValidity: Duration.minutes(15),
      idTokenValidity: Duration.minutes(15),
      refreshTokenValidity: Duration.hours(8),
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL],
        callbackUrls: [
          `${website}/auth/callback`,
          "http://localhost:5173/auth/callback",
        ],
        logoutUrls: [`${website}/welcome`, "http://localhost:5173/welcome"],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    });
    new cognito.CfnUserPoolGroup(this, "Administrators", {
      userPoolId: pool.userPoolId,
      groupName: "administrators",
      description: "Manage receiving rules in the isolated academic workspace",
    });
    const apiLogs = new logs.LogGroup(this, "ApiLogs", {
      logGroupName: "/freshroute/api",
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const role = new iam.Role(this, "ApiRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description:
        "FreshRoute API: four application tables and its own log group only",
    });
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
        ],
        resources: Object.values(foundation.tables).map((t) => t.tableArn),
      }),
    );
    apiLogs.grantWrite(role);
    const fn = new lambda.Function(this, "WorkspaceApi", {
      functionName: "FreshRouteWorkspaceApi",
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      code: lambda.Code.fromBucket(
        foundation.buckets.data,
        artifactKey.valueAsString,
        artifactVersion.valueAsString,
      ),
      handler: "api.handler",
      role,
      memorySize: 256,
      timeout: Duration.seconds(20),
      logGroup: apiLogs,
      environment: {
        CLIENT_ID: client.userPoolClientId,
        USER_POOL_ID: pool.userPoolId,
        ...Object.fromEntries(
          Object.entries(foundation.tables).map(([name, table]) => [
            name.toUpperCase() + "_TABLE",
            table.tableName,
          ]),
        ),
      },
    });
    const workflows = provisionWorkflows(this, {
      tables: foundation.tables,
      data: foundation.buckets.data,
      code: lambda.Code.fromBucket(
        foundation.buckets.data,
        artifactKey.valueAsString,
        artifactVersion.valueAsString,
      ),
      api: fn,
      apiRole: role,
    });
    provisionFulfilment(this, {
      activity: foundation.tables.Activity,
      reports: foundation.buckets.reports,
      code: lambda.Code.fromBucket(
        foundation.buckets.data,
        artifactKey.valueAsString,
        artifactVersion.valueAsString,
      ),
      api: fn,
      apiRole: role,
      pool,
    });
    new CfnOutput(this, "AnalysisStateMachineArn", {
      value: workflows.machine.stateMachineArn,
    });
    new CfnOutput(this, "ImportQueueUrl", { value: workflows.queue.queueUrl });
    new CfnOutput(this, "ImportDLQUrl", { value: workflows.dlq.queueUrl });
    const api = new apigw.HttpApi(this, "Api", {
      apiName: "FreshRouteApi",
      corsPreflight: {
        allowOrigins: [
          website,
          "http://localhost:5173",
          "http://127.0.0.1:5173",
        ],
        allowMethods: [
          apigw.CorsHttpMethod.GET,
          apigw.CorsHttpMethod.POST,
          apigw.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["Authorization", "Content-Type"],
        maxAge: Duration.hours(1),
      },
    });
    const authorizer = new HttpJwtAuthorizer(
      "Cognito",
      `https://cognito-idp.${region}.amazonaws.com/${pool.userPoolId}`,
      { jwtAudience: [client.userPoolClientId] },
    );
    const integration = new HttpLambdaIntegration("Workspace", fn);
    api.addRoutes({
      path: "/v1/workspace",
      methods: [apigw.HttpMethod.GET],
      integration,
      authorizer,
      authorizationScopes: ["openid", "aws.cognito.signin.user.admin"],
    });
    api.addRoutes({
      path: "/v1/commands",
      methods: [apigw.HttpMethod.POST],
      integration,
      authorizer,
      authorizationScopes: ["openid", "aws.cognito.signin.user.admin"],
    });
    for (const [path, method] of [
      ["/v1/imports", apigw.HttpMethod.POST],
      ["/v1/imports/{jobId}/complete", apigw.HttpMethod.POST],
      ["/v1/analysis-jobs", apigw.HttpMethod.POST],
      ["/v1/jobs", apigw.HttpMethod.GET],
      ["/v1/jobs/{jobId}", apigw.HttpMethod.GET],
      ["/v1/reservations", apigw.HttpMethod.POST],
      ["/v1/fulfilment", apigw.HttpMethod.GET],
      ["/v1/reservations/{reservationId}/status", apigw.HttpMethod.POST],
      ["/v1/reservations/{reservationId}/report", apigw.HttpMethod.GET],
      ["/v1/inbox/{messageId}/read", apigw.HttpMethod.POST],
      ["/v1/network/{destinationId}", apigw.HttpMethod.POST],
    ] as const)
      api.addRoutes({
        path,
        methods: [method],
        integration,
        authorizer,
        authorizationScopes: ["openid", "aws.cognito.signin.user.admin"],
      });
    const stage = api.defaultStage!.node.defaultChild as apigw.CfnStage;
    stage.defaultRouteSettings = {
      throttlingBurstLimit: 10,
      throttlingRateLimit: 5,
    };
    const gatewayLogs = new logs.LogGroup(this, "GatewayLogs", {
      logGroupName: "/freshroute/gateway",
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    stage.accessLogSettings = {
      destinationArn: gatewayLogs.logGroupArn,
      format: JSON.stringify({
        requestId: "$context.requestId",
        routeKey: "$context.routeKey",
        status: "$context.status",
        responseLength: "$context.responseLength",
        integrationError: "$context.integrationErrorMessage",
      }),
    };
    new CfnOutput(this, "WebsiteUrl", { value: website });
    new CfnOutput(this, "ApiUrl", { value: api.apiEndpoint });
    new CfnOutput(this, "UserPoolId", { value: pool.userPoolId });
    new CfnOutput(this, "ClientId", { value: client.userPoolClientId });
    new CfnOutput(this, "AuthDomain", { value: domain.baseUrl() });
    new CfnOutput(this, "ApiFunctionName", { value: fn.functionName });
    const verificationLogs = new logs.LogGroup(this, "VerificationLogs", {
      logGroupName: "/freshroute/verification",
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const verificationRole = new iam.Role(this, "VerificationRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description:
        "HTTP verification only; no database, S3 or Cognito permissions",
    });
    verificationLogs.grantWrite(verificationRole);
    new lambda.Function(this, "Verification", {
      functionName: "FreshRouteVerification",
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      code: lambda.Code.fromBucket(
        foundation.buckets.data,
        artifactKey.valueAsString,
        artifactVersion.valueAsString,
      ),
      handler: "probe.handler",
      role: verificationRole,
      memorySize: 256,
      timeout: Duration.seconds(180),
      logGroup: verificationLogs,
      environment: {
        API_URL: api.apiEndpoint,
        WEB_URL: website,
        WEB_BUCKET: `freshroute-${account}-${region}-web`,
      },
    });
  }
}
const app = new App();
const foundation = new Foundation(app, "FreshRouteFoundation");
new Application(app, "FreshRouteApplication", foundation);
Tags.of(app).add("Project", "FreshRoute");
Tags.of(app).add("Environment", "academic");
Tags.of(app).add("Phase", "6");
app.synth();
