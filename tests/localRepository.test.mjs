import test from "node:test";
import assert from "node:assert/strict";
import {
  LocalWorkspaceRepository,
  STORAGE_KEY,
} from "../src/data/localRepository.ts";
import {
  fieldsFor,
  toInput,
  validateShipment,
  isOpenAt,
  seedWorkspace,
} from "../src/domain.ts";

function memory() {
  const values = new Map();
  return {
    values,
    fail: false,
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (this.fail) throw new Error("Quota exceeded");
      values.set(key, value);
    },
  };
}
const input = () => toInput(fieldsFor());
test("first load provides independent fictional fixtures without overwriting storage", () => {
  const port = memory();
  const repo = new LocalWorkspaceRepository(port);
  const first = repo.load();
  assert.equal(first.shipments.length, 4);
  assert.equal(first.destinations.length, 5);
  first.shipments[0].quantity = 7;
  assert.equal(repo.load().shipments[0].quantity, 500);
  assert.equal(port.values.size, 0);
});
test("a newly saved shipment survives a new repository instance with consistent conditions", () => {
  const port = memory();
  const repo = new LocalWorkspaceRepository(port);
  const payload = input();
  payload.quantity = 275;
  payload.segments = [
    { durationHours: 2, temperatureC: 12 },
    { durationHours: 1, temperatureC: 16 },
  ];
  const saved = repo.saveShipment(payload);
  const reopened = new LocalWorkspaceRepository(port)
    .load()
    .shipments.find((s) => s.id === saved.id);
  assert.equal(reopened.quantity, 275);
  assert.equal(reopened.temperature, 16);
  assert.equal(reopened.version, 1);
  assert.equal(reopened.events.length, 1);
  assert.equal(reopened.valuePaisePerKg, 3000);
});
test("edit preserves creation history, increments version and rejects stale edits", () => {
  const repo = new LocalWorkspaceRepository(memory());
  const first = repo.saveShipment(input());
  const updated = repo.saveShipment(
    { ...input(), quantity: 300 },
    first.id,
    first.version,
  );
  assert.equal(updated.version, 2);
  assert.equal(updated.createdAt, first.createdAt);
  assert.equal(updated.events.length, 2);
  assert.throws(() => repo.saveShipment(input(), first.id, 1), {
    code: "CONFLICT",
  });
  assert.equal(
    repo.load().shipments.find((s) => s.id === first.id).quantity,
    300,
  );
});
test("invalid quantities, non-finite values, missing destination and oversized history cannot persist", () => {
  const port = memory();
  const repo = new LocalWorkspaceRepository(port);
  for (const bad of [
    { quantity: NaN },
    { quantity: 0 },
    { quantity: 10001 },
    { destinationId: "missing" },
    { initialQuality: 101 },
    { delay: -1 },
    { plannedTravelHours: 0 },
    {
      segments: [
        { durationHours: 100, temperatureC: 10 },
        { durationHours: 100, temperatureC: 12 },
      ],
    },
    { segments: [{ durationHours: 1, temperatureC: Infinity }] },
  ])
    assert.throws(() => repo.saveShipment({ ...input(), ...bad }), {
      code: "VALIDATION",
    });
  assert.equal(port.values.size, 0);
});
test("money conversion rejects blank values and excess fractional paise", () => {
  for (const amount of ["", "1.001"])
    assert.throws(
      () =>
        validateShipment(
          toInput({ ...fieldsFor(), valuePerKg: amount }),
          seedWorkspace().destinations,
        ),
      { code: "VALIDATION" },
    );
  assert.equal(
    toInput({ ...fieldsFor(), valuePerKg: "12.34" }).valuePaisePerKg,
    1234,
  );
});
test("drafts can retain incomplete fields, restore across reload and clear after a successful save", () => {
  const port = memory();
  const repo = new LocalWorkspaceRepository(port);
  const fields = { ...fieldsFor(), quantity: "" };
  repo.saveDraft({ key: "new", fields, savedAt: new Date().toISOString() });
  assert.equal(
    new LocalWorkspaceRepository(port).load().drafts[0].fields.quantity,
    "",
  );
  repo.saveShipment(input());
  assert.equal(repo.load().drafts.length, 0);
});
test("receiving rules persist, reject invalid hours and detect stale rule edits", () => {
  const repo = new LocalWorkspaceRepository(memory());
  const original = repo.load().destinations[0];
  repo.saveDestination(
    { ...original, capacity: 450, acceptedProduce: ["Tomatoes"] },
    1,
  );
  const saved = repo.load().destinations[0];
  assert.equal(saved.capacity, 450);
  assert.equal(saved.version, 2);
  assert.deepEqual(saved.acceptedProduce, ["Tomatoes"]);
  assert.throws(
    () =>
      repo.saveDestination(
        { ...saved, opensAt: "20:00", closesAt: "09:00" },
        2,
      ),
    { code: "VALIDATION" },
  );
  assert.throws(() => repo.saveDestination(original, 1), { code: "CONFLICT" });
  assert.throws(() => repo.saveDestination({ ...saved, reservedKg: 1 }, 2), {
    code: "VALIDATION",
  });
});
test("daily receiving windows include opening and exclude closing", () => {
  const d = seedWorkspace().destinations[0];
  assert.equal(isOpenAt(d, "09:00"), true);
  assert.equal(isOpenAt(d, "19:00"), false);
  assert.equal(isOpenAt(d, "08:59"), false);
  assert.equal(isOpenAt(d, "not-a-time"), false);
});
test("corrupt and future-version data are preserved and raw export remains available", () => {
  for (const raw of ["{broken", JSON.stringify({ schemaVersion: 99 })]) {
    const port = memory();
    port.values.set(STORAGE_KEY, raw);
    const repo = new LocalWorkspaceRepository(port);
    assert.throws(() => repo.load(), { code: "STORAGE_FORMAT" });
    assert.throws(() => repo.saveShipment(input()), { code: "STORAGE_FORMAT" });
    assert.equal(repo.exportRaw(), raw);
    assert.equal(port.values.get(STORAGE_KEY), raw);
  }
});
test("quota failure preserves previous saved state and does not report success", () => {
  const port = memory();
  const repo = new LocalWorkspaceRepository(port);
  repo.saveShipment(input());
  const before = port.values.get(STORAGE_KEY);
  port.fail = true;
  assert.throws(() => repo.saveShipment({ ...input(), quantity: 700 }), {
    code: "STORAGE_WRITE",
  });
  assert.equal(port.values.get(STORAGE_KEY), before);
});
test("sample decisions survive reload without reserving receiving capacity", () => {
  const port = memory();
  const repo = new LocalWorkspaceRepository(port);
  const before = repo.load().destinations[0];
  const decision = repo.addDecision({
    shipmentId: "FR-101",
    candidateId: "reroute",
    candidateName: "Redirect nearby",
    quantity: 500,
    destination: before.name,
    createdAt: new Date().toISOString(),
  });
  assert.equal(
    new LocalWorkspaceRepository(port).load().decisions[0].id,
    decision.id,
  );
  assert.deepEqual(repo.load().destinations[0], before);
});
test("reset replaces only the FreshRoute key and retains unrelated browser data", () => {
  const port = memory();
  port.values.set("another-app", "untouched");
  const repo = new LocalWorkspaceRepository(port);
  repo.saveShipment(input());
  repo.reset();
  assert.equal(repo.load().shipments.length, 4);
  assert.equal(repo.load().drafts.length, 0);
  assert.equal(port.values.get("another-app"), "untouched");
});
test("malformed nested records and drafts cannot bypass storage validation", () => {
  const malformed = [
    { ...seedWorkspace(), shipments: [] },
    {
      ...seedWorkspace(),
      drafts: [
        {
          key: "new",
          savedAt: new Date().toISOString(),
          fields: {
            produce: "Tomatoes",
            segments: [{ durationHours: "1", temperatureC: "10" }],
          },
        },
      ],
    },
  ];
  for (const workspace of malformed) {
    const port = memory();
    const raw = JSON.stringify(workspace);
    port.values.set(STORAGE_KEY, raw);
    assert.throws(() => new LocalWorkspaceRepository(port).load(), {
      code: "STORAGE_FORMAT",
    });
    assert.equal(port.values.get(STORAGE_KEY), raw);
  }
});
test("blocked browser storage reports a read failure without writing a seed", () => {
  let writes = 0;
  const repo = new LocalWorkspaceRepository({
    getItem() {
      throw new Error("Blocked");
    },
    setItem() {
      writes++;
    },
  });
  assert.throws(() => repo.load(), { code: "STORAGE_READ" });
  assert.equal(writes, 0);
});
