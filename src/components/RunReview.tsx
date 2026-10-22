import { useState } from "react";
import { ArrowLeft, Check, ShieldCheck, TriangleAlert } from "lucide-react";
import type { SavedAnalysis } from "../model/engine";
import { sourceSignature } from "../model/engine";
import type { SavedShipment, Destination } from "../domain";
import type { WorkspaceRepository } from "../data/localRepository";
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
  execute: <T>(action: () => T) => T;
  onBack: () => void;
  onConfirmed: () => void;
}) {
  const [error, setError] = useState("");
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
                Saving a local plan records your selection only. Capacity is not
                reserved. No partner is contacted, no email is sent, and this is
                not a food-safety assessment. Cloud transactions and live
                notifications are later phases.
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
              The repository rechecks current source versions before accepting a
              local plan. Web Storage is not an atomic multi-user reservation
              system.
            </p>
            <button
              className="button"
              disabled={!candidate.feasible || stale}
              onClick={() => {
                try {
                  execute(() =>
                    repository.confirmAnalysis(run.id, candidate.id),
                  );
                  onConfirmed();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <Check size={16} />
              Save local plan
            </button>
          </section>
        </div>
      )}
    </>
  );
}
