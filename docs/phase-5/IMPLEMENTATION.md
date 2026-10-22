# Phase 5: imports and cloud analysis jobs

The Phase 5 implementation is deployed with Phase 6 because fulfilment relies on server-calculated saved runs. The Workflow hub shows owner-scoped import and analysis jobs, their states, timeline, safe errors, trace identifiers and links to saved results. It polls only while visible. The latest 100 jobs are shown, with truncation disclosed.

## CSV imports

Download the template in Workflow hub. Upload a UTF-8 CSV with the exact ten columns. A five-minute signed S3 PUT URL writes to an owner/job-specific quarantine prefix. Completion checks size and content type and freezes the S3 VersionId. The SQS consumer reads that exact version, validates every row and commits all shipments plus job completion in one DynamoDB transaction. An invalid row imports nothing. Completion retries cannot create extra shipments.

The parser supports BOM, CRLF, quoted commas and escaped quotes, with 128 KB / 25 row limits. Errors identify rows. Uploaded files are private, versioned and expire from quarantine after seven days. The queue has a separate fourteen-day DLQ and uses partial batch failures, visibility timeout and concurrency controls. A stale processing lease may require delayed retry; infrastructure failure is not reported as successful import.

## Saved analyses

The API validates the authenticated owner's current source versions and freezes shipment, receiving destinations, options and model parameters into a job. A Standard Step Functions execution validates inputs, calculates the deterministic model and saves the immutable run and job completion atomically. Failure is recorded separately and the execution fails. Workspace conflicts have bounded retries. Request UUIDs and execution names support idempotent retries.

The browser polls up to ninety seconds. Leaving or timing out does not cancel the cloud job; its state remains visible in Workflow hub. No AI output is used by this deterministic calculation path.

## Evidence

Phase 6 live verification includes successful actual Step Functions executions, saved runs and downstream reservations. All ten additional import checks passed: signed uploads, SQS-driven import, frozen object versions, duplicate completion, cross-owner job denial, all-or-nothing invalid CSV rejection, row errors and job listing. Results are stored in `docs/phase-6/final-verification.json`.

## Recovery

Inspect `/freshroute/importworker`, `/freshroute/analysisworker` and `/freshroute/analysis-workflow` logs, the owner-scoped job and the Step Functions execution before retrying. Reuse the original request ID for transport retries. Import infrastructure failures eventually reach `FreshRouteImportDLQ`; repair the underlying cause before controlled redrive. Do not silently drop failing messages or reset a real workspace. CloudWatch alarms and automatic redrive are later operations work.
