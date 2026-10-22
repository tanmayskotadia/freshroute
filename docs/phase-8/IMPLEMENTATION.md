# Phase 8: cloud engineering, security and migration

The application remains a serverless rescue control center. Disposable lab stacks demonstrate the compute, networking and relational alternatives without becoming production dependencies. The evidence screen at `/evidence` provides searchable experiments, expandable expected/observed proof, a JSON export, architecture views, cost/lifecycle notes and explicitly labelled studies. It is a dated evidence snapshot, not a live monitoring feed.

## Retained operations

`FreshRouteFoundation` adds the `FreshRouteAudit` multi-region trail, scoped service delivery policy and the existing KMS key permission. Existing bucket/table/key identities remain intact. Management writes are audited; S3 data events are limited to report objects under `reports/exports/`, excluding the audit bucket to avoid recursive logging. Logs and digest files actually arrived; HeadObject confirmed aws:kms encryption. File validation is enabled, but a cryptographic digest-chain validation was not run.

`FreshRouteOperations` creates the CloudWatch dashboard, function-error, HTTP API 5xx, dead-letter-depth, workflow-failure and AI-fallback alarms, an isolated alarm canary, an operational SNS metadata topic and a gross USD 200 monthly budget. Five thresholds are configured. Actual canary metric data caused OK → ALARM → OK and successful SNS actions. The SNS topic has no email subscription; this proves publication, not operator email delivery. Budget notifications use the previously authorized project email. No budget hard-stop guarantee is made.

The dashboard shows invocations, errors, p95 duration, visible queued/dead-letter work, workflow outcomes, AI fallbacks and alarm state. Missing sparse error metrics are not breaching; empty charts do not establish uptime. The initial dashboard correctly raised an import-DLQ alarm for existing messages. Those messages were preserved because they were not conclusively identified as disposable Phase 8 data.

## Compute, networking and storage experiment

`FreshRouteComputeLab` provisions non-overlapping 10.80.0.0/16 and 10.81.0.0/16 VPCs, two availability zones, explicit peering routes, security groups, SSM instance roles, an internal ALB, two t3.micro workers in an ASG, encrypted 8 GB gp3 root EBS volumes, encrypted EFS and a private Lambda probe in the peer VPC. There is no inbound SSH rule. IMDSv2 is required; CPU credits use standard mode. Bootstrap/SSM egress uses temporary instance public IPv4 and an internet gateway; there is no NAT Gateway. The ALB is private. Lab HTTP carries fictional fixtures only; the actual product uses HTTPS.

Both workers served the same EFS checksum and different EBS scratch IDs. SSM Run Command returned the actual mount/block-device evidence. The EFS mount uses TLS. Peering HTTP succeeded and SSH was unreachable. A benign WAF header returned 403 while ordinary fixture requests returned 200. WAF protects the compatible lab ALB; no claim is made that it protects the product's HTTP API.

One worker was intentionally terminated without decrementing desired capacity. ASG created a new healthy worker; the shared EFS hash remained unchanged. A separate controlled experiment reduces desired capacity to one and executes a +1 simple scaling policy, bounded by maximum two. This is policy-driven scale-out evidence, not a claim of automatic CPU/traffic-driven scaling. The two-hour scheduled scale-to-zero is a partial safety measure; ALB, EFS and SQL still require explicit deletion.

## SQL and migration experiment

`FreshRouteSqlLab` adds two private subnets with no internet default route, private PostgreSQL 18.3 on db.t3.micro, 20 GB encrypted gp3, rds.force_ssl, a managed master secret and a private SQL client Lambda. RDS orderability and engine versions were checked before creation. Single-AZ, zero backup retention, no deletion protection and deletion without a final snapshot are intentional disposable-fixture choices, not production defaults.

The SQL client bundles the official regional RDS CA certificate, verifies CA/hostname and connected with TLS 1.3. CloudFormation resolves the RDS secret into its server-side configuration; the agent never fetches secret values. Runtime SQL uses parameterized inserts, supports only seed/verify actions and returns fictional rows without connection credentials. Three legacy shipment rows represent banana, tomato and mango stock. The main DynamoDB workspace is unaffected.

`FreshRouteMigrationLab` uses a small, private, Single-AZ DMS instance and TLS-required endpoints. A full-load task selects only `legacy.shipments` and transforms its schema to `warehouse`. Source and target are separate schemas on the same disposable database: this demonstrates DMS full-load mechanics, not an actual on-premises transfer or CDC. The SQL verifier compares ordered row content, not only counts. The DMS endpoints require TLS but do not perform the SQL client's CA/hostname verification; this remains a lab limitation.

Cutover exercise: verify full-load task/table statistics and exact source/target equality, then treat warehouse as the reviewed snapshot. Rollback is to keep using legacy, which the full load does not modify. The live app continues using DynamoDB throughout. No real production cutover or cross-engine compatibility is claimed.

## Config and queue reliability

The Config recorder records only the SecurityGroup resource type in this region, not all resource types. That still includes all security groups of that type in the account. Its managed rule evaluates only one unattached fixture security group, avoiding workload exposure. An approved public fixture port is compliant; adding another port creates configuration drift; removing it should restore compliance. Actual before/drift/remediation results are recorded separately. Recording is stopped and deleted after this experiment.

The Config CloudFormation registration function creates recorder → delivery channel → recording → scoped rule in sequence and reverses those operations during deletion. It has only the required Config registration operations and PassRole for the delivery role. No existing recorder was present in preflight. Initial deployment dependency failures were diagnosed from CloudFormation operation events and corrected; the failed attempts are not counted as passed experiments.

`FreshRouteReliabilityLab` has independent encrypted work/dead-letter queues and a tiny worker. A poison fixture failed, exceeded its receive limit and reached its DLQ. After recording that evidence, a controlled corrected replay processed successfully. Only that fixture's receipt was deleted. This demonstrates at-least-once retry/recovery; it is not exactly-once external delivery.

## Reproduction and evidence

Run `npm.cmd ci`, `npm.cmd run typecheck:server`, `npm.cmd run infra:synth`, and `node scripts/prepare-templates.mjs` for the main stacks. Generate disposable/operations templates with `node infrastructure/labs/templates.mjs`, `node infrastructure/labs/sql-templates.mjs`, `node infrastructure/labs/config-template.mjs`, and `node infrastructure/labs/reliability-template.mjs`. Build the SQL bundle with `node scripts/build-sql-lab.mjs` and zip its two output files at archive root.

Use AWS MCP with STS account guard 118462784511 and region ap-south-1. Upload through private S3 presigned URLs and pin object versions. Preview change sets. Pass a freshly discovered AL2023 AMI and a future ScaleDownAt timestamp to ComputeLab; derive SQL network parameters from its outputs. Pass the SQL artifact version and a compatible PostgreSQL 18 engine minor. Derive DMS endpoint/network parameters from SqlLab outputs; reuse an existing dms-vpc-role rather than replacing it. Give a new ConfigLab the peer VPC ID and confirm no external recorder exists first. Operations requires a NoEcho NotificationEmail parameter; preserve its previous value during updates.

`infrastructure/mcp/verify-phase8-operations.py` and `verify-phase8-reliability.py` run in AWS MCP without local credentials. Phase 7's live regression runs after the infrastructure changes. Sources and response evidence reside in this folder. Local security-contract tests exercise the generated templates. Strict CDK synthesis, AWS template validation and reviewed change sets were used; local cfn-lint/cfn-guard were unavailable and are not claimed as executed.

Cleanup order is DMS/reliability, SQL, Config (stop recorder, clear only its own versioned fixture bucket), then compute. Verify each deletion and inspect residual lab ENIs, volumes, file systems, load balancers, databases, queues and recorders. Retain the main app, audit and monitoring stacks. Cleanup results and remaining limitations belong in RELEASE_STATUS.md; do not infer cleanup from a DeleteStack request alone.

## Account and study boundaries

Free Tier API reported an active FREE account plan, USD 179.94 remaining credits and expiry 28 February 2027 during verification. This is a dated account response, not a promise every service is covered. Cost Explorer's gross result was much lower because billing is delayed. Trusted Advisor's Support API returned SubscriptionRequiredException; restricted checks are a study and no paid support plan was enabled.

Multi-AZ database failover, read replicas, Aurora, Direct Connect, SWF, Shield Advanced and physical/legacy migration appliances remain studies. No resource, uptime, CDC, measured food saving, subscription-confirmed email or browser visual QA result is invented. Browser-origin access remained blocked; no alternate path bypassed that policy.

Sources: [Config recorder lifecycle](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-config-configurationrecorder.md), [authorized ports rule](https://docs.aws.amazon.com/config/latest/developerguide/vpc-sg-open-only-to-authorized-ports.html), [RDS TLS certificates](https://aws.amazon.com/blogs/database/enforcing-tls-and-managing-certificate-rotation-for-rds-and-amazon-aurora-postgresql/), [DMS PostgreSQL source](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html), [DMS PostgreSQL target](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.PostgreSQL.html), [WAF supported resources](https://aws.amazon.com/waf/faqs/).
