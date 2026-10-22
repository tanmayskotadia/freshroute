# Phase 7 release status

Deployed and functionally verified on 22 October 2026 in account 118462784511, region ap-south-1. FreshRouteApplication reached UPDATE_COMPLETE. The frontend uses provider-neutral AI labels.

Completed: grounded rescue copilot, downloadable brief, reviewed natural-language scenario drafts, six delay sensitivity comparisons, two/three-destination split planning, atomic capacity reservations and release, allocation PDFs, and outcome analytics that distinguish estimates from operator-recorded deliveries.

All 19 live Phase 7 checks passed: 18 HTTP-flow assertions plus the daily-quota assertion. Actual inference returned AI provenance with 701 input tokens and 72 output tokens for the explanation; a repeated request was cached. The draft produced exactly two hours additional delay and INR 900 budget without mutating the workspace. Split reservations conserved mass, reserved all destinations, handled retries, generated a private PDF and released every part on cancellation. Both background events processed with SNS message IDs and no pending outbox event. See live-ai-verification.json.

All 47 local tests and server type checks pass. Frontend build, API bundle and strict infrastructure synthesis passed. The prior split-feature release passed all 31 Phase 5/6 regression checks (regression-verification.json). Those 31 checks preceded the final AI transport switch; the 19 checks above ran against the final deployed artifact.

The active technical configuration uses Groq's openai/gpt-oss-20b model. The optional Bedrock adapter remains; its account restriction is recorded in BEDROCK_ACCESS.md. Successful external inference does not establish Bedrock availability. Product screens use AI copilot and AI-generated evidence without provider branding.

The apiKey field in freshroute/copilot-api-key is resolved by CloudFormation's Secrets Manager dynamic reference. The agent checked only secret metadata and never retrieved its value. It is absent from chat, source and public assets. Rotate through Secrets Manager and redeploy function configuration when necessary.

Artifact: releases/phase7/provider-api.zip, version DayRJC1v_wic1G97i_SHK40E9tD3gSTl. Stateful identities were preserved. Two temporary users, their workspace/AI partitions and private test file versions were deleted.

Browser visual QA remains unverified because the saved browser-origin permission blocks access; no bypass was attempted. Split PDF layout was separately rendered and inspected. CloudFront verification and the earlier SNS email confirmation remain separate limitations; these tests prove SNS publishing, not email delivery. Alarms, dashboards and remaining engineering labs belong to later phases.

Demo: sign in, save an analysis in Rescue Lab, open the saved run and use Decision studio. Ask for an explanation, then a two-hour delay and INR 900 budget draft. Review before applying. Compare delay sensitivity, review a feasible split and inspect Fulfilment and Outcome analytics.
