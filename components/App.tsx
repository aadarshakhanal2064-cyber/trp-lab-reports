"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PANELS, PANEL_BY_ID, analytesOf } from "@/lib/catalog";
import { computeAll, enteredCount } from "@/lib/compute";
import {
  audit,
  createOrder,
  createPatient,
  getProfile,
  loadOrganisation,
  markAwaitingVerification,
  nextAccessionDb,
  pruneResults,
  recentReports,
  releaseReport,
  saveOrganisation,
  saveResults,
  signOut,
  updateOrderPanels,
  updatePatient,
  type Organisation,
  type Profile,
} from "@/lib/db";
import { currentBsYear, toBs, toTime } from "@/lib/dates";
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
import { applyTheme, loadTheme, saveTheme, type Theme } from "@/lib/storage";
import type { Panel, Patient, ReportRecord } from "@/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { Dashboard, type OrderTab } from "./Dashboard";
import {
  IconEdit,
  IconFlask,
  IconGear,
  IconGrid,
  IconList,
  IconLogout,
  IconPrint,
  IconUser,
} from "./Icons";
import { Login } from "./Login";
import { PatientForm, type PatientDraft } from "./PatientForm";
import { PatientsTable } from "./PatientsTable";
import { ReportSheet } from "./ReportSheet";
import { ResultEntry } from "./ResultEntry";
import { SettingsView } from "./SettingsView";
import { TopBar } from "./TopBar";

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

const EMPTY_DRAFT: PatientDraft = {
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

const FALLBACK_ORG: Organisation = {
  clinic_name: "Tandi Ratnanagar Polyclinic Pvt. Ltd.",
  address: "Ratnanagar-2, Chitwan, Nepal",
  phone: "",
  email: "",
  registration_no: "",
  letterhead_mode: "full",
  preprinted_top_mm: 45,
  verifier_name: "",
  verifier_qualification: "",
  verifier_nmc: "",
};

export function App() {
  const [booting, setBooting] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [orderTab, setOrderTab] = useState<OrderTab>("All");

  const [rows, setRows] = useState<PatientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<PatientFilter>("all");
  const [query, setQuery] = useState("");
  const [listLoading, setListLoading] = useState(false);

  const [org, setOrg] = useState<Organisation>(FALLBACK_ORG);
  const [savedOrg, setSavedOrg] = useState<Organisation>(FALLBACK_ORG);

  const [draft, setDraft] = useState<PatientDraft>(EMPTY_DRAFT);
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
      recentReports(25),
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

  const bootstrap = useCallback(async () => {
    const p = await getProfile();
    setProfile(p);
    if (!p) return;
    const o = await loadOrganisation();
    if (o) {
      setOrg(o);
      setSavedOrg(o);
    }
    await refreshOverview();
  }, [refreshOverview]);

  useEffect(() => {
    const t = loadTheme();
    setTheme(t);
    applyTheme(t);
    (async () => {
      try {
        await bootstrap();
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

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      saveTheme(next);
      return next;
    });
  }, []);

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
    setAccession("");
    setReleasedVersion(0);
    setCriticalAcknowledged(false);
    setSampleDateISO(new Date().toISOString());
    setError("");
    setView("order");
  }, []);

  const rowToPatient = (r: PatientRow): Patient => ({
    id: r.id,
    mrn: r.mrn,
    fullName: r.fullName,
    sex: r.sex,
    ageYears: r.ageYears,
    phone: r.phone,
    address: r.address,
    referredBy: r.referredBy,
  });

  const savePatient = useCallback(async () => {
    if (!profile) return;
    setBusy(true);
    try {
      if (draft.id) {
        const saved = await updatePatient(draft as Patient, profile.id);
        setActivePatient((cur) => (cur && cur.id === saved.id ? saved : cur));
        await Promise.all([refreshOverview(), refreshList()]);
        setEditing(null);
      } else {
        const saved = await createPatient(draft, profile.id);
        await Promise.all([refreshOverview(), refreshList()]);
        beginOrder(saved);
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }, [draft, profile, refreshOverview, refreshList, beginOrder]);

  /**
   * Creates the order the first time, and only updates it thereafter.
   *
   * This previously created a fresh order on every visit to the screen, so
   * stepping back to change the test selection left empty duplicate orders
   * scattered under the same patient.
   */
  const startEntry = useCallback(async () => {
    if (!profile || !activePatient) return;
    setBusy(true);
    try {
      if (orderId) {
        await updateOrderPanels(orderId, panelIds);
        await pruneResults(orderId, panelIds);
        setValues((prev) => {
          const kept: Record<string, string> = {};
          for (const [analyteId, v] of Object.entries(prev)) {
            const panel = PANEL_OF_ANALYTE.get(analyteId);
            if (panel && panelIds.includes(panel)) kept[analyteId] = v;
          }
          return kept;
        });
      } else {
        const acc = await nextAccessionDb(currentBsYear());
        const id = await createOrder(activePatient.id, panelIds, acc, profile.id);
        setAccession(acc);
        setOrderId(id);
      }
      setView("entry");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }, [profile, activePatient, panelIds, orderId]);

  const goToPreview = useCallback(async () => {
    if (!profile || !orderId) return;
    setBusy(true);
    try {
      await saveResults(orderId, values, (a) => PANEL_OF_ANALYTE.get(a) ?? "", profile.id);
      await markAwaitingVerification(orderId);
      await refreshOverview();
      setView("preview");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }, [profile, orderId, values, refreshOverview]);

  const doRelease = useCallback(async () => {
    if (!profile || !orderId) return;
    setBusy(true);
    try {
      const v = await releaseReport(
        orderId,
        values,
        comments,
        {
          name: org.verifier_name,
          qualification: org.verifier_qualification,
          nmc: org.verifier_nmc,
        },
        org.letterhead_mode,
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
  }, [profile, orderId, values, comments, org, refreshOverview, refreshList]);

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

  const saveOrg = useCallback(async (): Promise<boolean> => {
    if (!profile) return false;
    setBusy(true);
    setError("");
    try {
      await saveOrganisation(org, profile.id);
      setSavedOrg(org);
      return true;
    } catch (e) {
      fail(e);
      return false;
    } finally {
      setBusy(false);
    }
  }, [org, profile]);

  const goNewPatient = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setError("");
    setView("newPatient");
  }, []);

  /** The KPI tiles are shortcuts into the worklist, not decoration. */
  const openKpi = useCallback((which: OrderTab | "patients") => {
    if (which === "patients") {
      setFilter("all");
      setPage(0);
      setView("patients");
      return;
    }
    setOrderTab(which);
    setView("dashboard");
  }, []);

  const startEdit = useCallback((p: Patient) => {
    setEditing(p);
    setDraft({ ...p });
  }, []);

  /* ---------------------------------------------------------------- */

  if (booting) {
    return (
      <div className="auth-page">
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <Login
        onSignedIn={async () => {
          setBooting(true);
          try {
            await bootstrap();
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

  return (
    <div className="wrap">
      <TopBar
        profile={profile}
        query={query}
        onQuery={(q) => {
          setQuery(q);
          setPage(0);
          setView("patients");
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNewPatient={goNewPatient}
        onNewOrder={() => setView("patients")}
        onSettings={() => setView("settings")}
        onSignOut={() => setConfirmSignOut(true)}
      />

      <div className="body-split">
        <nav className="rail no-print" aria-label="Main">
          <button
            className={`rail-btn ${view === "dashboard" ? "active" : ""}`}
            onClick={() => setView("dashboard")}
            title="Dashboard"
            aria-label="Dashboard"
            aria-current={view === "dashboard" ? "page" : undefined}
          >
            <IconGrid />
          </button>
          <button
            className={`rail-btn ${view === "patients" ? "active" : ""}`}
            onClick={() => setView("patients")}
            title="Patients"
            aria-label="Patients"
            aria-current={view === "patients" ? "page" : undefined}
          >
            <IconUser />
          </button>
          <button
            className={`rail-btn ${view === "reports" ? "active" : ""}`}
            onClick={() => setView("reports")}
            title="Reports"
            aria-label="Reports"
            aria-current={view === "reports" ? "page" : undefined}
          >
            <IconFlask />
          </button>
          <button className="rail-btn" disabled title="Billing — not built yet">
            <IconList />
          </button>
          <button
            className={`rail-btn ${view === "settings" ? "active" : ""}`}
            onClick={() => setView("settings")}
            title="Settings"
            aria-label="Settings"
            aria-current={view === "settings" ? "page" : undefined}
          >
            <IconGear />
          </button>
          <button
            className="rail-btn pushdown"
            title="Sign out"
            aria-label="Sign out"
            onClick={() => setConfirmSignOut(true)}
          >
            <IconLogout />
          </button>
        </nav>

        <div className="col">
          {error && (
            <div className="banner no-print" role="alert">
              <strong>{error}</strong>
              <button style={{ marginLeft: "var(--s-14)" }} onClick={() => setError("")}>
                Dismiss
              </button>
            </div>
          )}

          {view === "dashboard" && (
            <div className="no-print">
              <Dashboard
                stats={stats}
                activity={activity}
                orders={reports}
                tab={orderTab}
                onTab={setOrderTab}
                onOpenOrder={(r) => openReport(r, "reports")}
                onNewOrder={() => setView("patients")}
                onViewAll={() => setView("reports")}
                onOpenKpi={openKpi}
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
                onOpen={(r) => beginOrder(rowToPatient(r))}
                onEdit={(r) => startEdit(rowToPatient(r))}
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
                <div className="card pad">
                  <div
                    className="card-title"
                    style={{ fontSize: "var(--t-panel)", margin: "4px 4px 12px" }}
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
                        <div className="row" style={{ gap: "var(--s-8)" }}>
                          <span className="queue-name">{r.patientSnapshot.fullName}</span>
                          <div className="spacer" />
                          <span
                            className={`pill ${r.status === "released" ? "green" : "amber"}`}
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
                  <div className="card" style={{ padding: "var(--s-24) var(--s-26)" }}>
                    <div
                      className="row"
                      style={{
                        alignItems: "flex-start",
                        paddingBottom: "var(--s-18)",
                        borderBottom: "1px solid var(--divider-head)",
                      }}
                    >
                      <div>
                        <div className="report-title">{activePatient.fullName}</div>
                        <div className="report-meta">
                          {selectedPanels.map((p) => p.title).join(", ")} ·{" "}
                          {selectedPanels[0]?.department ?? "—"} · Report #{accession}
                        </div>
                      </div>
                      <div className="spacer" />
                      <button onClick={() => setView("preview")}>
                        <IconPrint /> Print
                      </button>
                      {releasedVersion > 0 ? (
                        <span className="pill green">Released v{releasedVersion}</span>
                      ) : canRelease ? (
                        <button className="primary" disabled={busy} onClick={doRelease}>
                          {busy ? "Releasing…" : "Verify & release"}
                        </button>
                      ) : (
                        <span className="pill amber">Verifier must release</span>
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
                        <div className="meta-v">{activePatient.referredBy || "—"}</div>
                      </div>
                    </div>

                    <div className="result-panel">
                      <div
                        className="ghead"
                        style={{ gridTemplateColumns: "1.6fr .8fr .7fr 1.1fr .7fr" }}
                      >
                        <div>Analyte</div>
                        <div>Result</div>
                        <div>Unit</div>
                        <div>Reference range</div>
                        <div>Flag</div>
                      </div>
                      {[...computed.values()].filter((c) => c.display !== "").length === 0 ? (
                        <div className="empty">No results entered for this order yet.</div>
                      ) : (
                        [...computed.values()]
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
                                }}
                              >
                                <div
                                  className="cell-dim"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  {c.analyte.name}
                                </div>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    color: abnormal
                                      ? marker === "H"
                                        ? "var(--danger-fg)"
                                        : "var(--warning-fg)"
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
                                  <span
                                    className={`pill ${
                                      marker === "H" ? "red" : marker === "L" ? "amber" : "green"
                                    }`}
                                  >
                                    {isCritical(c.flag)
                                      ? marker === "H"
                                        ? "Critical high"
                                        : "Critical low"
                                      : marker === "H"
                                        ? "High"
                                        : marker === "L"
                                          ? "Low"
                                          : "Normal"}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>

                    <div className="note-row">
                      <div className="note-box">
                        <div className="note-k">Comment</div>
                        <div className="note-body">
                          {Object.values(comments).filter(Boolean).join(" ") ||
                            "No comment recorded."}
                        </div>
                      </div>
                      <div className="note-box narrow">
                        <div className="note-k">Signed by</div>
                        <div style={{ fontSize: "var(--t-strong)", fontWeight: 700 }}>
                          {org.verifier_name || "Not set"}
                        </div>
                        <div
                          style={{
                            fontSize: "var(--t-caption)",
                            color: "var(--text-faint-2)",
                            marginTop: "3px",
                          }}
                        >
                          {org.verifier_qualification || "—"}
                          {org.verifier_nmc ? ` · NMC ${org.verifier_nmc}` : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card pad">
                    <div className="empty">Select a report from the queue to review it.</div>
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
              <div className="card pad" style={{ maxWidth: "780px" }}>
                <PatientForm
                  draft={draft}
                  mode="create"
                  busy={busy}
                  onChange={setDraft}
                  onSave={savePatient}
                  onCancel={() => setView("patients")}
                  onUseExisting={(p) => beginOrder(p)}
                />
              </div>
            </div>
          )}

          {view === "order" && activePatient && (
            <div className="no-print">
              <div className="page-head">
                <div>
                  <h1>Choose tests</h1>
                  <div className="page-sub">
                    {patientLine}
                    {accession ? ` · ${accession}` : ""}
                  </div>
                </div>
                <div className="spacer" />
                <button onClick={() => startEdit(activePatient)}>
                  <IconEdit /> Edit patient
                </button>
              </div>

              {orderId && (
                <div className="notice">
                  Editing order {accession}. Changing the selection updates this
                  order rather than creating a second one.
                </div>
              )}

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
                        padding: "var(--s-16)",
                        borderRadius: "var(--r-14)",
                        borderColor: on ? "var(--primary)" : "var(--border)",
                        background: on ? "var(--primary-tint)" : "var(--surface)",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "var(--t-strong)" }}>
                        {on ? "☑" : "☐"} {panel.title}
                      </div>
                      <div
                        style={{
                          color: "var(--text-faint)",
                          fontSize: "var(--t-control)",
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
                <span style={{ color: "var(--text-faint)" }}>
                  {panelIds.length} selected
                </span>
                <button
                  className="primary"
                  disabled={busy || panelIds.length === 0}
                  onClick={startEntry}
                >
                  {busy
                    ? "Saving…"
                    : orderId
                      ? "Update & enter results →"
                      : "Enter results →"}
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
                  <ul style={{ margin: "var(--s-8) 0" }}>
                    {criticals.map((c) => (
                      <li key={c.analyte.id}>
                        {c.analyte.name}: {c.display} {c.analyte.unit ?? ""}
                      </li>
                    ))}
                  </ul>
                  <label
                    style={{
                      fontSize: "var(--t-body)",
                      display: "flex",
                      gap: "var(--s-8)",
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
                onCommentChange={(id, v) => setComments((prev) => ({ ...prev, [id]: v }))}
              />

              <div className="toolbar">
                <button onClick={() => setView("order")}>← Tests</button>
                <div className="spacer" />
                <span style={{ color: "var(--text-faint)" }}>
                  {progress.entered} of {progress.total} entered
                </span>
                <button
                  className="primary"
                  disabled={
                    busy ||
                    progress.entered === 0 ||
                    (criticals.length > 0 && !criticalAcknowledged)
                  }
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
                      setOrg({
                        ...org,
                        letterhead_mode:
                          org.letterhead_mode === "full" ? "preprinted" : "full",
                      })
                    }
                    title="Preview only — set it permanently in Settings"
                  >
                    {org.letterhead_mode === "full"
                      ? "Letterhead: app-printed"
                      : "Letterhead: preprinted"}
                  </button>
                  {releasedVersion > 0 ? (
                    <>
                      <span className="pill green">Released v{releasedVersion}</span>
                      <button className="primary" onClick={() => window.print()}>
                        <IconPrint /> Reprint
                      </button>
                    </>
                  ) : canRelease ? (
                    <button className="primary" disabled={busy} onClick={doRelease}>
                      {busy ? "Releasing…" : "Verify & release"}
                    </button>
                  ) : (
                    <span className="pill amber">A verifier must release this</span>
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
                  org={org}
                />
              </div>
            </>
          )}

          {view === "settings" && (
            <div className="no-print">
              <SettingsView
                profile={profile}
                org={org}
                savedOrg={savedOrg}
                theme={theme}
                busy={busy}
                onChange={setOrg}
                onSave={saveOrg}
                onRevert={() => setOrg(savedOrg)}
                onToggleTheme={toggleTheme}
              />
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div
          className="scrim no-print"
          role="dialog"
          aria-modal="true"
          aria-label="Edit patient"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <div className="modal">
            <div className="modal-title">Edit patient</div>
            <div className="modal-body">
              MRN {editing.mrn} — the registration number never changes.
            </div>
            <PatientForm
              draft={draft}
              mode="edit"
              busy={busy}
              onChange={setDraft}
              onSave={savePatient}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}

      {confirmSignOut && (
        <ConfirmDialog
          title="Sign out?"
          body="Any results typed but not yet saved will be lost. Anything already saved stays on the server."
          confirmLabel="Sign out"
          danger
          onCancel={() => setConfirmSignOut(false)}
          onConfirm={async () => {
            setConfirmSignOut(false);
            await signOut();
            setProfile(null);
          }}
        />
      )}
    </div>
  );
}
