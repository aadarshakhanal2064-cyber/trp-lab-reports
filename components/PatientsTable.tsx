"use client";

import { toBs } from "@/lib/dates";
import type { PatientFilter, PatientRow } from "@/lib/stats";
import { IconSearch, initialsOf } from "./Icons";

interface Props {
  rows: PatientRow[];
  total: number;
  page: number;
  pageSize: number;
  filter: PatientFilter;
  query: string;
  loading: boolean;
  onQuery: (q: string) => void;
  onFilter: (f: PatientFilter) => void;
  onPage: (p: number) => void;
  onOpen: (row: PatientRow) => void;
}

const FILTERS: { key: PatientFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Active orders" },
  { key: "returning", label: "Returning" },
  { key: "new", label: "New" },
];

const COLUMNS = "1.6fr .9fr .8fr 1.1fr 1fr .8fr .9fr";

export function PatientsTable({
  rows,
  total,
  page,
  pageSize,
  filter,
  query,
  loading,
  onQuery,
  onFilter,
  onPage,
  onOpen,
}: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="card">
      <div className="card-head">
        <div className="tabs">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`tab ${filter === f.key ? "on" : ""}`}
              aria-pressed={filter === f.key}
              onClick={() => onFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="searchbar" style={{ maxWidth: "380px", marginLeft: "auto" }}>
          <IconSearch size={15} />
          <input
            placeholder="Find by name, phone or MRN"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            aria-label="Search patients"
          />
        </div>
      </div>

      <div className="grid-scroll">
        <div style={{ minWidth: "860px" }}>
          <div className="ghead" style={{ gridTemplateColumns: COLUMNS }}>
            <div>Name</div>
            <div>MRN</div>
            <div>Age / Sex</div>
            <div>Phone</div>
            <div>Last visit</div>
            <div>Reports</div>
            <div>Status</div>
          </div>

          {loading ? (
            <div className="empty">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="empty">
              {query
                ? "No patient matches that search."
                : "No patients yet. Register the first one to generate a report."}
            </div>
          ) : (
            rows.map((r) => (
              <button
                key={r.id}
                className="grow"
                style={{ gridTemplateColumns: COLUMNS }}
                onClick={() => onOpen(r)}
              >
                <div className="cell-name">
                  <span className="initials">{initialsOf(r.fullName)}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="cell-strong">{r.fullName}</div>
                    <div className="cell-sub">
                      {r.referredBy ? `Ref: ${r.referredBy}` : "No referring doctor"}
                    </div>
                  </div>
                </div>
                <div className="cell-dim">{r.mrn}</div>
                <div className="cell-dim">
                  {r.ageYears} / {r.sex === "M" ? "M" : r.sex === "F" ? "F" : "O"}
                </div>
                <div className="cell-dim">{r.phone || "—"}</div>
                <div className="cell-dim">
                  {r.lastVisit ? `${toBs(r.lastVisit)} BS` : "—"}
                </div>
                <div style={{ fontWeight: 600 }}>{r.visitCount}</div>
                <div>
                  {r.pendingCount > 0 ? (
                    <span className="chip warn">In progress</span>
                  ) : r.visitCount > 1 ? (
                    <span className="chip info">Returning</span>
                  ) : r.visitCount === 1 ? (
                    <span className="chip good">Complete</span>
                  ) : (
                    <span className="chip neutral">New</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="grid-foot">
        <span>
          {total === 0
            ? "No patients"
            : `Showing ${page * pageSize + 1}–${Math.min(total, (page + 1) * pageSize)} of ${total.toLocaleString()} patients`}
        </span>
        <div className="pager">
          <button className="tiny" disabled={page === 0} onClick={() => onPage(page - 1)}>
            ‹ Prev
          </button>
          <span>
            <strong style={{ color: "var(--text)" }}>{page + 1}</strong> of {pages}
          </span>
          <button
            className="tiny"
            disabled={page + 1 >= pages}
            onClick={() => onPage(page + 1)}
          >
            Next ›
          </button>
        </div>
      </div>
    </div>
  );
}
