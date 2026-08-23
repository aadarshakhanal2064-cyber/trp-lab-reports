"use client";

import { useMemo, useState } from "react";
import { PANEL_BY_ID } from "@/lib/catalog";
import { hasCritical } from "@/lib/compute";
import { toTime } from "@/lib/dates";
import {
  describeAction,
  relativeTime,
  type ActivityItem,
  type DashboardStats,
} from "@/lib/stats";
import type { Panel, ReportRecord } from "@/lib/types";
import {
  IconAlert,
  IconCheck,
  IconChevronDown,
  IconFile,
  IconSearch,
  IconUser,
  initialsOf,
} from "./Icons";

interface Props {
  stats: DashboardStats;
  activity: ActivityItem[];
  orders: ReportRecord[];
  onOpenOrder: (r: ReportRecord) => void;
  onNewOrder: () => void;
  onViewAll: () => void;
}

type OrderTab = "All" | "Pending" | "Verified" | "Released";
const TABS: OrderTab[] = ["All", "Pending", "Verified", "Released"];

const COLS = "1.5fr 1fr 1.4fr 1fr .9fr .9fr 60px";
const DEPT_COLOURS = ["var(--primary)", "#eb6834", "#1baf7a"];

/** Status shown on an order row, derived from its lifecycle plus panic values. */
function statusOf(r: ReportRecord): { label: string; tone: string } {
  const panels = r.panelIds
    .map((id) => PANEL_BY_ID.get(id))
    .filter((p): p is Panel => p !== undefined);

  const urgent = hasCritical(
    panels,
    r.values,
    r.patientSnapshot.sex,
    r.patientSnapshot.ageYears,
  );

  // A panic value outranks the workflow state: it needs eyes now, whatever
  // stage the order is at.
  if (urgent && r.status !== "released") return { label: "Urgent", tone: "red" };
  if (r.status === "released") return { label: "Released", tone: "green" };
  if (r.status === "awaiting_verification") return { label: "Pending", tone: "amber" };
  return { label: "Collected", tone: "grey" };
}

export function Dashboard({
  stats,
  activity,
  orders,
  onOpenOrder,
  onNewOrder,
  onViewAll,
}: Props) {
  const [tab, setTab] = useState<OrderTab>("All");
  const [find, setFind] = useState("");

  const peak = Math.max(1, ...stats.weeklyVolume.map((d) => d.count));
  const deptPeak = Math.max(1, ...stats.byDepartment.map((d) => d.count));
  const todayIndex = stats.weeklyVolume.length - 1;

  const withStatus = useMemo(
    () => orders.map((r) => ({ order: r, status: statusOf(r) })),
    [orders],
  );

  const visible = useMemo(() => {
    const q = find.trim().toLowerCase();
    return withStatus.filter(({ order, status }) => {
      if (tab === "Pending" && !["Pending", "Urgent"].includes(status.label)) return false;
      if (tab === "Verified" && status.label !== "Collected") return false;
      if (tab === "Released" && status.label !== "Released") return false;
      if (!q) return true;
      const hay = `${order.patientSnapshot.fullName} ${order.patientSnapshot.mrn} ${order.accession} ${order.panelIds
        .map((id) => PANEL_BY_ID.get(id)?.title ?? "")
        .join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [withStatus, tab, find]);

  return (
    <>
      <div className="grid cols-4">
        <div className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">Total patients</span>
            <IconUser size={17} />
          </div>
          <div className="kpi-value">{stats.totalPatients.toLocaleString()}</div>
          <div className="kpi-foot">
            <span className={`pill ${stats.newThisWeek > 0 ? "green" : "grey"}`}>
              +{stats.newThisWeek}
            </span>
            <span className="kpi-caption">new this week</span>
          </div>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">Reports today</span>
            <IconFile size={17} />
          </div>
          <div className="kpi-value">{stats.reportsToday.toLocaleString()}</div>
          <div className="kpi-foot">
            <span className="kpi-caption">orders since midnight</span>
          </div>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">Awaiting verification</span>
            <IconAlert size={17} />
          </div>
          <div className="kpi-value">{stats.awaitingVerification.toLocaleString()}</div>
          <div className="kpi-foot">
            {stats.awaitingVerification > 0 ? (
              <span className="pill amber">Needs review</span>
            ) : (
              <span className="pill green">Clear</span>
            )}
            <span className="kpi-caption">verifier queue</span>
          </div>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">Released today</span>
            <IconCheck size={17} />
          </div>
          <div className="kpi-value">{stats.releasedToday.toLocaleString()}</div>
          <div className="kpi-foot">
            <span className="kpi-caption">finalised &amp; printed</span>
          </div>
        </div>
      </div>

      <div className="card mt">
        <div className="toolbar-row">
          <div className="tabs">
            {TABS.map((t) => (
              <button
                key={t}
                className={`tab ${tab === t ? "on" : ""}`}
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <button className="chip-btn" disabled title="Department filter — not built yet">
            All departments <IconChevronDown />
          </button>

          <div className="searchbar" style={{ maxWidth: "360px", marginLeft: "auto" }}>
            <IconSearch size={15} />
            <input
              placeholder="Find by patient, MRN or test"
              value={find}
              onChange={(e) => setFind(e.target.value)}
              aria-label="Find lab orders"
            />
          </div>

          <button className="primary" onClick={onNewOrder}>
            + New lab order
          </button>
        </div>

        <div className="gscroll">
          <div style={{ minWidth: "900px" }}>
            <div className="ghead" style={{ gridTemplateColumns: COLS }}>
              <div>Patient</div>
              <div>MRN</div>
              <div>Test</div>
              <div>Department</div>
              <div>Collected</div>
              <div>Status</div>
              <div>Action</div>
            </div>

            {visible.length === 0 ? (
              <div className="empty">
                {orders.length === 0
                  ? "No lab orders yet."
                  : "No orders match this filter."}
              </div>
            ) : (
              visible.map(({ order, status }) => {
                const panels = order.panelIds
                  .map((id) => PANEL_BY_ID.get(id))
                  .filter((p): p is Panel => p !== undefined);
                return (
                  <button
                    key={order.id}
                    className="grow"
                    style={{ gridTemplateColumns: COLS }}
                    onClick={() => onOpenOrder(order)}
                  >
                    <div className="cell-name">
                      <span className="ini sm">
                        {initialsOf(order.patientSnapshot.fullName)}
                      </span>
                      <span className="cell-strong">
                        {order.patientSnapshot.fullName}
                      </span>
                    </div>
                    <div className="cell-dim">{order.patientSnapshot.mrn}</div>
                    <div className="cell-dim" style={{ color: "var(--text-secondary)" }}>
                      {panels.map((p) => p.title).join(", ") || "—"}
                    </div>
                    <div className="cell-dim">{panels[0]?.department ?? "—"}</div>
                    <div className="cell-dim">{toTime(order.sampleDateISO)}</div>
                    <div>
                      <span className={`pill lg ${status.tone}`}>{status.label}</span>
                    </div>
                    <div className="cell-action">•••</div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="gfoot">
          <span>
            Showing {visible.length} of {orders.length} recent orders
          </span>
          <button className="link" onClick={onViewAll}>
            Open verification queue
          </button>
        </div>
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: "minmax(0,1.25fr) minmax(0,1fr)",
          marginTop: "var(--s-18)",
        }}
      >
        <div>
          <div className="card pad">
            <div className="toolbar-row" style={{ marginBottom: "var(--s-22)" }}>
              <span className="card-title">Lab volume</span>
              <span className="card-sub">Orders per day, last 7 days</span>
            </div>
            {/* Single series, so no legend — the title names it. Each bar is
                directly labelled, so there is no axis to read against. */}
            <div className="bars">
              {stats.weeklyVolume.map((d, i) => (
                <div className="bar-col" key={d.date} title={`${d.label}: ${d.count}`}>
                  <span className="bar-n">{d.count > 0 ? d.count : ""}</span>
                  <div className="bar-track">
                    <div
                      className={`bar ${i === todayIndex ? "today" : ""}`}
                      style={{ height: `${Math.max(4, (d.count / peak) * 100)}%` }}
                    />
                  </div>
                  <span className="bar-d">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card pad mt">
            <div className="toolbar-row" style={{ marginBottom: "var(--s-14)" }}>
              <span className="card-title">Tests by department</span>
              <span className="card-sub">Last 7 days</span>
            </div>
            {stats.byDepartment.length === 0 ? (
              <div className="empty">No tests ordered in the last 7 days.</div>
            ) : (
              stats.byDepartment.map((d, i) => (
                <div className="hbar-row" key={d.department}>
                  <span className="hbar-name">{d.department}</span>
                  <div className="hbar-track">
                    <div
                      className="hbar-fill"
                      style={{
                        width: `${(d.count / deptPeak) * 100}%`,
                        background: DEPT_COLOURS[i % DEPT_COLOURS.length],
                      }}
                    />
                  </div>
                  {/* Direct value label: relief for the low-contrast slot. */}
                  <span className="hbar-value">{d.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card pad">
          <div className="toolbar-row" style={{ marginBottom: "var(--s-6)" }}>
            <span className="card-title">Recent activity</span>
            <div className="spacer" />
            <button className="link" onClick={onViewAll}>
              View all
            </button>
          </div>
          {activity.length === 0 ? (
            <div className="empty">Nothing recorded yet.</div>
          ) : (
            activity.map((a) => (
              <div className="act" key={a.id}>
                <span className={`act-dot ${dotOf(a.action)}`} />
                <div style={{ minWidth: 0 }}>
                  <div className="act-text">
                    <strong style={{ fontWeight: 700 }}>{a.actorName}</strong>{" "}
                    {describeAction(a.action)}
                  </div>
                  <div className="act-when">{relativeTime(a.occurredAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function dotOf(action: string): string {
  if (action.startsWith("report.release")) return "green";
  if (action.startsWith("report.amend")) return "amber";
  if (action.startsWith("patient")) return "blue";
  if (action.startsWith("order")) return "blue";
  return "grey";
}
