import { GetCommand, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db, activityTable } from "./jobs.ts";
import { DomainError, isOpenAt, validateDestination } from "../src/domain.ts";
import type {
  Reservation,
  ReservationState,
} from "../src/cloud/reservationTypes.ts";
import { sourceSignature, analyze } from "../src/model/engine.ts";
import { loadWorkspace, saveWorkspace } from "./store.ts";
import {
  networkDestination,
  networkDestinations,
  networkWrite,
} from "./network.ts";
import { grams, transition } from "./reservationRules.ts";
import { evaluateSplit } from "../src/model/insights.ts";
const s3 = new S3Client({ region: process.env.AWS_REGION });
const key = (owner: string, id: string) => ({ owner, id: `RES#${id}` });
export async function assertShipmentEditable(owner: string, id: string) {
  const lock = (
    await db.send(
      new GetCommand({
        TableName: activityTable,
        Key: { owner, id: `SHIPMENTLOCK#${id}` },
        ConsistentRead: true,
      }),
    )
  ).Item;
  if (lock)
    throw new DomainError(
      "CONFLICT",
      "This shipment has a reservation. Cancel it before editing; delivered shipments remain closed.",
    );
}
export async function getReservation(
  owner: string,
  id: string,
): Promise<Reservation> {
  if (!/^RES-[a-zA-Z0-9-]{1,90}$/.test(id || ""))
    throw new DomainError("NOT_FOUND", "Reservation not found.");
  const item = (
    await db.send(
      new GetCommand({
        TableName: activityTable,
        Key: key(owner, id),
        ConsistentRead: true,
      }),
    )
  ).Item;
  if (!item) throw new DomainError("NOT_FOUND", "Reservation not found.");
  return item.data;
}
async function prefixed(owner: string, prefix: string) {
  const rows: any[] = [];
  let cursor;
  do {
    const page: any = await db.send(
      new QueryCommand({
        TableName: activityTable,
        KeyConditionExpression: "#o = :o AND begins_with(id, :p)",
        ExpressionAttributeNames: { "#o": "owner" },
        ExpressionAttributeValues: { ":o": owner, ":p": prefix },
        ConsistentRead: true,
        ExclusiveStartKey: cursor,
      }),
    );
    rows.push(...(page.Items || []));
    cursor = page.LastEvaluatedKey;
  } while (cursor);
  return rows;
}
function eventWrite(owner: string, reservation: Reservation, username: string) {
  return {
    Put: {
      TableName: activityTable,
      Item: {
        owner,
        id: `OUTBOX#${reservation.id}#${reservation.version}`,
        kind: "outbox",
        data: { reservation, username },
      },
      ConditionExpression: "attribute_not_exists(id)",
    },
  };
}
function reservationWrite(
  owner: string,
  reservation: Reservation,
  version?: number,
) {
  return {
    Put: {
      TableName: activityTable,
      Item: {
        ...key(owner, reservation.id),
        kind: "reservation",
        version: reservation.version,
        data: reservation,
      },
      ConditionExpression:
        version === undefined ? "attribute_not_exists(id)" : "#v = :v",
      ExpressionAttributeNames:
        version === undefined ? undefined : { "#v": "version" },
      ExpressionAttributeValues:
        version === undefined ? undefined : { ":v": version },
    },
  };
}
async function reserve(owner: string, body: any, username: string) {
  if (
    typeof body?.runId !== "string" ||
    body.runId.length > 90 ||
    typeof body?.candidateId !== "string"
  )
    throw new DomainError(
      "VALIDATION",
      "A saved run and candidate are required.",
    );
  const id = `RES-${body.runId}`;
  try {
    const existing = await getReservation(owner, id);
    if (existing.candidateId !== body.candidateId)
      throw new DomainError(
        "CONFLICT",
        "This run already has another reservation.",
      );
    if (
      existing.candidateId === "split" &&
      JSON.stringify(
        existing.allocations?.map(
          ({ candidateId, destinationId, quantityGrams }) => ({
            candidateId,
            destinationId,
            quantityGrams,
          }),
        ),
      ) !== JSON.stringify(body.allocations)
    )
      throw new DomainError(
        "CONFLICT",
        "This run already has a different split allocation.",
      );
    return existing;
  } catch (e) {
    if (!(e instanceof DomainError) || e.code !== "NOT_FOUND") throw e;
  }
  const loaded = await loadWorkspace(owner),
    w = loaded.workspace;
  const run = w.analyses.find((r) => r.id === body.runId),
    shipment = run && w.shipments.find((s) => s.id === run.shipmentId);
  if (!run || !shipment)
    throw new DomainError("NOT_FOUND", "Saved analysis not found.");
  if (
    sourceSignature(shipment, w.destinations) !==
    sourceSignature(run.input.shipment, run.input.destinations)
  )
    throw new DomainError(
      "CONFLICT",
      "Shipment or shared capacity changed. Create a fresh analysis.",
    );
  const split =
    body.candidateId === "split"
      ? evaluateSplit(run, body.allocations)
      : undefined;
  const candidate = split
    ? {
        id: "split",
        name: "Split receiving allocation",
        destinationId: split.parts[0].destinationId,
        destinationName: split.parts.map((p) => p.destination).join(" + "),
        feasible: true,
        costPaise: split.costPaise,
        estimatedLossKg: split.estimatedLossKg,
      }
    : analyze(run.input).candidates.find((c) => c.id === body.candidateId);
  if (!candidate?.feasible)
    throw new DomainError(
      "INFEASIBLE",
      "Choose a feasible server-calculated candidate.",
    );
  const qty = grams(shipment.quantity);
  const checks = split
    ? split.parts
    : [
        {
          destinationId: candidate.destinationId,
          quantityGrams: qty,
          destinationVersion: (candidate as any).destinationVersion,
        },
      ];
  const capacities = await Promise.all(
    checks.map(async (part) => {
      const destination = await networkDestination(part.destinationId),
        reserved = Math.round(destination.reservedKg * 1000);
      if (
        part.destinationVersion !== destination.version ||
        reserved + part.quantityGrams > Math.round(destination.capacity * 1000)
      )
        throw new DomainError(
          "CONFLICT",
          "Receiving capacity changed. Refresh and run analysis again.",
        );
      return { destination, reserved, quantityGrams: part.quantityGrams };
    }),
  );
  const at = new Date().toISOString();
  const r: Reservation = {
    id,
    runId: run.id,
    shipmentId: shipment.id,
    candidateId: candidate.id,
    candidateName: candidate.name,
    destinationId: split ? "split" : candidate.destinationId,
    destination: candidate.destinationName,
    ...(split ? { allocations: split.parts } : {}),
    produce: shipment.produce,
    quantity: shipment.quantity,
    quantityGrams: qty,
    status: "CONFIRMED",
    version: 1,
    createdAt: at,
    updatedAt: at,
    costPaise: candidate.costPaise,
    estimatedLossKg: candidate.estimatedLossKg,
    modelVersion: run.result.modelVersion,
    events: [
      {
        status: "CONFIRMED",
        at,
        note: "Shared inbound capacity reserved atomically.",
      },
    ],
  };
  const after = structuredClone(w);
  after.revision++;
  after.decisions.unshift({ ...r });
  const lock = {
    Put: {
      TableName: activityTable,
      Item: { owner, id: `SHIPMENTLOCK#${shipment.id}`, reservationId: id },
      ConditionExpression: "attribute_not_exists(id)",
    },
  };
  await saveWorkspace(owner, w, after, loaded.persisted, [
    reservationWrite(owner, r),
    ...capacities.map(({ destination, reserved, quantityGrams }) =>
      networkWrite(destination, {
        ...destination,
        reservedKg: (reserved + quantityGrams) / 1000,
        version: destination.version + 1,
        updatedAt: at,
      }),
    ),
    eventWrite(owner, r, username),
    lock,
  ]);
  return r;
}
async function change(owner: string, id: string, body: any, username: string) {
  const r = await getReservation(owner, id),
    target = body?.status as ReservationState;
  const rule = transition(r.status, target);
  if (!rule.changed) return r;
  if (body?.expectedVersion !== r.version)
    throw new DomainError(
      "CONFLICT",
      "Reservation changed. Refresh before updating.",
    );
  const loaded = await loadWorkspace(owner),
    w = loaded.workspace;
  const at = new Date().toISOString();
  const next: Reservation = {
    ...r,
    status: target,
    version: r.version + 1,
    updatedAt: at,
    events: [
      ...r.events,
      {
        status: target,
        at,
        note: rule.release
          ? "Inbound capacity released."
          : "Shipment dispatched; capacity remains reserved.",
      },
    ],
  };
  const writes: any[] = [
    reservationWrite(owner, next, r.version),
    eventWrite(owner, next, username),
  ];
  if (rule.release) {
    for (const allocation of r.allocations || [
      { destinationId: r.destinationId, quantityGrams: r.quantityGrams },
    ]) {
      const destination = await networkDestination(allocation.destinationId);
      const remaining =
        Math.round(destination.reservedKg * 1000) - allocation.quantityGrams;
      if (remaining < 0)
        throw new DomainError(
          "CONFLICT",
          "Capacity ledger requires review. No capacity was changed.",
        );
      writes.push(
        networkWrite(destination, {
          ...destination,
          reservedKg: remaining / 1000,
          version: destination.version + 1,
          updatedAt: at,
        }),
      );
    }
  }
  if (target === "CANCELLED")
    writes.push({
      Delete: {
        TableName: activityTable,
        Key: { owner, id: `SHIPMENTLOCK#${r.shipmentId}` },
        ConditionExpression: "reservationId = :id",
        ExpressionAttributeValues: { ":id": r.id },
      },
    });
  const after = structuredClone(w);
  after.revision++;
  after.decisions = after.decisions.map((d) =>
    d.id === id ? { ...d, ...next } : d,
  );
  await saveWorkspace(owner, w, after, loaded.persisted, writes);
  return next;
}
export async function reservationApi(
  owner: string,
  route: string,
  params: Record<string, string | undefined> | undefined,
  body: any,
  username: string,
  administrator: boolean,
) {
  if (route === "POST /v1/reservations")
    return {
      status: 200,
      body: { reservation: await reserve(owner, body, username) },
    };
  if (route === "POST /v1/reservations/{reservationId}/status")
    return {
      status: 200,
      body: {
        reservation: await change(
          owner,
          params?.reservationId || "",
          body,
          username,
        ),
      },
    };
  if (route === "GET /v1/fulfilment") {
    const [reservations, inbox, network] = await Promise.all([
      prefixed(owner, "RES#"),
      prefixed(owner, "INBOX#"),
      networkDestinations(),
    ]);
    return {
      status: 200,
      body: {
        reservations: reservations
          .map((x) => x.data)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        inbox: inbox
          .map((x) => x.data)
          .sort((a, b) => b.at.localeCompare(a.at)),
        network,
      },
    };
  }
  if (route === "POST /v1/inbox/{messageId}/read") {
    const id = params?.messageId || "";
    if (!/^INBOX#RES-[a-zA-Z0-9-]+#[1-4]$/.test(id))
      throw new DomainError("NOT_FOUND", "Notification not found.");
    const item = (
      await db.send(
        new GetCommand({
          TableName: activityTable,
          Key: { owner, id },
          ConsistentRead: true,
        }),
      )
    ).Item;
    if (!item) throw new DomainError("NOT_FOUND", "Notification not found.");
    await db.send(
      new PutCommand({
        TableName: activityTable,
        Item: { ...item, data: { ...item.data, read: true } },
        ConditionExpression: "attribute_exists(id)",
      }),
    );
    return { status: 200, body: { read: true } };
  }
  if (route === "GET /v1/reservations/{reservationId}/report") {
    const r = await getReservation(owner, params?.reservationId || "");
    const processed = (
      await db.send(
        new GetCommand({
          TableName: activityTable,
          Key: { owner, id: `PROCESSED#${r.id}#${r.version}` },
          ConsistentRead: true,
        }),
      )
    ).Item;
    if (!processed)
      return {
        status: 202,
        body: { ready: false, message: "Report is queued. Refresh shortly." },
      };
    const format = body?.format === "json" ? "json" : "pdf";
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: process.env.REPORTS_BUCKET!,
        Key: `exports/${owner}/${r.id}/v${r.version}.${format}`,
        ResponseContentDisposition: `attachment; filename="${r.id}-v${r.version}.${format}"`,
      }),
      { expiresIn: 120 },
    );
    return {
      status: 200,
      body: { ready: true, url, expiresIn: 120, version: r.version },
    };
  }
  if (route === "POST /v1/network/{destinationId}") {
    if (!administrator)
      throw new DomainError(
        "FORBIDDEN",
        "Shared receiving rules require administrator access.",
      );
    const previous = await networkDestination(params?.destinationId || ""),
      input = body?.destination;
    if (
      !input ||
      body.expectedVersion !== previous.version ||
      input.id !== previous.id
    )
      throw new DomainError(
        "CONFLICT",
        "Receiving rules changed. Refresh first.",
      );
    const next = {
      ...input,
      reservedKg: previous.reservedKg,
      version: previous.version + 1,
      updatedAt: new Date().toISOString(),
    };
    validateDestination(next);
    if (
      Math.abs(next.capacity * 1000 - Math.round(next.capacity * 1000)) >
      0.00001
    )
      throw new DomainError(
        "VALIDATION",
        "Capacity supports at most three decimal places in kg.",
      );
    try {
      await db.send(new PutCommand(networkWrite(previous, next).Put));
    } catch (e) {
      if ((e as Error).name === "ConditionalCheckFailedException")
        throw new DomainError(
          "CONFLICT",
          "Receiving rules changed. Refresh first.",
        );
      throw e;
    }
    return { status: 200, body: { destination: next } };
  }
  return null;
}
