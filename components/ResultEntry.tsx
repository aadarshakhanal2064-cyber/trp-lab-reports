"use client";

import { useCallback, useMemo, useRef } from "react";
import { PANEL_BY_ID } from "@/lib/catalog";
import type { ComputedMap } from "@/lib/compute";
import { flagMarker, isCritical } from "@/lib/ranges";
import type { Panel, Patient } from "@/lib/types";

interface Props {
  patient: Patient;
  panelIds: string[];
  values: Record<string, string>;
  comments: Record<string, string>;
  computed: ComputedMap;
  onChange: (analyteId: string, value: string) => void;
  onCommentChange: (panelId: string, value: string) => void;
}

/**
 * The screen a technician lives in. Keyboard first: type a value, press Enter,
 * the cursor drops to the next analyte. Calculated rows are skipped
 * automatically so they never interrupt the typing rhythm.
 */
export function ResultEntry({
  patient,
  panelIds,
  values,
  comments,
  computed,
  onChange,
  onCommentChange,
}: Props) {
  const inputs = useRef<Map<string, HTMLElement>>(new Map());

  const panels = useMemo(
    () =>
      panelIds
        .map((id) => PANEL_BY_ID.get(id))
        .filter((p): p is Panel => p !== undefined),
    [panelIds],
  );

  /** Every focusable analyte, in visual order. Derived rows are excluded. */
  const focusOrder = useMemo(
    () =>
      panels.flatMap((p) =>
        p.rows.flatMap((r) =>
          r.kind === "analyte" && !r.analyte.formula ? [r.analyte.id] : [],
        ),
      ),
    [panels],
  );

  const move = useCallback(
    (fromId: string, delta: number) => {
      const index = focusOrder.indexOf(fromId);
      if (index === -1) return;
      const nextId = focusOrder[index + delta];
      if (nextId === undefined) return;
      inputs.current.get(nextId)?.focus();
    },
    [focusOrder],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent, analyteId: string) => {
      if (event.key === "Enter" || event.key === "ArrowDown") {
        event.preventDefault();
        move(analyteId, 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        move(analyteId, -1);
      }
    },
    [move],
  );

  const register = useCallback((id: string, el: HTMLElement | null) => {
    if (el) inputs.current.set(id, el);
    else inputs.current.delete(id);
  }, []);

  return (
    <>
      {panels.map((panel) => (
        <div className="card" key={panel.id}>
          <div className="row" style={{ marginBottom: "var(--space-3)" }}>
            <h2 style={{ margin: 0 }}>{panel.title}</h2>
            <span className="pill">{panel.department}</span>
          </div>

          <table className="entry-table">
            <thead>
              <tr>
                <th>Test</th>
                <th className="value-cell">Result</th>
                <th className="unit-cell">Unit</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {panel.rows.map((row, i) => {
                if (row.kind === "group") {
                  return (
                    <tr className="group" key={`g-${panel.id}-${i}`}>
                      <td colSpan={4}>{row.heading}</td>
                    </tr>
                  );
                }

                const { analyte } = row;
                const value = computed.get(analyte.id);
                const marker = value ? flagMarker(value.flag) : "";
                const critical = value ? isCritical(value.flag) : false;
                const derived = Boolean(analyte.formula);

                return (
                  <tr key={analyte.id} className={critical ? "critical" : undefined}>
                    <td>
                      <span className="analyte-name">{analyte.name}</span>
                      {analyte.method && (
                        <em className="analyte-method">{analyte.method}</em>
                      )}
                    </td>

                    <td className="value-cell">
                      <div className="row" style={{ gap: "var(--space-1)", flexWrap: "nowrap" }}>
                        {derived ? (
                          <input
                            value={value?.display ?? ""}
                            readOnly
                            disabled
                            aria-label={`${analyte.name} (calculated)`}
                            placeholder="——"
                          />
                        ) : analyte.valueType === "picklist" ? (
                          <input
                            ref={(el) => register(analyte.id, el)}
                            list={`opts-${analyte.id}`}
                            value={values[analyte.id] ?? ""}
                            onChange={(e) => onChange(analyte.id, e.target.value)}
                            onKeyDown={(e) => onKeyDown(e, analyte.id)}
                            aria-label={analyte.name}
                          />
                        ) : (
                          <input
                            ref={(el) => register(analyte.id, el)}
                            inputMode="decimal"
                            value={values[analyte.id] ?? ""}
                            onChange={(e) => onChange(analyte.id, e.target.value)}
                            onKeyDown={(e) => onKeyDown(e, analyte.id)}
                            aria-label={analyte.name}
                          />
                        )}
                        <span
                          className={`flag ${marker === "H" ? "h" : marker === "L" ? "l" : ""}`}
                          aria-label={
                            marker === "H" ? "above range" : marker === "L" ? "below range" : ""
                          }
                        >
                          {marker}
                        </span>
                      </div>

                      {analyte.options && (
                        <datalist id={`opts-${analyte.id}`}>
                          {analyte.options.map((o) => (
                            <option key={o} value={o} />
                          ))}
                        </datalist>
                      )}
                    </td>

                    <td className="unit-cell">{analyte.unit ?? ""}</td>

                    <td className="range-cell">
                      {analyte.rangeLines.join("\n")}
                      {derived && <div className="derived">calculated automatically</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {panel.hasComment && (
            <div className="field" style={{ marginTop: "var(--space-3)" }}>
              <label htmlFor={`comment-${panel.id}`}>Comment (optional)</label>
              <textarea
                id={`comment-${panel.id}`}
                rows={2}
                value={comments[panel.id] ?? ""}
                onChange={(e) => onCommentChange(panel.id, e.target.value)}
              />
            </div>
          )}
        </div>
      ))}

      <p className="muted">
        Ranges shown are for {patient.sex === "F" ? "female" : patient.sex === "M" ? "male" : "unspecified"},
        age {patient.ageYears}. Changing the patient&apos;s sex or age changes the
        applicable range and the flags.
      </p>
    </>
  );
}
