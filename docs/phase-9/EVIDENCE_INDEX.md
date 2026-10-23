# Evaluation evidence index

All paths are relative to the source root. Recorded observations use UTC; the report date is 23 October 2026 IST. The CSV maps 71 named topic entries across all eight syllabus modules, including the shared-responsibility topic in both modules where it occurs.

| Claim | Primary evidence | Boundary |
|---|---|---|
| Reproducible seeded model | docs/phase-3/seeded-incident.json; src/model/engine.ts | Illustrative inputs/model, not measured spoilage |
| Persistent, owner-bound cloud workflows | docs/phase-8/application-regression.json | 19 checks from Phase 8; not a new Phase 9 run |
| AI generation, cache, grounded drafts | docs/phase-7/; docs/phase-8/application-regression.json | Current adapter provenance in report; optional adapter not misrepresented |
| EC2/ALB, EFS/EBS, peering, SSM and WAF | docs/phase-8/compute-verification.json | Disposable lab, deleted |
| Instance replacement | docs/phase-8/replacement-verification.json | Actual replacement, not an uptime SLA |
| Controlled scaling and DMS completion | docs/phase-8/scale-and-migration-completion.json | Desired 1→2; DMS full load only |
| Configuration drift/remediation | docs/phase-8/config-verification.json | Narrow lab rule and deliberate temporary drift |
| Poison-message DLQ/replay | docs/phase-8/reliability-verification.json | Isolated lab queues only |
| Private SQL and exact migration rows | docs/phase-8/migration-verification.json | Same RDS instance, two schemas; three rows; no CDC/cutover |
| Audit delivery, alarms and budget | docs/phase-8/operations-final-verification.json | Digest delivery, no cryptographic chain validation |
| All five lab stacks removed | docs/phase-8/cleanup-verification.json | Retained product continues normal charges |
| Account eligibility/restricted support | docs/phase-8/account-review.json | Dated snapshot, not guaranteed future eligibility |
| Gross estimated cost | docs/phase-8/cost-verification.json | Account-wide, delayed, excludes credits/refunds; not final invoice |
| Phase 9 production/frontend check | docs/phase-9/VERIFICATION.json | Scope and actual check time recorded there |
| Syllabus audit | docs/phase-9/SYLLABUS_MATRIX.csv | Core, lab, study, restricted and blocked states distinct |
| Earlier UI screenshot | docs/phase-3/screenshots/ | Phase 3 capture, not current Phase 9 visual QA |

Files in `output/phase-9/`: report PDF and editable DOCX, editable presentation PPTX, viva PDF, captioned overview video and captions, plus the submission ZIP. Architecture source is in docs/phase-9/ARCHITECTURE.md. The video is a captioned architecture overview, not a recording of live app operation.

Open limitations: browser visual QA remains blocked by the existing origin policy, human rehearsal remains to do, CloudFront account verification remains unresolved, and human email receipt is unverified. No fake success badges or current-service status are inferred from a study.
