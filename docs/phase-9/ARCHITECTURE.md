# Editable FreshRoute diagrams

## Business decision

```mermaid
flowchart LR
  A[Entered shipment incident] --> B[Deterministic comparison]
  B --> C[Frozen analysis snapshot]
  C --> D[AI explanation or reviewed draft]
  C --> E[Operator reviews option]
  D --> E
  E --> F[Current-version and capacity transaction]
  F --> G[Reservation and asynchronous private report]
```

## Retained application

```mermaid
flowchart TB
  B[Browser] --> W[API Gateway HTTPS frontend]
  W --> WL[Web Lambda]
  WL --> S3W[Private S3 web]
  B --> C[Cognito PKCE]
  B --> A[Authenticated HTTP API]
  A --> API[Workspace API Lambda]
  API --> DB[Four DynamoDB tables]
  API --> SF[Step Functions Standard]
  SF --> CALC[Analysis Worker]
  CALC --> DB
  API --> IMPORT[Import SQS and DLQ]
  IMPORT --> IW[Import Worker]
  IW --> DATA[Private S3 data]
  DB --> STREAM[DynamoDB Streams]
  STREAM --> BRIDGE[Outbox Bridge]
  BRIDGE --> Q[Post-decision SQS and DLQ]
  Q --> PW[Post-decision Worker]
  PW --> REPORT[Private KMS S3 reports]
  PW --> SNS[SNS and in-app notification record]
  API --> AI[Copilot Lambda]
  AI --> LLM[Server-side AI provider adapter]
  AI --> CACHE[AI cache and quota state]
  SM[Secrets Manager dynamic reference] -. runtime configuration .-> AI
  CW[CloudWatch dashboard and alarms]
  CT[CloudTrail] --> AUDIT[Private KMS S3 audit]
```

CloudFront remains blocked by account verification; the HTTPS fallback is the deployed frontend. CloudWatch observes relevant services; lines are omitted to keep the diagram readable. The fourth DynamoDB table stores Activity, jobs, notifications and AI state. Email publish and actual email delivery are separate observations.

## Verified and deleted labs

```mermaid
flowchart LR
  SSM[Systems Manager] --> EC2[Two EC2 workers / ASG]
  ALB[Internal ALB and lab WAF] --> EC2
  EC2 --> EBS[Separate EBS scratch]
  EC2 --> EFS[Shared EFS]
  VPC[Compute VPC] <-->|Scoped peering routes| PEER[Peer VPC]
  CONFIG[Config narrow compliance rule] --> SG[Temporary SG drift / remediation]
  RDS[Private RDS PostgreSQL] --> SOURCE[Legacy schema: three fixture rows]
  SOURCE --> DMS[DMS full load]
  DMS --> TARGET[Warehouse schema on same RDS instance]
  DLQ[Isolated poison message] --> REPLAY[DLQ / corrected replay]
```

All five lab stacks were deleted after verification. Multi-AZ RDS, read replicas, Aurora, Direct Connect, SWF, Shield experiments and historical/physical migration services are studies rather than resources in these diagrams. The DMS flow was not CDC or a production cutover.
