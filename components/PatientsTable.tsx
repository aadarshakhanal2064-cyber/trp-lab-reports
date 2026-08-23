"use client";

import { toBs } from "@/lib/dates";
import type { PatientFilter, PatientRow } from "@/lib/stats";
import { IconEdit, IconSearch, initialsOf } from "./Icons";

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
  onEdit: (row: PatientRow) => void;
}

const FILTERS: { key: PatientFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Active orders" },
  { key: "returning", label: "Returning" },
];

const COLS = "1.6fr .9fr .8fr 1.1fr 1fr .9fr .8fr 60px";

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
  onEdit,
}: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="card">
      <div className="toolbar-row">
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

      <div className="gscroll">
        <div style={{ minWidth: "900px" }}>
          <div className="ghead" style={{ gridTemplateColumns: COLS }}>
            <div>Name</div>
            <div>MRN</div>
            <div>Age / Sex</div>
            <div>Phone</div>
            <div>Last visit</div>
            <div>Reports</div>
            <div>Status</div>
            <div>Action</div>
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
              <div
                key={r.id}
                className="grow row-hover"
                style={{ gridTemplateColumns: COLS, cursor: "pointer" }}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(r)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(r);
                  }
                }}
              >
                <div className="cell-name">
                  <span className="ini">{initialsOf(r.fullName)}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="cell-strong">{r.fullName}</div>
                    <div className="cell-sub">
                      {r.address || "Ratnanagar, Chitwan"}
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
                    <span className="pill lg amber">In progress</span>
                  ) : r.visitCount > 0 ? (
                    <span className="pill lg green">Clear</span>
                  ) : (
                    <span className="pill lg grey">New</span>
                  )}
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    className="icon-btn"
                    style={{ width: "30px", height: "30px" }}
                    title={`Edit ${r.fullName}`}
                    aria-label={`Edit ${r.fullName}`}
                    onClick={() => onEdit(r)}
                  >
                    <IconEdit />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="gfoot">
        <span>
          {total === 0
            ? "No patients"
            : `Showing ${Math.min(rows.length, pageSize)} of ${total.toLocaleString()} patients`}
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
