import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  Download,
  MapPin,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { useCloud } from "./CloudRuntime";
import { cloudRequest } from "./api";
import type {
  InboxMessage,
  Reservation,
  ReservationState,
} from "./reservationTypes";
import type { Destination } from "../domain";
import { formatIST } from "../domain";
type Board = {
  reservations: Reservation[];
  inbox: InboxMessage[];
  network: Destination[];
};
export function Fulfilment({
  onNavigate,
  onSync,
}: {
  onNavigate: (path: string) => void;
  onSync: () => void | Promise<void>;
}) {
  const { cloud, config } = useCloud();
  const [board, setBoard] = useState<Board>({
    reservations: [],
    inbox: [],
    network: [],
  });
  const [filter, setFilter] = useState("ALL"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [notice, setNotice] = useState("");
  async function refresh() {
    if (!cloud || !config) return;
    try {
      setBoard(await cloudRequest<Board>(config, "/v1/fulfilment"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 6000);
    return () => clearInterval(timer);
  }, [cloud, config]);
  async function change(r: Reservation, status: ReservationState) {
    if (!config || busy) return;
    setBusy(r.id);
    setNotice("");
    try {
      await cloudRequest(config, `/v1/reservations/${r.id}/status`, {
        status,
        expectedVersion: r.version,
      });
      await refresh();
      await onSync();
      setNotice(
        `${r.shipmentId} ${status.toLowerCase()}. Report and notification queued.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function download(r: Reservation) {
    if (!config || busy) return;
    setBusy(r.id);
    setNotice("");
    try {
      const result = await cloudRequest<{
        ready: boolean;
        url?: string;
        message?: string;
      }>(config, `/v1/reservations/${r.id}/report`);
      if (result.ready && result.url) {
        const a = document.createElement("a");
        a.href = result.url;
        a.rel = "noreferrer";
        a.click();
      } else setNotice(result.message || "Your report is being generated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const active = board.reservations.filter(
      (r) => r.status === "CONFIRMED" || r.status === "DISPATCHED",
    ),
    delivered = board.reservations.filter((r) => r.status === "DELIVERED"),
    unread = board.inbox.filter((m) => !m.read).length;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">FROM A DECISION TO A DELIVERY</div>
          <h1>Good plans. Real follow-through.</h1>
          <p>
            Reserve receiving space, follow your shipments, and keep every
            handover on record.
          </p>
        </div>
        <button className="button secondary" onClick={() => void refresh()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      {!cloud ? (
        <section className="panel fulfilment-empty">
          <ShieldCheck size={36} />
          <h2>Your cloud fulfilment workspace</h2>
          <p>
            Sign in to reserve shared receiving capacity and follow a plan
            through delivery. Your local demo plans remain in History.
          </p>
          <button
            className="button"
            onClick={() => onNavigate("/rescue/FR-101")}
          >
            Explore Rescue Lab
          </button>
        </section>
      ) : (
        <>
          <div className="fulfilment-hero">
            <div>
              <span className="eyebrow">EVERY KILOGRAM HAS A PLACE</span>
              <h2>
                A shared network.
                <br />A clear next step.
              </h2>
              <p>
                Capacity is held until delivery or cancellation. Every update
                creates a private report and an in-app notification.
              </p>
              <button
                className="button light"
                onClick={() => onNavigate("/rescue/FR-101")}
              >
                Create a rescue plan <Truck size={17} />
              </button>
            </div>
            <div className="fulfilment-hero-stat">
              <PackageCheck size={36} />
              <strong>
                {delivered
                  .reduce((sum, r) => sum + r.quantity, 0)
                  .toLocaleString("en-IN")}
                <small>kg</small>
              </strong>
              <span>Recorded as delivered</span>
              <p>
                Operator-recorded quantity.
                <br />
                Not measured waste prevented.
              </p>
            </div>
          </div>
          {error && (
            <div className="notice amber" role="alert">
              <p>{error}</p>
              <button className="text-button" onClick={() => setError("")}>
                Dismiss
              </button>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              <CheckCircle2 size={18} />
              <p>{notice}</p>
            </div>
          )}
          <div className="fulfilment-metrics">
            {[
              ["Active allocations", active.length],
              [
                "Inbound reserved",
                `${active.reduce((s, r) => s + r.quantity, 0).toLocaleString("en-IN")} kg`,
              ],
              ["Completed deliveries", delivered.length],
              ["Unread updates", unread],
            ].map(([label, value]) => (
              <section className="panel" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </section>
            ))}
          </div>
          <div className="fulfilment-layout">
            <main>
              <div className="section-heading">
                <div>
                  <h2>Rescue fulfilment</h2>
                  <p>
                    One reservation per saved run, with an immutable status
                    timeline.
                  </p>
                </div>
              </div>
              <div
                className="fulfilment-filters"
                role="group"
                aria-label="Filter reservations"
              >
                {[
                  "ALL",
                  "CONFIRMED",
                  "DISPATCHED",
                  "DELIVERED",
                  "CANCELLED",
                ].map((s) => (
                  <button
                    key={s}
                    aria-pressed={filter === s}
                    className={filter === s ? "active" : ""}
                    onClick={() => setFilter(s)}
                  >
                    {s === "ALL"
                      ? "All plans"
                      : s === "CONFIRMED"
                        ? "Reserved"
                        : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <div className="reservation-list">
                {board.reservations
                  .filter((r) => filter === "ALL" || r.status === filter)
                  .map((r) => (
                    <article className="panel reservation-card" key={r.id}>
                      <div className="reservation-card-top">
                        <div>
                          <span className="eyebrow">
                            {r.shipmentId} · {r.produce}
                          </span>
                          <h3>
                            {r.quantity.toLocaleString("en-IN")} kg, with a
                            destination.
                          </h3>
                        </div>
                        <span
                          className={`badge ${r.status === "CANCELLED" ? "gray" : "green"}`}
                        >
                          {r.status === "CONFIRMED"
                            ? "Capacity reserved"
                            : r.status.toLowerCase()}
                        </span>
                      </div>
                      <p className="reservation-destination">
                        <MapPin size={16} />
                        {r.destination}
                        <span>{r.candidateName}</span>
                      </p>
                      {r.allocations && (
                        <div className="split-reservation-details">
                          {r.allocations.map((p) => (
                            <span key={p.destinationId}>
                              {p.quantityGrams / 1000} kg → {p.destination}
                            </span>
                          ))}
                        </div>
                      )}
                      <ol className="reservation-timeline">
                        {r.events.map((e) => (
                          <li key={e.status}>
                            <CheckCircle2 size={15} />
                            <div>
                              <strong>
                                {e.status === "CONFIRMED"
                                  ? "Reserved"
                                  : e.status.charAt(0) +
                                    e.status.slice(1).toLowerCase()}
                              </strong>
                              <small>{formatIST(e.at)}</small>
                            </div>
                          </li>
                        ))}
                      </ol>
                      <div className="reservation-actions">
                        <button
                          className="button secondary"
                          disabled={busy === r.id}
                          onClick={() => void download(r)}
                        >
                          <Download size={15} />
                          Private PDF
                        </button>
                        <button
                          className="text-button"
                          onClick={() => onNavigate(`/runs/${r.runId}`)}
                        >
                          View analysis
                        </button>
                        <div className="reservation-actions-spacer" />
                        {r.status === "CONFIRMED" && (
                          <>
                            <button
                              className="text-button"
                              disabled={busy === r.id}
                              onClick={() => void change(r, "CANCELLED")}
                            >
                              <X size={15} />
                              Cancel
                            </button>
                            <button
                              className="button"
                              disabled={busy === r.id}
                              onClick={() => void change(r, "DISPATCHED")}
                            >
                              <Truck size={15} />
                              Mark dispatched
                            </button>
                          </>
                        )}
                        {r.status === "DISPATCHED" && (
                          <button
                            className="button"
                            disabled={busy === r.id}
                            onClick={() => void change(r, "DELIVERED")}
                          >
                            <PackageCheck size={15} />
                            Record delivery
                          </button>
                        )}
                      </div>
                      <small className="reservation-footnote">
                        Version {r.version} ·{" "}
                        {r.status === "DELIVERED" || r.status === "CANCELLED"
                          ? "Capacity released"
                          : "Capacity held in the shared network"}
                      </small>
                    </article>
                  ))}
              </div>
              {!board.reservations.some(
                (r) => filter === "ALL" || r.status === filter,
              ) && (
                <section className="panel fulfilment-empty">
                  <PackageCheck size={30} />
                  <h3>
                    {filter === "ALL"
                      ? "Your next rescue starts with a plan."
                      : "No plans in this stage."}
                  </h3>
                  <p>
                    Run an analysis, review a feasible option, then reserve
                    receiving capacity.
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => onNavigate("/rescue/FR-101")}
                  >
                    Open Rescue Lab
                  </button>
                </section>
              )}
              <section className="panel capacity-ledger">
                <h2>Shared receiving capacity</h2>
                <p>
                  Active inbound allocations across all cloud users. This is a
                  fictional partner network.
                </p>
                {board.network.map((d) => (
                  <div className="capacity-ledger-row" key={d.id}>
                    <div>
                      <strong>{d.name}</strong>
                      <small>
                        {d.reservedKg} / {d.capacity} kg reserved
                      </small>
                    </div>
                    <meter
                      min={0}
                      max={Math.max(1, d.capacity)}
                      value={d.reservedKg}
                      aria-label={`${d.name} reserved capacity`}
                    />
                    <b>{Math.max(0, d.capacity - d.reservedKg)} kg free</b>
                  </div>
                ))}
              </section>
            </main>
            <aside className="fulfilment-inbox panel">
              <div className="section-heading">
                <h2>
                  <Bell size={19} /> Your updates
                </h2>
                <span className="badge green">{unread} new</span>
              </div>
              <p>
                Reports and alerts are processed in the background. Email
                requires a verified sign-in address matching the confirmed
                project subscription.
              </p>
              {board.inbox.slice(0, 30).map((m) => (
                <article
                  className={m.read ? "inbox-message" : "inbox-message unread"}
                  key={m.id}
                >
                  <strong>{m.title}</strong>
                  <p>{m.message}</p>
                  <small>{formatIST(m.at)}</small>
                  {!m.read && (
                    <button
                      className="text-button"
                      onClick={async () => {
                        if (!config) return;
                        try {
                          await cloudRequest(
                            config,
                            `/v1/inbox/${encodeURIComponent(m.id)}/read`,
                            {},
                          );
                          await refresh();
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      <Check size={14} />
                      Mark read
                    </button>
                  )}
                </article>
              ))}
              {!board.inbox.length && (
                <div className="inbox-empty">
                  <Bell size={26} />
                  <p>Your rescue updates will appear here.</p>
                </div>
              )}
            </aside>
          </div>
          <div className="notice">
            <ShieldCheck size={19} />
            <p>
              These are academic allocations for fictional partners. A recorded
              delivery is an operator update; confirm real receiving
              arrangements separately. Reports are private and download links
              expire after two minutes.
            </p>
          </div>
        </>
      )}
    </>
  );
}
