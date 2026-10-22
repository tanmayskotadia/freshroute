import { defaultOptions, sourceSignature } from "../src/model/engine.ts";
import { verify6 } from "./probe6.ts";
import { verify5 } from "./probe5.ts";
export async function handler(event: {
  tokenA: string;
  tokenB: string;
  health?: boolean;
  phase6?: boolean;
  phase5?: boolean;
}) {
  const api = process.env.API_URL!;
  if (event.phase6) return verify6([event.tokenA, event.tokenB]);
  if (event.phase5) return verify5(event.tokenA, event.tokenB);
  if (event.health) {
    const root = await fetch(process.env.WEB_URL! + "/overview");
    const config = await fetch(process.env.WEB_URL! + "/cloud-config.json");
    const settings = await config.json();
    const denied = await fetch(
      "https://" +
        process.env.WEB_BUCKET +
        ".s3.ap-south-1.amazonaws.com/index.html",
    );
    return {
      httpsFrontend:
        root.status === 200 && (await root.text()).includes('<div id="root">'),
      securityHeaders: root.headers.get("x-frame-options") === "DENY",
      configMatchesApi: settings.apiUrl === api,
      anonymousS3Denied: denied.status === 403,
    };
  }

  const checks: Record<string, boolean> = {};
  async function request(path: string, token?: string, body?: unknown) {
    const response = await fetch(api + path, {
      method: body ? "POST" : "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    return { status: response.status, data };
  }
  checks.unauthenticatedDenied =
    (await request("/v1/workspace")).status === 401;
  checks.forgedTokenDenied =
    (await request("/v1/workspace", "invalid.jwt.value")).status === 401;
  const a = await request("/v1/workspace", event.tokenA),
    b = await request("/v1/workspace", event.tokenB);
  checks.validTokensAccepted = a.status === 200 && b.status === 200;
  if (!checks.validTokensAccepted)
    return { checks, statuses: { a: a.status, b: b.status }, pass: false };
  const base = a.data.workspace.shipments[0];
  const input = {
    produce: base.produce,
    quantity: 500,
    origin: "Phase 4 isolated verification hub",
    destinationId: base.destinationId,
    valuePaisePerKg: base.valuePaisePerKg,
    initialQuality: 95,
    plannedTravelHours: 5.5,
    delay: 3,
    eta: "16:30",
    status: "Needs attention",
    segments: base.segments,
  };
  const created = await request("/v1/commands", event.tokenA, {
    action: "saveShipment",
    args: [input],
    expectedRevision: a.data.workspace.revision,
  });
  checks.shipmentSaved = created.status === 200;
  if (!checks.shipmentSaved)
    return { checks, failure: created.data, pass: false };
  const saved = created.data.result;
  const reload = await request("/v1/workspace", event.tokenA),
    other = await request("/v1/workspace", event.tokenB);
  checks.shipmentPersisted = reload.data.workspace.shipments.some(
    (s: any) => s.id === saved.id && s.origin === input.origin,
  );
  checks.ownerCannotReadOtherShipment = !other.data.workspace.shipments.some(
    (s: any) => s.origin === input.origin,
  );
  const hostile = await request("/v1/commands", event.tokenB, {
    action: "saveShipment",
    args: [
      { ...input, origin: "Cross-owner attempted overwrite" },
      saved.id,
      saved.version,
    ],
    expectedRevision: other.data.workspace.revision,
    owner: "ignored",
  });
  checks.ownerCannotEditOtherShipment =
    hostile.status === 409 && hostile.data.code === "CONFLICT";
  const run = await request("/v1/commands", event.tokenA, {
    action: "saveAnalysis",
    args: [
      saved.id,
      defaultOptions(saved),
      "Phase 4 verified cloud analysis",
      sourceSignature(saved, reload.data.workspace.destinations),
    ],
    expectedRevision: reload.data.workspace.revision,
  });
  checks.serverCalculatedAnalysisSaved =
    run.status === 200 && !!run.data.result?.result?.winnerId;
  if (!checks.serverCalculatedAnalysisSaved)
    return { checks, failure: run.data, pass: false };
  const analysis = run.data.result;
  const foreignRun = await request("/v1/commands", event.tokenB, {
    action: "confirmAnalysis",
    args: [analysis.id, analysis.result.winnerId],
    expectedRevision: other.data.workspace.revision,
  });
  checks.ownerCannotConfirmOtherRun = [400, 404].includes(foreignRun.status);
  const denied = await request("/v1/commands", event.tokenA, {
    action: "saveDestination",
    args: [reload.data.workspace.destinations[0], 1],
    expectedRevision: run.data.workspace.revision,
  });
  checks.operatorCannotEditReceivingRules = denied.status === 403;
  const plan = await request("/v1/commands", event.tokenA, {
    action: "confirmAnalysis",
    args: [analysis.id, analysis.result.winnerId],
    expectedRevision: run.data.workspace.revision,
  });
  checks.planPersisted = plan.status === 200 && !!plan.data.result?.runId;
  const stale = await request("/v1/commands", event.tokenA, {
    action: "saveDraft",
    args: [{}],
    expectedRevision: 0,
  });
  checks.staleRevisionDenied = stale.status === 409;
  const final = await request("/v1/workspace", event.tokenA);
  checks.analysisAndHistoryPersisted =
    final.data.workspace.analyses.some((r: any) => r.id === analysis.id) &&
    final.data.workspace.decisions.some((d: any) => d.runId === analysis.id);
  checks.noCapacityReserved = final.data.workspace.destinations.every(
    (d: any) => d.reservedKg === 0,
  );
  return {
    checks,
    pass: Object.values(checks).every(Boolean),
    summary: {
      shipmentId: saved.id,
      modelVersion: analysis.result.modelVersion,
      winnerId: analysis.result.winnerId,
      revision: final.data.workspace.revision,
    },
  };
}
