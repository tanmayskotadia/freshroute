import type { PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { createHash } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { DomainError } from "../src/domain.ts";
import type { CloudJob } from "../src/cloud/jobTypes.ts";
import { canonical } from "../src/model/engine.ts";
export const db = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION, maxAttempts: 3 }),
  { marshallOptions: { removeUndefinedValues: true } },
);
export const activityTable = process.env.ACTIVITY_TABLE!;
export const jobKey = (owner: string, id: string) => ({
  owner,
  id: `JOB#${id}`,
});
export const requestHash = (value: unknown) =>
  createHash("sha256").update(canonical(value)).digest("hex");
export const validJobId = (id: unknown): id is string =>
  typeof id === "string" && /^JOB-[a-f0-9-]{36}$/.test(id);
export function nextJob(
  job: CloudJob,
  state: CloudJob["state"],
  stage: string,
  extra: Partial<CloudJob> = {},
): CloudJob {
  const at = new Date().toISOString();
  return {
    ...job,
    ...extra,
    state,
    version: job.version + 1,
    updatedAt: at,
    steps: [...job.steps, { stage, at }].slice(-15),
  };
}
export function jobWrite(
  owner: string,
  job: CloudJob,
  expectedVersion?: number,
): { Put: PutCommandInput } {
  if (Buffer.byteLength(JSON.stringify(job), "utf8") > 300000)
    throw new DomainError("LIMIT", "Job inputs exceed 300 KB.");
  return {
    Put: {
      TableName: activityTable,
      Item: {
        ...jobKey(owner, job.id),
        kind: "job",
        version: job.version,
        jobCreatedAt: job.createdAt,
        data: job,
      },
      ConditionExpression:
        expectedVersion === undefined ? "attribute_not_exists(#id)" : "#v = :v",
      ExpressionAttributeNames:
        expectedVersion === undefined ? { "#id": "id" } : { "#v": "version" },
      ExpressionAttributeValues:
        expectedVersion === undefined ? undefined : { ":v": expectedVersion },
    },
  };
}
export async function putJob(
  owner: string,
  job: CloudJob,
  expectedVersion?: number,
) {
  try {
    await db.send(new PutCommand(jobWrite(owner, job, expectedVersion).Put));
  } catch (error) {
    if ((error as Error).name === "ConditionalCheckFailedException")
      throw new DomainError(
        "CONFLICT",
        "This job changed. Refresh its status.",
      );
    throw error;
  }
}
export async function getJob(owner: string, id: string): Promise<CloudJob> {
  if (!validJobId(id)) throw new DomainError("NOT_FOUND", "Job not found.");
  const item = (
    await db.send(
      new GetCommand({
        TableName: activityTable,
        Key: jobKey(owner, id),
        ConsistentRead: true,
      }),
    )
  ).Item;
  if (!item?.data) throw new DomainError("NOT_FOUND", "Job not found.");
  return item.data;
}
export async function listJobs(owner: string) {
  const response = await db.send(
    new QueryCommand({
      TableName: activityTable,
      IndexName: "JobsByOwnerTime",
      KeyConditionExpression: "#o = :o",
      ExpressionAttributeNames: { "#o": "owner" },
      ExpressionAttributeValues: { ":o": owner },
      ScanIndexForward: false,
      Limit: 100,
    }),
  );
  return {
    jobs: (response.Items || [])
      .map((x) => x.data as CloudJob)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    truncated: !!response.LastEvaluatedKey,
  };
}
export async function failJob(owner: string, id: string, error: unknown) {
  const job = await getJob(owner, id);
  if (["SUCCEEDED", "FAILED"].includes(job.state)) return job;
  const messages =
    error instanceof DomainError
      ? [
          error.message,
          ...Object.entries(error.fields).map(
            ([row, message]) => `${row}: ${message}`,
          ),
        ]
      : [
          "The workflow failed. Review the job trace and submit a new job after resolving the cause.",
        ];
  const failed = nextJob(job, "FAILED", "Failed", {
    errors: messages,
    leaseUntil: 0,
  });
  await putJob(owner, failed, job.version);
  return failed;
}
