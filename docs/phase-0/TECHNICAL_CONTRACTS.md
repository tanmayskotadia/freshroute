# FreshRoute technical contracts

Status: design contract, not implemented endpoints or deployed schemas. Field names can change in one versioned revision before implementation; UI and backend must share the same contract.

## Entities and access patterns

| Entity | Principal fields | Ownership/access |
|---|---|---|
| Shipment | shipmentId, ownerId, produceProfileVersion, quantityKg, valuePaisePerKg, initialQuality, historySegments, plannedDestinationId, plannedTravelHours, status, version, timestamps | Owner-scoped ID lookup and newest-first list |
| Run | runId, ownerId, shipmentId, shipmentVersion, normalizedInputs, inputHash, modelVersion, objectiveWeights, status, candidates, ranking, assumptions, timestamps | Owner checks, per-shipment history, immutable completed results |
| Destination | destinationId, name, fictionalCoordinates, acceptedProduce, localHours, availableKg, reservedKg, version | Operator read; admin write; reservation service controls capacity |
| Decision | decisionId, ownerId, shipmentId, runId, candidateId, allocation, status, idempotencyKey, timestamps | Owner read; backend-enforced legal transitions |
| Job | jobId, ownerId, kind, sourceId, status, attempt, resultObjectKey, errorCode, timestamps | Owner-scoped status and authorized report retrieval |
| Notification | notificationId, ownerId, sourceEventId, shipmentId, severity, messageCode, readAt, acknowledgedAt | Owner-scoped inbox; no public direct table access |
| Produce profile | profileId, immutableVersion, illustrativeParameters, supportedDomain, assumptions, authoringMetadata | Versioned JSON objects; only admin publishes; old runs retain versions |
| Outcome | shipmentId, decisionId, deliveredKg, rejectedKg, otherDispositionKg, recordedAt, sourceNote | Owner writes validated totals; never overwrites predicted outputs |

Physical data plan: Shipments, Runs, Destinations and Activity tables. Activity contains typed decision/job/notification/outcome records with namespaced keys; this resolves the earlier generic Decisions/Jobs naming. Keep access keys/indexes documented with queries before coding. Proposed owner/time GSIs support shipment and run lists; per-shipment run history uses a shipment/time index. Avoid table scans for normal list views. Denormalize display summaries intentionally and version them; do not require relational joins.

Keep each DynamoDB item bounded; store bulky reports/import files in S3. Pagination tokens must be opaque and tied to authorized query context. TTL is retention cleanup, not an authorization check or precisely timed expiry mechanism.

## API version 1

All routes below are proposed `/v1` routes. Read/write owner identity from verified JWT claims, never a trusted request-body ownerId. Admin rights also come from validated claims/backend policy. Apply validation on the server even if the frontend already validated.

| Method/path | Meaning | Key behavior |
|---|---|---|
| GET /shipments | Owner's shipment list | Filtered/paginated; stable order |
| POST /shipments | Create shipment | Validated units/segments, idempotency key |
| GET/PATCH /shipments/{id} | Read/edit owned shipment | Version precondition for writes |
| GET /destinations | Read receiving rules/capacity | Include version and display timezone |
| POST /runs | Submit analysis | Returns 202 + runId/status URL; snapshot shipment and model versions |
| GET /runs/{id} | Read result/status | Owner check; immutable completed result |
| GET /runs?shipmentId=... | List shipment analysis history | Owner scoped; paginated |
| POST /runs/{id}/explanation | Explain completed result | Bounded AI call or labeled cache/fallback |
| POST /scenario-drafts | Parse natural-language draft | Returns validated draft only; no execution/write |
| POST /decisions | Confirm reviewed candidate | Atomic capacity/version checks and idempotency |
| POST /decisions/{id}/cancel | Cancel if legal | Conditional state transition and reservation release |
| POST /imports | Request bounded upload | Server selects object key; short-lived upload authorization |
| POST /imports/{id}/submit | Validate/process uploaded object | Verify object ownership, type and size; 202 job |
| GET /jobs/{id} | Background work status | Owner scoped; safe failure code |
| POST /reports | Generate report from completed run/decision | 202 job; deduplicated requests |
| GET /reports/{id}/download | Authorize report download | Owner check, short-lived signed URL |
| GET/PATCH /notifications/{id} | Read/update inbox notification | Owner scope; only allowed read/ack fields |
| GET /notifications | List inbox | Owner scope and pagination |
| PUT /shipments/{id}/outcome | Record actual disposition | Version check; quantity totals reconcile |
| POST /admin/produce-profiles | Publish immutable profile | Admin only, validated bounds/version |

Common error shape: `{ error: { code, message, fieldErrors?, requestId } }`. Use 400 validation, 401 missing/invalid authentication, 403 forbidden operation, 404 inaccessible/not-found owned record as appropriate, 409 stale version/capacity/state conflict, 429 bounded requests, and 5xx safe operational failure. Never return stack traces or credentials.

## State machines

Run: QUEUED -> RUNNING -> SUCCEEDED or FAILED. A retry creates a new execution attempt with a stable logical run/job relationship; never rewrite completed results with different inputs.

Decision: CONFIRMED -> DISPATCHED -> COMPLETED; CONFIRMED -> CANCELLED is allowed before dispatch. A reserved capacity record is created on confirmation, consumed/completed on delivery, or released once on valid cancellation. Define future capacity-replenishment policy explicitly; cancellation does not invent new receiving capacity.

Confirmation transaction: condition on candidate belonging to an owned successful run, eligible shipment state/version, current destination rules and sufficient capacity; write decision, update reserved/available capacity and shipment version, and persist an outbox record atomically. Destination rule changes can require a recomputed run rather than silently changing its meaning.

Split confirmation, if enabled, uses one bounded transaction across all allocations; no partial reservation. Allocation count must remain within chosen transaction and UI bounds. Failure returns conflict details appropriate to the owner.

## Events and reliability

Outbox event fields: eventId, eventType, schemaVersion, occurredAt, ownerId, shipmentId, decisionId, traceId and payload reference. DynamoDB Streams filters newly created outbox entries and publishes the event to the post-decision queue. This transactionally records intent, but the stream is not an indefinite event archive: monitor failures/lag and reconcile unsent outbox entries. Deduplicate publishes/consumption by eventId and use bounded retention.

Report/email steps use durable per-step status so a failed notification does not unnecessarily regenerate reports. Standard queue consumers tolerate duplicates and use partial-batch failure handling. Configure visibility, concurrency, retries and redrive together. External email can still have a duplicate delivery window; do not claim end-to-end exactly-once behavior.

API-to-workflow submission uses a persisted queued run plus a deterministic execution reference. If workflow start fails after persistence, reconcile or mark failed rather than leaving a permanently queued record. Workflow failure paths update state and keep request IDs.

Imports are parsed with limits on bytes, rows, columns and supported units. Validate untrusted filenames/content, avoid formula injection in exported CSV, separate upload quarantine and accepted prefixes, and never execute file content. Implementation limit values are selected and documented before enabling uploads.

## AI boundary

Server builds an allowlisted context from the completed result and selected parameter notes. Structured response fields: explanation, referencedCandidateIds, numericalClaims, assumptions and suggestedQuestions. Validate types/IDs and numerical claims against stored results; reject unsupported assertions. LLM output is untrusted text, rendered safely.

Natural-language parsing produces a draft with supported fields/ranges and a list of unresolved ambiguities. User reviews it before submitting a run. AI cannot call reservation, admin or notification operations. Configure model/profile by deployment setting after verifying availability/account access; no frontend provider credentials. Cache key includes result hash, prompt version and model version. Record token counts without logging raw prompts by default.

## Verification boundaries

Phase 1 verifies visual/navigation behavior with fixtures. Phase 2 verifies local persistence. Phase 3 verifies calculations. Phase 4 proves authentication/ownership. Phases 5-6 prove cloud/event behavior. Phase 7 proves live model grounding. A screenshot of a success toast is never evidence that AWS persistence, reservation or email delivery occurred.
