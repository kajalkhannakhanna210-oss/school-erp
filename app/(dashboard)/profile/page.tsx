import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { FeeSummary } from "@/app/(dashboard)/fees/fee-summary";
import { getStudentFeeLines } from "@/lib/fees";
import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "./change-password-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  const { data: studentRecord } =
    profile?.role === "student"
      ? await supabase
          .from("students")
          .select("admission_number, admission_date, classes(name), sections(name)")
          .eq("id", user!.id)
          .single()
      : { data: null };

  const feeLines = profile?.role === "student" ? await getStudentFeeLines(supabase, user!.id) : [];

  const { data: staffRecord } =
    profile?.role === "staff"
      ? await supabase
          .from("staff")
          .select("employee_id, department, designation, qualification, joining_date, salary")
          .eq("id", user!.id)
          .single()
      : { data: null };

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl text-ink-700">My Profile</h1>
      <Card className="mt-6">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate/50">Name</dt>
            <dd className="font-medium">{profile?.full_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate/50">Email</dt>
            <dd className="font-medium">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate/50">Role</dt>
            <dd className="font-medium capitalize">{profile?.role?.replace("_", " ")}</dd>
          </div>
        </dl>
      </Card>
      {studentRecord && (
        <Card className="mt-6">
          <h2 className="font-display text-lg text-ink-700">Admission details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate/50">Admission number</dt>
              <dd className="font-mono font-medium">{studentRecord.admission_number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate/50">Admission date</dt>
              <dd className="font-medium">{studentRecord.admission_date}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate/50">Class</dt>
              <dd className="font-medium">
                {(studentRecord as any).classes?.name} - {(studentRecord as any).sections?.name}
              </dd>
            </div>
          </dl>
        </Card>
      )}
      {studentRecord && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-ink-700">My Fees</h2>
            <Link href="/payments">
              <Button variant="ghost">Go to Payments →</Button>
            </Link>
          </div>
          <div className="mt-4">
            <FeeSummary studentId={user!.id} lines={feeLines} canManage={false} />
          </div>
        </div>
      )}
      {staffRecord && (
        <Card className="mt-6">
          <h2 className="font-display text-lg text-ink-700">Employment details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate/50">Employee ID</dt>
              <dd className="font-mono font-medium">{staffRecord.employee_id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate/50">Department</dt>
              <dd className="font-medium">{staffRecord.department || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate/50">Designation</dt>
              <dd className="font-medium">{staffRecord.designation || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate/50">Qualification</dt>
              <dd className="font-medium">{staffRecord.qualification || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate/50">Joining date</dt>
              <dd className="font-medium">{staffRecord.joining_date}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate/50">Salary</dt>
              <dd className="font-mono font-medium">
                {staffRecord.salary != null ? `₹${staffRecord.salary}` : "—"}
              </dd>
            </div>
          </dl>
        </Card>
      )}
      <Card className="mt-6">
        <h2 className="font-display text-lg text-ink-700">Change password</h2>
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
