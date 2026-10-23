# FreshRoute viva cards

### 1. What is FreshRoute?

A dispatcher decision-support app that compares rescue options for delayed perishable shipments, saves the calculation, and checks capacity before an operator confirms a plan.

### 2. Why is it useful?

It connects an explainable comparison with an auditable operational decision. It is a prototype: no measured food savings or recipient integration is claimed.

### 3. Why four S3 buckets?

Web, data, reports and audit have different writers, readers and retention needs. All are private and versioned; reports and audit use the customer-managed KMS key.

### 4. Why DynamoDB instead of RDS for the main app?

The access patterns are owner-and-ID lookups, histories and conditional capacity transactions. RDS was an isolated legacy SQL teaching lab, not a second live source of truth.

### 5. How do you prevent double-booking?

Whole-gram quantities, conditional versions, transaction checks, stable operation identity and allowed state transitions protect capacity from duplicate or stale requests.

### 6. Can AI reserve a shipment?

No. It returns validated explanations or drafts. Its IAM writes are limited to AI state; the operator must explicitly review and confirm business actions.

### 7. Which model provider is used?

The current backend adapter uses Groq openai/gpt-oss-20b. The interface uses neutral AI wording. Bedrock is an optional adapter and successful Bedrock use is not claimed.

### 8. Where is the API key?

Secrets Manager, freshroute/copilot-api-key, field apiKey. CloudFormation resolves it for the server runtime. Never expose it in frontend config, source, slides or logs.

### 9. What happens when AI is unavailable?

A nine-second deadline, strict schema/fact validation and deterministic fallback keep the saved calculation authoritative. Failure does not approve or reserve anything.

### 10. How is AI cost bounded?

800 output tokens, a one-hour owner-aware cache and UTC uncached request quotas of 20 per owner and 200 globally per day. Failed uncached attempts count.

### 11. How is quality calculated?

Entered temperatures become equivalent exposure at 10 C using Q10=2; produce-specific exponential decay affects weighted quality cohorts. Parameters are illustrative.

### 12. How is estimated loss calculated?

Sum cohort mass whose modeled quality is below the declared threshold. It is not total mass times one minus mean quality, and it is not measured spoilage.

### 13. Does the top score always win?

Hard constraints run before ranking. Closed receiving hours, rejected produce, low quality, excess budget or insufficient capacity can make a high score infeasible.

### 14. Why freeze analyses?

A saved snapshot preserves inputs, model version and results for comparison. Later source edits cannot rewrite history and require recalculation before confirmation.

### 15. Why use Step Functions?

The Standard workflow exposes analysis steps, retries, catch paths and job state instead of hiding coordination inside one long browser request.

### 16. Why separate queues?

Imports and post-decision jobs have different work and failure patterns. Each can retry or fail without tying up the other workload.

### 17. What is a DLQ?

A dead-letter queue preserves repeatedly failing messages for diagnosis. The isolated poison/replay test used only lab queues; production DLQ contents were preserved.

### 18. What does DynamoDB Streams do?

A decision-state change creates a downstream event for the outbox bridge. Consumers must handle duplicate delivery idempotently.

### 19. SNS versus SQS?

SNS publishes events to subscribers; SQS buffers work for consumers. Publish success is not evidence that a person received an email.

### 20. Has email delivery been proved?

No new human-delivery claim is made. Rescue subscription confirmation remained unverified at the last check; the operations topic has no email subscriber.

### 21. Why no CloudFront?

Account verification blocked distribution creation. The approved fallback is HTTPS API Gateway plus a Web Lambda reading private S3. CloudFront stays labelled blocked/study.

### 22. Is the EC2 lab part of the production path?

No. Two workers, internal ALB, EFS/EBS and peering were bounded teaching experiments. They were deleted after evidence capture.

### 23. EBS versus EFS versus S3?

EBS is block storage attached to compute; EFS is a shared filesystem; S3 stores objects through an API. The lab observed distinct scratch bytes and equal shared-file checksums.

### 24. What proves Auto Scaling?

The evidence records a terminated worker replaced by a healthy new worker and controlled scale-out from desired one to two. It does not prove arbitrary traffic-load scalability.

### 25. What proves networking?

Allowed peering connectivity with return routes, denied SSH, managed SSM commands, and private SQL access. VPC peering is not a physical Direct Connect link.

### 26. Multi-AZ versus read replica?

A standby targets availability/failover; a read replica targets read scaling with replication lag. Both are studies here; the SQL lab was Single-AZ.

### 27. What exactly did DMS migrate?

Three fictional rows between two schemas on the same disposable PostgreSQL RDS instance. Full load completed at 100% with zero table errors and exact row reconciliation.

### 28. Did you test CDC or production cutover?

No. Full load and reconciliation were tested. CDC, external-source migration, cutover and rollback remain designs, not measured outcomes.

### 29. What did WAF prove?

An ordinary lab request returned 200 and a benign known pattern returned 403. The WAF protected the compatible lab ALB, not the main HTTP API.

### 30. CloudWatch, CloudTrail and Config?

CloudWatch observes logs/metrics/alarms; CloudTrail records API activity; Config tracks configuration/compliance. Separate evidence supports each role.

### 31. What is the KMS evidence?

Reports and audit objects use the customer-managed key with rotation and scoped permissions. A delivered encrypted audit object was checked; no certification is implied.

### 32. Did you validate CloudTrail digest chains?

Delivery of audit objects and digests was observed, and validation was enabled. Cryptographic digest-chain verification was not executed.

### 33. What did Config remediation show?

A narrow temporary security-group drift changed compliance, then remediation restored COMPLIANT. The temporary recorder and lab resources were deleted.

### 34. Is everything free?

No. Free Tier and credits are account-specific and time-bound. USD 200 is a planning ceiling; budgets alert after delayed usage rather than enforcing a hard stop.

### 35. What remains chargeable?

Retained application, storage, encryption key, logs, monitoring and requests can accrue charges. Deleted lab inventory is documented; billing estimates are delayed.

### 36. How are all syllabus services covered?

The CSV maps every named topic to retained implementation, verified/deleted lab, restricted service or study. Snow family, SMS, SWF, Aurora and Direct Connect are not shown as active.

### 37. What are the six Well-Architected pillars here?

Operational excellence: runbooks; security: owner checks; reliability: retries/idempotence; performance: managed capacity; cost: lab cleanup; sustainability: avoid idle infrastructure.

### 38. What does local mode prove?

Browser-local forms, persistence, deterministic calculation and snapshot workflows. It does not prove live authentication, cloud reservations, AI invocation or email.

### 39. What would production need?

Calibrated models, real recipient/dispatch integration, confirmed delivery channels, recovery and load tests, monitoring ownership, data protection review and operational runbooks.

### 40. What remains before presenting?

Human rehearsal and browser visual/keyboard review, account verification for CloudFront if desired, and subscription confirmation plus delivery testing before claiming email receipt.