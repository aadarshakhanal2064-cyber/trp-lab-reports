import { PANEL_BY_ID } from "./catalog";
import { supabase } from "./supabase";
import type { Sex } from "./types";

/** A patient as shown in the list, with visit history from patient_overview. */
export interface PatientRow {
  id: string;
  mrn: string;
  fullName: string;
  sex: Sex;
  ageYears: number;
  phone: string;
  address: string;
  referredBy: string;
  createdAt: string;
  visitCount: number;
  lastVisit: string | null;
  pendingCount: number;
}

export interface DashboardStats {
  totalPatients: number;
  newThisWeek: number;
  reportsToday: number;
  awaitingVerification: number;
  releasedToday: number;
  weeklyVolume: { label: string; date: string; count: number }[];
  byDepartment: { department: string; count: number }[];
}

export interface ActivityItem {
  id: number;
  action: string;
  entityType: string;
  occurredAt: string;
  actorName: string;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
}

interface OverviewRow {
  id: string;
  mrn: string;
  full_name: string;
  sex: Sex;
  age_years: number;
  phone: string | null;
  address: string | null;
  referred_by: string | null;
  created_at: string;
  visit_count: number;
  last_visit: string | null;
  pending_count: number;
}

function toRow(r: OverviewRow): PatientRow {
  return {
    id: r.id,
    mrn: r.mrn,
    fullName: r.full_name,
    sex: r.sex,
    ageYears: r.age_years,
    phone: r.phone ?? "",
    address: r.address ?? "",
    referredBy: r.referred_by ?? "",
    createdAt: r.created_at,
    visitCount: Number(r.visit_count ?? 0),
    lastVisit: r.last_visit,
    pendingCount: Number(r.pending_count ?? 0),
  };
}

export type PatientFilter = "all" | "new" | "returning" | "pending";

export async function listPatients(
  query: string,
  filter: PatientFilter,
  page: number,
  pageSize: number,
): Promise<{ rows: PatientRow[]; total: number }> {
  let q = supabase
    .from("patient_overview")
    .select(
      "id, mrn, full_name, sex, age_years, phone, address, referred_by, created_at, visit_count, last_visit, pending_count",
      { count: "exact" },
    );

  const trimmed = query.trim();
  if (trimmed) {
    const safe = trimmed.replace(/[%,()]/g, " ");
    q = q.or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%,mrn.ilike.%${safe}%`);
  }

  if (filter === "new") q = q.lte("visit_count", 1);
  if (filter === "returning") q = q.gt("visit_count", 1);
  if (filter === "pending") q = q.gt("pending_count", 0);

  const from = page * pageSize;
  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw new Error(`Could not load patients: ${error.message}`);
  return {
    rows: ((data ?? []) as OverviewRow[]).map(toRow),
    total: count ?? 0,
  };
}

export async function dashboardStats(): Promise<DashboardStats> {
  const todayISO = startOfToday().toISOString();
  const weekAgoISO = daysAgo(6).toISOString();

  const [total, newWeek, today, pending, releasedT, weekOrders] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("is_deleted", false),
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("is_deleted", false)
      .gte("created_at", daysAgo(7).toISOString()),
    supabase
      .from("lab_orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayISO),
    supabase
      .from("lab_orders")
      .select("id", { count: "exact", head: true })
      .neq("status", "released"),
    supabase
      .from("report_versions")
      .select("id", { count: "exact", head: true })
      .gte("released_at", todayISO),
    supabase
      .from("lab_orders")
      .select("created_at, panel_ids")
      .gte("created_at", weekAgoISO),
  ]);

  const orders = (weekOrders.data ?? []) as { created_at: string; panel_ids: string[] }[];

  // Seven day buckets, oldest first, so an empty day still shows as a zero.
  const weeklyVolume = Array.from({ length: 7 }, (_, i) => {
    const day = daysAgo(6 - i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    return {
      label: day.toLocaleDateString(undefined, { weekday: "short" }),
      date: day.toISOString(),
      count: orders.filter((o) => {
        const t = new Date(o.created_at).getTime();
        return t >= day.getTime() && t < next.getTime();
      }).length,
    };
  });

  const deptCounts = new Map<string, number>();
  for (const order of orders) {
    for (const pid of order.panel_ids ?? []) {
      const dept = PANEL_BY_ID.get(pid)?.department;
      if (dept) deptCounts.set(dept, (deptCounts.get(dept) ?? 0) + 1);
    }
  }

  return {
    totalPatients: total.count ?? 0,
    newThisWeek: newWeek.count ?? 0,
    reportsToday: today.count ?? 0,
    awaitingVerification: pending.count ?? 0,
    releasedToday: releasedT.count ?? 0,
    weeklyVolume,
    byDepartment: [...deptCounts.entries()]
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function recentActivity(limit = 8): Promise<ActivityItem[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, action, entity_type, occurred_at, profiles(full_name)")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) return [];

  return ((data ?? []) as unknown as {
    id: number;
    action: string;
    entity_type: string;
    occurred_at: string;
    profiles: { full_name: string } | null;
  }[]).map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entity_type,
    occurredAt: r.occurred_at,
    actorName: r.profiles?.full_name ?? "Unknown user",
  }));
}

/** Plain-language label for an audit action code. */
export function describeAction(action: string): string {
  switch (action) {
    case "patient.create":
      return "registered a new patient";
    case "order.create":
      return "created a lab order";
    case "report.release":
      return "released a report";
    case "report.amend":
      return "amended a report";
    case "report.view":
      return "viewed a report";
    default:
      return action.replace(/[._]/g, " ");
  }
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
