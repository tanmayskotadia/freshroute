# Phase 1 - frontend foundation and visual prototype

Completed 22 October 2026. This phase implements the visual/navigation prototype only. It does not implement the calculation engine, durable persistence, authentication, AWS infrastructure or live model integration.

## Delivered experience

- Locally bundled DM Sans/Manrope fonts, forest navigation, neutral surfaces, native CSS produce illustration and responsive layout.
- Introduction/demo entry at `/welcome` and `/sign-in`; no credentials requested and no implied authentication.
- Overview with fixture-derived metrics, searchable/filterable/sortable shipment table and next actions.
- Shipment list and detail with route schematic, conditions, illustrative temperature chart and timeline.
- Rescue Lab with delay/temperature/budget inputs, fixed comparison cards, explicit fixture/stale-input labels and review guards.
- Decision review with cost/time/quality summary and temporary confirmation.
- Session history with search, shipment links and reset.
- Receiving network and project evidence pages with honest fictional/planned labels.
- Authored sample copilot explanation, walkthrough guide, notification sample and validated new-shipment form.
- Mobile navigation with accessible names, explicit close, Escape and focus containment; dialog focus containment, return focus and Escape dismissal.
- Empty states, inline validation, disabled states, status toasts, keyboard focus styles, chart text summaries and reduced-motion CSS.

## Source layout

`src/main.tsx`: React startup boundary. `src/App.tsx`: application state, navigation, screens and shared UI primitives. `src/Welcome.tsx`: introduction/demo entry. `src/fixtures.ts`: typed fictional shipments, destinations and comparison data. `src/styles.css`: visual tokens, components and responsive breakpoints. `public/favicon.svg`: native vector mark.

The startup boundary is separate from the component module so hot updates do not recreate an existing React root. The prototype uses plain CSS and authored SVG fixtures rather than introducing unused Tailwind/Recharts infrastructure. Those can be adopted where they simplify later real-data components; this is a Phase 1 implementation choice, not a change to the cloud architecture.

## Verification performed

| Check | Actual result |
|---|---|
| Dependency installation and lockfile | Succeeded; package-lock.json created |
| TypeScript + Vite production build | Passed; production output in dist/ |
| Local HTTP response | 200 from http://127.0.0.1:5173/ |
| Five-screen walkthrough | Overview -> detail -> Rescue Lab -> review -> temporary confirmation -> history succeeded |
| New shipment validation | Quantity 0 rejected with inline error; quantity 250 with Bananas created a session-only detail record |
| Search empty state | Unmatched query displayed no-results state; reset restored list |
| Combined filters | Tomatoes plus Needs attention returned one data row |
| Sort | Quantity descending placed FR-101 / 500 kg first among original fixtures |
| Comparison guard | Review initially disabled; loading matching FR-101 sample enabled it |
| Budget guard | Budget 100 marked two paid options over budget; selected reroute review disabled |
| Explanation dialog | Authored/no-live-AI label visible; Tab cycled within dialog; Escape closed it |
| Mobile menu | Open/close, route navigation and Escape behavior checked; icon-only tablet links retain accessible names |
| Responsive document width | All five main screens checked at 1440, 1024, 768 and 390px; document scroll width equaled client width in all 20 samples |
| Fresh runtime console | No warnings/errors captured after final reload and full main walkthrough |
| Visual review | Desktop overview, Rescue Lab, introduction and mobile overview inspected; viewport screenshots saved |

Raw responsive measurements are in `responsive-results.json`. Client width can be 15px smaller than the requested viewport because of the scrollbar. Tables intentionally scroll inside their container on narrow screens; the page does not overflow horizontally.

Issues found and fixed: hidden table-label overflow on mobile, absent accessible names in collapsed tablet navigation, dialog focus resets during typing, nested explanation-dialog semantics and duplicate root creation during development updates. A temporary browser failure during a Vite configuration restart was recovered with a fresh preview tab; the final server response and app load succeeded.

This is targeted manual browser verification, not an automated end-to-end suite or an accessibility certification. Reduced-motion styling is present but OS-level preference emulation was not exercised. Durable persistence, model correctness, cloud ownership enforcement, reservation transactions, email delivery and real AI are outside this phase's verified scope.

## Screenshots

- `screenshots/overview-1440.png`
- `screenshots/welcome-1440.png`
- `screenshots/shipment-1440.png`
- `screenshots/rescue-1440.png`
- `screenshots/review-1440.png`
- `screenshots/history-1440.png`
- `screenshots/overview-390.png`
- `screenshots/rescue-390.png`

These are viewport screenshots. Screenshot names record requested viewport width, not proof of real cloud activity. Prototype data is intentionally visible as such.

## Run and continue

PowerShell: `npm.cmd ci`, then `npm.cmd run dev`. Build: `npm.cmd run build`. If a constrained execution environment blocks the default npm cache, use a workspace-local cache and the applicable execution permission; do not change system-wide security settings.

Session data resets on refresh. Altering temperature/delay does not recalculate the fixed comparisons: unmatched inputs disable review. The only matching comparison is FR-101, 500 kg, +3h delay and 18 C. Budget checks are a small local UI check, not optimization. Future backend integrations must replace fixtures through explicit adapters and preserve these labels until verified.

Next phase: extract local domain/data adapters, implement saved shipments and receiving workflows, then add durable local persistence. Real prediction and optimizer acceptance belongs to Phase 3. No AWS resources were created and no Bedrock requests were made in Phase 1.
