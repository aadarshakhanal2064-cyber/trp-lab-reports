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
  searchPatientsDb,
  signOut,
  type Profile,
} from "@/lib/db";
import { currentBsYear, dualDate, toAd, toBs } from "@/lib/dates";
import { isCritical } from "@/lib/ranges";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from "@/lib/storage";
import type { Panel, Patient, ReportRecord, Sex } from "@/lib/types";
import { Login } from "./Login";
import { ReportSheet } from "./ReportSheet";
import { ResultEntry } from "./ResultEntry";

type View = "home" | "patient" | "order" | "entry" | "preview" | "settings";

const EMPTY_PATIENT: Omit<Patient, "id" | "mrn"> = {
  fullName: "",
  sex: "M",
  ageYears: 0,
  phone: "",
  address: "",
  referredBy: "",
};

/** Which panel an analyte belongs to — needed when writing results. */
const PANEL_OF_ANALYTE = new Map<string, string>();
for (const p of PANELS) {
  for (const a of analytesOf(p)) PANEL_OF_ANALYTE.set(a.id, p.id);
}

export function App() {
  const [booting, setBooting] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<View>("home");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const [query, setQuery] = useState("");
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

  const refresh = useCallback(async () => {
    const [found, recent] = await Promise.all([
      searchPatientsDb(query),
      recentReports(),
    ]);
    setPatients(found);
    setReports(recent);
  }, [query]);

  useEffect(() => {
    (async () => {
      try {
        const p = await getProfile();
        setProfile(p);
        setSettings(loadSettings());
        if (p) await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Startup failed.");
      } finally {
        setBooting(false);
      }
    })();
    // Runs once on mount; refresh is re-invoked explicitly elsewhere.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Debounced patient search. */
  useEffect(() => {
    if (!profile) return;
    const t = setTimeout(() => {
      searchPatientsDb(query).then(setPatients).catch(() => undefined);
    }, 200);
    return () => clearTimeout(t);
  }, [query, profile]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  /* Duplicate check while typing a new patient's name. */
  useEffect(() => {
    if (view !== "patient") return;
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

  const fail = (e: unknown) =>
    setError(e instanceof Error ? e.message : "Something went wrong.");

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

  const savePatientAndOrder = useCallback(async () => {
    if (!profile) return;
    setBusy(true);
    try {
      const saved = await createPatient(draft, profile.id);
      await refresh();
      beginOrder(saved);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }, [draft, profile, refresh, beginOrder]);

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
      await saveResults(
        orderId,
        values,
        (a) => PANEL_OF_ANALYTE.get(a) ?? "",
        profile.id,
      );
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
      await refresh();
      window.print();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }, [profile, orderId, values, comments, settings, refresh]);

  const openReport = useCallback(
    async (record: ReportRecord) => {
      setActivePatient(record.patientSnapshot);
      setPanelIds(record.panelIds);
      setValues(record.values);
      setComments(record.comments);
      setAccession(record.accession);
      setOrderId(record.id);
      setSampleDateISO(record.sampleDateISO);
      setCriticalAcknowledged(true);
      setReleasedVersion(record.status === "released" ? 1 : 0);
      setView("preview");
      if (profile) await audit(profile.id, "report.view", "lab_order", record.id);
    },
    [profile],
  );

  /* ---------------------------------------------------------------- */

  if (booting) {
    return (
      <div className="app">
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
            if (p) await refresh();
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

  return (
    <div className="app">
      <header className="topbar no-print">
        <div>
          <div className="brandmark">TRP Lab Reports</div>
          <div className="brandsub">Tandi Ratnanagar Polyclinic · Pathology</div>
        </div>
        <div className="spacer" />
        <span className="pill on">
          {profile.full_name} · {profile.role}
        </span>
        <button className="ghost" onClick={() => setView("home")}>
          Home
        </button>
        <button className="ghost" onClick={() => setView("settings")}>
          Settings
        </button>
        <button
          className="ghost"
          onClick={async () => {
            await signOut();
            setProfile(null);
          }}
        >
          Sign out
        </button>
      </header>

      {error && (
        <div className="banner no-print" role="alert">
          <strong>{error}</strong>
          <button
            className="ghost"
            style={{ marginLeft: "var(--space-3)" }}
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </div>
      )}

      {view === "home" && (
        <section className="no-print">
          <h1>Patients</h1>
          <p className="muted" style={{ marginBottom: "var(--space-4)" }}>
            Today: {dualDate(new Date().toISOString())}
          </p>

          <div className="row" style={{ marginBottom: "var(--space-4)" }}>
            <input
              autoFocus
              placeholder="Search by name, phone or reg. number…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search patients"
              style={{ maxWidth: "420px" }}
            />
            <button
              className="primary"
              onClick={() => {
                setDraft(EMPTY_PATIENT);
                setDuplicates([]);
                setError("");
                setView("patient");
              }}
            >
              + New patient
            </button>
          </div>

          <div className="list">
            {patients.length === 0 ? (
              <div className="empty">
                {query
                  ? "No patient matches that search."
                  : "No patients yet. Add one to generate your first report."}
              </div>
            ) : (
              patients.map((p) => (
                <button className="list-item" key={p.id} onClick={() => beginOrder(p)}>
                  <div style={{ flex: 1 }}>
                    <div className="name">{p.fullName}</div>
                    <div className="muted">
                      MRN {p.mrn} ·{" "}
                      {p.sex === "M" ? "Male" : p.sex === "F" ? "Female" : "Other"} /{" "}
                      {p.ageYears} yrs{p.phone ? ` · ${p.phone}` : ""}
                    </div>
                  </div>
                  <span className="pill">New report →</span>
                </button>
              ))
            )}
          </div>

          <h2 style={{ marginTop: "var(--space-8)" }}>Recent reports</h2>
          <div className="list">
            {reports.length === 0 ? (
              <div className="empty">No reports yet.</div>
            ) : (
              reports.map((r) => (
                <button className="list-item" key={r.id} onClick={() => openReport(r)}>
                  <div style={{ flex: 1 }}>
                    <div className="name">{r.patientSnapshot.fullName}</div>
                    <div className="muted">
                      {r.accession} ·{" "}
                      {r.panelIds.map((id) => PANEL_BY_ID.get(id)?.title ?? id).join(", ")}{" "}
                      · {toBs(r.sampleDateISO)} BS
                    </div>
                  </div>
                  <span className="pill">
                    {r.status === "released" ? "Released" : "Draft"}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      )}

      {view === "patient" && (
        <section className="no-print">
          <h1>New patient</h1>
          <p className="muted" style={{ marginBottom: "var(--space-4)" }}>
            A registration number is assigned automatically on save.
          </p>

          <div className="card">
            <div className="field">
              <label htmlFor="pname">Full name</label>
              <input
                id="pname"
                autoFocus
                value={draft.fullName}
                onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
              />
              {duplicates.length > 0 && (
                <p className="muted" style={{ color: "var(--warn)" }}>
                  {duplicates.length} existing patient
                  {duplicates.length > 1 ? "s" : ""} with this name (
                  {duplicates.map((d) => `MRN ${d.mrn}, ${d.ageYears}y`).join("; ")}). Check
                  before continuing.
                </p>
              )}
            </div>

            <div className="grid cols-3">
              <div className="field">
                <label htmlFor="psex">Sex</label>
                <select
                  id="psex"
                  value={draft.sex}
                  onChange={(e) => setDraft({ ...draft, sex: e.target.value as Sex })}
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
                  onChange={(e) => setDraft({ ...draft, referredBy: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="toolbar">
            <button onClick={() => setView("home")}>Cancel</button>
            <div className="spacer" />
            <button
              className="primary"
              disabled={busy || draft.fullName.trim() === "" || draft.ageYears <= 0}
              onClick={savePatientAndOrder}
            >
              {busy ? "Saving…" : "Save & choose tests →"}
            </button>
          </div>
        </section>
      )}

      {view === "order" && activePatient && (
        <section className="no-print">
          <h1>Choose tests</h1>
          <p className="muted" style={{ marginBottom: "var(--space-4)" }}>
            {activePatient.fullName} · MRN {activePatient.mrn} ·{" "}
            {activePatient.sex === "M" ? "Male" : activePatient.sex === "F" ? "Female" : "Other"}{" "}
            / {activePatient.ageYears} yrs
          </p>

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
                    textAlign: "left",
                    padding: "var(--space-3)",
                    borderColor: on ? "var(--brand)" : "var(--border)",
                    background: on ? "var(--brand-weak)" : "var(--bg)",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                    {on ? "☑" : "☐"} {panel.title}
                  </div>
                  <div className="muted">{panel.department}</div>
                </button>
              );
            })}
          </div>

          <div className="toolbar">
            <button onClick={() => setView("home")}>← Back</button>
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
        </section>
      )}

      {view === "entry" && activePatient && (
        <section className="no-print">
          <h1>Enter results</h1>
          <p className="muted" style={{ marginBottom: "var(--space-4)" }}>
            {activePatient.fullName} ·{" "}
            {activePatient.sex === "M" ? "Male" : activePatient.sex === "F" ? "Female" : "Other"}{" "}
            / {activePatient.ageYears} yrs · {accession} · Sample {toBs(sampleDateISO)} BS
          </p>

          {criticals.length > 0 && (
            <div className="banner">
              <strong>
                {criticals.length} critical value{criticals.length > 1 ? "s" : ""} detected.
              </strong>
              <ul style={{ margin: "var(--space-2) 0" }}>
                {criticals.map((c) => (
                  <li key={c.analyte.id}>
                    {c.analyte.name}: {c.display} {c.analyte.unit ?? ""}
                  </li>
                ))}
              </ul>
              <label
                style={{
                  textTransform: "none",
                  fontSize: "var(--text-sm)",
                  display: "flex",
                  gap: "var(--space-2)",
                  alignItems: "center",
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
            <kbd>Enter</kbd> or <kbd>↓</kbd> moves to the next test. Greyed rows are
            calculated automatically and cannot be typed into.
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
        </section>
      )}

      {view === "preview" && activePatient && (
        <section>
          <div className="no-print">
            <h1>Report preview</h1>
            <div className="row" style={{ marginBottom: "var(--space-4)" }}>
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
                Letterhead:{" "}
                {settings.letterheadMode === "full" ? "Printed by app" : "Preprinted paper"}
              </button>
              <div className="spacer" />
              {releasedVersion > 0 ? (
                <>
                  <span className="pill on">Released v{releasedVersion}</span>
                  <button className="primary" onClick={() => window.print()}>
                    Reprint
                  </button>
                </>
              ) : canRelease ? (
                <button className="primary" disabled={busy} onClick={doRelease}>
                  {busy ? "Releasing…" : "Release & print"}
                </button>
              ) : (
                <span className="muted">
                  You do not have permission to release reports. A verifier must
                  release this.
                </span>
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
        </section>
      )}

      {view === "settings" && (
        <section className="no-print">
          <h1>Settings</h1>

          <div className="notice">
            These settings are stored in this browser only, so each computer needs
            them set once. Moving them into the database is a later phase.
          </div>

          <div className="card">
            <h2>Clinic</h2>
            <div className="field">
              <label htmlFor="cname">Clinic name</label>
              <input
                id="cname"
                value={settings.clinicName}
                onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
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
                  onChange={(e) => setSettings({ ...settings, clinicPhone: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="cemail">Email</label>
                <input
                  id="cemail"
                  value={settings.clinicEmail}
                  onChange={(e) => setSettings({ ...settings, clinicEmail: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Letterhead</h2>
            <div className="grid cols-2">
              <div className="field">
                <label htmlFor="lhmode">Mode</label>
                <select
                  id="lhmode"
                  value={settings.letterheadMode}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      letterheadMode: e.target.value === "full" ? "full" : "preprinted",
                    })
                  }
                >
                  <option value="full">App prints the letterhead (blank A4)</option>
                  <option value="preprinted">Preprinted stationery (leave top blank)</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="lhtop">Top reserve for preprinted paper (mm)</label>
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
            <h2>Verifier</h2>
            <div className="grid cols-3">
              <div className="field">
                <label htmlFor="vname">Name</label>
                <input
                  id="vname"
                  placeholder="Dr. …"
                  value={settings.verifierName}
                  onChange={(e) => setSettings({ ...settings, verifierName: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="vqual">Qualification</label>
                <input
                  id="vqual"
                  placeholder="MD Pathology"
                  value={settings.verifierQualification}
                  onChange={(e) =>
                    setSettings({ ...settings, verifierQualification: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="vnmc">NMC registration no.</label>
                <input
                  id="vnmc"
                  value={settings.verifierNmc}
                  onChange={(e) => setSettings({ ...settings, verifierNmc: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Account</h2>
            <p className="muted">
              Signed in as {profile.full_name} ({profile.role}
              {canRelease ? ", can release reports" : ""}). Today is{" "}
              {toAd(new Date().toISOString())} AD.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
