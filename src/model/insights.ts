import { DomainError } from "../domain.ts";
import type {
  SavedAnalysis,
  CandidateResult,
  AnalysisOptions,
} from "./engine.ts";
import { analyze, compareCandidates } from "./engine.ts";
export type SplitRequest = {
  candidateId: string;
  destinationId: string;
  quantityGrams: number;
};
export type SplitPart = SplitRequest & {
  destination: string;
  destinationVersion: number;
  costPaise: number;
  estimatedLossKg: number;
  qualityIndex: number;
};
export type SplitPlan = {
  parts: SplitPart[];
  totalGrams: number;
  unallocatedGrams: number;
  costPaise: number;
  estimatedLossKg: number;
  feasible: boolean;
};
function totalGrams(run: SavedAnalysis) {
  const qty = run.input.shipment.quantity * 1000;
  if (
    !Number.isSafeInteger(Math.round(qty)) ||
    Math.abs(qty - Math.round(qty)) > 0.00001
  )
    throw new DomainError(
      "VALIDATION",
      "Split quantities support at most three decimal places in kg.",
    );
  return Math.round(qty);
}
export function evaluateSplit(
  run: SavedAnalysis,
  requests: SplitRequest[],
): SplitPlan {
  if (!Array.isArray(requests) || requests.length < 2 || requests.length > 3)
    throw new DomainError(
      "VALIDATION",
      "Choose two or three receiving destinations.",
    );
  if (new Set(requests.map((p) => p.destinationId)).size !== requests.length)
    throw new DomainError(
      "VALIDATION",
      "Each split must use a different destination.",
    );
  const total = totalGrams(run);
  if (
    requests.some(
      (p) => !Number.isSafeInteger(p.quantityGrams) || p.quantityGrams < 1000,
    ) ||
    requests.reduce((s, p) => s + p.quantityGrams, 0) !== total
  )
    throw new DomainError(
      "VALIDATION",
      "Split quantities must each be at least one kg and add up exactly to the shipment mass.",
    );
  const parts = requests.map((p) => {
    const input = structuredClone(run.input);
    input.shipment.quantity = p.quantityGrams / 1000;
    const candidate = analyze(input).candidates.find(
      (c) => c.id === p.candidateId && c.destinationId === p.destinationId,
    );
    if (!candidate?.feasible)
      throw new DomainError(
        "INFEASIBLE",
        "A split exceeds capacity, budget, receiving hours or another model constraint.",
      );
    return {
      ...p,
      destination: candidate.destinationName,
      destinationVersion: candidate.destinationVersion,
      costPaise: candidate.costPaise,
      estimatedLossKg: candidate.estimatedLossKg,
      qualityIndex: candidate.qualityIndex,
    };
  });
  const cost = parts.reduce((s, p) => s + p.costPaise, 0);
  if (cost > run.input.options.budgetPaise)
    throw new DomainError(
      "INFEASIBLE",
      "The combined split cost exceeds the shipment budget.",
    );
  return {
    parts,
    totalGrams: total,
    unallocatedGrams: 0,
    costPaise: cost,
    estimatedLossKg: parts.reduce((s, p) => s + p.estimatedLossKg, 0),
    feasible: true,
  };
}
export function suggestSplit(run: SavedAnalysis): SplitPlan {
  const total = totalGrams(run),
    input = structuredClone(run.input);
  input.shipment.quantity = 1;
  const choices = analyze(input)
    .candidates.filter((c) => c.feasible)
    .sort(compareCandidates);
  const unique: CandidateResult[] = [];
  for (const c of choices)
    if (!unique.some((p) => p.destinationId === c.destinationId))
      unique.push(c);
  // Enumerate small destination subsets and both fill orders. This is an illustrative bounded planner.
  let best: SplitPlan | undefined;
  for (const a of unique)
    for (const b of unique)
      for (const third of [undefined, ...unique]) {
        const selected = [a, b, ...(third ? [third] : [])];
        if (
          new Set(selected.map((c) => c.destinationId)).size !== selected.length
        )
          continue;
        let remaining = total;
        const requests: SplitRequest[] = [];
        for (let i = 0; i < selected.length; i++) {
          const c = selected[i],
            available = Math.floor(c.availableKg * 1000 + 0.00001),
            leave = (selected.length - i - 1) * 1000;
          const quantityGrams = Math.min(available, remaining - leave);
          if (quantityGrams < 1000) break;
          requests.push({
            candidateId: c.id,
            destinationId: c.destinationId,
            quantityGrams,
          });
          remaining -= quantityGrams;
        }
        if (remaining || requests.length !== selected.length) continue;
        try {
          const plan = evaluateSplit(run, requests);
          if (
            !best ||
            plan.estimatedLossKg < best.estimatedLossKg - 1e-9 ||
            (Math.abs(plan.estimatedLossKg - best.estimatedLossKg) < 1e-9 &&
              plan.costPaise < best.costPaise)
          )
            best = plan;
        } catch {
          /* Infeasible subsets are excluded. */
        }
      }
  return (
    best || {
      parts: [],
      totalGrams: total,
      unallocatedGrams: total,
      costPaise: 0,
      estimatedLossKg: 0,
      feasible: false,
    }
  );
}
export function sensitivity(run: SavedAnalysis) {
  return [-2, -1, 0, 1, 2, 4].map((delta) => {
    const input = structuredClone(run.input);
    input.options.additionalDelayHours = Math.max(
      0,
      Math.min(48, input.options.additionalDelayHours + delta),
    );
    const result = analyze(input),
      winner = result.candidates.find((c) => c.id === result.winnerId);
    return {
      delta,
      delayHours: input.options.additionalDelayHours,
      winner: winner?.name || "No feasible option",
      qualityIndex: winner?.qualityIndex ?? null,
      estimatedLossKg: winner?.estimatedLossKg ?? null,
      costPaise: winner?.costPaise ?? null,
    };
  });
}
export function validateDraft(
  value: unknown,
  run: SavedAnalysis,
): Partial<AnalysisOptions> {
  const v = value as Record<string, unknown>;
  if (
    !v ||
    typeof v !== "object" ||
    Array.isArray(v) ||
    Object.keys(v).some(
      (k) =>
        !["budgetPaise", "additionalDelayHours", "futureTemperatureC"].includes(
          k,
        ),
    ) ||
    !Object.keys(v).length
  )
    throw new DomainError(
      "VALIDATION",
      "The draft must contain only supported scenario fields.",
    );
  const input = structuredClone(run.input);
  input.options = { ...input.options, ...v } as AnalysisOptions;
  analyze(input);
  return v as Partial<AnalysisOptions>;
}
