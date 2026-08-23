"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PANELS, PANEL_BY_ID } from "@/lib/catalog";
import { computeAll, enteredCount } from "@/lib/compute";
import { dualDate, toAd, toBs } from "@/lib/dates";
import { isCritical } from "@/lib/ranges";
import {
  DEFAULT_SETTINGS,
  loadPatients,
  loadReports,
  loadSettings,
  newId,
  nextAccession,
  nextMrn,
  savePatients,
  saveReports,
  saveSettings,
  searchPatients,
  type Settings,
} from "@/lib/storage";
import type { Panel, Patient, ReportRecord, Sex } from "@/lib/types";
import { ReportSheet } from "./ReportSheet";
import { ResultEntry } from "./ResultEntry";

type View = "home" | "patient" | "order" | "entry" | "preview" | "settings";

const EMPTY_PATIENT: Patient = {
  id: "",
  mrn: "",
  fullName: "",
  sex: "M",
  ageYears: 0,
  phone: "",
  address: "",
  referredBy: "",
};

export function App() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("home");

  const [patients, setPatients] = useState<Patient[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const [query, setQuery] = useState("");
  const [draftPatient, setDraftPatient] = useState<Patient>(EMPTY_PATIENT);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);

  const [panelIds, setPanelIds] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [accession, setAccession] = useState("");
  const [sampleDateISO, setSampleDateISO] = useState("");
  const [criticalAcknowledged, setCriticalAcknowledged] = useState(false);

  /* Load once on mount — localStorage is not available during SSR. */
  useEffect(() => {
    setPatients(loadPatients());
    setReports(loadReports());
    setSettings(loadSettings());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) savePatients(patients);
  }, [patients, ready]);

  useEffect(() => {
    if (ready) saveReports(reports);
  }, [reports, ready]);

  useEffect(() => {
    if (ready) saveSettings(settings);
  }, [settings, ready]);

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

  const filtered = useMemo(() => searchPatients(patients, query), [patients, query]);

  /* ---------------------------------------------------------------- */

  const startNewPatient = useCallback(() => {
    setDraftPatient({ ...EMPTY_PATIENT, id: newId(), mrn: nextMrn(patients) });
    setView("patient");
  }, [patients]);

  const savePatient = useCallback(() => {
    const patient = { ...draftPatient, fullName: draftPatient.fullName.trim() };
    setPatients((prev) => {
      const exists = prev.some((p) => p.id === patient.id);
      return exists ? prev.map((p) => (p.id === patient.id ? patient : p)) : [patient, ...prev];
    });
    setActivePatient(patient);
    setPanelIds([]);
    setView("order");
  }, [draftPatient]);

  const beginOrder = useCallback(
    (patient: Patient) => {
      setActivePatient(patient);
      setPanelIds([]);
      setValues({});
      setComments({});
      setCriticalAcknowledged(false);
      setAccession(nextAccession(reports));
      setSampleDateISO(new Date().toISOString());
      setView("order");
    },
    [reports],
  );

  const togglePanel = useCallback((id: string) => {
    setPanelIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }, []);

  const saveReport = useCallback(() => {
    if (!activePatient) return;
    const now = new Date().toISOString();
    const record: ReportRecord = {
      id: newId(),
      accession,
      patientId: activePatient.id,
      patientSnapshot: activePatient,
      panelIds,
      values,
      comments,
      sampleDateISO,
      reportDateISO: now,
      createdAtISO: now,
      status: "released",
      verifierName: settings.verifierName,
      verifierQualification: settings.verifierQualification,
      verifierNmc: settings.verifierNmc,
    };
    setReports((prev) => [record, ...prev]);
  }, [activePatient, accession, panelIds, values, comments, sampleDateISO, settings]);

  const openReport = useCallback((record: ReportRecord) => {
    setActivePatient(record.patientSnapshot);
    setPanelIds(record.panelIds);
    setValues(record.values);
    setComments(record.comments);
    setAccession(record.accession);
    setSampleDateISO(record.sampleDateISO);
    setCriticalAcknowledged(true);
    setView("preview");
  }, []);

  if (!ready) {
    return (
      <div className="app">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */

  return (
    <div className="app">
      <header className="topbar no-print">
        <div>
          <div className="brandmark">TRP Lab Reports</div>
          <div className="brandsub">Tandi Ratnanagar Polyclinic · Pathology</div>
        </div>
        <div className="spacer" />
        <span className="demo-badge">DEMO — not for clinical use</span>
        <button className="ghost" onClick={() => setView("home")}>
          Home
        </button>
        <button className="ghost" onClick={() => setView("settings")}>
          Settings
        </button>
      </header>

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
            <button className="primary" onClick={startNewPatient}>
              + New patient
            </button>
          </div>

          <div className="list">
            {filtered.length === 0 ? (
              <div className="empty">
                {patients.length === 0
                  ? "No patients yet. Add one to generate your first report."
                  : "No patient matches that search."}
              </div>
            ) : (
              filtered.map((p) => (
                <button className="list-item" key={p.id} onClick={() => beginOrder(p)}>
                  <div style={{ flex: 1 }}>
                    <div className="name">{p.fullName}</div>
                    <div className="muted">
                      MRN {p.mrn} · {p.sex === "M" ? "Male" : p.sex === "F" ? "Female" : "Other"} /{" "}
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
              <div className="empty">No reports generated yet.</div>
            ) : (
              reports.slice(0, 12).map((r) => (
                <button className="list-item" key={r.id} onClick={() => openReport(r)}>
                  <div style={{ flex: 1 }}>
                    <div className="name">{r.patientSnapshot.fullName}</div>
                    <div className="muted">
                      {r.accession} ·{" "}
                      {r.panelIds
                        .map((id) => PANEL_BY_ID.get(id)?.title ?? id)
                        .join(", ")}{" "}
                      · {toBs(r.reportDateISO)} BS
                    </div>
                  </div>
                  <span className="pill">Reprint →</span>
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
            MRN {draftPatient.mrn} · assigned automatically
          </p>

          <div className="card">
            <div className="field">
              <label htmlFor="pname">Full name</label>
              <input
                id="pname"
                autoFocus
                value={draftPatient.fullName}
                onChange={(e) =>
                  setDraftPatient({ ...draftPatient, fullName: e.target.value })
                }
              />
              {draftPatient.fullName.trim().length > 2 &&
                patients.some(
                  (p) =>
                    p.id !== draftPatient.id &&
                    p.fullName.toLowerCase() === draftPatient.fullName.trim().toLowerCase(),
                ) && (
                  <p className="muted" style={{ color: "var(--warn)" }}>
                    A patient with this name already exists. Check before continuing.
                  </p>
                )}
            </div>

            <div className="grid cols-3">
              <div className="field">
                <label htmlFor="psex">Sex</label>
                <select
                  id="psex"
                  value={draftPatient.sex}
                  onChange={(e) =>
                    setDraftPatient({ ...draftPatient, sex: e.target.value as Sex })
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
                  value={draftPatient.ageYears === 0 ? "" : draftPatient.ageYears}
                  onChange={(e) =>
                    setDraftPatient({
                      ...draftPatient,
                      ageYears: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="field">
                <label htmlFor="pphone">Phone</label>
                <input
                  id="pphone"
                  value={draftPatient.phone ?? ""}
                  onChange={(e) =>
                    setDraftPatient({ ...draftPatient, phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid cols-2">
              <div className="field">
                <label htmlFor="paddr">Address</label>
                <input
                  id="paddr"
                  placeholder="Ratnanagar-2, Chitwan"
                  value={draftPatient.address ?? ""}
                  onChange={(e) =>
                    setDraftPatient({ ...draftPatient, address: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="pref">Referred by</label>
                <input
                  id="pref"
                  placeholder="Dr. …"
                  value={draftPatient.referredBy ?? ""}
                  onChange={(e) =>
                    setDraftPatient({ ...draftPatient, referredBy: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="toolbar">
            <button onClick={() => setView("home")}>Cancel</button>
            <div className="spacer" />
            <button
              className="primary"
              disabled={draftPatient.fullName.trim() === "" || draftPatient.ageYears <= 0}
              onClick={() => {
                setAccession(nextAccession(reports));
                setSampleDateISO(new Date().toISOString());
                setValues({});
                setComments({});
                setCriticalAcknowledged(false);
                savePatient();
              }}
            >
              Save &amp; choose tests →
            </button>
          </div>
        </section>
      )}

      {view === "order" && activePatient && (
        <section className="no-print">
          <h1>Choose tests</h1>
          <p className="muted" style={{ marginBottom: "var(--space-4)" }}>
            {activePatient.fullName} · MRN {activePatient.mrn} ·{" "}
            {activePatient.sex === "M" ? "Male" : activePatient.sex === "F" ? "Female" : "Other"} /{" "}
            {activePatient.ageYears} yrs · {accession}
          </p>

          <div className="grid cols-2">
            {PANELS.map((panel) => {
              const on = panelIds.includes(panel.id);
              return (
                <button
                  key={panel.id}
                  onClick={() => togglePanel(panel.id)}
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
              disabled={panelIds.length === 0}
              onClick={() => setView("entry")}
            >
              Enter results →
            </button>
          </div>
        </section>
      )}

      {view === "entry" && activePatient && (
        <section className="no-print">
          <h1>Enter results</h1>
          <p className="muted" style={{ marginBottom: "var(--space-4)" }}>
            {activePatient.fullName} ·{" "}
            {activePatient.sex === "M" ? "Male" : activePatient.sex === "F" ? "Female" : "Other"} /{" "}
            {activePatient.ageYears} yrs · {accession} · Sample {toBs(sampleDateISO)} BS
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
              disabled={criticals.length > 0 && !criticalAcknowledged}
              onClick={() => {
                saveReport();
                setView("preview");
              }}
            >
              Preview &amp; print →
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
              <button className="primary" onClick={() => window.print()}>
                Print / Save as PDF
              </button>
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
            <h2>Data</h2>
            <p className="muted">
              This demo stores everything in this browser on this computer only. Nothing
              is sent anywhere. Clearing your browser data will erase it. Today is{" "}
              {toAd(new Date().toISOString())} AD.
            </p>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Erase all demo patients and reports from this browser? This cannot be undone.",
                  )
                ) {
                  setPatients([]);
                  setReports([]);
                  setView("home");
                }
              }}
            >
              Erase all demo data
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
