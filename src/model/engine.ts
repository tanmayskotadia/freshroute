import {
  DomainError,
  isOpenAt,
  validateShipment,
  validateDestination,
} from "../domain.ts";
import type {
  SavedShipment,
  Destination,
  Produce,
  Segment,
} from "../domain.ts";
import { PROFILES, ROUTES } from "./parameters.ts";
import type { ModelParameters, RouteAssumption } from "./parameters.ts";
export type Weights = { loss: number; cost: number; time: number };
export type AnalysisOptions = {
  budgetPaise: number;
  additionalDelayHours: number;
  futureTemperatureC: number;
  weights: Weights;
  routes: RouteAssumption[];
};
export type AnalysisInput = {
  shipment: SavedShipment;
  destinations: Destination[];
  options: AnalysisOptions;
  parameters: ModelParameters;
};
export type CandidateResult = {
  id: string;
  kind: "continue" | "cooling" | "reroute";
  name: string;
  destinationId: string;
  destinationName: string;
  destinationVersion: number;
  costPaise: number;
  travelHours: number;
  futureHours: number;
  futureTemperatureC: number;
  delayShare: number;
  arrivalTime: string;
  arrivalDayOffset: number;
  qualityIndex: number;
  deteriorationIndex: number;
  estimatedLossKg: number;
  avoidedLossKg: number;
  netBenefitPaise: number;
  feasible: boolean;
  reasons: string[];
  score: number;
  rank: number | null;
  curve: { hour: number; quality: number }[];
  availableKg: number;
};
export type AnalysisResult = {
  modelVersion: string;
  currentQuality: number;
  equivalentHistoryHours: number;
  baselineId: string;
  winnerId: string | null;
  ranking: string[];
  candidates: CandidateResult[];
  skippedDestinations: string[];
};
export type SavedAnalysis = {
  id: string;
  name: string;
  createdAt: string;
  shipmentId: string;
  shipmentVersion: number;
  input: AnalysisInput;
  result: AnalysisResult;
};
export const PRIORITIES: Record<string, Weights> = {
  quality: { loss: 0.65, cost: 0.2, time: 0.15 },
  cost: { loss: 0.3, cost: 0.6, time: 0.1 },
  speed: { loss: 0.35, cost: 0.15, time: 0.5 },
};
export function defaultOptions(shipment: SavedShipment): AnalysisOptions {
  return {
    budgetPaise: 80000,
    additionalDelayHours: shipment.delay,
    futureTemperatureC: shipment.temperature,
    weights: { ...PRIORITIES.quality },
    routes: structuredClone(ROUTES),
  };
}
const finite = (value: number, min: number, max: number) =>
  Number.isFinite(value) && value >= min && value <= max;
export function validateParameters(p: ModelParameters) {
  if (
    !p ||
    typeof p.version !== "string" ||
    !p.version ||
    !finite(p.referenceC, -5, 45) ||
    !finite(p.q10, 1.01, 5) ||
    !finite(p.decayPerHour, 0.00001, 1) ||
    !finite(p.minimumC, -5, 45) ||
    !finite(p.maximumC, p.minimumC + 0.1, 45) ||
    !finite(p.coolingC, p.minimumC, p.maximumC) ||
    !finite(p.minimumQuality, 0, 100) ||
    !Number.isInteger(p.coolingCostPaise) ||
    !finite(p.coolingCostPaise, 0, 1000000) ||
    !finite(p.costScalePaise, 1, 10000000) ||
    !finite(p.timeScaleHours, 1, 168) ||
    !Array.isArray(p.cohorts) ||
    p.cohorts.length < 1 ||
    p.cohorts.length > 20 ||
    p.cohorts.some(
      (c) => !c || !finite(c.weight, 0, 1) || !finite(c.multiplier, 0, 2),
    ) ||
    Math.abs(p.cohorts.reduce((a, c) => a + c.weight, 0) - 1) > 1e-9
  )
    throw new DomainError(
      "MODEL_PARAMETERS",
      "Model parameter snapshot is invalid.",
    );
}
export function equivalentHours(segments: Segment[], p: ModelParameters) {
  return segments.reduce(
    (total, s) =>
      total +
      s.durationHours * Math.pow(p.q10, (s.temperatureC - p.referenceC) / 10),
    0,
  );
}
export function qualityAt(initial: number, age: number, p: ModelParameters) {
  return Math.min(
    100,
    Math.max(
      0,
      p.cohorts.reduce(
        (sum, c) =>
          sum +
          c.weight *
            Math.min(100, Math.max(0, initial * c.multiplier)) *
            Math.exp(-p.decayPerHour * age),
        0,
      ),
    ),
  );
}
export function lossAt(
  initial: number,
  age: number,
  quantity: number,
  p: ModelParameters,
) {
  return Math.min(
    quantity,
    Math.max(
      0,
      quantity *
        p.cohorts.reduce(
          (sum, c) =>
            sum +
            (Math.min(100, Math.max(0, initial * c.multiplier)) *
              Math.exp(-p.decayPerHour * age) <
            p.minimumQuality
              ? c.weight
              : 0),
          0,
        ),
    ),
  );
}
export function sourceSignature(
  shipment: SavedShipment,
  destinations: Destination[],
) {
  return canonical({
    shipment,
    destinations: [...destinations].sort((a, b) => (a.id < b.id ? -1 : 1)),
  });
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export function arrivalAt(
  eta: string,
  plannedHours: number,
  futureHours: number,
) {
  const [h, m] = eta.split(":").map(Number);
  const minutes = h * 60 + m + Math.round((futureHours - plannedHours) * 60);
  const dayOffset = Math.floor(minutes / 1440);
  const local = ((minutes % 1440) + 1440) % 1440;
  return {
    time: `${String(Math.floor(local / 60)).padStart(2, "0")}:${String(local % 60).padStart(2, "0")}`,
    dayOffset,
  };
}
export function compareCandidates(a: CandidateResult, b: CandidateResult) {
  const score = a.score - b.score;
  if (Math.abs(score) > 1e-12) return score;
  return (
    a.estimatedLossKg - b.estimatedLossKg ||
    a.costPaise - b.costPaise ||
    a.futureHours - b.futureHours ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}
export function analyze(input: AnalysisInput): AnalysisResult {
  const { shipment: s, destinations, options: o, parameters: p } = input;
  validateParameters(p);
  validateShipment(s, destinations);
  destinations.forEach(validateDestination);
  if (p.produce !== s.produce)
    throw new DomainError(
      "MODEL_PARAMETERS",
      "The parameter profile does not match this produce.",
    );
  if (
    s.segments.some(
      (segment) => !finite(segment.temperatureC, p.minimumC, p.maximumC),
    )
  )
    throw new DomainError(
      "MODEL_DOMAIN",
      `The ${s.produce} model supports entered temperatures from ${p.minimumC} to ${p.maximumC}°C. Edit the shipment history before running this illustrative model.`,
    );
  if (
    !o ||
    !Number.isInteger(o.budgetPaise) ||
    !finite(o.budgetPaise, 0, 1000000) ||
    !finite(o.additionalDelayHours, 0, 48) ||
    !finite(o.futureTemperatureC, p.minimumC, p.maximumC)
  )
    throw new DomainError(
      "MODEL_INPUT",
      `Use a budget of ₹0–10,000, delay of 0–48h, and future temperature of ${p.minimumC}–${p.maximumC}°C.`,
    );
  if (
    !o.weights ||
    Object.values(o.weights).length !== 3 ||
    !["loss", "cost", "time"].every((k) =>
      finite(o.weights[k as keyof Weights], 0, 1),
    ) ||
    Math.abs(o.weights.loss + o.weights.cost + o.weights.time - 1) > 1e-9
  )
    throw new DomainError(
      "MODEL_INPUT",
      "Loss, cost and time priorities must total 100%.",
    );
  if (
    !Array.isArray(o.routes) ||
    new Set(o.routes.map((r) => r.destinationId)).size !== o.routes.length ||
    o.routes.some(
      (r) =>
        !r ||
        typeof r.destinationId !== "string" ||
        !finite(r.travelHours, 0.1, 72) ||
        !finite(r.delayShare, 0, 1) ||
        !Number.isInteger(r.costPaise) ||
        !finite(r.costPaise, 0, 1000000),
    )
  )
    throw new DomainError(
      "MODEL_INPUT",
      "Route assumptions need unique destination IDs, 0.1–72 travel hours, a 0–100% delay share and ₹0–10,000 cost.",
    );
  const historyAge = equivalentHours(s.segments, p);
  const baselineHours = s.plannedTravelHours + o.additionalDelayHours;
  const baselineAge =
    historyAge +
    equivalentHours(
      [{ durationHours: baselineHours, temperatureC: o.futureTemperatureC }],
      p,
    );
  const baselineLoss = lossAt(s.initialQuality, baselineAge, s.quantity, p);
  const result: CandidateResult[] = [];
  function candidate(
    id: string,
    kind: CandidateResult["kind"],
    name: string,
    destination: Destination,
    travelHours: number,
    delayShare: number,
    costPaise: number,
    futureTemperatureC: number,
  ) {
    const futureHours = travelHours + o.additionalDelayHours * delayShare;
    const age =
      historyAge +
      equivalentHours(
        [{ durationHours: futureHours, temperatureC: futureTemperatureC }],
        p,
      );
    const qualityIndex = qualityAt(s.initialQuality, age, p),
      estimatedLossKg = lossAt(s.initialQuality, age, s.quantity, p);
    const arrival = arrivalAt(s.eta, s.plannedTravelHours, futureHours),
      availableKg = destination.capacity - destination.reservedKg;
    const reasons: string[] = [];
    if (costPaise > o.budgetPaise)
      reasons.push(
        `Over budget by ₹${((costPaise - o.budgetPaise) / 100).toFixed(2)}.`,
      );
    if (!destination.acceptedProduce.includes(s.produce as Produce))
      reasons.push(
        `${destination.name} does not accept ${s.produce.toLowerCase()}.`,
      );
    if (availableKg < s.quantity)
      reasons.push(
        `Needs ${s.quantity} kg capacity; only ${availableKg} kg is entered as available.`,
      );
    if (!isOpenAt(destination, arrival.time))
      reasons.push(
        `Arrival ${arrival.time} IST is outside ${destination.opensAt}–${destination.closesAt} (daily).`,
      );
    if (qualityIndex < p.minimumQuality)
      reasons.push(
        `Mean modeled quality ${qualityIndex.toFixed(1)} is below the declared ${p.minimumQuality}/100 threshold.`,
      );
    const avoidedLossKg = baselineLoss - estimatedLossKg;
    const score =
      o.weights.loss * (estimatedLossKg / s.quantity) +
      o.weights.cost * (costPaise / p.costScalePaise) +
      o.weights.time * (futureHours / p.timeScaleHours);
    const curve = Array.from({ length: 13 }, (_, i) => {
      const hour = (futureHours * i) / 12;
      return {
        hour,
        quality: qualityAt(
          s.initialQuality,
          historyAge +
            equivalentHours(
              [{ durationHours: hour, temperatureC: futureTemperatureC }],
              p,
            ),
          p,
        ),
      };
    });
    result.push({
      id,
      kind,
      name,
      destinationId: destination.id,
      destinationName: destination.name,
      destinationVersion: destination.version,
      costPaise,
      travelHours,
      futureHours,
      futureTemperatureC,
      delayShare,
      arrivalTime: arrival.time,
      arrivalDayOffset: arrival.dayOffset,
      qualityIndex,
      deteriorationIndex: 100 - qualityIndex,
      estimatedLossKg,
      avoidedLossKg,
      netBenefitPaise:
        Math.round(avoidedLossKg * s.valuePaisePerKg) - costPaise,
      feasible: reasons.length === 0,
      reasons,
      score,
      rank: null,
      curve,
      availableKg,
    });
  }
  const planned = destinations.find((d) => d.id === s.destinationId)!;
  candidate(
    "continue",
    "continue",
    "Continue as planned",
    planned,
    s.plannedTravelHours,
    1,
    0,
    o.futureTemperatureC,
  );
  candidate(
    "cooling",
    "cooling",
    "Improve cooling",
    planned,
    s.plannedTravelHours,
    1,
    p.coolingCostPaise,
    Math.min(o.futureTemperatureC, p.coolingC),
  );
  const skippedDestinations: string[] = [];
  for (const destination of [...destinations].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  )) {
    if (destination.id === s.destinationId) continue;
    const route = o.routes.find((r) => r.destinationId === destination.id);
    if (!route) {
      skippedDestinations.push(destination.name);
      continue;
    }
    candidate(
      `reroute:${destination.id}`,
      "reroute",
      `Redirect: ${destination.name}`,
      destination,
      route.travelHours,
      route.delayShare,
      route.costPaise,
      o.futureTemperatureC,
    );
  }
  const ranked = result.filter((c) => c.feasible).sort(compareCandidates);
  ranked.forEach((c, i) => (c.rank = i + 1));
  return {
    modelVersion: p.version,
    currentQuality: qualityAt(s.initialQuality, historyAge, p),
    equivalentHistoryHours: historyAge,
    baselineId: "continue",
    winnerId: ranked[0]?.id || null,
    ranking: ranked.map((c) => c.id),
    candidates: result,
    skippedDestinations,
  };
}
export function makeInput(
  shipment: SavedShipment,
  destinations: Destination[],
  options: AnalysisOptions,
): AnalysisInput {
  return structuredClone({
    shipment,
    destinations,
    options,
    parameters: PROFILES[shipment.produce as Produce],
  });
}
export function validateSavedAnalysis(value: SavedAnalysis) {
  if (
    !value ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 80 ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    !value.input ||
    value.shipmentId !== value.input.shipment.id ||
    value.shipmentVersion !== value.input.shipment.version ||
    canonical(analyze(value.input)) !== canonical(value.result)
  )
    throw new DomainError(
      "ANALYSIS_FORMAT",
      "A saved analysis is damaged or inconsistent with its snapshot.",
    );
}
