import { DomainError } from "../src/domain.ts";
import { analyze, sourceSignature } from "../src/model/engine.ts";
import type { SavedAnalysis } from "../src/model/engine.ts";
import { loadWorkspace, saveWorkspace } from "./store.ts";
import { getJob, nextJob, putJob, jobWrite, failJob } from "./jobs.ts";
type Input = {
  owner: string;
  jobId: string;
  action: "validate" | "calculate" | "fail";
};
export async function handler(event: Input) {
  const { owner, jobId, action } = event;
  if (typeof owner !== "string" || !/^[a-zA-Z0-9-]{1,128}$/.test(owner))
    throw Error("Invalid owner");
  if (action === "fail") {
    await failJob(owner, jobId, new Error("Workflow failure"));
    return { owner, jobId };
  }
  let job = await getJob(owner, jobId);
  if (job.kind !== "ANALYSIS" || !job.input)
    throw Error("Invalid analysis job");
  if (job.state === "SUCCEEDED") return { owner, jobId };
  if (job.state === "FAILED") throw Error("Analysis already failed");
  try {
    if (action === "validate") {
      analyze(job.input);
      if (job.state !== "RUNNING") {
        const running = nextJob(job, "RUNNING", "Inputs validated");
        await putJob(owner, running, job.version);
        job = running;
      }
      return { owner, jobId };
    }
    if (action !== "calculate") throw Error("Unsupported workflow stage");
    const loaded = await loadWorkspace(owner),
      shipment = loaded.workspace.shipments.find(
        (s) => s.id === job.input!.shipment.id,
      );
    if (
      !shipment ||
      sourceSignature(shipment, loaded.workspace.destinations) !==
        sourceSignature(job.input.shipment, job.input.destinations)
    )
      throw new DomainError(
        "STALE",
        "Shipment or receiving rules changed while queued. Create a new analysis from current data.",
      );
    const result = analyze(job.input);
    const run: SavedAnalysis = {
      id: `RUN-${job.id.slice(4)}`,
      name: job.name,
      shipmentId: shipment.id,
      shipmentVersion: shipment.version,
      createdAt: new Date().toISOString(),
      input: structuredClone(job.input),
      result,
    };
    const workspace = {
      ...loaded.workspace,
      revision: loaded.workspace.revision + 1,
      analyses: [run, ...loaded.workspace.analyses],
    };
    const completed = nextJob(job, "SUCCEEDED", "Calculated and saved", {
      result: { runId: run.id },
    });
    await saveWorkspace(owner, loaded.workspace, workspace, loaded.persisted, [
      jobWrite(owner, completed, job.version),
    ]);
    console.info(JSON.stringify({ jobId, runId: run.id, state: "SUCCEEDED" }));
    return { owner, jobId };
  } catch (error) {
    if (error instanceof DomainError && error.code !== "CONFLICT")
      await failJob(owner, jobId, error);
    if (error instanceof DomainError && error.code === "CONFLICT") {
      const transient = new Error(error.message);
      transient.name = "WorkspaceConflict";
      throw transient;
    }
    throw error;
  }
}
