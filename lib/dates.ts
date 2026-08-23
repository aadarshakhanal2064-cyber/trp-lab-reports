import NepaliDate from "nepali-date-converter";

/**
 * BS is a display format only. Everything is stored as an AD ISO timestamp.
 * That one rule prevents an entire category of date bug.
 */

const BS_MONTHS = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
] as const;

export function toBs(iso: string): string {
  try {
    return new NepaliDate(new Date(iso)).format("YYYY-MM-DD");
  } catch {
    return "";
  }
}

export function toBsLong(iso: string): string {
  try {
    const bs = new NepaliDate(new Date(iso)).getBS();
    const month = BS_MONTHS[bs.month] ?? "";
    return `${bs.date} ${month} ${bs.year}`;
  } catch {
    return "";
  }
}

export function toAd(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${`${d.getHours()}`.padStart(2, "0")}:${`${d.getMinutes()}`.padStart(2, "0")}`;
}

/** BS primary, AD in brackets — the format agreed in docs/01-open-questions.md B9. */
export function dualDate(iso: string): string {
  const bs = toBs(iso);
  const ad = toAd(iso);
  if (!bs) return ad;
  return `${bs} BS  (${ad} AD)`;
}

/** Current BS year, used for the accession number series. */
export function currentBsYear(): number {
  try {
    return new NepaliDate(new Date()).getBS().year;
  } catch {
    return new Date().getFullYear() + 57;
  }
}
