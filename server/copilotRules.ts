import type { SavedAnalysis } from "../src/model/engine.ts";
import type { Fact, CopilotResult } from "../src/cloud/copilotTypes.ts";
import { validateDraft } from "../src/model/insights.ts";
export const PROMPT_VERSION = "freshroute-grounded-1";
export function factsFor(run: SavedAnalysis): Fact[] {
  const facts: Fact[] = [
    {
      id: "shipment",
      label: "Shipment mass",
      value: `${run.input.shipment.quantity} kg`,
    },
    { id: "model", label: "Model", value: run.result.modelVersion },
    {
      id: "budget",
      label: "Budget",
      value: `INR ${(run.input.options.budgetPaise / 100).toFixed(2)}`,
    },
  ];
  run.result.candidates.forEach((c, i) => {
    facts.push({
      id: `candidate_${i}`,
      label: c.name,
      value: `${c.destinationName}; ${c.feasible ? "feasible" : "infeasible"}; quality ${c.qualityIndex.toFixed(2)}; estimated loss ${c.estimatedLossKg.toFixed(2)} kg; extra cost INR ${(c.costPaise / 100).toFixed(2)}; arrival ${c.arrivalTime} IST${c.arrivalDayOffset ? ` day offset ${c.arrivalDayOffset}` : ""}; ${c.reasons.join("; ")}`,
    });
  });
  return facts;
}
export function fallback(
  run: SavedAnalysis,
  mode: CopilotResult["mode"],
  reason: string,
  modelId = "apac.amazon.nova-micro-v1:0",
): CopilotResult {
  const winner = run.result.candidates.find(
    (c) => c.id === run.result.winnerId,
  );
  return {
    mode,
    runId: run.id,
    modelId,
    promptVersion: PROMPT_VERSION,
    provenance: "FALLBACK",
    cached: false,
    reason,
    summary: winner
      ? `The deterministic model ranks ${winner.name} first among feasible options. Review the frozen facts below and confirm current receiving capacity before reserving.`
      : "No feasible option was found. Review constraints and create another analysis with explicit assumptions.",
    facts: factsFor(run),
  };
}
const allowedSummaries = {
  tradeoffs: "Review the saved trade-offs before choosing a receiving plan.",
  constraints:
    "Receiving constraints must be satisfied before an option can be selected.",
  uncertainty:
    "These illustrative model results depend on the entered assumptions.",
  no_feasible:
    "The saved analysis contains no feasible option. Revise assumptions and calculate again.",
};
export function validateAnswer(
  raw: string,
  run: SavedAnalysis,
  mode: CopilotResult["mode"],
) {
  if (raw.length > 6000) throw Error("InvalidModelOutput");
  const answer = JSON.parse(
    raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, ""),
  );
  const all = factsFor(run),
    allowed = new Set(all.map((f) => f.id));
  if (
    !answer ||
    typeof answer !== "object" ||
    Array.isArray(answer) ||
    Object.keys(answer).some(
      (k) => !["summaryKey", "factIds", "draft"].includes(k),
    ) ||
    !Object.hasOwn(allowedSummaries, answer.summaryKey) ||
    !Array.isArray(answer.factIds) ||
    answer.factIds.length < 1 ||
    answer.factIds.length > 10 ||
    new Set(answer.factIds).size !== answer.factIds.length ||
    answer.factIds.some(
      (id: unknown) => typeof id !== "string" || !allowed.has(id),
    )
  )
    throw Error("InvalidModelOutput");
  if (answer.summaryKey === "no_feasible" && run.result.winnerId)
    throw Error("ContradictoryModelOutput");
  if (mode !== "draft" && answer.draft !== undefined)
    throw Error("UnexpectedScenarioWrite");
  const draft = mode === "draft" ? validateDraft(answer.draft, run) : undefined;
  return {
    summary:
      allowedSummaries[answer.summaryKey as keyof typeof allowedSummaries],
    facts: answer.factIds.map((id: string) => all.find((f) => f.id === id)!),
    ...(draft ? { draft } : {}),
  };
}
