import type { AnalysisOptions } from "../model/engine.ts";
export type Fact = { id: string; label: string; value: string };
export type CopilotResult = {
  mode: "explain" | "brief" | "draft";
  provenance: "AI" | "FALLBACK";
  modelId: string;
  promptVersion: string;
  runId: string;
  cached: boolean;
  reason?: string;
  summary: string;
  facts: Fact[];
  draft?: Partial<AnalysisOptions>;
  usage?: { inputTokens: number; outputTokens: number };
};
