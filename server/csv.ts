import { DomainError, toInput, validateShipment } from "../src/domain.ts";
import type { Destination, ShipmentInput } from "../src/domain.ts";
export const CSV_COLUMNS = [
  "produce",
  "quantityKg",
  "origin",
  "destinationId",
  "valuePerKg",
  "initialQuality",
  "remainingTravelHours",
  "delayHours",
  "eta",
  "history",
];
export function csvRows(text: string): string[][] {
  if (Buffer.byteLength(text, "utf8") > 128000)
    throw new DomainError("LIMIT", "CSV exceeds 128 KB.");
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  text = text.replace(/^\uFEFF/, "");
  const endField = () => {
    row.push(field);
    field = "";
    closed = false;
  };
  const endRow = () => {
    endField();
    if (row.some((v) => v !== "")) rows.push(row);
    row = [];
    if (rows.length > 26)
      throw new DomainError("LIMIT", "Import at most 25 shipments per file.");
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
      continue;
    }
    if (c === ",") {
      endField();
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
      continue;
    }
    if (c === '"') {
      if (field !== "" || closed)
        throw new DomainError("VALIDATION", "Unexpected quote in CSV.");
      quoted = true;
      continue;
    }
    if (closed)
      throw new DomainError(
        "VALIDATION",
        "Unexpected characters after a quoted CSV value.",
      );
    field += c;
  }
  if (quoted) throw new DomainError("VALIDATION", "Unclosed quoted CSV field.");
  if (field !== "" || row.length || closed) endRow();
  return rows;
}
export function parseShipmentsCsv(
  text: string,
  destinations: Destination[],
): ShipmentInput[] {
  const rows = csvRows(text),
    header = rows.shift()?.map((x) => x.trim());
  if (
    !header ||
    header.length !== CSV_COLUMNS.length ||
    new Set(header).size !== header.length ||
    CSV_COLUMNS.some((x) => !header.includes(x))
  )
    throw new DomainError(
      "VALIDATION",
      "Use the provided CSV template with its exact ten column names.",
    );
  if (!rows.length)
    throw new DomainError("VALIDATION", "The CSV has no shipment rows.");
  const errors: Record<string, string> = {},
    inputs: ShipmentInput[] = [];
  rows.forEach((cells, index) => {
    try {
      if (cells.length !== header.length || cells.some((x) => x.length > 500))
        throw Error("Expected ten values, each no longer than 500 characters.");
      const value = Object.fromEntries(
        header.map((h, i) => [h, cells[i].trim()]),
      );
      const segments = value.history.split(";").map((piece) => {
        const pair = piece.split("@");
        if (pair.length !== 2)
          throw Error(
            "History must use hours@temperature segments separated by semicolons.",
          );
        return { durationHours: pair[0], temperatureC: pair[1] };
      });
      const input = toInput({
        produce: value.produce,
        quantity: value.quantityKg,
        origin: value.origin,
        destinationId: value.destinationId,
        valuePerKg: value.valuePerKg,
        initialQuality: value.initialQuality,
        plannedTravelHours: value.remainingTravelHours,
        delay: value.delayHours,
        eta: value.eta,
        status: "Monitor",
        segments,
      });
      validateShipment(input, destinations);
      inputs.push(input);
    } catch (error) {
      errors[`row${index + 2}`] =
        error instanceof DomainError
          ? [error.message, ...Object.values(error.fields)].join(" ")
          : (error as Error).message;
    }
  });
  if (Object.keys(errors).length)
    throw new DomainError(
      "VALIDATION",
      "No rows were imported. Correct the listed CSV errors and upload a new file.",
      errors,
    );
  return inputs;
}
