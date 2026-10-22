import type { SQSEvent } from "aws-lambda";
import { GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { db, activityTable } from "./jobs.ts";
import { reservationPdf } from "./report.ts";
import type { Reservation } from "../src/cloud/reservationTypes.ts";
const s3 = new S3Client({ region: process.env.AWS_REGION }),
  sns = new SNSClient({ region: process.env.AWS_REGION }),
  cognito = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION,
  });
const get = async (owner: string, id: string) =>
  (
    await db.send(
      new GetCommand({
        TableName: activityTable,
        Key: { owner, id },
        ConsistentRead: true,
      }),
    )
  ).Item;
export async function processEvent(owner: string, outboxId: string) {
  if (
    !/^[a-zA-Z0-9-]{1,128}$/.test(owner) ||
    !/^OUTBOX#RES-[a-zA-Z0-9-]+#[1-4]$/.test(outboxId)
  )
    throw Error("InvalidOutboxReference");
  const event = await get(owner, outboxId);
  if (!event || event.kind !== "outbox") throw Error("OutboxNotFound");
  const r: Reservation = event.data.reservation,
    suffix = `${r.id}#${r.version}`,
    processedId = `PROCESSED#${suffix}`;
  if (await get(owner, processedId)) {
    console.info(
      JSON.stringify({
        stage: "ALREADY_PROCESSED",
        reservationId: r.id,
        version: r.version,
      }),
    );
    return;
  }
  const lockId = `PROCESSING#${suffix}`,
    now = Date.now();
  try {
    await db.send(
      new PutCommand({
        TableName: activityTable,
        Item: { owner, id: lockId, leaseUntil: now + 90000 },
        ConditionExpression: "attribute_not_exists(id) OR leaseUntil < :now",
        ExpressionAttributeValues: { ":now": now },
      }),
    );
  } catch (error) {
    if ((error as Error).name === "ConditionalCheckFailedException")
      throw Error("ProcessingLeaseHeld");
    throw error;
  }
  try {
    // Recheck after acquiring the lease: another invocation may have finished between reads.
    if (await get(owner, processedId)) return;
    const prefix = `exports/${owner}/${r.id}/v${r.version}`;
    const pdf = await reservationPdf(r);
    await Promise.all([
      s3.send(
        new PutObjectCommand({
          Bucket: process.env.REPORTS_BUCKET!,
          Key: `${prefix}.pdf`,
          Body: pdf,
          ContentType: "application/pdf",
          CacheControl: "private, no-store",
        }),
      ),
      s3.send(
        new PutObjectCommand({
          Bucket: process.env.REPORTS_BUCKET!,
          Key: `${prefix}.json`,
          Body: JSON.stringify(
            {
              schemaVersion: 1,
              reservation: r,
              disclaimer:
                "Illustrative academic record; not food-safety certification.",
            },
            null,
            2,
          ),
          ContentType: "application/json",
          CacheControl: "private, no-store",
        }),
      ),
    ]);
    const inboxId = `INBOX#${suffix}`;
    try {
      await db.send(
        new PutCommand({
          TableName: activityTable,
          Item: {
            owner,
            id: inboxId,
            kind: "notification",
            data: {
              id: inboxId,
              reservationId: r.id,
              title: `${r.shipmentId}: ${r.status.toLowerCase()}`,
              message: `${r.quantity} kg ${r.produce.toLowerCase()} - ${r.destination}. Private report available.`,
              at: r.updatedAt,
              read: false,
            },
          },
          ConditionExpression: "attribute_not_exists(id)",
        }),
      );
    } catch (error) {
      if ((error as Error).name !== "ConditionalCheckFailedException")
        throw error;
    }
    let recipient = "__none__";
    try {
      const user = await cognito.send(
        new AdminGetUserCommand({
          UserPoolId: process.env.USER_POOL_ID!,
          Username: event.data.username,
        }),
      );
      const attributes = Object.fromEntries(
        (user.UserAttributes || []).map((a) => [a.Name, a.Value]),
      );
      if (
        attributes.sub === owner &&
        attributes.email_verified === "true" &&
        attributes.email
      )
        recipient = attributes.email.toLowerCase();
    } catch (error) {
      if ((error as Error).name !== "UserNotFoundException") throw error;
    }
    const published = await sns.send(
      new PublishCommand({
        TopicArn: process.env.RESCUE_TOPIC_ARN!,
        Subject: `FreshRoute: ${r.shipmentId} ${r.status.toLowerCase()}`,
        Message: `FreshRoute academic rescue update\n\n${r.shipmentId}: ${r.status}\n${r.quantity} kg ${r.produce}\nDestination: ${r.destination}\nAction: ${r.candidateName}\nEvent: ${r.id} / version ${r.version}\n\nOpen FreshRoute to view your private report. This is a fictional academic workflow, not partner acceptance or a food-safety assessment.`,
        MessageAttributes: {
          recipientEmail: { DataType: "String", StringValue: recipient },
          eventId: { DataType: "String", StringValue: suffix },
        },
      }),
    );
    await db.send(
      new PutCommand({
        TableName: activityTable,
        Item: {
          owner,
          id: processedId,
          kind: "processed",
          completedAt: new Date().toISOString(),
          snsMessageId: published.MessageId,
        },
        ConditionExpression: "attribute_not_exists(id)",
      }),
    );
    console.info(
      JSON.stringify({
        stage: "REPORT_AND_NOTIFICATION_READY",
        reservationId: r.id,
        version: r.version,
        snsMessageId: published.MessageId,
      }),
    );
  } finally {
    await db.send(
      new DeleteCommand({
        TableName: activityTable,
        Key: { owner, id: lockId },
      }),
    );
  }
}
export async function handler(event: SQSEvent) {
  const batchItemFailures: { itemIdentifier: string }[] = [];
  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      await processEvent(body.owner, body.outboxId);
    } catch (error) {
      console.error(
        JSON.stringify({
          stage: "POST_DECISION_FAILED",
          error: (error as Error).name,
        }),
      );
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
}
