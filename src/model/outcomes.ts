import type { Reservation } from "../cloud/reservationTypes.ts";
export function outcomeSummary(reservations: Reservation[]) {
  const latest = new Map<string, Reservation>();
  for (const r of reservations) {
    const previous = latest.get(r.shipmentId);
    if (
      r.status === "DELIVERED" &&
      (!previous || r.updatedAt > previous.updatedAt)
    )
      latest.set(r.shipmentId, r);
  }
  const delivered = [...latest.values()];
  const quantities = new Map<string, number>();
  for (const r of delivered)
    quantities.set(r.produce, (quantities.get(r.produce) || 0) + r.quantity);
  return {
    deliveredKg: delivered.reduce((s, r) => s + r.quantity, 0),
    deliveredShipments: delivered.length,
    modelEstimatedLossKg: delivered.reduce((s, r) => s + r.estimatedLossKg, 0),
    extraCostPaise: delivered.reduce((s, r) => s + r.costPaise, 0),
    active: reservations.filter(
      (r) => r.status === "CONFIRMED" || r.status === "DISPATCHED",
    ).length,
    cancelled: reservations.filter((r) => r.status === "CANCELLED").length,
    produce: [...quantities].map(([name, kg]) => ({ name, kg })),
    delivered,
  };
}
