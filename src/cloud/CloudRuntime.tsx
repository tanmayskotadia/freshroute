import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  Cloud,
  ArrowRight,
  ShieldCheck,
  Database,
  RefreshCw,
  Leaf,
} from "lucide-react";
import App from "../App";
import { CloudWorkspaceRepository } from "../data/cloudRepository";
import {
  finishSignIn,
  forgetSession,
  readSession,
  signOut,
  startSignIn,
} from "./auth";
import type { CloudConfig, Session } from "./auth";
type Runtime = {
  repository: CloudWorkspaceRepository | null;
  config: CloudConfig | null;
  session: Session | null;
  cloud: boolean;
};
const RuntimeContext = createContext<Runtime>({
  repository: null,
  config: null,
  session: null,
  cloud: false,
});
export const useCloud = () => useContext(RuntimeContext);
export function CloudRuntime() {
  const [config, setConfig] = useState<CloudConfig | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [repository, setRepository] = useState<CloudWorkspaceRepository | null>(
    null,
  );
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [cloud, setCloud] = useState(
    location.hostname !== "127.0.0.1" &&
      location.hostname !== "localhost" &&
      sessionStorage.getItem("freshroute.mode") !== "local",
  );
  const initialized = useRef(false);
  async function connect(current: CloudConfig, signedIn: Session) {
    const repo = new CloudWorkspaceRepository(current);
    await repo.refresh();
    setRepository(repo);
    setSession(signedIn);
    setCloud(true);
    sessionStorage.setItem("freshroute.mode", "cloud");
  }
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      try {
        const response = await fetch("/cloud-config.json", {
          cache: "no-store",
        });
        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("application/json")
        )
          return;
        const current = await response.json();
        if (
          !current.clientId ||
          !current.apiUrl ||
          !current.authDomain ||
          !current.region ||
          !current.userPoolId ||
          !current.websiteUrl
        )
          throw Error("Cloud configuration is incomplete.");
        setConfig(current);
        const callback = location.pathname === "/auth/callback";
        const signedIn = callback ? await finishSignIn(current) : readSession();
        if (
          signedIn &&
          (cloud ||
            callback ||
            sessionStorage.getItem("freshroute.mode") === "cloud")
        )
          await connect(current, signedIn);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const local = () => {
    setCloud(false);
    setRepository(null);
    sessionStorage.setItem("freshroute.mode", "local");
    history.replaceState({}, "", "/overview");
  };
  const enterCloud = async () => {
    sessionStorage.setItem("freshroute.mode", "cloud");
    setCloud(true);
    setError("");
    if (config && readSession()) {
      setLoading(true);
      try {
        await connect(config, readSession()!);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
  };
  return (
    <RuntimeContext.Provider
      value={{ repository, config, session, cloud: cloud && !!repository }}
    >
      {loading || (cloud && !repository) ? (
        <div className="cloud-entry">
          <a className="brand" href="/welcome">
            <Leaf /> FreshRoute
          </a>
          <div className="cloud-entry-grid">
            <section>
              <span className="eyebrow">YOUR NEXT CHAPTER, IN THE CLOUD</span>
              <h1>
                Fresh decisions.
                <br />
                <em>Connected workspace.</em>
              </h1>
              <p>
                Keep shipments, calculated analyses and your decision trail
                together behind a personal sign-in.
              </p>
              <div className="cloud-benefits">
                <span>
                  <ShieldCheck /> Cognito sign-in
                </span>
                <span>
                  <Database /> Owner-scoped records
                </span>
                <span>
                  <Cloud /> Server-calculated results
                </span>
              </div>
            </section>
            <section className="panel cloud-entry-card">
              <Cloud size={30} />
              <h2>
                {loading
                  ? "Opening your workspace..."
                  : "Welcome to FreshRoute Cloud"}
              </h2>
              <p>
                {config
                  ? `Your academic workspace in ${config.region}. Model assumptions remain illustrative.`
                  : "The local demo is ready. Cloud connection details will appear after deployment."}
              </p>
              {error && (
                <div className="notice amber" role="alert">
                  {error}
                </div>
              )}
              {!loading && config && (
                <button
                  className="button"
                  onClick={() => {
                    forgetSession();
                    startSignIn(config).catch((e) => setError(e.message));
                  }}
                >
                  Continue with secure sign-in <ArrowRight size={16} />
                </button>
              )}
              {!loading && (
                <button className="text-button" onClick={local}>
                  Explore the local demo
                </button>
              )}
              <small>
                Cloud sign-in opens Amazon Cognito. Enter your password there.
                Sessions last 15 minutes; this app stores no refresh token.
              </small>
            </section>
          </div>
        </div>
      ) : (
        <App key={repository ? "cloud" : "local"} />
      )}
      {!loading && !(cloud && !repository) && (
        <div className="cloud-switch">
          <span>
            <Cloud size={14} />
            {repository ? "AWS workspace" : "Local demo"}
          </span>
          {repository && config ? (
            <>
              <button
                onClick={() =>
                  repository
                    .refresh()
                    .then(() => location.reload())
                    .catch((e) => setError(e.message))
                }
                aria-label="Refresh cloud workspace"
              >
                <RefreshCw size={13} />
              </button>
              <button onClick={() => signOut(config)}>Sign out</button>
              <button onClick={local}>Local demo</button>
            </>
          ) : (
            <button onClick={enterCloud}>
              AWS sign-in <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}
    </RuntimeContext.Provider>
  );
}
