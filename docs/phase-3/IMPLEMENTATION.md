# Phase 3 - Calculated rescue decisions

Completed 22 October 2026. Local academic implementation; no cloud resources created or AWS cost incurred.

## Delivered

- Independent deterministic model for tomatoes, bananas and leafy greens, with versioned, inspectable parameters.
- Instant comparison of continuation, future cooling and supported alternative destinations: six options for the default five-destination workspace.
- Future delay, temperature, budget, priority presets and custom loss/cost/time weights. Editable route travel, delay share and cost.
- Historical exposure, arrival-specific quality curves, tabular trade-offs, explicit rejection reasons, modeled mass below threshold, avoided-loss value and net benefit.
- Named immutable analysis snapshots, read-only reopening, local plan review and searchable History, persisted across refreshes.
- Source checks before saving analyses and confirming plans; additive migration of Phase 2 data without reset. Earlier static demo decisions stay labeled as legacy samples.
- Explanations generated deterministically from calculation results. No live LLM is claimed.

## Model and units

Pure modules: `src/model/parameters.ts` and `src/model/engine.ts`. They depend on neither React, browser storage nor AWS.

Historical equivalent age in hours is the sum of `durationHours * Q10^((temperatureC - referenceC) / 10)`. Past segments count once. Candidate future exposure is added to that same past. Future duration is remaining route travel plus additional future delay multiplied by the route's declared delay share. The travel field means **remaining** travel at the analysis checkpoint, not elapsed travel.

Each cohort starts at `clamp(startingQuality * multiplier, 0, 100)` and decays as `initialCohortQuality * exp(-decayPerHour * equivalentAgeHours)`. Mean quality is the weighted cohort mean. Five weights are 10%, 20%, 40%, 20%, 10%; multipliers are 0.8, 0.9, 1, 1.05, 1.1. Starting quality applies to the central cohort at the beginning of entered history, not necessarily the weighted initial mean. An input of 95 gives weighted initial mean 92.65 after clipping.

Quantity below threshold is shipment kg times the sum of weights of cohorts strictly below 60 at arrival. It is not risk percent multiplied by mass. Minimum mean-quality feasibility also uses 60: a feasible average may coexist with some cohorts below threshold. This is an illustrative partial-quality estimate, not a determination of safe or edible stock. Threshold crossings cause step changes in modeled mass.

| Produce | Q10 | Reference C | Decay / equivalent hour | Modeled bounds C | Cooling target C |
| --- | --- | --- | --- | --- | --- |
| Tomatoes | 2 | 10 | 0.025 | 5 to 35 | 10 |
| Bananas | 2 | 10 | 0.018 | 8 to 35 | 13 |
| Leafy greens | 2 | 10 | 0.045 | 0 to 30 | 4 |

Cooling costs INR 650 and uses the lower of entered future temperature and target. It neither heats colder conditions nor repairs past quality loss. Curves share current quality and each stops at its own arrival. Unsupported temperatures fail explicitly.

All constants, route times and costs are **illustrative teaching assumptions**, not calibrated scientific measurements. Humidity, chilling injury, microbial safety, traffic and partner confirmation are omitted. Supported bounds do not establish food safety.

## Feasibility and ranking

Reject candidates exceeding budget, violating accepted produce, exceeding entered available capacity, arriving outside daily receiving hours, or failing minimum mean quality. Opening is inclusive, closing exclusive. When all fail, return no winner. Missing route assumptions are disclosed.

Arrival = planned arrival + `(candidate future duration - remaining planned travel)`, rounded to minutes. It is relative to the entered planned-arrival day, independent of the current clock. D+N/D-N preserves day offsets; daily IST windows recur. No dated reservations, holiday calendars or overnight windows exist yet.

Score = `lossWeight * lossKg / shipmentKg + costWeight * extraCostPaise / 200000 + timeWeight * futureHours / 24`. Weights total 1; scales stay fixed. Lower ranks first; ties use lower loss, lower cost, shorter time, then stable ASCII candidate ID. This ranks enumerated alternatives, not all geographic routes. Scores are not probabilities or percentages.

Avoided loss = original loss minus candidate loss. Net modeled benefit = rounded avoided-loss value minus intervention cost. Money is stored as integer paise; these values are not realized savings.

## Reproducible demonstration

Unchanged seeded FR-101: 500 kg tomatoes; initial quality 95; history 2 h at 10 C plus 1 h at 18 C; remaining travel 5.5 h; planned ETA 16:30 IST; future delay 3 h; future temperature 18 C; INR 800 budget; loss/cost/time weights 65/20/15.

Actual engine and browser results: current quality 84.3776; continuation quality 58.2834 with approximately 350 kg below threshold. Eastside ranks first: arrival 14:00 after 3 h, mean quality about 74.0484, 0 kg below threshold, INR 450 cost, score 0.06375. Its illustrative net benefit is INR 10,050. Local rule changes can alter feasibility.

Set delay 0 and future temperature 10 C: continuation ranks first. Restore shipment inputs to replay the incident. The QA banana shipment FR-105 with a zero budget has no feasible option because its original receiving destination also fails produce/capacity/hour rules; no rescue is fabricated.

One named FR-105 analysis and local calculated plan remain in the browser for inspection. Existing shipment records and the legacy demo decision were preserved.

## Persistence and architecture

`LocalWorkspaceRepository.saveAnalysis` rereads current data, checks the full shipment/destination signature, validates options, recomputes results and writes cloned inputs, parameter snapshot and results. Each run has a name, timestamp, model version and shipment version. `confirmAnalysis` checks the source again and rejects infeasible choices. Repeating the same run/candidate returns its existing plan; choosing a different candidate for an already selected run fails.

Old schema-version-1 data without analyses receives an empty array in memory, written only on successful mutation. Saved results are checked by recomputing their frozen input/parameter snapshots. Corrupt data is preserved for export. Future algorithm versions must retain old-version support or explicitly migrate stored runs. Web Storage is neither atomic multi-user storage nor authorization or capacity reservation.

Adjustment to the earlier Python-backend plan: Phase 3 uses a pure TypeScript engine shared by preview and repository saving. Phase 4 can reuse it in Node Lambda to avoid maintaining duplicate calculations and make server saving authoritative. Current browser calculations are local, not a remote security boundary. No SDKs or cloud dependencies were added.

## Verification

- `npm.cmd run test`: **32 passed**: 14 local-data tests and 18 model/snapshot tests. Independent exposure/mass arithmetic, clipped cohorts, monotonic curves, cooling, stable/incident winners, all constraints, no-option outcomes, day offsets, changing priorities, fixed scales, ties, input validation/immutability, missing routes, migration, stale snapshots, idempotency and tamper preservation.
- `npm.cmd run build`: TypeScript and Vite production build pass.
- Browser: sliders recalculate and can change the winner; invalid weights suppress results/saving; INR 1.10 budget accepted without fractional-paise errors; zero budget shows no-option reasons.
- Browser: named snapshot survived refresh, controls became read-only, review used saved metrics, local plan appeared in History, and search/empty-search/clear worked.
- Responsive: live Lab, saved analysis, review and History at 1440, 1024, 768 and 390 px: no document-level horizontal overflow after correction. Expanded assumptions at 390 px use table-local scrolling. Evidence: `responsive-results.json` and `screenshots/`.

## Remaining phases

Phase 4 adds cloud foundation, Cognito, API Gateway/Lambda, DynamoDB and verified ownership boundaries. Later phases add imports/events, transactional reservations, observability, reporting and Bedrock explanations grounded in saved results. Current plan saving sends no email, contacts no partner, reserves no capacity and calls no LLM.
