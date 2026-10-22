import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { DomainError } from "../src/domain.ts";
import { analyze, makeInput, sourceSignature } from "../src/model/engine.ts";
import { loadWorkspace } from "./store.ts";
import { getJob, listJobs, nextJob, putJob, requestHash } from "./jobs.ts";
import type { CloudJob } from "../src/cloud/jobTypes.ts";
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    requestChecksumCalculation: "WHEN_REQUIRED",
  }),
  sqs = new SQSClient({ region: process.env.AWS_REGION }),
  sfn = new SFNClient({ region: process.env.AWS_REGION });
const validRequest = (value: unknown) =>
  typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);
async function create(
  owner: string,
  kind: CloudJob["kind"],
  body: any,
  details: Partial<CloudJob>,
) {
  if (!validRequest(body?.requestId))
    throw new DomainError("VALIDATION", "A valid requestId is required.");
  const id = `JOB-${body.requestId}`,
    hash = requestHash({ kind, ...details });
  try {
    const existing = await getJob(owner, id);
    if (existing.requestHash !== hash)
      throw new DomainError(
        "CONFLICT",
        "This requestId was used with different inputs.",
      );
    return existing;
  } catch (error) {
    if (!(error instanceof DomainError) || error.code !== "NOT_FOUND")
      throw error;
  }
  const at = new Date().toISOString();
  const job: CloudJob = {
    id,
    kind,
    state: kind === "IMPORT" ? "UPLOAD_PENDING" : "QUEUED",
    version: 1,
    name: body.name?.trim() || "Analysis job",
    createdAt: at,
    updatedAt: at,
    requestHash: hash,
    steps: [
      { stage: kind === "IMPORT" ? "Awaiting CSV upload" : "Queued", at },
    ],
    ...details,
  };
  try {
    await putJob(owner, job);
  } catch (error) {
    if (error instanceof DomainError && error.code === "CONFLICT") {
      const existing = await getJob(owner, id);
      if (existing.requestHash === hash) return existing;
    }
    throw error;
  }
  return job;
}
export async function workflowApi(
  owner: string,
  route: string,
  path: Record<string, string | undefined> | undefined,
  body: any,
) {
  if (route === "GET /v1/jobs")
    return { status: 200, body: await listJobs(owner) };
  if (route === "GET /v1/jobs/{jobId}")
    return {
      status: 200,
      body: { job: await getJob(owner, path?.jobId || "") },
    };
  if (route === "POST /v1/imports") {
    if (
      !body ||
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.length > 80 ||
      !Number.isInteger(body.bytes) ||
      body.bytes < 1 ||
      body.bytes > 128000
    )
      throw new DomainError(
        "VALIDATION",
        "Use a CSV filename up to 80 characters and a file no larger than 128 KB.",
      );
    if (!validRequest(body.requestId))
      throw new DomainError("VALIDATION", "Invalid requestId.");
    const sourceKey = `quarantine/${owner}/JOB-${body.requestId}.csv`;
    const job = await create(owner, "IMPORT", body, {
      name: body.name.trim(),
      sourceKey,
      bytes: body.bytes,
    });
    if (job.state !== "UPLOAD_PENDING") return { status: 200, body: { job } };
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: process.env.DATA_BUCKET,
        Key: sourceKey,
        ContentType: "text/csv",
        ContentLength: body.bytes,
      }),
      { expiresIn: 300 },
    );
    return {
      status: 201,
      body: {
        job,
        uploadUrl,
        headers: { "Content-Type": "text/csv" },
        expiresIn: 300,
      },
    };
  }
  if (route === "POST /v1/imports/{jobId}/complete") {
    let job = await getJob(owner, path?.jobId || "");
    if (job.kind !== "IMPORT")
      throw new DomainError("VALIDATION", "This is not a CSV import.");
    if (job.state === "UPLOAD_PENDING") {
      const head = await s3.send(
        new HeadObjectCommand({
          Bucket: process.env.DATA_BUCKET,
          Key: job.sourceKey,
        }),
      );
      if (
        head.ContentLength !== job.bytes ||
        head.ContentType !== "text/csv" ||
        !head.VersionId
      )
        throw new DomainError(
          "VALIDATION",
          "The uploaded object does not match the declared CSV size or type.",
        );
      const queued = nextJob(job, "QUEUED", "CSV uploaded", {
        sourceVersion: head.VersionId,
      });
      await putJob(owner, queued, job.version);
      job = queued;
    }
    if (job.state === "QUEUED")
      await sqs.send(
        new SendMessageCommand({
          QueueUrl: process.env.IMPORT_QUEUE_URL,
          MessageBody: JSON.stringify({ owner, jobId: job.id }),
        }),
      );
    return { status: 202, body: { job } };
  }
  if (route === "POST /v1/analysis-jobs") {
    const { workspace } = await loadWorkspace(owner),
      shipment = workspace.shipments.find((s) => s.id === body?.shipmentId);
    if (!shipment) throw new DomainError("NOT_FOUND", "Shipment not found.");
    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.length > 80
    )
      throw new DomainError(
        "VALIDATION",
        "Name the analysis using 1-80 characters.",
      );
    if (
      body.expectedSource !== sourceSignature(shipment, workspace.destinations)
    )
      throw new DomainError(
        "CONFLICT",
        "Shipment or receiving rules changed. Reload before starting this analysis.",
      );
    const input = makeInput(shipment, workspace.destinations, body.options);
    analyze(input);
    let job = await create(owner, "ANALYSIS", body, {
      name: body.name.trim(),
      input,
      executionArn:
        process.env.ANALYSIS_STATE_MACHINE_ARN!.replace(
          ":stateMachine:",
          ":execution:",
        ) +
        ":JOB-" +
        body.requestId,
    });
    if (job.state === "QUEUED") {
      try {
        await sfn.send(
          new StartExecutionCommand({
            stateMachineArn: process.env.ANALYSIS_STATE_MACHINE_ARN,
            name: job.id,
            input: JSON.stringify({ owner, jobId: job.id }),
          }),
        );
      } catch (error) {
        if ((error as Error).name !== "ExecutionAlreadyExists") throw error;
      }
    }
    return { status: 202, body: { job } };
  }
  return null;
}
