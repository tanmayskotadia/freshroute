import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Reservation } from "../src/cloud/reservationTypes.ts";
export async function reservationPdf(r: Reservation) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const regular = await doc.embedFont(StandardFonts.Helvetica),
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.1, 0.23, 0.18),
    muted = rgb(0.4, 0.46, 0.42);
  const clean = (s: string) => s.replace(/[^\x20-\x7e]/g, " ");
  const text = (s: string, y: number, size = 11, heavy = false, color = ink) =>
    page.drawText(clean(s), {
      x: 44,
      y,
      size,
      font: heavy ? bold : regular,
      color,
    });
  page.drawRectangle({ x: 0, y: 694, width: 595, height: 148, color: ink });
  page.drawText("FreshRoute", {
    x: 44,
    y: 783,
    size: 27,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("RESCUE FULFILMENT RECORD", {
    x: 44,
    y: 750,
    size: 11,
    font: regular,
    color: rgb(0.8, 0.9, 0.8),
  });
  page.drawText(`${r.status}  /  VERSION ${r.version}`, {
    x: 44,
    y: 721,
    size: 12,
    font: bold,
    color: rgb(1, 1, 1),
  });
  text("Shipment and receiving allocation", 661, 17, true);
  const rows = [
    ["Shipment", r.shipmentId],
    ["Produce", r.produce],
    ["Quantity", `${r.quantity} kg`],
    [
      "Receiving destination",
      r.allocations
        ? "Multiple destinations - see allocation page"
        : r.destination,
    ],
    ["Selected action", r.candidateName],
    ["Additional cost", `INR ${(r.costPaise / 100).toFixed(2)}`],
    ["Model-estimated loss", `${r.estimatedLossKg.toFixed(2)} kg`],
    ["Model version", r.modelVersion],
  ];
  rows.forEach(([label, value], i) => {
    const y = 624 - i * 29;
    text(label, y, 10, false, muted);
    page.drawText(clean(value).slice(0, 65), {
      x: 224,
      y,
      size: 11,
      font: regular,
      color: ink,
    });
    page.drawLine({
      start: { x: 44, y: y - 10 },
      end: { x: 551, y: y - 10 },
      thickness: 0.4,
      color: rgb(0.87, 0.9, 0.87),
    });
  });
  text("Status timeline", 359, 17, true);
  r.events.forEach((event, i) => {
    text(
      `${event.status}  |  ${event.at.replace("T", " ").slice(0, 19)} UTC`,
      326 - i * 43,
      10,
      true,
    );
    text(event.note, 311 - i * 43, 10, false, muted);
  });
  text(
    "Academic demonstration using fictional receiving partners.",
    111,
    10,
    true,
  );
  text(
    "This record is not partner acceptance or food-safety certification.",
    94,
    10,
    false,
    muted,
  );
  text(
    "Estimated loss is illustrative model output, not measured waste prevented.",
    77,
    9,
    false,
    muted,
  );
  text(`${r.id} / v${r.version}`, 40, 7, false, muted);
  if (r.allocations?.length) {
    const extra = doc.addPage([595, 842]);
    extra.drawText("FreshRoute / Split receiving record", {
      x: 44,
      y: 782,
      size: 20,
      font: bold,
      color: ink,
    });
    extra.drawText(`${r.shipmentId} - ${r.quantity} kg - ${r.status}`, {
      x: 44,
      y: 748,
      size: 12,
      font: regular,
      color: ink,
    });
    r.allocations.forEach((part, i) => {
      const y = 686 - i * 130;
      extra.drawText(clean(part.destination).slice(0, 65), {
        x: 44,
        y,
        size: 14,
        font: bold,
        color: ink,
      });
      extra.drawText(
        `${part.quantityGrams / 1000} kg | INR ${(part.costPaise / 100).toFixed(2)} planned extra cost`,
        { x: 44, y: y - 28, size: 11, font: regular, color: ink },
      );
      extra.drawText(
        `Quality index ${part.qualityIndex.toFixed(2)} | estimated loss ${part.estimatedLossKg.toFixed(2)} kg`,
        { x: 44, y: y - 51, size: 11, font: regular, color: muted },
      );
    });
    extra.drawText(
      "Allocations share one status and release capacity together.",
      { x: 44, y: 175, size: 11, font: regular, color: muted },
    );
    extra.drawText(
      "Illustrative model estimates; not partner acceptance or food-safety certification.",
      { x: 44, y: 145, size: 10, font: regular, color: muted },
    );
  }
  return doc.save();
}
