import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { db } from "./jobs.ts";
import { seedWorkspace, DomainError } from "../src/domain.ts";
import type { Destination } from "../src/domain.ts";
export const networkOwner = "NETWORK";
export const destinationTable = process.env.DESTINATIONS_TABLE!;
export async function networkDestination(id: string): Promise<Destination> {
  const key = { owner: networkOwner, id };
  const read = () =>
    db.send(
      new GetCommand({
        TableName: destinationTable,
        Key: key,
        ConsistentRead: true,
      }),
    );
  let item = (await read()).Item;
  if (!item) {
    const data = seedWorkspace().destinations.find((d) => d.id === id);
    if (!data)
      throw new DomainError("NOT_FOUND", "Receiving destination not found.");
    try {
      await db.send(
        new PutCommand({
          TableName: destinationTable,
          Item: { ...key, version: data.version, kind: "network", data },
          ConditionExpression: "attribute_not_exists(id)",
        }),
      );
      return data;
    } catch (error) {
      if ((error as Error).name !== "ConditionalCheckFailedException")
        throw error;
      item = (await read()).Item;
    }
  }
  return item!.data;
}
export async function networkDestinations() {
  return Promise.all(
    seedWorkspace().destinations.map((d) => networkDestination(d.id)),
  );
}
export function networkWrite(before: Destination, after: Destination) {
  return {
    Put: {
      TableName: destinationTable,
      Item: {
        owner: networkOwner,
        id: after.id,
        kind: "network",
        version: after.version,
        data: after,
      },
      ConditionExpression: "#v = :v",
      ExpressionAttributeNames: { "#v": "version" },
      ExpressionAttributeValues: { ":v": before.version },
    },
  };
}
