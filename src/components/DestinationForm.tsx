import { useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { DomainError, PRODUCE } from "../domain";
import type { Destination } from "../domain";
export function DestinationForm({
  destination,
  onSave,
  onCancel,
}: {
  destination: Destination;
  onSave: (value: Destination) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(structuredClone(destination));
  const [capacity, setCapacity] = useState(String(destination.capacity));
  const [error, setError] = useState("");
  return (
    <form
      className="shipment-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        try {
          onSave({
            ...value,
            capacity: capacity.trim() === "" ? NaN : Number(capacity),
          });
        } catch (e) {
          setError(
            e instanceof DomainError
              ? [e.message, ...Object.values(e.fields)].join(" ")
              : e instanceof Error
                ? e.message
                : "Could not save receiving rules.",
          );
        }
      }}
    >
      <p className="dialog-intro">
        Local demo management only. Authentication and administrator enforcement
        come with the cloud phase. Changing rules does not reserve capacity or
        recalculate old comparisons.
      </p>
      {error && (
        <div className="notice amber" role="alert">
          <TriangleAlert size={18} />
          <p>{error}</p>
        </div>
      )}
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="destination-name">Destination name</label>
          <input
            id="destination-name"
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="destination-type">Partner type</label>
          <input
            id="destination-type"
            value={value.type}
            onChange={(e) => setValue({ ...value, type: e.target.value })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="destination-capacity">
            Total receiving capacity (kg)
          </label>
          <input
            id="destination-capacity"
            type="number"
            step="any"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
          <small>
            {destination.reservedKg} kg reserved. Reservations are not editable
            here.
          </small>
        </div>
        <div className="form-field">
          <label htmlFor="destination-opens">Opens at (IST)</label>
          <input
            id="destination-opens"
            type="time"
            value={value.opensAt}
            onInput={(e) =>
              setValue({ ...value, opensAt: e.currentTarget.value })
            }
            onChange={(e) => setValue({ ...value, opensAt: e.target.value })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="destination-closes">Closes at (IST)</label>
          <input
            id="destination-closes"
            type="time"
            value={value.closesAt}
            onInput={(e) =>
              setValue({ ...value, closesAt: e.currentTarget.value })
            }
            onChange={(e) => setValue({ ...value, closesAt: e.target.value })}
          />
        </div>
      </div>
      <fieldset className="produce-checks">
        <legend>Accepted produce</legend>
        {PRODUCE.map((produce) => (
          <label key={produce}>
            <input
              type="checkbox"
              checked={value.acceptedProduce.includes(produce)}
              onChange={(e) =>
                setValue({
                  ...value,
                  acceptedProduce: e.target.checked
                    ? [...value.acceptedProduce, produce]
                    : value.acceptedProduce.filter((p) => p !== produce),
                })
              }
            />
            {produce}
          </label>
        ))}
      </fieldset>
      <p className="fine-print">
        Daily same-day hours; opening is inclusive and closing is exclusive.
        Overnight schedules are outside this local version.
      </p>
      <div className="form-footer">
        <div>
          <button type="button" className="button secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="button" type="submit">
            <Check size={16} />
            Save receiving rules
          </button>
        </div>
      </div>
    </form>
  );
}
