"use client";

import {
  describeAction,
  relativeTime,
  type ActivityItem,
  type DashboardStats,
} from "@/lib/stats";
import { IconAlert, IconCheck, IconFile, IconUsers } from "./Icons";

interface Props {
  stats: DashboardStats;
  activity: ActivityItem[];
  onOpenPatients: () => void;
}

/** Series colours come from the validated data-viz palette (see globals.css). */
const DEPT_COLOURS = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];

export function Dashboard({ stats, activity, onOpenPatients }: Props) {
  const peak = Math.max(1, ...stats.weeklyVolume.map((d) => d.count));
  const deptTotal = Math.max(1, ...stats.byDepartment.map((d) => d.count));

  return (
    <>
      <div className="grid cols-4" style={{ marginBottom: "var(--space-4)" }}>
        <div className="stat">
          <span className="stat-label">
            <IconUsers size={15} /> Total patients
          </span>
          <span className="stat-value">{stats.totalPatients.toLocaleString()}</span>
          <span className="stat-foot">
            {stats.newThisWeek > 0 ? (
              <span className="delta up">+{stats.newThisWeek}</span>
            ) : (
              <span className="delta flat">0</span>
            )}{" "}
            registered in the last 7 days
          </span>
        </div>

        <div className="stat">
          <span className="stat-label">
            <IconFile size={15} /> Reports today
          </span>
          <span className="stat-value">{stats.reportsToday.toLocaleString()}</span>
          <span className="stat-foot">Lab orders created since midnight</span>
        </div>

        <div className="stat">
          <span className="stat-label">
            <IconAlert size={15} /> Awaiting verification
          </span>
          <span className="stat-value">{stats.awaitingVerification.toLocaleString()}</span>
          <span className="stat-foot">
            {stats.awaitingVerification > 0 ? (
              <span className="delta attention">Needs a verifier</span>
            ) : (
              <span className="delta up">All clear</span>
            )}
          </span>
        </div>

        <div className="stat">
          <span className="stat-label">
            <IconCheck size={15} /> Released today
          </span>
          <span className="stat-value">{stats.releasedToday.toLocaleString()}</span>
          <span className="stat-foot">Reports finalised and printed</span>
        </div>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)" }}
      >
        <div>
          <div className="card">
            <div className="card-head">
              <h2>Lab volume</h2>
              <span className="muted">Orders per day, last 7 days</span>
            </div>
            {/* Single series, so no legend: the title names it. Every bar is
                directly labelled rather than relying on an axis. */}
            <div className="bars">
              {stats.weeklyVolume.map((d) => (
                <div className="bar-col" key={d.date} title={`${d.label}: ${d.count}`}>
                  <span className="bar-value">{d.count > 0 ? d.count : ""}</span>
                  <div className="bar-track">
                    <div
                      className="bar"
                      style={{ height: `${Math.max(2, (d.count / peak) * 100)}%` }}
                    />
                  </div>
                  <span className="bar-label">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Tests by department</h2>
              <span className="muted">Last 7 days</span>
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
                        width: `${(d.count / deptTotal) * 100}%`,
                        background: DEPT_COLOURS[i % DEPT_COLOURS.length],
                      }}
                    />
                  </div>
                  {/* Direct value label — required relief for the sub-3:1
                      contrast of the aqua slot on white. */}
                  <span className="hbar-value">{d.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Recent activity</h2>
            <div className="spacer" />
            <button className="ghost" onClick={onOpenPatients}>
              All patients
            </button>
          </div>
          {activity.length === 0 ? (
            <div className="empty">Nothing has happened yet today.</div>
          ) : (
            activity.map((a) => (
              <div className="activity" key={a.id}>
                <span className="activity-dot" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div>
                    <strong>{a.actorName}</strong>{" "}
                    <span style={{ color: "var(--text-secondary)" }}>
                      {describeAction(a.action)}
                    </span>
                  </div>
                  <span className="activity-time">{relativeTime(a.occurredAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
