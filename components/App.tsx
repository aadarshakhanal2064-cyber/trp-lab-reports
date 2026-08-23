"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PANELS, PANEL_BY_ID, analytesOf } from "@/lib/catalog";
import { computeAll, enteredCount } from "@/lib/compute";
import {
  audit,
  createOrder,
  createPatient,
  findDuplicates,
  getProfile,
  nextAccessionDb,
  recentReports,
  releaseReport,
  saveResults,
  signOut,
  type Profile,
} from "@/lib/db";
import { currentBsYear, dualDate, toBs, toTime } from "@/lib/dates";
import { flagMarker, isCritical } from "@/lib/ranges";
import {
  dashboardStats,
  listPatients,
  recentActivity,
  type ActivityItem,
  type DashboardStats,
  type PatientFilter,
  type PatientRow,
} from "@/lib/stats";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from "@/lib/storage";
import type { Panel, Patient, ReportRecord, Sex } from "@/lib/types";
import { Dashboard } from "./Dashboard";
import {
  IconBell,
  IconFlask,
  IconGear,
  IconGrid,
  IconLogout,
  IconPrint,
  IconSearch,
  IconUser,
  initialsOf,
} from "./Icons";
import { Login } from "./Login";
import { PatientsTable } from "./PatientsTable";
import { ReportSheet } from "./ReportSheet";
import { ResultEntry } from "./ResultEntry";

type View =
  | "dashboard"
  | "patients"
  | "reports"
  | "newPatient"
  | "order"
  | "entry"
  | "preview"
  | "settings";

const PAGE_SIZE = 12;

const EMPTY_PATIENT: Omit<Patient, "id" | "mrn"> = {
  fullName: "",
  sex: "M",
  ageYears: 0,
  phone: "",
  address: "",
  referredBy: "",
};

const PANEL_OF_ANALYTE = new Map<string, string>();
for (const p of PANELS) {
  for (const a of analytesOf(p)) PANEL_OF_ANALYTE.set(a.id, p.id);
}

const EMPTY_STATS: DashboardStats = {
  totalPatients: 0,
  newThisWeek: 0,
  reportsToday: 0,
  awaitingVerification: 0,
  releasedToday: 0,
  weeklyVolume: [],
  byDepartment: [],
};

export function App() {
  const [booting, setBooting] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<PatientFilter>("all");
  const [query, setQuery] = useState("");
  const [listLoading, setListLoading] = useState(false);

  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const [draft, setDraft] = useState(EMPTY_PATIENT);
  const [duplicates, setDuplicates] = useState<Patient[]>([]);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);

  const [panelIds, setPanelIds] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [accession, setAccession] = useState("");
  const [orderId, setOrderId] = useState("");
  const [sampleDateISO, setSampleDateISO] = useState("");
  const [criticalAcknowledged, setCriticalAcknowledged] = useState(false);
  const [releasedVersion, setReleasedVersion] = useState(0);

  const fail = (e: unknown) =>
    setError(e instanceof Error ? e.message : "Something went wrong.");

  const refreshOverview = useCallback(async () => {
    const [s, a, r] = await Promise.all([
      dashboardStats(),
      recentActivity(),
      recentReports(20),
    ]);
    setStats(s);
    setActivity(a);
    setReports(r);
  }, []);

  const refreshList = useCallback(async () => {
    setListLoading(true);
    try {
      const { rows: r, total: t } = await listPatients(query, filter, page, PAGE_SIZE);
      setRows(r);
      setTotal(t);
    } catch (e) {
      fail(e);
    } finally {
      setListLoading(false);
    }
  }, [query, filter, page]);

  useEffect(() => {
    (async () => {
      try {
        const p = await getProfile();
        setProfile(p);
        setSettings(loadSettings());
        if (p) await refreshOverview();
      } catch (e) {
        fail(e);
      } finally {
        setBooting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!profile) return;
    const t = setTimeout(refreshList, 200);
    return () => clearTimeout(t);
  }, [profile, refreshList]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (view !== "newPatient") return;
    const t = setTimeout(() => {
      findDuplicates(draft.fullName).then(setDuplicates).catch(() => undefined);
    }, 300);
    return () => clearTimeout(t);
  }, [draft.fullName, view]);

  const selectedPanels = useMemo(
    () =>
      panelIds
        .map((id) => PANEL_BY_ID.get(id))
        .filter((p): p is Panel => p !== undefined),
    [panelIds],
  );

  const computed = useMemo(() => {
    if (!activePatient) return new Map();
    return computeAll(selectedPanels, values, activePatient.sex, activePatient.ageYears);
  }, [selectedPanels, values, activePatient]);

  const criticals = useMemo(
    () => [...computed.values()].filter((v) => isCritical(v.flag)),
    [computed],
  );

  const progress = useMemo(
    () => enteredCount(selectedPanels, values),
    [selectedPanels, values],
  );

  /* ---------------------------------------------------------------- */

  const beginOrder = useCallback((patient: Patient) => {
    setActivePatient(patient);
    setPanelIds([]);
    setValues({});
    setComments({});
    setOrderId("");
    setReleasedVersion(0);
    setCriticalAcknowledged(false);
    setSampleDateISO(new Date().toISOString());
    setError("");
    setView("order");
  }, []);

  const openRow = useCallback(
    (r: PatientRow) =>
      beginOrder({
        id: r.id,
        mrn: r.mrn,
        fullName: r.fullName,
        sex: r.sex,
        ageYears: r.ageYears,
        phone: r.phone,
        referredBy: r.referredBy,
      }),
    [beginOrder],
  );

  const savePatientAndOrder = useCallback(async () => {
    if (!profile) return;
    setBusy(true);
    try {
      const saved = await createPatient(draft, profile.id);
      await Promise.all([refreshOverview(), refreshList()]);
      beginOrder(saved);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }, [draft, profile, refreshOverview, refreshList, beginOrder]);

  const startEntry = useCallback(async () => {
    if (!profile || !activePatient) return;
    setBusy(true);
    try {
      const acc = await nextAccessionDb(currentBsYear());
      const id = await createOrder(activePatient.id, panelIds, acc, profile.id);
      setAccession(acc);
      setOrderId(id);
      setView("entry");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }, [profile, activePatient, panelIds]);

  const goToPreview = useCallback(async () => {
    if (!profile || !orderId) return;
    setBusy(true);
    try {
      await saveResults(orderId, values, (a) => PANEL_OF_ANALYTE.get(a) ?? "", profile.id);
      setView("preview");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }, [profile, orderId, values]);

  const doRelease = useCallback(async () => {
    if (!profile || !orderId) return;
    setBusy(true);
    try {
      const v = await releaseReport(
        orderId,
        values,
        comments,
        {
          name: settings.verifierName,
          qualification: settings.verifierQualification,
          nmc: settings.verifierNmc,
        },
        settings.letterheadMode,
        profile.id,
      );
      setReleasedVersion(v);
      await Promise.all([refreshOverview(), refreshList()]);
      window.print();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }, [profile, orderId, values, comments, settings, refreshOverview, refreshList]);

  const openReport = useCallback(
    async (record: ReportRecord, goTo: View = "reports") => {
      setActivePatient(record.patientSnapshot);
      setPanelIds(record.panelIds);
      setValues(record.values);
      setComments(record.comments);
      setAccession(record.accession);
      setOrderId(record.id);
      setSampleDateISO(record.sampleDateISO);
      setCriticalAcknowledged(true);
      setReleasedVersion(record.status === "released" ? 1 : 0);
      setView(goTo);
      if (profile) await audit(profile.id, "report.view", "lab_order", record.id);
    },
    [profile],
  );

  /* ---------------------------------------------------------------- */

  if (booting) {
    return (
      <div className="auth-page">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <Login
        onSignedIn={async () => {
          setBooting(true);
          try {
            const p = await getProfile();
            setProfile(p);
            if (p) await refreshOverview();
          } catch (e) {
            fail(e);
          } finally {
            setBooting(false);
          }
        }}
      />
    );
  }

  const canRelease = profile.can_release || profile.role === "admin";
  const patientLine = activePatient
    ? `${activePatient.fullName} · MRN ${activePatient.mrn} · ${
        activePatient.sex === "M" ? "Male" : activePatient.sex === "F" ? "Female" : "Other"
      } / ${activePatient.ageYears} yrs`
    : "";

  const nav: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: "dashboard", label: "Dashboard", icon: <IconGrid /> },
    { key: "patients", label: "Patients", icon: <IconUser /> },
    { key: "reports", label: "Reports", icon: <IconFlask /> },
    { key: "settings", label: "Settings", icon: <IconGear /> },
  ];

  const goNewPatient = () => {
    setDraft(EMPTY_PATIENT);
    setDuplicates([]);
    setError("");
    setView("newPatient");
  };

  return (
    <div className="page">
      <div className="frame">
        <header className="topbar no-print">
          <div className="brand-chip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="" className="brand-logo" />
            <div>
              <div className="brand-name">TRP POLYCLINIC</div>
              <div className="brand-sub">Tandi Ratnanagar · Pathology</div>
            </div>
          </div>

          <div className="searchbar">
            <IconSearch />
            <input
              placeholder="Search patients, MRN or report ID"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
                setView("patients");
              }}
              aria-label="Search patients"
            />
          </div>

          <div className="topbar-actions">
            <button onClick={goNewPatient}>+ Patient</button>
            <button onClick={() => setView("patients")}>+ Lab order</button>
            <span className="icon-square" aria-hidden="true">
              <IconBell />
            </span>
            <button
              className="avatar"
              title={`${profile.full_name} — sign out`}
              aria-label={`${profile.full_name}, sign out`}
              onClick={async () => {
                await signOut();
                setProfile(null);
              }}
            >
              {initialsOf(profile.full_name)}
            </button>
          </div>
        </header>

        <div className="body-split">
          <nav className="rail no-print" aria-label="Main">
            {nav.map((n) => (
              <button
                key={n.key}
                className={`rail-btn ${view === n.key ? "active" : ""}`}
                onClick={() => setView(n.key)}
                title={n.label}
                aria-label={n.label}
                aria-current={view === n.key ? "page" : undefined}
              >
                {n.icon}
              </button>
            ))}
            <div className="spacer" />
            <button
              className="rail-btn"
              title="Sign out"
              aria-label="Sign out"
              onClick={async () => {
                await signOut();
                setProfile(null);
              }}
            >
              <IconLogout />
            </button>
          </nav>

          <div className="work">
            {error && (
              <div className="banner no-print" role="alert">
                <strong>{error}</strong>
                <button
                  className="ghost"
                  style={{ marginLeft: "var(--space-4)" }}
                  onClick={() => setError("")}
                >
                  Dismiss
                </button>
              </div>
            )}

            {view === "dashboard" && (
              <div className="no-print">
                <Dashboard
                  stats={stats}
                  activity={activity}
                  onViewAll={() => setView("reports")}
                />
              </div>
            )}

            {view === "patients" && (
              <div className="no-print">
                <div className="page-head">
                  <div>
                    <h1>Patients</h1>
                    <div className="page-sub">
                      {stats.totalPatients.toLocaleString()} registered ·{" "}
                      {stats.newThisWeek} new this week
                    </div>
                  </div>
                  <div className="spacer" />
                  <button className="primary" onClick={goNewPatient}>
                    + New patient
                  </button>
                </div>
                <PatientsTable
                  rows={rows}
                  total={total}
                  page={page}
                  pageSize={PAGE_SIZE}
                  filter={filter}
                  query={query}
                  loading={listLoading}
                  onQuery={(q) => {
                    setQuery(q);
                    setPage(0);
                  }}
                  onFilter={(f) => {
                    setFilter(f);
                    setPage(0);
                  }}
                  onPage={setPage}
                  onOpen={openRow}
                />
              </div>
            )}

            {view === "reports" && (
              <div className="no-print">
                <div className="page-head">
                  <div>
                    <h1>Reports</h1>
                    <div className="page-sub">
                      {stats.awaitingVerification} awaiting verification ·{" "}
                      {stats.releasedToday} released today
                    </div>
                  </div>
                </div>

                <div className="verify-split">
                  <div className="card" style={{ padding: "var(--space-4)" }}>
                    <div
                      className="card-title"
                      style={{ fontSize: "var(--text-lg)", margin: "4px 4px 12px" }}
                    >
                      Verification queue
                    </div>
                    {reports.length === 0 ? (
                      <div className="empty">Nothing in the queue.</div>
                    ) : (
                      reports.map((r) => (
                        <button
                          key={r.id}
                          className={`queue-item ${orderId === r.id ? "on" : ""}`}
                          onClick={() => openReport(r)}
                        >
                          <div className="row" style={{ gap: "var(--space-2)" }}>
                            <span className="queue-name">
                              {r.patientSnapshot.fullName}
                            </span>
                            <div className="spacer" />
                            <span
                              className={`chip ${r.status === "released" ? "good" : "warn"}`}
                            >
                              {r.status === "released" ? "Released" : "Pending"}
                            </span>
                          </div>
                          <div className="queue-test">
                            {r.panelIds
                              .map((id) => PANEL_BY_ID.get(id)?.title ?? id)
                              .join(", ")}
                          </div>
                          <div className="queue-meta">
                            {r.accession} · {toBs(r.sampleDateISO)} BS ·{" "}
                            {toTime(r.sampleDateISO)}
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {activePatient && orderId ? (
                    <div className="card" style={{ padding: "24px 26px" }}>
                      <div
                        className="row"
                        style={{
                          alignItems: "flex-start",
                          paddingBottom: "var(--space-5)",
                          borderBottom: "1px solid var(--border-soft)",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "var(--text-xl)",
                              fontWeight: 800,
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {activePatient.fullName}
                          </div>
                          <div
                            style={{
                              fontSize: "var(--text-base)",
                              color: "var(--text-secondary)",
                              marginTop: "5px",
                            }}
                          >
                            {activePatient.sex === "M"
                              ? "Male"
                              : activePatient.sex === "F"
                                ? "Female"
                                : "Other"}{" "}
                            / {activePatient.ageYears} yrs ·{" "}
                            {selectedPanels.map((p) => p.title).join(", ")}
                          </div>
                        </div>
                        <div className="spacer" />
                        <button onClick={() => setView("preview")}>
                          <IconPrint /> Print
                        </button>
                        {releasedVersion > 0 ? (
                          <span className="chip good">Released v{releasedVersion}</span>
                        ) : canRelease ? (
                          <button
                            className="primary"
                            disabled={busy}
                            onClick={doRelease}
                          >
                            {busy ? "Releasing…" : "Verify & release"}
                          </button>
                        ) : (
                          <span className="chip warn">Verifier must release</span>
                        )}
                      </div>

                      <div className="meta-grid">
                        <div>
                          <div className="meta-k">MRN</div>
                          <div className="meta-v">{activePatient.mrn}</div>
                        </div>
                        <div>
                          <div className="meta-k">Accession</div>
                          <div className="meta-v">{accession}</div>
                        </div>
                        <div>
                          <div className="meta-k">Collected</div>
                          <div className="meta-v">
                            {toBs(sampleDateISO)} BS · {toTime(sampleDateISO)}
                          </div>
                        </div>
                        <div>
                          <div className="meta-k">Referred by</div>
                          <div className="meta-v">
                            {activePatient.referredBy || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="analyte-panel">
                        <div
                          className="ghead"
                          style={{
                            gridTemplateColumns: "1.6fr .8fr .7fr 1.1fr .7fr",
                            padding: "14px 6px 10px",
                            borderBottom: "1px solid var(--border)",
                            fontWeight: 700,
                            fontSize: "12px",
                          }}
                        >
                          <div>Analyte</div>
                          <div>Result</div>
                          <div>Unit</div>
                          <div>Reference range</div>
                          <div>Flag</div>
                        </div>
                        {[...computed.values()]
                          .filter((c) => c.display !== "")
                          .map((c) => {
                            const marker = flagMarker(c.flag);
                            const abnormal = marker !== "";
                            return (
                              <div
                                key={c.analyte.id}
                                className="grow"
                                style={{
                                  gridTemplateColumns: "1.6fr .8fr .7fr 1.1fr .7fr",
                                  padding: "11px 6px",
                                  borderBottom: "1px solid #eff1f5",
                                }}
                              >
                                <div className="cell-dim" style={{ color: "var(--text-body)" }}>
                                  {c.analyte.name}
                                </div>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    color: abnormal
                                      ? marker === "H"
                                        ? "var(--flag-high)"
                                        : "var(--flag-low)"
                                      : "var(--text)",
                                  }}
                                >
                                  {c.display}
                                </div>
                                <div className="cell-dim">{c.analyte.unit ?? ""}</div>
                                <div className="cell-dim">
                                  {c.analyte.rangeLines.join(" / ")}
                                </div>
                                <div>
                                  {abnormal && (
                                    <span
                                      className={`chip ${marker === "H" ? "danger" : "info"}`}
                                    >
                                      {isCritical(c.flag) ? `${marker} critical` : marker}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      <div className="note-row">
                        <div className="note-box">
                          <div className="note-k">Comment</div>
                          <div style={{ fontSize: "var(--text-base)", lineHeight: 1.55 }}>
                            {Object.values(comments).filter(Boolean).join(" ") ||
                              "No comment recorded."}
                          </div>
                        </div>
                        <div className="note-box narrow">
                          <div className="note-k">Signed by</div>
                          <div style={{ fontSize: "var(--text-md)", fontWeight: 700 }}>
                            {settings.verifierName || "Not set"}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                              marginTop: "3px",
                            }}
                          >
                            {settings.verifierQualification || "—"}
                            {settings.verifierNmc ? ` · NMC ${settings.verifierNmc}` : ""}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="card">
                      <div className="empty">
                        Select a report from the queue to review it.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {view === "newPatient" && (
              <div className="no-print">
                <div className="page-head">
                  <div>
                    <h1>New patient</h1>
                    <div className="page-sub">
                      A registration number is assigned automatically
                    </div>
                  </div>
                </div>

                <div className="card" style={{ maxWidth: "780px" }}>
                  <div className="field">
                    <label htmlFor="pname">Full name</label>
                    <input
                      id="pname"
                      autoFocus
                      value={draft.fullName}
                      onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
                    />
                    {duplicates.length > 0 && (
                      <p style={{ color: "var(--warn-fg)", fontSize: "var(--text-sm)" }}>
                        {duplicates.length} existing patient
                        {duplicates.length > 1 ? "s" : ""} with this name (
                        {duplicates.map((d) => `MRN ${d.mrn}, ${d.ageYears}y`).join("; ")}
                        ). Check before continuing.
                      </p>
                    )}
                  </div>

                  <div className="grid cols-3">
                    <div className="field">
                      <label htmlFor="psex">Sex</label>
                      <select
                        id="psex"
                        value={draft.sex}
                        onChange={(e) =>
                          setDraft({ ...draft, sex: e.target.value as Sex })
                        }
                      >
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="page">Age (years)</label>
                      <input
                        id="page"
                        inputMode="numeric"
                        value={draft.ageYears === 0 ? "" : draft.ageYears}
                        onChange={(e) =>
                          setDraft({ ...draft, ageYears: Number(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="pphone">Phone</label>
                      <input
                        id="pphone"
                        value={draft.phone ?? ""}
                        onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid cols-2">
                    <div className="field">
                      <label htmlFor="paddr">Address</label>
                      <input
                        id="paddr"
                        placeholder="Ratnanagar-2, Chitwan"
                        value={draft.address ?? ""}
                        onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="pref">Referred by</label>
                      <input
                        id="pref"
                        placeholder="Dr. …"
                        value={draft.referredBy ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, referredBy: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="row">
                    <button onClick={() => setView("patients")}>Cancel</button>
                    <div className="spacer" />
                    <button
                      className="primary"
                      disabled={
                        busy || draft.fullName.trim() === "" || draft.ageYears <= 0
                      }
                      onClick={savePatientAndOrder}
                    >
                      {busy ? "Saving…" : "Save & choose tests →"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {view === "order" && activePatient && (
              <div className="no-print">
                <div className="page-head">
                  <div>
                    <h1>Choose tests</h1>
                    <div className="page-sub">{patientLine}</div>
                  </div>
                </div>

                <div className="grid cols-2">
                  {PANELS.map((panel) => {
                    const on = panelIds.includes(panel.id);
                    return (
                      <button
                        key={panel.id}
                        onClick={() =>
                          setPanelIds((prev) =>
                            prev.includes(panel.id)
                              ? prev.filter((x) => x !== panel.id)
                              : [...prev, panel.id],
                          )
                        }
                        aria-pressed={on}
                        style={{
                          display: "block",
                          textAlign: "left",
                          padding: "var(--space-5)",
                          borderRadius: "var(--radius-xl)",
                          borderColor: on ? "var(--brand)" : "var(--border)",
                          background: on ? "var(--brand-weak)" : "var(--surface)",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: "var(--text-md)" }}>
                          {on ? "☑" : "☐"} {panel.title}
                        </div>
                        <div
                          style={{
                            color: "var(--text-faint)",
                            fontSize: "var(--text-sm)",
                            marginTop: "3px",
                          }}
                        >
                          {panel.department}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="toolbar">
                  <button onClick={() => setView("patients")}>← Back</button>
                  <div className="spacer" />
                  <span className="muted">{panelIds.length} selected</span>
                  <button
                    className="primary"
                    disabled={busy || panelIds.length === 0}
                    onClick={startEntry}
                  >
                    {busy ? "Creating order…" : "Enter results →"}
                  </button>
                </div>
              </div>
            )}

            {view === "entry" && activePatient && (
              <div className="no-print">
                <div className="page-head">
                  <div>
                    <h1>Enter results</h1>
                    <div className="page-sub">
                      {patientLine} · {accession} · Sample {toBs(sampleDateISO)} BS
                    </div>
                  </div>
                </div>

                {criticals.length > 0 && (
                  <div className="banner">
                    <strong>
                      {criticals.length} critical value
                      {criticals.length > 1 ? "s" : ""} detected.
                    </strong>
                    <ul style={{ margin: "var(--space-3) 0" }}>
                      {criticals.map((c) => (
                        <li key={c.analyte.id}>
                          {c.analyte.name}: {c.display} {c.analyte.unit ?? ""}
                        </li>
                      ))}
                    </ul>
                    <label
                      style={{
                        fontSize: "var(--text-base)",
                        display: "flex",
                        gap: "var(--space-3)",
                        alignItems: "center",
                        marginBottom: 0,
                        color: "var(--text)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={criticalAcknowledged}
                        onChange={(e) => setCriticalAcknowledged(e.target.checked)}
                        style={{ width: "auto" }}
                      />
                      I confirm these results have been re-checked.
                    </label>
                  </div>
                )}

                <div className="notice">
                  <kbd>Enter</kbd> or <kbd>↓</kbd> moves to the next test. Greyed rows
                  are calculated automatically and cannot be typed into.
                </div>

                <ResultEntry
                  patient={activePatient}
                  panelIds={panelIds}
                  values={values}
                  comments={comments}
                  computed={computed}
                  onChange={(id, v) => setValues((prev) => ({ ...prev, [id]: v }))}
                  onCommentChange={(id, v) =>
                    setComments((prev) => ({ ...prev, [id]: v }))
                  }
                />

                <div className="toolbar">
                  <button onClick={() => setView("order")}>← Tests</button>
                  <div className="spacer" />
                  <span className="muted">
                    {progress.entered} of {progress.total} entered
                  </span>
                  <button
                    className="primary"
                    disabled={busy || (criticals.length > 0 && !criticalAcknowledged)}
                    onClick={goToPreview}
                  >
                    {busy ? "Saving…" : "Save & preview →"}
                  </button>
                </div>
              </div>
            )}

            {view === "preview" && activePatient && (
              <>
                <div className="no-print">
                  <div className="page-head">
                    <div>
                      <h1>Report preview</h1>
                      <div className="page-sub">
                        {patientLine} · {accession}
                      </div>
                    </div>
                    <div className="spacer" />
                    <button onClick={() => setView("entry")}>← Edit results</button>
                    <button
                      onClick={() =>
                        setSettings({
                          ...settings,
                          letterheadMode:
                            settings.letterheadMode === "full" ? "preprinted" : "full",
                        })
                      }
                    >
                      {settings.letterheadMode === "full"
                        ? "Letterhead: app-printed"
                        : "Letterhead: preprinted"}
                    </button>
                    {releasedVersion > 0 ? (
                      <>
                        <span className="chip good">Released v{releasedVersion}</span>
                        <button className="primary" onClick={() => window.print()}>
                          <IconPrint /> Reprint
                        </button>
                      </>
                    ) : canRelease ? (
                      <button className="primary" disabled={busy} onClick={doRelease}>
                        {busy ? "Releasing…" : "Verify & release"}
                      </button>
                    ) : (
                      <span className="chip warn">A verifier must release this</span>
                    )}
                  </div>
                </div>

                <div id="print-root">
                  <ReportSheet
                    patient={activePatient}
                    panelIds={panelIds}
                    computed={computed}
                    comments={comments}
                    accession={accession}
                    sampleDateISO={sampleDateISO}
                    reportDateISO={new Date().toISOString()}
                    settings={settings}
                  />
                </div>
              </>
            )}

            {view === "settings" && (
              <div className="no-print">
                <div className="page-head">
                  <div>
                    <h1>Settings</h1>
                    <div className="page-sub">
                      Signed in as {profile.full_name} ({profile.role}
                      {canRelease ? ", can release reports" : ""}) ·{" "}
                      {dualDate(new Date().toISOString())}
                    </div>
                  </div>
                </div>

                <div className="notice">
                  Clinic, letterhead and verifier details are stored in this browser,
                  so each computer needs them set once. Moving them into the database
                  is a later phase.
                </div>

                <div className="card">
                  <div className="card-head" style={{ marginBottom: "var(--space-4)" }}>
                    <span className="card-title">Clinic</span>
                  </div>
                  <div className="field">
                    <label htmlFor="cname">Clinic name</label>
                    <input
                      id="cname"
                      value={settings.clinicName}
                      onChange={(e) =>
                        setSettings({ ...settings, clinicName: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid cols-3">
                    <div className="field">
                      <label htmlFor="caddr">Address</label>
                      <input
                        id="caddr"
                        value={settings.clinicAddress}
                        onChange={(e) =>
                          setSettings({ ...settings, clinicAddress: e.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="cphone">Phone</label>
                      <input
                        id="cphone"
                        value={settings.clinicPhone}
                        onChange={(e) =>
                          setSettings({ ...settings, clinicPhone: e.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="cemail">Email</label>
                      <input
                        id="cemail"
                        value={settings.clinicEmail}
                        onChange={(e) =>
                          setSettings({ ...settings, clinicEmail: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-head" style={{ marginBottom: "var(--space-4)" }}>
                    <span className="card-title">Letterhead</span>
                  </div>
                  <div className="grid cols-2">
                    <div className="field">
                      <label htmlFor="lhmode">Mode</label>
                      <select
                        id="lhmode"
                        value={settings.letterheadMode}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            letterheadMode:
                              e.target.value === "full" ? "full" : "preprinted",
                          })
                        }
                      >
                        <option value="full">App prints the letterhead (blank A4)</option>
                        <option value="preprinted">
                          Preprinted stationery (leave top blank)
                        </option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="lhtop">
                        Top reserve for preprinted paper (mm)
                      </label>
                      <input
                        id="lhtop"
                        inputMode="numeric"
                        value={settings.preprintedTopMm}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            preprintedTopMm: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-head" style={{ marginBottom: "var(--space-4)" }}>
                    <span className="card-title">Verifier</span>
                  </div>
                  <div className="grid cols-3">
                    <div className="field">
                      <label htmlFor="vname">Name</label>
                      <input
                        id="vname"
                        placeholder="Dr. …"
                        value={settings.verifierName}
                        onChange={(e) =>
                          setSettings({ ...settings, verifierName: e.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="vqual">Qualification</label>
                      <input
                        id="vqual"
                        placeholder="MD Pathology"
                        value={settings.verifierQualification}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            verifierQualification: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="vnmc">NMC registration no.</label>
                      <input
                        id="vnmc"
                        value={settings.verifierNmc}
                        onChange={(e) =>
                          setSettings({ ...settings, verifierNmc: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
