# FreshRoute

Perishable-shipment rescue and decision support with an AI copilot. Academic Cloud Architecture Design project.

## Current status

Phases 0-9 are implemented. Phase 9 adds a guided presentation mode and an evaluation package in output/phase-9; remaining browser/human checks are recorded in docs/phase-9/RELEASE_STATUS.md. The main AWS app in Mumbai supports authenticated rescue workflows, durable data, background imports/analysis, atomic reservations, fulfilment, private reports, AI explanations/drafts, sensitivity and outcome analytics. Phase 8 adds retained audit/monitoring/budget resources and a cloud engineering evidence screen. Its compute, networking, storage, security, queue recovery and SQL/DMS experiments were run and their disposable stacks deleted. Local demo mode remains available; live AI requires cloud sign-in and a saved run.

Live application: https://dr4sw5bpoi.execute-api.ap-south-1.amazonaws.com

Phase 10 final release audit and handover: [current findings](docs/phase-10/HANDOVER.md). The final source/evaluation archive is `output/phase-10/FreshRoute-Final-Submission.zip`. Release files and archive checks pass; three preserved import DLQ messages, pending email confirmation, CloudFront verification and browser/human checks remain open. Phase 10 changes release tooling and documentation; the deployed Phase 9 interface remains current.

CloudFront requires AWS account verification. The approved API Gateway + Lambda HTTPS frontend serves the private web bucket. See [Phase 4 deployment](docs/phase-4/IMPLEMENTATION.md) and [Phase 6 implementation and demonstration](docs/phase-6/IMPLEMENTATION.md).

Deployment account: `118462784511`. All 49 local tests and 19 live main-app regression checks pass. Phase 8 separately verified CloudTrail delivery, alarm transitions, EBS/EFS, peering, ASG replacement/scale-out, WAF, Config remediation, DLQ replay and exact DMS row reconciliation. All five lab stacks and residual lab resources were verified removed. Browser visual QA, prior email delivery and an existing import DLQ alarm remain explicit limitations. See [Phase 8 release status](docs/phase-8/RELEASE_STATUS.md) and [implementation](docs/phase-8/IMPLEMENTATION.md).

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

The model uses illustrative Q10 exposure, exponential decay and weighted quality cohorts. Constants are teaching assumptions, not fitted scientific data or food-safety assessments. Route times/costs are declared assumptions. The local explanation is deterministic; the authenticated cloud workspace adds grounded live AI with a deterministic fallback. Older static demo decisions remain labeled.

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

The Phase 0 documents define the design, Phase 1 establishes the visual foundation, and Phase 2 adds browser-local workflows. Phase 3 adds the illustrative calculation model. Phases 4-6 connect authenticated cloud storage, background workflows and fulfilment. Local development does not require AWS credentials; cloud mode uses Cognito and the public deployment configuration.

## Evaluation story

Planned final evaluation story: observe a shipment incident, simulate feasible alternatives, review trade-offs, confirm with current receiving capacity and verify the outcome. The current application records inputs, calculates illustrative comparisons and saves reproducible analyses. Cloud AI explains stored results and prepares reviewed drafts; it cannot certify food safety or reserve capacity.

Total cloud planning ceiling: US$200 before uncertain credits. Main application, disposable engineering labs and architecture studies are distinguished explicitly. No resource creation is authorized by the design documents.
