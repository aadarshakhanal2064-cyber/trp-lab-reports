import type { Analyte, Flag, RangeRule, Sex } from "./types";

/**
 * Pick the reference rule that applies to this patient.
 * First match wins, so put specific rules (sex, age) before the general fallback.
 */
export function resolveRule(
  analyte: Analyte,
  sex: Sex,
  ageYears: number,
): RangeRule | undefined {
  return analyte.rules.find((rule) => {
    if (rule.sex !== undefined && rule.sex !== sex) return false;
    if (rule.ageMin !== undefined && ageYears < rule.ageMin) return false;
    if (rule.ageMax !== undefined && ageYears > rule.ageMax) return false;
    return true;
  });
}

/**
 * Compare a value against its reference range.
 *
 * This is a factual comparison and nothing more. The system never interprets a
 * result clinically — see docs/02-requirements.md M4.
 */
export function computeFlag(
  analyte: Analyte,
  value: number | null,
  sex: Sex,
  ageYears: number,
): Flag {
  if (value === null || Number.isNaN(value)) return "N";

  if (analyte.criticalLow !== undefined && value < analyte.criticalLow) return "CL";
  if (analyte.criticalHigh !== undefined && value > analyte.criticalHigh) return "CH";

  const rule = resolveRule(analyte, sex, ageYears);
  if (!rule) return "N";

  switch (rule.kind) {
    case "interval":
      if (rule.low !== undefined && value < rule.low) return "L";
      if (rule.high !== undefined && value > rule.high) return "H";
      return "N";

    case "upper":
      return rule.high !== undefined && value > rule.high ? "H" : "N";

    case "lower":
      return rule.low !== undefined && value < rule.low ? "L" : "N";

    case "bands": {
      // Flag against the first band only; anything above it is abnormal.
      const first = rule.bands?.[0];
      if (!first) return "N";
      if (first.high !== undefined && value > first.high) return "H";
      if (first.low !== undefined && value < first.low) return "L";
      return "N";
    }

    case "none":
      return "N";
  }
}

/** Which interpretive band a value falls into, e.g. "Border-line High". */
export function bandLabel(
  analyte: Analyte,
  value: number | null,
  sex: Sex,
  ageYears: number,
): string | null {
  if (value === null) return null;
  const rule = resolveRule(analyte, sex, ageYears);
  if (!rule || rule.kind !== "bands" || !rule.bands) return null;

  for (const band of rule.bands) {
    const aboveLow = band.low === undefined || value >= band.low;
    const belowHigh = band.high === undefined || value <= band.high;
    if (aboveLow && belowHigh) return band.label;
  }
  return null;
}

export function isAbnormal(flag: Flag): boolean {
  return flag !== "N";
}

export function isCritical(flag: Flag): boolean {
  return flag === "CH" || flag === "CL";
}

/** The short marker printed beside the value. Never colour alone. */
export function flagMarker(flag: Flag): string {
  switch (flag) {
    case "H":
    case "CH":
      return "H";
    case "L":
    case "CL":
      return "L";
    case "N":
      return "";
  }
}
