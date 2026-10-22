import test from "node:test";
import assert from "node:assert/strict";
import { csvRows, parseShipmentsCsv, CSV_COLUMNS } from "../server/csv.ts";
import { seedWorkspace } from "../src/domain.ts";
const header = CSV_COLUMNS.join(",");
const row =
  'Tomatoes,100,"Naroda, collection hub",eastside,30,95,2.25,1,14:00,2@10;1@18';
test("CSV quoted commas, doubled quotes, CRLF and BOM preserve values", () => {
  const rows = csvRows('\uFEFFa,b\r\n"one,two","quote ""inside"""\r\n');
  assert.deepEqual(rows, [
    ["a", "b"],
    ["one,two", 'quote "inside"'],
  ]);
  const result = parseShipmentsCsv(
    header + "\n" + row,
    seedWorkspace().destinations,
  );
  assert.equal(result[0].origin, "Naroda, collection hub");
  assert.equal(result[0].valuePaisePerKg, 3000);
  assert.equal(result[0].segments.length, 2);
});
test("CSV validates all rows before returning any shipment", () => {
  assert.throws(
    () =>
      parseShipmentsCsv(
        header + "\n" + row + "\n" + row.replace("Tomatoes,100", "Tomatoes,-2"),
        seedWorkspace().destinations,
      ),
    (e) => e.code === "VALIDATION" && !!e.fields.row3,
  );
  assert.throws(
    () =>
      parseShipmentsCsv(
        header + "\n" + row.replace("eastside", "unknown"),
        seedWorkspace().destinations,
      ),
    /No rows/,
  );
});
test("CSV rejects duplicate/missing headers, malformed quotes and excessive rows", () => {
  assert.throws(
    () =>
      parseShipmentsCsv(
        header.replace("origin", "produce") + "\n" + row,
        seedWorkspace().destinations,
      ),
    /ten column/,
  );
  assert.throws(() => csvRows('a,b\n"unclosed'), /Unclosed/);
  assert.throws(() => csvRows('a,b\n"closed"extra,x'), /Unexpected/);
  assert.throws(
    () =>
      parseShipmentsCsv(
        header + "\n" + Array(26).fill(row).join("\n"),
        seedWorkspace().destinations,
      ),
    /25 shipments/,
  );
});
