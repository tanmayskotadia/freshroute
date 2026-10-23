# FreshRoute final handover

Phase 10 was added after the original roadmap ended at Phase 9. Its scope is final release verification, operational review and a portable handover package. No extra AWS service was provisioned and no queue message or user record was modified.

## Start the project

Website: https://dr4sw5bpoi.execute-api.ap-south-1.amazonaws.com

For evaluation, select **Seven-minute presentation** in the sidebar. Use your own AWS sign-in for AI, reservations and reports; local demo mode supports the deterministic calculation without credentials. Follow docs/phase-9/DEMO_SCRIPT.md. The report, slides, viva preparation and captioned overview are included in the final ZIP.

For local development with Node 24, run `npm.cmd ci`, `npm.cmd test`, `npm.cmd run build` and `npm.cmd run dev`. Full deployment instructions are in docs/phase-9/RUN_DEPLOY_GUIDE.md. Existing hosting remains the approved HTTPS API Gateway/Lambda fallback. Phase 10 changes release tooling and documentation; the verified Phase 9 frontend assets remain current.

## What passed

- Account identity matches 118462784511; region is ap-south-1.
- Foundation, Application and Operations stacks are UPDATE_COMPLETE.
- Fresh HTTPS, security-header, configuration-match and private-S3-denial checks passed.
- Published HTML, configuration, JavaScript and CSS match the local release bytes and MD5 values.
- All 49 application tests and server type checks pass again in Phase 10.
- The offline release gate validates assets, public-config boundaries, recent health evidence and deployed bytes.
- Seven release-package tests cover changed bytes, missing files, unlisted payloads, unsafe paths, excluded working files and a known credential format.
- The final archive verifies every payload checksum and ZIP CRC before delivery. This checks integrity; it does not authenticate a package obtained from an untrusted sender.

## Open operational findings

**Import dead-letter queue:** AWS reports three visible messages, zero in-flight messages and zero delayed messages in FreshRouteImportDLQ. Its alarm remains ALARM. The source import queue and the other three queues show zero messages in the captured snapshot. Queue counts are approximate and can change. No message body was received, no visibility timeout was changed, and nothing was purged or replayed.

Before any replay, the operator should inspect messages in the SQS console, identify each owning job, classify its failure and correct the cause. Reconcile whether the import already wrote records. Replay only deliberately selected work with idempotency preserved, then verify the corresponding job and queue/alarm recovery. Do not disable the alarm or purge records merely to obtain a green dashboard.

**Email:** AWS still reports the rescue subscription as PendingConfirmation. Actual human email delivery has not been proved, even if the user previously clicked a confirmation link. Use the SNS console's current subscription state as the source of truth. Confirmation and a controlled delivery test remain separate actions. The operations topic has no confirmed email recipient in the prior evidence. Phase 10 did not send more confirmation emails.

**Browser and rehearsal:** live browser visual/accessibility checks remain blocked by the existing origin policy; no bypass was attempted. A human should verify phone/desktop presentation-guide layout, keyboard focus and the timed demonstration before evaluation. The overview video is a captioned slide overview, not a live app recording.

**CloudFront:** account verification remains unresolved; the approved HTTPS fallback is the actual hosting architecture. Do not label CloudFront as deployed.

## Cost and retained resources

The fresh gross estimated account cost and its exact UTC query time are in OPERATIONS_CHECKS.json. It excludes credits/refunds, includes a partially elapsed day, is account-wide rather than isolated FreshRoute spend, and is delayed billing data rather than a final invoice. Retained application, storage, KMS key, logs and monitoring can continue to incur charges. USD 200 is a planning ceiling; budget notifications are not an enforced cap.

The five engineering lab deletions and residual inventory checks are dated Phase 8 evidence, not new Phase 10 experiments. No lab was recreated. Preserve the project data and audit evidence for evaluation. Stack deletion alone does not remove all retained resources; any later shutdown must separately review buckets/versions, tables, logs, keys and budget configuration with the resource owner.

## Repeat the release checks

From the source root, with a production build and captured current AWS checks:

```powershell
node scripts/phase10/verify-release.mjs
python scripts/phase10/test-package-verifier.py
python scripts/phase10/verify-package.py output/phase-10/FreshRoute-Final-Submission.zip
```

The release checker intentionally rejects AWS health evidence older than 24 hours. Refresh CLOUD_CHECKS.json and DEPLOYED_FILES.json through the AWS MCP connection or authorized AWS APIs; never edit observations merely to make a check pass. No secret value is needed for these reads. The package verifier can run independently without extracting the ZIP or contacting AWS.

Status: the implementation and handover audit are complete, with the operational items above still open. This is not an all-green production-readiness claim, a food-safety certificate or a guaranteed grade.
