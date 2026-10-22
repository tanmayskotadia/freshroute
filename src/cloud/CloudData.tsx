import { Cloud, Download, RefreshCw, ShieldCheck } from "lucide-react";
import type { Workspace } from "../domain";
import { useCloud } from "./CloudRuntime";
export function CloudData({
  workspace,
  onExport,
  onReload,
}: {
  workspace: Workspace;
  onExport: () => void;
  onReload: () => void;
}) {
  const runtime = useCloud();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR CONNECTED WORKSPACE</div>
          <h1>Cloud data. Clear ownership.</h1>
          <p>
            Authenticated records stored across four DynamoDB tables in{" "}
            {runtime.config?.region}.
          </p>
        </div>
        <Cloud size={30} />
      </div>
      <div className="local-data-grid">
        <section className="panel local-data-card">
          <ShieldCheck size={25} />
          <h2>Your workspace snapshot</h2>
          <p>
            Revision {workspace.revision}. Only your Cognito subject is used to
            select these records. The local browser demo is separate.
          </p>
          <div className="local-counts">
            <span>
              <strong>{workspace.shipments.length}</strong>shipments
            </span>
            <span>
              <strong>{workspace.analyses.length}</strong>analyses
            </span>
            <span>
              <strong>{workspace.decisions.length}</strong>plans
            </span>
          </div>
          <button className="button secondary" onClick={onExport}>
            <Download size={16} />
            Export current snapshot
          </button>
          <button className="text-button" onClick={onReload}>
            <RefreshCw size={14} />
            Reload from AWS
          </button>
        </section>
        <section className="panel local-data-card">
          <h2>A deliberate academic boundary</h2>
          <p>
            Receiving rules are an isolated fictional network for each
            workspace. Only administrators can edit them in cloud mode. A saved
            plan records a choice and does not reserve partner capacity.
          </p>
          <p>
            Analyses are calculated again on the server before saving. Reset and
            arbitrary history deletion are disabled here. Your local demo
            remains available from the workspace switcher.
          </p>
          <small>
            Role:{" "}
            {runtime.session?.administrator ? "Administrator" : "Operator"} ·
            API requests require a current signed access token.
          </small>
        </section>
      </div>
    </>
  );
}
