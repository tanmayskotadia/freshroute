import type { DynamoDBStreamEvent } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
const sqs = new SQSClient({ region: process.env.AWS_REGION });
export async function handler(event: DynamoDBStreamEvent) {
  const batchItemFailures: { itemIdentifier: string }[] = [];
  for (const record of event.Records) {
    if (
      record.eventName !== "INSERT" ||
      record.dynamodb?.NewImage?.kind?.S !== "outbox"
    )
      continue;
    try {
      await sqs.send(
        new SendMessageCommand({
          QueueUrl: process.env.POST_DECISION_QUEUE_URL!,
          MessageBody: JSON.stringify({
            owner: record.dynamodb.Keys!.owner.S,
            outboxId: record.dynamodb.Keys!.id.S,
          }),
        }),
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          stage: "OUTBOX_ENQUEUE",
          error: (error as Error).name,
        }),
      );
      batchItemFailures.push({
        itemIdentifier: record.dynamodb.SequenceNumber!,
      });
    }
  }
  return { batchItemFailures };
}
