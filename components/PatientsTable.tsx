"use client";

import { toBs } from "@/lib/dates";
import type { PatientFilter, PatientRow } from "@/lib/stats";
import { IconChevronLeft, IconChevronRight, IconPlus, IconSearch } from "./Icons";

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
  onNew: () => void;
}

const FILTERS: { key: PatientFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "returning", label: "Returning" },
  { key: "pending", label: "Pending" },
];

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
  onNew,
}: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : page * pageSize + 1;
  const last = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="card card-flush">
      <div className="card-head">
        <h2>All patients</h2>
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
        <div className="spacer" />
        <div className="search-wrap" style={{ maxWidth: "260px" }}>
          <IconSearch />
          <input
            placeholder="Find by name, phone or MRN"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            aria-label="Search patients"
          />
        </div>
        <button className="primary" onClick={onNew}>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <IconPlus /> New patient
          </span>
        </button>
      </div>

      <div className="table-scroll">
        <table className="dtable">
          <thead>
            <tr>
              <th style={{ width: "44px" }}>#</th>
              <th>MRN</th>
              <th>Patient name</th>
              <th>Sex / Age</th>
              <th>Contact</th>
              <th>Referred by</th>
              <th>Last visit</th>
              <th>Visits</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="empty">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty">
                  {query
                    ? "No patient matches that search."
                    : "No patients yet. Add the first one to generate a report."}
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id} className="row-link" onClick={() => onOpen(r)}>
                  <td className="cell-mono">
                    {String(page * pageSize + i + 1).padStart(2, "0")}
                  </td>
                  <td className="cell-mono">{r.mrn}</td>
                  <td className="cell-strong">{r.fullName}</td>
                  <td>
                    {r.sex === "M" ? "Male" : r.sex === "F" ? "Female" : "Other"} /{" "}
                    {r.ageYears}
                  </td>
                  <td className="cell-mono">{r.phone || "—"}</td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {r.referredBy || "—"}
                  </td>
                  <td className="cell-mono">
                    {r.lastVisit ? `${toBs(r.lastVisit)} BS` : "—"}
                  </td>
                  <td className="cell-mono">{r.visitCount}</td>
                  <td>
                    {r.pendingCount > 0 ? (
                      <span className="badge pending">Pending</span>
                    ) : r.visitCount > 1 ? (
                      <span className="badge returning">Returning</span>
                    ) : r.visitCount === 1 ? (
                      <span className="badge released">Complete</span>
                    ) : (
                      <span className="badge new">New</span>
                    )}
                  </td>
                  <td>
                    <span className="pill">New report →</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-foot">
        <span>
          {total === 0 ? "No patients" : `Showing ${first}–${last} of ${total}`}
        </span>
        <div className="spacer" />
        <button
          className="icon"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <IconChevronLeft />
        </button>
        <span className="cell-mono">
          {page + 1} of {pages}
        </span>
        <button
          className="icon"
          disabled={page + 1 >= pages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <IconChevronRight />
        </button>
      </div>
    </div>
  );
}
