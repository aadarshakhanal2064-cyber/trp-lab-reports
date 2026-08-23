export type Sex = "M" | "F" | "O";

export type ValueType = "numeric" | "text" | "picklist";

export type Flag = "N" | "H" | "L" | "CH" | "CL";

/** One interpretive band, e.g. "Border-line High: 161-199". */
export interface Band {
  label: string;
  low?: number;
  high?: number;
}

/**
 * A machine-readable rule used ONLY for flagging.
 * What actually prints comes from `Analyte.rangeLines`, so the printed text and
 * the H/L marker can never drift apart.
 */
export interface RangeRule {
  /** Restrict this rule to one sex. Omit to apply to all. */
  sex?: "M" | "F";
  /** Inclusive age bounds in years. Omit for unbounded. */
  ageMin?: number;
  ageMax?: number;
  kind: "interval" | "upper" | "lower" | "bands" | "none";
  low?: number;
  high?: number;
  bands?: Band[];
}

/** Reads another analyte's current numeric value; null when not yet entered. */
export type ValueReader = (analyteId: string) => number | null;

export interface Analyte {
  id: string;
  name: string;
  /** Small indented line under the name: "IFCC", "Biuret", "Urease GLDH". */
  method?: string;
  unit?: string;
  valueType: ValueType;
  decimals?: number;
  /** Picklist options for qualitative analytes. Free text is always allowed. */
  options?: string[];
  /** Exactly what prints in the Reference Range column, one entry per line. */
  rangeLines: string[];
  /** Rules used to compute the flag. First matching rule wins. */
  rules: RangeRule[];
  /** Present on derived analytes. Read-only in the UI, recomputed live. */
  formula?: (get: ValueReader) => number | null;
  /** Panic values, deliberately separate from the reference range. */
  criticalLow?: number;
  criticalHigh?: number;
}

export type PanelRow =
  | { kind: "group"; heading: string }
  | { kind: "analyte"; analyte: Analyte };

export type Department = "HAEMATOLOGY" | "BIOCHEMISTRY" | "CLINICAL PATHOLOGY";

export interface Panel {
  id: string;
  /** Printed heading, e.g. "LIVER FUNCTION TEST". */
  title: string;
  department: Department;
  rows: PanelRow[];
  /** Footer fields such as "Method" or "Instrument Used". */
  footerFields?: { label: string; value: string }[];
  /** Free-text Comment box the technician can fill per report. */
  hasComment?: boolean;
  /** The "Note :" paragraph at the foot of the report. */
  note?: string;
}

export interface Patient {
  id: string;
  mrn: string;
  fullName: string;
  sex: Sex;
  /** Age in years as recorded. Kept simple for the demo. */
  ageYears: number;
  phone?: string;
  address?: string;
  referredBy?: string;
}

export interface ReportRecord {
  id: string;
  accession: string;
  patientId: string;
  patientSnapshot: Patient;
  panelIds: string[];
  /** analyteId -> raw entered value */
  values: Record<string, string>;
  /** panelId -> comment */
  comments: Record<string, string>;
  sampleDateISO: string;
  reportDateISO: string;
  createdAtISO: string;
  status: "draft" | "released";
  verifierName?: string;
  verifierQualification?: string;
  verifierNmc?: string;
}
