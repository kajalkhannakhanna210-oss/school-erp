import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Edit Staff</h1>
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
          }}
        />
      </div>
    </div>
  );
}
