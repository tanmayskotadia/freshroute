import { MapPin, ArrowRight, Check, TriangleAlert } from "lucide-react";
import { isOpenAt } from "../domain";
import type { SavedShipment, Destination } from "../domain";
export function ShipmentRoute({
  shipment,
  destination,
}: {
  shipment: SavedShipment;
  destination?: Destination;
}) {
  const checks = destination
    ? [
        {
          label: "Produce acceptance",
          ok: destination.acceptedProduce.includes(
            shipment.produce as "Tomatoes" | "Bananas" | "Leafy greens",
          ),
          detail: destination.acceptedProduce.join(", "),
        },
        {
          label: "Receiving capacity",
          ok:
            destination.capacity - destination.reservedKg >= shipment.quantity,
          detail: `${destination.capacity - destination.reservedKg} kg available · ${shipment.quantity} kg planned`,
        },
        {
          label: "Daily arrival window",
          ok: isOpenAt(destination, shipment.eta),
          detail: `${destination.opensAt}–${destination.closesAt} IST · arrival ${shipment.eta}`,
        },
      ]
    : [];
  return (
    <>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Your planned route</h2>
            <p>Entered route, not GPS tracking or a computed travel path.</p>
          </div>
          <MapPin size={18} />
        </div>
        <div className="saved-route">
          <div>
            <span className="route-pin" />
            <small>ORIGIN</small>
            <strong>{shipment.origin}</strong>
          </div>
          <div className="route-connection">
            <span />
            <ArrowRight size={20} />
            <span />
          </div>
          <div>
            <span className="route-pin destination" />
            <small>DESTINATION</small>
            <strong>{destination?.name || shipment.destination}</strong>
          </div>
        </div>
        <div className="route-facts">
          <span>
            Remaining planned travel{" "}
            <strong>{shipment.plannedTravelHours}h</strong>
          </span>
          <span>
            Additional delay <strong>{shipment.delay}h</strong>
          </span>
          <span>
            Arrival (IST) <strong>{shipment.eta}</strong>
          </span>
        </div>
      </section>
      <section className="panel receiving-checks">
        <div className="panel-title">
          <div>
            <h2>Receiving-rule checks</h2>
            <p>Simple local checks only; no booking or quality analysis.</p>
          </div>
        </div>
        {checks.map((check) => (
          <div className="receiving-check" key={check.label}>
            {check.ok ? (
              <Check size={18} />
            ) : (
              <TriangleAlert size={18} className="warm" />
            )}
            <div>
              <strong>{check.label}</strong>
              <p>{check.detail}</p>
            </div>
            <span className={`badge ${check.ok ? "green" : "amber"}`}>
              {check.ok ? "Matches" : "Review"}
            </span>
          </div>
        ))}
        <p className="fine-print receiving-note">
          Capacity is an entered rule, not a live partner commitment. Status is
          operator assigned. Rules are evaluated at the daily arrival time in
          IST.
        </p>
      </section>
    </>
  );
}
