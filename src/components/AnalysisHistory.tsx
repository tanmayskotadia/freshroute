import { useState } from "react";
import { ArrowRight, FlaskConical, History } from "lucide-react";
import type { SavedAnalysis } from "../model/engine";
import type { DemoDecision } from "../fixtures";
import { formatIST } from "../domain";
import { number } from "./RescueWorkspace";
export function AnalysisHistory({
  analyses,
  decisions,
  onOpen,
  onNew,
  onShipment,
}: {
  analyses: SavedAnalysis[];
  decisions: DemoDecision[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onShipment: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = (value: string) => value.toLowerCase().includes(needle);
  const visibleRuns = analyses.filter((r) =>
    matches(`${r.name} ${r.shipmentId} ${r.id} ${r.result.modelVersion}`),
  );
  const visibleDecisions = decisions.filter((d) =>
    matches(`${d.id} ${d.shipmentId} ${d.candidateName} ${d.destination}`),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR REPRODUCIBLE DECISION TRAIL</div>
          <h1>Every comparison has a story.</h1>
          <p>
            Saved inputs, model parameters and results stay together, even when
            current shipment data changes.
          </p>
        </div>
        <button className="button" onClick={onNew}>
          <FlaskConical size={16} />
          New analysis
        </button>
      </div>
      <label className="field-label" htmlFor="history-search">
        Search analyses and plans
      </label>
      <input
        id="history-search"
        className="field-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Name, shipment, destination or run ID"
      />
      {needle && !visibleRuns.length && !visibleDecisions.length && (
        <p role="status">
          No matching analyses or plans.{" "}
          <button className="text-button" onClick={() => setQuery("")}>
            Clear search
          </button>
        </p>
      )}
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Saved analyses</h2>
            <p>
              {analyses.length} local snapshots · stored in this browser, not
              AWS
            </p>
          </div>
        </div>
        {analyses.length === 0 ? (
          <div className="empty-state">
            <History />
            <h2>Your next analysis starts here.</h2>
            <p>
              Compare a shipment and save the result to create an immutable
              snapshot.
            </p>
            <button className="button" onClick={onNew}>
              Open Rescue Lab <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="analysis-history-list">
            {visibleRuns.map((run) => {
              const winner = run.result.candidates.find(
                (c) => c.id === run.result.winnerId,
              );
              return (
                <article key={run.id} className="analysis-history-item">
                  <span className="history-check">
                    <FlaskConical size={20} />
                  </span>
                  <div>
                    <small>
                      {run.shipmentId} · version {run.shipmentVersion} ·{" "}
                      {formatIST(run.createdAt)} IST
                    </small>
                    <h3>{run.name}</h3>
                    <p>
                      {winner
                        ? `${winner.name} · ${number(winner.estimatedLossKg)} kg estimated below threshold`
                        : "No feasible option under saved constraints"}
                    </p>
                    <small>{run.result.modelVersion}</small>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => onOpen(run.id)}
                  >
                    Open analysis <ArrowRight size={15} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {decisions.length > 0 && (
        <section className="panel local-plan-history">
          <div className="panel-title">
            <div>
              <h2>Local plans and earlier demo decisions</h2>
              <p>
                Selections only: no reservation, partner booking or email
                delivery.
              </p>
            </div>
          </div>
          {visibleDecisions.map((d) => (
            <article className="history-card" key={d.id}>
              <div>
                <small>
                  {d.id} · {d.shipmentId} · {formatIST(d.createdAt)} IST
                </small>
                <h3>{d.candidateName}</h3>
                <p>
                  {d.quantity} kg → {d.destination}
                </p>
                <small>
                  {d.runId
                    ? `Calculated plan · ${d.modelVersion}`
                    : "Legacy Phase 1–2 static sample"}
                </small>
              </div>
              <button
                className="text-button"
                onClick={() =>
                  d.runId ? onOpen(d.runId) : onShipment(d.shipmentId)
                }
              >
                {d.runId ? "Open source analysis" : "Open shipment"}{" "}
                <ArrowRight size={14} />
              </button>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
