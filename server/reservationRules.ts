import { DomainError } from "../src/domain.ts";
import type { ReservationState } from "../src/cloud/reservationTypes.ts";
export function grams(kg: number) {
  const value = Math.round(kg * 1000);
  if (
    !Number.isFinite(kg) ||
    kg <= 0 ||
    !Number.isSafeInteger(value) ||
    Math.abs(value - kg * 1000) > 0.00001
  )
    throw new DomainError(
      "VALIDATION",
      "Reservation quantities must be positive with at most three decimal places in kg.",
    );
  return value;
}
export function transition(from: ReservationState, to: ReservationState) {
  if (from === to) return { changed: false, release: false };
  const allowed: Record<ReservationState, ReservationState[]> = {
    CONFIRMED: ["DISPATCHED", "CANCELLED"],
    DISPATCHED: ["DELIVERED"],
    DELIVERED: [],
    CANCELLED: [],
  };
  if (!allowed[from]?.includes(to))
    throw new DomainError(
      "CONFLICT",
      `Cannot change ${from.toLowerCase()} to ${String(to).toLowerCase()}.`,
    );
  return { changed: true, release: to === "DELIVERED" || to === "CANCELLED" };
}
