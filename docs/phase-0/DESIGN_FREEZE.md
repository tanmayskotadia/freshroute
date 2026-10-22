# FreshRoute - Phase 0 design freeze

Status: Phase 0 design frozen. Version 1.0, 22 October 2026. Current implementation progress is tracked in README.md and docs/phase-1/IMPLEMENTATION.md; Phase 1 is now complete.

This specification turns the two project roadmaps into implementation decisions. It supersedes them where details conflict. No account access, prices, model access, deployment or experiments have been verified in this phase. The US$200 total ceiling is a planning constraint, not an entitlement to free AWS usage.

## Product promise

**Help a perishable-food distributor choose a feasible rescue action when delivery conditions deteriorate.**

The operator sees the problem, compares modeled alternatives, reviews the trade-offs, confirms a decision and records what actually happened. The product does not certify food safety or claim validated prediction accuracy. AI explains computed evidence; it does not create that evidence.

Primary user: a distributor operator managing fictional demonstration shipments. Administrator: manages destination rules and versioned model assumptions. A food bank is an accepting destination type; a full public marketplace and real commercial booking integrations are outside the first release.

Teacher-facing story: **Observe -> Simulate -> Decide -> Verify.** Show business value before service architecture. One excellent end-to-end flow is the main demonstration; engineering experiments substantiate the broader syllabus coverage.

## Decisions frozen for implementation

| Decision | Selected approach | Reason |
|---|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS; accessible reusable primitives | Component consistency and a static deployment artifact |
| Icons and charts | Lucide icons; Recharts for linked analytical charts | Readable product UI without writing a charting framework |
| Initial map | SVG route schematic and seeded coordinates/travel times | Reproducible demo, no mapping subscription; not road-aware routing |
| Navigation | Desktop sidebar; collapsed tablet navigation; mobile drawer | Works across overview, detail and analysis flows |
| Backend | Python calculation modules and Lambda adapters | Deterministic independent model; small AWS boundary |
| Persistence | Local adapter first; DynamoDB adapter later | Runnable development without AWS credentials |
| Cloud API | API Gateway HTTP API and Cognito JWT authorizer | Main authenticated API; WAF is a separate compatible-resource lab |
| Calculation workflow | Step Functions Standard | Traceable stages, retries/catch and useful teaching evidence |
| Async processing | Import queue and post-decision queue, each with DLQ | Separate workloads and independent failure handling |
| Storage | Four S3 buckets: web, data, reports, audit | Different access principals and retention requirements |
| AI | Bedrock behind backend adapter | One provider interface, bounded requests and grounded explanations |
| Infrastructure | SAM/CloudFormation with separate app/lab stacks | Repeatability and independent teardown |
| Application roles | Operator and administrator | Useful distinction without a complex organization model |
| Demo geography | Fictional Ahmedabad-area distributor network | Familiar context; mark destinations and travel assumptions fictional |
| Produce set | Tomatoes, bananas, leafy vegetables | Small, contrasting illustrative profiles |
| Units | kg, hours, degrees C, INR; money stored as integer paise | Consistent calculations and labels |
| Timestamps | UTC storage, Asia/Kolkata display | Explicit local receiving-hour checks and consistent records |

Do not add libraries just for future ideas. Pin compatible dependencies and create a lockfile in Phase 1 after installation succeeds. The stack is selected here; exact supported versions are verified at installation.

## Feature tiers and definition of done

P0 = required for the final core demonstration; P1 = planned enhancement after dependencies; Lab = separately deployable experiment. These are priorities, not current completion claims.

| ID | Feature | Priority / build phase | Observable acceptance condition |
|---|---|---|---|
| F01 | Navigation and visual system | P0 / 1 | Keyboard and mobile navigation reach all implemented screens; mock views are labeled |
| F02 | Onboarding and sign-in | P0 / 1,4 | Demo entry works locally; actual cloud sign-in/out works when connected |
| F03 | Overview and shipment search | P0 / 2 | Search/status/produce filters work together and clear predictably |
| F04 | Shipment form | P0 / 2 | Units and segment times validate; reload retains a saved local record |
| F05 | Shipment timeline and route | P0 / 2 | Detail uses the selected record, explicit source and last-updated time |
| F06 | Destination directory | P0 / 2,6 | Shows accepted produce, local hours and current available capacity |
| F07 | Prediction model | P0 / 3 | Repeated identical inputs return identical versioned outputs |
| F08 | Rescue Lab | P0 / 3 | Preview and saved cloud result are visually distinct; baseline plus alternatives compare |
| F09 | Feasibility and ranking | P0 / 3 | Budget/hours/capacity failures explain rejection; stable ties and no-option cases work |
| F10 | Scenario history | P0 / 3,4 | Reopening preserves original inputs and model version, not current assumptions |
| F11 | Ownership enforcement | P0 / 4 | Second user cannot read/write the first user's records, including report links |
| F12 | CSV import | P1 / 5 | Preview, row errors, accepted schema and idempotent import job work |
| F13 | Incident replay | P0 / 3,5 | Pause/reset and seeded sequence reproduce the same incident; simulated badge visible |
| F14 | Cloud run progress | P0 / 5 | Queued/running/success/failure states reconcile with persisted job result |
| F15 | Decision and reservation | P0 / 6 | Two concurrent confirmations cannot reserve more than available capacity |
| F16 | Alerts and email | P0 / 6 | In-app acknowledge works; separately observe opted-in SNS delivery |
| F17 | Reports | P0 / 6 | Background report can be downloaded only after authorization; expired link recovery works |
| F18 | AI explanation and draft | P0 / 7 | Numbers match stored result; draft requires review; timeout has labeled fallback |
| F19 | Sensitivity analysis | P1 / 7 | Changing declared assumptions shows when ranking changes; no fake confidence interval |
| F20 | Split allocation | P1 / 7 | Allocations conserve total kg and respect every destination's capacity |
| F21 | Recorded outcomes | P1 / 7 | Delivered/rejected/other disposition quantities reconcile; estimates remain separate |
| F22 | Admin configuration | P0 / 4,8 | Only admin can publish a new immutable parameter version; old runs retain theirs |
| F23 | Cloud evidence workspace | P0 / 8,9 | Every claimed resource has status and actual evidence; no secret/account exposure in public view |
| F24 | Engineering/migration labs | Lab / 8 | Actual result or explicit Study label for each experiment |
| F25 | Presentation mode | P1 / 9 | Resettable fictional fixtures, reproducible story and no fabricated live activity |

If scope must shrink, defer P1 items before removing P0 correctness, access control, live cloud execution, grounded AI or failure evidence. Never ship dummy controls as completed features.

## Model contract

Model an immutable temperature history and alternative future exposure. Use documented illustrative Q10/decay/cohort parameters; do not call the result a scientifically validated probability. Initial quality is measured at the start of the modeled history; do not count prior deterioration twice. Cooling changes future deterioration only.

Inputs include produce profile/version, initial quality, cohort weights, segment duration/temperature, future travel assumptions, quantity, available rescue budget and normalized objective weights. Restrict inputs to the documented supported domain. API validation and calculation functions use the same limits.

Outputs include quality deterioration index, modeled kg below the chosen quality threshold, per-option time/cost/quality metrics, feasible/infeasible reasons, normalized score, stable rank, model version and assumptions. Show a continuous quality curve alongside discrete cohort loss so threshold effects are understandable.

Compute feasibility before scoring. Normalize loss/cost/time using fixed documented scales, not the current candidate set. Weights sum to one. Tie-break by lower modeled loss, lower cost, shorter travel time, then candidate ID. Do not claim a mathematically global optimum; this is exhaustive ranking over a bounded enumerated candidate set.

Economic values: modeled loss value = affected kg * unit value; net modeled benefit = avoided loss value - intervention cost. These are not realized profit. Aggregate at most one selected/latest comparable result per shipment, label the aggregation rule, and do not sum all what-if savings.

## Three demonstration contracts

### D01 - Rescue opportunity

Fictional 500 kg tomato shipment, three-hour additional delay, a cooling excursion, and receiving destinations with distinct capacity/hours. Baseline, extra cooling and rerouting produce different trade-offs. Operator changes budget, compares options, requests a grounded explanation and confirms a feasible plan.

Fixture exit condition in Phase 3: select documented illustrative inputs whose calculated alternatives differ meaningfully. Freeze expected outputs from the actual engine and test them; do not invent savings now or silently tune constants just to make a winner attractive.

### D02 - No helpful intervention

A shipment has stable supported conditions and inexpensive continuation, or all rescues exceed budget. Show why continuing is best or why no rescue is feasible. AI must respect this result. This proves the system does not always manufacture a rescue recommendation.

### D03 - Capacity changes before confirmation

Two operators analyze the same limited destination capacity. One confirms first; the second receives a conflict, sees updated availability and recomputes. Show an atomic reservation result and an audit event; a saved simulation is never treated as a reservation.

## Design risks and resolutions

| Risk | Response |
|---|---|
| Huge service list obscures project value | Main demo uses one business story; deeper diagrams/labs are an appendix |
| Unsupported food claims | Illustrative parameter labels, assumptions and quality-index language |
| AI hallucinates numbers | Referenced result payload, schema validation, numerical consistency check and template fallback |
| Credit eligibility differs | Model gross cost before credits and verify account plan before deployment |
| Labs exceed budget | Short-lived independent stacks, estimated hours and Study fallback |
| Too many features delay core | P0/P1 gates and runnable vertical slices |
| Legacy services unavailable | Explain historical purpose/current alternatives; no fake deployment |

## Phase 0 acceptance and handoff

- [x] Product promise, users and scope are defined.
- [x] Required and enhancement features have phase ownership and acceptance conditions.
- [x] UI routes, wireframes, states and design tokens are specified in UI_UX_SPEC.md.
- [x] Data entities, API contracts, access boundaries and event behavior are specified in TECHNICAL_CONTRACTS.md.
- [x] Four-bucket plan, stack boundaries and budget review method are specified in CLOUD_AND_EVIDENCE.md.
- [x] All syllabus services/topics are mapped in the expanded blueprint; audit caveats are carried forward.
- [x] Demo stories and evidence requirements are defined without fabricated results.
- [ ] Cloud account/model access and exact regional cost estimate: required before deployment, not a completed Phase 0 check.
- [ ] Faculty approval of Lab/Study treatment: external uncertainty; no official scoring breakdown supplied.

Phase 1 starts with the app shell, fixture types, reusable visual components and a clickable five-screen flow. It does not require AWS credentials. This design is a build contract, not a claim of implementation or guaranteed marks.
