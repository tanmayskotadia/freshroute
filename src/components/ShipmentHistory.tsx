import { Clock3, Thermometer } from "lucide-react";
import { formatIST } from "../domain";
import type { SavedShipment } from "../domain";
export function ShipmentHistory({ shipment }: { shipment: SavedShipment }) {
  const total = shipment.segments.reduce((sum, s) => sum + s.durationHours, 0);
  return (
    <div className="lower-grid">
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Entered temperature history</h2>
            <p>
              {total} elapsed {total === 1 ? "hour" : "hours"} · oldest segment
              first · no model calculation
            </p>
          </div>
          <Thermometer size={19} />
        </div>
        <div className="temperature-segments">
          {shipment.segments.map((segment, index) => (
            <div className="temperature-segment" key={index}>
              <span>Segment {index + 1}</span>
              <strong>{segment.temperatureC}°C</strong>
              <div className="temperature-segment-track">
                <i
                  style={{
                    width: `${Math.max(3, ((segment.temperatureC + 5) / 50) * 100)}%`,
                  }}
                />
              </div>
              <small>
                {segment.durationHours}{" "}
                {segment.durationHours === 1 ? "hour" : "hours"}
              </small>
            </div>
          ))}
        </div>
        <div className="history-assumptions">
          <span>
            Starting quality <strong>{shipment.initialQuality}/100</strong>
          </span>
          <span>
            Remaining planned travel{" "}
            <strong>{shipment.plannedTravelHours} hours</strong>
          </span>
          <span>
            Unit value{" "}
            <strong>
              ₹{(shipment.valuePaisePerKg / 100).toLocaleString("en-IN")}/kg
            </strong>
          </span>
        </div>
      </section>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Shipment activity</h2>
            <p>Recorded local changes · timestamps shown in IST</p>
          </div>
          <Clock3 size={18} />
        </div>
        {[...shipment.events].reverse().map((event) => (
          <div className="timeline-item saved-event" key={event.id}>
            <div className="timeline-dot" />
            <div>
              <small>{formatIST(event.at)} IST</small>
              <strong>{event.title}</strong>
              <p>{event.note}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
