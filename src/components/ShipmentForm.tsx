import { useState } from "react";
import {
  Check,
  Plus,
  Save,
  Trash2,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import {
  DomainError,
  fieldsFor,
  formatIST,
  PRODUCE,
  toInput,
  validateShipment,
} from "../domain";
import type {
  SavedShipment,
  Destination,
  ShipmentFields,
  Draft,
} from "../domain";
import type { WorkspaceRepository } from "../data/localRepository";

type Props = {
  shipment?: SavedShipment;
  destinations: Destination[];
  draft?: Draft;
  repository: WorkspaceRepository;
  execute: <T>(operation: () => T) => T;
  onSaved: (id: string) => void;
  onNotify: (text: string) => void;
  onCancel: () => void;
};
export function ShipmentForm({
  shipment,
  destinations,
  draft,
  repository,
  execute,
  onSaved,
  onNotify,
  onCancel,
}: Props) {
  const [fields, setFields] = useState<ShipmentFields>(() =>
    fieldsFor(shipment),
  );
  const [baseVersion, setBaseVersion] = useState(shipment?.version);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [draftVisible, setDraftVisible] = useState(!!draft);
  const [savedDraftAt, setSavedDraftAt] = useState("");
  const key = shipment ? `edit:${shipment.id}` : "new";
  function update<K extends keyof ShipmentFields>(
    name: K,
    value: ShipmentFields[K],
  ) {
    setFields((previous) => ({ ...previous, [name]: value }));
    setSavedDraftAt("");
    setErrors({});
    setMessage("");
  }
  function handleError(error: unknown) {
    const e = error instanceof Error ? error : new Error("Unable to save.");
    setMessage(e.message);
    setErrors(error instanceof DomainError ? error.fields : {});
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>('.shipment-form [aria-invalid="true"]')
        ?.focus(),
    );
  }
  function saveDraft() {
    try {
      const at = new Date().toISOString();
      execute(() =>
        repository.saveDraft({ key, fields, baseVersion, savedAt: at }),
      );
      setSavedDraftAt(at);
      setDraftVisible(false);
      onNotify(
        "Draft saved in this browser. You can close the form and restore it later.",
      );
    } catch (e) {
      handleError(e);
    }
  }
  const input = (
    name: Exclude<keyof ShipmentFields, "segments">,
    label: string,
    type = "text",
    hint?: string,
  ) => (
    <div className="form-field">
      <label htmlFor={`shipment-${name}`}>{label}</label>
      <input
        id={`shipment-${name}`}
        type={type}
        step={type === "number" ? "any" : undefined}
        value={fields[name]}
        onChange={(e) => update(name, e.target.value as never)}
        onInput={
          type === "time"
            ? (e) => update(name, e.currentTarget.value as never)
            : undefined
        }
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `error-${name}` : undefined}
      />
      {hint && <small>{hint}</small>}
      {errors[name] && (
        <span className="field-error" id={`error-${name}`}>
          {errors[name]}
        </span>
      )}
    </div>
  );
  const selectedDestination = destinations.find(
    (d) => d.id === fields.destinationId,
  );
  return (
    <form
      className="shipment-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setMessage("");
        setErrors({});
        try {
          const value = toInput(fields);
          validateShipment(value, destinations);
          const saved = execute(() =>
            repository.saveShipment(value, shipment?.id, baseVersion),
          );
          onSaved(saved.id);
        } catch (e) {
          handleError(e);
        }
      }}
    >
      <p className="dialog-intro">
        Save fictional operational data to this browser. Starting quality and
        temperature history are model inputs; no prediction runs in this phase.
      </p>
      {draftVisible && draft && (
        <div className="draft-banner">
          <div>
            <strong>Saved draft available</strong>
            <p>
              {formatIST(draft.savedAt)} IST ·{" "}
              {draft.baseVersion
                ? `based on version ${draft.baseVersion}`
                : "new shipment"}
            </p>
          </div>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setFields(structuredClone(draft.fields));
              setBaseVersion(draft.baseVersion);
              setDraftVisible(false);
              setMessage("");
              setErrors({});
            }}
          >
            Restore draft <RotateCcw size={14} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Discard saved draft"
            onClick={() => {
              try {
                execute(() => repository.discardDraft(key));
                setDraftVisible(false);
              } catch (e) {
                handleError(e);
              }
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
      {message && (
        <div className="notice amber form-error-summary" role="alert">
          <TriangleAlert size={18} />
          <p>{message}</p>
        </div>
      )}
      <div className="form-section-title">
        <span>01</span>
        <div>
          <h3>Shipment details</h3>
          <p>The produce, route and value you want to track.</p>
        </div>
      </div>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="shipment-produce">Produce</label>
          <select
            id="shipment-produce"
            value={fields.produce}
            onChange={(e) => update("produce", e.target.value)}
          >
            {PRODUCE.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        {input("quantity", "Quantity (kg)", "number")}
        {input("origin", "Origin / collection hub")}
        <div className="form-field">
          <label htmlFor="shipment-destinationId">Planned destination</label>
          <select
            id="shipment-destinationId"
            value={fields.destinationId}
            onChange={(e) => update("destinationId", e.target.value)}
          >
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {errors.destinationId && (
            <span className="field-error">{errors.destinationId}</span>
          )}
        </div>
        {input(
          "valuePerKg",
          "Produce value (₹ / kg)",
          "number",
          "An illustrative unit value for future comparisons.",
        )}
        {input(
          "initialQuality",
          "Starting quality index (0–100)",
          "number",
          "Quality at the start of the history below; not a food-safety score.",
        )}
      </div>
      {selectedDestination && (
        <div className="destination-preview">
          <strong>{selectedDestination.name}</strong>
          <span>
            {selectedDestination.capacity - selectedDestination.reservedKg} kg
            available · {selectedDestination.opensAt}–
            {selectedDestination.closesAt} IST
          </span>
          <small>
            {selectedDestination.acceptedProduce.includes(
              fields.produce as (typeof PRODUCE)[number],
            )
              ? "Accepts this produce"
              : "This destination does not currently accept the selected produce. You can record the planned route; later analysis must reject it."}
          </small>
        </div>
      )}
      <div className="form-section-title">
        <span>02</span>
        <div>
          <h3>Travel and review status</h3>
          <p>Status is assigned by an operator, not calculated.</p>
        </div>
      </div>
      <div className="form-grid">
        {input(
          "plannedTravelHours",
          "Remaining planned travel (hours)",
          "number",
        )}
        {input("delay", "Additional delay (hours)", "number")}
        {input("eta", "Planned arrival (IST)", "time")}
        <div className="form-field">
          <label htmlFor="shipment-status">Operator review status</label>
          <select
            id="shipment-status"
            value={fields.status}
            onChange={(e) =>
              update("status", e.target.value as ShipmentFields["status"])
            }
          >
            <option>On track</option>
            <option>Monitor</option>
            <option>Needs attention</option>
          </select>
        </div>
      </div>
      <div className="form-section-title">
        <span>03</span>
        <div>
          <h3>Temperature history</h3>
          <p>
            Oldest segment first. The final segment supplies the current
            temperature.
          </p>
        </div>
      </div>
      <div className="segment-list">
        {fields.segments.map((segment, index) => (
          <div className="segment-row" key={index}>
            <span className="segment-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            {(["durationHours", "temperatureC"] as const).map((field) => (
              <div className="form-field" key={field}>
                <label htmlFor={`segment-${index}-${field}`}>
                  {field === "durationHours"
                    ? "Duration (hours)"
                    : "Temperature (°C)"}
                </label>
                <input
                  id={`segment-${index}-${field}`}
                  type="number"
                  step="any"
                  value={segment[field]}
                  onChange={(e) =>
                    update(
                      "segments",
                      fields.segments.map((s, i) =>
                        i === index ? { ...s, [field]: e.target.value } : s,
                      ),
                    )
                  }
                  aria-invalid={!!errors[`segments.${index}.${field}`]}
                  aria-describedby={
                    errors[`segments.${index}.${field}`]
                      ? `segment-error-${index}-${field}`
                      : undefined
                  }
                />
                {errors[`segments.${index}.${field}`] && (
                  <span
                    className="field-error"
                    id={`segment-error-${index}-${field}`}
                  >
                    {errors[`segments.${index}.${field}`]}
                  </span>
                )}
              </div>
            ))}
            <button
              type="button"
              className="icon-button"
              disabled={fields.segments.length === 1}
              aria-label={`Remove temperature segment ${index + 1}`}
              onClick={() =>
                update(
                  "segments",
                  fields.segments.filter((_, i) => i !== index),
                )
              }
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      {errors.segments && <p className="field-error">{errors.segments}</p>}
      <button
        type="button"
        className="text-button"
        disabled={fields.segments.length >= 12}
        onClick={() =>
          update("segments", [
            ...fields.segments,
            {
              durationHours: "1",
              temperatureC: fields.segments.at(-1)?.temperatureC || "10",
            },
          ])
        }
      >
        <Plus size={15} />
        Add temperature segment
      </button>
      <div className="form-footer">
        <p>
          {savedDraftAt
            ? `Draft saved ${formatIST(savedDraftAt)} IST`
            : "Close drops unsaved changes. Save a draft to continue later."}
        </p>
        <div>
          <button type="button" className="button secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={saveDraft}
          >
            <Save size={15} />
            Save draft
          </button>
          <button className="button" type="submit">
            <Check size={16} />
            {shipment ? "Save changes" : "Save shipment"}
          </button>
        </div>
      </div>
    </form>
  );
}
