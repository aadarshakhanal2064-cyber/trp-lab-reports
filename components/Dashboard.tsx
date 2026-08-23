"use client";

import {
  describeAction,
  relativeTime,
  type ActivityItem,
  type DashboardStats,
} from "@/lib/stats";
import { IconAlert, IconCheck, IconFile, IconUser } from "./Icons";

interface Props {
  stats: DashboardStats;
  activity: ActivityItem[];
  onViewAll: () => void;
}

const DEPT_COLOURS = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];

export function Dashboard({ stats, activity, onViewAll }: Props) {
  const peak = Math.max(1, ...stats.weeklyVolume.map((d) => d.count));
  const deptPeak = Math.max(1, ...stats.byDepartment.map((d) => d.count));
  const todayIndex = stats.weeklyVolume.length - 1;

  return (
    <>
      <div className="grid cols-4">
        <div className="tile">
          <div className="tile-top">
            <span className="tile-label">Total patients</span>
            <IconUser size={17} />
          </div>
          <div className="tile-value">{stats.totalPatients.toLocaleString()}</div>
          <div className="tile-foot">
            <span className={`chip ${stats.newThisWeek > 0 ? "good" : "neutral"}`}>
              +{stats.newThisWeek}
            </span>
            <span className="tile-foot-note">new this week</span>
          </div>
        </div>

        <div className="tile">
          <div className="tile-top">
            <span className="tile-label">Reports today</span>
            <IconFile size={17} />
          </div>
          <div className="tile-value">{stats.reportsToday.toLocaleString()}</div>
          <div className="tile-foot">
            <span className="tile-foot-note">orders since midnight</span>
          </div>
        </div>

        <div className="tile">
          <div className="tile-top">
            <span className="tile-label">Awaiting verification</span>
            <IconAlert size={17} />
          </div>
          <div className="tile-value">{stats.awaitingVerification.toLocaleString()}</div>
          <div className="tile-foot">
            {stats.awaitingVerification > 0 ? (
              <>
                <span className="chip warn">Needs review</span>
                <span className="tile-foot-note">verifier queue</span>
              </>
            ) : (
              <>
                <span className="chip good">Clear</span>
                <span className="tile-foot-note">nothing pending</span>
              </>
            )}
          </div>
        </div>

        <div className="tile">
          <div className="tile-top">
            <span className="tile-label">Released today</span>
            <IconCheck size={17} />
          </div>
          <div className="tile-value">{stats.releasedToday.toLocaleString()}</div>
          <div className="tile-foot">
            <span className="tile-foot-note">finalised &amp; printed</span>
          </div>
        </div>
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: "minmax(0,1.25fr) minmax(0,1fr)",
          marginTop: "var(--space-5)",
        }}
      >
        <div>
          <div className="card">
            <div className="card-head" style={{ marginBottom: "var(--space-6)" }}>
              <span className="card-title">Lab volume</span>
              <span className="card-note">Orders per day, last 7 days</span>
            </div>
            {/* One series, so no legend — the title names it. Every bar carries
                its own value, so there is no axis to read against. */}
            <div className="bars">
              {stats.weeklyVolume.map((d, i) => (
                <div className="bar-col" key={d.date} title={`${d.label}: ${d.count}`}>
                  <span className="bar-n">{d.count > 0 ? d.count : ""}</span>
                  <div className="bar-track">
                    <div
                      className={`bar ${i === todayIndex ? "" : "dim"}`}
                      style={{ height: `${Math.max(3, (d.count / peak) * 100)}%` }}
                    />
                  </div>
                  <span className="bar-d">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head" style={{ marginBottom: "var(--space-4)" }}>
              <span className="card-title">Tests by department</span>
              <span className="card-note">Last 7 days</span>
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
                  {/* Direct label: required relief for the aqua slot's contrast. */}
                  <span className="hbar-value">{d.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head" style={{ marginBottom: "var(--space-2)" }}>
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
                <span className="act-dot" />
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

