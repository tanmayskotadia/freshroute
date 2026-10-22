import { useEffect, useState } from "react";
import { BarChart3, Download, ShieldCheck, RefreshCw } from "lucide-react";
import { useCloud } from "./CloudRuntime";
import { cloudRequest } from "./api";
import type { Reservation } from "./reservationTypes";
import { outcomeSummary } from "../model/outcomes";
export function OutcomeAnalytics() {
  const { cloud, config } = useCloud(),
    [rows, setRows] = useState<Reservation[]>([]),
    [error, setError] = useState("");
  async function refresh() {
    if (!cloud || !config) return;
    try {
      setRows(
        (
          await cloudRequest<{ reservations: Reservation[] }>(
            config,
            "/v1/fulfilment",
          )
        ).reservations,
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
  }, [cloud, config]);
  const summary = outcomeSummary(rows);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            SEPARATE ESTIMATES FROM RECORDED OUTCOMES
          </div>
          <h1>Every delivery tells a story.</h1>
          <p>
            Operator-recorded fulfilment, with model estimates clearly
            distinguished.
          </p>
        </div>
        <button className="button secondary" onClick={() => void refresh()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      {error && (
        <div className="notice amber">
          <p>{error}</p>
        </div>
      )}
      {!cloud ? (
        <div className="panel fulfilment-empty">
          <BarChart3 size={32} />
          <h2>Sign in to see cloud outcomes</h2>
          <p>Local plans are not counted as completed deliveries.</p>
        </div>
      ) : (
        <>
          <div className="fulfilment-metrics">
            {[
              ["Recorded delivered mass", `${summary.deliveredKg} kg`],
              ["Delivered shipments", summary.deliveredShipments],
              ["Active allocations", summary.active],
              ["Cancelled plans", summary.cancelled],
            ].map(([label, value]) => (
              <section className="panel" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </section>
            ))}
          </div>
          <div className="outcomes-grid">
            <section className="panel">
              <h2>Delivered produce</h2>
              <p>
                One completed shipment is counted once, including split
                allocations.
              </p>
              {summary.produce.map((p) => (
                <div className="outcome-bar" key={p.name}>
                  <div>
                    <strong>{p.name}</strong>
                    <span>{p.kg} kg</span>
                  </div>
                  <meter
                    min={0}
                    max={Math.max(1, summary.deliveredKg)}
                    value={p.kg}
                    aria-label={`${p.name}: ${p.kg} kg delivered`}
                  />
                </div>
              ))}
              {!summary.produce.length && (
                <p className="fine-print">
                  Record a delivery in Fulfilment to populate this chart.
                </p>
              )}
            </section>
            <section className="panel outcome-estimates">
              <span className="badge amber">ILLUSTRATIVE ESTIMATES</span>
              <h2>{summary.modelEstimatedLossKg.toFixed(1)} kg</h2>
              <p>
                Modeled loss associated with recorded deliveries. This is not
                measured waste.
              </p>
              <h3>INR {(summary.extraCostPaise / 100).toFixed(2)}</h3>
              <p>
                Planned additional costs for those shipments; actual paid costs
                have not been collected.
              </p>
            </section>
          </div>
          <div className="notice">
            <ShieldCheck size={20} />
            <p>
              Delivered quantities are operator assertions. Measured spoilage,
              actual paid costs and verified waste prevented are not collected.
              No savings or food-safety outcomes are inferred from these
              estimates.
            </p>
          </div>
          <button
            className="button secondary"
            onClick={() => {
              const a = document.createElement("a"),
                url = URL.createObjectURL(
                  new Blob(
                    [
                      JSON.stringify(
                        {
                          generatedAt: new Date().toISOString(),
                          recorded: summary,
                          disclaimer:
                            "Operator-recorded deliveries; model estimates are not measured outcomes.",
                        },
                        null,
                        2,
                      ),
                    ],
                    { type: "application/json" },
                  ),
                );
              a.href = url;
              a.download = "freshroute-outcomes.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            <Download size={16} />
            Export outcome data
          </button>
        </>
      )}
    </>
  );
}
