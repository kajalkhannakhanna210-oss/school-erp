import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { userHasPermission } from "@/lib/enquiries";
import { ArchiveControl } from "./archive-control";
import { PhotoUpload } from "./photo-upload";

type AssignedPermission = {
  permission_key: string;
};

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return `${String(date.getDate()).padStart(2, "0")} ${date.toLocaleString("en-US", { month: "short" })} ${date.getFullYear()}`;
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return `${String(date.getDate()).padStart(2, "0")} ${date.toLocaleString("en-US", { month: "short" })} ${date.getFullYear()} ${date.toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
}

export default async function StaffDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string } }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const isSuper = viewerProfile?.role === "super_admin";
  const canManage = user ? await userHasPermission(supabase, user.id, "admission_enquiry.manage_configuration") : false;
  if (!isSuper && !canManage) redirect("/dashboard");

  let { data: member } = await supabase
    .from("staff")
    .select("*, profiles!staff_id_fkey(full_name)")
    .eq("id", params.id)
    .maybeSingle();

  if (!member) {
    const { data: rawStaff } = await supabase.from("staff").select("*").eq("id", params.id).maybeSingle();
    if (!rawStaff) notFound();
    const { data: profileData } = await supabase.from("profiles").select("full_name").eq("id", params.id).maybeSingle();
    (rawStaff as any).profiles = profileData ?? { full_name: "Staff Member" };
    member = rawStaff as any;
  }
  const s = member as any;

  let allClasses: any = null;
  let scopes: any = null;

  try {
    const results = await Promise.all([
      supabase.from("classes").select("id, name").order("sort_order"),
      supabase.from("staff_module_scopes").select("action_key, scope_type, resource_id").eq("staff_id", params.id).eq("module_key", "admission_enquiry"),
    ]);
    allClasses = results[0].data;
    scopes = results[1].data;
  } catch (e: any) {
    scopes = [];
    allClasses = [];
  }

  let photoUrl: string | null = null;
  if (s.photo_path) {
    const admin = (await import("@/lib/supabase/admin")).createAdminClient();
    const { data: signed } = await admin.storage.from("staff-photos").createSignedUrl(s.photo_path, 60 * 10);
    if (signed?.signedUrl) {
      photoUrl = signed.signedUrl;
    } else {
      const { data: pub } = admin.storage.from("staff-photos").getPublicUrl(s.photo_path);
      photoUrl = pub?.publicUrl ?? null;
    }
  }

  return (
    <div className="space-y-6">
      {searchParams.saved && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {searchParams.saved === "created" ? "Staff member saved successfully." : "Staff member updated successfully."}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-ink-100 border-l-4 border-l-gold-500 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-ink-100 font-display text-base font-bold text-ink-700 shadow-inner">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={s.profiles?.full_name} className="h-full w-full object-cover" />
            ) : (
              (s.profiles?.full_name || "S")
                .split(" ")
                .map((part: string) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700 bg-gold-50 px-2 py-0.5 rounded border border-gold-200/60">
                Staff Profile
              </span>
              <span className="font-mono text-xs text-slate-500 bg-ink-50 px-2 py-0.5 rounded border border-ink-100">
                ID: {s.employee_id}
              </span>
              {s.is_active ? (
                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  Active
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                  Archived / Inactive
                </span>
              )}
            </div>
            <h1 className="mt-1 font-display text-xl font-semibold text-ink-900 sm:text-2xl truncate">
              {s.profiles?.full_name}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {s.designation || "No Designation"} {s.department ? `· ${s.department}` : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/staff">
            <Button variant="outline" className="h-9 px-3.5 text-xs font-semibold shadow-sm">
              ← Directory
            </Button>
          </Link>
          <Link href={`/staff/${s.id}/documents`}>
            <Button variant="outline" className="h-9 px-3.5 text-xs font-semibold shadow-sm">
              📁 Documents
            </Button>
          </Link>
          <Link href={`/staff/${s.id}/edit`}>
            <Button className="h-9 px-3.5 text-xs font-semibold shadow-sm bg-gold-500 hover:bg-gold-600 text-ink-900">
              ✏️ Edit Profile
            </Button>
          </Link>
          <ArchiveControl staffId={s.id} isActive={s.is_active} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="font-display text-lg text-ink-700">Photo</h2>
          <div className="mt-4 flex h-40 w-40 items-center justify-center overflow-hidden rounded-md bg-ink-50">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={s.profiles?.full_name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-slate/40">No photo</span>
            )}
          </div>
          <div className="mt-4">
            <PhotoUpload staffId={s.id} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="font-display text-lg text-ink-700">Details</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Field label="Employee ID" value={s.employee_id} />
            <Field label="Full Name" value={s.profiles?.full_name} />
            <Field label="Department" value={s.department} />
            <Field label="Designation" value={s.designation} />
            <Field label="Qualification" value={s.qualification} />
            <Field label="Mobile" value={s.mobile_number} />
            <Field label="Contact Email" value={s.contact_email} />
            <Field label="Joining Date" value={formatDate(s.joining_date)} />
            <Field label="Status" value={s.is_active ? "Active" : "Archived / Inactive"} />
            <Field label="Salary" value={s.salary != null ? `₹${s.salary}` : null} />
            <Field label="Inactive Date" value={s.inactive_date ? formatDateTime(s.inactive_date) : null} />
            <Field label="Inactive By" value={s.inactive_by} />
            <Field label="Created Date" value={formatDateTime(s.created_at)} />
          </dl>
        </Card>

        {/* Assigned Classes per Module (Read-only Display) */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between border-b border-ink-100 pb-3">
            <div>
              <h2 className="font-display text-lg text-ink-700">Assigned Classes (Admission Enquiry Module)</h2>
              <p className="mt-0.5 text-xs text-slate/60">
                Action-specific class scopes assigned to this staff member. (Configurable via Staff Assignment Rules)
              </p>
            </div>
            <Link href="/admissions-admin/staff-assignment-rules">
              <Button variant="outline" className="h-8 px-3 text-xs">
                Manage Rules →
              </Button>
            </Link>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {(() => {
              const classMap = new Map((allClasses ?? []).map((c: any) => [c.id, c.name]));
              const actionLabels: Record<string, { label: string; bg: string }> = {
                create: { label: "Create Scope", bg: "bg-blue-50 text-blue-700 border-blue-200" },
                view: { label: "View Scope", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                edit: { label: "Edit Scope", bg: "bg-amber-50 text-amber-700 border-amber-200" },
                assign: { label: "Assign Scope", bg: "bg-purple-50 text-purple-700 border-purple-200" },
                followup: { label: "Follow-up Scope", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
                change_status: { label: "Status Scope", bg: "bg-rose-50 text-rose-700 border-rose-200" },
                report: { label: "Report Scope", bg: "bg-cyan-50 text-cyan-700 border-cyan-200" },
                export: { label: "Export Scope", bg: "bg-slate-100 text-slate-700 border-slate-200" },
              };

              const actionKeys = Object.keys(actionLabels);

              return actionKeys.map((ak) => {
                const cfg = actionLabels[ak];
                const rows = (scopes ?? []).filter((r: any) => (!r.action_key || r.action_key === "ALL" || r.action_key === ak));
                const isAll = rows.some((r: any) => r.scope_type === "ALL");
                const assignedClasses = rows
                  .filter((r: any) => r.scope_type === "CLASS" && r.resource_id)
                  .map((r: any) => classMap.get(r.resource_id) ?? r.resource_id);

                return (
                  <div key={ak} className="rounded-lg border border-ink-100 bg-ink-50/40 p-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold border ${cfg.bg}`}>
                      {cfg.label}
                    </span>
                    <div className="mt-2.5">
                      {isAll ? (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          ✓ All Classes
                        </span>
                      ) : assignedClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {assignedClasses.map((clsName: string, idx: number) => (
                            <span key={idx} className="rounded bg-white px-2 py-0.5 text-xs font-medium text-ink-800 border border-ink-200 shadow-2xs">
                              {clsName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate/40 italic">None assigned</span>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate/50">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate">{value || "—"}</dd>
    </div>
  );
}