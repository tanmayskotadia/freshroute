import type { SQSEvent } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DomainError } from "../src/domain.ts";
import { applyCommand } from "./commands.ts";
import { loadWorkspace, saveWorkspace } from "./store.ts";
import {
  getJob,
  nextJob,
  putJob,
  jobWrite,
  failJob,
  validJobId,
} from "./jobs.ts";
import { parseShipmentsCsv } from "./csv.ts";
const s3 = new S3Client({ region: process.env.AWS_REGION });
export async function handler(event: SQSEvent) {
  const failures: { itemIdentifier: string }[] = [];
  for (const record of event.Records) {
    try {
      const { owner, jobId } = JSON.parse(record.body);
      if (
        typeof owner !== "string" ||
        !/^[a-zA-Z0-9-]{1,128}$/.test(owner) ||
        !validJobId(jobId)
      )
        throw Error("Malformed import message");
      let job = await getJob(owner, jobId);
      if (job.kind !== "IMPORT") throw Error("Wrong job kind");
      if (["SUCCEEDED", "FAILED"].includes(job.state)) continue;
      if (
        job.state === "UPLOAD_PENDING" ||
        (job.state === "RUNNING" && (job.leaseUntil || 0) > Date.now())
      )
        throw Error("Job is not available");
      const running = nextJob(job, "RUNNING", "Validating CSV", {
        leaseUntil: Date.now() + 120000,
      });
      await putJob(owner, running, job.version);
      job = running;
      try {
        const object = await s3.send(
          new GetObjectCommand({
            Bucket: process.env.DATA_BUCKET,
            Key: job.sourceKey,
            VersionId: job.sourceVersion,
          }),
        );
        if (
          object.ContentLength !== job.bytes ||
          object.ContentLength! > 128000
        ) {
          (object.Body as { destroy?: () => void })?.destroy?.();
          throw new DomainError(
            "LIMIT",
            "The stored CSV exceeds its declared limit.",
          );
        }
        const text = await object.Body!.transformToString("utf-8");
        const loaded = await loadWorkspace(owner),
          inputs = parseShipmentsCsv(text, loaded.workspace.destinations);
        let workspace = structuredClone(loaded.workspace);
        const ids: string[] = [];
        for (const input of inputs) {
          const saved = applyCommand(workspace, {
            action: "saveShipment",
            args: [input],
            expectedRevision: workspace.revision,
          });
          workspace = saved.workspace;
          ids.push((saved.result as any).id);
        }
        workspace.drafts = loaded.workspace.drafts;
        const completed = nextJob(
          job,
          "SUCCEEDED",
          `Imported ${ids.length} shipments`,
          { result: { shipmentIds: ids }, leaseUntil: 0 },
        );
        await saveWorkspace(
          owner,
          loaded.workspace,
          workspace,
          loaded.persisted,
          [jobWrite(owner, completed, job.version)],
        );
        console.info(
          JSON.stringify({ jobId, state: "SUCCEEDED", rows: ids.length }),
        );
      } catch (error) {
        if (
          error instanceof DomainError &&
          ["VALIDATION", "LIMIT", "MODEL_DOMAIN"].includes(error.code)
        ) {
          await failJob(owner, jobId, error);
          continue;
        }
        throw error;
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          messageId: record.messageId,
          error: (error as Error).name,
        }),
      );
      failures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures: failures };
}
