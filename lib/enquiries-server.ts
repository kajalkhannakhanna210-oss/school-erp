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
  id?: string;
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

// Action-specific Scope Types & Helpers for Admission Enquiry
export type AdmissionActionKey =
  | 'create'
  | 'view'
  | 'edit'
  | 'assign'
  | 'followup'
  | 'change_status'
  | 'convert_won'
  | 'mark_lost'
  | 'report'
  | 'export';

export type UserActionScope = {
  all: boolean;
  ownAssigned: boolean;
  classes: string[];
  sections: string[];
};

export async function getUserActionScope(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  userId: string | null | undefined,
  actionKey: AdmissionActionKey
): Promise<UserActionScope> {
  const supabase = supabaseClient ?? (await createClient());
  if (!userId) return { all: false, ownAssigned: false, classes: [], sections: [] };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role === "super_admin") return { all: true, ownAssigned: false, classes: [], sections: [] };

  // Fetch staff_module_scopes for admission_enquiry matching action_key OR fallback 'ALL'
  const { data } = await supabase
    .from("staff_module_scopes")
    .select("scope_type, resource_id, action_key")
    .eq("staff_id", userId)
    .eq("module_key", "admission_enquiry");

  const rows = data ?? [];
  const wantedAction = actionKey.trim().toLowerCase();
  // Filter for matching action_key or 'ALL' (fallback for backward compatibility)
  const actionRows = rows.filter((r: any) => {
    const rowAction = r.action_key == null ? "all" : String(r.action_key).trim().toLowerCase();
    return rowAction === "all" || rowAction === wantedAction;
  });

  return {
    all: actionRows.some((r: any) => String(r.scope_type).trim().toUpperCase() === "ALL"),
    ownAssigned: actionRows.some((r: any) => String(r.scope_type).trim().toUpperCase() === "OWN_ASSIGNED"),
    classes: actionRows
      .filter((r: any) => String(r.scope_type).trim().toUpperCase() === "CLASS" && r.resource_id != null)
      .map((r: any) => String(r.resource_id).trim().toLowerCase()),
    sections: actionRows
      .filter((r: any) => String(r.scope_type).trim().toUpperCase() === "SECTION" && r.resource_id != null)
      .map((r: any) => String(r.resource_id).trim().toLowerCase()),
  };
}

export async function getUserAdmissionScopes(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  userId: string | null | undefined
) {
  return getUserActionScope(supabaseClient, userId, 'view');
}

/** Match a recipient staff member against their stored action scope. */
export async function hasEnquiryStaffScope(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  staffId: string,
  enquiryClassId: string | null | undefined,
  actionKey: "assign" | "followup"
): Promise<boolean> {
  const supabase = supabaseClient ?? (await createClient());
  const { data } = await supabase
    .from("staff_module_scopes")
    .select("action_key, scope_type, resource_id")
    .eq("staff_id", staffId)
    .eq("module_key", "admission_enquiry");
  const classId = enquiryClassId == null ? "" : String(enquiryClassId).trim().toLowerCase();
  return (data ?? []).some((row: any) => {
    const action = row.action_key == null ? "all" : String(row.action_key).trim().toLowerCase();
    if (action !== "all" && action !== actionKey) return false;
    const type = String(row.scope_type ?? "").trim().toUpperCase();
    return type === "ALL" || (type === "CLASS" && row.resource_id != null && (!classId || String(row.resource_id).trim().toLowerCase() === classId));
  });
}

export async function canPerformEnquiryAction(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  userId: string | null | undefined,
  actionKey: AdmissionActionKey,
  enquiryClassId?: string | null,
  enquiryAssignedStaffId?: string | null
): Promise<{ allowed: boolean; reason?: string }> {
  if (!userId) return { allowed: false, reason: "Not signed in" };
  const supabase = supabaseClient ?? (await createClient());

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role === "super_admin") return { allowed: true };

  // 1. Permission check
  const permKey = `admission_enquiry.${actionKey === 'report' ? 'view_reports' : actionKey}`;
  const hasPerm = await userHasPermission(supabase, userId, permKey);
  if (!hasPerm) return { allowed: false, reason: `Missing permission: ${permKey}` };

  // 2. Action Scope check
  const scope = await getUserActionScope(supabase, userId, actionKey);
  if (scope.all) return { allowed: true };

  if (enquiryClassId) {
    if (scope.classes.includes(enquiryClassId)) return { allowed: true };
  }

  if (scope.ownAssigned && enquiryAssignedStaffId && enquiryAssignedStaffId === userId) {
    return { allowed: true };
  }

  return { allowed: false, reason: `Action '${actionKey}' is not authorized for the specified class or enquiry` };
}

/** Resolve whether the current user may enter an enquiry action surface. */
export async function canAccessEnquiryAction(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  userId: string | null | undefined,
  actionKey: AdmissionActionKey
): Promise<boolean> {
  if (!userId) return false;
  const supabase = supabaseClient ?? (await createClient());
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role === "super_admin") return true;

  const permissionKey = `admission_enquiry.${actionKey === "report" ? "view_reports" : actionKey}`;
  if (!(await userHasPermission(supabase, userId, permissionKey))) return false;
  const scope = await getUserActionScope(supabase, userId, actionKey);
  return scope.all || scope.ownAssigned || scope.classes.length > 0 || scope.sections.length > 0;
}

/**
 * Server-side guard for every operation that reads an individual enquiry or
 * one of its child records. Never rely on a hidden button or a client filter
 * for this check.
 */
export async function authorizeEnquiryAccess(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  enquiryId: string,
  actionKey: AdmissionActionKey = "view"
) {
  const supabase = supabaseClient ?? (await createClient());
  const { data: authUser } = await supabase.auth.getUser();
  if (!authUser?.user) return { allowed: false, reason: "Not signed in" };

  const { data: enquiry } = await supabase
    .from("enquiries")
    .select("class_id, assigned_staff_id")
    .eq("id", enquiryId)
    .maybeSingle();
  if (!enquiry) return { allowed: false, reason: "Enquiry not found" };

  return canPerformEnquiryAction(
    supabase,
    authUser.user.id,
    actionKey,
    enquiry.class_id,
    enquiry.assigned_staff_id
  );
}

export type EnquiryActionPermissions = {
  view: boolean;
  edit: boolean;
  assign: boolean;
  followup: boolean;
  change_status: boolean;
  convert_won: boolean;
  mark_lost: boolean;
};

/** Resolve detail-page action permissions on the server in one pass. */
export async function getEnquiryActionPermissions(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  enquiry: Pick<EnquiryRow, "class_id" | "assigned_staff_id">
): Promise<EnquiryActionPermissions> {
  const denied: EnquiryActionPermissions = { view: false, edit: false, assign: false, followup: false, change_status: false, convert_won: false, mark_lost: false };
  const supabase = supabaseClient ?? (await createClient());
  const { data: authUser } = await supabase.auth.getUser();
  const userId = authUser?.user?.id;
  if (!userId) return denied;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role === "super_admin") return { view: true, edit: true, assign: true, followup: true, change_status: true, convert_won: true, mark_lost: true };

  const actionKeys = ["view", "edit", "assign", "followup", "change_status", "convert_won", "mark_lost"];
  const [{ data: permissionRows }, { data: scopeRows }] = await Promise.all([
    supabase.from("staff_permissions").select("permission_key").eq("staff_id", userId).in("permission_key", actionKeys.map((key) => `admission_enquiry.${key}`)),
    supabase.from("staff_module_scopes").select("action_key, scope_type, resource_id").eq("staff_id", userId).eq("module_key", "admission_enquiry"),
  ]);
  const permissions = new Set((permissionRows ?? []).map((row: any) => row.permission_key));
  const result = { ...denied };
  for (const key of actionKeys as (keyof EnquiryActionPermissions)[]) {
    const scopes = (scopeRows ?? []).filter((row: any) => !row.action_key || row.action_key === "ALL" || row.action_key === key);
    const inScope = scopes.some((row: any) => row.scope_type === "ALL" ||
      (row.scope_type === "CLASS" && row.resource_id === enquiry.class_id) ||
      (row.scope_type === "OWN_ASSIGNED" && enquiry.assigned_staff_id === userId));
    result[key] = permissions.has(`admission_enquiry.${key}`) && inScope;
  }
  return result;
}

export async function getEnquiryStats(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  sessionId?: string,
  knownSuperAdmin = false
): Promise<EnquiryStats> {
  const supabase = supabaseClient ?? (await createClient());
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: authUser } = knownSuperAdmin ? { data: { user: null } } : await supabase.auth.getUser();
  const userId = authUser?.user?.id;
  let viewScope: UserActionScope | null = null;
  if (userId && !knownSuperAdmin) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (profile?.role !== "super_admin") {
      if (!(await userHasPermission(supabase, userId, "admission_enquiry.view"))) {
        return { total: 0, newCount: 0, assignedCount: 0, followupCount: 0, interestedCount: 0, wonCount: 0, lostCount: 0, closedCount: 0, todayFollowups: 0, overdueFollowups: 0, upcomingFollowups: 0, noNextFollowup: 0, conversionRate: 0 };
      }
      viewScope = await getUserActionScope(supabase, userId, "view");
    }
  }

  let baseQ = supabase.from("enquiries").select("id, status, next_followup_date, class_id, assigned_staff_id");
  if (sessionId) baseQ = baseQ.eq("session_id", sessionId);

  const { data: rows } = await baseQ;
  const list = (rows ?? []).filter((item: any) => {
    if (!viewScope || viewScope.all) return true;
    return (item.class_id && viewScope.classes.includes(item.class_id)) ||
      (viewScope.ownAssigned && item.assigned_staff_id === userId);
  });

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
  filters: EnquiryFilters = {},
  knownSuperAdmin = false,
  actionKey: AdmissionActionKey = "view"
) {
  const supabase = supabaseClient ?? (await createClient());
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const todayStr = new Date().toISOString().slice(0, 10);

  // Enforce module-level view permission + scope
  const { data: authUser } = knownSuperAdmin ? { data: { user: null } } : await supabase.auth.getUser();
  const user = authUser?.user ?? null;
  if (!user && !knownSuperAdmin) {
    return { rows: [], total: 0, page, pageSize, totalPages: 1, error: "Not signed in" };
  }

  const { data: profile } = knownSuperAdmin
    ? { data: { role: "super_admin" } }
    : await supabase.from("profiles").select("role").eq("id", user!.id).maybeSingle();
  const isSuper = knownSuperAdmin || profile?.role === "super_admin";

  if (!isSuper) {
    const permissionKey = `admission_enquiry.${actionKey === "report" ? "view_reports" : actionKey}`;
    const hasPermission = await userHasPermission(supabase, user!.id, permissionKey);
    if (!hasPermission) {
      return { rows: [], total: 0, page, pageSize, totalPages: 1, error: "Access denied" };
    }
  }

  // Fetch the enquiry rows independently from display-name lookups. This keeps
  // the directory usable even if PostgREST has not refreshed a relationship
  // definition after a migration.
  let query = supabase.from("enquiries").select("*", { count: "exact" });

  // Apply user action scopes for view when not super admin
  if (!isSuper) {
    const scopes = await getUserActionScope(supabase, user!.id, actionKey);
    const classFilter = scopes.classes ?? [];
    const ownAssigned = scopes.ownAssigned ?? false;
    const allowAll = scopes.all ?? false;

    if (!allowAll) {
      if ((!classFilter || classFilter.length === 0) && !ownAssigned) {
        return { rows: [], total: 0, page, pageSize, totalPages: 1, error: "No scope configured for viewing admission enquiries" };
      }

      if (filters.class_id) {
        if (classFilter && classFilter.length > 0) {
          if (!classFilter.includes(filters.class_id)) {
            if (!ownAssigned) return { rows: [], total: 0, page, pageSize, totalPages: 1, error: "Access denied for the selected class" };
          }
        } else if (!ownAssigned) {
          return { rows: [], total: 0, page, pageSize, totalPages: 1, error: "Access denied for the selected class" };
        }
      }

      if (ownAssigned && classFilter && classFilter.length > 0) {
        query = query.or(`class_id.in.(${classFilter.map((c: string) => c).join(',')}) , assigned_staff_id.eq.${user!.id}`);
      } else if (ownAssigned) {
        query = query.eq("assigned_staff_id", user!.id);
      } else if (classFilter && classFilter.length > 0) {
        query = query.in("class_id", classFilter);
      }
    }
  }

  if (filters.id) query = query.eq("id", filters.id);
  if (filters.session_id) query = query.eq("session_id", filters.session_id);
  if (filters.class_id) query = query.eq("class_id", filters.class_id);
  if (filters.enquiry_type) query = query.eq("enquiry_type", filters.enquiry_type);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.assigned_staff_id) query = query.eq("assigned_staff_id", filters.assigned_staff_id);
  if (filters.status) {
    const statuses = filters.status.split(",").filter(Boolean);
    query = statuses.length > 1 ? query.in("status", statuses) : query.eq("status", statuses[0]);
  }

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

  if (error) {
    return { rows: [], total: 0, page, pageSize, totalPages: 1, error: error.message };
  }

  const rawRows = (data ?? []) as any[];
  const classIds = [...new Set(rawRows.map((row) => row.class_id).filter(Boolean))];
  const sessionIds = [...new Set(rawRows.map((row) => row.session_id).filter(Boolean))];
  const staffIds = [...new Set(rawRows.map((row) => row.assigned_staff_id).filter(Boolean))];
  const [{ data: classes }, { data: sessions }, { data: staff }] = await Promise.all([
    classIds.length ? supabase.from("classes").select("id, name").in("id", classIds) : Promise.resolve({ data: [] }),
    sessionIds.length ? supabase.from("academic_sessions").select("id, name").in("id", sessionIds) : Promise.resolve({ data: [] }),
    staffIds.length ? supabase.from("profiles").select("id, full_name, email").in("id", staffIds) : Promise.resolve({ data: [] }),
  ]);
  const classMap = new Map((classes ?? []).map((item: any) => [item.id, { name: item.name }]));
  const sessionMap = new Map((sessions ?? []).map((item: any) => [item.id, { name: item.name }]));
  const staffMap = new Map((staff ?? []).map((item: any) => [item.id, { full_name: item.full_name, email: item.email }]));
  const rows = rawRows.map((row) => ({
    ...row,
    classes: classMap.get(row.class_id) ?? null,
    academic_sessions: sessionMap.get(row.session_id) ?? null,
    assigned_staff: staffMap.get(row.assigned_staff_id) ?? null,
  }));

  return {
    rows: rows as EnquiryRow[],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    error: null,
  };
}

export type EnquiryDashboardData = {
  byStatus: { name: string; value: number }[];
  onlineOffline: { name: string; value: number }[];
  byClass: { name: string; value: number }[];
  bySource: { name: string; value: number }[];
  monthlyTrend: { month: string; enquiries: number }[];
  conversion: { name: string; value: number }[];
};

export async function getEnquiryDashboardData(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  knownSuperAdmin = false
): Promise<EnquiryDashboardData> {
  const empty: EnquiryDashboardData = { byStatus: [], onlineOffline: [], byClass: [], bySource: [], monthlyTrend: [], conversion: [] };
  const result = await getEnquiries(supabaseClient, { page: 1, pageSize: 10000 }, knownSuperAdmin, "view");
  if (result.error) return empty;
  const rows = result.rows as EnquiryRow[];
  const countBy = (values: string[]) => [...new Map(values.map((value) => [value, values.filter((item) => item === value).length])).entries()]
    .map(([name, value]) => ({ name, value }));
  const byStatus = countBy(rows.map((row) => row.status));
  const onlineOffline = countBy(rows.map((row) => row.enquiry_type));
  const byClass = countBy(rows.map((row) => row.classes?.name ?? "Unassigned"));
  const bySource = countBy(rows.map((row) => row.source ?? "Other"));
  const conversion = [
    { name: "Won", value: rows.filter((row) => row.status === "Won").length },
    { name: "Lost", value: rows.filter((row) => row.status === "Lost").length },
    { name: "In progress", value: rows.filter((row) => !["Won", "Lost", "Closed"].includes(row.status)).length },
  ];
  const monthlyMap = new Map<string, number>();
  for (const row of rows) monthlyMap.set(row.created_at.slice(0, 7), (monthlyMap.get(row.created_at.slice(0, 7)) ?? 0) + 1);
  const start = new Date();
  start.setDate(1);
  start.setMonth(start.getMonth() - 11);
  const monthlyTrend = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(start);
    date.setMonth(start.getMonth() + index);
    const key = date.toISOString().slice(0, 7);
    return { month: date.toLocaleString("default", { month: "short" }), enquiries: monthlyMap.get(key) ?? 0 };
  });
  return { byStatus, onlineOffline, byClass, bySource, monthlyTrend, conversion };
}

export type StaffPerformanceRow = {
  staffId: string;
  staffName: string;
  scope: string;
  totalAssigned: number;
  pendingFollowups: number;
  overdueFollowups: number;
  interested: number;
  won: number;
  lost: number;
  conversion: number;
};

export async function getStaffPerformanceData(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  knownSuperAdmin = false
): Promise<StaffPerformanceRow[]> {
  const supabase = supabaseClient ?? (await createClient());
  const result = await getEnquiries(supabase, { page: 1, pageSize: 10000 }, knownSuperAdmin, "view");
  if (result.error) return [];
  const { data: staff } = await supabase.from("profiles").select("id, full_name, role").in("role", ["staff", "super_admin"]).order("full_name");
  const { data: scopes } = await supabase.from("staff_module_scopes").select("staff_id, action_key, scope_type, resource_id").eq("module_key", "admission_enquiry");
  const { data: classes } = await supabase.from("classes").select("id, name");
  const classNames = new Map((classes ?? []).map((item: any) => [item.id, item.name]));
  const today = new Date().toISOString().slice(0, 10);
  const rows = result.rows as EnquiryRow[];
  return (staff ?? []).map((member: any) => {
    const assigned = rows.filter((row) => row.assigned_staff_id === member.id);
    const memberScopes = (scopes ?? []).filter((scope: any) => scope.staff_id === member.id && (!scope.action_key || scope.action_key === "ALL" || scope.action_key === "view" || scope.action_key === "report"));
    const allClasses = memberScopes.some((scope: any) => scope.scope_type === "ALL");
    const classNamesForMember = [...new Set(memberScopes.filter((scope: any) => scope.scope_type === "CLASS" && scope.resource_id).map((scope: any) => classNames.get(scope.resource_id) ?? "Unknown class"))];
    const totalAssigned = assigned.length;
    const won = assigned.filter((row) => row.status === "Won").length;
    return {
      staffId: member.id,
      staffName: member.full_name ?? "Unnamed staff",
      scope: allClasses ? "All classes" : classNamesForMember.length ? classNamesForMember.join(", ") : "Own assigned enquiries",
      totalAssigned,
      pendingFollowups: assigned.filter((row) => row.next_followup_date && row.next_followup_date >= today && !["Won", "Lost", "Closed"].includes(row.status)).length,
      overdueFollowups: assigned.filter((row) => row.next_followup_date && row.next_followup_date < today && !["Won", "Lost", "Closed"].includes(row.status)).length,
      interested: assigned.filter((row) => row.status === "Interested").length,
      won,
      lost: assigned.filter((row) => row.status === "Lost").length,
      conversion: totalAssigned ? Number(((won / totalAssigned) * 100).toFixed(1)) : 0,
    };
  });
}

export async function getEnquiryById(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  id: string
): Promise<EnquiryRow | null> {
  const supabase = supabaseClient ?? (await createClient());
  // Accept both the database UUID used by links and the human-readable
  // enquiry_id used in copied/direct URLs.
  let lookup = await supabase.from("enquiries").select("*").eq("id", id).maybeSingle();
  if (!lookup.data) {
    lookup = await supabase.from("enquiries").select("*").eq("enquiry_id", id).maybeSingle();
  }
  const raw = lookup.data as any;
  if (!raw) return null;

  const access = await authorizeEnquiryAccess(supabase, raw.id, "view");
  if (!access.allowed) return null;

  const [{ data: classes }, { data: sessions }, { data: staff }] = await Promise.all([
    raw.class_id ? supabase.from("classes").select("id, name").eq("id", raw.class_id).maybeSingle() : Promise.resolve({ data: null }),
    raw.session_id ? supabase.from("academic_sessions").select("id, name").eq("id", raw.session_id).maybeSingle() : Promise.resolve({ data: null }),
    raw.assigned_staff_id ? supabase.from("profiles").select("id, full_name, email").eq("id", raw.assigned_staff_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return {
    ...raw,
    classes: classes ? { name: classes.name } : null,
    academic_sessions: sessions ? { name: sessions.name } : null,
    assigned_staff: staff ? { full_name: staff.full_name, email: staff.email } : null,
  } as EnquiryRow;
}

export async function getEnquiryFollowups(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  enquiryId: string
): Promise<FollowupRow[]> {
  const supabase = supabaseClient ?? (await createClient());
  const access = await authorizeEnquiryAccess(supabase, enquiryId, "view");
  if (!access.allowed) return [];
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
  const access = await authorizeEnquiryAccess(supabase, enquiryId, "view");
  if (!access.allowed) return [];
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
  const access = await authorizeEnquiryAccess(supabase, enquiryId, "view");
  if (!access.allowed) return [];
  const { data } = await supabase
    .from("enquiry_audit_logs")
    .select("*, user:profiles!enquiry_audit_logs_user_id_fkey(full_name)")
    .eq("enquiry_id", enquiryId)
    .order("created_at", { ascending: false });

  return (data ?? []) as AuditLogRow[];
}

// Permission & scope helpers
export async function userHasPermission(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  userId: string | null | undefined,
  permissionKey: string
): Promise<boolean> {
  if (!userId) return false;
  const supabase = supabaseClient ?? (await createClient());
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role === "super_admin") return true;
  const { data } = await supabase
    .from("staff_permissions")
    .select("permission_key")
    .eq("staff_id", userId)
    .eq("permission_key", permissionKey)
    .maybeSingle();
  return !!data;
}

export async function getStaffOptions(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  classId?: string,
  knownSuperAdmin = false
): Promise<{ id: string; full_name: string; designated_classes?: string[] }[]> {
  const supabase = supabaseClient ?? (await createClient());
  const { data } = await supabase
    .from("staff")
    .select("id, is_active, profiles!staff_id_fkey(full_name, role)")
    .eq("is_active", true)
    .order("id");

  const base = (data ?? []).map((member: any) => ({
    id: member.id,
    full_name: member.profiles?.full_name ?? "Unnamed Staff",
    role: member.profiles?.role ?? "staff",
  })) as { id: string; full_name: string; role: string }[];

  // Recipient rule: only expose active staff whose existing Admission Enquiry
  // Follow-up Scope covers this enquiry's class.
  const eligibleStaff: { id: string; full_name: string; designated_classes?: string[] }[] = [];

  for (const member of base) {
    const enquiryClassId = classId == null ? null : String(classId).trim().toLowerCase();
      if (await hasEnquiryStaffScope(supabase, member.id, enquiryClassId, "followup")) {
      eligibleStaff.push({ id: member.id, full_name: member.full_name, designated_classes: enquiryClassId ? [enquiryClassId] : [] });
    }
  }

  return eligibleStaff.sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export async function getEnquiryReportData(
  supabaseClient: Awaited<ReturnType<typeof createClient>> | null,
  reportType: 'enquiry' | 'followup' | 'staff' | 'source' | 'class' | 'conversion',
  filters: EnquiryFilters = {}
) {
  const supabase = supabaseClient ?? (await createClient());
  const { data: authUser } = await supabase.auth.getUser();
  if (!authUser?.user) return [];

  // Check report permission & scope
  const hasReportPerm = await userHasPermission(supabase, authUser.user.id, "admission_enquiry.view_reports");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authUser.user.id).maybeSingle();
  if (profile?.role !== "super_admin" && !hasReportPerm) return [];

  const { rows } = await getEnquiries(supabase, { ...filters, pageSize: 1000, page: 1 }, false, "report");

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

