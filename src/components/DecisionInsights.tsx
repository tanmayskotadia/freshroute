import { useState, useMemo } from "react";
import {
  Sparkles,
  ArrowRight,
  GitBranch,
  ShieldCheck,
  Download,
  FlaskConical,
} from "lucide-react";
import type { SavedAnalysis, AnalysisOptions } from "../model/engine";
import { sensitivity, suggestSplit } from "../model/insights";
import type { CopilotResult } from "../cloud/copilotTypes";
import { useCloud } from "../cloud/CloudRuntime";
import { cloudRequest } from "../cloud/api";
export function DecisionInsights({
  run,
  onDraft,
  onReserved,
}: {
  run: SavedAnalysis;
  onDraft: (options: AnalysisOptions) => void;
  onReserved: () => void;
}) {
  const { cloud, config, repository } = useCloud(),
    [tab, setTab] = useState("copilot"),
    [question, setQuestion] = useState(
      "Explain the strongest trade-off in this saved analysis.",
    ),
    [answer, setAnswer] = useState<CopilotResult | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [review, setReview] = useState(false);
  const rows = useMemo(() => sensitivity(run), [run]);
  const plan = useMemo(() => {
    try {
      return suggestSplit(run);
    } catch {
      return undefined;
    }
  }, [run]);
  async function ask(mode: CopilotResult["mode"]) {
    if (!config || !cloud) return;
    setBusy(mode);
    setError("");
    setAnswer(null);
    try {
      setAnswer(
        await cloudRequest<CopilotResult>(config, "/v1/copilot", {
          runId: run.id,
          mode,
          question,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function download() {
    if (!answer) return;
    const text = `FreshRoute rescue brief\n${run.id}\nSource: ${answer.provenance === "AI" ? "AI-generated evidence" : "Deterministic model"}${answer.cached ? " (cached)" : ""}\n\n${answer.summary}\n\n${answer.facts.map((f) => `${f.label}: ${f.value}`).join("\n\n")}\n\nIllustrative model output; not food-safety certification.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" })),
      a = document.createElement("a");
    a.href = url;
    a.download = `${run.id}-brief.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="panel decision-insights">
      <div className="insights-heading">
        <div>
          <span className="eyebrow">LOOK BEYOND THE FIRST ANSWER</span>
          <h2>Decision studio</h2>
          <p>Grounded evidence, sensitivity and shared-capacity split plans.</p>
        </div>
        <Sparkles size={27} />
      </div>
      <div
        className="studio-tabs"
        role="group"
        aria-label="Decision studio tools"
      >
        {[
          ["copilot", "Rescue copilot"],
          ["sensitivity", "Delay sensitivity"],
          ["split", "Split allocation"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <div className="notice amber" role="alert">
          <p>{error}</p>
        </div>
      )}
      {tab === "copilot" && (
        <div className="copilot-layout">
          <div>
            <h3>A second perspective. The same evidence.</h3>
            <p>
              The copilot curates saved facts and can draft future assumptions.
              Every displayed number comes from the model, and every draft needs
              your review.
            </p>
            <label className="field-label" htmlFor="copilot-question">
              Ask about this saved run
            </label>
            <textarea
              id="copilot-question"
              rows={3}
              maxLength={500}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What if the delay becomes 2 hours and the budget is INR 900?"
            />
            <div className="copilot-presets">
              {[
                "Explain the receiving constraints.",
                "Summarize a handover brief.",
                "What if the delay is 2 hours and budget is INR 900?",
              ].map((q) => (
                <button key={q} onClick={() => setQuestion(q)}>
                  {q}
                </button>
              ))}
            </div>
            <div className="studio-actions">
              <button
                className="button"
                disabled={!!busy || !cloud}
                onClick={() => void ask("explain")}
              >
                <Sparkles size={16} />
                {busy ? "Preparing..." : "Explain result"}
              </button>
              <button
                className="button secondary"
                disabled={!!busy || !cloud}
                onClick={() => void ask("brief")}
              >
                Rescue brief
              </button>
              <button
                className="text-button"
                disabled={!!busy || !cloud}
                onClick={() => void ask("draft")}
              >
                Draft what-if <ArrowRight size={14} />
              </button>
            </div>
            {!cloud && (
              <p className="fine-print">
                Sign in to AWS for the copilot. Sensitivity and split previews
                work locally.
              </p>
            )}
            <div className="studio-boundary">
              <ShieldCheck size={17} />
              <span>
                Read-only AI · bounded requests · no automatic bookings
              </span>
            </div>
          </div>
          <aside className="copilot-response">
            {answer ? (
              <>
                <span
                  className={`badge ${answer.provenance === "AI" ? "green" : "amber"}`}
                >
                  {answer.provenance === "AI"
                    ? "AI-generated evidence"
                    : "Deterministic fallback"}
                  {answer.cached ? " · cached" : ""}
                </span>
                <h3>{answer.summary}</h3>
                {answer.reason && (
                  <p className="fine-print">
                    AI response unavailable:{" "}
                    {answer.reason.replaceAll("_", " ").toLowerCase()}. Your
                    saved analysis is unchanged.
                  </p>
                )}
                <div className="copilot-facts">
                  {answer.facts.map((f) => (
                    <div key={f.id}>
                      <strong>{f.label}</strong>
                      <p>{f.value}</p>
                      <small>
                        Source: {run.id} / {f.id}
                      </small>
                    </div>
                  ))}
                </div>
                {answer.draft && (
                  <div className="scenario-draft">
                    <h4>Review proposed assumptions</h4>
                    {Object.entries(answer.draft).map(([key, value]) => (
                      <p key={key}>
                        {key}:{" "}
                        <strong>
                          {key === "budgetPaise"
                            ? `INR ${(value as number) / 100}`
                            : String(value)}
                        </strong>
                      </p>
                    ))}
                    <button
                      className="button"
                      onClick={() =>
                        onDraft({ ...run.input.options, ...answer.draft })
                      }
                    >
                      Open new scenario <ArrowRight size={15} />
                    </button>
                    <small>
                      This changes an editable scenario only. Save analysis
                      separately.
                    </small>
                  </div>
                )}
                <button className="text-button" onClick={download}>
                  <Download size={14} />
                  Download brief
                </button>
                {answer.usage && (
                  <p className="fine-print">
                    {answer.usage.inputTokens} input /{" "}
                    {answer.usage.outputTokens} output tokens
                  </p>
                )}
              </>
            ) : (
              <div className="copilot-empty">
                <Sparkles size={31} />
                <h3>Evidence, with context.</h3>
                <p>
                  Choose a question to request a grounded brief. If the AI
                  service cannot respond, a clearly labelled model summary
                  remains available.
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
      {tab === "sensitivity" && (
        <>
          <div className="studio-description">
            <FlaskConical size={20} />
            <p>
              Change future delay while keeping the saved temperatures, costs
              and receiving rules fixed. These comparisons do not alter the
              saved run.
            </p>
          </div>
          <div className="studio-table-wrap">
            <table className="studio-table">
              <thead>
                <tr>
                  <th>Future delay</th>
                  <th>Best feasible action</th>
                  <th>Quality index</th>
                  <th>Estimated loss</th>
                  <th>Extra cost</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.delta}
                    className={r.delta === 0 ? "studio-baseline" : ""}
                  >
                    <td>
                      {r.delayHours} h {r.delta === 0 && <small>Saved</small>}
                    </td>
                    <td>{r.winner}</td>
                    <td>{r.qualityIndex?.toFixed(1) ?? "—"}</td>
                    <td>
                      {r.estimatedLossKg === null
                        ? "—"
                        : `${r.estimatedLossKg.toFixed(1)} kg`}
                    </td>
                    <td>
                      {r.costPaise === null ? "—" : `INR ${r.costPaise / 100}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === "split" && (
        <>
          <div className="studio-description">
            <GitBranch size={20} />
            <p>
              Explore a bounded plan across two or three destinations. Each
              route has its own fixed trip cost. The combined budget, whole
              shipment mass and receiving constraints must all fit.
            </p>
          </div>
          {plan?.feasible ? (
            <>
              <div className="split-allocations">
                {plan.parts.map((p) => (
                  <article key={p.destinationId}>
                    <span className="eyebrow">RECEIVING ALLOCATION</span>
                    <h3>{p.quantityGrams / 1000} kg</h3>
                    <strong>{p.destination}</strong>
                    <p>
                      Quality index {p.qualityIndex.toFixed(1)} · estimated loss{" "}
                      {p.estimatedLossKg.toFixed(1)} kg
                    </p>
                    <small>Extra cost INR {p.costPaise / 100}</small>
                  </article>
                ))}
              </div>
              <div className="split-total">
                <strong>
                  {plan.totalGrams / 1000} kg allocated · 0 kg unallocated
                </strong>
                <span>
                  Combined extra cost INR {plan.costPaise / 100} · estimated
                  loss {plan.estimatedLossKg.toFixed(1)} kg
                </span>
              </div>
              {review ? (
                <div className="notice">
                  <div>
                    <p>
                      Reserve all listed allocations together? Shared capacities
                      and source versions will be checked again. This holds
                      receiving space until cancellation or delivery.
                    </p>
                    <div className="studio-actions">
                      <button
                        className="button"
                        disabled={!!busy}
                        onClick={async () => {
                          if (!config || !plan?.feasible) return;
                          setBusy("split");
                          setError("");
                          try {
                            await cloudRequest(config, "/v1/reservations", {
                              runId: run.id,
                              candidateId: "split",
                              allocations: plan.parts.map(
                                ({
                                  candidateId,
                                  destinationId,
                                  quantityGrams,
                                }) => ({
                                  candidateId,
                                  destinationId,
                                  quantityGrams,
                                }),
                              ),
                            });
                            await repository?.refresh();
                            onReserved();
                          } catch (e) {
                            setError((e as Error).message);
                          } finally {
                            setBusy("");
                          }
                        }}
                      >
                        {busy ? "Reserving..." : "Confirm split reservation"}
                      </button>
                      <button
                        className="text-button"
                        onClick={() => setReview(false)}
                      >
                        Keep exploring
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  className="button secondary"
                  disabled={!cloud}
                  onClick={() => setReview(true)}
                >
                  Review split reservation <ArrowRight size={15} />
                </button>
              )}
              {!cloud && (
                <p className="fine-print">
                  Local preview only. AWS sign-in is required to reserve.
                </p>
              )}
              <p className="fine-print">
                This bounded subset planner minimizes modeled loss then cost
                among its tested fill orders; it does not claim a globally
                optimal transport solution.
              </p>
            </>
          ) : (
            <div className="empty-state">
              <h3>No complete split fits these assumptions.</h3>
              <p>
                Capacity, minimum part size, receiving constraints or combined
                cost prevent a complete allocation. Change inputs in a new
                analysis.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
