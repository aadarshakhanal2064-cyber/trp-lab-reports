import { analytesOf } from "./catalog";
import { computeFlag } from "./ranges";
import type { Analyte, Flag, Panel, Sex } from "./types";

export interface ComputedValue {
  analyte: Analyte;
  /** What the technician typed, or the derived number formatted for display. */
  display: string;
  numeric: number | null;
  flag: Flag;
  isDerived: boolean;
}

export type ComputedMap = Map<string, ComputedValue>;

/**
 * Round half-up at a decimal place, immune to binary floating-point noise.
 *
 * `7.05 - 4.0` evaluates to 3.0499999999999998 in IEEE-754, so a plain
 * `.toFixed(1)` yields "3.0" — not because anyone decided to round down, but as
 * an accident of binary representation. On a lab report that is a silently
 * wrong number. Cleaning the value to 12 significant digits first restores the
 * decimal the arithmetic actually meant, then we round it deliberately.
 */
export function roundHalfUp(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  const cleaned = Number(value.toPrecision(12));

  // Very large or very small magnitudes stringify as "1e-9", which the decimal
  // shift below cannot parse. Plain arithmetic is adequate at those scales.
  if (cleaned.toString().includes("e")) {
    const factor = 10 ** decimals;
    return (Math.sign(cleaned) * Math.round(Math.abs(cleaned) * factor)) / factor;
  }

  const shifted = Number(`${cleaned}e${decimals}`);
  if (!Number.isFinite(shifted)) return cleaned;
  const rounded = Math.sign(shifted) * Math.round(Math.abs(shifted));
  const back = Number(`${rounded}e-${decimals}`);
  return Number.isFinite(back) ? back : cleaned;
}

/** Format to the analyte's declared precision, so 4.5 prints as "4.50". */
export function formatNumber(value: number, decimals: number | undefined): string {
  const places = decimals ?? 2;
  return roundHalfUp(value, places).toFixed(places);
}

function parseNumeric(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * Resolve every analyte across the selected panels, filling derived values.
 *
 * Formulas may depend on other formulas (BUN/Creatinine needs BUN, which needs
 * Urea), so we iterate until nothing new resolves. Dependencies in this
 * catalogue are at most two deep; the loop is bounded regardless.
 */
export function computeAll(
  panels: Panel[],
  rawValues: Record<string, string>,
  sex: Sex,
  ageYears: number,
): ComputedMap {
  const analytes = panels.flatMap(analytesOf);
  const numeric = new Map<string, number | null>();

  // Seed with everything the technician typed.
  for (const analyte of analytes) {
    if (analyte.formula) {
      numeric.set(analyte.id, null);
    } else {
      numeric.set(
        analyte.id,
        analyte.valueType === "numeric" ? parseNumeric(rawValues[analyte.id]) : null,
      );
    }
  }

  const read = (id: string): number | null => numeric.get(id) ?? null;

  const derived = analytes.filter((a) => a.formula);
  for (let pass = 0; pass < derived.length + 1; pass += 1) {
    let changed = false;
    for (const analyte of derived) {
      if (numeric.get(analyte.id) !== null) continue;
      const next = analyte.formula?.(read) ?? null;
      if (next !== null && Number.isFinite(next)) {
        numeric.set(analyte.id, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const out: ComputedMap = new Map();
  for (const analyte of analytes) {
    const value = numeric.get(analyte.id) ?? null;
    const isDerived = Boolean(analyte.formula);

    let display: string;
    if (isDerived) {
      display = value === null ? "" : formatNumber(value, analyte.decimals);
    } else {
      display = (rawValues[analyte.id] ?? "").trim();
    }

    out.set(analyte.id, {
      analyte,
      display,
      numeric: value,
      flag: analyte.valueType === "numeric" ? computeFlag(analyte, value, sex, ageYears) : "N",
      isDerived,
    });
  }

  return out;
}

/** Count of analytes the technician has actually filled in. */
export function enteredCount(
  panels: Panel[],
  rawValues: Record<string, string>,
): { entered: number; total: number } {
  const analytes = panels.flatMap(analytesOf).filter((a) => !a.formula);
  const entered = analytes.filter((a) => (rawValues[a.id] ?? "").trim() !== "").length;
  return { entered, total: analytes.length };
}
