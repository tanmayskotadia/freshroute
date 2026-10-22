# FreshRoute

Perishable-shipment rescue and decision support with an AI copilot. Academic Cloud Architecture Design project.

## Current status

Phase 0 design and the Phase 1 frontend prototype are complete. The React/TypeScript/Vite app includes a responsive overview, shipment workspace, Rescue Lab, decision review, temporary history, receiving network, demo entry and planned-cloud evidence page. All data and comparisons are explicitly labeled fixtures. No backend, real prediction engine, AWS deployment or live AI integration exists yet.

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

## Phase 1 walkthrough

1. Inspect FR-101 from Overview.
2. Open Rescue Lab and load the static sample comparison.
3. Select an option, then review the sample plan.
4. Confirm a demo decision and inspect History.
5. Refresh to reset all session changes.

The sliders do not run a model: altered temperature/delay inputs are marked unmatched, and review requires the original FR-101 fixture. Budget feasibility is a small UI-only comparison. New shipments and decisions live only in React memory; Phase 2 adds persistence. Copilot output is an authored explanation, not a model response.

See [Phase 1 implementation and verification](docs/phase-1/IMPLEMENTATION.md) for actual checks and limits.

## Start here

- [Design freeze and acceptance conditions](docs/phase-0/DESIGN_FREEZE.md)
- [UI/UX specification and wireframes](docs/phase-0/UI_UX_SPEC.md)
- [Data, API and event contracts](docs/phase-0/TECHNICAL_CONTRACTS.md)
- [Cloud resources, budget review and evaluation evidence](docs/phase-0/CLOUD_AND_EVIDENCE.md)
- [Evidence register](docs/phase-0/EVIDENCE_REGISTER.csv)
- [Expanded phased roadmap and complete syllabus audit](FRESHROUTE_BUILD_BLUEPRINT.md)
- [Original project roadmap and model explanation](FRESHROUTE_IMPLEMENTATION_ROADMAP.md)

The Phase 0 documents resolve implementation details and supersede earlier general descriptions where they differ. The Phase 1 implementation establishes the visual foundation and clickable five-screen flow. No cloud credentials or deployment are needed for this prototype.

## Evaluation story

Observe a shipment incident, simulate feasible alternatives, review trade-offs, confirm with current receiving capacity and verify the outcome. Calculations are reproducible illustrative estimates; AI explains stored results and cannot certify food safety or execute rescue actions.

Total cloud planning ceiling: US$200 before uncertain credits. Main application, disposable engineering labs and architecture studies are distinguished explicitly. No resource creation is authorized by the design documents.
