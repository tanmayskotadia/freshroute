import type { AnalysisInput } from "../model/engine.ts";
export type JobState =
  "UPLOAD_PENDING" | "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
export type CloudJob = {
  id: string;
  kind: "IMPORT" | "ANALYSIS";
  state: JobState;
  version: number;
  createdAt: string;
  updatedAt: string;
  name: string;
  requestHash: string;
  steps: { stage: string; at: string }[];
  sourceKey?: string;
  sourceVersion?: string;
  bytes?: number;
  input?: AnalysisInput;
  leaseUntil?: number;
  result?: { shipmentIds?: string[]; runId?: string };
  errors?: string[];
  executionArn?: string;
};
