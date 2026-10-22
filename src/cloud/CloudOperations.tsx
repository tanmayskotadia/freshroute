import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CloudUpload,
  Download,
  FileSpreadsheet,
  FlaskConical,
  RefreshCw,
  Workflow,
  TriangleAlert,
} from "lucide-react";
import { useCloud } from "./CloudRuntime";
import { cloudRequest } from "./api";
import type { CloudJob } from "./jobTypes";
import { formatIST } from "../domain";
const template =
  'produce,quantityKg,origin,destinationId,valuePerKg,initialQuality,remainingTravelHours,delayHours,eta,history\nTomatoes,100,"Naroda collection hub",eastside,30,95,2.25,1,14:00,2@10;1@18\n';
export function CloudOperations({
  onNavigate,
  onSync,
}: {
  onNavigate: (path: string) => void;
  onSync: () => void | Promise<void>;
}) {
  const runtime = useCloud(),
    [jobs, setJobs] = useState<CloudJob[]>([]),
    [error, setError] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [truncated, setTruncated] = useState(false);
  const uploadId = useRef<string | null>(null),
    seen = useRef(new Set<string>());
  async function refresh() {
    if (!runtime.cloud || !runtime.config) return;
    try {
      const response = await cloudRequest<{
        jobs: CloudJob[];
        truncated: boolean;
      }>(runtime.config, "/v1/jobs");
      setJobs(response.jobs);
      setTruncated(response.truncated);
      setError("");
      const imported = response.jobs.filter(
        (j) =>
          j.kind === "IMPORT" &&
          j.state === "SUCCEEDED" &&
          !seen.current.has(j.id),
      );
      if (imported.length) {
        imported.forEach((j) => seen.current.add(j.id));
        await onSync();
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [runtime.config, runtime.cloud]);
  async function upload() {
    if (!file || !runtime.config) return;
    if (file.size < 1 || file.size > 128000) {
      setError("Choose a non-empty CSV no larger than 128 KB.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("Preparing your private upload...");
    uploadId.current ||= crypto.randomUUID();
    try {
      const start = await cloudRequest<{
        job: CloudJob;
        uploadUrl?: string;
        headers?: Record<string, string>;
      }>(runtime.config, "/v1/imports", {
        requestId: uploadId.current,
        name: file.name,
        bytes: file.size,
      });
      if (start.uploadUrl) {
        setMessage("Uploading CSV to private quarantine...");
        const result = await fetch(start.uploadUrl, {
          method: "PUT",
          headers: start.headers,
          body: file,
        });
        if (!result.ok)
          throw Error("CSV upload failed. Retry with the same selected file.");
      }
      await cloudRequest(
        runtime.config,
        `/v1/imports/${start.job.id}/complete`,
        {},
      );
      setMessage("Import queued. Follow validation and results below.");
      uploadId.current = null;
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      setMessage("");
    } finally {
      setBusy(false);
    }
  }
  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([template], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "freshroute-import-template.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const active = jobs.filter((j) =>
    ["QUEUED", "RUNNING"].includes(j.state),
  ).length;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">FROM A FILE TO A FRESH POSSIBILITY</div>
          <h1>Work moves forward. You see how.</h1>
          <p>
            Private imports and traceable cloud analyses, with every step
            accounted for.
          </p>
        </div>
        <button className="button secondary" onClick={refresh}>
          <RefreshCw size={15} />
          Refresh jobs
        </button>
      </div>
      {!runtime.cloud ? (
        <section className="panel cloud-feature-intro">
          <Workflow size={35} />
          <h2>Your cloud workflow hub</h2>
          <p>
            Sign in to AWS from the workspace switcher to upload CSV files,
            track background imports and follow server-side analyses. Your local
            demo stays separate.
          </p>
        </section>
      ) : (
        <>
          <div className="analysis-summary operations-summary">
            <div>
              <small>Work in progress</small>
              <strong>{active}</strong>
            </div>
            <div>
              <small>Completed imports</small>
              <strong>
                {
                  jobs.filter(
                    (j) => j.kind === "IMPORT" && j.state === "SUCCEEDED",
                  ).length
                }
              </strong>
            </div>
            <div>
              <small>Calculated cloud analyses</small>
              <strong>
                {
                  jobs.filter(
                    (j) => j.kind === "ANALYSIS" && j.state === "SUCCEEDED",
                  ).length
                }
              </strong>
            </div>
          </div>
          {error && (
            <div className="notice amber" role="alert">
              <TriangleAlert size={18} />
              <p>{error}</p>
            </div>
          )}
          <div className="operations-grid">
            <section className="panel import-card">
              <div className="eyebrow">BRING YOUR SHIPMENTS TOGETHER</div>
              <h2>A small file. A clear starting point.</h2>
              <p>
                Import up to 25 shipments at once. All rows are validated before
                any shipment is saved.
              </p>
              <label className="csv-dropzone">
                <CloudUpload size={30} />
                <strong>{file ? file.name : "Choose your shipment CSV"}</strong>
                <span>CSV only · up to 128 KB</span>
                <input
                  aria-label="Shipment CSV file"
                  type="file"
                  accept=".csv,text/csv"
                  disabled={busy}
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    uploadId.current = null;
                    setMessage("");
                    setError("");
                  }}
                />
              </label>
              <button
                className="button"
                disabled={!file || busy}
                onClick={upload}
              >
                {busy ? "Uploading..." : "Upload and validate"}
                <ArrowRight size={15} />
              </button>
              <button className="text-button" onClick={downloadTemplate}>
                <Download size={14} />
                Download the CSV template
              </button>
              {message && (
                <p className="data-message" role="status">
                  {message}
                </p>
              )}
              <details className="csv-help">
                <summary>How to prepare the file</summary>
                <p>
                  Keep the ten template columns. Use receiving destination IDs:
                  central, eastside, riverfront, westside or northside. Enter
                  history as hours@temperature, separated by semicolons
                  (2@10;1@18). Values use INR per kg; arrival uses 24-hour IST.
                </p>
                <p>
                  Uploads stay in private quarantine. Validation errors identify
                  rows. Failed validation imports nothing. A completed job is
                  not applied again on retry.
                </p>
              </details>
            </section>
            <section className="panel workflow-story">
              <Workflow size={29} />
              <div className="eyebrow">A WORKFLOW YOU CAN EXPLAIN</div>
              <h2>Built for a visible journey.</h2>
              <ol>
                <li>
                  <span>01</span>
                  <div>
                    <h3>Upload privately</h3>
                    <p>A short-lived link accepts one file in S3 quarantine.</p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <h3>Validate and process</h3>
                    <p>
                      SQS buffers imports. Step Functions validates and
                      calculates analysis jobs.
                    </p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <h3>Save once, keep the trail</h3>
                    <p>
                      Conditional transactions commit the result and job status
                      together.
                    </p>
                  </div>
                </li>
              </ol>
              <button
                className="text-button"
                onClick={() => onNavigate("/rescue/FR-101")}
              >
                Start a cloud analysis <ArrowRight size={14} />
              </button>
            </section>
          </div>
          <section className="panel job-section">
            <div className="panel-title">
              <div>
                <h2>Your workflow trail</h2>
                <p>
                  Auto-refreshes every 4 seconds while this tab is visible.{" "}
                  {truncated
                    ? "Showing the 100 newest jobs."
                    : "Only your authenticated jobs are shown."}
                </p>
              </div>
            </div>
            {!jobs.length ? (
              <div className="empty-state">
                <Clock3 />
                <h2>A clear trail starts with your next action.</h2>
                <p>
                  Upload a CSV or save an analysis in Rescue Lab to follow a
                  real cloud job.
                </p>
              </div>
            ) : (
              <div className="job-list">
                {jobs.map((job) => (
                  <article
                    key={job.id}
                    className={`job-card state-${job.state.toLowerCase()}`}
                  >
                    <div className="job-title">
                      <span className="job-icon">
                        {job.kind === "IMPORT" ? (
                          <FileSpreadsheet size={21} />
                        ) : (
                          <FlaskConical size={21} />
                        )}
                      </span>
                      <div>
                        <small>
                          {job.kind === "IMPORT"
                            ? "SHIPMENT IMPORT"
                            : "RESCUE ANALYSIS"}{" "}
                          · {formatIST(job.createdAt)} IST
                        </small>
                        <h3>{job.name}</h3>
                      </div>
                      <span
                        className={`badge ${job.state === "SUCCEEDED" ? "green" : job.state === "FAILED" ? "amber" : "blue"}`}
                      >
                        {job.state.replace("_", " ")}
                      </span>
                    </div>
                    <div className="job-steps">
                      {job.steps.map((step, i) => (
                        <span key={`${step.at}-${i}`}>
                          <CheckCircle2 size={12} />
                          {step.stage}
                        </span>
                      ))}
                    </div>
                    {job.errors && (
                      <div className="job-errors" role="status">
                        {job.errors.map((e, i) => (
                          <p key={i}>{e}</p>
                        ))}
                      </div>
                    )}
                    {job.result?.shipmentIds && (
                      <p className="job-result">
                        {job.result.shipmentIds.length} shipments saved:{" "}
                        {job.result.shipmentIds.join(", ")}{" "}
                        <button
                          className="text-button"
                          onClick={() => onNavigate("/shipments")}
                        >
                          View shipments <ArrowRight size={13} />
                        </button>
                      </p>
                    )}
                    {job.result?.runId && (
                      <button
                        className="button secondary"
                        onClick={() => onNavigate(`/runs/${job.result!.runId}`)}
                      >
                        Open saved calculation <ArrowRight size={14} />
                      </button>
                    )}
                    <details className="job-debug">
                      <summary>Execution details</summary>
                      <p>Job {job.id}</p>
                      {job.sourceVersion && (
                        <p>Frozen S3 object version: {job.sourceVersion}</p>
                      )}
                      {job.input && (
                        <p>
                          Model: {job.input.parameters.version} · shipment
                          version {job.input.shipment.version}
                        </p>
                      )}
                      {job.executionArn && (
                        <p>Step Functions: {job.executionArn}</p>
                      )}
                      <p>
                        Updated {formatIST(job.updatedAt)} IST · job version{" "}
                        {job.version}
                      </p>
                    </details>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
