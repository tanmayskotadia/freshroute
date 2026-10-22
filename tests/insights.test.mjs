import test from "node:test";
import assert from "node:assert/strict";
import { seedWorkspace } from "../src/domain.ts";
import { makeInput, defaultOptions, analyze } from "../src/model/engine.ts";
import {
  evaluateSplit,
  suggestSplit,
  sensitivity,
  validateDraft,
} from "../src/model/insights.ts";
import { outcomeSummary } from "../src/model/outcomes.ts";
import { validateAnswer, fallback, factsFor } from "../server/copilotRules.ts";
import { withDeadline } from "../server/deadline.ts";
function run() {
  const w = seedWorkspace(),
    s = w.shipments[0],
    options = defaultOptions(s);
  options.budgetPaise = 200000;
  const input = makeInput(s, w.destinations, options);
  return {
    id: "RUN-test",
    shipmentId: s.id,
    shipmentVersion: 1,
    name: "Test",
    createdAt: "2026-10-22T00:00:00.000Z",
    input,
    result: analyze(input),
  };
}
test("a stalled model is aborted at the deadline without changing the saved run", async () => {
  const r = run(),
    before = JSON.stringify(r);
  let signal;
  await assert.rejects(
    withDeadline((s) => {
      signal = s;
      return new Promise(() => {});
    }, 5),
    { name: "CopilotTimeout" },
  );
  assert.equal(signal.aborted, true);
  assert.equal(JSON.stringify(r), before);
  assert.equal(fallback(r, "explain", "TIMEOUT").provenance, "FALLBACK");
});
test("split planning conserves mass and enforces aggregate budget, capacity and unique destinations", () => {
  const r = run(),
    p = suggestSplit(r);
  assert.equal(p.feasible, true);
  assert.equal(
    p.parts.reduce((s, p) => s + p.quantityGrams, 0),
    500000,
  );
  assert.equal(p.unallocatedGrams, 0);
  assert.ok(p.parts.length >= 2 && p.parts.length <= 3);
  assert.ok(p.costPaise <= r.input.options.budgetPaise);
  const requests = p.parts.map(
    ({ candidateId, destinationId, quantityGrams }) => ({
      candidateId,
      destinationId,
      quantityGrams,
    }),
  );
  assert.throws(
    () =>
      evaluateSplit(
        r,
        requests.map((p, i) => ({
          ...p,
          quantityGrams: p.quantityGrams + (i === 0 ? 1 : 0),
        })),
      ),
    /mass/,
  );
  assert.throws(
    () => evaluateSplit(r, [requests[0], requests[0]]),
    /different destination/,
  );
  const low = structuredClone(r);
  low.input.options.budgetPaise = 0;
  assert.throws(() => evaluateSplit(low, requests));
  const full = structuredClone(r);
  full.input.destinations.forEach((d) => (d.reservedKg = d.capacity));
  assert.equal(suggestSplit(full).feasible, false);
});
test("sensitivity is reproducible and leaves saved snapshots unchanged", () => {
  const r = run(),
    before = JSON.stringify(r),
    rows = sensitivity(r);
  assert.equal(rows.length, 6);
  assert.equal(
    rows.find((x) => x.delta === 0).winner,
    r.result.candidates.find((c) => c.id === r.result.winnerId).name,
  );
  assert.equal(JSON.stringify(r), before);
});
test("AI output can select only authoritative fact IDs and validated scenario fields", () => {
  const r = run(),
    answer = validateAnswer(
      JSON.stringify({
        summaryKey: "tradeoffs",
        factIds: ["shipment", "candidate_0"],
      }),
      r,
      "explain",
    );
  assert.equal(answer.facts[0].value, factsFor(r)[0].value);
  for (const bad of [
    { summaryKey: "tradeoffs", factIds: ["invented"] },
    { summaryKey: "tradeoffs", factIds: ["shipment"], cost: 999 },
    {
      summaryKey: "tradeoffs",
      factIds: ["shipment"],
      draft: { budgetPaise: 1 },
    },
  ])
    assert.throws(() => validateAnswer(JSON.stringify(bad), r, "explain"));
  assert.deepEqual(
    validateDraft({ budgetPaise: 90000, additionalDelayHours: 2 }, r),
    { budgetPaise: 90000, additionalDelayHours: 2 },
  );
  for (const draft of [
    { budgetPaise: -1 },
    { owner: "victim" },
    { futureTemperatureC: 200 },
    { routes: [] },
    {},
  ])
    assert.throws(() => validateDraft(draft, r));
  const f = fallback(r, "draft", "TIMEOUT");
  assert.equal(f.provenance, "FALLBACK");
  assert.equal(f.draft, undefined);
  assert.equal(f.reason, "TIMEOUT");
});
test("outcome analytics deduplicate delivered shipments and exclude cancelled or active plans", () => {
  const base = {
    shipmentId: "FR-101",
    quantity: 500,
    produce: "Tomatoes",
    estimatedLossKg: 50,
    costPaise: 45000,
    updatedAt: "2026-10-22T00:00:00.000Z",
    status: "DELIVERED",
  };
  const out = outcomeSummary([
    base,
    { ...base, updatedAt: "2026-10-22T01:00:00.000Z" },
    { ...base, shipmentId: "FR-102", status: "CANCELLED" },
    { ...base, shipmentId: "FR-103", status: "CONFIRMED" },
  ]);
  assert.equal(out.deliveredKg, 500);
  assert.equal(out.modelEstimatedLossKg, 50);
  assert.equal(out.deliveredShipments, 1);
  assert.equal(out.active, 1);
  assert.equal(out.cancelled, 1);
});
