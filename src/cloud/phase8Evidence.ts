export type EngineeringEvidence = { verifiedAt: string; cleanup: string; experiments: {id:string;group:string;title:string;services:string;status:string;expected:string;observed:string}[] };
export const phase8Evidence: EngineeringEvidence = {
  "verifiedAt": "23 October 2026 (IST); AWS evidence timestamps use UTC",
  "cleanup": "All five disposable lab stacks were removed after verification. Application, audit and monitoring resources remain; no lab compute, SQL or network resources remain running.",
  "experiments": [
    {
      "id": "OP-01",
      "group": "Operations",
      "title": "An audit trail that actually arrives",
      "services": "CloudTrail · S3 · KMS",
      "status": "Verified",
      "expected": "Encrypted log and digest files arrive in the private audit bucket.",
      "observed": "Audit objects and digest files arrived; aws:kms metadata was verified. The lab termination API event is present. Digest-chain cryptographic validation was not run."
    },
    {
      "id": "OP-02",
      "group": "Operations",
      "title": "Detect an incident, observe recovery",
      "services": "CloudWatch · SNS",
      "status": "Verified",
      "expected": "Real metric data triggers an alarm and recovery action.",
      "observed": "14 alarms and the dashboard are configured. The canary transitioned OK → ALARM → OK with successful SNS actions. An existing import-DLQ alarm remains for review; email delivery is not asserted."
    },
    {
      "id": "OP-03",
      "group": "Operations",
      "title": "A visible cost boundary",
      "services": "Budgets · Free Tier",
      "status": "Verified",
      "expected": "Gross-cost thresholds and actual account eligibility are inspected.",
      "observed": "A $200 monthly gross-cost budget has $25 / $50 / $100 / $150 / $180 alerts. Account API returned an active FREE plan. Notifications are delayed and cannot enforce a hard cap."
    },
    {
      "id": "CP-01",
      "group": "Compute & network",
      "title": "Two workers, one private front door",
      "services": "EC2 · ALB · Auto Scaling",
      "status": "Verified",
      "expected": "Both workers pass health checks behind an internal load balancer.",
      "observed": "Two targets were healthy and returned HTTP 200 from the peer VPC. The fixture ALB was private; no production data was used."
    },
    {
      "id": "CP-02",
      "group": "Compute & network",
      "title": "Shared files, separate disks",
      "services": "EBS · EFS · Systems Manager",
      "status": "Verified",
      "expected": "Shared content matches while per-instance scratch remains different.",
      "observed": "Both workers returned the same EFS SHA-256 and distinct EBS scratch IDs. SSM commands succeeded; block devices and the TLS-mounted shared file system were inspected."
    },
    {
      "id": "CP-03",
      "group": "Compute & network",
      "title": "Recover a terminated worker",
      "services": "Auto Scaling · ALB · EFS",
      "status": "Verified",
      "expected": "A terminated worker is replaced without losing the shared fixture.",
      "observed": "ASG launched a new healthy instance after one worker was terminated. Both targets recovered and the EFS checksum remained unchanged."
    },
    {
      "id": "CP-04",
      "group": "Compute & network",
      "title": "Execute a bounded scaling policy",
      "services": "Auto Scaling",
      "status": "Verified",
      "expected": "A controlled +1 policy restores capacity from one worker to two.",
      "observed": "Desired capacity was reduced to one, then the scaling policy was executed. Two in-service instances and two healthy targets were observed. This was not a CPU/traffic-triggered test."
    },
    {
      "id": "NT-01",
      "group": "Compute & network",
      "title": "Routes that permit only the intended path",
      "services": "VPC · subnets · routes · peering · security groups",
      "status": "Verified",
      "expected": "Peer-network fixture HTTP works; SSH remains unreachable.",
      "observed": "Cross-VPC requests reached both private instance addresses through peering. Port 22 was unreachable. The instance security group had no SSH ingress."
    },
    {
      "id": "SC-01",
      "group": "Security",
      "title": "Block a benign request with WAF",
      "services": "WAF · ALB",
      "status": "Verified",
      "expected": "A known test header is blocked while a normal request succeeds.",
      "observed": "The normal private fixture returned 200; the verification header returned 403. WAF was attached to the lab ALB, not the product HTTP API."
    },
    {
      "id": "SC-02",
      "group": "Security",
      "title": "Detect and remediate configuration drift",
      "services": "AWS Config",
      "status": "Verified",
      "expected": "An unattached fixture group moves through compliant, drift and remediation states.",
      "observed": "Actual evaluations recorded COMPLIANT → NON_COMPLIANT → COMPLIANT. The temporary port was removed. The recorder and its disposable stack were deleted."
    },
    {
      "id": "RL-01",
      "group": "Security",
      "title": "Recover a poison message safely",
      "services": "SQS · DLQ · Lambda",
      "status": "Verified",
      "expected": "Repeated failure reaches a DLQ and a corrected replay is processed.",
      "observed": "The isolated poison fixture reached its dead-letter queue after retries. A corrected replay produced the processing log. Production queues were not changed."
    },
    {
      "id": "DB-01",
      "group": "SQL & migration",
      "title": "A private relational fixture over verified TLS",
      "services": "RDS PostgreSQL · Secrets Manager · Lambda",
      "status": "Verified",
      "expected": "A client verifies the database certificate and seeds only fictional rows.",
      "observed": "Private encrypted PostgreSQL 18.3 accepted the CA/hostname-verified client over TLS 1.3. Three parameterized fixture inserts succeeded. The key stayed in AWS resolution/runtime paths."
    },
    {
      "id": "DB-02",
      "group": "SQL & migration",
      "title": "Migrate the rows, then reconcile content",
      "services": "DMS · RDS",
      "status": "Verified",
      "expected": "A full-load task transforms the legacy schema and preserves every selected row.",
      "observed": "The task finished at 100%, one table loaded and zero table errors. Three source rows exactly matched three target rows. This was a same-instance schema lab; no CDC or production cutover is claimed."
    },
    {
      "id": "AP-01",
      "group": "Operations",
      "title": "Keep FreshRoute working throughout",
      "services": "Cognito · Lambda · DynamoDB · AI · reports",
      "status": "Verified",
      "expected": "Cloud engineering changes preserve the rescue workflow.",
      "observed": "All 19 live application checks passed again, including AI generation, cache hit, exact draft values, ownership isolation, split reservation/report/release and daily limits. QA users and files were cleaned."
    }
  ]
};
