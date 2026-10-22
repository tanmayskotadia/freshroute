import { useCloud } from "../cloud/CloudRuntime";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FlaskConical,
  RotateCcw,
  Save,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { SavedShipment, Destination, Produce } from "../domain";
import { formatIST } from "../domain";
import {
  analyze,
  defaultOptions,
  makeInput,
  sourceSignature,
  PRIORITIES,
} from "../model/engine";
import type {
  AnalysisOptions,
  AnalysisResult,
  CandidateResult,
  SavedAnalysis,
} from "../model/engine";
import { PROFILES } from "../model/parameters";
import type {
  WorkspaceRepository,
  ExecuteAction,
} from "../data/localRepository";
import { Dialog } from "./Dialog";
export const rupees = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
export const number = (value: number, digits = 1) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(
    value,
  );
export const hours = (value: number) => `${number(value, 2)}h`;
export const arrival = (c: CandidateResult) =>
  `${c.arrivalTime} IST${c.arrivalDayOffset ? ` (D${c.arrivalDayOffset > 0 ? "+" : ""}${c.arrivalDayOffset})` : ""}`;
const colors = [
  "#527d52",
  "#ae8057",
  "#6b8eaa",
  "#a39755",
  "#896a8f",
  "#588d83",
];
function Curves({ result }: { result: AnalysisResult }) {
  const maxHours = Math.max(...result.candidates.map((c) => c.futureHours));
  return (
    <div className="computed-chart">
      <svg
        viewBox="0 0 700 265"
        role="img"
        aria-label="Calculated mean quality curves. Each line stops at its own modeled arrival; a text comparison table follows."
      >
        {[0, 25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line
              x1="43"
              x2="674"
              y1={220 - value * 1.9}
              y2={220 - value * 1.9}
              stroke="#e5ebde"
              strokeDasharray="4 4"
            />
            <text x="8" y={224 - value * 1.9}>
              {value}
            </text>
          </g>
        ))}
        {result.candidates.map((c, i) => (
          <g key={c.id}>
            <path
              d={c.curve
                .map(
                  (p, j) =>
                    `${j ? "L" : "M"}${43 + (p.hour / maxHours) * 630},${220 - p.quality * 1.9}`,
                )
                .join(" ")}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth={c.rank === 1 ? 3.5 : 2}
              strokeDasharray={c.feasible ? undefined : "5 4"}
            />
            <circle
              cx={43 + (c.futureHours / maxHours) * 630}
              cy={220 - c.qualityIndex * 1.9}
              r="3"
              fill={colors[i % colors.length]}
            />
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text
            key={f}
            x={43 + f * 630}
            y="249"
            textAnchor={f === 1 ? "end" : "start"}
          >
            {number(maxHours * f)}h
          </text>
        ))}
      </svg>
      <div className="computed-legend">
        {result.candidates.map((c, i) => (
          <span key={c.id}>
            <i style={{ background: colors[i % colors.length] }} />
            {c.kind === "reroute" ? c.destinationName : c.name}
          </span>
        ))}
      </div>
      <p className="fine-print">
        Hours from the analysis point · mean quality /100 · dashed = infeasible.
        Curves end at arrival, not at a shared arbitrary time.
      </p>
    </div>
  );
}
type Props = {
  shipment: SavedShipment;
  destinations: Destination[];
  shipments: SavedShipment[];
  saved?: SavedAnalysis;
  repository: WorkspaceRepository;
  execute: ExecuteAction;
  onBack: () => void;
  onShipment: (id: string) => void;
  onOpen: (id: string, candidate?: string) => void;
  onReview: (id: string, candidate: string) => void;
};
export function RescueWorkspace({
  shipment,
  destinations,
  shipments,
  saved,
  repository,
  execute,
  onBack,
  onShipment,
  onOpen,
  onReview,
}: Props) {
  const { cloud } = useCloud();
  const [options, setOptions] = useState<AnalysisOptions>(() =>
    saved ? structuredClone(saved.input.options) : defaultOptions(shipment),
  );
  const [selected, setSelected] = useState(
    new URLSearchParams(window.location.search).get("candidate") || "",
  );
  const [name, setName] = useState(`${shipment.id} rescue comparison`);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [explain, setExplain] = useState(false);
  const profile =
    saved?.input.parameters || PROFILES[shipment.produce as Produce];
  const calculation = useMemo(() => {
    try {
      return {
        result:
          saved?.result || analyze(makeInput(shipment, destinations, options)),
        error: "",
      };
    } catch (e) {
      return { result: null, error: (e as Error).message };
    }
  }, [shipment, destinations, options, saved]);
  const result = calculation.result;
  const winner = result?.candidates.find((c) => c.id === result.winnerId);
  const chosen =
    result?.candidates.find((c) => c.id === selected) ||
    winner ||
    result?.candidates[0];
  const stale =
    !!saved &&
    sourceSignature(shipment, destinations) !==
      sourceSignature(saved.input.shipment, saved.input.destinations);
  const shownShipment = saved?.input.shipment || shipment;
  const setNumber = (
    key: "budgetPaise" | "additionalDelayHours" | "futureTemperatureC",
    value: string,
    scale = 1,
  ) =>
    setOptions((o) => ({
      ...o,
      [key]:
        value === ""
          ? NaN
          : scale === 100
            ? Math.round(Number(value) * 100)
            : Number(value) * scale,
    }));
  const save = async () => {
    setSaving(true);
    try {
      const run = await execute(() =>
        repository.saveAnalysis(
          shipment.id,
          options,
          name,
          sourceSignature(shipment, destinations),
        ),
      );
      onOpen(run.id, chosen?.id);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const shown = (value: number) => (Number.isFinite(value) ? value : "");
  return (
    <>
      <button className="text-button back" onClick={onBack}>
        <ArrowLeft size={15} />
        {saved ? "Back to history" : `Back to ${shipment.id}`}
      </button>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {saved ? "IMMUTABLE SAVED ANALYSIS" : "EXPLORE BEFORE YOU DECIDE"}
          </div>
          <h1>{saved ? saved.name : "A better next move starts here."}</h1>
          <p>
            {shownShipment.icon} {shownShipment.produce} ·{" "}
            {shownShipment.quantity} kg · {shownShipment.id} · {profile.version}
          </p>
        </div>
        {saved ? (
          <button
            className="button secondary"
            onClick={() => onShipment(saved.shipmentId)}
          >
            New analysis on current data <ArrowRight size={16} />
          </button>
        ) : (
          <button
            className="button secondary"
            disabled={!result}
            onClick={() => setExplain(true)}
          >
            <Sparkles size={16} />
            Explain the calculation
          </button>
        )}
      </div>
      {stale && (
        <div className="notice amber">
          <TriangleAlert size={18} />
          <p>
            Shipment or receiving rules changed after this run. These historical
            results remain unchanged. Create a new analysis before choosing a
            local plan.
          </p>
        </div>
      )}
      {saved && (
        <div className="saved-analysis-banner">
          <CheckCircle2 size={18} />
          <div>
            <strong>Saved {formatIST(saved.createdAt)} IST</strong>
            <p>
              {saved.id} · shipment version {saved.shipmentVersion}. Controls
              and route assumptions below show the frozen input snapshot.
            </p>
          </div>
          <button className="text-button" onClick={() => setExplain(true)}>
            Explain saved result <Sparkles size={15} />
          </button>
        </div>
      )}
      <div className="lab-grid computed-lab">
        <section className="panel lab-controls">
          <div className="panel-title">
            <div>
              <h2>{saved ? "Saved assumptions" : "What if…"}</h2>
              <p>
                {saved ? "Read-only snapshot." : "Adjust future conditions."}
              </p>
            </div>
          </div>
          {!saved && (
            <div className="analysis-shipment-picker">
              <label className="field-label" htmlFor="analysis-shipment">
                Shipment
              </label>
              <select
                id="analysis-shipment"
                value={shipment.id}
                onChange={(e) => onShipment(e.target.value)}
              >
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.produce}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="range-label" htmlFor="model-delay">
            Additional future delay{" "}
            <strong>{number(options.additionalDelayHours)}h</strong>
          </label>
          <input
            id="model-delay"
            type="range"
            min="0"
            max="48"
            step=".5"
            value={options.additionalDelayHours}
            disabled={!!saved}
            onInput={(e) =>
              setNumber("additionalDelayHours", e.currentTarget.value)
            }
          />
          <div className="range-ends">
            <span>0 hours</span>
            <span>48 hours</span>
          </div>
          <label className="range-label" htmlFor="model-temperature">
            Future temperature{" "}
            <strong>{number(options.futureTemperatureC)}°C</strong>
          </label>
          <input
            id="model-temperature"
            type="range"
            min={profile.minimumC}
            max={profile.maximumC}
            step=".5"
            value={options.futureTemperatureC}
            disabled={!!saved}
            onInput={(e) =>
              setNumber("futureTemperatureC", e.currentTarget.value)
            }
          />
          <div className="range-ends">
            <span>{profile.minimumC}°C</span>
            <span>{profile.maximumC}°C</span>
          </div>
          <label className="field-label" htmlFor="model-budget">
            Rescue budget (₹)
          </label>
          <input
            className="budget-input"
            id="model-budget"
            type="number"
            min="0"
            max="10000"
            step=".01"
            value={shown(options.budgetPaise / 100)}
            disabled={!!saved}
            onChange={(e) => setNumber("budgetPaise", e.target.value, 100)}
          />
          <div className="analysis-priority">
            <label className="field-label" htmlFor="model-priority">
              Ranking priority
            </label>
            <select
              id="model-priority"
              disabled={!!saved}
              value={
                Object.entries(PRIORITIES).find(
                  ([, w]) =>
                    w.loss === options.weights.loss &&
                    w.cost === options.weights.cost &&
                    w.time === options.weights.time,
                )?.[0] || "custom"
              }
              onChange={(e) => {
                const weights = PRIORITIES[e.target.value];
                if (weights)
                  setOptions((o) => ({ ...o, weights: { ...weights } }));
              }}
            >
              <option value="quality">Preserve quality</option>
              <option value="cost">Reduce extra cost</option>
              <option value="speed">Arrive sooner</option>
              <option value="custom" disabled>
                Custom (edit percentages)
              </option>
            </select>
            <div className="weight-inputs">
              {(["loss", "cost", "time"] as const).map((key) => (
                <label key={key}>
                  {key} %
                  <input
                    aria-label={`${key} priority percent`}
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    disabled={!!saved}
                    value={shown(
                      Math.round(options.weights[key] * 10000) / 100,
                    )}
                    onChange={(e) =>
                      setOptions((o) => ({
                        ...o,
                        weights: {
                          ...o.weights,
                          [key]:
                            e.target.value === ""
                              ? NaN
                              : Number(e.target.value) / 100,
                        },
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <p className="fine-print">
              Weights must total 100%. Lower weighted score ranks first.
            </p>
          </div>
          <p className="fine-print">
            History is already elapsed. Remaining planned travel is{" "}
            {hours(shownShipment.plannedTravelHours)}; future delay is added
            once. Cooling only changes future exposure.
          </p>
          {!saved && (
            <button
              className="text-button reset-button"
              onClick={() => {
                setOptions(defaultOptions(shipment));
                setMessage("");
                setSelected("");
              }}
            >
              <RotateCcw size={14} />
              Use saved shipment inputs
            </button>
          )}
        </section>
        <div className="lab-results">
          {(calculation.error || message) && (
            <div className="notice amber" role="alert">
              <TriangleAlert size={18} />
              <p>{calculation.error || message}</p>
            </div>
          )}
          {result && (
            <>
              <div className="results-meta">
                <span className={`badge ${saved ? "blue" : "green"}`}>
                  <span className="dot" />
                  {saved ? "Saved calculation" : "Calculated local preview"}
                </span>
                <span>
                  Illustrative estimates · not food-safety probabilities
                </span>
              </div>
              <div className="analysis-summary">
                <div>
                  <small>Current modeled quality</small>
                  <strong>{number(result.currentQuality)}/100</strong>
                </div>
                <div>
                  <small>Original-route quantity below threshold</small>
                  <strong>
                    {number(result.candidates[0].estimatedLossKg)} kg
                  </strong>
                </div>
                <div>
                  <small>Feasible alternatives</small>
                  <strong>
                    {result.ranking.length} / {result.candidates.length}
                  </strong>
                </div>
              </div>
              {!winner && (
                <div className="notice amber no-feasible">
                  <TriangleAlert size={20} />
                  <div>
                    <h3>No feasible option under these assumptions.</h3>
                    <p>
                      Inspect the rejection reasons. Changing budget alone
                      cannot fix unavailable capacity, closed receiving hours or
                      already lost quality.
                    </p>
                  </div>
                </div>
              )}
              <div className="candidate-grid computed-candidates">
                {[...result.candidates]
                  .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
                  .map((c, i) => (
                    <button
                      key={c.id}
                      className={`candidate-card ${chosen?.id === c.id ? "selected" : ""} ${!c.feasible ? "unavailable" : ""}`}
                      aria-pressed={chosen?.id === c.id}
                      onClick={() => setSelected(c.id)}
                    >
                      <div className="candidate-top">
                        <span className="candidate-number">
                          {c.rank ? `RANK ${c.rank}` : "NOT FEASIBLE"}
                        </span>
                        <span className="radio-circle">
                          {chosen?.id === c.id && <span />}
                        </span>
                      </div>
                      <small>
                        {c.kind === "reroute"
                          ? "Alternative destination"
                          : c.kind === "cooling"
                            ? "Future temperature intervention"
                            : "Original route"}
                      </small>
                      <h3>{c.name}</h3>
                      {c.rank === 1 && (
                        <span className="recommended">BEST FEASIBLE SCORE</span>
                      )}
                      <div className="candidate-quality">
                        {number(c.qualityIndex)}
                        <small>/100</small>
                      </div>
                      <p>Modeled mean quality at arrival</p>
                      <div className="quality-bar">
                        <span style={{ width: `${c.qualityIndex}%` }} />
                      </div>
                      <div className="candidate-data">
                        <span>
                          Extra cost<strong>{rupees(c.costPaise)}</strong>
                        </span>
                        <span>
                          Future time<strong>{hours(c.futureHours)}</strong>
                        </span>
                      </div>
                      <div className="candidate-loss">
                        <span>
                          Below threshold{" "}
                          <strong>{number(c.estimatedLossKg)} kg</strong>
                        </span>
                        <span>
                          Arrival <strong>{arrival(c)}</strong>
                        </span>
                      </div>
                      <div
                        className={`feasibility ${c.feasible ? "" : "over-budget"}`}
                      >
                        {c.feasible ? (
                          <Check size={14} />
                        ) : (
                          <TriangleAlert size={14} />
                        )}{" "}
                        {c.feasible
                          ? `Score ${c.score.toFixed(4)}`
                          : `${c.reasons.length} constraint${c.reasons.length === 1 ? "" : "s"} failed`}
                      </div>
                    </button>
                  ))}
              </div>
              <section className="panel quality-panel">
                <div className="panel-title">
                  <div>
                    <h2>One shipment. Calculated possibilities.</h2>
                    <p>
                      Curves share the same past exposure and stop at each
                      option’s arrival.
                    </p>
                  </div>
                </div>
                <Curves result={result} />
              </section>
              <section className="panel calculation-detail">
                <h2>{chosen?.name}</h2>
                {chosen && (
                  <>
                    <p>
                      {chosen.destinationName} · {arrival(chosen)} ·{" "}
                      {hours(chosen.futureHours)} future exposure at{" "}
                      {number(chosen.futureTemperatureC)}°C
                    </p>
                    {chosen.reasons.length > 0 ? (
                      <ul className="reason-list">
                        {chosen.reasons.map((reason) => (
                          <li key={reason}>
                            <TriangleAlert size={15} />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="notice blue">
                        <CheckCircle2 size={17} />
                        <p>
                          This option meets the entered budget, produce,
                          capacity, daily receiving-hour and mean-quality
                          constraints. That is not a booking or food-safety
                          certification.
                        </p>
                      </div>
                    )}
                    <div className="economic-metrics">
                      <span>
                        Modeled loss avoided vs original
                        <strong>{number(chosen.avoidedLossKg)} kg</strong>
                      </span>
                      <span>
                        Net modeled benefit
                        <strong>{rupees(chosen.netBenefitPaise)}</strong>
                      </span>
                      <span>
                        Deterioration index
                        <strong>{number(chosen.deteriorationIndex)}/100</strong>
                      </span>
                    </div>
                    <p className="fine-print">
                      Negative avoided loss means this option is worse than the
                      original route. Net modeled benefit subtracts intervention
                      cost from the illustrative avoided-loss value. It is not
                      realized profit.
                    </p>
                  </>
                )}
              </section>
              {winner && (
                <section className="winner-explanation">
                  <Sparkles size={19} />
                  <div>
                    <h3>
                      Why{" "}
                      {winner.kind === "reroute"
                        ? winner.destinationName
                        : winner.name}{" "}
                      ranks first
                    </h3>
                    <p>
                      It has the lowest weighted score (
                      {winner.score.toFixed(4)}) among {result.ranking.length}{" "}
                      feasible options: {number(winner.estimatedLossKg)} kg
                      below threshold, {rupees(winner.costPaise)} extra cost and{" "}
                      {hours(winner.futureHours)} until arrival. Ranking follows
                      your selected priorities, not a global route optimum.
                    </p>
                    <small>
                      Deterministic explanation from calculated results · no LLM
                      connected
                    </small>
                  </div>
                </section>
              )}
              <section className="panel full-comparison">
                <div className="panel-title">
                  <h2>All trade-offs, side by side</h2>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Quality</th>
                        <th>Below threshold</th>
                        <th>Extra cost</th>
                        <th>Arrival (IST)</th>
                        <th>Score / state</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.candidates.map((c) => (
                        <tr key={c.id}>
                          <td>{c.name}</td>
                          <td>{number(c.qualityIndex)}/100</td>
                          <td>{number(c.estimatedLossKg)} kg</td>
                          <td>{rupees(c.costPaise)}</td>
                          <td>{arrival(c)}</td>
                          <td>
                            {c.feasible ? c.score.toFixed(4) : "Infeasible"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              {saved ? (
                <div className="selection-strip">
                  <div>
                    <CheckCircle2 size={21} />
                    <p>Review a feasible option from this saved analysis.</p>
                  </div>
                  <button
                    className="button"
                    disabled={!chosen?.feasible || stale}
                    onClick={() => chosen && onReview(saved.id, chosen.id)}
                  >
                    Review {cloud ? "cloud" : "local"} plan{" "}
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="save-analysis panel">
                  <label className="field-label" htmlFor="analysis-name">
                    Analysis name
                  </label>
                  <input
                    id="analysis-name"
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <div>
                    <p>
                      Save inputs, parameter version and results together before
                      reviewing a local plan.
                    </p>
                    <button className="button" onClick={save} disabled={saving}>
                      <Save size={16} />
                      {saving
                        ? "Running cloud workflow..."
                        : cloud
                          ? "Run cloud analysis"
                          : "Save analysis"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <details className="panel model-assumptions">
        <summary>Model assumptions, route inputs and limitations</summary>
        <div className="assumptions-content">
          <h3>Illustrative exponential quality model</h3>
          <p>
            Equivalent age = Σ hours × Q10^((temperature − reference)/10). Each
            cohort’s quality = min(100, starting quality × multiplier) ×
            exp(−decay × equivalent age). Quantity below threshold is the sum of
            below-threshold cohort weights × shipment kg.
          </p>
          <p>
            Reference {profile.referenceC}°C · Q10 {profile.q10} · decay{" "}
            {profile.decayPerHour}/hour · minimum mean/cohort threshold{" "}
            {profile.minimumQuality}/100 · cooling target {profile.coolingC}°C ·
            cooling cost {rupees(profile.coolingCostPaise)}. Normalization
            scales: {rupees(profile.costScalePaise)} cost,{" "}
            {profile.timeScaleHours} hours, shipment quantity for loss.
          </p>
          <p>
            Starting quality applies at the beginning of entered history.
            Cohorts:{" "}
            {profile.cohorts
              .map((c) => `${number(c.weight * 100)}% at ×${c.multiplier}`)
              .join("; ")}
            . A risk/index score is never multiplied by shipment mass. Threshold
            crossings make the mass estimate stepwise.
          </p>
          <h3>Declared route assumptions</h3>
          <p>
            These are fictional remaining travel times from the analysis
            checkpoint, not GPS routes. Arrival = entered planned arrival +
            (candidate future time − remaining planned travel). D±N is relative
            to the entered planned-arrival day; receiving hours repeat daily.
            Future time = route travel + additional delay × delay share. A
            reroute can bypass part of a route-specific delay only because the
            assumption explicitly says so.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Destination</th>
                  <th>Remaining travel (h)</th>
                  <th>Delay share (%)</th>
                  <th>Extra cost (₹)</th>
                </tr>
              </thead>
              <tbody>
                {options.routes.map((route, index) => (
                  <tr key={route.destinationId}>
                    <td>
                      {(saved?.input.destinations || destinations).find(
                        (d) => d.id === route.destinationId,
                      )?.name || route.destinationId}
                      {route.destinationId === shownShipment.destinationId
                        ? " (original route; reroute row unused)"
                        : ""}
                    </td>
                    {(["travelHours", "delayShare", "costPaise"] as const).map(
                      (key) => (
                        <td key={key}>
                          <input
                            aria-label={`${route.destinationId} ${key}`}
                            type="number"
                            step={key === "costPaise" ? ".01" : ".1"}
                            disabled={!!saved}
                            value={shown(
                              route[key] *
                                (key === "delayShare"
                                  ? 100
                                  : key === "costPaise"
                                    ? 0.01
                                    : 1),
                            )}
                            onChange={(e) =>
                              setOptions((o) => ({
                                ...o,
                                routes: o.routes.map((r, i) =>
                                  i === index
                                    ? {
                                        ...r,
                                        [key]:
                                          e.target.value === ""
                                            ? NaN
                                            : key === "costPaise"
                                              ? Math.round(
                                                  Number(e.target.value) * 100,
                                                )
                                              : Number(e.target.value) *
                                                (key === "delayShare"
                                                  ? 0.01
                                                  : 1),
                                      }
                                    : r,
                                ),
                              }))
                            }
                          />
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result?.skippedDestinations.length ? (
            <p>
              Not modeled (no route assumption):{" "}
              {result.skippedDestinations.join(", ")}.
            </p>
          ) : null}
          <p>
            All parameters are teaching assumptions, not fitted scientific data.
            This model omits chilling injury, humidity, microbial safety,
            traffic and partner confirmation. Supported temperature bounds do
            not certify safe food. Lower temperatures are modeled as slowing
            decay only within this declared domain. Historical results remain
            estimates.
          </p>
          <p>
            Ties resolve by lower modeled loss, lower intervention cost, shorter
            future time, then stable candidate ID. Scores use fixed scales and
            are not probabilities or percentages.
          </p>
        </div>
      </details>
      {explain && (
        <Dialog
          title="Explain this calculation"
          onClose={() => setExplain(false)}
        >
          <span className="badge blue">Calculated template · no live AI</span>
          <h3 className="explanation-title">
            {winner
              ? "The numbers behind the first-ranked option"
              : "Why no option is recommended"}
          </h3>
          <p className="dialog-intro">
            {winner
              ? `${winner.name} meets all entered constraints and ranks first at score ${winner.score.toFixed(4)}. It is estimated to have ${number(winner.estimatedLossKg)} kg below the quality threshold, cost ${rupees(winner.costPaise)} extra and arrive in ${hours(winner.futureHours)}.`
              : "Every candidate violates at least one declared constraint. The system does not fabricate a feasible rescue. Review each rejection reason and adjust only assumptions you can justify."}
          </p>
          <p className="fine-print">
            Loss weight {number(options.weights.loss * 100)}%, cost{" "}
            {number(options.weights.cost * 100)}%, time{" "}
            {number(options.weights.time * 100)}%. These are heuristic quality
            estimates. A future LLM will explain these stored values rather than
            generate new numerical results.
          </p>
        </Dialog>
      )}
    </>
  );
}
