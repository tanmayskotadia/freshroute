export type ReservationState =
  "CONFIRMED" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
export type Reservation = {
  allocations?: import("../model/insights.ts").SplitPart[];
  id: string;
  runId: string;
  shipmentId: string;
  candidateId: string;
  candidateName: string;
  destinationId: string;
  destination: string;
  produce: string;
  quantity: number;
  quantityGrams: number;
  status: ReservationState;
  version: number;
  createdAt: string;
  updatedAt: string;
  costPaise: number;
  estimatedLossKg: number;
  modelVersion: string;
  events: { status: ReservationState; at: string; note: string }[];
};
export type InboxMessage = {
  id: string;
  reservationId: string;
  title: string;
  message: string;
  at: string;
  read: boolean;
};
