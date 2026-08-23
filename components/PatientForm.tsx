"use client";

import { useEffect, useState } from "react";
import { findSimilarPatients, type PatientMatch } from "@/lib/db";
import type { Patient, Sex } from "@/lib/types";
import { initialsOf } from "./Icons";

export type PatientDraft = Omit<Patient, "id" | "mrn"> & { id?: string; mrn?: string };

interface Props {
  draft: PatientDraft;
  mode: "create" | "edit";
  busy: boolean;
  onChange: (d: PatientDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  /** Offered when a likely duplicate is found, so the technician reuses the record. */
  onUseExisting?: (p: Patient) => void;
}

/**
 * Registration and editing.
 *
 * The duplicate check runs on name + phone + age together, because two
 * different people in Chitwan genuinely can share a name. The UI shows WHY it
 * thinks a record matches and leaves the decision to the technician — it never
 * silently reuses or blocks.
 */
export function PatientForm({
  draft,
  mode,
  busy,
  onChange,
  onSave,
  onCancel,
  onUseExisting,
}: Props) {
  const [matches, setMatches] = useState<PatientMatch[]>([]);

  useEffect(() => {
    if (mode !== "create") return;
    const t = setTimeout(() => {
      findSimilarPatients(draft.fullName, draft.phone, draft.ageYears)
        .then((m) => setMatches(m.filter((x) => x.score >= 0.2)))
        .catch(() => setMatches([]));
    }, 300);
    return () => clearTimeout(t);
  }, [draft.fullName, draft.phone, draft.ageYears, mode]);

  const strong = matches.filter((m) => m.score >= 0.6);
  const weak = matches.filter((m) => m.score < 0.6);
  const valid = draft.fullName.trim() !== "" && draft.ageYears > 0;

  return (
    <>
      <div className="field">
        <label htmlFor="pname">Full name</label>
        <input
          id="pname"
          autoFocus
          value={draft.fullName}
          onChange={(e) => onChange({ ...draft, fullName: e.target.value })}
        />
      </div>

      <div className="grid cols-3">
        <div className="field">
          <label htmlFor="psex">Sex</label>
          <select
            id="psex"
            value={draft.sex}
            onChange={(e) => onChange({ ...draft, sex: e.target.value as Sex })}
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
              onChange({ ...draft, ageYears: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div className="field">
          <label htmlFor="pphone">Phone</label>
          <input
            id="pphone"
            inputMode="tel"
            placeholder="98XXXXXXXX"
            value={draft.phone ?? ""}
            onChange={(e) => onChange({ ...draft, phone: e.target.value })}
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
            onChange={(e) => onChange({ ...draft, address: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="pref">Referred by</label>
          <input
            id="pref"
            placeholder="Dr. …"
            value={draft.referredBy ?? ""}
            onChange={(e) => onChange({ ...draft, referredBy: e.target.value })}
          />
        </div>
      </div>

      {mode === "create" && matches.length > 0 && (
        <div className="match-box">
          <div className="match-title">
            {strong.length > 0
              ? `${strong.length} existing record${strong.length > 1 ? "s look" : " looks"} like the same person`
              : `${weak.length} similar name${weak.length > 1 ? "s are" : " is"} already registered`}
          </div>

          {matches.map((m) => (
            <button
              key={m.id}
              className="match-item"
              onClick={() => onUseExisting?.(m)}
              title="Use this existing patient instead of creating a new record"
            >
              <span className="ini sm">{initialsOf(m.fullName)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cell-strong">
                  {m.fullName} · MRN {m.mrn}
                </div>
                <div className="match-reason">
                  {m.reason} · {m.ageYears}y{" "}
                  {m.sex === "M" ? "male" : m.sex === "F" ? "female" : ""}
                  {m.phone ? ` · ${m.phone}` : " · no phone"}
                </div>
              </div>
              <span className={`pill ${m.score >= 0.6 ? "amber" : "grey"}`}>
                Use this
              </span>
            </button>
          ))}

          <div className="match-reason" style={{ marginTop: "var(--s-8)" }}>
            Different people can share a name. Check the phone number and age
            before reusing a record — if this is a different person, just carry on.
          </div>
        </div>
      )}

      <div className="row" style={{ marginTop: "var(--s-18)" }}>
        <button onClick={onCancel}>Cancel</button>
        <div className="spacer" />
        <button className="primary" disabled={busy || !valid} onClick={onSave}>
          {busy
            ? "Saving…"
            : mode === "edit"
              ? "Save changes"
              : "Save & choose tests →"}
        </button>
      </div>
    </>
  );
}
