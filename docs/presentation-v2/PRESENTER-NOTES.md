# FreshRoute faculty presentation notes

Use these notes alongside the eight-slide deck. The website demonstration is a suggested sequence to rehearse, not a record of a demonstration already performed.


## Slide 1: FreshRoute

OPENING, ABOUT 35 SECONDS

FreshRoute is a cloud application that helps a dispatcher decide what to do when a perishable shipment is delayed. The operator enters the incident, compares feasible responses, reviews the evidence and reserves receiving capacity. We then record fulfilment and preserve a private decision report.

Say: “Our project connects a quality calculation to an actual receiving-capacity decision. Tracking a delayed truck alone does not tell a dispatcher whether continuing, cooling or rerouting is feasible.”

Introduce the team exactly as shown.

The application is an academic prototype. Its shipment records are fictional and its quality model illustrates a decision process. It does not certify food safety or prove measured food-waste savings.

Sources: docs/faculty-guide/CONTENT.json, introduction and project scope. src/model/engine.ts. Team names supplied by the project team.



## Slide 2: The problem and the missing link

PROBLEM, ABOUT 60 SECONDS

Explain the operational problem first. Delay and temperature exposure change the modeled quality at arrival. A response chosen only because it is cheap or nearby can violate receiving hours, produce rules, a quality threshold or capacity. That can create late rejection and leave quantity at risk.

The decision gap FreshRoute addresses is a reproducible comparison connected to current capacity and an explicit recorded approval. The application combines these steps in one workflow. We do not claim that all commercial logistics systems lack these capabilities.

Real-life users could include a produce distributor, a market receiving centre, a cooperative, or a cold-chain dispatcher. They need to evaluate feasible alternatives before they commit the shipment to a destination.

Say: “The useful output is a reviewed plan that a receiver can accept. We preserve the assumptions and check capacity at approval, so another dispatcher cannot silently consume the same receiving space.”

The route duration, incident delay and temperature history are entered assumptions. This project does not include live GPS, live traffic or physical sensor ingestion. Explain that a future sensor integration could replace these inputs without changing the approval principle.

Source: src/model/engine.ts, source constraints and ranking. docs/faculty-guide/CONTENT.json, problem statement and product limits.



## Slide 3: Our solution and key features

SOLUTION AND WEBSITE FLOW, ABOUT 90 SECONDS

Introduce the solution using the feature groups on this slide, then explain the website sequence. Observe: open Overview, select Shipments and inspect FR-101. Explain its produce, quantity, entered delay, route assumptions and quality threshold.

Simulate: open Rescue Lab and compare continuing, cooling and rerouting. Change one input only if you want to demonstrate sensitivity. Use “Run cloud analysis” for a cloud execution. A local “Save analysis” action is a different persistence path, so do not describe every saved item as a Step Functions run.

Save: show the workflow hub and saved-analysis history. A saved analysis freezes its inputs, calculated outputs, model version and source signature. It is evidence for a decision. It does not hold receiving capacity.

Review: open Decision Studio. Explain the ranked options, constraint rejection reasons, cost and modeled quantity below threshold. Demonstrate sensitivity, split planning or the AI explanation if appropriate. A scenario draft requires review and a new calculation.

Reserve: open “Review cloud plan” and select “Reserve receiving capacity.” The cloud checks current source versions and capacity. If the data is stale, recalculate. The reservation commits the operational choice.

Verify: open Fulfilment, inspect the owner-bound report, mark the shipment dispatched and record delivery. Show the outcome record and analytics. To cancel a demonstration reservation, cancel before dispatch through the application rather than altering database records.

Say: “Saving the calculation preserves what we considered. Reserving capacity commits what we will do. Those are deliberately separate actions.”

Use an original seeded shipment or label changed inputs clearly. Do not claim that the live demonstration has already occurred because the deck includes this script.

Sources: docs/faculty-guide/CONTENT.json, website walkthrough. src/pages and application routing. docs/phase-8/application-regression.json.



## Slide 4: AWS architecture

CLOUD ARCHITECTURE, ABOUT 2 MINUTES

This is a simplified application diagram. Begin at the React interface. Amazon Cognito supplies user sign-in with authorization-code PKCE. API Gateway receives authenticated HTTP requests, and the Workspace API Lambda applies ownership and business rules. Identity authenticates the person; application checks authorize access to their records.

AWS Lambda runs code on demand. It is suitable for these short request handlers and background jobs without keeping an EC2 web server running. The deployed application has eight functions with separate responsibilities: Web, Workspace API, Verification, Import Worker, Analysis Worker, Outbox Bridge, Post Decision Worker and Copilot.

Amazon DynamoDB stores four logical datasets in four tables: Shipments, Runs, Destinations and Activity. Saved runs preserve calculation evidence. Destinations hold shared network receiving capacity. Activity includes jobs, notifications, AI cache and quota records. Conditional writes and transactions protect state transitions. The destination capacity is shared intentionally, while user records and reads require ownership checks.

AWS Step Functions Standard orchestrates cloud analysis. Its actual workflow validates input, calculates and persists through the Analysis Worker, and records failures through a catch path. Retries handle eligible transient errors. The website stages on slide 3 span several user actions. The analysis worker persists its result to DynamoDB as shown here.

Amazon SQS decouples imports and post-decision work. A queue buffers jobs when workers are busy. Separate dead-letter queues preserve repeatedly failing messages for inspection. DynamoDB Streams makes committed Activity outbox items available to the Outbox Bridge, which places jobs on SQS. The Post Decision Worker writes a private report and app notification and publishes to SNS. Consumers handle duplicates idempotently.

Amazon S3 provides four private, versioned, TLS-only buckets: web for release assets, data for imports and fixtures, reports for private PDFs, audit for CloudTrail records. A report download uses an owner check and a short-lived signed link. Four buckets express different permissions and retention purposes rather than adding services for decoration.

Amazon SNS provides the email notification integration. The latest retained evidence still showed its email subscription PendingConfirmation. App inbox delivery is implemented; do not claim a verified email receipt without a fresh successful delivery.

AWS IAM limits each worker to required actions. AWS KMS protects reports and audit with a customer-managed key. Secrets Manager stores the AI API key for server-side access. CloudWatch provides logs, metrics and alarms. CloudTrail records supported account API activity in the audit bucket. Infrastructure uses AWS CDK and CloudFormation. Budgets provides delayed spending alerts rather than a hard spending cap.

Frontend hosting uses a separate API Gateway HTTPS route, Web Lambda and private S3. CloudFront creation was blocked by account verification, so CloudFront is not a deployed frontend dependency. All deployment context is Mumbai, ap-south-1.

Sources: infrastructure/app.ts; infrastructure/workflows.ts; infrastructure/fulfilment.ts; infrastructure/copilot.ts; docs/phase-8/operations-final-verification.json; docs/phase-10/CLOUD_CHECKS.json; docs/faculty-guide/CONTENT.json.



## Slide 5: The decision model

MODEL AND WORKED EXAMPLE, ABOUT 90 SECONDS

The main diagram explains the deterministic calculation. Entered temperature history is converted to equivalent exposure using an illustrative Q10 approach. With Q10 = 2, increasing temperature by 10 degrees C doubles the modeled deterioration rate. Quality cohorts represent parts of the shipment with different starting conditions. The engine computes quality decay and sums cohort mass below the declared threshold.

Hard constraints include destination produce rules, receiving hours, remaining receiving capacity, the declared quality limit and budget constraints where applicable. An option that fails a hard constraint receives a reason and cannot win just because it has a low weighted score. Feasible options are ranked by the configured trade-offs. The result preserves input and model versions.

The lower diagram uses the unchanged original FR-101 seed: 500 kg of tomatoes and an entered three-hour delay. Continuing produces modeled quality about 58.3 and 350 kg below threshold. Eastside produces modeled quality 74.0 with 0 kg below threshold and a modeled extra cost of Rs 450. The original seed ranks Eastside first among feasible options. Changed parameters can change the winner.

Say: “The numerical result comes from our calculation, not from the language model. Here the model predicts a different quantity below threshold, but we do not call this measured food saved.”

This is an academic decision model, not a validated food-safety or shelf-life certification. Its outputs require real calibration and operational validation before commercial use.

Sources: src/model/engine.ts; src/model/parameters.ts; tests/model.test.mjs; docs/phase-3/seeded-incident.json; docs/faculty-guide/CONTENT.json.



## Slide 6: Reservation and fulfilment

TRANSACTIONS AND RELIABILITY, ABOUT 90 SECONDS

Begin with the saved analysis. The operator asks to reserve a receiving plan. The API checks ownership, source versions and the current availability of the destination. A DynamoDB transaction conditionally updates the relevant records and capacity together. Competing operators cannot both claim the same remaining capacity when the conditional transaction protects it. A stale or infeasible request is rejected and requires recalculation.

Quantities use whole grams and monetary amounts use integer paise to avoid careless floating-point accounting in the transaction. Idempotency protects a retried request from applying the same reservation twice.

The transaction also records an outbox item. DynamoDB Streams and an Outbox Bridge deliver background jobs to SQS. The post-decision worker generates the private PDF, updates the app inbox and invokes SNS publishing. Work can retry independently of the original browser request. The queues use dead-letter destinations for repeated failures. A background report failure does not undo a capacity hold that has already committed.

The state lifecycle is confirmed, dispatched, delivered. A confirmed plan may instead be cancelled before dispatch. Delivery or valid cancellation releases capacity exactly once. A repeated terminal action cannot release capacity twice. SNS email delivery depends on a confirmed subscription and is distinct from a successful publish request.

Say: “The approved decision and capacity change commit together. The document and notifications follow asynchronously, so the user does not have to keep the browser request open.”

Source: infrastructure/fulfilment.ts; application reservation and fulfilment handlers; docs/phase-8/application-regression.json; docs/faculty-guide/CONTENT.json.



## Slide 7: AI explanation with operator control

AI INTEGRATION, ABOUT 75 SECONDS

The AI Copilot explains a saved analysis and can suggest a structured scenario draft. The server supplies authoritative facts from the saved calculation. It validates returned fields and checks that numerical claims agree with the known result. A failure, timeout or invalid response selects a deterministic fallback. A model outage therefore does not prevent the ordinary calculation workflow.

A draft changes proposed assumptions only after the operator reviews it. It must go through a new calculation and a separate approval. The Copilot execution role cannot directly reserve receiving capacity. The diagram's final approval step represents a later operator action, not a tool the model can call.

Secrets Manager holds the API credential. The browser never receives that credential. Runtime IAM grants the server only the secret access it requires. Avoid opening or displaying the secret value during the presentation.

The implementation bounds model output to 800 tokens and uses an approximately nine-second request deadline. It caches for one hour and tracks uncached daily attempts: 20 per owner and 200 globally per UTC day. These are implementation safeguards, not a guarantee of zero cost.

The feature uses a server-side adapter to the configured external LLM API. Explain the deployed provider accurately if faculty asks. Optional adapters do not establish that another cloud service has actually handled a request.

Say: “The AI makes a computed result easier to understand. The operator remains responsible for changing assumptions and approving a receiving plan.”

Sources: infrastructure/copilot.ts; Copilot server implementation; docs/faculty-guide/CONTENT.json, AI controls and limitations.



## Slide 8: Cloud depth with evidence

CLOSING AND SYLLABUS COVERAGE, ABOUT 90 SECONDS

The diagram distinguishes what is running for the application from what was tested temporarily and from topics studied without claiming a deployment.

RETAINED APPLICATION: API Gateway, Lambda, Cognito, DynamoDB, S3, Step Functions, SQS, SNS, IAM, KMS, Secrets Manager, CloudWatch, CloudTrail and Budgets. AWS CDK and CloudFormation define repeatable infrastructure. DynamoDB Streams connects committed changes to background work. This demonstrates managed compute, identity, object and key-value storage, asynchronous communication, workflow orchestration, security, audit and operations.

VERIFIED AND DELETED LABS: isolated EC2 Auto Scaling workers behind an internal Application Load Balancer, distinct EBS scratch storage and shared EFS checksums, VPC peering, SSM commands with denied SSH, instance replacement and a controlled scale from one to two instances. A WAF test returned ordinary 200 responses and blocked test requests with 403 on the lab ALB. WAF is not protecting the main application HTTP API. AWS Config showed compliant state, a controlled drift and remediation. Reliability tests included an isolated poison message and DLQ replay.

The relational lab used private RDS PostgreSQL and verified a TLS SQL connection. AWS DMS performed a full load of three exact rows between two schemas in that same RDS instance. This establishes a small verified full-load exercise. It does not establish continuous CDC, an on-premises migration or a production cutover. All five temporary lab stacks were deleted after verification to reduce running costs. The foundation, application and operations stacks remained.

STUDY OR RESTRICTION: Aurora, RDS Multi-AZ and read replicas, SWF, Direct Connect, Shield, SMS and the Snow family belong to the study or comparison scope. CloudFront remains blocked by account verification. Trusted Advisor support API access was restricted. No slide claims that every syllabus service is continuously deployed.

Evidence includes 49 application tests and 19 cloud business regressions recorded in Phase 8. These are dated results rather than a claim that tests have just run during this talk. The 23 October Phase 10 snapshot showed 14 alarms, with 13 OK and one alarm for three preserved import-DLQ messages. The SNS rescue email subscription still appeared pending in retained evidence. USD 200 is the project planning budget, not a Free Tier guarantee or a hard AWS cap. Budget alerts can be delayed.

Close by demonstrating one meaningful path: inspect FR-101, run cloud analysis, review a feasible receiving plan, reserve capacity, then show fulfilment and the private PDF. End on why the architecture matters: reproducible comparison and a capacity-backed operational record.

Sources: docs/phase-8/compute-verification.json; replacement-verification.json; config-verification.json; migration-verification.json; scale-and-migration-completion.json; cleanup-verification.json; application-regression.json; docs/phase-10/CLOUD_CHECKS.json; OPERATIONS_CHECKS.json; docs/faculty-guide/CONTENT.json.

