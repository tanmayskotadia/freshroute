# FreshRoute: phase-by-phase build blueprint

Revised 23 October 2026. Phases 0-9 are implemented in account 118462784511. Phase 9 added presentation mode and the submission package. Phase 10, added as the final handover audit, verifies release integrity and records current operational findings in docs/phase-10/HANDOVER.md. The dated Phase 8 evidence covers deleted labs and 19 live business regression checks; Phase 10 refreshes hosting, queue, alarm, subscription and cost observations. Study labels remain explicit for expensive, physical and restricted services.

## 1. Final direction

**FreshRoute is a perishable-shipment rescue control center.** A distributor sees an emerging delay or cooling problem, explores practical alternatives, and confirms a feasible response before more value is lost. The differentiator is constrained decision support: the cheapest route may arrive too late, the closest food bank may lack capacity, and extra cooling may cost more than the modeled benefit.

The teacher-facing story has four verbs: **Observe -> Simulate -> Decide -> Verify.** Every cloud component supports one of these steps or demonstrates an alternative deployment/migration requirement. Introduce the business story first, then reveal the infrastructure behind it.

The user supplied a US$200 budget and prioritizes uniqueness, real usefulness, beautiful UI, many coherent features, and understandable cloud depth. Treat US$200 as the total project planning ceiling, not a guaranteed Free Tier entitlement or a target to spend. No exact submission date or official scoring breakdown is assumed.

### Three connected architecture layers

1. **Working product:** the full serverless control center with authenticated users, rescue analysis, decision persistence, background work, reports and a live AI copilot.
2. **Warehouse/cloud engineering lab:** an on-demand companion stack for EC2, ALB, Auto Scaling, EBS/EFS, VPC and SQL demonstrations using FreshRoute fixtures. It is a real executable extension/comparison, not an always-on dependency of the main product.
3. **Migration and enterprise design:** a warehouse modernization scenario for DMS, relational availability, hybrid connectivity, SWF comparisons and legacy migration services. Expensive or unavailable services remain clearly identified studies unless actually exercised.

This is broader than the initial plan, but still one project with one main user problem. Do not present all syllabus services as deployed.

## 2. Feature catalogue and build priority

Every feature below has a purpose and phase. P = principal final product; E = enhancement to complete after its dependencies; L = separate cloud lab. A feature is not done until its interaction, backend behavior and failure/empty state work.

| Feature group | Specific capabilities | Priority / phase |
|---|---|---|
| Access and onboarding | Sign-in/out, operator/admin roles, profile, guided sample shipment, resettable fictional demo data | P / 1, 4 |
| Control center | Risk-ranked shipment queue, search, produce/status filters, sorting, KPI definitions, recent decisions, last-updated indicators | P / 2 |
| Shipment workspace | Guided create/edit form, produce/quantity/value, temperature segments, planned ETA, destination, draft saving and event timeline | P / 2 |
| Data import | Presigned CSV upload, file-size/schema checks, row errors, preview, import job state and downloadable error report | E / 5 |
| Incident replay | Replay seeded cooling failure, delay and recovery events; pause/reset; visibly label simulated telemetry | P / 3, 5 |
| Rescue Lab | Baseline plus alternatives, delay/temperature/budget controls, reset, saved scenario names, assumption drawer | P / 3 |
| Decision intelligence | Capacity/opening-hours/produce filters, budget ceiling, ranking priorities, infeasible reasons, deterministic ties | P / 3 |
| Comparison visualization | Quality curves, estimated kg at risk, cost/time table, score explanation, highlight best metric per option | P / 3 |
| Sensitivity explorer | Parameter ranges, rerun under pessimistic/optimistic assumptions, identify when the winner changes | E / 7 |
| Split allocation | Allocate bounded quantities across eligible destinations, enforce total quantity conservation and per-destination capacity | E / 7 |
| Receiving network | Destination directory, produce acceptance, hours, capacity, reserved/available split, map/list toggle | P / 2, 6 |
| Decision workflow | Review plan, re-check capacity, confirm/reject/cancel where permitted, conflict recovery, immutable decision history | P / 6 |
| Alerts inbox | High-risk incident cards, read/unread, severity, acknowledge state, links to shipment/run, opt-in email | P / 6 |
| Reports center | Background rescue report generation, status/retry, authorized download, CSV export and printable summary | P / 6 |
| Outcomes and analytics | Record delivered/rejected quantity, compare modeled versus recorded outcomes, date/produce filters, deduplicated aggregate totals | E / 7 |
| AI copilot | Grounded explanation, draft what-if request, summary brief, suggested questions, fallback and provenance | P / 7 |
| Administration | Versioned produce assumptions, receiving rules, access checks, sample-data management and audit entries | P / 4, 8 |
| Presentation mode | Consistent seeded story, presenter notes, reproducible reset, no automatic fabricated live activity | E / 9 |
| Cloud evidence workspace | Linked architecture, resource/status inventory, workflow evidence, service-to-feature matrix, lab results | P / 8, 9 |
| Warehouse lab portal | EC2 instance identity/health, shared file checksum, benchmark result, SQL fixture lookup, migration reconciliation | L / 8 |

Keep enhancements in the final backlog, not as promises that existing controls already work. Avoid empty navigation sections and decorative buttons. Use at least three contrasting demo scenarios: rescue helps, no rescue helps, and accepting capacity disappears before confirmation.

## 3. UI/UX build specification

### Visual language

Warm neutral canvas, deep forest sidebar, emerald primary action, soft blue information accents, amber warnings and carefully limited red alerts. Use a consistent spacing scale and type hierarchy. Prefer clean flat surfaces with subtle depth over heavy gradients. Add a focused landing page with an illustrative shipment-to-rescue story, then a professional dashboard after sign-in.

Desktop: a persistent navigation rail, compact workspace header, broad content area and contextual copilot drawer. Tablet: collapsible rail. Mobile: simplified navigation, stacked decision cards and a sticky primary action. Honor reduced-motion preferences and support keyboard operation. A dark theme is an enhancement after light-mode consistency is complete.

### Screen composition

1. **Overview:** four carefully defined metric cards, urgent shipments, route overview, activity and next actions. Selecting a chart segment filters the list.
2. **Shipment workspace:** summary strip, timeline, temperature chart and route schematic; edit details in a drawer so context is retained.
3. **Rescue Lab:** left controls, central baseline/alternative cards and linked charts, right explanation drawer. On narrow screens use tabs. Distinguish instant preview from saved authoritative cloud runs.
4. **Network:** destination cards/list plus a seeded geographic schematic; capacity, opening hours and accepted produce are visible before selection.
5. **Decision review:** side-by-side trade-offs, explicit infeasible reasons, reservation confirmation and clear recovery if capacity changed.
6. **Reports/history:** searchable runs, status badges, saved input summaries, comparison and download actions.
7. **Outcomes:** estimated versus recorded metrics displayed separately with definitions and no duplicated totals.
8. **Cloud evidence:** separate from ordinary operator workflows; service inventory, actual evidence timestamps, failure experiment results and diagrams.

### UX details that count as implementation work

- Guided forms with sensible seeded values, units beside inputs, field-level validation and a review step.
- Reusable table/card/chart patterns; no different visual language on each screen.
- Skeletons, empty states, permission-denied screens, offline/error handling and retry actions.
- Progressive job states with elapsed time and a meaningful failure message.
- Accessible chart legends, text labels for severity, clear focus indicators and readable contrast.
- Filter state retained when reopening a shipment; explicit reset and no surprise form loss.
- Preview labels, source badges, last refresh time, model version and a concise assumptions drawer.
- Notifications that link to the exact affected shipment or run.
- Responsive QA at phone, tablet and desktop widths; test keyboard-only main flow.

## 4. Four S3 buckets with real boundaries

Use four logical application/storage buckets. Infrastructure tooling may create a separate artifact bucket; inventory it separately rather than counting it as a product feature. Bucket names include environment and uniqueness suffixes, not assumed account identifiers.

| Bucket | Content | Access and protection | Lifecycle/evidence |
|---|---|---|---|
| `freshroute-web-*` | Built frontend JS/CSS, icons and static images | Block public access; CloudFront OAC read access; deployment role writes | Cache immutable hashed assets; version controlled release/rollback strategy; demonstrate CloudFront success and direct S3 denial |
| `freshroute-data-*` | Upload quarantine prefixes, accepted CSVs, replay fixtures, versioned model parameter JSON | Short-lived presigned uploads bound to a server-created key; importer reads only its prefixes; no client-selected arbitrary keys | Lifecycle for temporary uploads and incomplete multipart uploads; version history for selected configuration objects; verify validation and unauthorized access denial |
| `freshroute-reports-*` | Generated CSV/printable reports, completed analytical summaries | Worker writes; authorized API issues short-lived download links after ownership checks; use a scoped KMS encryption integration here | Expire transient reports; archive only suitably sized retained records if justified; prove authorized download and KMS permissions |
| `freshroute-audit-*` | CloudTrail trail delivery, selected access logs where appropriate, project audit exports under separate prefixes | Dedicated service delivery policies; restrict app roles; exclude recursive access-log delivery; no routine browser access | Explicit retention/noncurrent-version policy; verify event arrival, encryption and access restrictions; avoid Object Lock for this student stack unless retention is truly required |

Four buckets are justified by different writers, readers and retention needs. Prefixes still subdivide data within each bucket. Do not create a new bucket for every produce type or user.

Storage-class coverage: compare Standard, Intelligent-Tiering, IA and Glacier classes; keep tiny hot configuration objects in Standard. Demonstrate a bounded archive/restore using a suitable sample only after checking retrieval time and minimum-duration charges. Lifecycle transitions are asynchronous; objects below 128 KB do not transition by default under current S3 behavior. A saved lifecycle rule is configuration evidence, not proof an object has already transitioned.

## 5. Cloud depth: resource and workflow plan

### Main application

- **Delivery/identity:** one CloudFront distribution, the web bucket, Cognito user pool/client and authenticated API.
- **API choice:** default to API Gateway HTTP API. Add a scoped REST API lab for WAF-protected API requests if needed; keep the distinction explicit. If API WAF protection becomes a main requirement, replace the main API with REST after reviewing its cost/auth changes. Do not duplicate the entire backend without a purpose.
- **Compute:** logical Lambda responsibilities for shipment API, model/optimizer, import validation, decision handling, event publishing, reporting/notification, and the copilot. Combine related handlers where it reduces maintenance; seven responsibilities do not require exactly seven functions.
- **Data:** Shipments, Runs, Destinations and Decisions/Jobs tables with documented access patterns. Add indexes only for actual list queries. Use conditional writes/transactions for capacity and confirmation. No unnecessary analytics table or per-user table.
- **Workflow:** one Step Functions Standard rescue workflow: validate -> create feasible candidates -> evaluate -> rank -> persist result -> complete. Include retry/catch paths and job status reconciliation after failure.
- **Queues:** separate import and post-decision report/notification queues, each with a DLQ, bounded consumer concurrency, partial failure handling and replay procedures. Distinct workloads can now scale/fail independently.
- **Events:** DynamoDB Streams on decision state transitions; optional on-demand EventBridge Scheduler incident replay using a dedicated seeded demo, disabled outside rehearsal. Manual replay remains available; never require an always-running schedule.
- **Messaging:** SNS topic for approved email subscribers and separate application notifications persisted for the inbox. The latter is what read/acknowledge updates modify.
- **AI:** server-side provider adapter, Secrets Manager credential configuration, strict structured output validation, result grounding, bounded request budget and a visible deterministic fallback. The optional Bedrock path is separately documented.
- **Operations:** CloudWatch dashboard and alarms, CloudTrail trail to audit storage, scoped IAM roles, a KMS report-encryption integration, Budgets and reproducible CloudFormation stacks.

### Warehouse engineering lab

One isolated lab VPC across two AZs, public/private subnet pairs, route tables, security groups, an ALB and an Auto Scaling group with up to two small EC2 instances. Start with a scale-out/load-distribution experiment, then fail one instance and observe health checks and replacement. The ALB demo serves only fictional fixture results or health metadata; production user records stay behind the authenticated application.

EBS stores per-instance scratch files; EFS supplies a shared fixture/template file accessed by both instances, proving the distinction between block, file and object storage. Use appropriate EFS access controls, encryption and mount targets. Add a second tiny lab VPC for a scoped peering test with non-overlapping address ranges and explicit return routes. Test both allowed and blocked connectivity.

Networking design gate: choose a costed internet/SSM access approach before provisioning. Options include a temporary public-subnet instance with restricted inbound access, or private instances with needed endpoints/egress. Public IPv4 addresses, interface endpoints and NAT gateways can all affect cost. Do not draw private instances as if they can fetch packages or reach SSM without a network path.

Systems Manager provides authenticated operations rather than shared SSH keys. Config checks a narrow set of resource configurations. A small WAF lab blocks a benign known test pattern. Record before/after behavior; do not attack the platform.

### Relational/migration lab

Use a disposable RDS SQL database representing the legacy warehouse application. SQL records are fixture receiving locations and historical stock, not a second competing live source of truth. The main app can import a reviewed snapshot as a clearly defined legacy integration, but remains functional after the lab is deleted.

If the budget permits, exercise DMS with a compatible tiny source/target setup: establish connectivity and permissions, run full load, optionally one CDC update, reconcile counts and content, then demonstrate planned cutover/rollback. Choose DMS capacity and source prerequisites before provisioning. A source database may be hosted temporarily on the lab compute; its storage must not be destroyed during a lifecycle test.

Multi-AZ, read replicas and Aurora receive separate architecture/SQL compatibility and cost comparisons. Brief live deployment is an expansion only if estimated cost fits the lab allocation. Do not equate an ALB spanning AZs or a single RDS instance with database failover evidence.

## 6. Complete syllabus audit

**Audit result: every named syllabus service and topic has a place below. Not every service is a live deployment.** Core = main deployment; Lab = short-lived experiment; Study = design/comparison/history. Current implementation and verification are recorded in docs/phase-8/ and the evidence register; this table is a coverage map, not proof every service runs. Expensive lab subfeatures can fall back to Study with transparent evidence labeling.

| Module | Service/topic | Planned treatment and evidence |
|---|---|---|
| 1 | Cloud computing and AWS global infrastructure | Core: on-demand processing; region/AZ/edge diagram and responsibility explanation |
| 1,6 | Shared Responsibility Model | Core: AWS/customer control matrix for website, serverless and EC2 lab |
| 1 | IAM users, groups, policies, roles, best practices | Core roles/policies; explain human user/group access design and MFA; do not create needless long-lived keys |
| 2 | Compute overview, EC2 instance types/pricing/lifecycle | Lab: instance selection, launch/stop/start/terminate; compare On-Demand, Spot and commitments without buying commitments |
| 2 | Auto Scaling | Lab: configured group, controlled scale-out/replacement and observed evidence |
| 2 | Elastic Load Balancing | Lab: ALB targets, health checks and request distribution |
| 2 | Storage overview and S3 | Core: four buckets and block/file/object comparison |
| 2 | S3 storage classes/lifecycle | Core configured retention; Lab/Study transition and restore with object-size/cost caveats |
| 2 | EBS | Lab: per-instance scratch volume, persistence boundaries, snapshot/cost explanation |
| 2 | Glacier | Lab/Study: archival object and restore process; do not promise instantaneous restore |
| 2 | EFS | Lab: shared file/checksum from two instances and access restrictions |
| 3 | Networking, VPC | Lab: two-AZ app lab VPC and separate peer VPC |
| 3 | Subnets, route tables, security groups | Lab: inspect routes and narrowly scoped traffic; allowed/denied checks |
| 3 | VPC peering | Lab: non-overlapping networks, bidirectional routes and connectivity proof |
| 3 | Direct Connect | Study: warehouse hybrid connectivity, VPN comparison and why dedicated links are unsuitable for this student deployment |
| 3 | CloudFront | Core: HTTPS/cache/OAC delivery evidence |
| 4 | Database services and RDS | Lab: warehouse SQL fixtures, private access and query evidence |
| 4 | RDS Multi-AZ | Study; optional paid experiment: availability/failover architecture distinct from read scaling |
| 4 | RDS read replicas | Study; optional paid experiment: replica lag/read routing; distinguish from standby |
| 4 | Aurora | Study: relational alternative, cluster architecture, availability and cost comparison |
| 4 | DynamoDB | Core: documented key/history patterns and conditional capacity writes |
| 4 | DynamoDB Streams | Core: observe a confirmed decision producing a downstream job; duplicate-event handling |
| 5 | Management tools and CloudWatch | Core: dashboards, alarms, logs, workflow/queue/latency measurements |
| 5 | CloudTrail | Core: trail delivery and selected actual API event; distinguish API audit from application logs |
| 5 | AWS Config | Lab: narrowly scoped recording/rule evidence and remediation/recheck |
| 5 | Systems Manager | Lab: managed instance connectivity and Session Manager/Run Command evidence |
| 5 | Cost Management | Core: gross cost estimates, Cost Explorer/account evidence and allocation tags |
| 5 | Free Tier | Account review: exact eligibility/credits/expiry; no claim all chosen services are free |
| 5 | Billing and account management | Account review: user-controlled access, billing overview, resource ownership and cleanup responsibilities |
| 5 | AWS Budgets | Core: alerts, thresholds and documented notification latency |
| 5 | Trusted Advisor | Available account checks plus Study for restricted checks; no implied full access |
| 6 | Security and compliance/best practices | Core: TLS, ownership, input validation, encryption, safe logging and least privilege |
| 6 | KMS | Core: report encryption, scoped key policy and allowed/denied evidence |
| 6 | WAF | Lab: benign blocked request on a compatible resource; no false claim of direct HTTP API protection |
| 6 | Shield | Study plus applicable Shield Standard coverage; Advanced comparison, no paid subscription or DDoS test |
| 7 | Integration, SQS | Core: two workload queues and DLQs with retries, idempotency and poison-message evidence |
| 7 | SNS | Core: opted-in confirmed email subscription and observed delivery |
| 7 | SWF | Study: worker/workflow model and comparison to the chosen Step Functions design |
| 7 | Step Functions | Core: successful and failed rescue executions, retries/catch, readable execution history |
| 7 | Well-Architected and design principles | Core review across all six pillars with concrete decisions and trade-offs |
| 7 | Scalability and elasticity | Core queue/concurrency rationale; Lab measured Auto Scaling behavior; distinguish concepts |
| 7 | High availability/fault tolerance | Core managed-service design and failure paths; Lab EC2 replacement; no invented uptime or multi-region claim |
| 7 | Security and cost optimization | Core: access-denied tests, token bounds, retention and deletion evidence |
| 8 | Migration/hybrid and DMS | Study plus budgeted Lab if feasible: full load, compatible CDC experiment, reconciliation, cutover/rollback |
| 8 | SMS | Legacy Study and modern Application Migration Service comparison; no attempt to provision an obsolete syllabus service |
| 8 | Snowball | Legacy/availability-aware Study: offline transfer and current alternatives |
| 8 | Snowball Edge | Study: edge compute/transfer case, current restrictions and planned service retirement |
| 8 | Snowmobile | Historical Study: very large offline transfer and why it does not fit FreshRoute deployment |

Beyond the syllabus: Lambda, API Gateway, Cognito, Bedrock, CloudFormation/SAM and optional EventBridge Scheduler are genuine application enablers. They do not replace coverage of EC2, networking, relational services or migration topics.

## 7. Phase-by-phase implementation contract

Phases below are dependencies and acceptance gates, not claims of progress. Keep the main application runnable after every phase. A phase ends with an implemented artifact, a demonstration, verification results and an updated evidence index. With expanded scope, estimate roughly 4-6 weeks for a small student team; revise after an initial working vertical slice. Do not compress the original 14-day assumption onto this larger scope.

### Phase 0 - Design and scope freeze

Build: finalized user journeys, feature priorities, architecture layers, four-bucket resource inventory, data entities, model assumptions, UI tokens and three demo stories. Prepare infrastructure stack boundaries and a cost worksheet using actual account eligibility before deployment.

Exit: each principal feature has a screen, API/data dependency and acceptance criterion; every syllabus row has a treatment. Document lab-only/study items visibly.

### Phase 1 - Frontend foundation and visual prototype

Build: React/TypeScript shell, navigation, landing/sign-in layouts, reusable forms/tables/cards/charts, fixtures, responsive rules, contextual copilot drawer and accessible interaction patterns.

Exit: clickable route through overview -> shipment -> Rescue Lab -> review -> history; consistent visual quality at mobile/tablet/desktop sizes. Mock behavior is explicitly labeled.

### Phase 2 - Local shipment and receiving workflows

Build: local API/persistence adapter, shipment creation/editing, destination directory, search/filter/sort, guided demo data, timelines, profile/admin layout and loading/error states.

Exit: saved data survives reload; invalid units/inputs are rejected; main list-to-detail workflow works without AWS. No dead buttons on completed screens.

### Phase 3 - Model, scenario comparison and optimizer

Build: independent calculation modules, parameter versions, quality cohorts, deterministic feasibility/ranking, three intervention types, instant preview, authoritative run action, saved scenarios and incident replay controls.

Exit: reproducibility, no cooling-induced quality recovery, unit consistency, ties, tight budgets, missing capacity and no-feasible-option cases pass. Compare UI values with independent calculation-module fixtures. Phase 3 uses one pure TypeScript engine shared by preview and repository saving; a future Node Lambda can reuse it rather than duplicate a Python engine. Complete the local business demo before cloud expansion.

### Phase 4 - Cloud foundation, authentication and persistence

Build: foundation/web/API/data stacks, private web/data buckets, CloudFront OAC, Cognito, API Gateway, IAM roles, core Lambda handlers and DynamoDB. Generate frontend config from verified stack outputs. Replace mock persistence using an adapter; keep local mode available.

Exit: HTTPS frontend, real sign-in, saved run and per-owner history work. User B cannot read/write user A's shipment. Direct bucket access is denied. Cloud resources and actual deployment evidence are inventoried.

### Phase 5 - Imports and observable analysis workflows

Build: presigned CSV upload/import validation, import SQS/DLQ, Step Functions rescue workflow, asynchronous job states and status polling. Persist model/input versions. Add on-demand scheduled replay only if it benefits the demonstration.

Exit: valid CSV imports; invalid rows produce useful feedback; successful and failed workflows are traceable; repeated requests/events do not duplicate data. Show the teacher one input traversing the actual workflow.

### Phase 6 - Confirmed rescue, reports and notifications

Build: conditional/transactional capacity reservations, decision state machine, DynamoDB Streams, post-decision SQS/DLQ, report worker, reports bucket, SNS and in-app alerts. Authorized links serve only the correct user's reports.

Exit: concurrent confirmations cannot overbook a destination; retry does not repeat reservation; a report/email path is observed; poison-job handling and cancellation rules are documented. Actual email delivery may have a duplicate window; do not claim exactly-once external delivery.

### Phase 7 - AI and richer decision features

Built and verified: live AI explanation, validated natural-language what-if drafts, rescue brief, token/cache limits and fallback, delay sensitivity, atomic split allocation and outcome analytics. See docs/phase-7/ for deployment and test evidence.

Exit: LLM numbers match stored results, unsupported responses are rejected, a timeout preserves the app flow, and prompts cannot trigger writes. Split quantities conserve mass and respect capacity. Analytics distinguish estimates from recorded results and avoid double counting.

### Phase 8 - Cloud engineering, security and migration labs

Built and verified: private ALB/two-worker compute, EBS/EFS, SSM, peering, replacement and controlled scale-out, WAF, Config drift/remediation, RDS TLS fixture, DMS full-load reconciliation and isolated DLQ replay. Audit, monitoring and gross-cost budget resources remain. All five disposable lab stacks were removed after evidence capture. See docs/phase-8/.

Exit: a service has real evidence or an explicit Study label. Explain each failure/availability/scale test, networking path, cost and cleanup. Delete the disposable lab groups after capturing verification. Preserve the main application's functionality without them.

### Phase 9 - Product finish and evaluation package

Build: complete principal screens, presentation mode, responsive/accessibility fixes, final diagrams, source/run/deploy instructions, evidence index, syllabus matrix, report, slides, short video and viva cards.

Exit: rehearse a 7-minute demonstration plus deeper service questions; no fake active-service indicators, unimplemented controls or invented results. A fresh local setup works; cloud smoke checks pass; retained resources and gross spend are documented.

### Phase 10 - Final release readiness and handover (added)

Build: repeat application tests and hosting checks, compare deployed release bytes, inspect current stacks/alarms/queue metadata/subscription status, refresh the dated cost estimate, add repeatable release/archive gates and package current source with the evaluation artifacts.

Exit: release files and package integrity checks pass, evidence is dated, and the handover states all open operational items. No production message is purged, no alarm disabled and no email delivery inferred to create a false green status. Browser visual checks and a human rehearsal remain separate outstanding checks where the existing policy blocks automation.

## 8. Budget envelope and deployment gates

These are **allocation limits, not price quotations**. Validate current regional unit prices, account plan, credit coverage and likely workload before executing a phase. Use gross modeled spend before credits so the plan is still understandable if some credits do not apply.

| Allocation | Maximum planning amount | What it bounds |
|---|---:|---|
| Main serverless app, storage and delivery | US$35 | Small evaluation workload and retained environment |
| Bedrock experiments | US$10 | Bounded explanation/draft requests; no provisioned throughput |
| Compute/network/storage labs | US$35 | Short-lived EC2/ALB/ASG, EBS/EFS, peering and required connectivity |
| Relational/migration labs | US$45 | RDS and eligible DMS experiment; Multi-AZ/replicas only if this cap permits |
| Security/observability labs | US$20 | Scoped WAF, Config, KMS, logging/audit choices |
| Contingency reserve | US$55 | Pricing uncertainty, retained storage, transfer, tax/FX considerations and cleanup delays |
| Total ceiling | **US$200** | Total project planning limit, not recurring monthly spend |

Do not consume the reserve just to increase service count. If a lab estimate exceeds its allocation, shorten/redesign it or retain a transparent study rather than silently removing cost limits. Configure planning alerts at US$25/50/100/150/180 gross actual/forecast spend where supported by the selected budget definition. Credits and billing filters must be understood; budget notifications may be delayed and cannot enforce a hard cap.

Before each cloud phase: preview exact resources, estimated active hours/requests/storage/tokens, residual charges, verification and deletion commands. Require explicit deployment authorization at that boundary. Budget disclosure is planning input, not authorization to create resources now. For the main demo, retain only the required stacks; labs are disposable.

## 9. Teacher-facing explanation and evidence

Present four diagrams at different depths:

1. Business flow: incident -> candidate actions -> recommended plan -> confirmation.
2. Main cloud flow: browser/identity/API -> calculation/workflow/data -> reports/notifications/AI.
3. Engineering lab: two AZs, ALB/ASG, EBS/EFS, routes and peer VPC.
4. Migration: legacy SQL -> DMS -> cloud SQL, hybrid connection and a separate legacy-service comparison panel.

For each service prepare one sentence answering: **what problem does it solve here, what did we actually configure, and what evidence proves it?** Example: “SQS buffers report work so a slow report does not block rescue confirmation; this failed message reached the DLQ after the configured retries.”

Evidence register fields: syllabus topic, feature, stack/resource ID, planned/deployed/lab/study state, experiment, expected behavior, actual result, timestamp, screenshot/log reference and cleanup status. Empty evidence means unverified, not completed.

The short demo should show one primary rescue, one counterexample, one AI explanation, one actual workflow and one reliability/security proof. Keep the remaining services ready for questions and in the coverage appendix. A long list of service logos alone does not demonstrate architecture depth or guarantee marks.

## 10. Documentation status and reference checks

Completed now: expanded design, feature backlog, four-bucket architecture, phase gates, complete syllabus audit and budget allocation. Still pending: all application implementation, UI rendering/QA, tests, account/price checks, infrastructure creation, deployment and experimental evidence.

Inputs: original syllabus and FreshRoute project notes reviewed in the companion roadmap. No exact 20-mark scoring rubric was supplied; the teacher-facing criteria here are derived from the user's stated priorities.

Official references for design details checked during this revision:

- S3 lifecycle minimum object size and transition considerations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- EFS mount targets and AZ access: https://docs.aws.amazon.com/efs/latest/ug/manage-fs-access-create-delete-mount-targets.html
- EFS multiple EC2 instances: https://docs.aws.amazon.com/efs/latest/ug/mount-multiple-ec2-instances.html

The companion roadmap includes official sources for Bedrock availability, private S3/CloudFront OAC, queue duplicate delivery, budget notification delay and migration-service changes. Revalidate prices and service availability at deployment time.
