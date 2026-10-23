import { RouteMap } from "./components/RouteMap";
import { Workflow } from "lucide-react";
import { CloudOperations } from "./cloud/CloudOperations";
import { Fulfilment } from "./cloud/Fulfilment";
import { OutcomeAnalytics } from "./cloud/OutcomeAnalytics";
import { CloudEngineering } from "./cloud/CloudEngineering";
import { CloudData } from "./cloud/CloudData";
import { useCloud } from "./cloud/CloudRuntime";
import React, { useEffect, useState } from "react";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  FlaskConical,
  History,
  LayoutDashboard,
  Leaf,
  MapPin,
  Menu,
  Package,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Thermometer,
  Truck,
  X,
  TriangleAlert,
  RotateCcw,
  Network,
  FileText,
  CheckCircle2,
  Database,
  Pencil,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Dialog } from "./components/Dialog";
import { RescueWorkspace } from "./components/RescueWorkspace";
import { RunReview } from "./components/RunReview";
import { AnalysisHistory } from "./components/AnalysisHistory";
import type { Shipment } from "./fixtures";
import type { SavedShipment, Destination } from "./domain";
import { formatIST } from "./domain";
import { useWorkspace } from "./data/useWorkspace";
import { ShipmentForm } from "./components/ShipmentForm";
import { DestinationForm } from "./components/DestinationForm";
import { ShipmentHistory } from "./components/ShipmentHistory";
import { ShipmentRoute } from "./components/ShipmentRoute";
import { LocalData } from "./components/LocalData";

import { Welcome } from "./Welcome";
import { PresentationMode } from "./components/PresentationMode";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
const links: { label: string; path: string; icon: LucideIcon }[] = [
  { label: "Overview", path: "/overview", icon: LayoutDashboard },
  { label: "Shipments", path: "/shipments", icon: Truck },
  { label: "Rescue Lab", path: "/rescue/FR-101", icon: FlaskConical },
  { label: "Receiving network", path: "/network", icon: MapPin },
  { label: "History", path: "/history", icon: History },
  { label: "Local data", path: "/settings", icon: Database },
  { label: "Workflow hub", path: "/operations", icon: Workflow },
  { label: "Fulfilment", path: "/fulfilment", icon: Package },
  { label: "Outcome analytics", path: "/analytics", icon: FlaskConical },
];
function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0 });
}
function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}
function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) {
  return (
    <button
      {...props}
      className={`button ${secondary ? "secondary" : ""} ${props.className || ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Badge({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span className={`badge ${tone}`}>
      <span className="dot" />
      {children}
    </span>
  );
}
function Status({ status }: { status: Shipment["status"] }) {
  return (
    <Badge
      tone={
        status === "Needs attention"
          ? "red"
          : status === "Monitor"
            ? "amber"
            : "green"
      }
    >
      {status}
    </Badge>
  );
}
function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function PanelTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export default function App() {
  const runtime = useCloud();
  const cloud = runtime.cloud;
  const path = usePath();
  const [mobile, setMobile] = useState(false);
  const { workspace, repository, storageError, execute, refresh, pending } =
    useWorkspace();
  const { shipments, destinations, decisions } = workspace;
  const [editingShipment, setEditingShipment] = useState<
    SavedShipment | undefined
  >();
  const [editingDestination, setEditingDestination] = useState<
    Destination | undefined
  >();
  const [networkQuery, setNetworkQuery] = useState("");
  const [networkProduce, setNetworkProduce] = useState("All produce");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [produce, setProduce] = useState("All produce");
  const [sort, setSort] = useState("priority");
  const [modal, setModal] = useState<
    "new" | "edit" | "destination" | "notifications" | "guide" | null
  >(null);
  const [toast, setToast] = useState("");
  const [presenting, setPresenting] = useState(false);
  useEffect(() => {
    if (!mobile) return;
    const previous = document.activeElement as HTMLElement;
    const sidebar = document.getElementById("workspace-sidebar");
    const items = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>("a,button") || [],
      ).filter((el) => el.getClientRects().length > 0);
    items()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobile(false);
      if (event.key === "Tab") {
        const all = items();
        if (event.shiftKey && document.activeElement === all[0]) {
          event.preventDefault();
          all[all.length - 1]?.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === all[all.length - 1]
        ) {
          event.preventDefault();
          all[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [mobile]);
  useEffect(() => {
    setMobile(false);
    document.title = `${path.startsWith("/rescue") ? "Rescue Lab" : path.startsWith("/shipments/") ? "Shipment workspace" : path.includes("review") ? "Decision review" : path.startsWith("/runs/") ? "Saved analysis" : path === "/operations" ? "Workflow hub" : path === "/history" ? "History" : "Control center"} · FreshRoute`;
  }, [path]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);
  const routeRunId = path.startsWith("/runs/") ? path.split("/")[2] : undefined;
  const currentRun = workspace.analyses.find((run) => run.id === routeRunId);
  const shipmentId =
    currentRun?.shipmentId ||
    (path.startsWith("/shipments/") || path.startsWith("/rescue/")
      ? path.split("/")[2]
      : new URLSearchParams(window.location.search).get("shipment") ||
        "FR-101");
  const matchedShipment = shipments.find((s) => s.id === shipmentId);
  const shipment = matchedShipment || shipments[0];
  const isLab = path.startsWith("/rescue/") && !!matchedShipment;
  const isDetail = path.startsWith("/shipments/") && !!matchedShipment;
  const isReview = !!currentRun && path.endsWith("/review");
  const isSavedAnalysis = !!currentRun && !isReview;
  const isList = path === "/shipments";
  const known =
    path === "/" ||
    path === "/overview" ||
    isLab ||
    isDetail ||
    isReview ||
    isSavedAnalysis ||
    isList ||
    [
      "/history",
      "/network",
      "/evidence",
      "/settings",
      "/operations",
      "/fulfilment",
      "/analytics",
    ].includes(path);
  const filtered = shipments
    .filter(
      (s) =>
        (s.id + " " + s.produce + " " + s.destination)
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (filter === "All statuses" || s.status === filter) &&
        (produce === "All produce" || s.produce === produce),
    )
    .sort((a, b) =>
      sort === "quantity"
        ? b.quantity - a.quantity
        : sort === "id"
          ? a.id.localeCompare(b.id)
          : ["Needs attention", "Monitor", "On track"].indexOf(a.status) -
            ["Needs attention", "Monitor", "On track"].indexOf(b.status),
    );
  const notify = (text: string) => setToast(text);
  const networkMatches = destinations.filter(
    (d) =>
      (d.name + " " + d.type)
        .toLowerCase()
        .includes(networkQuery.toLowerCase()) &&
      (networkProduce === "All produce" ||
        d.acceptedProduce.includes(
          networkProduce as "Tomatoes" | "Bananas" | "Leafy greens",
        )),
  );
  const exportLocal = () => {
    const raw = repository.exportRaw();
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = cloud
      ? "freshroute-cloud-snapshot.json"
      : "freshroute-local-backup.json";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const table = (
    <>
      <div className="filters">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search shipments"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shipment, produce or destination…"
          />
        </div>
        <select
          aria-label="Filter by produce"
          value={produce}
          onChange={(e) => setProduce(e.target.value)}
        >
          <option>All produce</option>
          <option>Tomatoes</option>
          <option>Bananas</option>
          <option>Leafy greens</option>
        </select>
        <select
          aria-label="Filter by status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option>All statuses</option>
          <option>Needs attention</option>
          <option>Monitor</option>
          <option>On track</option>
        </select>
        <select
          aria-label="Sort shipments"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="priority">Priority first</option>
          <option value="quantity">Quantity ↓</option>
          <option value="id">Shipment ID</option>
        </select>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Shipment / produce</th>
              <th>Destination</th>
              <th>Quantity</th>
              <th>Temperature</th>
              <th>Status</th>
              <th>
                <span className="sr-only">Open shipment</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>
                  <button
                    className="shipment-link"
                    onClick={() => navigate(`/shipments/${s.id}`)}
                  >
                    <span
                      className="produce-icon"
                      style={{ background: s.color }}
                    >
                      {s.icon}
                    </span>
                    <span>
                      <strong>{s.produce}</strong>
                      <small>{s.id}</small>
                    </span>
                  </button>
                </td>
                <td>
                  <span className="table-destination">{s.destination}</span>
                  <small>Arrival {s.eta} IST</small>
                </td>
                <td>
                  {s.quantity.toLocaleString("en-IN")}{" "}
                  <span className="muted">kg</span>
                </td>
                <td>
                  <span className={s.temperature >= 18 ? "warm" : ""}>
                    {s.temperature}°C
                  </span>
                </td>
                <td>
                  <Status status={s.status} />
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`Inspect ${s.id}`}
                    onClick={() => navigate(`/shipments/${s.id}`)}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="empty-state">
          <Search />
          <h3>No matching shipments</h3>
          <p>Try another search or clear the filters.</p>
        </div>
      )}
      {(query || filter !== "All statuses" || produce !== "All produce") && (
        <button
          className="text-button clear-filters"
          onClick={() => {
            setQuery("");
            setFilter("All statuses");
            setProduce("All produce");
          }}
        >
          Clear all filters <X size={13} />
        </button>
      )}
    </>
  );
  if (path === "/welcome" || path === "/sign-in") {
    return <Welcome onEnter={() => navigate("/overview")} />;
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {mobile && (
        <div className="nav-backdrop" onClick={() => setMobile(false)} />
      )}
      <aside
        id="workspace-sidebar"
        className={`sidebar ${mobile ? "open" : ""}`}
      >
        <button
          className="icon-button nav-close"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X size={19} />
        </button>
        <a
          href="/overview"
          className="brand"
          aria-label="FreshRoute overview"
          onClick={(e) => {
            e.preventDefault();
            navigate("/overview");
          }}
        >
          <span className="brand-icon">
            <Leaf size={26} />
          </span>
          <span>
            FreshRoute
            <span className="brand-sub">LESS WASTE. MORE POSSIBILITY.</span>
          </span>
        </a>
        <div className="workspace-switch">
          <span className="workspace-letter">N</span>
          <div>
            <strong>Naroda workspace</strong>
            <small>Distributor · demo</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {links.map(({ label, path: href, icon: Icon }, i) => (
            <React.Fragment key={label}>
              {i === 3 && (
                <div className="nav-caption operations">OPERATIONS</div>
              )}
              <a
                href={href}
                aria-label={label}
                title={label}
                aria-current={
                  (
                    href === "/rescue/FR-101"
                      ? isLab
                      : href === "/shipments"
                        ? isList || isDetail
                        : path === href ||
                          (href === "/overview" && path === "/")
                  )
                    ? "page"
                    : undefined
                }
                onClick={(e) => {
                  e.preventDefault();

                  navigate(href);
                }}
              >
                <Icon size={19} />
                <span>{label}</span>
                {label === "Shipments" && <b>{shipments.length}</b>}
                {label === "Rescue Lab" && <span className="nav-new">LAB</span>}
              </a>
            </React.Fragment>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div className="small-leaf">
              <Leaf size={18} />
            </div>
            <strong>Every shipment matters.</strong>
            <p>A better decision starts with seeing the possibilities.</p>
            <button onClick={() => setModal("guide")}>
              Explore the walkthrough <ArrowRight size={14} />
            </button>
            <button
              onClick={() => {
                setPresenting(true);
                setMobile(false);
              }}
            >
              Seven-minute presentation <ArrowRight size={14} />
            </button>
          </div>
          <a
            className={
              path === "/evidence" ? "evidence-link active" : "evidence-link"
            }
            href="/evidence"
            onClick={(e) => {
              e.preventDefault();
              navigate("/evidence");
            }}
          >
            <Network size={18} />
            Cloud & project evidence
            <ArrowUpRight size={14} />
          </a>
          <div className="user">
            <span className="avatar">FR</span>
            <div>
              <strong>{cloud ? "Cloud operator" : "Demo operator"}</strong>
              <small>
                {cloud ? runtime.config?.region : "Local prototype"}
              </small>
            </div>
            <span className="online-dot" />
            <button
              className="icon-button entry-link"
              aria-label="Open demo entry"
              title="Open demo entry"
              onClick={() => navigate("/welcome")}
            >
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="app">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-controls="workspace-sidebar"
              aria-expanded={mobile}
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {isSavedAnalysis
                ? "Saved analysis"
                : isLab
                  ? "Rescue Lab"
                  : isDetail
                    ? "Shipment detail"
                    : isReview
                      ? "Decision review"
                      : isList
                        ? "Shipments"
                        : path === "/history"
                          ? "History"
                          : path === "/network"
                            ? "Receiving network"
                            : path === "/evidence"
                              ? "Project evidence"
                              : path === "/operations"
                                ? "Workflow hub"
                                : path === "/fulfilment"
                                  ? "Fulfilment"
                                  : path === "/analytics"
                                    ? "Outcome analytics"
                                    : path === "/settings"
                                      ? cloud
                                        ? "Cloud data"
                                        : "Local data"
                                      : "Overview"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="demo-chip">
              <span />
              {cloud ? "AWS workspace" : "Demo workspace"}
            </span>
            <span className="topbar-divider" />
            <button
              className="icon-button"
              aria-label="Open walkthrough guide"
              onClick={() => setModal("guide")}
            >
              <CircleHelp size={19} />
            </button>
            <button
              className="icon-button notification-button"
              aria-label={
                cloud ? "View rescue notifications" : "View demo notifications"
              }
              onClick={() =>
                cloud ? navigate("/fulfilment") : setModal("notifications")
              }
            >
              <Bell size={19} />
              <i />
            </button>
            <span className="avatar small">FR</span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="prototype-strip">
            <FlaskConical size={14} />
            <span>
              {pending
                ? "Saving changes... wait for confirmation."
                : cloud
                  ? "AWS workspace: private records, shared receiving capacity and explainable model results. Copilot availability is shown with each response."
                  : "Local demo: calculations and saved work stay in this browser. Use AWS sign-in to open the cloud workspace."}
            </span>
            <span className="prototype-version">
              {cloud ? "AWS WORKSPACE" : "INTERACTIVE DEMO"}
            </span>
          </div>
          {storageError && (
            <div className="notice amber" role="alert">
              <TriangleAlert size={18} />
              <div>
                <p>{storageError}</p>
                <button
                  className="text-button"
                  onClick={() => navigate("/settings")}
                >
                  Open local data and recovery <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
          {!known && (
            <div className="empty-state">
              <h1>This page isn’t available</h1>
              <Button onClick={() => navigate("/overview")}>
                Return to overview
              </Button>
            </div>
          )}
          {(path === "/" || path === "/overview") && (
            <>
              <Heading
                eyebrow="YOUR RESCUE CONTROL CENTER"
                title="Good things shouldn’t go to waste."
                description="A clearer view of your shipments. A better next move."
                action={
                  <Button
                    onClick={() => {
                      setEditingShipment(undefined);
                      setModal("new");
                    }}
                  >
                    <Plus size={17} />
                    New shipment
                  </Button>
                }
              />
              <section className="hero-banner">
                <div>
                  <span className="hero-kicker">
                    <span />
                    INCIDENT REVIEW · FR-101
                  </span>
                  <h2>
                    Fresh produce.
                    <br />A clearer way forward.
                  </h2>
                  <p>
                    FR-101 needs a closer look. Explore cooling and nearby
                    <br className="desktop-break" /> destinations before
                    choosing the next step.
                  </p>
                  <button
                    onClick={() => {
                      navigate("/rescue/FR-101");
                    }}
                  >
                    Explore rescue options <ArrowUpRight size={17} />
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="art-orbit" />
                  <div className="art-leaf leaf-one" />
                  <div className="art-leaf leaf-two" />
                  <div className="art-crate crate-back">
                    <span>FRESH</span>
                  </div>
                  <div className="art-crate crate-front">
                    <div className="tomato t1" />
                    <div className="tomato t2" />
                    <div className="tomato t3" />
                    <div className="tomato t4" />
                    <div className="crate-lines" />
                    <span>FRESHROUTE · HANDLE WITH CARE</span>
                  </div>
                  <div className="art-sticker">
                    <Leaf size={17} />
                    <span>
                      Made for
                      <br />
                      <strong>better decisions</strong>
                    </span>
                  </div>
                </div>
              </section>
              <section
                className="metric-grid"
                aria-label="Shipment workspace metrics"
              >
                {[
                  {
                    label: "Active shipments",
                    value: String(shipments.length).padStart(2, "0"),
                    sub: cloud
                      ? "In your AWS workspace"
                      : "In this demo workspace",
                    icon: Truck,
                    tone: "green",
                  },
                  {
                    label: "Needs attention",
                    value: String(
                      shipments.filter((s) => s.status === "Needs attention")
                        .length,
                    ).padStart(2, "0"),
                    sub: "Review the next best action",
                    icon: TriangleAlert,
                    tone: "amber",
                  },
                  {
                    label: "Produce in transit",
                    value: shipments
                      .reduce((a, s) => a + s.quantity, 0)
                      .toLocaleString("en-IN"),
                    unit: "kg",
                    sub: "Across fictional shipments",
                    icon: Package,
                    tone: "blue",
                  },
                  {
                    label: "Local selections",
                    value: String(decisions.length).padStart(2, "0"),
                    sub: "Calculated plans + legacy samples",
                    icon: CheckCheck,
                    tone: "green",
                  },
                ].map(({ label, value, sub, icon: Icon, tone, unit }) => (
                  <article className="metric-card" key={label}>
                    <div className="metric-label">
                      {label}
                      <span className={`metric-icon ${tone}`}>
                        <Icon size={18} />
                      </span>
                    </div>
                    <div className="metric-value">
                      {value}
                      <small>{unit}</small>
                    </div>
                    <p>{sub}</p>
                  </article>
                ))}
              </section>
              <section
                className="workspace-shortcuts"
                aria-label="Explore your workspace"
              >
                {[
                  {
                    icon: FlaskConical,
                    label: "Rescue Lab",
                    detail: "Compare the next best move",
                    href: "/rescue/FR-101",
                  },
                  {
                    icon: MapPin,
                    label: "Receiving network",
                    detail: "Find capacity and produce rules",
                    href: "/network",
                  },
                  {
                    icon: History,
                    label: "Saved analyses",
                    detail: "Revisit the evidence behind a plan",
                    href: "/history",
                  },
                ].map(({ icon: Icon, label, detail, href }) => (
                  <button key={href} onClick={() => navigate(href)}>
                    <span className="shortcut-icon">
                      <Icon size={21} />
                    </span>
                    <span>
                      <strong>{label}</strong>
                      <small>{detail}</small>
                    </span>
                    <ArrowUpRight size={18} />
                  </button>
                ))}
              </section>
              <section className="panel shipment-panel">
                <PanelTitle
                  title="Shipments to keep an eye on"
                  subtitle="The most important details, all in one place."
                  action={
                    <button
                      className="text-button"
                      onClick={() => navigate("/shipments")}
                    >
                      View all shipments <ArrowRight size={15} />
                    </button>
                  }
                />
                {table}
              </section>
              <div className="lower-grid">
                <section className="panel">
                  <PanelTitle
                    title="A network of possibilities"
                    subtitle="Explore the fictional receiving network."
                    action={
                      <button
                        className="icon-button"
                        aria-label="Open receiving network"
                        onClick={() => navigate("/network")}
                      >
                        <ArrowUpRight size={19} />
                      </button>
                    }
                  />
                  <RouteMap compact />
                </section>
                <section className="panel next-panel">
                  <PanelTitle
                    title="Your next steps"
                    subtitle="Follow a shipment from incident to decision."
                  />
                  <div className="step-item">
                    <span className="step-number">01</span>
                    <div>
                      <strong>Start with the shipment</strong>
                      <p>Review the temperature and delay.</p>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="Review FR-101"
                      onClick={() => navigate("/shipments/FR-101")}
                    >
                      <ArrowRight size={17} />
                    </button>
                  </div>
                  <div className="step-item">
                    <span className="step-number">02</span>
                    <div>
                      <strong>Compare the possibilities</strong>
                      <p>See trade-offs in the Rescue Lab.</p>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="Compare rescue possibilities"
                      onClick={() => {
                        navigate("/rescue/FR-101");
                      }}
                    >
                      <ArrowRight size={17} />
                    </button>
                  </div>
                  <div className="step-item">
                    <span className="step-number">03</span>
                    <div>
                      <strong>Make an informed choice</strong>
                      <p>Save an analysis, then review a local plan.</p>
                    </div>
                    <ShieldCheck size={18} className="muted" />
                  </div>
                </section>
              </div>
            </>
          )}
          {isList && (
            <>
              <Heading
                eyebrow="SHIPMENT WORKSPACE"
                title="Every delivery, in view."
                description="Find a shipment, inspect its conditions and explore what comes next."
                action={
                  <Button
                    onClick={() => {
                      setEditingShipment(undefined);
                      setModal("new");
                    }}
                  >
                    <Plus size={17} />
                    New shipment
                  </Button>
                }
              />
              <section className="panel">
                <PanelTitle
                  title="All shipments"
                  subtitle={`${shipments.length} fictional shipments · saved locally after changes`}
                />
                {table}
              </section>
            </>
          )}
          {isDetail && (
            <>
              <button
                className="text-button back"
                onClick={() => navigate("/shipments")}
              >
                <ArrowLeft size={15} />
                All shipments
              </button>
              <Heading
                eyebrow={`SHIPMENT ${shipment.id}`}
                title={`${shipment.produce}, with possibilities.`}
                description={`${shipment.quantity} kg · ${shipment.origin} → ${shipment.destination}`}
                action={
                  <div className="heading-actions">
                    <Button
                      secondary
                      onClick={() => {
                        setEditingShipment(shipment);
                        setModal("edit");
                      }}
                    >
                      <Pencil size={15} />
                      Edit shipment
                    </Button>
                    <Button
                      onClick={() => {
                        navigate(`/rescue/${shipment.id}`);
                      }}
                    >
                      Open Rescue Lab <FlaskConical size={17} />
                    </Button>
                  </div>
                }
              />
              <div className="detail-summary">
                <span
                  className="produce-icon large"
                  style={{ background: shipment.color }}
                >
                  {shipment.icon}
                </span>
                <div>
                  <strong>{shipment.id}</strong>
                  <p>Local demo shipment · operator-managed</p>
                </div>
                <Status status={shipment.status} />
                <span className="last-updated">
                  Version {shipment.version} · updated{" "}
                  {formatIST(shipment.updatedAt)} IST
                </span>
              </div>
              <div className="detail-grid">
                <ShipmentRoute
                  shipment={shipment}
                  destination={destinations.find(
                    (d) => d.id === shipment.destinationId,
                  )}
                />
              </div>
              <ShipmentHistory shipment={shipment} />
            </>
          )}
          {(isLab || isSavedAnalysis) && (
            <RescueWorkspace
              key={currentRun?.id || shipment.id}
              shipment={shipment}
              destinations={destinations}
              shipments={shipments}
              saved={isSavedAnalysis ? currentRun : undefined}
              repository={repository}
              execute={execute}
              onBack={() =>
                navigate(
                  isSavedAnalysis ? "/history" : `/shipments/${shipment.id}`,
                )
              }
              onShipment={(id) => navigate(`/rescue/${id}`)}
              onOpen={(id, candidate) =>
                navigate(
                  `/runs/${id}${candidate ? "?candidate=" + encodeURIComponent(candidate) : ""}`,
                )
              }
              onReview={(id, candidate) =>
                navigate(
                  `/runs/${id}/review?candidate=${encodeURIComponent(candidate)}`,
                )
              }
            />
          )}
          {isReview && currentRun && (
            <RunReview
              key={currentRun.id}
              run={currentRun}
              candidateId={
                new URLSearchParams(window.location.search).get("candidate") ||
                currentRun.result.winnerId ||
                ""
              }
              currentShipment={matchedShipment}
              destinations={destinations}
              repository={repository}
              execute={execute}
              onBack={() => navigate(`/runs/${currentRun.id}`)}
              onConfirmed={() => {
                navigate(cloud ? "/fulfilment" : "/history");
                notify(
                  cloud
                    ? "Receiving capacity reserved. Report and notification queued."
                    : "Calculated local plan saved. No capacity was reserved and no notification was sent.",
                );
              }}
            />
          )}
          {path === "/history" && (
            <AnalysisHistory
              analyses={workspace.analyses}
              decisions={decisions}
              onOpen={(id) => navigate(`/runs/${id}`)}
              onNew={() => navigate("/rescue/FR-101")}
              onShipment={(id) => navigate(`/shipments/${id}`)}
            />
          )}
          {path === "/network" && (
            <>
              <Heading
                eyebrow="CLOSER CONNECTIONS"
                title="A destination for every possibility."
                description="Explore fictional receiving partners, their produce rules and illustrative capacity."
              />
              <section className="panel network-map">
                <PanelTitle
                  title="Ahmedabad receiving network"
                  subtitle="Illustrative routes between fictional receiving partners. Explore produce rules and capacity below."
                />
                <RouteMap />
              </section>
              <div className="network-toolbar">
                <div className="search-field">
                  <Search size={16} />
                  <input
                    aria-label="Search receiving network"
                    placeholder="Search destination or partner type…"
                    value={networkQuery}
                    onChange={(e) => setNetworkQuery(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Filter receiving network by produce"
                  value={networkProduce}
                  onChange={(e) => setNetworkProduce(e.target.value)}
                >
                  <option>All produce</option>
                  <option>Tomatoes</option>
                  <option>Bananas</option>
                  <option>Leafy greens</option>
                </select>
              </div>
              <div className="network-result-count">
                {networkMatches.length} receiving destinations match your
                filters.
              </div>
              <div className="network-cards">
                {networkMatches.length === 0 && (
                  <div className="empty-state network-empty">
                    <MapPin size={26} />
                    <h2>No matching destinations</h2>
                    <p>Try a different destination or produce filter.</p>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setNetworkQuery("");
                        setNetworkProduce("All produce");
                      }}
                    >
                      Clear network filters
                    </button>
                  </div>
                )}
                {networkMatches.map((d) => (
                  <section className="panel destination-card" key={d.name}>
                    <span className="destination-icon">
                      <MapPin size={22} />
                    </span>
                    <Badge>Fictional partner</Badge>
                    <h2>{d.name}</h2>
                    <p>{d.type}</p>
                    <div className="summary-line">
                      <span>Available / total capacity</span>
                      <strong>
                        {d.capacity - d.reservedKg} / {d.capacity} kg
                      </strong>
                    </div>
                    <div className="summary-line">
                      <span>Receiving hours (IST)</span>
                      <strong>
                        {d.opensAt}–{d.closesAt}
                      </strong>
                    </div>
                    <p className="fine-print">
                      Accepts: {d.acceptedProduce.join(", ")}
                      <br />
                      {d.reservedKg} kg reserved · rule version {d.version}
                    </p>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setEditingDestination(d);
                        setModal("destination");
                      }}
                      disabled={cloud && !runtime.session?.administrator}
                      title={
                        cloud && !runtime.session?.administrator
                          ? "Administrator access required"
                          : undefined
                      }
                    >
                      <Pencil size={14} />
                      Edit receiving rules
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        navigate("/rescue/FR-101");
                      }}
                    >
                      Explore a rescue scenario <ArrowRight size={14} />
                    </button>
                  </section>
                ))}
              </div>
            </>
          )}
          {path === "/operations" && (
            <CloudOperations onNavigate={navigate} onSync={refresh} />
          )}
          {path === "/fulfilment" && (
            <Fulfilment onNavigate={navigate} onSync={refresh} />
          )}
          {path === "/analytics" && <OutcomeAnalytics />}
          {path === "/settings" &&
            (cloud ? (
              <CloudData
                workspace={workspace}
                onExport={exportLocal}
                onReload={refresh}
              />
            ) : (
              <LocalData
                workspace={workspace}
                error={storageError}
                onExport={exportLocal}
                onReset={async () => {
                  await execute(() => repository.reset());
                  notify(
                    "Local workspace reset to the original fictional demo.",
                  );
                }}
                onRetry={refresh}
              />
            ))}
          {path === "/evidence" && <CloudEngineering />}
          <footer className="footer">
            <span>
              <Leaf size={13} />
              FreshRoute · Thoughtful decisions, fresher possibilities.
            </span>
            <span>Academic prototype · Phase 9</span>
          </footer>
        </main>
      </div>
      {modal && (
        <Dialog
          wide={modal === "new" || modal === "edit" || modal === "destination"}
          title={
            modal === "new"
              ? "Create shipment"
              : modal === "edit"
                ? `Edit ${editingShipment?.id || "shipment"}`
                : modal === "destination"
                  ? "Edit receiving rules"
                  : modal === "notifications"
                    ? "Workspace notifications"
                    : "Your FreshRoute walkthrough"
          }
          onClose={() => {
            setModal(null);
          }}
        >
          {modal === "new" || modal === "edit" ? (
            <ShipmentForm
              shipment={modal === "edit" ? editingShipment : undefined}
              destinations={destinations}
              draft={workspace.drafts.find(
                (d) =>
                  d.key ===
                  (modal === "edit" ? `edit:${editingShipment?.id}` : "new"),
              )}
              repository={repository}
              execute={execute}
              onNotify={notify}
              onCancel={() => setModal(null)}
              onSaved={(id) => {
                setModal(null);
                navigate(`/shipments/${id}`);
                notify(
                  cloud
                    ? "Shipment saved to AWS."
                    : "Shipment saved locally. It will remain after refresh.",
                );
              }}
            />
          ) : modal === "destination" && editingDestination ? (
            <DestinationForm
              destination={editingDestination}
              onCancel={() => setModal(null)}
              onSave={async (value) => {
                await execute(() =>
                  repository.saveDestination(value, editingDestination.version),
                );
                setModal(null);
                notify(
                  cloud
                    ? "Receiving rules saved to your AWS workspace."
                    : "Receiving rules saved locally. No reservations or comparisons were changed.",
                );
              }}
            />
          ) : modal === "notifications" ? (
            <>
              <div className="notification-item">
                <span className="metric-icon amber">
                  <TriangleAlert size={20} />
                </span>
                <div>
                  <strong>FR-101 is ready for review</strong>
                  <p>
                    A delay is included in this shipment fixture. Inspect the
                    conditions and explore alternatives.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => {
                      setModal(null);
                      navigate("/shipments/FR-101");
                    }}
                  >
                    Open shipment <ArrowRight size={14} />
                  </button>
                </div>
              </div>
              <p className="fine-print">
                Authored demo notification. No alert service is connected.
              </p>
            </>
          ) : (
            <>
              <p className="dialog-intro">
                One shipment. A few possibilities. A clearer decision.
              </p>
              {[
                "Inspect a shipment and its entered temperature history.",
                "Adjust assumptions and calculate alternatives in the Rescue Lab.",
                "Save the analysis snapshot and review a feasible option.",
                "Save a local plan and reopen its source analysis in history.",
              ].map((s, i) => (
                <div className="guide-step" key={s}>
                  <span className="step-number">0{i + 1}</span>
                  <p>{s}</p>
                </div>
              ))}
              <div className="notice blue">
                <FlaskConical size={18} />
                <p>
                  {cloud
                    ? "Your signed-in workspace uses AWS persistence, workflows and AI. "
                    : "This walkthrough uses browser-local calculations; use AWS sign-in for cloud features. "}
                  Parameters and shipment data are illustrative, not food-safety
                  assessments.
                </p>
              </div>
              <Button
                onClick={() => {
                  setModal(null);
                  navigate("/shipments/FR-101");
                }}
              >
                Start the walkthrough <ArrowRight size={16} />
              </Button>
            </>
          )}
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {presenting && (
        <PresentationMode
          shipmentId={
            shipments.find((s) => s.id === "FR-101")?.id || shipments[0]?.id
          }
          runId={workspace.analyses[0]?.id}
          cloud={cloud}
          onNavigate={navigate}
          onClose={() => setPresenting(false)}
        />
      )}
    </>
  );
}
