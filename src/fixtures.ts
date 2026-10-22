export type Shipment = {
  id: string;
  produce: string;
  icon: string;
  quantity: number;
  origin: string;
  destination: string;
  temperature: number;
  eta: string;
  status: "Needs attention" | "Monitor" | "On track";
  delay: number;
  color: string;
};
export const shipments: Shipment[] = [
  {
    id: "FR-101",
    produce: "Tomatoes",
    icon: "🍅",
    quantity: 500,
    origin: "Naroda distribution hub",
    destination: "Central produce market",
    temperature: 18,
    eta: "16:30",
    status: "Needs attention",
    delay: 3,
    color: "#f7e5dc",
  },
  {
    id: "FR-102",
    produce: "Bananas",
    icon: "🍌",
    quantity: 320,
    origin: "Sanand collection center",
    destination: "Westside fresh market",
    temperature: 15,
    eta: "15:15",
    status: "Monitor",
    delay: 1,
    color: "#f4efd4",
  },
  {
    id: "FR-103",
    produce: "Leafy greens",
    icon: "🥬",
    quantity: 180,
    origin: "Gandhinagar growers",
    destination: "Riverfront community kitchen",
    temperature: 6,
    eta: "14:45",
    status: "On track",
    delay: 0,
    color: "#e3efda",
  },
  {
    id: "FR-104",
    produce: "Tomatoes",
    icon: "🍅",
    quantity: 420,
    origin: "Naroda distribution hub",
    destination: "Northside receiving center",
    temperature: 11,
    eta: "17:00",
    status: "On track",
    delay: 0,
    color: "#f7e5dc",
  },
];
export type Candidate = {
  id: string;
  name: string;
  short: string;
  cost: number;
  hours: string;
  quality: number;
  note: string;
  destination: string;
  capacity: number;
};
export const candidates: Candidate[] = [
  {
    id: "continue",
    name: "Continue as planned",
    short: "Original route",
    cost: 0,
    hours: "5h 30m",
    quality: 48,
    note: "No extra spend. Longer exposure in the fixture.",
    destination: "Central produce market",
    capacity: 900,
  },
  {
    id: "cooling",
    name: "Improve cooling",
    short: "Temperature intervention",
    cost: 650,
    hours: "5h 30m",
    quality: 69,
    note: "Lower future temperature; the original delay remains.",
    destination: "Central produce market",
    capacity: 900,
  },
  {
    id: "reroute",
    name: "Redirect nearby",
    short: "Alternative destination",
    cost: 450,
    hours: "2h 15m",
    quality: 82,
    note: "Shorter travel to a destination with spare capacity.",
    destination: "Eastside receiving center",
    capacity: 600,
  },
];
export const destinations = [
  {
    name: "Eastside receiving center",
    type: "Distribution partner",
    capacity: 600,
    hours: "09:00–19:00",
    produce: "Tomatoes, bananas",
    x: 72,
    y: 36,
  },
  {
    name: "Central produce market",
    type: "Wholesale market",
    capacity: 900,
    hours: "06:00–20:00",
    produce: "All demo produce",
    x: 50,
    y: 62,
  },
  {
    name: "Riverfront community kitchen",
    type: "Food rescue partner",
    capacity: 200,
    hours: "08:00–17:00",
    produce: "Leafy greens, tomatoes",
    x: 28,
    y: 47,
  },
];
export type DemoDecision = {
  runId?: string;
  modelVersion?: string;
  estimatedLossKg?: number;
  costPaise?: number;
  id: string;
  shipmentId: string;
  candidateId: string;
  candidateName: string;
  quantity: number;
  destination: string;
  createdAt: string;
};
