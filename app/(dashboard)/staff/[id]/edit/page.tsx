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

  const { data: member } = await supabase
    .from("staff")
    .select("*, profiles(full_name)")
    .eq("id", params.id)
    .single();

  if (!member) notFound();
  const s = member as any;
  const admin = createAdminClient();
  const { data: signedPhoto } = s.photo_path
    ? await admin.storage.from("staff-photos").createSignedUrl(s.photo_path, 60 * 10)
    : { data: null };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink-700">Edit Staff</h1>
        <Link href="/staff" className="inline-flex items-center rounded-lg bg-ink-700 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-600"><span aria-hidden="true">&larr;</span><span className="ml-2">Back to Staff List</span></Link>
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
