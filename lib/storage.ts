import { currentBsYear } from "./dates";
import type { Patient, ReportRecord } from "./types";

/**
 * Demo persistence: the browser's own local storage.
 *
 * Nothing leaves the machine, so there is no server holding patient data and no
 * authentication to get wrong. The trade-off is that records do not follow the
 * user to another computer. The production system replaces this file entirely —
 * see docs/03-architecture.md.
 */

const PATIENTS_KEY = "trp.patients.v1";
const REPORTS_KEY = "trp.reports.v1";
const SETTINGS_KEY = "trp.settings.v1";

export interface Settings {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicEmail: string;
  /** "full" draws the letterhead; "preprinted" leaves a blank top reserve. */
  letterheadMode: "full" | "preprinted";
  /** Top reserve in millimetres for preprinted stationery. */
  preprintedTopMm: number;
  verifierName: string;
  verifierQualification: string;
  verifierNmc: string;
}

export const DEFAULT_SETTINGS: Settings = {
  clinicName: "Tandi Ratnanagar Polyclinic Pvt. Ltd.",
  clinicAddress: "Ratnanagar-2, Chitwan, Nepal",
  clinicPhone: "",
  clinicEmail: "",
  letterheadMode: "full",
  preprintedTopMm: 45,
  verifierName: "",
  verifierQualification: "",
  verifierNmc: "",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked. The caller keeps working from memory.
  }
}

export function loadPatients(): Patient[] {
  return read<Patient[]>(PATIENTS_KEY, []);
}

export function savePatients(patients: Patient[]): void {
  write(PATIENTS_KEY, patients);
}

export function loadReports(): ReportRecord[] {
  return read<ReportRecord[]>(REPORTS_KEY, []);
}

export function saveReports(reports: ReportRecord[]): void {
  write(REPORTS_KEY, reports);
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(SETTINGS_KEY, {}) };
}

export function saveSettings(settings: Settings): void {
  write(SETTINGS_KEY, settings);
}

export function nextMrn(patients: Patient[]): string {
  const highest = patients.reduce((max, p) => {
    const n = Number(p.mrn);
    return Number.isFinite(n) && n > max ? n : max;
  }, 10000);
  return String(highest + 1);
}

export function nextAccession(reports: ReportRecord[]): string {
  const year = currentBsYear();
  const prefix = `TRP-${year}-`;
  const highest = reports.reduce((max, r) => {
    if (!r.accession.startsWith(prefix)) return max;
    const n = Number(r.accession.slice(prefix.length));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(6, "0")}`;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Simple, forgiving patient search across name, phone and MRN. */
export function searchPatients(patients: Patient[], query: string): Patient[] {
  const q = query.trim().toLowerCase();
  if (!q) return patients;
  return patients.filter((p) =>
    [p.fullName, p.phone ?? "", p.mrn].some((field) =>
      field.toLowerCase().includes(q),
    ),
  );
}
