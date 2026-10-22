# Phase 2 - local shipment and receiving workflows

Completed 22 October 2026. Scope: durable browser-local workflows and validation. No cloud deployment, HTTP API, real prediction/optimizer, authenticated role enforcement or live AI.

## Delivered

- Shipment creation/editing with quantity, origin, receiving destination, INR unit value stored in integer paise, starting quality, travel/delay, local ETA and explicit operator-assigned review status.
- Editable temperature history with 1–12 segments; validated duration/temperature bounds and combined duration. Current temperature derives from the final segment.
- New/edit drafts with explicit save, restore and discard. Incomplete numeric input can be retained safely in a draft; a final shipment requires full validation.
- Versioned shipment records, preserved creation timestamps, updated timestamps and append-only local shipment events.
- Data-backed planned route, entered temperature segment visualization and actual activity list replace the static detail fixtures.
- Five seeded receiving destinations, covering all original shipment destinations. Search, produce filtering, no-results recovery and editable daily rules.
- Receiving checks for accepted produce, enough entered capacity and daily arrival time. Closing is exclusive. These checks do not reserve stock or assess quality/safety.
- Browser-local persistence of shipments, receiving rules, drafts and sample decision history. Other tabs refresh on storage changes; known stale form versions are rejected.
- Local data management with counts/revision, raw JSON export, retry/reload and an explicit RESET phrase before replacing this app's workspace.
- Read/parse/schema/write failures are surfaced. Damaged/unsupported saved data is not automatically overwritten. Quota-failed writes leave the prior saved value intact.

## Architecture boundary

`src/domain.ts` defines local entities, validation, seed creation, input normalization, IST formatting and receiving-hour checks. `src/data/localRepository.ts` implements the `WorkspaceRepository` interface using an injected `StoragePort`. `src/data/useWorkspace.ts` coordinates React state, storage events and surfaced errors. Components use the repository through that boundary rather than writing localStorage directly.

The repository is synchronous for this local phase. A future network adapter will introduce asynchronous request/error states at the hook boundary; this is not advertised as an already connected or drop-in cloud API. Stored records are schema-versioned; unknown versions fail visibly until an explicit migration is implemented.

Data key: `freshroute.workspace.v1`. Initial missing storage displays independent seed records without writing immediately. The first successful mutation persists the workspace. Different origins/ports have different local data. A deliberate reset changes only this app key, not unrelated browser storage.

## Verification actually performed

`npm.cmd run test`: **14 passed, 0 failed**, using injected memory storage and Node's native test runner. Covers:

1. Independent initial seed and no destructive initialization.
2. New shipment persistence across repository instances.
3. Edit versions, event preservation and stale-write rejection.
4. Invalid/non-finite quantity, destination, quality, delay and temperature-history inputs.
5. Currency normalization and fractional-paise/blank rejection.
6. Incomplete draft retention, reload and clearing after successful save.
7. Receiving-rule persistence, invalid hours, stale versions and protected reserved quantity.
8. Inclusive opening/exclusive closing boundary behavior.
9. Corrupt/future schemas preserved for raw export.
10. Quota failure preserving previous saved state.
11. Sample decision persistence without changing capacity.
12. Reset scoped to the FreshRoute key.
13. Malformed nested data/drafts rejected.
14. Blocked storage reporting failure without seed writes.

`npm.cmd run build`: passed TypeScript checking and Vite production build.

Browser checks:

| Interaction | Observed result |
|---|---|
| Quantity 0 submit | Validation error; no shipment saved |
| Save new draft, close, refresh, restore | Entered produce/quantity/origin/destination/temperature restored |
| Save new shipment, refresh | Record retained its values and stable ID |
| Edit quantity/status/segments, refresh | New values and previous creation event retained; version incremented |
| Edit same record in two tabs | Newer save visible in original tab; stale original form rejected without overwriting it |
| Edit receiving capacity/produce/hours | Persisted after reload and affected shipment receiving checks |
| Edit native time fields | Closing time and shipment arrival saved correctly after fixing input-event handling |
| Unmatched receiving search | Empty state with clear-filter recovery |
| Export JSON | Download produced a parseable schema-1 workspace with five shipments and five destinations in the test session |
| Reset guard | Disabled initially, enabled only by exact RESET; not executed on the live review workspace |
| Sample decision, refresh | History retained the local entry; no capacity reservation or email implied |
| Responsive pages/forms | 16 measurements at 1440/1024/768/390px; no page or editor horizontal overflow |

Raw responsive checks: `responsive-results.json`. Screenshots are in `screenshots/`. Visual review included the data-backed detail and the mobile edit form. Export verification read the downloaded JSON; re-import is outside this phase.

One fictional QA shipment remains as FR-105 (Sanand collection hub). Its Westside rule example deliberately demonstrates mismatched produce/capacity/arrival constraints. No existing user records were cleared. The typed reset is available if the user wants the original demo restored.

## Limits and next phase

- All records are fictional demonstration data, locally editable by the current browser user. There is no authentication or security boundary between users of this browser.
- Storage is persistence, not a guaranteed backup or offline application service. The development/static app still needs to load. JSON export is available; JSON re-import is not yet implemented.
- Optimistic checks catch known stale edits but Web Storage does not provide cross-tab atomic transactions. Real multi-user capacity reservations belong to the cloud decision workflow.
- Receiving hours are same-day daily schedules in IST. Date-specific holidays and overnight schedules are not supported yet.
- Status is operator assigned; no prediction changes it automatically.
- Rescue cards, quality curves and copilot explanations remain fixed Phase 1 fixtures. Changed shipments cannot silently use the original FR-101 sample comparison. Destination edits do not update authored comparison values.
- Local storage error paths were exercised in repository tests, not by corrupting the user's live browser data. Full accessibility certification and load testing were not performed.

Next: Phase 3 implements the independent documented calculation model, feasibility filters, real alternative comparison, deterministic ranking, uncertainty/sensitivity assumptions and meaningful model tests. Keep domain inputs and versioned saved data; replace sample outputs with reproducible results.
