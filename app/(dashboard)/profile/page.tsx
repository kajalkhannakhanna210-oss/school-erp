import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { FeeSummary } from "@/app/(dashboard)/fees/fee-summary";
import { getStudentFeeLines } from "@/lib/fees";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { ChangePasswordForm } from "./change-password-form";
import { DateValue } from "@/components/date-value";
import { DocumentPanel } from "@/components/documents/document-panel";
import { listDocumentCategories, listDocumentsForSubject } from "@/lib/documents";

export default async function ProfilePage() {
  try {
    await requirePageAccess("profile");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  const { data: loginHistory } = await supabase
    .from("login_activities")
    .select("id, event_type, status, device_type, browser, operating_system, login_at, logout_at, session_duration_seconds, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(20);

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

  const documentSubjectType = profile?.role === "student" ? "student" : profile?.role === "staff" ? "staff" : null;
  let documentCategories: Awaited<ReturnType<typeof listDocumentCategories>> = [];
  let ownDocuments: Awaited<ReturnType<typeof listDocumentsForSubject>> = [];
  if (documentSubjectType) {
    [documentCategories, ownDocuments] = await Promise.all([
      listDocumentCategories(documentSubjectType),
      listDocumentsForSubject(documentSubjectType, user!.id),
    ]);
    documentCategories = documentCategories.filter((category) => category.subject_visible);
  }

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
              <dd className="font-medium"><DateValue value={studentRecord.admission_date} /></dd>
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
              <dd className="font-medium"><DateValue value={staffRecord.joining_date} /></dd>
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
      {documentSubjectType && (
        <Card className="mt-6">
          <h2 className="font-display text-lg text-ink-700">My Documents</h2>
          <p className="mt-1 text-sm text-slate/60">Approved records shared with your account. Official documents cannot be edited here.</p>
          <div className="mt-4">
            <DocumentPanel
              subjectType={documentSubjectType}
              subjectId={user!.id}
              documents={ownDocuments}
              categories={documentCategories}
              canManage={false}
              canDelete={false}
              canViewAudit={false}
            />
          </div>
        </Card>
      )}
      <Card className="mt-6">
        <h2 className="font-display text-lg text-ink-700">Change password</h2>
        <ChangePasswordForm />
      </Card>
      <Card className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="font-display text-lg text-ink-700">Login History</h2><p className="mt-1 text-sm text-slate/60">Recent authentication activity for your account.</p></div>
          <span className="text-xs text-slate/50">{loginHistory?.length ?? 0} records</span>
        </div>
        {(loginHistory ?? []).length === 0 ? <p className="py-8 text-center text-sm text-slate/60">No login history available yet.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50"><th className="py-3 pr-4">Date and time</th><th className="py-3 pr-4">Event</th><th className="py-3 pr-4">Device</th><th className="py-3 pr-4">Browser</th><th className="py-3 pr-4">Status</th><th className="py-3">Session</th></tr></thead><tbody>{loginHistory?.map((item) => <tr key={item.id} className="border-b border-ink-100 last:border-0"><td className="whitespace-nowrap py-3 pr-4">{new Date(item.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td><td className="py-3 pr-4 capitalize">{item.event_type.replaceAll("_", " ")}</td><td className="py-3 pr-4">{item.device_type ?? "—"}</td><td className="py-3 pr-4">{item.browser ?? "—"}</td><td className={item.status === "success" ? "py-3 font-semibold text-success" : "py-3 font-semibold text-amber-700"}>{item.status}</td><td className="py-3">{item.session_duration_seconds == null ? "—" : `${Math.floor(item.session_duration_seconds / 60)}m ${item.session_duration_seconds % 60}s`}</td></tr>)}</tbody></table></div>}
      </Card>
    </div>
  );
}
