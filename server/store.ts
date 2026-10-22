import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { DomainError, seedWorkspace } from "../src/domain.ts";
import type { Workspace } from "../src/domain.ts";
import { canonical } from "../src/model/engine.ts";
import { networkDestinations } from "./network.ts";
const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION, maxAttempts: 3 }),
  { marshallOptions: { removeUndefinedValues: true } },
);
const tables = {
  shipments: process.env.SHIPMENTS_TABLE!,
  analyses: process.env.RUNS_TABLE!,
  destinations: process.env.DESTINATIONS_TABLE!,
  activity: process.env.ACTIVITY_TABLE!,
};
const metaKey = (owner: string) => ({ owner, id: "META" });
async function metadata(owner: string) {
  return (
    await client.send(
      new GetCommand({
        TableName: tables.activity,
        Key: metaKey(owner),
        ConsistentRead: true,
      }),
    )
  ).Item;
}
async function records(table: string, owner: string) {
  const result: any[] = [];
  let key: Record<string, any> | undefined;
  do {
    const page = await client.send(
      new QueryCommand({
        TableName: table,
        KeyConditionExpression: "#o = :o",
        ExpressionAttributeNames: { "#o": "owner" },
        ExpressionAttributeValues: { ":o": owner },
        ConsistentRead: true,
        ExclusiveStartKey: key,
      }),
    );
    result.push(...(page.Items || []));
    key = page.LastEvaluatedKey;
  } while (key);
  return result;
}
export async function loadWorkspace(
  owner: string,
): Promise<{ workspace: Workspace; persisted: boolean }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = await metadata(owner);
    if (!before) {
      const workspace = seedWorkspace();
      workspace.destinations = await networkDestinations();
      return { workspace, persisted: false };
    }
    const [shipments, analyses, destinations, activity] = await Promise.all([
      records(tables.shipments, owner),
      records(tables.analyses, owner),
      records(tables.destinations, owner),
      records(tables.activity, owner),
    ]);
    const after = await metadata(owner);
    if (after && before.revision === after.revision)
      return {
        workspace: {
          schemaVersion: 1,
          revision: after.revision,
          shipments: shipments.map((x) => x.data),
          analyses: analyses
            .map((x) => x.data)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          destinations: await networkDestinations(),
          decisions: activity
            .filter((x) => x.kind === "decision")
            .map((x) => x.data)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          drafts: activity.filter((x) => x.kind === "draft").map((x) => x.data),
        },
        persisted: true,
      };
  }
  throw new DomainError(
    "CONFLICT",
    "Workspace changed while reading. Retry the request.",
  );
}
function items(owner: string, workspace: Workspace) {
  const result = new Map<
    string,
    { table: string; item: Record<string, unknown> }
  >();
  const add = (table: string, id: string, kind: string, data: unknown) =>
    result.set(`${table}/${id}`, { table, item: { owner, id, kind, data } });
  workspace.shipments.forEach((x) =>
    add(tables.shipments, x.id, "shipment", x),
  );
  workspace.analyses.forEach((x) => add(tables.analyses, x.id, "analysis", x));
  workspace.destinations.forEach((x) =>
    add(tables.destinations, x.id, "destination", x),
  );
  workspace.decisions.forEach((x) =>
    add(tables.activity, `DECISION#${x.id}`, "decision", x),
  );
  workspace.drafts.forEach((x) =>
    add(tables.activity, `DRAFT#${x.key}`, "draft", x),
  );
  return result;
}
export async function saveWorkspace(
  owner: string,
  before: Workspace,
  after: Workspace,
  persisted: boolean,
  extraWrites: any[] = [],
) {
  const old = persisted ? items(owner, before) : new Map(),
    next = items(owner, after);
  const writes: any[] = [
    {
      Put: {
        TableName: tables.activity,
        Item: { ...metaKey(owner), revision: after.revision, schemaVersion: 1 },
        ConditionExpression: persisted ? "#r = :r" : "attribute_not_exists(#o)",
        ExpressionAttributeNames: persisted
          ? { "#r": "revision" }
          : { "#o": "owner" },
        ExpressionAttributeValues: persisted
          ? { ":r": before.revision }
          : undefined,
      },
    },
  ];
  for (const [key, entry] of next) {
    if (old.has(key) && canonical(old.get(key)!.item) === canonical(entry.item))
      continue;
    if (Buffer.byteLength(JSON.stringify(entry.item), "utf8") > 300000)
      throw new DomainError(
        "LIMIT",
        "This record exceeds the 300 KB academic workspace limit. Shorten its history.",
      );
    writes.push({ Put: { TableName: entry.table, Item: entry.item } });
  }
  for (const [key, entry] of old)
    if (!next.has(key))
      writes.push({
        Delete: { TableName: entry.table, Key: { owner, id: entry.item.id } },
      });
  writes.push(...extraWrites);
  if (writes.length > 100)
    throw new DomainError(
      "LIMIT",
      "This change exceeds the transaction limit. Save a smaller change.",
    );
  try {
    await client.send(new TransactWriteCommand({ TransactItems: writes }));
  } catch (error) {
    if ((error as Error).name === "TransactionCanceledException")
      throw new DomainError(
        "CONFLICT",
        "A concurrent update won. Reload before saving again.",
      );
    throw error;
  }
}
