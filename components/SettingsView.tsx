"use client";

import { useState } from "react";
import type { Organisation, Profile } from "@/lib/db";
import { dualDate } from "@/lib/dates";

interface Props {
  profile: Profile;
  org: Organisation;
  theme: "light" | "dark";
  busy: boolean;
  onChange: (o: Organisation) => void;
  onSave: () => void;
  onToggleTheme: () => void;
}

export function SettingsView({
  profile,
  org,
  theme,
  busy,
  onChange,
  onSave,
  onToggleTheme,
}: Props) {
  const [saved, setSaved] = useState(false);
  const isAdmin = profile.role === "admin";

  const save = async () => {
    await onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

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
        <div className="spacer" />
        {isAdmin && (
          <button className="primary" disabled={busy} onClick={save}>
            {busy ? "Saving…" : saved ? "Saved" : "Save changes"}
          </button>
        )}
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
            onChange={(e) => onChange({ ...org, clinic_name: e.target.value })}
          />
        </div>

        <div className="grid cols-2">
          <div className="field">
            <label htmlFor="caddr">Address</label>
            <input
              id="caddr"
              disabled={!isAdmin}
              value={org.address}
              onChange={(e) => onChange({ ...org, address: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="creg">Registration / licence no.</label>
            <input
              id="creg"
              disabled={!isAdmin}
              placeholder="Printed on reports if set"
              value={org.registration_no}
              onChange={(e) => onChange({ ...org, registration_no: e.target.value })}
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
              onChange={(e) => onChange({ ...org, phone: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cemail">Email</label>
            <input
              id="cemail"
              disabled={!isAdmin}
              value={org.email}
              onChange={(e) => onChange({ ...org, email: e.target.value })}
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
                onChange({
                  ...org,
                  letterhead_mode: e.target.value === "full" ? "full" : "preprinted",
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
              disabled={!isAdmin || org.letterhead_mode !== "preprinted"}
              value={org.preprinted_top_mm}
              onChange={(e) =>
                onChange({ ...org, preprinted_top_mm: Number(e.target.value) || 0 })
              }
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
              onChange={(e) => onChange({ ...org, verifier_name: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="vqual">Qualification</label>
            <input
              id="vqual"
              disabled={!isAdmin}
              placeholder="MD Pathology"
              value={org.verifier_qualification}
              onChange={(e) =>
                onChange({ ...org, verifier_qualification: e.target.value })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="vnmc">NMC registration no.</label>
            <input
              id="vnmc"
              disabled={!isAdmin}
              value={org.verifier_nmc}
              onChange={(e) => onChange({ ...org, verifier_nmc: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="card pad mt">
        <div className="toolbar-row" style={{ marginBottom: "var(--s-14)" }}>
          <span className="card-title">Appearance</span>
          <span className="card-sub">Saved on this computer only</span>
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
    </>
  );
}
