import { useCloud } from "../cloud/CloudRuntime";
import { useState } from "react";
import { ArrowLeft, Check, ShieldCheck, TriangleAlert } from "lucide-react";
import type { SavedAnalysis } from "../model/engine";
import { sourceSignature } from "../model/engine";
import type { SavedShipment, Destination } from "../domain";
import type {
  WorkspaceRepository,
  ExecuteAction,
} from "../data/localRepository";
import { arrival, hours, number, rupees } from "./RescueWorkspace";
export function RunReview({
  run,
  candidateId,
  currentShipment,
  destinations,
  repository,
  execute,
  onBack,
  onConfirmed,
}: {
  run: SavedAnalysis;
  candidateId: string;
  currentShipment?: SavedShipment;
  destinations: Destination[];
  repository: WorkspaceRepository;
  execute: ExecuteAction;
  onBack: () => void;
  onConfirmed: () => void;
}) {
  const { cloud } = useCloud();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const candidate = run.result.candidates.find((c) => c.id === candidateId);
  const stale =
    !currentShipment ||
    sourceSignature(currentShipment, destinations) !==
      sourceSignature(run.input.shipment, run.input.destinations);
  return (
    <>
      <button className="text-button back" onClick={onBack}>
        <ArrowLeft size={15} />
        Back to saved analysis
      </button>
      <div className="page-heading">
        <div>
          <div className="eyebrow">REVIEW THE CALCULATED TRADE-OFFS</div>
          <h1>A clear plan. A considered choice.</h1>
          <p>
            {run.name} · {run.shipmentId} · {run.result.modelVersion}
          </p>
        </div>
      </div>
      {error && (
        <div className="notice amber" role="alert">
          <TriangleAlert size={18} />
          <p>{error}</p>
        </div>
      )}
      {stale && (
        <div className="notice amber">
          <TriangleAlert size={18} />
          <p>
            The current shipment or receiving rules differ from this snapshot.
            This historical result is preserved; create a new analysis before
            selecting a plan.
          </p>
        </div>
      )}
      {!candidate ? (
        <div className="empty-state">
          <h2>Candidate not found in this analysis.</h2>
          <button className="button" onClick={onBack}>
            Open saved analysis
          </button>
        </div>
      ) : (
        <div className="review-grid">
          <section className="panel review-main">
            <span className={`badge ${candidate.feasible ? "green" : "amber"}`}>
              {candidate.feasible
                ? "Feasible in saved snapshot"
                : "Infeasible in saved snapshot"}
            </span>
            <h2>{candidate.name}</h2>
            <p>
              {run.input.shipment.quantity} kg of{" "}
              {run.input.shipment.produce.toLowerCase()} →{" "}
              {candidate.destinationName}
            </p>
            <div className="review-metrics">
              <div>
                <small>Extra cost</small>
                <strong>{rupees(candidate.costPaise)}</strong>
              </div>
              <div>
                <small>Future exposure</small>
                <strong>{hours(candidate.futureHours)}</strong>
              </div>
              <div>
                <small>Mean modeled quality</small>
                <strong>{number(candidate.qualityIndex)}/100</strong>
              </div>
            </div>
            <div className="economic-metrics">
              <span>
                Below threshold
                <strong>{number(candidate.estimatedLossKg)} kg</strong>
              </span>
              <span>
                Modeled loss avoided
                <strong>{number(candidate.avoidedLossKg)} kg</strong>
              </span>
              <span>
                Net modeled benefit
                <strong>{rupees(candidate.netBenefitPaise)}</strong>
              </span>
            </div>
            {candidate.reasons.length > 0 && (
              <ul className="reason-list">
                {candidate.reasons.map((r) => (
                  <li key={r}>
                    <TriangleAlert size={15} />
                    {r}
                  </li>
                ))}
              </ul>
            )}
            <div className="notice amber">
              <ShieldCheck size={20} />
              <p>
                {cloud
                  ? "Reserving this plan holds shared inbound capacity until delivery or cancellation. A private report and notification are queued. Receiving partners in this academic network are fictional; this is not food-safety certification."
                  : "Saving a local plan records your selection only. Capacity is not reserved and no notification is sent."}
              </p>
            </div>
          </section>
          <section className="panel review-sidebar">
            <h2>Snapshot summary</h2>
            <div className="summary-line">
              <span>Shipment version</span>
              <strong>{run.shipmentVersion}</strong>
            </div>
            <div className="summary-line">
              <span>Entered capacity</span>
              <strong>{candidate.availableKg} kg</strong>
            </div>
            <div className="summary-line">
              <span>Arrival</span>
              <strong>{arrival(candidate)}</strong>
            </div>
            <div className="summary-line">
              <span>Weighted score</span>
              <strong>{candidate.score.toFixed(4)}</strong>
            </div>
            <div className="summary-line">
              <span>Rank</span>
              <strong>{candidate.rank || "Not ranked"}</strong>
            </div>
            <p className="fine-print">
              {cloud
                ? "The server checks current receiving rules and reserves capacity atomically. A shipment can have one active allocation."
                : "The local repository checks current source versions. Web Storage is not an atomic multi-user reservation system."}
            </p>
            <button
              className="button"
              disabled={!candidate.feasible || stale || saving}
              onClick={async () => {
                try {
                  setSaving(true);
                  await execute(() =>
                    repository.confirmAnalysis(run.id, candidate.id),
                  );
                  onConfirmed();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Check size={16} />
              {saving
                ? "Saving..."
                : cloud
                  ? "Reserve receiving capacity"
                  : "Save local plan"}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
