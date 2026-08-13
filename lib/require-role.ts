import { createClient } from "@/lib/supabase/server";
import { recordLoginActivity } from "@/lib/security/login-activity";

// RLS already blocks non-admins from writing to admin-only tables through the
// regular server client. This guard exists specifically for actions that use
// lib/supabase/admin.ts (the service-role client), since that client bypasses
// RLS and needs its own authorization check before doing anything privileged.
export async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "super_admin") {
    throw new Error("Only a Super Admin can do this");
  }

  return user;
}

// Check if user has access to a specific page based on role and role_page_access
// All roles (including super_admin) must have explicit page access configured
export async function requirePageAccess(pageKey: string): Promise<{ user: any; role: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile?.role) throw new Error("User profile not found");

  // Check if page access is configured for this role (applies to all roles)
  const { data: pageAccess } = await supabase
    .from("role_page_access")
    .select("page_key")
    .eq("role", profile.role)
    .eq("page_key", pageKey)
    .maybeSingle();

  if (!pageAccess) {
    await recordLoginActivity({ eventType: "role_access_denied", status: "blocked", userId: user.id, failureReason: "page_not_allowed", metadata: { pageKey } });
    throw new Error(`Access denied to page: ${pageKey}`);
  }

  return { user, role: profile.role };
}

// Used by both the /reports page and the /api/reports export route — kept
// in one place so the two can't quietly drift out of sync (e.g. someone
// loosening the page's check without noticing the route needs the same
// change). Report *access* is gated here; each report's actual *data* is
// still separately scoped by whatever RLS already governs that data type
// (view_fee_status for fee reports, class-teacher assignment or
// mark_attendance for the attendance report, and so on) — a staff member
// can have view_reports and still see an empty fee report if they lack
// view_fee_status. That's intentional layering, not a bug.
export async function hasReportsAccess(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "super_admin") return true;
  if (profile?.role !== "staff") return false;

  const { data: permission } = await supabase
    .from("staff_permissions")
    .select("permission_key")
    .eq("staff_id", user.id)
    .eq("permission_key", "view_reports")
    .maybeSingle();
  return !!permission;
}
