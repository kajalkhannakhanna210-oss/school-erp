import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StaffForm } from "../../staff-form";

export default async function EditStaffPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (viewerProfile?.role !== "super_admin") redirect("/dashboard");

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
  const admin = createAdminClient();
  const { data: signedPhoto } = s.photo_path
    ? await admin.storage.from("staff-photos").createSignedUrl(s.photo_path, 60 * 10)
    : { data: null };

  return (
    <div className="min-w-0 space-y-4">
      {/* Header Banner matching /staff page */}
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-ink-100 border-l-4 border-l-gold-500 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700">Staff Management</p>
          <h1 className="mt-0.5 font-display text-xl font-semibold text-ink-700 sm:text-2xl">
            Edit Staff Member ({s.profiles?.full_name || s.employee_id})
          </h1>
          <p className="mt-0.5 text-xs text-slate/70">
            Update employee details, designation, department, contact info, and profile photo.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/staff">
            <Button variant="outline" className="h-10 px-4 text-sm font-semibold shadow-sm">
              ← Back to Staff Directory
            </Button>
          </Link>
        </div>
      </div>
      <div className="mt-6">
        <StaffForm
          mode="edit"
          staffId={s.id}
          initial={{
            full_name: s.profiles?.full_name ?? "",
            department: s.department ?? "",
            designation: s.designation ?? "",
            qualification: s.qualification ?? "",
            mobile_number: s.mobile_number ?? "",
            salary: s.salary != null ? String(s.salary) : "",
            joining_date: s.joining_date ?? "",
            photo_url: signedPhoto?.signedUrl ?? null,
          }}
        />
      </div>
    </div>
  );
}
