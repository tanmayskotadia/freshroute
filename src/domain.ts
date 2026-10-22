import type { DemoDecision, Shipment } from "./fixtures.ts";
import { shipments as fixtures } from "./fixtures.ts";

export const PRODUCE = ["Tomatoes", "Bananas", "Leafy greens"] as const;
export type Produce = (typeof PRODUCE)[number];
export type Segment = { durationHours: number; temperatureC: number };
export type LocalEvent = {
  id: string;
  at: string;
  title: string;
  note: string;
};
export type SavedShipment = Shipment & {
  destinationId: string;
  valuePaisePerKg: number;
  initialQuality: number;
  plannedTravelHours: number;
  segments: Segment[];
  version: number;
  createdAt: string;
  updatedAt: string;
  events: LocalEvent[];
};
export type Destination = {
  id: string;
  name: string;
  type: string;
  capacity: number;
  reservedKg: number;
  opensAt: string;
  closesAt: string;
  acceptedProduce: Produce[];
  version: number;
  updatedAt: string;
};
export type ShipmentInput = {
  produce: string;
  quantity: number;
  origin: string;
  destinationId: string;
  valuePaisePerKg: number;
  initialQuality: number;
  plannedTravelHours: number;
  delay: number;
  eta: string;
  status: Shipment["status"];
  segments: Segment[];
};
export type ShipmentFields = {
  produce: string;
  quantity: string;
  origin: string;
  destinationId: string;
  valuePerKg: string;
  initialQuality: string;
  plannedTravelHours: string;
  delay: string;
  eta: string;
  status: Shipment["status"];
  segments: { durationHours: string; temperatureC: string }[];
};
export type Draft = {
  key: string;
  fields: ShipmentFields;
  baseVersion?: number;
  savedAt: string;
};
export type Workspace = {
  schemaVersion: 1;
  revision: number;
  shipments: SavedShipment[];
  destinations: Destination[];
  decisions: DemoDecision[];
  drafts: Draft[];
};
export class DomainError extends Error {
  code: string;
  fields: Record<string, string>;
  constructor(
    code: string,
    message: string,
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.fields = fields;
  }
}
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const finite = (n: unknown, min: number, max: number) =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
export const formatIST = (date: string) =>
  new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
export function isOpenAt(destination: Destination, time: string) {
  if (!timePattern.test(time)) return false;
  return time >= destination.opensAt && time < destination.closesAt;
}
export function validateShipment(
  input: ShipmentInput,
  destinations: Destination[],
) {
  const errors: Record<string, string> = {};
  if (!PRODUCE.includes(input.produce as Produce))
    errors.produce = "Choose a supported produce type.";
  if (!finite(input.quantity, 1, 10000))
    errors.quantity = "Enter 1 to 10,000 kg.";
  if (
    typeof input.origin !== "string" ||
    !input.origin.trim() ||
    input.origin.trim().length > 100
  )
    errors.origin = "Enter an origin of 1–100 characters.";
  if (!destinations.some((d) => d.id === input.destinationId))
    errors.destinationId = "Choose an existing receiving destination.";
  if (
    !Number.isInteger(input.valuePaisePerKg) ||
    !finite(input.valuePaisePerKg, 0, 1000000)
  )
    errors.valuePerKg =
      "Enter ₹0–10,000 per kg, with at most two decimal places.";
  if (!finite(input.initialQuality, 0, 100))
    errors.initialQuality = "Enter a starting quality index from 0 to 100.";
  if (!finite(input.plannedTravelHours, 0.25, 72))
    errors.plannedTravelHours = "Enter 0.25–72 hours of planned travel.";
  if (!finite(input.delay, 0, 48))
    errors.delay = "Enter 0–48 hours of additional delay.";
  if (!timePattern.test(input.eta))
    errors.eta = "Enter a valid local arrival time.";
  if (!["Needs attention", "Monitor", "On track"].includes(input.status))
    errors.status = "Choose a valid operator-assigned status.";
  if (
    !Array.isArray(input.segments) ||
    input.segments.length < 1 ||
    input.segments.length > 12
  )
    errors.segments = "Add between 1 and 12 temperature segments.";
  else {
    let total = 0;
    input.segments.forEach((s, i) => {
      if (!s || !finite(s.durationHours, 0.1, 168))
        errors[`segments.${i}.durationHours`] = "Enter 0.1–168 hours.";
      if (!s || !finite(s.temperatureC, -5, 45))
        errors[`segments.${i}.temperatureC`] =
          "Enter a temperature from −5 to 45°C.";
      total += s?.durationHours || 0;
    });
    if (total > 168)
      errors.segments = "Combined temperature history cannot exceed 168 hours.";
  }
  if (Object.keys(errors).length)
    throw new DomainError(
      "VALIDATION",
      "Check the highlighted shipment fields.",
      errors,
    );
}
export function validateDestination(input: Destination) {
  const errors: Record<string, string> = {};
  if (!input.name.trim() || input.name.trim().length > 100)
    errors.name = "Enter a name of 1–100 characters.";
  if (!input.type.trim() || input.type.trim().length > 80)
    errors.type = "Enter a destination type of 1–80 characters.";
  if (
    !finite(input.capacity, 0, 100000) ||
    !finite(input.reservedKg, 0, input.capacity)
  )
    errors.capacity =
      "Capacity must be 0–100,000 kg and cannot be below reserved quantity.";
  if (
    !timePattern.test(input.opensAt) ||
    !timePattern.test(input.closesAt) ||
    input.opensAt >= input.closesAt
  )
    errors.hours =
      "Use a same-day opening time before closing time (IST). Overnight windows are not supported yet.";
  if (
    !input.acceptedProduce.length ||
    input.acceptedProduce.some((p) => !PRODUCE.includes(p)) ||
    new Set(input.acceptedProduce).size !== input.acceptedProduce.length
  )
    errors.acceptedProduce =
      "Select at least one supported produce type without duplicates.";
  if (Object.keys(errors).length)
    throw new DomainError("VALIDATION", "Check the receiving rules.", errors);
}
export function toInput(fields: ShipmentFields): ShipmentInput {
  const number = (value: string) => (value.trim() === "" ? NaN : Number(value));
  const value = number(fields.valuePerKg);
  const paise = Math.round(value * 100);
  return {
    produce: fields.produce,
    quantity: number(fields.quantity),
    origin: fields.origin.trim(),
    destinationId: fields.destinationId,
    valuePaisePerKg: Math.abs(value * 100 - paise) > 0.000001 ? NaN : paise,
    initialQuality: number(fields.initialQuality),
    plannedTravelHours: number(fields.plannedTravelHours),
    delay: number(fields.delay),
    eta: fields.eta,
    status: fields.status,
    segments: fields.segments.map((s) => ({
      durationHours: number(s.durationHours),
      temperatureC: number(s.temperatureC),
    })),
  };
}
export function fieldsFor(shipment?: SavedShipment): ShipmentFields {
  return shipment
    ? {
        produce: shipment.produce,
        quantity: String(shipment.quantity),
        origin: shipment.origin,
        destinationId: shipment.destinationId,
        valuePerKg: String(shipment.valuePaisePerKg / 100),
        initialQuality: String(shipment.initialQuality),
        plannedTravelHours: String(shipment.plannedTravelHours),
        delay: String(shipment.delay),
        eta: shipment.eta,
        status: shipment.status,
        segments: shipment.segments.map((s) => ({
          durationHours: String(s.durationHours),
          temperatureC: String(s.temperatureC),
        })),
      }
    : {
        produce: "Tomatoes",
        quantity: "500",
        origin: "Naroda distribution hub",
        destinationId: "central",
        valuePerKg: "30",
        initialQuality: "95",
        plannedTravelHours: "5.5",
        delay: "0",
        eta: "16:30",
        status: "On track",
        segments: [{ durationHours: "1", temperatureC: "10" }],
      };
}
export function seedWorkspace(): Workspace {
  const at = "2026-10-22T07:30:00.000Z";
  const make = (
    id: string,
    name: string,
    type: string,
    capacity: number,
    opensAt: string,
    closesAt: string,
    acceptedProduce: Produce[],
  ): Destination => ({
    id,
    name,
    type,
    capacity,
    reservedKg: 0,
    opensAt,
    closesAt,
    acceptedProduce,
    version: 1,
    updatedAt: at,
  });
  const destinations = [
    make(
      "eastside",
      "Eastside receiving center",
      "Distribution partner",
      600,
      "09:00",
      "19:00",
      ["Tomatoes", "Bananas"],
    ),
    make(
      "central",
      "Central produce market",
      "Wholesale market",
      900,
      "06:00",
      "20:00",
      [...PRODUCE],
    ),
    make(
      "riverfront",
      "Riverfront community kitchen",
      "Food rescue partner",
      200,
      "08:00",
      "17:00",
      ["Leafy greens", "Tomatoes"],
    ),
    make(
      "westside",
      "Westside fresh market",
      "Retail receiving partner",
      450,
      "08:00",
      "18:00",
      ["Bananas", "Tomatoes"],
    ),
    make(
      "northside",
      "Northside receiving center",
      "Distribution partner",
      800,
      "07:00",
      "20:00",
      ["Tomatoes", "Leafy greens"],
    ),
  ];
  const shipments = fixtures.map((s) => ({
    ...s,
    destinationId: destinations.find((d) => d.name === s.destination)!.id,
    valuePaisePerKg: s.produce === "Leafy greens" ? 5000 : 3000,
    initialQuality: 95,
    plannedTravelHours: 5.5,
    segments: [
      { durationHours: 2, temperatureC: 10 },
      { durationHours: 1, temperatureC: s.temperature },
    ],
    version: 1,
    createdAt: at,
    updatedAt: at,
    events: [
      {
        id: `seed-${s.id}`,
        at,
        title: "Demo shipment seeded",
        note: "Fictional sample loaded. Status is operator assigned, not a prediction.",
      },
    ],
  }));
  return {
    schemaVersion: 1,
    revision: 0,
    shipments,
    destinations,
    decisions: [],
    drafts: [],
  };
}
