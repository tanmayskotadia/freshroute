# Phase 4 - Cloud foundation and authenticated persistence

Implemented and verified against AWS through AWS MCP, 22 October 2026. Hosting uses the user's approved HTTPS fallback. CloudFront remains blocked by AWS account verification; see `CLOUDFRONT_BLOCKER.md`. Browser visual/OAuth-redirect checks remain pending because the saved browser permission denies preview access, even after the user approved resuming checks. These limits are distinct from the passing live API checks.

## Deployed application

- Website: https://dr4sw5bpoi.execute-api.ap-south-1.amazonaws.com
- Protected API: https://r2rxt5q5kk.execute-api.ap-south-1.amazonaws.com
- Region: ap-south-1 (Mumbai).
- Stacks: FreshRouteFoundation and FreshRouteApplication.
- Four private, versioned S3 buckets: web, data, reports and audit. All four public-access-block flags were verified for every bucket. Reports/audit use the retained rotating KMS key; data/web use S3-managed encryption. Purpose-specific lifecycle rules are configuration evidence, not observed transitions.
- Four on-demand DynamoDB tables: FreshRouteShipments, FreshRouteRuns, FreshRouteDestinations and FreshRouteActivity. Each uses owner/id keys, retained storage, point-in-time recovery configuration and deletion protection.
- Cognito user pool/public client, authorization-code + PKCE sign-in, optional TOTP, no browser client secret. Access tokens live in sessionStorage for at most 15 minutes. Refresh tokens are discarded. The browser decodes claims only for display; API Gateway verifies JWTs and Lambda checks token type/client/issuer.
- HTTP API JWT authorizer, scoped API execution role, Lambda model/persistence handler and short-retention application/access logs. No AWS access keys are delivered to the frontend.

The fallback web Lambda reads only the web bucket and returns static files over API Gateway HTTPS. It cannot read application tables or private data/report buckets. Only recognized application routes fall back to index.html; missing static files return errors. CSP, HSTS, frame denial, MIME protection and referrer headers are set. Direct anonymous S3 reads fail. The fallback has request charges and lacks CloudFront edge caching; it is not represented as an equivalent CDN.

## Data and authorization

GET `/v1/workspace` returns the authenticated subject's workspace. POST `/v1/commands` accepts an allowlisted action, args and expected workspace revision. The body never selects the owner. Supported commands save shipments/drafts/analyses and plan selections; cloud reset and arbitrary history deletion are disabled. Receiving-rule changes require the administrators group on the server.

The first read provides fictional starter records in memory. The first successful write commits them to that owner's partition. Reads query owner keys with consistent reads and compare metadata revisions before/after. Writes atomically commit changed records and the conditional metadata revision across the four tables. No table scan is used for application reads. Conflicts return 409. Records are bounded at 300 KB and transactions at 100 writes. This is an academic workspace API, not an unlimited bulk-ingestion service.

The server executes the same pure TypeScript model as local preview and creates its own frozen analysis result. It never accepts a client-supplied winner/result. Saved plans reference the authenticated owner's run. Phase 4 plan selection does not reserve capacity, generate reports or notify partners; those belong to Phase 6. Receiving rules in this phase are each owner's isolated fictional sandbox.

The frontend repository adapter is asynchronous. Forms wait for server confirmation before closing/showing success; failures retain form inputs. A separate local-demo mode preserves the existing browser workspace. Production connection settings are generated from verified stack outputs into `public/cloud-config.json`; this file contains public IDs/endpoints only and is ignored by Git.

## Verification and evidence

`verification.json` records four passing live HTTP health checks and fourteen passing authenticated API checks. Two temporary Cognito users authenticated with real issued access tokens. The verification Lambda has no database/Cognito/S3 permissions: it exercises the public API over HTTPS. It checked unauthenticated/forged-token denial, saved and reloaded a shipment, denied another user's read/edit/confirmation, saved a server-calculated run and plan, denied an operator's receiving-rule edit, and rejected a stale revision. Temporary users and their exact owner partitions were cleaned; no credentials or tokens were returned or saved.

One early test expected 400 for a nonexistent foreign shipment edit. The API correctly returned its documented conflict status 409; the assertion was corrected and the full live suite rerun successfully. This was not an access-control bypass.

Local validation: 35 tests pass; frontend production build, server TypeScript check, infrastructure TypeScript check and strict CDK synth pass. The browser gate prevented a new visual/interactive sign-in check; build and API health results are not substitutes for that check.

## Deployment and retention

Source: `infrastructure/app.ts`; Lambda handlers: `server/`; build: `npm.cmd run build:api`; synth: `npm.cmd run infra:synth`. Bundles are uploaded to the private data bucket through short-lived AWS MCP presigned URLs. CloudFormation change sets are reviewed before execution, and Lambda code uses an explicit S3 object version. No local AWS credentials or CDK bootstrap account-wide roles were required. The reproducible MCP verification script is `infrastructure/mcp/verify-phase4.py`.

Foundation termination protection is enabled. Stateful resources are retained and tables have deletion protection: destroying a stack will not erase them or stop storage charges. Perform an explicit resource inventory and backup review before cleanup. KMS, point-in-time recovery, retained versions and request usage can incur charges; no Free Tier credit or zero-cost guarantee is assumed. No NAT gateways, EC2, RDS or other hourly compute labs were created in this phase.

The original endpoint-by-entity design is implemented here as a versioned, allowlisted command gateway to reuse the existing repository contracts. Later import/job/reservation routes extend the API separately. CloudFront code remains available behind `cloudFront=enabled`; changing hosting requires reviewed callbacks/CORS/config changes and AWS verification first.
