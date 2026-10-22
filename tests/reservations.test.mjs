import test from "node:test";
import assert from "node:assert/strict";
import { grams, transition } from "../server/reservationRules.ts";
test("capacity quantities use whole grams without silently rounding", () => {
  assert.equal(grams(0.001), 1);
  assert.equal(grams(500.123), 500123);
  for (const kg of [0, -1, NaN, Infinity, 0.0001, 10.1234])
    assert.throws(() => grams(kg));
});
test("capacity is released only on the allowed terminal transition", () => {
  assert.deepEqual(transition("CONFIRMED", "DISPATCHED"), {
    changed: true,
    release: false,
  });
  assert.deepEqual(transition("DISPATCHED", "DELIVERED"), {
    changed: true,
    release: true,
  });
  assert.deepEqual(transition("CONFIRMED", "CANCELLED"), {
    changed: true,
    release: true,
  });
  assert.deepEqual(transition("DELIVERED", "DELIVERED"), {
    changed: false,
    release: false,
  });
  assert.deepEqual(transition("CANCELLED", "CANCELLED"), {
    changed: false,
    release: false,
  });
});
test("illegal transitions cannot release or reactivate capacity", () => {
  for (const [from, to] of [
    ["CONFIRMED", "DELIVERED"],
    ["DISPATCHED", "CANCELLED"],
    ["DELIVERED", "CONFIRMED"],
    ["CANCELLED", "DISPATCHED"],
    ["CONFIRMED", "INVALID"],
  ])
    assert.throws(() => transition(from, to), /Cannot change/);
});
