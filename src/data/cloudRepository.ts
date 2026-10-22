import { cloudRequest } from "../cloud/api";
import type { CloudJob } from "../cloud/jobTypes";
import { DomainError } from "../domain";
import type { Workspace, ShipmentInput, Destination, Draft } from "../domain";
import type { DemoDecision } from "../fixtures";
import type { AnalysisOptions, SavedAnalysis } from "../model/engine";
import type { CloudConfig } from "../cloud/auth";
import { readSession } from "../cloud/auth";
import type { WorkspaceRepository } from "./localRepository";
export class CloudWorkspaceRepository implements WorkspaceRepository {
  readonly cloud = true;
  private analysisRequests = new Map<string, string>();
  private workspace!: Workspace;
  constructor(private config: CloudConfig) {}
  private async request(path: string, body?: unknown) {
    const session = readSession();
    if (!session)
      throw new DomainError(
        "AUTH",
        "Your cloud session expired. Sign in again to continue.",
      );
    let response: Response;
    try {
      response = await fetch(`${this.config.apiUrl}${path}`, {
        method: body ? "POST" : "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(25000),
      });
    } catch {
      throw new DomainError(
        "NETWORK",
        "The cloud service could not be reached. Your unsaved form is still here. Retry or reload.",
      );
    }
    const data = await response.json();
    if (!response.ok)
      throw new DomainError(
        data.code || "API",
        data.message || "The cloud request failed.",
        data.fields || {},
      );
    if (!data.workspace || data.workspace.schemaVersion !== 1)
      throw new DomainError(
        "API",
        "The server returned an unsupported workspace.",
      );
    this.workspace = data.workspace;
    return data;
  }
  async refresh() {
    await this.request("/v1/workspace");
    return this.load();
  }
  load() {
    if (!this.workspace)
      throw new DomainError("LOADING", "Cloud workspace is loading.");
    return structuredClone(this.workspace);
  }
  private async command<T>(action: string, args: unknown[]): Promise<T> {
    return (
      await this.request("/v1/commands", {
        action,
        args,
        expectedRevision: this.workspace.revision,
      })
    ).result;
  }
  saveShipment(input: ShipmentInput, id?: string, version?: number) {
    return this.command<Workspace["shipments"][number]>("saveShipment", [
      input,
      id,
      version,
    ]);
  }
  async saveDestination(input: Destination, version: number) {
    await cloudRequest(this.config, `/v1/network/${input.id}`, {
      destination: input,
      expectedVersion: version,
    });
    await this.refresh();
  }
  saveDraft(draft: Draft) {
    return this.command<void>("saveDraft", [draft]);
  }
  discardDraft(key: string) {
    return this.command<void>("discardDraft", [key]);
  }
  async saveAnalysis(
    id: string,
    options: AnalysisOptions,
    name: string,
    expectedSource: string,
  ) {
    const requestKey = JSON.stringify([id, options, name, expectedSource]);
    const requestId =
      this.analysisRequests.get(requestKey) || crypto.randomUUID();
    this.analysisRequests.set(requestKey, requestId);
    const started = await cloudRequest<{ job: CloudJob }>(
      this.config,
      "/v1/analysis-jobs",
      { requestId, shipmentId: id, options, name, expectedSource },
    );
    const deadline = Date.now() + 90000;
    let job = started.job;
    while (Date.now() < deadline) {
      if (job.state === "FAILED") {
        this.analysisRequests.delete(requestKey);
        throw new DomainError(
          "WORKFLOW",
          (job.errors || ["The analysis failed."]).join(" "),
        );
      }
      if (job.state === "SUCCEEDED" && job.result?.runId) {
        await this.refresh();
        const run = this.workspace.analyses.find(
          (r) => r.id === job.result!.runId,
        );
        if (!run)
          throw new DomainError(
            "API",
            "The saved run could not be loaded. Refresh History.",
          );
        this.analysisRequests.delete(requestKey);
        return structuredClone(run);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      job = (
        await cloudRequest<{ job: CloudJob }>(
          this.config,
          `/v1/jobs/${started.job.id}`,
        )
      ).job;
    }
    throw new DomainError(
      "WORKFLOW",
      "The analysis is still running. Open Workflow hub to follow it; a browser timeout does not cancel the cloud job.",
    );
  }
  async confirmAnalysis(id: string, candidateId: string) {
    const result = await cloudRequest<{ reservation: DemoDecision }>(
      this.config,
      "/v1/reservations",
      { runId: id, candidateId },
    );
    await this.refresh();
    return result.reservation;
  }
  addDecision(_decision: Omit<DemoDecision, "id">): never {
    throw new DomainError(
      "FORBIDDEN",
      "Cloud plans must refer to a server-calculated saved analysis.",
    );
  }
  clearDecisions(): never {
    throw new DomainError("FORBIDDEN", "Cloud history cannot be cleared here.");
  }
  reset(): never {
    throw new DomainError(
      "FORBIDDEN",
      "Cloud reset is disabled. Your local demo remains separate.",
    );
  }
  exportRaw() {
    return JSON.stringify(this.workspace, null, 2);
  }
}
