import test from "node:test";
import assert from "node:assert/strict";
import { seedWorkspace } from "../src/domain.ts";
import { defaultOptions, sourceSignature } from "../src/model/engine.ts";
import { applyCommand } from "../server/commands.ts";
test("cloud commands reject stale revisions and unlisted operations", () => {
  const w = seedWorkspace();
  assert.throws(
    () => applyCommand(w, { action: "reset", args: [], expectedRevision: 0 }),
    /unavailable/,
  );
  assert.throws(
    () =>
      applyCommand(w, { action: "saveDraft", args: [], expectedRevision: 10 }),
    /changed/,
  );
  assert.throws(
    () =>
      applyCommand(w, { action: "constructor", args: [], expectedRevision: 0 }),
    /unavailable/,
  );
});
test("cloud receiving rules require administrator authority", () => {
  const w = seedWorkspace(),
    cmd = {
      action: "saveDestination",
      args: [{ ...w.destinations[0], capacity: 777 }, 1],
      expectedRevision: 0,
    };
  assert.throws(() => applyCommand(w, cmd), /administrators/);
  const result = applyCommand(w, cmd, true);
  assert.equal(result.workspace.destinations[0].capacity, 777);
  assert.equal(w.destinations[0].version, 1);
});
test("server creates its own analysis and ignores supplied result fields", () => {
  const w = seedWorkspace(),
    s = w.shipments[0];
  const result = applyCommand(w, {
    action: "saveAnalysis",
    args: [
      s.id,
      defaultOptions(s),
      "Server verified",
      sourceSignature(s, w.destinations),
    ],
    expectedRevision: 0,
    result: { winnerId: "forged" },
  });
  assert.equal(
    result.workspace.analyses[0].result.winnerId,
    "reroute:eastside",
  );
  assert.equal(result.workspace.revision, 1);
  assert.equal(w.analyses.length, 0);
});
