# FreshRoute

Perishable-shipment rescue and decision support with an AI copilot. Academic Cloud Architecture Design project.

## Current status

Phases 0-3 are complete: design, responsive frontend, local workflows and a deterministic rescue model. Rescue Lab calculates quality curves, quantity below threshold, feasibility and ranked alternatives for saved shipments. Named analyses freeze inputs, parameters and results; local plans and searchable History survive refreshes. No HTTP backend, AWS deployment, partner booking or live LLM is connected yet.

## Run locally (PowerShell)

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the Local URL printed by Vite (normally http://127.0.0.1:5173). The main dashboard is `/overview`; the introduction/demo entry is `/welcome` or `/sign-in`. This entry does not authenticate anyone and asks for no credentials.

```powershell
npm.cmd run build
npm.cmd run preview
```

The production output is `dist/`. Static hosting must serve `index.html` for valid application routes. Keep this fallback separate from static asset error handling when configuring CloudFront later. Fonts are bundled locally through Fontsource packages. No API keys or environment variables are required.

## Phase 2 walkthrough

1. Create a shipment with produce, quantity, origin, receiving destination, value, travel assumptions and temperature segments.
2. Save a draft, close the form, refresh, and restore it from New shipment.
3. Save the shipment, edit its fields and refresh: the saved values and activity remain.
4. Edit a destination's capacity, daily receiving hours or accepted produce in Receiving network.
5. Inspect the shipment's simple receiving-rule checks. These are not predictions or reservations.
6. Open Local data to export JSON or deliberately reset the fictional workspace with its confirmation phrase.

Local data uses `freshroute.workspace.v1`, scoped to the browser and origin. Changing browser, host or port uses a different storage area. Do not store sensitive real-world information in this unauthenticated academic demo. Storage can be cleared or blocked by the browser. Corrupt/future-version records are preserved for export instead of silently overwritten. JSON re-import is not implemented yet.

Local optimistic version checks reject known stale edits and browser storage events refresh other tabs. Web Storage is not a transactional multi-user database; real reservations and authorization require later cloud phases. Management controls are intentionally available to this local demo user.

## Phase 3 rescue walkthrough

1. Open FR-101 and Rescue Lab. The incident compares continuation, cooling and four alternative destinations.
2. Adjust future delay, temperature, budget and ranking priorities. Results and rejection reasons recalculate. Expand assumptions to inspect or change route inputs.
3. Set delay to 0 and temperature to 10 C: continuation ranks first for the unchanged seed. Restore saved shipment inputs to replay the incident.
4. Name and save an analysis. Refresh and reopen it: frozen inputs and results remain read-only.
5. Select a feasible option, review and save a local plan. Search for the shipment or analysis in History.
6. Changes to shipment or receiving rules preserve historical results and block confirming an outdated snapshot. Create a new analysis using current data.

The model uses illustrative Q10 exposure, exponential decay and weighted quality cohorts. Constants are teaching assumptions, not fitted scientific data or food-safety assessments. Route times/costs are declared assumptions. The explanation is deterministic; live AI comes later. Older static demo decisions remain labeled.

See [Phase 3 model and verification](docs/phase-3/IMPLEMENTATION.md), [Phase 2 workflows](docs/phase-2/IMPLEMENTATION.md), and [Phase 1 visual foundation](docs/phase-1/IMPLEMENTATION.md).

## Tests

```powershell
npm.cmd run test
npm.cmd run build
```

Tests use Node's native TypeScript stripping and test runner (verified with Node 24). They cover persistence, validation, drafts, stale edits, receiving windows, corrupt/blocked/full storage, export preservation and scoped reset, plus exposure units, cohort mass, monotonic quality, constraints, deterministic ranking, arrival arithmetic, snapshot migration and tamper detection without cloud access.

## Start here

- [Design freeze and acceptance conditions](docs/phase-0/DESIGN_FREEZE.md)
- [UI/UX specification and wireframes](docs/phase-0/UI_UX_SPEC.md)
- [Data, API and event contracts](docs/phase-0/TECHNICAL_CONTRACTS.md)
- [Cloud resources, budget review and evaluation evidence](docs/phase-0/CLOUD_AND_EVIDENCE.md)
- [Evidence register](docs/phase-0/EVIDENCE_REGISTER.csv)
- [Expanded phased roadmap and complete syllabus audit](FRESHROUTE_BUILD_BLUEPRINT.md)
- [Original project roadmap and model explanation](FRESHROUTE_IMPLEMENTATION_ROADMAP.md)

The Phase 0 documents define the design, Phase 1 establishes the visual foundation, and Phase 2 adds real browser-local workflows. No cloud credentials or deployment are needed for the current application. Phase 3 adds the implemented illustrative calculation model and deterministic optimizer.

## Evaluation story

Planned final evaluation story: observe a shipment incident, simulate feasible alternatives, review trade-offs, confirm with current receiving capacity and verify the outcome. The current application records inputs, calculates illustrative comparisons and saves reproducible analyses. Future AI will explain stored results and cannot certify food safety or execute rescue actions.

Total cloud planning ceiling: US$200 before uncertain credits. Main application, disposable engineering labs and architecture studies are distinguished explicitly. No resource creation is authorized by the design documents.
