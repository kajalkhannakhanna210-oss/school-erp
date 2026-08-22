import { createClient } from "@/lib/supabase/server";

export type EnquiryStatus = 'New' | 'Assigned' | 'Follow-up' | 'Interested' | 'Won' | 'Lost' | 'Closed';
export type EnquiryType = 'Online' | 'Offline';
export type FollowupType = 'Phone' | 'WhatsApp' | 'Visit' | 'Email' | 'Other';
export type EnquirySource = 'Walk-in' | 'Website' | 'Referral' | 'Social Media' | 'Phone' | 'Advertisement' | 'Other';

export const ENQUIRY_STATUSES: EnquiryStatus[] = ['New', 'Assigned', 'Follow-up', 'Interested', 'Won', 'Lost', 'Closed'];
export const ENQUIRY_TYPES: EnquiryType[] = ['Offline', 'Online'];
export const FOLLOWUP_TYPES: FollowupType[] = ['Phone', 'WhatsApp', 'Visit', 'Email', 'Other'];
export const ENQUIRY_SOURCES: EnquirySource[] = ['Walk-in', 'Website', 'Referral', 'Social Media', 'Phone', 'Advertisement', 'Other'];

export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  New: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Assigned: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Follow-up': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Interested: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Won: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  Lost: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  Closed: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
};

export const VALID_TRANSITIONS: Record<EnquiryStatus, EnquiryStatus[]> = {
  New: ['Assigned', 'Follow-up', 'Interested', 'Won', 'Lost', 'Closed'],
  Assigned: ['Follow-up', 'Interested', 'Won', 'Lost', 'Closed'],
  'Follow-up': ['Interested', 'Won', 'Lost', 'Closed', 'Assigned'],
  Interested: ['Won', 'Lost', 'Closed', 'Follow-up'],
  Won: ['Follow-up', 'Closed'],
  Lost: ['Follow-up', 'New'],
  Closed: ['Follow-up', 'New'],
};

export function isValidEnquiryTransition(current: EnquiryStatus, next: EnquiryStatus): boolean {
  if (current === next) return true;
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
}

export type EnquiryRow = {
  id: string;
  enquiry_id: string;
  student_name: string;
  dob: string | null;
  gender: string | null;
  class_id: string | null;
  parent_name: string;
  mobile: string;
  alternate_mobile: string | null;
  email: string | null;
  address: string | null;
  session_id: string | null;
  enquiry_type: EnquiryType;
  source: string;
  remarks: string | null;
  assigned_staff_id: string | null;
  status: EnquiryStatus;
  next_followup_date: string | null;
  last_followup_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  classes?: { name: string } | null;
  academic_sessions?: { name: string } | null;
  assigned_staff?: { full_name: string; email?: string } | null;
};

export type FollowupRow = {
  id: string;
  enquiry_id: string;
  followup_type: FollowupType;
  notes: string;
  followup_date: string;
  next_followup_date: string | null;
  is_completed: boolean;
  staff_id: string | null;
  created_at: string;
  staff?: { full_name: string } | null;
};

export type AssignmentHistoryRow = {
  id: string;
  enquiry_id: string;
  assigned_to: string | null;
  assigned_by: string | null;
  remarks: string | null;
  created_at: string;
  assigned_to_profile?: { full_name: string } | null;
  assigned_by_profile?: { full_name: string } | null;
};

export type AuditLogRow = {
  id: string;
  enquiry_id: string;
  user_id: string | null;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  details: string | null;
  created_at: string;
  user?: { full_name: string } | null;
};

export type EnquiryFilters = {
  q?: string;
  session_id?: string;
  class_id?: string;
  enquiry_type?: string;
  source?: string;
  assigned_staff_id?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  followup_due?: 'today' | 'upcoming' | 'overdue' | 'none';
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type EnquiryStats = {
  total: number;
  newCount: number;
  assignedCount: number;
  followupCount: number;
  interestedCount: number;
  wonCount: number;
  lostCount: number;
  closedCount: number;
  todayFollowups: number;
  overdueFollowups: number;
  upcomingFollowups: number;
  noNextFollowup: number;
  conversionRate: number;
};

export async function getEnquiryStats(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  sessionId?: string
): Promise<EnquiryStats> {
  const supabase = supabaseClient ?? (await createClient());
  const todayStr = new Date().toISOString().slice(0, 10);

  let baseQ = supabase.from("enquiries").select("id, status, next_followup_date");
  if (sessionId) baseQ = baseQ.eq("session_id", sessionId);

  const { data: rows } = await baseQ;
  const list = rows ?? [];

  const total = list.length;
  let newCount = 0;
  let assignedCount = 0;
  let followupCount = 0;
  let interestedCount = 0;
  let wonCount = 0;
  let lostCount = 0;
  let closedCount = 0;
  let todayFollowups = 0;
  let overdueFollowups = 0;
  let upcomingFollowups = 0;
  let noNextFollowup = 0;

  for (const item of list) {
    if (item.status === 'New') newCount++;
    else if (item.status === 'Assigned') assignedCount++;
    else if (item.status === 'Follow-up') followupCount++;
    else if (item.status === 'Interested') interestedCount++;
    else if (item.status === 'Won') wonCount++;
    else if (item.status === 'Lost') lostCount++;
    else if (item.status === 'Closed') closedCount++;

    if (!item.next_followup_date) {
      noNextFollowup++;
    } else {
      if (item.next_followup_date === todayStr) todayFollowups++;
      else if (item.next_followup_date < todayStr && item.status !== 'Won' && item.status !== 'Lost' && item.status !== 'Closed') overdueFollowups++;
      else if (item.next_followup_date > todayStr) upcomingFollowups++;
    }
  }

  const conversionRate = total > 0 ? Number(((wonCount / total) * 100).toFixed(1)) : 0;

  return {
    total,
    newCount,
    assignedCount,
    followupCount,
    interestedCount,
    wonCount,
    lostCount,
    closedCount,
    todayFollowups,
    overdueFollowups,
    upcomingFollowups,
    noNextFollowup,
    conversionRate,
  };
}

export async function getEnquiries(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  filters: EnquiryFilters = {}
) {
  const supabase = supabaseClient ?? (await createClient());
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const todayStr = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("enquiries")
    .select("*, classes(name), academic_sessions(name), assigned_staff:profiles!enquiries_assigned_staff_id_fkey(full_name, email)", { count: "exact" });

  if (filters.session_id) query = query.eq("session_id", filters.session_id);
  if (filters.class_id) query = query.eq("class_id", filters.class_id);
  if (filters.enquiry_type) query = query.eq("enquiry_type", filters.enquiry_type);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.assigned_staff_id) query = query.eq("assigned_staff_id", filters.assigned_staff_id);
  if (filters.status) query = query.eq("status", filters.status);

  if (filters.startDate) query = query.gte("created_at", `${filters.startDate}T00:00:00`);
  if (filters.endDate) query = query.lte("created_at", `${filters.endDate}T23:59:59`);

  if (filters.followup_due === 'today') {
    query = query.eq("next_followup_date", todayStr);
  } else if (filters.followup_due === 'overdue') {
    query = query.lt("next_followup_date", todayStr).not("status", "in", '("Won","Lost","Closed")');
  } else if (filters.followup_due === 'upcoming') {
    query = query.gt("next_followup_date", todayStr);
  } else if (filters.followup_due === 'none') {
    query = query.is("next_followup_date", null);
  }

  if (filters.q) {
    const q = filters.q.trim().replace(/[,()]/g, "");
    query = query.or(`enquiry_id.ilike.%${q}%,student_name.ilike.%${q}%,parent_name.ilike.%${q}%,mobile.ilike.%${q}%`);
  }

  const sortBy = filters.sortBy ?? "created_at";
  const ascending = filters.sortOrder === "asc";
  query = query.order(sortBy, { ascending });

  const { data, count, error } = await query.range(from, to);

  return {
    rows: (data ?? []) as EnquiryRow[],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    error: error?.message ?? null,
  };
}

export async function getEnquiryById(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  id: string
): Promise<EnquiryRow | null> {
  const supabase = supabaseClient ?? (await createClient());
  const { data } = await supabase
    .from("enquiries")
    .select("*, classes(name), academic_sessions(name), assigned_staff:profiles!enquiries_assigned_staff_id_fkey(full_name, email)")
    .eq("id", id)
    .maybeSingle();

  return (data as EnquiryRow) ?? null;
}

export async function getEnquiryFollowups(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  enquiryId: string
): Promise<FollowupRow[]> {
  const supabase = supabaseClient ?? (await createClient());
  const { data } = await supabase
    .from("enquiry_followups")
    .select("*, staff:profiles!enquiry_followups_staff_id_fkey(full_name)")
    .eq("enquiry_id", enquiryId)
    .order("created_at", { ascending: false });

  return (data ?? []) as FollowupRow[];
}

export async function getEnquiryAssignments(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  enquiryId: string
): Promise<AssignmentHistoryRow[]> {
  const supabase = supabaseClient ?? (await createClient());
  const { data } = await supabase
    .from("enquiry_assignment_history")
    .select("*, assigned_to_profile:profiles!enquiry_assignment_history_assigned_to_fkey(full_name), assigned_by_profile:profiles!enquiry_assignment_history_assigned_by_fkey(full_name)")
    .eq("enquiry_id", enquiryId)
    .order("created_at", { ascending: false });

  return (data ?? []) as AssignmentHistoryRow[];
}

export async function getEnquiryAuditLogs(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  enquiryId: string
): Promise<AuditLogRow[]> {
  const supabase = supabaseClient ?? (await createClient());
  const { data } = await supabase
    .from("enquiry_audit_logs")
    .select("*, user:profiles!enquiry_audit_logs_user_id_fkey(full_name)")
    .eq("enquiry_id", enquiryId)
    .order("created_at", { ascending: false });

  return (data ?? []) as AuditLogRow[];
}

export async function getStaffOptions(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null
): Promise<{ id: string; full_name: string }[]> {
  const supabase = supabaseClient ?? (await createClient());
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["super_admin", "staff"])
    .order("full_name");

  return (data ?? []) as { id: string; full_name: string }[];
}

export async function getEnquiryReportData(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  reportType: 'enquiry' | 'followup' | 'staff' | 'source' | 'class' | 'conversion',
  filters: EnquiryFilters = {}
) {
  const supabase = supabaseClient ?? (await createClient());
  const { rows } = await getEnquiries(supabase, { ...filters, pageSize: 1000, page: 1 });

  if (reportType === 'enquiry') {
    return rows.map((r) => ({
      Enquiry_ID: r.enquiry_id,
      Student_Name: r.student_name,
      Parent_Name: r.parent_name,
      Mobile: r.mobile,
      Class: r.classes?.name ?? 'Unassigned',
      Type: r.enquiry_type,
      Source: r.source,
      Status: r.status,
      Assigned_Staff: r.assigned_staff?.full_name ?? 'Unassigned',
      Next_Followup: r.next_followup_date ?? 'None',
      Created_At: r.created_at.slice(0, 10),
    }));
  }

  if (reportType === 'followup') {
    const { data: followups } = await supabase
      .from("enquiry_followups")
      .select("*, enquiries(enquiry_id, student_name), staff:profiles!enquiry_followups_staff_id_fkey(full_name)")
      .order("created_at", { ascending: false });
    
    return (followups ?? []).map((f: any) => ({
      Enquiry_ID: f.enquiries?.enquiry_id ?? 'N/A',
      Student_Name: f.enquiries?.student_name ?? 'N/A',
      Followup_Type: f.followup_type,
      Notes: f.notes,
      Followup_Date: f.followup_date,
      Next_Followup_Date: f.next_followup_date ?? 'None',
      Staff: f.staff?.full_name ?? 'N/A',
      Created_At: f.created_at.slice(0, 10),
    }));
  }

  if (reportType === 'staff') {
    const staffMap = new Map<string, { staff: string; total: number; won: number; lost: number; inProgress: number }>();
    for (const r of rows) {
      const name = r.assigned_staff?.full_name ?? 'Unassigned';
      const item = staffMap.get(name) ?? { staff: name, total: 0, won: 0, lost: 0, inProgress: 0 };
      item.total++;
      if (r.status === 'Won') item.won++;
      else if (r.status === 'Lost') item.lost++;
      else item.inProgress++;
      staffMap.set(name, item);
    }
    return Array.from(staffMap.values()).map((s) => ({
      Staff_Member: s.staff,
      Total_Assigned: s.total,
      In_Progress: s.inProgress,
      Won: s.won,
      Lost: s.lost,
      Conversion_Rate: s.total > 0 ? `${((s.won / s.total) * 100).toFixed(1)}%` : '0%',
    }));
  }

  if (reportType === 'source') {
    const sourceMap = new Map<string, { source: string; total: number; won: number }>();
    for (const r of rows) {
      const src = r.source || 'Walk-in';
      const item = sourceMap.get(src) ?? { source: src, total: 0, won: 0 };
      item.total++;
      if (r.status === 'Won') item.won++;
      sourceMap.set(src, item);
    }
    return Array.from(sourceMap.values()).map((s) => ({
      Enquiry_Source: s.source,
      Total_Enquiries: s.total,
      Won_Enquiries: s.won,
      Conversion_Rate: s.total > 0 ? `${((s.won / s.total) * 100).toFixed(1)}%` : '0%',
    }));
  }

  if (reportType === 'class') {
    const classMap = new Map<string, { className: string; total: number; won: number }>();
    for (const r of rows) {
      const cls = r.classes?.name ?? 'Unassigned';
      const item = classMap.get(cls) ?? { className: cls, total: 0, won: 0 };
      item.total++;
      if (r.status === 'Won') item.won++;
      classMap.set(cls, item);
    }
    return Array.from(classMap.values()).map((c) => ({
      Class_Name: c.className,
      Total_Enquiries: c.total,
      Won_Enquiries: c.won,
      Conversion_Rate: c.total > 0 ? `${((c.won / c.total) * 100).toFixed(1)}%` : '0%',
    }));
  }

  // Conversion report
  const statusMap = new Map<string, number>();
  for (const r of rows) {
    statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1);
  }
  const total = rows.length;
  return ENQUIRY_STATUSES.map((st) => {
    const cnt = statusMap.get(st) ?? 0;
    return {
      Status: st,
      Count: cnt,
      Percentage: total > 0 ? `${((cnt / total) * 100).toFixed(1)}%` : '0%',
    };
  });
}
