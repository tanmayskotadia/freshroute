# Phase 8 release status

Implemented and functionally verified across 22–23 October 2026. AWS evidence uses UTC; final cleanup was verified at 2026-10-22T19:25:00Z (23 October IST). Deployment account 118462784511, region ap-south-1.

Retained: main application and data, encrypted CloudTrail delivery and scoped report-object audit events, CloudWatch dashboard and 14 alarms, operational SNS metadata topic, gross-cost budget with five thresholds. The trail delivered actual encrypted files and digests; the lab termination API event was observed. The canary alarm and recovery published successfully to SNS.

Verified disposable experiments: two healthy EC2/ALB workers, shared EFS versus distinct EBS scratch, SSM without SSH, VPC peering and blocked SSH, ASG replacement, controlled one-to-two policy scale-out, WAF 200/403 comparison, Config compliant → non-compliant → remediated, poison-message DLQ/replay, private RDS with verified TLS 1.3, and DMS full load with exact content reconciliation. DMS finished at 100%, one table loaded, zero tables errored, and three matching source/target rows. Full load was between schemas on the same disposable RDS instance; no CDC or production cutover claim is made.

All 49 local tests and server type checks pass. Frontend production build and strict CDK synthesis pass. All 19 live main-application regression checks passed after the infrastructure changes, including actual AI generation/caching/drafts and split reservations/reports. Temporary regression users and files were cleaned. Evidence is in the JSON files beside this status document.

All five latest disposable stacks reached DELETE_COMPLETE: ComputeLab, SqlLab, MigrationLab, ConfigLab and ReliabilityLab. Inventory confirmed no remaining lab instances, EBS volumes, network interfaces, VPCs, load balancer, EFS, RDS, DMS, queues or recorder. Generated Config registration log groups were removed. Main Foundation, Application and Operations stacks remain UPDATE_COMPLETE. See cleanup-verification.json. Retained app/audit/monitoring resources continue to incur their normal charges; USD 200 is not an enforced spending cap.

The evidence screen at /evidence contains searchable/filtered proof cards, expandable expected/observed results, JSON export, architecture diagrams, cost/lifecycle notes and a study library. Its displayed verification is a dated snapshot, not a live health feed. Refresh the deployed app after publication to load the current release.

Limitations: browser visual QA remained blocked by the existing origin policy; no bypass was attempted. CloudFront still requires account verification. The operational SNS topic has no email subscription, and delivery to the prior rescue email is not newly claimed. An existing production import DLQ alarm remains for review; its messages were preserved. Trusted Advisor API requires a support subscription, so restricted checks remain studies; no paid support plan was enabled. Digest-chain cryptographic validation, cfn-lint and cfn-guard were not executed. Expensive, physical and legacy syllabus services remain explicitly labelled studies.

For reproduction, deployment repairs, cleanup details and service boundaries, read IMPLEMENTATION.md, COST_AND_LIFECYCLE.md and DEPLOYMENT_NOTES.md. Phase 9 (presentation, report, slides and final evaluation package) remains separate work.
