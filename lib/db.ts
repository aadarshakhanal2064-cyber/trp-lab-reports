import { supabase } from "./supabase";
import type { Patient, ReportRecord, Sex } from "./types";

/**
 * Data access. Replaces lib/storage.ts (browser localStorage) now that there is
 * a real database behind the app.
 */

export interface Profile {
  id: string;
  full_name: string;
  role: "technician" | "admin";
  can_release: boolean;
  is_active: boolean;
}

interface PatientRow {
  id: string;
  mrn: string;
  full_name: string;
  sex: Sex;
  age_years: number;
  phone: string | null;
  address: string | null;
  referred_by: string | null;
}

function toPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    mrn: row.mrn,
    fullName: row.full_name,
    sex: row.sex,
    ageYears: row.age_years,
    phone: row.phone ?? "",
    address: row.address ?? "",
    referredBy: row.referred_by ?? "",
  };
}

/* ---------------------------------------------------------------- */
/* Auth                                                              */
/* ---------------------------------------------------------------- */

export async function getProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, can_release, is_active")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) throw new Error(`Could not load your user profile: ${error.message}`);
  if (!data) return null;
  if (!data.is_active) throw new Error("This account has been deactivated.");
  return data as Profile;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/* ---------------------------------------------------------------- */
/* Audit                                                             */
/* ---------------------------------------------------------------- */

/**
 * Records who did what. Deliberately carries IDs and action names only —
 * never a patient name, phone number or result value.
 * See docs/06-security-and-compliance.md section 6.
 */
export async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId?: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  await supabase.from("audit_log").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    detail: detail ?? null,
  });
}

/* ---------------------------------------------------------------- */
/* Patients                                                          */
/* ---------------------------------------------------------------- */

export async function searchPatientsDb(query: string): Promise<Patient[]> {
  let q = supabase
    .from("patients")
    .select("id, mrn, full_name, sex, age_years, phone, address, referred_by")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(50);

  const trimmed = query.trim();
  if (trimmed) {
    const safe = trimmed.replace(/[%,()]/g, " ");
    q = q.or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%,mrn.ilike.%${safe}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(`Patient search failed: ${error.message}`);
  return (data as PatientRow[]).map(toPatient);
}

export async function findDuplicates(name: string): Promise<Patient[]> {
  const trimmed = name.trim();
  if (trimmed.length < 3) return [];
  const safe = trimmed.replace(/[%,()]/g, " ");
  const { data, error } = await supabase
    .from("patients")
    .select("id, mrn, full_name, sex, age_years, phone, address, referred_by")
    .eq("is_deleted", false)
    .ilike("full_name", safe)
    .limit(5);
  if (error) return [];
  return (data as PatientRow[]).map(toPatient);
}

export async function createPatient(
  patient: Omit<Patient, "id" | "mrn">,
  actorId: string,
): Promise<Patient> {
  const mrn = await nextMrnDb();
  const { data, error } = await supabase
    .from("patients")
    .insert({
      mrn,
      full_name: patient.fullName,
      sex: patient.sex,
      age_years: patient.ageYears,
      phone: patient.phone || null,
      address: patient.address || null,
      referred_by: patient.referredBy || null,
      created_by: actorId,
    })
    .select("id, mrn, full_name, sex, age_years, phone, address, referred_by")
    .single();

  if (error) throw new Error(`Could not save the patient: ${error.message}`);
  const saved = toPatient(data as PatientRow);
  await audit(actorId, "patient.create", "patient", saved.id);
  return saved;
}

async function nextMrnDb(): Promise<string> {
  const { data } = await supabase
    .from("patients")
    .select("mrn")
    .order("mrn", { ascending: false })
    .limit(1);
  const highest = data?.[0]?.mrn;
  const n = Number(highest);
  return String(Number.isFinite(n) && n >= 10000 ? n + 1 : 10001);
}

/* ---------------------------------------------------------------- */
/* Orders and results                                                */
/* ---------------------------------------------------------------- */

export async function nextAccessionDb(bsYear: number): Promise<string> {
  const prefix = `TRP-${bsYear}-`;
  const { data } = await supabase
    .from("lab_orders")
    .select("accession")
    .like("accession", `${prefix}%`)
    .order("accession", { ascending: false })
    .limit(1);

  const last = data?.[0]?.accession;
  const n = last ? Number(last.slice(prefix.length)) : 0;
  const next = Number.isFinite(n) ? n + 1 : 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
}

export async function createOrder(
  patientId: string,
  panelIds: string[],
  accession: string,
  actorId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("lab_orders")
    .insert({
      accession,
      patient_id: patientId,
      panel_ids: panelIds,
      created_by: actorId,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Could not create the lab order: ${error.message}`);
  await audit(actorId, "order.create", "lab_order", data.id, {
    panel_count: panelIds.length,
  });
  return data.id as string;
}

export async function saveResults(
  orderId: string,
  values: Record<string, string>,
  panelOf: (analyteId: string) => string,
  actorId: string,
): Promise<void> {
  const rows = Object.entries(values)
    .filter(([, v]) => v.trim() !== "")
    .map(([analyteId, value]) => ({
      lab_order_id: orderId,
      analyte_id: analyteId,
      panel_id: panelOf(analyteId),
      value_text: value.trim(),
      entered_by: actorId,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("results")
    .upsert(rows, { onConflict: "lab_order_id,analyte_id" });

  if (error) throw new Error(`Could not save results: ${error.message}`);
}

/* ---------------------------------------------------------------- */
/* Report release                                                    */
/* ---------------------------------------------------------------- */

export async function releaseReport(
  orderId: string,
  values: Record<string, string>,
  comments: Record<string, string>,
  verifier: { name: string; qualification: string; nmc: string },
  letterheadMode: string,
  actorId: string,
): Promise<number> {
  const { data: existing } = await supabase
    .from("report_versions")
    .select("version_no")
    .eq("lab_order_id", orderId)
    .order("version_no", { ascending: false })
    .limit(1);

  const previous = existing?.[0]?.version_no ?? 0;
  const versionNo = previous + 1;

  const { error } = await supabase.from("report_versions").insert({
    lab_order_id: orderId,
    version_no: versionNo,
    values_snapshot: values,
    comments_snapshot: comments,
    is_amendment: versionNo > 1,
    verifier_name: verifier.name || null,
    verifier_qualification: verifier.qualification || null,
    verifier_nmc: verifier.nmc || null,
    letterhead_mode: letterheadMode,
    released_by: actorId,
  });

  if (error) throw new Error(`Could not release the report: ${error.message}`);

  await supabase.from("lab_orders").update({ status: "released" }).eq("id", orderId);
  await audit(actorId, versionNo > 1 ? "report.amend" : "report.release", "lab_order", orderId, {
    version: versionNo,
  });

  return versionNo;
}

/* ---------------------------------------------------------------- */
/* History                                                           */
/* ---------------------------------------------------------------- */

interface OrderRow {
  id: string;
  accession: string;
  panel_ids: string[];
  sample_collected_at: string;
  status: string;
  patients: PatientRow | null;
}

export async function recentReports(limit = 15): Promise<ReportRecord[]> {
  const { data, error } = await supabase
    .from("lab_orders")
    .select(
      "id, accession, panel_ids, sample_collected_at, status, " +
        "patients(id, mrn, full_name, sex, age_years, phone, address, referred_by)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Could not load reports: ${error.message}`);

  const orders = (data ?? []) as unknown as OrderRow[];
  const ids = orders.map((o) => o.id);
  if (ids.length === 0) return [];

  const { data: resultRows } = await supabase
    .from("results")
    .select("lab_order_id, analyte_id, value_text")
    .in("lab_order_id", ids);

  const byOrder = new Map<string, Record<string, string>>();
  for (const r of resultRows ?? []) {
    const bucket = byOrder.get(r.lab_order_id) ?? {};
    bucket[r.analyte_id] = r.value_text ?? "";
    byOrder.set(r.lab_order_id, bucket);
  }

  return orders
    .filter((o) => o.patients !== null)
    .map((o) => {
      const patient = toPatient(o.patients as PatientRow);
      return {
        id: o.id,
        accession: o.accession,
        patientId: patient.id,
        patientSnapshot: patient,
        panelIds: o.panel_ids,
        values: byOrder.get(o.id) ?? {},
        comments: {},
        sampleDateISO: o.sample_collected_at,
        reportDateISO: o.sample_collected_at,
        createdAtISO: o.sample_collected_at,
        status: o.status === "released" ? "released" : "draft",
      } satisfies ReportRecord;
    });
}

/** Every past value of one analyte for one patient — the data behind trend charts. */
export async function analyteHistory(
  patientId: string,
  analyteId: string,
): Promise<{ date: string; value: number }[]> {
  const { data, error } = await supabase
    .from("lab_orders")
    .select("sample_collected_at, results(analyte_id, value_text)")
    .eq("patient_id", patientId)
    .order("sample_collected_at", { ascending: true });

  if (error) return [];

  const out: { date: string; value: number }[] = [];
  for (const order of (data ?? []) as unknown as {
    sample_collected_at: string;
    results: { analyte_id: string; value_text: string | null }[];
  }[]) {
    const hit = order.results.find((r) => r.analyte_id === analyteId);
    const n = Number(hit?.value_text);
    if (hit && Number.isFinite(n)) {
      out.push({ date: order.sample_collected_at, value: n });
    }
  }
  return out;
}
