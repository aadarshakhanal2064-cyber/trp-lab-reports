"use client";

import { PANEL_BY_ID } from "@/lib/catalog";
import type { ComputedMap } from "@/lib/compute";
import { dualDate } from "@/lib/dates";
import { flagMarker } from "@/lib/ranges";
import type { Organisation } from "@/lib/db";
import type { Panel, Patient } from "@/lib/types";

interface Props {
  patient: Patient;
  panelIds: string[];
  computed: ComputedMap;
  comments: Record<string, string>;
  accession: string;
  sampleDateISO: string;
  reportDateISO: string;
  org: Organisation;
}

/**
 * The printed report. This is the actual product the patient receives, so the
 * layout follows the clinic's existing format closely — see
 * docs/05-report-engine.md.
 */
export function ReportSheet({
  patient,
  panelIds,
  computed,
  comments,
  accession,
  sampleDateISO,
  reportDateISO,
  org,
}: Props) {
  const panels = panelIds
    .map((id) => PANEL_BY_ID.get(id))
    .filter((p): p is Panel => p !== undefined);

  const preprinted = org.letterhead_mode === "preprinted";

  return (
    <div
      className="sheet"
      style={
        {
          "--print-top-reserve": preprinted ? `${org.preprinted_top_mm}mm` : "0mm",
        } as React.CSSProperties
      }
    >
      {preprinted ? (
        <div className="top-reserve" />
      ) : (
        <div className="lh">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="" className="lh-logo" />
          <div className="lh-name">{org.clinic_name}</div>
          <div className="lh-sub">{org.address}</div>
          {(org.phone || org.email || org.registration_no) && (
            <div className="lh-sub">
              {[org.phone, org.email, org.registration_no && `Reg. ${org.registration_no}`].filter(Boolean).join("  ·  ")}
            </div>
          )}
        </div>
      )}

      <div className="pt-head">
        <div>
          <div>
            <span className="k">Reg No</span>: {accession}
          </div>
          <div>
            <span className="k">Name</span>: {patient.fullName}
          </div>
          <div>
            <span className="k">Referred By</span>: {patient.referredBy || "—"}
          </div>
        </div>
        <div>
          <div>
            <span className="k">Sex / Age</span>:{" "}
            {patient.sex === "M" ? "Male" : patient.sex === "F" ? "Female" : "Other"} /{" "}
            {patient.ageYears} yrs
          </div>
          <div>
            <span className="k">Reg Date</span>: {dualDate(sampleDateISO)}
          </div>
          <div>
            <span className="k">Report Date</span>: {dualDate(reportDateISO)}
          </div>
        </div>
      </div>

      {panels.map((panel) => (
        <PanelBlock
          key={panel.id}
          panel={panel}
          computed={computed}
          comment={comments[panel.id] ?? ""}
        />
      ))}

      {/* Repeats on every printed page, so a loose second sheet is still
          identifiable as belonging to a patient. */}
      <div className="running-footer" aria-hidden="true">
        {patient.fullName} · Reg No {accession}
      </div>

      <div className="end-of-report">End Of Report</div>

      <div className="sig-block">
        <div className="sig-line">
          <strong>{org.verifier_name || "________________________"}</strong>
          <br />
          {org.verifier_qualification || "Consultant Pathologist"}
          <br />
          {org.verifier_nmc ? `NMC No. ${org.verifier_nmc}` : "NMC No. ________"}
        </div>
      </div>

      <div className="unverified">
        Demonstration output — not for clinical use. Reference ranges are unverified.
      </div>
    </div>
  );
}

function PanelBlock({
  panel,
  computed,
  comment,
}: {
  panel: Panel;
  computed: ComputedMap;
  comment: string;
}) {
  return (
    <>
      <div className="dept-band">{panel.department}</div>
      <table className="rep-table">
        <thead>
          <tr>
            <th className="col-test">Test Name</th>
            <th className="col-result">Result</th>
            <th className="col-unit">Unit</th>
            <th className="col-ref">Reference Range</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="rep-panel-title" colSpan={4}>
              {panel.title}
            </td>
          </tr>

          {panel.rows.map((row, i) => {
            if (row.kind === "group") {
              return (
                <tr key={`g-${i}`}>
                  <td className="rep-group" colSpan={4}>
                    {row.heading}
                  </td>
                </tr>
              );
            }

            const { analyte } = row;
            const value = computed.get(analyte.id);
            const marker = value ? flagMarker(value.flag) : "";

            return (
              <tr key={analyte.id}>
                <td>
                  {analyte.name}
                  {analyte.method && <em className="rep-method">{analyte.method}</em>}
                </td>
                <td>
                  <strong>{value?.display ?? ""}</strong>
                  {marker && <span className="rep-flag">{marker}</span>}
                </td>
                <td>{analyte.unit ?? ""}</td>
                <td className="rep-ref">{analyte.rangeLines.join("\n")}</td>
              </tr>
            );
          })}

          {panel.footerFields?.map((f) => (
            <tr key={f.label}>
              <td className="rep-footer-field" colSpan={4}>
                <strong>{f.label}</strong> : {f.value}
              </td>
            </tr>
          ))}

          {panel.hasComment && comment.trim() !== "" && (
            <tr>
              <td className="rep-footer-field" colSpan={4}>
                <strong>Comment</strong> : {comment}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {panel.note && (
        <div className="rep-note">
          <strong>Note :</strong> {panel.note}
        </div>
      )}
    </>
  );
}
