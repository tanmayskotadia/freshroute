import { useState } from "react";
import {
  Download,
  RotateCcw,
  Database,
  TriangleAlert,
  RefreshCw,
} from "lucide-react";
import type { Workspace } from "../domain";
export function LocalData({
  workspace,
  error,
  onExport,
  onReset,
  onRetry,
}: {
  workspace: Workspace;
  error: string;
  onExport: () => void;
  onReset: () => void;
  onRetry: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR BROWSER, YOUR DEMO DATA</div>
          <h1>Local data, clearly managed.</h1>
          <p>
            Saved on this browser and origin. No cloud account or server is
            connected.
          </p>
        </div>
        <Database size={30} />
      </div>
      {error && (
        <div className="notice amber" role="alert">
          <TriangleAlert size={18} />
          <p>
            {error} Displayed records are the last readable workspace or preview
            defaults; unreadable saved data has not been replaced.
          </p>
        </div>
      )}
      <div className="local-data-grid">
        <section className="panel local-data-card">
          <h2>Workspace snapshot</h2>
          <p>
            Storage schema 1 · revision {workspace.revision}. Local data is
            shared between tabs on this origin, not synchronized between
            devices.
          </p>
          <div className="local-counts">
            <span>
              <strong>{workspace.shipments.length}</strong>shipments
            </span>
            <span>
              <strong>{workspace.destinations.length}</strong>destinations
            </span>
            <span>
              <strong>{workspace.drafts.length}</strong>drafts
            </span>
          </div>
          <button
            className="button secondary"
            onClick={() => {
              try {
                onExport();
                setMessage("Local data export downloaded.");
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            <Download size={16} />
            Export local JSON
          </button>
          <button className="text-button" onClick={onRetry}>
            <RefreshCw size={14} />
            Reload stored workspace
          </button>
          <p className="fine-print">
            Export reads the raw stored data even if its schema is damaged. It
            includes fictional records only. Browser clearing, private mode and
            quota restrictions can affect retention.
          </p>
        </section>
        <section className="panel local-data-card">
          <h2>Reset to the original demo</h2>
          <p>
            This replaces only FreshRoute’s local workspace. Saved shipments,
            drafts, receiving-rule edits and sample decision history will be
            removed. Export first if you want a backup; JSON re-import is not
            implemented yet.
          </p>
          <label className="field-label" htmlFor="reset-confirmation">
            Type RESET to replace the local workspace
          </label>
          <input
            id="reset-confirmation"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
          />
          <button
            className="button reset-danger"
            disabled={confirmation !== "RESET"}
            onClick={() => {
              try {
                onReset();
                setConfirmation("");
                setMessage("Original demo restored.");
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            <RotateCcw size={16} />
            Reset this demo workspace
          </button>
        </section>
      </div>
      {message && (
        <p className="data-message" role="status">
          {message}
        </p>
      )}
    </>
  );
}
