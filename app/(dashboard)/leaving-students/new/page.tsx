import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { requirePageAccess } from "@/lib/require-role";
import { createClient } from "@/lib/supabase/server";
import { LEAVING_REASON_LABELS, LeavingReason } from "@/lib/leaving-students";
import { createLeavingRequestAction } from "../actions";
import { StudentSelectWithSearch } from "./student-select-with-search";
import { SubmitExitButton } from "./submit-exit-button";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function NewLeavingRequestPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  try {
    await requirePageAccess("leaving_students");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const selectedStudentId = typeof searchParams.studentId === "string" ? searchParams.studentId : "";

  // Fetch existing active leaving requests (not rejected or cancelled)
  const { data: existingRequests } = await supabase
    .from("student_leaving_requests")
    .select("student_id")
    .not("status", "in", '("rejected","cancelled")');

  const existingStudentIds = new Set((existingRequests ?? []).map((r) => r.student_id));

  // Fetch active students for selector dropdown, filtering out students with an active request
  const { data: rawStudents } = await supabase
    .from("students")
    .select("id, admission_number, father_name, mother_name, admission_date, profiles(full_name), classes(name), sections(name)")
    .eq("is_active", true)
    .order("admission_number");

  const students = (rawStudents ?? []).filter((s) => !existingStudentIds.has(s.id));

  const preselected = (students ?? []).find((s) => s.id === selectedStudentId);

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Header section with refined enterprise banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink-100 border-l-4 border-l-gold-500 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate/50">
            <Link href="/leaving-students" className="hover:text-gold-600 transition">
              Leaving Students
            </Link>
            <span>/</span>
            <span className="text-gold-600 font-bold">Initiate Departure</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-900">
            Initiate Student Exit & Clearance
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate/60 max-w-3xl">
            Start the official student departure workflow, clear departmental dues, and generate a Transfer Certificate (TC).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/leaving-students">
            <Button variant="outline" size="sm" className="gap-2 font-medium">
              ← Cancel & Return
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Form Card with Enterprise Full Width Grid */}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-6 sm:p-8 shadow-md border-ink-100">
            <form action={createLeavingRequestAction} className="space-y-8">
              {/* Section 1: Student Directory & Selection */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-100 text-xs font-bold text-gold-700">1</span>
                    <Label className="text-xs font-bold uppercase tracking-wider text-ink-700">
                      Select Student Roster <span className="text-rose-500">*</span>
                    </Label>
                  </div>
                  {preselected && (
                    <Badge variant="default" className="font-mono text-[11px]">
                      Selected: {preselected.admission_number}
                    </Badge>
                  )}
                </div>
                <StudentSelectWithSearch
                  students={students ?? []}
                  selectedStudentId={selectedStudentId}
                />
              </div>

              {/* Section 2: Exit Date & Reason Details */}
              <div className="space-y-4 pt-6 border-t border-ink-100/80">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-100 text-xs font-bold text-gold-700">2</span>
                  <Label className="text-xs font-bold uppercase tracking-wider text-ink-700">
                    Departure Details & Reason
                  </Label>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-semibold text-slate/70">
                      Date of Leaving <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      name="leavingDate"
                      type="date"
                      required
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      className="mt-2 rounded-xl p-3 text-sm font-medium"
                    />
                    <p className="mt-1 text-[11px] text-slate/50">Must be on or after official admission date.</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate/70">
                      Primary Reason for Leaving <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      name="reason"
                      required
                      className="mt-2 w-full rounded-xl border border-ink-200 bg-white p-3.5 text-sm font-medium text-ink-900 shadow-sm transition-all focus:border-gold-500 focus:outline-none focus:ring-4 focus:ring-gold-500/10"
                    >
                      {Object.entries(LEAVING_REASON_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Additional Notes & Documentation */}
              <div className="space-y-4 pt-6 border-t border-ink-100/80">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-100 text-xs font-bold text-gold-700">3</span>
                  <Label className="text-xs font-bold uppercase tracking-wider text-ink-700">
                    Additional Explanation & Clearance Remarks
                  </Label>
                </div>
                
                <div>
                  <Label className="text-xs font-semibold text-slate/70">
                    Custom Specific Reason / Destination School (Optional)
                  </Label>
                  <Input
                    name="otherReasonDetails"
                    placeholder="E.g., Transferring to Army Public School due to father's defense relocation..."
                    className="mt-2 rounded-xl p-3 text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate/70">
                    Administrative Remarks & Official Summary
                  </Label>
                  <textarea
                    name="detailedRemarks"
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-ink-200 bg-white p-3.5 text-sm text-ink-900 shadow-sm transition-all placeholder:text-slate/40 focus:border-gold-500 focus:outline-none focus:ring-4 focus:ring-gold-500/10"
                    placeholder="Enter any special clearance conditions, fee waiver notes, or administrative instructions..."
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-ink-100">
                <Link href="/leaving-students">
                  <Button type="button" variant="outline" className="px-5">
                    Cancel
                  </Button>
                </Link>
                <SubmitExitButton />
              </div>
            </form>
          </Card>
        </div>

        {/* Right Enterprise Information Sidebar */}
        <div className="space-y-5 lg:col-span-1">
          <Card className="p-6 bg-ink-900 text-white border-none shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-10 text-7xl font-bold">
              🎓
            </div>
            <h3 className="font-display text-base font-bold text-gold-400 flex items-center gap-2">
              <span>📋</span> Clearance Process
            </h3>
            <ul className="mt-4 space-y-3 text-xs text-slate-300 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-gold-400 font-bold text-[11px]">1</span>
                <span>Initiating exit creates an active clearance tracking workflow across Accounts, Library, & Transport.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-gold-400 font-bold text-[11px]">2</span>
                <span>Student status remains Active until final TC generation and official sign-off.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-gold-400 font-bold text-[11px]">3</span>
                <span>Generated Transfer Certificates receive a tamper-proof session tracking number.</span>
              </li>
            </ul>
          </Card>

          <Card className="p-5 border border-ink-100 bg-white shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-700 flex items-center gap-1.5">
              <span>💡</span> Administrative Tip
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              If the student has outstanding library books or fee dues, clearance warnings will be presented during the final approval phase.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
