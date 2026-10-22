# FreshRoute

Perishable-shipment rescue and decision support with an AI copilot. Academic Cloud Architecture Design project.

## Current status

Phases 0–2 are complete: design, responsive frontend, and local shipment/receiving workflows. Create and edit shipments, save and restore drafts, maintain receiving rules, inspect entered temperature segments and activity, and keep sample decisions across refreshes. The data layer validates and versions records in this browser's local storage. No HTTP backend, real prediction engine, AWS deployment, live partner booking or live AI integration exists yet.

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

## Sample rescue walkthrough

1. Inspect FR-101 from Overview.
2. Open Rescue Lab and load the static sample comparison.
3. Select an option, then review the sample plan.
4. Confirm a demo decision and inspect History.
5. Refresh: the local sample decision remains. Use Local data for an intentional reset.

The sliders do not run a model: altered temperature/delay inputs are marked unmatched, and review requires the unchanged, original FR-101 fixture. Editing FR-101 invalidates that fixed comparison. Budget feasibility is a small UI-only comparison; edited destination rules do not recalculate those fixtures. Copilot output remains authored text, not a model response.

See [Phase 2 implementation and verification](docs/phase-2/IMPLEMENTATION.md) for current checks and limits, and [Phase 1 verification](docs/phase-1/IMPLEMENTATION.md) for the original visual foundation.

## Tests

```powershell
npm.cmd run test
npm.cmd run build
```

Tests use Node's native TypeScript stripping and test runner (verified with Node 24). They cover persistence, validation, drafts, stale edits, receiving windows, corrupt/blocked/full storage, export preservation and scoped reset without requiring cloud access.

## Start here

- [Design freeze and acceptance conditions](docs/phase-0/DESIGN_FREEZE.md)
- [UI/UX specification and wireframes](docs/phase-0/UI_UX_SPEC.md)
- [Data, API and event contracts](docs/phase-0/TECHNICAL_CONTRACTS.md)
- [Cloud resources, budget review and evaluation evidence](docs/phase-0/CLOUD_AND_EVIDENCE.md)
- [Evidence register](docs/phase-0/EVIDENCE_REGISTER.csv)
- [Expanded phased roadmap and complete syllabus audit](FRESHROUTE_BUILD_BLUEPRINT.md)
- [Original project roadmap and model explanation](FRESHROUTE_IMPLEMENTATION_ROADMAP.md)

The Phase 0 documents define the design, Phase 1 establishes the visual foundation, and Phase 2 adds real browser-local workflows. No cloud credentials or deployment are needed for the current application. Phase 3 implements the real calculation model and optimizer.

## Evaluation story

Planned final evaluation story: observe a shipment incident, simulate feasible alternatives, review trade-offs, confirm with current receiving capacity and verify the outcome. The current application records operational inputs and shows static rescue comparisons. Later calculations will be reproducible illustrative estimates; AI will explain stored results and cannot certify food safety or execute rescue actions.

Total cloud planning ceiling: US$200 before uncertain credits. Main application, disposable engineering labs and architecture studies are distinguished explicitly. No resource creation is authorized by the design documents.
