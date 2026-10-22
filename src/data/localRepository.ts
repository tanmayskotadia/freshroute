import {
  DomainError,
  seedWorkspace,
  validateShipment,
  validateDestination,
} from "../domain.ts";
import type {
  Workspace,
  ShipmentInput,
  Destination,
  Draft,
  SavedShipment,
} from "../domain.ts";
import type { DemoDecision } from "../fixtures.ts";
import {
  analyze,
  makeInput,
  sourceSignature,
  validateSavedAnalysis,
} from "../model/engine.ts";
import type { AnalysisOptions, SavedAnalysis } from "../model/engine.ts";
export const STORAGE_KEY = "freshroute.workspace.v1";
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface WorkspaceRepository {
  load(): Workspace;
  saveShipment(
    input: ShipmentInput,
    id?: string,
    expectedVersion?: number,
  ): SavedShipment;
  saveDestination(input: Destination, expectedVersion: number): void;
  saveDraft(draft: Draft): void;
  discardDraft(key: string): void;
  addDecision(decision: Omit<DemoDecision, "id">): DemoDecision;
  clearDecisions(): void;
  reset(): void;
  exportRaw(): string;
  saveAnalysis(
    shipmentId: string,
    options: AnalysisOptions,
    name: string,
    expectedSource: string,
  ): SavedAnalysis;
  confirmAnalysis(runId: string, candidateId: string): DemoDecision;
}
function assertWorkspace(value: unknown): asserts value is Workspace {
  const w = value as Workspace;
  if (
    !w ||
    w.schemaVersion !== 1 ||
    !Number.isInteger(w.revision) ||
    w.revision < 0 ||
    !Array.isArray(w.shipments) ||
    !Array.isArray(w.destinations) ||
    !Array.isArray(w.decisions) ||
    !Array.isArray(w.drafts)
  )
    throw new Error("Unsupported workspace structure.");
  if (w.shipments.length === 0 || w.destinations.length === 0)
    throw new Error("Required demo collections are missing.");
  // Additive migration: Phase 2 workspaces have no analysis collection yet.
  if (!Object.hasOwn(w, "analyses")) w.analyses = [];
  if (!Array.isArray(w.analyses) || !uniqueAnalysisIds(w.analyses))
    throw new Error("Invalid analysis collection.");
  w.analyses.forEach(validateSavedAnalysis);
  const unique = (items: { id: string }[]) =>
    items.every((x) => typeof x?.id === "string" && x.id.length > 0) &&
    new Set(items.map((x) => x.id)).size === items.length;
  if (!unique(w.shipments) || !unique(w.destinations) || !unique(w.decisions))
    throw new Error("Duplicate or invalid identifiers.");
  const date = (s: unknown) =>
    typeof s === "string" && Number.isFinite(Date.parse(s));
  for (const d of w.destinations) {
    validateDestination(d);
    if (!Number.isInteger(d.version) || d.version < 1 || !date(d.updatedAt))
      throw new Error("Invalid destination version.");
  }
  for (const s of w.shipments) {
    validateShipment(s, w.destinations);
    if (
      !Number.isInteger(s.version) ||
      s.version < 1 ||
      !date(s.createdAt) ||
      !date(s.updatedAt) ||
      !Array.isArray(s.events) ||
      s.events.some(
        (e) =>
          !e ||
          !date(e.at) ||
          typeof e.title !== "string" ||
          typeof e.note !== "string",
      ) ||
      s.temperature !== s.segments.at(-1)!.temperatureC
    )
      throw new Error("Invalid shipment history.");
  }
  for (const d of w.decisions)
    if (
      !date(d.createdAt) ||
      !w.shipments.some((s) => s.id === d.shipmentId) ||
      typeof d.candidateName !== "string" ||
      typeof d.destination !== "string" ||
      !Number.isFinite(d.quantity) ||
      d.quantity <= 0
    )
      throw new Error("Invalid decision record.");
  for (const d of w.drafts) {
    if (
      !d ||
      typeof d.key !== "string" ||
      !date(d.savedAt) ||
      !d.fields ||
      typeof d.fields.produce !== "string" ||
      !Array.isArray(d.fields.segments) ||
      d.fields.segments.length < 1 ||
      d.fields.segments.length > 12
    )
      throw new Error("Invalid draft.");
    const required = [
      "produce",
      "quantity",
      "origin",
      "destinationId",
      "valuePerKg",
      "initialQuality",
      "plannedTravelHours",
      "delay",
      "eta",
      "status",
    ] as const;
    if (
      required.some((key) => typeof d.fields[key] !== "string") ||
      (d.baseVersion !== undefined &&
        (!Number.isInteger(d.baseVersion) || d.baseVersion < 1))
    )
      throw new Error("Incomplete draft structure.");
    for (const [key, value] of Object.entries(d.fields)) {
      if (key === "segments") {
        if (
          d.fields.segments.some(
            (s) =>
              !s ||
              typeof s.durationHours !== "string" ||
              typeof s.temperatureC !== "string" ||
              s.durationHours.length > 50 ||
              s.temperatureC.length > 50,
          )
        )
          throw new Error("Invalid draft segments.");
      } else if (typeof value !== "string" || value.length > 1000)
        throw new Error("Invalid draft fields.");
    }
  }
}
function uniqueAnalysisIds(values: SavedAnalysis[]) {
  return (
    values.every((v) => v && typeof v.id === "string") &&
    new Set(values.map((v) => v.id)).size === values.length
  );
}
export class LocalWorkspaceRepository implements WorkspaceRepository {
  private storage: StoragePort;
  constructor(storage: StoragePort) {
    this.storage = storage;
  }
  load(): Workspace {
    let raw: string | null;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
    } catch {
      throw new DomainError(
        "STORAGE_READ",
        "Browser storage is unavailable. No saved records were changed.",
      );
    }
    if (raw === null) return seedWorkspace();
    try {
      const parsed: unknown = JSON.parse(raw);
      assertWorkspace(parsed);
      return parsed;
    } catch {
      throw new DomainError(
        "STORAGE_FORMAT",
        "Saved data is damaged or uses an unsupported version. It has not been overwritten. Export it in Local data before choosing a reset.",
      );
    }
  }
  private write(workspace: Workspace) {
    assertWorkspace(workspace);
    try {
      this.storage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...workspace, revision: workspace.revision + 1 }),
      );
    } catch {
      throw new DomainError(
        "STORAGE_WRITE",
        "Could not save to this browser. Storage may be full or blocked. Your previous saved data remains unchanged.",
      );
    }
  }
  saveShipment(
    input: ShipmentInput,
    id?: string,
    expectedVersion?: number,
  ): SavedShipment {
    const w = this.load();
    validateShipment(input, w.destinations);
    const existing = id ? w.shipments.find((s) => s.id === id) : undefined;
    if (id && (!existing || existing.version !== expectedVersion))
      throw new DomainError(
        "CONFLICT",
        "This shipment changed in another tab. Close this form, review the latest record, then reopen it. Your entered values are still available to save as a draft.",
      );
    const now = new Date().toISOString();
    const nextId =
      id ||
      `FR-${Math.max(104, ...w.shipments.map((s) => Number(s.id.replace("FR-", "")) || 0)) + 1}`;
    const icon =
      input.produce === "Tomatoes"
        ? "🍅"
        : input.produce === "Bananas"
          ? "🍌"
          : "🥬";
    const saved: SavedShipment = {
      ...input,
      id: nextId,
      destination: w.destinations.find((d) => d.id === input.destinationId)!
        .name,
      temperature: input.segments.at(-1)!.temperatureC,
      icon,
      color:
        input.produce === "Tomatoes"
          ? "#f7e5dc"
          : input.produce === "Bananas"
            ? "#f4efd4"
            : "#e3efda",
      version: (existing?.version || 0) + 1,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      events: [
        ...(existing?.events || []),
        {
          id: crypto.randomUUID(),
          at: now,
          title: existing ? "Shipment updated" : "Shipment created",
          note: existing
            ? "Shipment details or conditions edited locally."
            : "Shipment saved to this browser. No analysis has run.",
        },
      ],
    };
    w.shipments = existing
      ? w.shipments.map((s) => (s.id === id ? saved : s))
      : [...w.shipments, saved];
    w.drafts = w.drafts.filter((d) => d.key !== (id ? `edit:${id}` : "new"));
    this.write(w);
    return structuredClone(saved);
  }
  saveDestination(input: Destination, expectedVersion: number) {
    const w = this.load();
    validateDestination(input);
    const old = w.destinations.find((d) => d.id === input.id);
    if (!old || old.version !== expectedVersion)
      throw new DomainError(
        "CONFLICT",
        "Receiving rules changed in another tab. Reopen the destination to review the latest values.",
      );
    if (input.reservedKg !== old.reservedKg)
      throw new DomainError(
        "VALIDATION",
        "Reserved quantity cannot be edited in this phase.",
      );
    const updated = {
      ...input,
      name: input.name.trim(),
      type: input.type.trim(),
      version: old.version + 1,
      updatedAt: new Date().toISOString(),
    };
    w.destinations = w.destinations.map((d) =>
      d.id === input.id ? updated : d,
    );
    w.shipments = w.shipments.map((s) =>
      s.destinationId === input.id ? { ...s, destination: updated.name } : s,
    );
    this.write(w);
  }
  saveDraft(draft: Draft) {
    const w = this.load();
    w.drafts = [
      ...w.drafts.filter((d) => d.key !== draft.key),
      structuredClone(draft),
    ];
    this.write(w);
  }
  discardDraft(key: string) {
    const w = this.load();
    w.drafts = w.drafts.filter((d) => d.key !== key);
    this.write(w);
  }
  addDecision(input: Omit<DemoDecision, "id">) {
    const w = this.load();
    const decision = {
      ...input,
      id: `DEMO-${crypto.randomUUID().slice(0, 8)}`,
    };
    w.decisions.unshift(decision);
    this.write(w);
    return decision;
  }
  clearDecisions() {
    const w = this.load();
    w.decisions = [];
    this.write(w);
  }
  saveAnalysis(
    shipmentId: string,
    options: AnalysisOptions,
    name: string,
    expectedSource: string,
  ): SavedAnalysis {
    const w = this.load(),
      shipment = w.shipments.find((s) => s.id === shipmentId);
    if (
      !shipment ||
      sourceSignature(shipment, w.destinations) !== expectedSource
    )
      throw new DomainError(
        "CONFLICT",
        "Shipment or receiving rules changed. Reload the current shipment and rerun before saving.",
      );
    if (typeof name !== "string" || !name.trim() || name.trim().length > 80)
      throw new DomainError(
        "VALIDATION",
        "Give the analysis a name of 1–80 characters.",
      );
    const input = makeInput(shipment, w.destinations, options),
      result = analyze(input);
    const run: SavedAnalysis = {
      id: `RUN-${crypto.randomUUID()}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      shipmentId,
      shipmentVersion: shipment.version,
      input,
      result,
    };
    w.analyses.unshift(run);
    this.write(w);
    return structuredClone(run);
  }
  confirmAnalysis(runId: string, candidateId: string): DemoDecision {
    const w = this.load(),
      run = w.analyses.find((r) => r.id === runId),
      current = run && w.shipments.find((s) => s.id === run.shipmentId);
    if (!run || !current)
      throw new DomainError("NOT_FOUND", "Saved analysis not found.");
    if (
      sourceSignature(current, w.destinations) !==
      sourceSignature(run.input.shipment, run.input.destinations)
    )
      throw new DomainError(
        "CONFLICT",
        "Shipment or receiving rules changed after this analysis. Create a new analysis before confirming a local plan.",
      );
    const candidate = run.result.candidates.find((c) => c.id === candidateId);
    if (!candidate?.feasible)
      throw new DomainError(
        "INFEASIBLE",
        "Only a feasible candidate in this saved analysis can be selected.",
      );
    const existing = w.decisions.find((d) => d.runId === runId);
    if (existing) {
      if (existing.candidateId !== candidateId)
        throw new DomainError(
          "CONFLICT",
          "This analysis already has a local plan. Save a new analysis to choose a different action.",
        );
      return structuredClone(existing);
    }
    const decision: DemoDecision = {
      id: `PLAN-${crypto.randomUUID().slice(0, 8)}`,
      shipmentId: run.shipmentId,
      runId,
      candidateId,
      candidateName: candidate.name,
      quantity: run.input.shipment.quantity,
      destination: candidate.destinationName,
      createdAt: new Date().toISOString(),
      modelVersion: run.result.modelVersion,
      estimatedLossKg: candidate.estimatedLossKg,
      costPaise: candidate.costPaise,
    };
    w.decisions.unshift(decision);
    this.write(w);
    return structuredClone(decision);
  }
  reset() {
    this.write(seedWorkspace());
  }
  exportRaw() {
    try {
      return (
        this.storage.getItem(STORAGE_KEY) ||
        JSON.stringify(seedWorkspace(), null, 2)
      );
    } catch {
      throw new DomainError(
        "STORAGE_READ",
        "Cannot read this browser storage to export.",
      );
    }
  }
}
