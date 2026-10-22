import test from "node:test";
import assert from "node:assert/strict";
import { seedWorkspace } from "../src/domain.ts";
import { PROFILES } from "../src/model/parameters.ts";
import {
  analyze,
  makeInput,
  defaultOptions,
  equivalentHours,
  qualityAt,
  lossAt,
  arrivalAt,
  canonical,
  compareCandidates,
  sourceSignature,
} from "../src/model/engine.ts";
import {
  LocalWorkspaceRepository,
  STORAGE_KEY,
} from "../src/data/localRepository.ts";
const setup = () => {
  const w = seedWorkspace(),
    s = w.shipments[0];
  return { w, s, input: makeInput(s, w.destinations, defaultOptions(s)) };
};
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const port = () => {
  const data = new Map();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
};
test("equivalent exposure has explicit hour units and doubles per ten degrees for Q10=2", () => {
  const p = PROFILES.Tomatoes;
  near(equivalentHours([{ durationHours: 2, temperatureC: 10 }], p), 2);
  near(equivalentHours([{ durationHours: 2, temperatureC: 20 }], p), 4);
  near(
    equivalentHours(
      [
        { durationHours: 0.5, temperatureC: 20 },
        { durationHours: 1.5, temperatureC: 20 },
      ],
      p,
    ),
    4,
  );
});
test("cohort loss is not a quality score multiplied by mass", () => {
  const p = {
    ...PROFILES.Tomatoes,
    cohorts: [
      { weight: 0.25, multiplier: 0.5 },
      { weight: 0.75, multiplier: 1 },
    ],
  };
  near(qualityAt(100, 0, p), 87.5);
  near(lossAt(100, 0, 500, p), 125);
  near(qualityAt(100, Math.log(2) / p.decayPerHour, p), 43.75);
});
test("default cohort starting quality is weighted and clipped, with exponential decay", () => {
  const p = PROFILES.Tomatoes;
  near(qualityAt(95, 0, p), 92.65);
  near(qualityAt(95, 10, p), 92.65 * Math.exp(-0.025 * 10));
});
test("all options share past exposure and cooling cannot restore quality", () => {
  const { input } = setup();
  const r = analyze(input);
  for (const c of r.candidates) {
    near(c.curve[0].quality, r.currentQuality);
    assert.ok(c.qualityIndex <= r.currentQuality);
    for (let i = 1; i < c.curve.length; i++)
      assert.ok(c.curve[i].quality <= c.curve[i - 1].quality + 1e-12);
    assert.ok(
      c.estimatedLossKg >= 0 &&
        c.estimatedLossKg <= input.shipment.quantity + 1e-9,
    );
  }
  assert.equal(
    r.candidates.find((c) => c.id === "cooling").futureTemperatureC,
    10,
  );
});
test("colder starting future conditions never heat up in the cooling intervention", () => {
  const { input } = setup();
  input.options.futureTemperatureC = 5;
  const r = analyze(input);
  near(r.candidates[0].qualityIndex, r.candidates[1].qualityIndex);
  assert.equal(r.candidates[1].futureTemperatureC, 5);
});
test("seeded disrupted shipment has a calculated rescue winner; stable conditions favor continuation", () => {
  const { input } = setup();
  const r = analyze(input);
  assert.equal(r.winnerId, "reroute:eastside");
  assert.ok(
    r.candidates.find((c) => c.id === r.winnerId).estimatedLossKg <
      r.candidates[0].estimatedLossKg,
  );
  input.options.futureTemperatureC = 5;
  input.options.additionalDelayHours = 0;
  assert.equal(analyze(input).winnerId, "continue");
});
test("budget, capacity, produce, arrival and quality reasons reject candidates before ranking", () => {
  const { input } = setup();
  input.options.budgetPaise = 0;
  const r = analyze(input);
  assert.equal(r.winnerId, null);
  assert.deepEqual(r.ranking, []);
  assert.ok(
    r.candidates
      .find((c) => c.id === "reroute:eastside")
      .reasons.some((s) => s.includes("budget")),
  );
  assert.ok(
    r.candidates
      .find((c) => c.id === "reroute:riverfront")
      .reasons.some((s) => s.includes("capacity")),
  );
  assert.ok(r.candidates[0].reasons.some((s) => s.includes("quality")));
  input.options.budgetPaise = 80000;
  input.destinations.find((d) => d.id === "eastside").acceptedProduce = [
    "Bananas",
  ];
  input.destinations.find((d) => d.id === "northside").closesAt = "12:00";
  const updated = analyze(input);
  assert.ok(
    updated.candidates
      .find((c) => c.id === "reroute:eastside")
      .reasons.some((s) => s.includes("does not accept")),
  );
  assert.ok(
    updated.candidates
      .find((c) => c.id === "reroute:northside")
      .reasons.some((s) => s.includes("outside")),
  );
});
test("all-infeasible outcomes are ordinary results, not invented recommendations", () => {
  const { input } = setup();
  input.destinations.forEach((d) => (d.acceptedProduce = ["Bananas"]));
  const r = analyze(input);
  assert.equal(r.winnerId, null);
  assert.ok(r.candidates.every((c) => !c.feasible && c.rank === null));
});
test("arrival arithmetic preserves day offsets and uses delay only once", () => {
  assert.deepEqual(arrivalAt("23:30", 1, 2), { time: "00:30", dayOffset: 1 });
  assert.deepEqual(arrivalAt("01:00", 5, 1), { time: "21:00", dayOffset: -1 });
  const { input } = setup();
  const r = analyze(input);
  assert.equal(r.candidates[0].arrivalTime, "19:30");
  assert.equal(
    r.candidates.find((c) => c.id === "reroute:eastside").futureHours,
    3,
  );
});
test("changing objective priorities can change the winner without inventing quality differences", () => {
  const { input } = setup();
  input.shipment.quantity = 100;
  input.parameters.minimumQuality = 0;
  input.options.weights = { loss: 0, cost: 1, time: 0 };
  assert.equal(analyze(input).winnerId, "continue");
  input.options.weights = { loss: 0, cost: 0, time: 1 };
  assert.equal(analyze(input).winnerId, "reroute:riverfront");
});
test("normalization uses fixed scales and tie breaking is stable", () => {
  const { input } = setup();
  const original = analyze(input);
  input.destinations.push({
    ...input.destinations[0],
    id: "extra",
    name: "Extra destination",
  });
  input.options.routes.push({
    destinationId: "extra",
    travelHours: 60,
    delayShare: 1,
    costPaise: 900000,
  });
  const next = analyze(input);
  for (const c of original.candidates)
    near(c.score, next.candidates.find((x) => x.id === c.id).score);
  const c = original.candidates[0];
  assert.ok(compareCandidates({ ...c, id: "a" }, { ...c, id: "z" }) < 0);
  assert.ok(
    compareCandidates(
      { ...c, estimatedLossKg: 1 },
      { ...c, estimatedLossKg: 2 },
    ) < 0,
  );
});
test("unsupported temperatures, invalid objective weights and invalid route assumptions fail explicitly", () => {
  for (const mutate of [
    (i) => (i.shipment.segments[0].temperatureC = 36),
    (i) => (i.options.weights = { loss: 0, cost: 0, time: 0 }),
    (i) => (i.options.budgetPaise = NaN),
    (i) => (i.options.routes[0].travelHours = 0),
  ]) {
    const { input } = setup();
    mutate(input);
    assert.throws(() => analyze(input));
  }
});
test("deterministic calculations do not mutate inputs and do not depend on destination order", () => {
  const { input } = setup(),
    before = canonical(input);
  const a = analyze(input);
  assert.equal(canonical(input), before);
  assert.deepEqual(analyze(structuredClone(input)), a);
  input.destinations.reverse();
  assert.deepEqual(analyze(input), a);
});
test("missing route assumptions are disclosed rather than fabricated", () => {
  const { input } = setup();
  input.options.routes = input.options.routes.filter(
    (r) => r.destinationId !== "eastside",
  );
  const r = analyze(input);
  assert.ok(r.skippedDestinations.includes("Eastside receiving center"));
  assert.ok(!r.candidates.some((c) => c.destinationId === "eastside"));
});
test("phase 2 stored workspaces migrate additively without losing records", () => {
  const storage = port(),
    old = seedWorkspace();
  delete old.analyses;
  storage.data.set(STORAGE_KEY, JSON.stringify(old));
  const loaded = new LocalWorkspaceRepository(storage).load();
  assert.equal(loaded.shipments.length, 4);
  assert.deepEqual(loaded.analyses, []);
  assert.ok(!JSON.parse(storage.data.get(STORAGE_KEY)).analyses);
});
test("saved analyses preserve frozen inputs/results across edits and reloads", () => {
  const storage = port(),
    repo = new LocalWorkspaceRepository(storage),
    w = repo.load(),
    s = w.shipments[0];
  const run = repo.saveAnalysis(
    s.id,
    defaultOptions(s),
    "Disruption comparison",
    sourceSignature(s, w.destinations),
  );
  repo.saveDestination({ ...w.destinations[0], capacity: 0 }, 1);
  const reloaded = new LocalWorkspaceRepository(storage).load().analyses[0];
  assert.deepEqual(reloaded, run);
  assert.equal(reloaded.input.destinations[0].capacity, 600);
  assert.throws(() => repo.confirmAnalysis(run.id, run.result.winnerId), {
    code: "CONFLICT",
  });
});
test("stale analysis saves and infeasible confirmations are rejected; local plan is idempotent", () => {
  const repo = new LocalWorkspaceRepository(port()),
    w = repo.load(),
    s = w.shipments[0],
    source = sourceSignature(s, w.destinations);
  const run = repo.saveAnalysis(
    s.id,
    defaultOptions(s),
    "First analysis",
    source,
  );
  assert.throws(() => repo.confirmAnalysis(run.id, "continue"), {
    code: "INFEASIBLE",
  });
  const first = repo.confirmAnalysis(run.id, run.result.winnerId);
  assert.equal(repo.confirmAnalysis(run.id, run.result.winnerId).id, first.id);
  assert.equal(repo.load().destinations[0].reservedKg, 0);
  repo.saveDestination({ ...w.destinations[0], capacity: 0 }, 1);
  assert.throws(
    () => repo.saveAnalysis(s.id, defaultOptions(s), "Stale", source),
    { code: "CONFLICT" },
  );
});
test("tampered saved results are preserved for recovery and cannot be silently trusted", () => {
  const storage = port(),
    repo = new LocalWorkspaceRepository(storage),
    w = repo.load(),
    s = w.shipments[0];
  repo.saveAnalysis(
    s.id,
    defaultOptions(s),
    "Integrity check",
    sourceSignature(s, w.destinations),
  );
  const raw = JSON.parse(storage.data.get(STORAGE_KEY));
  raw.analyses[0].result.candidates[0].qualityIndex = 99;
  const damaged = JSON.stringify(raw);
  storage.data.set(STORAGE_KEY, damaged);
  assert.throws(() => repo.load(), { code: "STORAGE_FORMAT" });
  assert.equal(repo.exportRaw(), damaged);
});
