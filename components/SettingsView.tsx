"use client";

import { useEffect, useState } from "react";
import type { Organisation, Profile } from "@/lib/db";
import { dualDate } from "@/lib/dates";
import { IconCheck } from "./Icons";

interface Props {
  profile: Profile;
  org: Organisation;
  /** What is currently stored, so we can tell whether anything actually changed. */
  savedOrg: Organisation;
  theme: "light" | "dark";
  busy: boolean;
  onChange: (o: Organisation) => void;
  /** Resolves true when the save reached the database. */
  onSave: () => Promise<boolean>;
  onRevert: () => void;
  onToggleTheme: () => void;
}

export function SettingsView({
  profile,
  org,
  savedOrg,
  theme,
  busy,
  onChange,
  onSave,
  onRevert,
  onToggleTheme,
}: Props) {
  const [justSaved, setJustSaved] = useState(false);
  const isAdmin = profile.role === "admin";
  const dirty = JSON.stringify(org) !== JSON.stringify(savedOrg);

  /* Clear the confirmation as soon as the form is touched again. */
  useEffect(() => {
    if (dirty) setJustSaved(false);
  }, [dirty]);

  const save = async () => {
    const ok = await onSave();
    if (ok) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 4000);
    }
  };

  const set = <K extends keyof Organisation>(key: K, value: Organisation[K]) =>
    onChange({ ...org, [key]: value });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <div className="page-sub">
            {profile.full_name} ·{" "}
            {profile.role === "admin" ? "Administrator" : "Lab technician"}
            {profile.can_release ? ", can release reports" : ""} ·{" "}
            {dualDate(new Date().toISOString())}
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="notice">
          Clinic settings are read-only for lab technicians. An administrator can
          change them — the database enforces this, not just this screen.
        </div>
      )}

      <div className="card pad">
        <div className="toolbar-row" style={{ marginBottom: "var(--s-14)" }}>
          <span className="card-title">Organisation</span>
          <span className="card-sub">Printed on every report letterhead</span>
        </div>

        <div className="field">
          <label htmlFor="cname">Clinic name</label>
          <input
            id="cname"
            disabled={!isAdmin}
            value={org.clinic_name}
            onChange={(e) => set("clinic_name", e.target.value)}
          />
        </div>

        <div className="grid cols-2">
          <div className="field">
            <label htmlFor="caddr">Address</label>
            <input
              id="caddr"
              disabled={!isAdmin}
              value={org.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="creg">Registration / licence no.</label>
            <input
              id="creg"
              disabled={!isAdmin}
              placeholder="Printed on reports if set"
              value={org.registration_no}
              onChange={(e) => set("registration_no", e.target.value)}
            />
          </div>
        </div>

        <div className="grid cols-2">
          <div className="field">
            <label htmlFor="cphone">Phone</label>
            <input
              id="cphone"
              disabled={!isAdmin}
              value={org.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="cemail">Email</label>
            <input
              id="cemail"
              disabled={!isAdmin}
              value={org.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card pad mt">
        <div className="toolbar-row" style={{ marginBottom: "var(--s-14)" }}>
          <span className="card-title">Letterhead</span>
          <span className="card-sub">How reports print</span>
        </div>
        <div className="grid cols-2">
          <div className="field">
            <label htmlFor="lhmode">Mode</label>
            <select
              id="lhmode"
              disabled={!isAdmin}
              value={org.letterhead_mode}
              onChange={(e) =>
                set("letterhead_mode", e.target.value === "full" ? "full" : "preprinted")
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
              disabled={!isAdmin || org.letterhead_mode !== "preprinted"}
              value={org.preprinted_top_mm}
              onChange={(e) => set("preprinted_top_mm", Number(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      <div className="card pad mt">
        <div className="toolbar-row" style={{ marginBottom: "var(--s-14)" }}>
          <span className="card-title">Verifier</span>
          <span className="card-sub">Signature block on released reports</span>
        </div>
        <div className="grid cols-3">
          <div className="field">
            <label htmlFor="vname">Name</label>
            <input
              id="vname"
              disabled={!isAdmin}
              placeholder="Dr. …"
              value={org.verifier_name}
              onChange={(e) => set("verifier_name", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="vqual">Qualification</label>
            <input
              id="vqual"
              disabled={!isAdmin}
              placeholder="MD Pathology"
              value={org.verifier_qualification}
              onChange={(e) => set("verifier_qualification", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="vnmc">NMC registration no.</label>
            <input
              id="vnmc"
              disabled={!isAdmin}
              value={org.verifier_nmc}
              onChange={(e) => set("verifier_nmc", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card pad mt">
        <div className="toolbar-row" style={{ marginBottom: "var(--s-14)" }}>
          <span className="card-title">Appearance</span>
          <span className="card-sub">This computer only — saved instantly</span>
        </div>
        <div className="row">
          <span style={{ fontSize: "var(--t-body)", color: "var(--text-muted)" }}>
            Currently using {theme === "dark" ? "dark" : "light"} mode.
          </span>
          <div className="spacer" />
          <button onClick={onToggleTheme}>
            Switch to {theme === "dark" ? "light" : "dark"} mode
          </button>
        </div>
      </div>

      {/* Sticky, so the save control is reachable without scrolling back up. */}
      {isAdmin && (
        <div className="toolbar">
          {justSaved ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--s-6)",
                color: "var(--success-fg)",
                fontWeight: 600,
              }}
            >
              <IconCheck size={15} /> Saved — every computer will use these settings
            </span>
          ) : dirty ? (
            <span style={{ color: "var(--warning-fg)", fontWeight: 600 }}>
              Unsaved changes
            </span>
          ) : (
            <span style={{ color: "var(--text-faint)" }}>No changes to save</span>
          )}

          <div className="spacer" />

          <button disabled={!dirty || busy} onClick={onRevert}>
            Discard
          </button>
          <button className="primary" disabled={!dirty || busy} onClick={save}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
    </>
  );
}
