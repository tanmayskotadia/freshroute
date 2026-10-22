# Deployment repairs and boundaries

The first DMS attempt failed because the replication subnet group was created before dms-vpc-role. The corrected template makes both subnet group and instance depend on that role. The final DMS task completed full load at 100%, with one table loaded and zero errored tables; SQL row content matched exactly.

The first Config attempt had a recorder/channel stabilization dependency cycle. It rolled back. The next attempt exposed the inline Python cfnresponse import convention and also rolled back. A self-contained HTTPS callback handler replaced the helper dependency, and registration now performs recorder, channel, start and rule operations in sequence. The final Config stack completed and actual compliant, non-compliant and remediated evaluations were captured. Failed attempts are not counted as successful tests.

The long combined Config polling response expired in AWS MCP's task interface. Final proof uses separately returned GetComplianceDetailsByConfigRule calls with actual timestamps. The temporary fixture rule was removed, recording stopped and cleanup requested only after compliant remediation was observed. No expired tool result is treated as a pass.

The source for future Config runs additionally rejects an existing external recorder and defines a seven-day registration log group. The observed run used the same sequential callback logic and a generated function log group; generated lab log groups are removed during final cleanup. The source's optional ASG scaling policy is equivalent to the named lab policy executed through MCP during the controlled scale-out experiment. These source hardening differences are not claimed as a second live deployment.

All secrets remained inside AWS-managed resolution/runtime paths. No secret value was fetched by the agent. No production queue message was deleted or replayed. An existing production import DLQ alarm remains a real operational finding for review.

The final trail separates management WRITE_ONLY from scoped S3 report-object ALL data events; the S3 selector explicitly excludes management events. The audit bucket is excluded from data selectors. Digest generation and delivery were observed; full cryptographic digest-chain validation remains unperformed.
