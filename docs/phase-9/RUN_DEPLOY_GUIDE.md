# FreshRoute setup and deployment

## Local development

Requirements: Node.js 24 (native TypeScript stripping is used by tests), npm and a current browser. Extract `source/` from the submission ZIP or clone the repository. In PowerShell, from that directory:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd run typecheck:server
npm.cmd run dev
```

Open the Vite URL (normally http://127.0.0.1:5173). Local mode needs no AWS credentials, API key or `cloud-config.json`. It stores fictional data under `freshroute.workspace.v1` for that browser/origin. Different ports/browsers have different data. Do not clear or reset a workspace to fix a deployment problem.

Use Overview → Shipments → Rescue Lab → save analysis → History. Cloud-only actions are labelled and require sign-in. The sidebar has the seven-minute presentation guide. Stop Vite with Ctrl+C.

## Existing deployed project

Website: https://dr4sw5bpoi.execute-api.ap-south-1.amazonaws.com

API: https://r2rxt5q5kk.execute-api.ap-south-1.amazonaws.com

Account: 118462784511. Region: ap-south-1. Retained stacks: FreshRouteFoundation, FreshRouteApplication, FreshRouteOperations. Confirm identity before any change. The student uses their own Cognito sign-in; no passwords or tokens are included in the package.

`public/cloud-config.json` is deployment-specific public metadata, excluded from source packaging. Recreate it using Foundation/Application stack outputs: region, apiUrl, userPoolId, clientId, authDomain, websiteUrl, hosting (`api-gateway-fallback`) and phase (`9`). These fields are identifiers/endpoints, not secrets. Rebuild after changing them.

## Infrastructure reproduction

Read docs/phase-4 through docs/phase-8 deployment notes before deploying. They record actual repair decisions and limitations. Infrastructure source is `infrastructure/app.ts`; operational/lab templates are under `infrastructure/`. Current account uses the approved API Gateway HTTPS fallback because CloudFront is blocked pending account verification.

```powershell
npm.cmd ci
npm.cmd run build:api
npm.cmd run typecheck:server
npm.cmd run infra:synth
node scripts/prepare-templates.mjs
```

`FRESHROUTE_ACCOUNT` and `FRESHROUTE_REGION` select the target; defaults are the existing project account and Mumbai. CloudFront is opt-in through CDK context `cloudFront=enabled`; leave it unset for the approved fallback. Check the actual AI stack parameters in `infrastructure/copilot.ts` before deploying. Synthesis is not deployment. Inspect the generated templates/change set for replacements, permissions and retained-state resources before applying it through AWS CloudFormation/CDK with an authorized account session.

For a new account, first supply that account's correct public identity endpoints and deployment context rather than reusing the existing app client. Bootstrap CDK only if needed for that account. Cognito callbacks/CORS must match the website origin. Do not blindly copy old physical resource identifiers into a new deployment.

The AI runtime needs Secrets Manager secret `freshroute/copilot-api-key` with JSON field `apiKey`. Enter the value directly in the AWS console; never paste it into source, logs or messages. Runtime dynamic references resolve it; do not retrieve it to inspect a deployment. An optional Bedrock adapter is not proof that Bedrock is active. Current technical provenance is documented in the report.

For a frontend release, build first, upload hashed assets and config to the private web bucket, then upload `index.html` last. Preserve versions for rollback. `scripts/upload-web.py` accepts temporary presigned transfer descriptors; those descriptors belong only in ignored `tmp/`. Never include them in a submission.

The production app does not require the deleted engineering labs. Recreating EC2/ALB/EFS/RDS/DMS/Config/WAF labs incurs charges and is not part of basic local setup. If deliberately replayed, follow phase-8 setup, bounded experiments, deletion and inventory verification in that order. Scheduled scale-to-zero does not delete chargeable ALB/EFS/SQL resources.

## Verify and recover

- Local: 49 model/repository/provider/infrastructure tests plus frontend production build and server type check.
- Cloud: `FreshRouteVerification` with payload `{"health":true}` checks HTTPS, security header, runtime API match and denied direct S3. Its role and probe implementation are in source; invocation needs an authorized AWS session.
- Business regression: the dated phase-8 19-check result includes actual AI and reservation/report behavior. Do not call it a new run without executing the full isolated test flow.
- Roll back a bad frontend by restoring a known index/config/assets release from S3 versions together. Do not reset DynamoDB or browser data.
- Diagnose DLQs before replay. Preserve owner metadata and idempotency; do not purge queues to silence alarms.

## Shutdown and budget

Retained data tables and buckets have deliberate retention protections. Deleting a stack is not a complete bill cleanup. Review retained resources, versions, logs, key, alarms and budgets individually, export required evidence, then obtain the resource owner's decision before deleting persistent project data. USD 200 and budget emails cannot prevent overspend.

