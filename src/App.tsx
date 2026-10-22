import React, { useEffect, useRef, useState } from "react";

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
import { candidates } from "./fixtures";
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
function RouteMap({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`route-map ${compact ? "compact" : ""}`}>
      <div className="map-grid" />
      <svg
        viewBox="0 0 700 300"
        role="img"
        aria-label="Fictional route schematic from Naroda hub through a delay checkpoint to two receiving destinations. Not a road navigation map."
      >
        <path
          className="river"
          d="M310 -30C250 30 350 85 300 130S270 215 350 330"
        />
        <g className="roads">
          <path d="M0 80L700 170M20 240L650 20M100 0L220 300M490 0L430 300M0 160L700 90" />
          <path d="M0 85L700 175M25 245L655 25" />
        </g>
        <path
          className="map-original"
          d="M130 190C210 210 240 140 350 140S440 220 555 215"
        />
        <path className="map-alternative" d="M350 140Q435 62 555 65" />
        <g>
          <circle cx="130" cy="190" r="9" className="map-node" />
          <circle cx="350" cy="140" r="12" className="map-warning" />
          <circle cx="555" cy="65" r="9" className="map-node" />
          <circle cx="555" cy="215" r="9" className="map-node pale" />
        </g>
        <g className="map-label">
          <text x="74" y="225">
            Naroda hub
          </text>
          <text x="302" y="114">
            Delay checkpoint
          </text>
          <text x="476" y="42">
            Eastside center
          </text>
          <text x="480" y="248">
            Central market
          </text>
        </g>
        <g transform="translate(329,129)">
          <rect width="42" height="24" rx="7" fill="#bc6940" />
          <path
            d="M10 7h13v9H10zm13 4h7l3 5H23"
            fill="none"
            stroke="white"
            strokeWidth="2"
          />
        </g>
      </svg>
      <span className="map-tag">
        <MapPin size={12} /> Ahmedabad · fictional network
      </span>
      {!compact && (
        <div className="map-key">
          <span>
            <i />
            Original route
          </span>
          <span>
            <i className="dashed" />
            Nearby alternative
          </span>
        </div>
      )}
    </div>
  );
}
function QualityChart({ temperature = false }: { temperature?: boolean }) {
  return (
    <div className="chart">
      <svg
        viewBox="0 0 680 230"
        role="img"
        aria-label={
          temperature
            ? "Illustrative temperature history rising from 10 to 18 degrees Celsius over six hours."
            : "Fixture quality comparison: original route ends at 48, cooling 69, redirect 82. These are display fixtures, not calculated predictions."
        }
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#83b991" stopOpacity=".23" />
            <stop offset="1" stopColor="#83b991" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[35, 80, 125, 170].map((y, i) => (
          <g key={y}>
            <line
              x1="42"
              y1={y}
              x2="652"
              y2={y}
              stroke="#e8ece6"
              strokeDasharray="4 4"
            />
            <text x="7" y={y + 4}>
              {temperature ? [22, 18, 14, 10][i] : [100, 80, 60, 40][i]}
            </text>
          </g>
        ))}
        {temperature ? (
          <>
            <path
              d="M44 165L145 160L245 143L345 143L445 84L550 80L650 80L650 185L44 185Z"
              fill="url(#chartFill)"
            />
            <path
              d="M44 165L145 160L245 143L345 143L445 84L550 80L650 80"
              fill="none"
              stroke="#b77b37"
              strokeWidth="3"
            />
          </>
        ) : (
          <>
            <path
              d="M44 38C220 40 380 50 650 78L650 185L44 185Z"
              fill="url(#chartFill)"
            />
            <path
              d="M44 38C220 40 380 50 650 78"
              fill="none"
              stroke="#377654"
              strokeWidth="3"
            />
            <path
              d="M44 38C240 48 350 90 650 110"
              fill="none"
              stroke="#839a75"
              strokeWidth="3"
            />
            <path
              d="M44 38C200 58 400 130 650 154"
              fill="none"
              stroke="#c88b65"
              strokeWidth="3"
              strokeDasharray="6 5"
            />
          </>
        )}
        {["Now", "+1h", "+2h", "+3h", "+4h", "+5h"].map((s, i) => (
          <text key={s} x={43 + i * 119} y="210">
            {temperature ? `${i + 8}:00` : s}
          </text>
        ))}
      </svg>
      <div className="chart-legend">
        {temperature ? (
          <span>
            <i style={{ background: "#b77b37" }} />
            Temperature (°C) · illustrative history
          </span>
        ) : (
          <>
            <span>
              <i style={{ background: "#377654" }} />
              Redirect nearby
            </span>
            <span>
              <i style={{ background: "#839a75" }} />
              Improve cooling
            </span>
            <span>
              <i style={{ background: "#c88b65" }} />
              Original route
            </span>
          </>
        )}
      </div>
    </div>
  );
}
function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  wide?: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = ref.current;
    const focusables = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button,input,select,textarea,[tabindex="0"]',
        ) || [],
      );
    focusables()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const all = focusables();
        const first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = priorOverflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`dialog ${wide ? "wide-dialog" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <div className="dialog-title">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const path = usePath();
  const [mobile, setMobile] = useState(false);
  const { workspace, repository, storageError, execute, refresh } =
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
  const [copilot, setCopilot] = useState(false);
  const [modal, setModal] = useState<
    "new" | "edit" | "destination" | "notifications" | "guide" | null
  >(null);
  const [selected, setSelected] = useState("reroute");
  const [budget, setBudget] = useState(800);
  const [delay, setDelay] = useState(3);
  const [temperature, setTemperature] = useState(18);
  const [fixtureLoaded, setFixtureLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
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
    document.title = `${path.startsWith("/rescue") ? "Rescue Lab" : path.startsWith("/shipments/") ? "Shipment workspace" : path.includes("review") ? "Decision review" : path === "/history" ? "History" : "Control center"} · FreshRoute`;
  }, [path]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);
  const shipmentId =
    path.startsWith("/shipments/") || path.startsWith("/rescue/")
      ? path.split("/")[2]
      : new URLSearchParams(window.location.search).get("shipment") || "FR-101";
  const matchedShipment = shipments.find((s) => s.id === shipmentId);
  const shipment = matchedShipment || shipments[0];
  const candidate = candidates.find((c) => c.id === selected)!;
  const isLab = path.startsWith("/rescue/") && !!matchedShipment;
  const isDetail = path.startsWith("/shipments/") && !!matchedShipment;
  const isReview = path.startsWith("/runs/sample-") && path.endsWith("/review");
  const isList = path === "/shipments";
  const known =
    path === "/" ||
    path === "/overview" ||
    isLab ||
    isDetail ||
    isReview ||
    isList ||
    ["/history", "/network", "/evidence", "/settings"].includes(path);
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
  const safely = (operation: () => void) => {
    try {
      operation();
    } catch (error) {
      notify((error as Error).message);
    }
  };
  const exportLocal = () => {
    const raw = repository.exportRaw();
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "freshroute-local-backup.json";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const changeFixture = () => setFixtureLoaded(false);
  const reset = () => {
    setDelay(3);
    setBudget(800);
    setTemperature(18);
    setSelected("reroute");
    setFixtureLoaded(false);
  };
  const fixtureMatches =
    delay === 3 &&
    temperature === 18 &&
    shipment.id === "FR-101" &&
    shipment.quantity === 500 &&
    shipment.version === 1;
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
                  if (isLab && href.startsWith("/rescue")) reset();
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
            <span className="avatar">DK</span>
            <div>
              <strong>Demo operator</strong>
              <small>Local prototype</small>
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
              {isLab
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
                            : path === "/settings"
                              ? "Local data"
                              : "Overview"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="demo-chip">
              <span />
              Demo workspace
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
              aria-label="View demo notifications"
              onClick={() => setModal("notifications")}
            >
              <Bell size={19} />
              <i />
            </button>
            <span className="avatar small">DK</span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="prototype-strip">
            <FlaskConical size={14} />
            <span>
              Phase 2 local workspace · Shipments, drafts and rules save in this
              browser. Rescue comparisons remain fixtures; no AWS or live AI
              connected.
            </span>
            <span className="prototype-version">DESIGN PREVIEW</span>
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
                    YOUR NEXT BEST MOVE
                  </span>
                  <h2>
                    A small detour.
                    <br />A fresh possibility.
                  </h2>
                  <p>
                    FR-101 needs a closer look. Explore cooling and nearby
                    <br className="desktop-break" /> destinations before
                    choosing the next step.
                  </p>
                  <button
                    onClick={() => {
                      reset();
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
                    <span>HANDLE WITH POSSIBILITY</span>
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
                aria-label="Demo shipment metrics"
              >
                {[
                  {
                    label: "Active shipments",
                    value: String(shipments.length).padStart(2, "0"),
                    sub: "In this demo workspace",
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
                    label: "Demo decisions",
                    value: String(decisions.length).padStart(2, "0"),
                    sub: "Sample decisions · saved locally",
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
                        reset();
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
                      <p>Review a sample plan before confirming.</p>
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
                        reset();
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
          {isLab && (
            <>
              <button
                className="text-button back"
                onClick={() => navigate(`/shipments/${shipment.id}`)}
              >
                <ArrowLeft size={15} />
                Back to {shipment.id}
              </button>
              <Heading
                eyebrow="EXPLORE BEFORE YOU DECIDE"
                title="A better next move starts here."
                description={`${shipment.icon} ${shipment.produce} · ${shipment.quantity} kg · ${shipment.id}`}
                action={
                  <Button secondary onClick={() => setCopilot(true)}>
                    <Sparkles size={16} />
                    Explain the sample
                  </Button>
                }
              />
              <div className="lab-grid">
                <section className="panel lab-controls">
                  <PanelTitle
                    title="What if…"
                    subtitle="Adjust the scenario inputs."
                  />
                  <label className="range-label" htmlFor="delay">
                    Additional delay <strong>{delay} hours</strong>
                  </label>
                  <input
                    id="delay"
                    type="range"
                    min="0"
                    max="8"
                    step="1"
                    value={delay}
                    onChange={(e) => {
                      setDelay(+e.target.value);
                      changeFixture();
                    }}
                  />
                  <div className="range-ends">
                    <span>0 hours</span>
                    <span>8 hours</span>
                  </div>
                  <label className="range-label" htmlFor="temperature">
                    Temperature <strong>{temperature}°C</strong>
                  </label>
                  <input
                    id="temperature"
                    type="range"
                    min="4"
                    max="30"
                    value={temperature}
                    onChange={(e) => {
                      setTemperature(+e.target.value);
                      changeFixture();
                    }}
                  />
                  <div className="range-ends">
                    <span>4°C</span>
                    <span>30°C</span>
                  </div>
                  <label className="field-label" htmlFor="budget">
                    Rescue budget (₹)
                  </label>
                  <input
                    className="budget-input"
                    id="budget"
                    type="number"
                    min="0"
                    max="10000"
                    value={budget}
                    onChange={(e) => {
                      setBudget(Math.max(0, Math.min(10000, +e.target.value)));
                      changeFixture();
                    }}
                  />
                  <div className="controls-separator" />
                  <div className="field-label">Sample ranking priority</div>
                  <div className="priority-pill">
                    <Leaf size={15} />
                    Preserve quality <Check size={14} />
                  </div>
                  <p className="fine-print">
                    A fixed comparison fixture. Real calculations and
                    customizable ranking arrive in Phase 3.
                  </p>
                  <Button
                    onClick={() => {
                      if (fixtureMatches) {
                        setFixtureLoaded(true);
                        notify(
                          "Static comparison fixture loaded. No model or cloud job was run.",
                        );
                      } else
                        notify(
                          "No calculation engine yet. Restore the FR-101 sample inputs to load its fixture.",
                        );
                    }}
                  >
                    <FlaskConical size={16} />
                    Load sample comparison
                  </Button>
                  <button className="text-button reset-button" onClick={reset}>
                    <RotateCcw size={14} />
                    Restore sample inputs
                  </button>
                </section>
                <div className="lab-results">
                  <div className="results-meta">
                    <Badge tone={fixtureLoaded ? "green" : "amber"}>
                      {fixtureLoaded
                        ? "Fixture loaded"
                        : "Unsaved input preview"}
                    </Badge>
                    <span>Display fixture v0.1 · not a prediction</span>
                  </div>
                  {!fixtureMatches && (
                    <div className="notice amber">
                      <TriangleAlert size={18} />
                      <p>
                        These inputs have no matching fixture. The comparisons
                        below stay fixed for FR-101 (500 kg, +3h, 18°C); they do
                        not recalculate. Restore that sample to review a plan.
                      </p>
                    </div>
                  )}
                  <div className="candidate-grid">
                    {candidates.map((c, i) => {
                      const available = c.cost <= budget;
                      return (
                        <button
                          key={c.id}
                          className={`candidate-card ${selected === c.id ? "selected" : ""} ${!available ? "unavailable" : ""}`}
                          aria-pressed={selected === c.id}
                          onClick={() => setSelected(c.id)}
                        >
                          <div className="candidate-top">
                            <span className="candidate-number">0{i + 1}</span>
                            <span className="radio-circle">
                              {selected === c.id && <span />}
                            </span>
                          </div>
                          <small>{c.short}</small>
                          <h3>{c.name}</h3>
                          {c.id === "reroute" && (
                            <span className="recommended">
                              SAMPLE PREFERENCE
                            </span>
                          )}
                          <div className="candidate-quality">
                            {c.quality}
                            <small>/100</small>
                          </div>
                          <p>Illustrative quality index</p>
                          <div className="quality-bar">
                            <span style={{ width: `${c.quality}%` }} />
                          </div>
                          <div className="candidate-data">
                            <span>
                              Extra cost<strong>{money(c.cost)}</strong>
                            </span>
                            <span>
                              Travel time<strong>{c.hours}</strong>
                            </span>
                          </div>
                          <div
                            className={`feasibility ${available ? "" : "over-budget"}`}
                          >
                            {available ? (
                              <Check size={13} />
                            ) : (
                              <TriangleAlert size={13} />
                            )}{" "}
                            {available
                              ? "Within entered budget"
                              : "Over entered budget"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <section className="panel quality-panel">
                    <PanelTitle
                      title="One shipment. Different possibilities."
                      subtitle="Static illustrative quality curves — not computed from the controls."
                      action={
                        <span className="chart-unit">QUALITY INDEX / 100</span>
                      }
                    />
                    <QualityChart />
                  </section>
                  <section className="selection-strip">
                    <div>
                      <span className="selection-icon">
                        <SlidersHorizontal size={20} />
                      </span>
                      <div>
                        <strong>{candidate.name}</strong>
                        <p>{candidate.note}</p>
                      </div>
                    </div>
                    <Button
                      disabled={
                        !fixtureLoaded ||
                        !fixtureMatches ||
                        candidate.cost > budget
                      }
                      onClick={() =>
                        navigate(
                          `/runs/sample-${shipment.id}/review?shipment=${shipment.id}`,
                        )
                      }
                    >
                      Review sample plan <ArrowRight size={16} />
                    </Button>
                  </section>
                  <p className="fine-print results-footnote">
                    Load the matching sample to enable review. Budget checks are
                    local UI behavior; destination availability is not reserved
                    or verified.
                  </p>
                </div>
              </div>
            </>
          )}
          {isReview && (
            <>
              <button
                className="text-button back"
                onClick={() => navigate(`/rescue/${shipment.id}`)}
              >
                <ArrowLeft size={15} />
                Back to comparison
              </button>
              <Heading
                eyebrow="A MOMENT TO REVIEW"
                title="A clear plan. A considered choice."
                description="Review the sample action and its assumptions before trying the confirmation flow."
              />
              <div className="review-grid">
                <section className="panel review-main">
                  <div className="review-icon">
                    <Truck size={28} />
                  </div>
                  <Badge>Selected sample action</Badge>
                  <h2>{candidate.name}</h2>
                  <p>
                    {shipment.produce} · {shipment.quantity} kg · {shipment.id}
                  </p>
                  <div className="review-destination">
                    <MapPin size={21} />
                    <div>
                      <small>Sample destination</small>
                      <strong>{candidate.destination}</strong>
                    </div>
                  </div>
                  <div className="review-metrics">
                    <div>
                      <small>Extra intervention cost</small>
                      <strong>{money(candidate.cost)}</strong>
                    </div>
                    <div>
                      <small>Sample travel time</small>
                      <strong>{candidate.hours}</strong>
                    </div>
                    <div>
                      <small>Fixture quality index</small>
                      <strong>{candidate.quality}/100</strong>
                    </div>
                  </div>
                  <h3>What this sample shows</h3>
                  <ul className="check-list">
                    <li>
                      <CheckCircle2 size={17} />A destination with illustrative
                      spare capacity.
                    </li>
                    <li>
                      <CheckCircle2 size={17} />
                      An action compared against the original route.
                    </li>
                    <li>
                      <CheckCircle2 size={17} />A human reviews the trade-offs
                      before confirmation.
                    </li>
                  </ul>
                  <div className="notice amber">
                    <ShieldCheck size={20} />
                    <p>
                      Local sample only. Confirmation saves a demo decision in
                      this browser. It does not reserve capacity, send email,
                      run a model or create an AWS record.
                    </p>
                  </div>
                </section>
                <section className="panel review-sidebar">
                  <h2>Plan summary</h2>
                  <div className="summary-line">
                    <span>Shipment</span>
                    <strong>{shipment.id}</strong>
                  </div>
                  <div className="summary-line">
                    <span>Quantity</span>
                    <strong>{shipment.quantity} kg</strong>
                  </div>
                  <div className="summary-line">
                    <span>Fixture capacity</span>
                    <strong>{candidate.capacity} kg</strong>
                  </div>
                  <div className="summary-line">
                    <span>Entered budget</span>
                    <strong>{money(budget)}</strong>
                  </div>
                  <div className="summary-line">
                    <span>Sample input state</span>
                    <strong>
                      {fixtureLoaded && fixtureMatches
                        ? "Loaded"
                        : "Not loaded"}
                    </strong>
                  </div>
                  <p className="fine-print">
                    No live availability or food-safety verification. All values
                    are illustrative.
                  </p>
                  <Button
                    disabled={
                      !fixtureLoaded ||
                      !fixtureMatches ||
                      candidate.cost > budget
                    }
                    onClick={() => {
                      safely(() => {
                        const decision = execute(() =>
                          repository.addDecision({
                            shipmentId: shipment.id,
                            candidateId: candidate.id,
                            candidateName: candidate.name,
                            quantity: shipment.quantity,
                            destination: candidate.destination,
                            createdAt: new Date().toISOString(),
                          }),
                        );
                        setFixtureLoaded(false);
                        navigate("/history");
                        notify(
                          `${decision.id} saved locally. No reservation or notification was made.`,
                        );
                      });
                    }}
                  >
                    <Check size={16} />
                    Confirm demo decision
                  </Button>
                  <button
                    className="text-button"
                    onClick={() => navigate(`/rescue/${shipment.id}`)}
                  >
                    Return to Rescue Lab <ArrowLeft size={14} />
                  </button>
                </section>
              </div>
            </>
          )}
          {path === "/history" && (
            <>
              <Heading
                eyebrow="YOUR DECISION TRAIL"
                title="Good decisions leave a clear trail."
                description="Revisit locally saved demo decisions and their sample assumptions."
                action={
                  decisions.length > 0 ? (
                    <Button secondary onClick={() => navigate("/settings")}>
                      <RotateCcw size={16} />
                      Manage local data
                    </Button>
                  ) : undefined
                }
              />
              <section className="panel">
                <PanelTitle
                  title="Local sample history"
                  subtitle="Saved on this browser and origin. These are sample decisions, not real bookings."
                />
                <div className="filters">
                  <div className="search-field">
                    <Search size={16} />
                    <input
                      aria-label="Search decision history"
                      placeholder="Search decision or shipment…"
                      value={historyQuery}
                      onChange={(e) => setHistoryQuery(e.target.value)}
                    />
                  </div>
                </div>
                {decisions.filter((d) =>
                  (d.id + d.shipmentId + d.candidateName)
                    .toLowerCase()
                    .includes(historyQuery.toLowerCase()),
                ).length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">
                      <History size={28} />
                    </span>
                    <h2>
                      {historyQuery
                        ? "No matching decisions"
                        : "Your next decision starts a story."}
                    </h2>
                    <p>
                      {historyQuery
                        ? "Try a different search."
                        : "Explore a sample comparison, review a plan, then confirm a demo decision."}
                    </p>
                    <Button
                      onClick={() => {
                        if (historyQuery) setHistoryQuery("");
                        else {
                          reset();
                          navigate("/rescue/FR-101");
                        }
                      }}
                    >
                      {historyQuery ? "Clear search" : "Open Rescue Lab"}
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                ) : (
                  <div className="history-list">
                    {decisions
                      .filter((d) =>
                        (d.id + d.shipmentId + d.candidateName)
                          .toLowerCase()
                          .includes(historyQuery.toLowerCase()),
                      )
                      .map((d) => (
                        <article key={d.id} className="history-card">
                          <div className="history-check">
                            <Check size={20} />
                          </div>
                          <div>
                            <small>
                              {d.id} · {d.shipmentId}
                            </small>
                            <h3>{d.candidateName}</h3>
                            <p>
                              {d.quantity} kg → {d.destination}
                            </p>
                            <small>
                              {new Date(d.createdAt).toLocaleString("en-IN", {
                                timeZone: "Asia/Kolkata",
                              })}{" "}
                              IST · static fixture v0.1
                            </small>
                          </div>
                          <Badge tone="blue">Saved locally</Badge>
                          <button
                            className="icon-button"
                            aria-label={`Open shipment for ${d.id}`}
                            onClick={() =>
                              navigate(`/shipments/${d.shipmentId}`)
                            }
                          >
                            <ArrowUpRight size={18} />
                          </button>
                        </article>
                      ))}
                  </div>
                )}
              </section>
            </>
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
                  subtitle="Original seeded schematic; edits below change receiving rules, not this illustration. No live tracking."
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
                    >
                      <Pencil size={14} />
                      Edit receiving rules
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        reset();
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
          {path === "/settings" && (
            <LocalData
              workspace={workspace}
              error={storageError}
              onExport={exportLocal}
              onReset={() => {
                execute(() => repository.reset());
                setFixtureLoaded(false);
                notify("Local workspace reset to the original fictional demo.");
              }}
              onRetry={refresh}
            />
          )}
          {path === "/evidence" && (
            <>
              <Heading
                eyebrow="BUILT TO BE EXPLAINED"
                title="A clear view behind the experience."
                description="The intended architecture, honest implementation status and the next checkpoints."
              />
              <div className="notice blue">
                <Network size={20} />
                <p>
                  Phase 2 provides local persistence and operational workflows.
                  All cloud services below are planned and have no deployment
                  evidence yet.
                </p>
              </div>
              <div className="evidence-flow">
                {[
                  {
                    icon: Leaf,
                    title: "Observe",
                    text: "Inspect a shipment and its conditions.",
                  },
                  {
                    icon: FlaskConical,
                    title: "Simulate",
                    text: "Compare sample rescue possibilities.",
                  },
                  {
                    icon: CheckCheck,
                    title: "Decide",
                    text: "Review and save a local sample action.",
                  },
                  {
                    icon: FileText,
                    title: "Verify",
                    text: "Build the evidence trail in later phases.",
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <section className="panel" key={title}>
                    <Icon size={25} />
                    <h2>{title}</h2>
                    <p>{text}</p>
                  </section>
                ))}
              </div>
              <section className="panel">
                <PanelTitle
                  title="From interface to cloud"
                  subtitle="Planned service responsibilities, not connected integrations."
                />
                <div className="service-list">
                  {[
                    [
                      "S3 + CloudFront",
                      "Private static assets and HTTPS delivery",
                    ],
                    [
                      "Cognito + API Gateway",
                      "Identity and authenticated API access",
                    ],
                    [
                      "Lambda + Step Functions",
                      "Deterministic analysis and workflow visibility",
                    ],
                    [
                      "DynamoDB + Streams",
                      "Versioned runs, decisions and downstream events",
                    ],
                    ["SQS + SNS", "Background work, retries and notifications"],
                    [
                      "Amazon Bedrock",
                      "Grounded explanations and scenario drafts",
                    ],
                    [
                      "CloudWatch + CloudTrail + IAM",
                      "Monitoring, audit evidence and access boundaries",
                    ],
                  ].map(([name, desc]) => (
                    <div className="service-row" key={name}>
                      <div>
                        <strong>{name}</strong>
                        <p>{desc}</p>
                      </div>
                      <Badge tone="gray">Planned</Badge>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
          <footer className="footer">
            <span>
              <Leaf size={13} />
              FreshRoute · Thoughtful decisions, fresher possibilities.
            </span>
            <span>Academic prototype · Phase 2</span>
          </footer>
        </main>
      </div>
      {copilot && (
        <div
          className="drawer-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCopilot(false);
          }}
        >
          <section className="copilot-drawer" aria-label="Sample explanation">
            <Dialog
              title="FreshRoute Copilot"
              onClose={() => setCopilot(false)}
            >
              <Badge tone="blue">Authored demo explanation · no live AI</Badge>
              <div className="copilot-mark">
                <Sparkles size={25} />
              </div>
              <h3>Why explore a nearby destination?</h3>
              <p>
                The fixed FR-101 fixture illustrates how shorter travel can
                preserve more quality than continuing through a delay.
              </p>
              <div className="explanation-metrics">
                <span>
                  Original route<strong>5h 30m</strong>
                </span>
                <ArrowRight size={18} />
                <span>
                  Nearby destination<strong>2h 15m</strong>
                </span>
              </div>
              <p>
                The sample reroute costs {money(450)} and lists 600 kg of
                receiving capacity. These are authored comparison values, not
                model outputs or verified availability.
              </p>
              <div className="notice amber">
                <TriangleAlert size={18} />
                <p>
                  Real explanations will use the calculated result and validated
                  destination constraints. This prototype makes no food-safety
                  claim.
                </p>
              </div>
              <Button
                secondary
                onClick={() => {
                  setCopilot(false);
                  notify(
                    "The explanation uses the static FR-101 comparison fixture. Live provenance arrives with the backend.",
                  );
                }}
              >
                Understood <Check size={15} />
              </Button>
            </Dialog>
          </section>
        </div>
      )}
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
                setFixtureLoaded(false);
                navigate(`/shipments/${id}`);
                notify("Shipment saved locally. It will remain after refresh.");
              }}
            />
          ) : modal === "destination" && editingDestination ? (
            <DestinationForm
              destination={editingDestination}
              onCancel={() => setModal(null)}
              onSave={(value) => {
                execute(() =>
                  repository.saveDestination(value, editingDestination.version),
                );
                setModal(null);
                notify(
                  "Receiving rules saved locally. No reservations or comparisons were changed.",
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
                "Inspect FR-101 and its temperature timeline.",
                "Load the sample comparison in the Rescue Lab.",
                "Select an option and review the trade-offs.",
                "Save a local sample decision and find it in history.",
              ].map((s, i) => (
                <div className="guide-step" key={s}>
                  <span className="step-number">0{i + 1}</span>
                  <p>{s}</p>
                </div>
              ))}
              <div className="notice blue">
                <FlaskConical size={18} />
                <p>
                  This is a UI walkthrough, not a live calculation or cloud
                  deployment. All data and explanations are illustrative.
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
    </>
  );
}
