# Phase 7 - grounded copilot and richer decisions

## Product walkthrough

Save an analysis in Rescue Lab, then open its read-only run. **Decision Studio** provides three tools:

1. **Rescue copilot:** request a grounded explanation, downloadable text brief or natural-language what-if draft. Evidence cards cite the saved run and fact IDs. A proposed draft opens a new editable scenario only after the operator reviews and applies it. It does not overwrite the saved run or reserve capacity.
2. **Delay sensitivity:** six deterministic comparisons change only future delay against the frozen temperature, route, capacity and cost assumptions. The saved baseline is labelled; infeasible scenarios remain explicit.
3. **Split allocation:** a bounded subset/fill-order planner considers two or three distinct destinations. Whole-gram quantities conserve the shipment mass, each part is at least one kg, each route pays its fixed trip cost, and the combined budget and receiving constraints must fit. A review step precedes an atomic multi-destination reservation. Status changes and cancellation/delivery release every part together. Versioned PDFs include an allocation page.

**Outcome analytics** shows operator-recorded delivered mass, distinct delivered shipments, active/cancelled plans, produce mix and planned extra cost. A shipment is counted once even when split or repeated in the input. Model-estimated loss is displayed separately. No measured waste prevented or actual paid costs are claimed.

## Architecture and boundaries

`POST /v1/copilot` uses the existing Cognito JWT authorizer but routes to a separate `FreshRouteCopilot` Lambda. That function can read saved runs. Its DynamoDB writes are constrained by IAM to partition keys beginning `AI#`; it cannot mutate owner workspace, reservation, outbox or network partitions. It has no S3, SQS, SNS, Step Functions or action-tool permissions.

The server fetches the authenticated owner's immutable run and creates authoritative facts. The model receives fact text, numeric assumptions and a question capped at 500 characters, without shipment origin, user email or authentication material. The model selects supported summary/fact IDs and may suggest only budget, future delay or future temperature. Unknown IDs, free-form assertions, extra response fields, writes and unsupported drafts are rejected. Displayed numbers are rendered from server facts, not copied from model-generated prose. The copilot is an evidence curator and scenario-draft parser, not an autonomous dispatch agent.

The active transport uses Groq's `openai/gpt-oss-20b` model through a fixed HTTPS endpoint from the server. CloudFormation resolves the `apiKey` field of `freshroute/copilot-api-key` into the Lambda configuration using a Secrets Manager dynamic reference. The agent never retrieves that value; it is absent from browser assets and source. Product labels remain provider-neutral. The optional Bedrock adapter uses the APAC Nova Micro profile with explicitly scoped model ARNs; its account restriction is recorded separately in BEDROCK_ACCESS.md.

## Reliability and request controls

- Explicit 800-completion-token limit for the active transport (500 for the optional Bedrock adapter) and a 9-second request deadline; the deadline aborts the request and returns a labelled deterministic fallback.
- Only validated successful model responses are cached, owner-scoped, for one hour. The canonical cache key includes the immutable run, mode, question, prompt version, provider and model ID. This is an application response cache.
- DynamoDB transactional counters cap uncached attempts at 20 per owner and 200 globally per UTC day. Failures also count, and limits are checked before inference. Cache hits consume no additional model request. These controls bound request/token volume; they do not guarantee an exact dollar spend.
- Cache and quota records have expiry timestamps; DynamoDB TTL is enabled on the Activity table. Expired cache entries are rejected even before asynchronous TTL deletion.
- Model access failures, throttling, timeouts, incomplete output and invalid JSON preserve the calculation and reservation flow. Fallback responses never invent a scenario draft.
- CloudWatch logs contain request identifiers, provenance, safe error class and token counts; application code does not log prompts, model response text or tokens. A durable audit trail/dashboard remains Phase 8 scope; no Bedrock invocation-content logging is enabled here.

## Split correctness

Split requests are recomputed server-side from the owner's saved input. The source signature must match current data. Every selected destination's version and capacity update participates in the same transaction as the reservation, owner workspace revision, shipment lock and outbox event. Partial capacity allocation cannot commit. Identical retries return the existing reservation, while a changed allocation for the same run conflicts. Release transactions update all destination ledgers together and preserve the Phase 6 lifecycle rules.

The planner enumerates small subsets and fill orders and minimizes estimated loss then cost among those plans. It is not a globally optimal vehicle-routing solver. Its preview uses snapshot capacities; confirmation rechecks shared current versions.

## Optional Bedrock adapter restriction

The earlier Bedrock deployment rejected the actual Converse call with `ValidationException: Operation not allowed`. `GetFoundationModelAvailability` reported `authorizationStatus: NOT_AUTHORIZED` while agreement, entitlement and region availability were AVAILABLE. This restriction applies to the optional adapter. The active external transport is verified independently; see RELEASE_STATUS.md and live verification evidence.

AWS describes this exact error as an account security restriction that requires Support: https://repost.aws/knowledge-center/bedrock-invokemodel-api-error . Changing IAM permissions or switching accounts silently is not a fix. Do not upgrade billing, accept model agreements or contact Support on the user's behalf without the appropriate authorization.

Before enabling the optional adapter, rerun live copilot checks and verify AI provenance, token usage, successful response caching and natural-language draft generation against that adapter. Success through the external transport does not establish Bedrock availability. Output validation and deadline behavior are also covered locally.

## Verification and release

47 local tests cover the existing application plus whole-mass split conservation, capacities, combined budget, duplicate destinations, immutable sensitivity calculations, authoritative fact IDs, invalid/unsafe model output, constrained drafts, deadline abort, fallback, deduplicated analytics and credential-safe HTTP transport. Server type checking, API bundling, frontend build and strict CDK synthesis pass.

Live Phase 7 verification checks actual AI generation, a repeat-request cache hit, exact natural-language draft values, authenticated ownership, unsupported modes, prompt-injection write isolation, saved-fact consistency, quota fallback, atomic split capacity updates, idempotent reservation, private split report and release of every allocation. A Phase 6 regression run checks single-destination behavior after the split extension. Final result files identify exactly which checks completed.

Browser visual verification remains blocked by the previously saved browser permission policy. No alternate browser or security bypass is used. The split-report PDF was rendered and visually inspected independently. Existing user data and historical evidence remain intact; temporary QA users and their owned/AI partitions and file versions are cleaned after tests.
