# FreshRoute UI/UX specification

Status: Phase 0 design, not rendered UI. Goal: an attractive, calm operations product with depth available on demand.

## Information architecture

Public routes: `/` introduction, `/sign-in` authentication/demo entry. Workspace routes: `/overview`, `/shipments`, `/shipments/:id`, `/rescue/:shipmentId`, `/runs/:id/review`, `/history`, `/network`, `/alerts`, `/reports`, `/outcomes`, `/settings`, `/evidence`.

Main navigation groups:

- Workspace: Overview, Shipments, Rescue Lab.
- Operations: Receiving network, Alerts, Reports, History.
- Insights: Outcomes.
- Footer: Settings, Cloud evidence, demo-mode badge and user identity.

Phase 1 exposes the five-screen walkthrough plus useful fixture navigation. Future unfinished screens are omitted or visibly labeled preview; do not present nonfunctional actions as complete. Admin settings appear only in appropriate later role-aware views.

## Visual tokens

| Token | Specification |
|---|---|
| Canvas | #F6F7F2 warm neutral |
| Surface | #FFFFFF; subtle #E3E8E0 borders |
| Sidebar | #123C30 forest; active item uses a lighter green surface |
| Primary | #236B4C with white text; hover/focus states checked for contrast |
| Accent | #BDE49A for decorative highlights, not small low-contrast text |
| Text | #18372D primary; #64736A secondary |
| Information | #315E88 with a pale blue surface |
| Warning | #8A5300 with pale amber surface |
| Critical | #B43B38 with pale red surface |
| Type | Locally bundled open-license sans if available; system sans fallback; no essential remote font dependency |
| Sizes | 14-16px body, 12-13px metadata, 24-32px page title; tabular numerals for metrics |
| Spacing | 4px base; use 8/12/16/24/32px intervals |
| Shape | 12-16px card corners; 8-10px controls; restrained shadows |
| Motion | 120-180ms feedback, reduced-motion support; no continuously moving fake shipments |

Design target: readable text contrast, visible keyboard focus, meaningful labels and at least 44px main touch targets. Verify actual contrasts and interactions in Phase 1 rather than declaring accessibility compliance now.

## Desktop layout

Sidebar 232-248px; header approximately 72px; content maximum around 1440px with 24-32px gutters. Use a 12-column grid and a collapsible 340-380px contextual explanation drawer. At tablet widths collapse the rail; at phone widths use a drawer and stacked cards. Tables get a mobile summary or deliberate scroll treatment, never page-wide accidental overflow.

### Overview wireframe

```text
+--------------+-----------------------------------------------------+
| FreshRoute   | Workspace / Overview        Demo data   Profile     |
|              | Good morning. Let's keep deliveries on track.       |
| Overview  *  | [Active shipments] [Needs review] [Estimated kg risk]|
| Shipments    |                                                     |
| Rescue Lab   | Priority shipments                  [View all ->]   |
|              | Search / produce / status                            |
| Network      | ID  produce  route  ETA  severity  [Inspect]          |
| Alerts       |                                                     |
| Reports      | Route schematic          | Recent decisions         |
| History      | explicitly seeded data   | event / time / shipment  |
|              |                                                     |
| Settings     | Getting started / definitions / next useful action  |
+--------------+-----------------------------------------------------+
```

Metrics have precise definitions and an info affordance. Do not show a heroic food-saved number until there is a defensible selected-plan or recorded-outcome aggregation. No invented trend percentages.

### Shipment detail wireframe

```text
Shipments / FR-101                     [Edit] [Open Rescue Lab]
Tomatoes | 500 kg | fictional route | model/source labels
------------------------------------------------------------------
Route schematic and planned arrival   | Current conditions
Origin -> checkpoint -> destination   | Temperature / elapsed time
------------------------------------------------------------------
Temperature history                  | Shipment details
time axis with units                 | destination hours/capacity
------------------------------------------------------------------
Event timeline: created -> delay -> cooling excursion -> review
```

### Rescue Lab wireframe

```text
Rescue Lab / FR-101      [Saved scenarios] [Explain result]
------------------------------------------------------------------
Controls        | Baseline       Cooling        Reroute             |
Delay           | kg at risk     kg at risk     kg at risk          |
Temperature     | arrival/cost   arrival/cost   arrival/cost        |
Budget          | feasibility   feasibility    feasibility         |
Priorities      |                                                     |
                | Quality timeline and comparison table              |
[Reset]         | Why this ranks first / assumptions                  |
[Run analysis]  | [Review selected option ->]                         |
------------------------------------------------------------------
Preview badge OR saved result ID / model version / timestamp
```

Controls change the local illustrative preview, not a saved cloud result. Editing any input after a saved run marks the view unsaved/stale; confirmation is disabled until the reviewed run corresponds to the displayed inputs. Phase 1 uses fixtures and explicitly labels that no real engine has run.

### Decision review wireframe

```text
Review rescue plan
Selected action / shipment / run ID
Before -> modeled after | cost | arrival | capacity required
Why selected / alternatives rejected / assumptions
Capacity check status and confirmation consequence
[Back to compare]                      [Confirm plan]
```

Successful confirmation shows a durable decision ID and next steps; conflict shows changed availability and recompute. Phase 1 uses a labeled temporary UI state, not real reservation or email delivery.

### History wireframe

```text
History                   Search / date / produce / state
Run ID | Shipment | model | created | status | selected action
[Open run] -> immutable original inputs, results and assumptions
```

## Primary user journeys

J01: demo entry -> overview -> urgent shipment -> Rescue Lab -> compare -> review -> temporary confirmation -> history. Phase 1 goal: all navigation and UI states work using fixtures.

J02: new shipment -> field validation -> draft -> saved shipment -> analysis. Phase 2/3 goal: local persistence and real calculation.

J03: destination selected -> capacity changes -> confirmation conflict -> recompute. Phase 6 goal: actual atomic backend behavior.

J04: result -> copilot question -> grounded explanation -> draft what-if -> review inputs -> new run. Phase 7 goal: no unreviewed AI writes.

## Interaction and state rules

- Search/filter/sort update visible records and expose Clear all; navigation back retains useful context.
- Buttons have descriptive labels. Icon-only controls require accessible names and tooltips.
- Charts have units, legends, meaningful text summaries and keyboard-accessible equivalents.
- Forms expose field errors inline and focus the first invalid field on submit.
- No-result lists explain which filters apply and offer reset; empty history offers a sample run.
- Jobs show queued/running/completed/failed states; a failed job exposes retry only where safe.
- Confirmation disables while submitting and tolerates refresh/retry through backend idempotency later.
- Copilot output is labeled live AI, cached AI or template fallback; mock phase has a separate fixture label.
- Notification/email opt-in is explicit; a toast is not proof an email was sent.
- Demo reset affects only fictional demo scope, never ordinary user records.

## Phase 1 visual acceptance

Required widths: 1440, 1024, 768 and 390px. Review all five main screens, navigation, a comparison selection, explanation drawer, invalid field state and empty search. Check keyboard focus, reduced motion, text overflow and touch targets. Build must pass. Record actual browser checks and screenshots; mock local interactions are not backend acceptance.
