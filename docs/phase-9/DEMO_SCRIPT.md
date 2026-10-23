# Seven-minute FreshRoute demonstration

Use a fictional workspace. Rehearse once before evaluation. The guide opens from the sidebar's **Seven-minute presentation** button and provides a pauseable timer, segment notes and screen shortcuts. Opening the guide makes no cloud writes. It does not automatically navigate or reserve anything.

Prepare: run the local app or open the deployed URL; sign into your own AWS workspace for AI/fulfilment; have one current saved analysis and an existing reservation/report available. Do not reset a workspace or use another person's credentials. Prefer an existing reservation so the demonstration does not consume capacity again. If FR-101 was edited, the original worked-example numbers no longer necessarily apply: describe the results on screen.

| Time | Screen and action | What to explain |
|---|---|---|
| 0:00-0:45 | Shipments → a delayed fictional shipment | Problem and inputs |
| 0:45-2:10 | Rescue Lab | Constraints, calculation and trade-offs |
| 2:10-3:10 | Save/open analysis → History | Reproducibility and stale inputs |
| 3:10-4:10 | Saved analysis → AI | Grounded explanation and operator control |
| 4:10-5:20 | Fulfilment | Current capacity, state transitions, private report |
| 5:20-6:30 | Cloud & project evidence | Actual cloud services and measured labs |
| 6:30-7:00 | Evidence → limitations | Practical value and honest scope |

Total: 45 + 85 + 60 + 60 + 70 + 70 + 30 = **420 seconds**. The separate 12-slide presentation has speaker notes with its own 420-second speaking allocation. Choose the live app or slides as the primary seven-minute route; do not attempt both in seven minutes.

## 0:00 - The incident (45 seconds)

“FreshRoute helps a dispatcher decide what to do when a perishable shipment is delayed. The choice might be to continue, cool the shipment, or send it to another receiving centre. I enter the shipment quantity, temperature history and route assumptions here. These are fictional observations, not live IoT or traffic data. The goal is a decision that another operator can inspect and reproduce.”

Point to the delay, quantity and entered temperature segments. Do not describe the displayed quality index as a food-safety certificate.

## 0:45 - Calculate alternatives (85 seconds)

“The model converts entered temperature exposure to equivalent time at ten degrees using an illustrative Q10 factor. It calculates quality cohorts and the quantity below a declared threshold. Before ranking, it checks hard constraints: accepted produce, receiving hours, capacity, quality and budget. A cheap option can still be rejected.”

Open Rescue Lab. Point to one rejection reason and two feasible alternatives. Change one assumption, such as future delay, and show the recalculation. “The comparison is deterministic. AI does not invent these numbers. For the original unchanged 500 kg tomato seed, the Eastside receiving centre wins, but an edited shipment can produce different results. Costs and journey times are entered assumptions.” Return to your intended demonstration assumptions before saving.

## 2:10 - Preserve the decision (60 seconds)

Save an analysis, or open the prepared saved analysis from History. “This is a frozen snapshot with model and source versions. If someone edits the shipment or receiving rules later, the historical result does not change. Confirming an outdated snapshot is blocked; I calculate a new one using current data. This separates an analytical comparison from a real capacity reservation.” Point to the saved inputs and available option review. Do not edit rules merely to force a stale-input error during a timed demo.

## 3:10 - Explain with AI (60 seconds)

In cloud mode, ask for an explanation of the saved options. “The AI receives authoritative calculated facts. It can explain the trade-off or propose a structured scenario draft. It cannot reserve capacity. Its output is validated, has a request deadline and token limit, and falls back to a deterministic explanation if unavailable. I review a draft before applying it, and then the application recalculates.”

If the response is cached or fallback, say so. In local mode, show the AI architecture in Evidence and state that no live model request was made. If asked which provider is active, answer accurately: current Groq adapter, optional Bedrock adapter. Neutral UI wording does not change that fact.

## 4:10 - Make it operational (70 seconds)

Open an existing reservation in Fulfilment. “This step checks current capacity and versions with transactional writes. Quantities use whole grams and duplicate requests cannot silently book twice. Background workers generate a report and notification record. A permitted terminal transition releases capacity once. The report stays private and an authorized user receives a short-lived download link.”

Show a completed report and relevant state history. “A recorded notification and successful SNS publish do not prove human email delivery. That confirmation remains a limitation in this project.” Never trigger a new reservation solely to make an existing item look fresh.

## 5:20 - Prove the cloud architecture (70 seconds)

Open Evidence, then Architecture and a verified lab card. “The retained product uses API Gateway, Cognito, eight Lambda functions, four DynamoDB tables and four private S3 buckets. Step Functions coordinates analysis; SQS and Streams decouple work; SNS, CloudWatch, CloudTrail, KMS and Budgets support operations.”

“The disposable lab proved EC2 replacement, controlled scaling, EFS versus EBS, peering, WAF blocking, Config remediation, private SQL and DMS full load. The full load reconciled three fictional rows between schemas on one RDS instance. These labs are deleted. Aurora, Direct Connect, SWF and physical transfer services are labelled studies. CloudFront needs account verification, so this deployment uses the approved HTTPS fallback.”

## 6:30 - Value and limitations (30 seconds)

“The practical contribution is a traceable path from a shipment incident to a reviewed, capacity-checked decision. The quality model is illustrative, so production would need calibration and real recipient integration. The cloud evidence distinguishes running resources, measured experiments and studies. The USD 200 budget is a planning limit, not a hard cap or a promise that everything is free.”

## Failure fallback

- Network/sign-in unavailable: use local calculation and the dated cloud evidence files. Say explicitly which parts are offline.
- AI slow/unavailable: show the visible fallback and explain the deadline and validation.
- No saved run: create one from current inputs before the AI segment; do not show a missing run as an AI failure.
- No available capacity: explain the rejection instead of altering receiving rules to force acceptance.
- Browser policy prevents inspection: use the report/slides and label any Phase 3 screenshots with their date and phase.

## Human rehearsal checklist

- Run through once with a timer, using the intended sign-in and fictional records.
- Check desktop and phone layout, keyboard focus, zoom and report download in an allowed browser.
- Verify the saved run still exists and can be reopened; refresh before presenting.
- Keep the report, deck and evidence ZIP available offline.
- Do not claim a live service, email receipt, calibrated model, migration cutover or measured savings without its corresponding evidence.

No human rehearsal or live browser visual verification is claimed by the automated build.
