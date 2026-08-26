"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { DatePickerCalendar } from "@/components/date-picker-calendar";
import { useToast } from "@/components/toaster";
import { createEnquiryAction } from "../actions";
import { ENQUIRY_SOURCES, ENQUIRY_TYPES, EnquiryType } from "@/lib/enquiries";

export function EnquiryForm({
  classes,
  sessions,
  staffList,
}: {
  classes: { id: string; name: string }[];
  sessions: { id: string; name: string; is_current?: boolean }[];
  staffList: { id: string; full_name: string; designated_classes?: string[]; has_all_scope?: boolean }[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const defaultSessionId = sessions.find((s) => s.is_current)?.id ?? sessions[0]?.id ?? "";

  const [studentName, setStudentName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [classId, setClassId] = useState("");
  const [parentName, setParentName] = useState("");
  const [mobile, setMobile] = useState("");
  const [alternateMobile, setAlternateMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [sessionId, setSessionId] = useState(defaultSessionId);
  const [enquiryType, setEnquiryType] = useState<EnquiryType>("Offline");
  const [source, setSource] = useState("Walk-in");
  const [remarks, setRemarks] = useState("");
  const [assignedStaffId, setAssignedStaffId] = useState("");
  const eligibleStaff = staffList.filter(
    (staff) => !classId || staff.has_all_scope || staff.designated_classes?.includes(classId)
  );

  useEffect(() => {
    if (assignedStaffId && !eligibleStaff.some((staff) => staff.id === assignedStaffId)) {
      setAssignedStaffId("");
    }
  }, [assignedStaffId, eligibleStaff]);

  const validateStep = (currentStep: 1 | 2 | 3) => {
    if (currentStep === 1) {
      if (!studentName.trim()) {
        push("Student name is required", "error");
        return false;
      }
      if (!dob) {
        push("Date of Birth is required", "error");
        return false;
      }
      if (!classId) {
        push("Class Interested is required", "error");
        return false;
      }
    }
    if (currentStep === 2) {
      if (!parentName.trim()) {
        push("Parent/guardian name is required", "error");
        return false;
      }
      if (!/^\d{10}$/.test(mobile.replace(/\s|-/g, ""))) {
        push("Enter a valid 10-digit mobile number", "error");
        return false;
      }
      if (alternateMobile && !/^\d{10}$/.test(alternateMobile.replace(/\s|-/g, ""))) {
        push("Enter a valid 10-digit alternate mobile number", "error");
        return false;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        push("Enter a valid email address", "error");
        return false;
      }
    }
    return true;
  };

  const goToStep = (nextStep: 1 | 2 | 3) => {
    if (nextStep > step) {
      for (let currentStep = step; currentStep < nextStep; currentStep++) {
        if (!validateStep(currentStep as 1 | 2 | 3)) return;
      }
    }
    setStep(nextStep);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Saving is only valid from the final Assignment step. This guard keeps a
    // submit event from any earlier tab from creating an enquiry.
    if (step !== 3) return;

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    startTransition(async () => {
      const res = await createEnquiryAction({
        student_name: studentName,
        dob: dob || null,
        gender: gender || null,
        class_id: classId || null,
        parent_name: parentName,
        mobile,
        alternate_mobile: alternateMobile || null,
        email: email || null,
        address: address || null,
        session_id: sessionId || null,
        enquiry_type: enquiryType,
        source,
        remarks: remarks || null,
        assigned_staff_id: assignedStaffId || null,
      });

      if (res.error) {
        push(res.error, "error");
      } else {
        push("Admission enquiry registered successfully");
        router.push("/enquiries");
      }
    });
  };

  return (
    <Card className="relative border-ink-100 p-0 shadow-[0_8px_28px_rgba(30,42,74,0.07)]">
      <div className="border-b border-ink-100 bg-ink-50/60 px-3 py-2.5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-700">New admission lead</p>
            <p className="mt-0.5 text-xs text-slate/60">Add the essentials and route the next step.</p>
          </div>
          <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 sm:inline-flex">Draft · Unsaved</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg border border-ink-100 bg-white p-1">
          {["Student", "Contact", "Assignment"].map((label, index) => {
            const tabStep = (index + 1) as 1 | 2 | 3;
            const active = step === tabStep;
            const complete = step > tabStep;
            return (
              <button
                type="button"
                key={label}
                aria-current={active ? "step" : undefined}
                onClick={() => goToStep(tabStep)}
                className={`flex min-h-8 items-center justify-center gap-1 rounded-md px-1.5 text-[11px] font-semibold transition sm:gap-2 sm:px-3 sm:text-xs ${active ? "bg-ink-900 text-white shadow-sm" : "text-slate/55 hover:bg-ink-50 hover:text-ink-800"}`}
              >
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] ${active ? "bg-gold-400 text-ink-900" : complete ? "bg-emerald-100 text-emerald-700" : "bg-ink-50 text-slate/45"}`}>{complete ? "✓" : index + 1}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <form
        onSubmit={(event) => {
          // Never complete the enquiry from the first or second tab, even if
          // the form is submitted by the browser or an accidental submit-type
          // button. Those tabs only advance the wizard.
          if (step < 3) {
            event.preventDefault();
            goToStep((step + 1) as 1 | 2 | 3);
            return;
          }
          handleSubmit(event);
        }}
        className="space-y-2 p-3 text-sm sm:p-4"
      >
        {/* Section 1: Student Information */}
        {step === 1 && (
        <div className="rounded-xl border border-ink-100 bg-white p-3 sm:p-4">
          <h3 className="font-display text-base font-bold text-ink-900">
            Student Information
          </h3>
          <p className="mt-1 text-xs text-slate/55">Who is the enquiry for?</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                Student Full Name *
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full rounded-lg border border-ink-100 p-2.5 text-sm"
              />
            </div>

            <div>
              <DatePickerCalendar label="Date of Birth" required value={dob} onChange={setDob} />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-lg border border-ink-100 bg-white p-2.5 text-sm"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                Class Interested *
              </label>
              <select
                value={classId}
                required
                onChange={(e) => setClassId(e.target.value)}
                className="w-full rounded-lg border border-ink-100 bg-white p-2.5 text-sm"
              >
                <option value="">Select Class...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                Academic Session
              </label>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full rounded-lg border border-ink-100 bg-white p-2.5 text-sm"
              >
                <option value="">Select Session...</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.is_current ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        )}

        {/* Section 2: Parent / Contact Details */}
        {step === 2 && (
        <div className="rounded-xl border border-ink-100 bg-white p-3 sm:p-4">
          <h3 className="font-display text-base font-bold text-ink-900">
            Parent / Guardian Details
          </h3>
          <p className="mt-1 text-xs text-slate/55">How can the admissions team reach them?</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                Parent / Guardian Name *
              </label>
              <input
                type="text"
                required
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="e.g. Sunita Sharma"
                className="w-full rounded-lg border border-ink-100 p-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                className="w-full rounded-lg border border-ink-100 p-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                Alternate Mobile
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                value={alternateMobile}
                onChange={(e) => setAlternateMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="Secondary contact"
                className="w-full rounded-lg border border-ink-100 p-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                Email Address
              </label>
              <input
                type="email"
                maxLength={160}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@example.com"
                className="w-full rounded-lg border border-ink-100 p-2.5 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                Residential Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House no., locality, city..."
                className="w-full rounded-lg border border-ink-100 p-2.5 text-sm"
              />
            </div>
          </div>
        </div>

        )}

        {/* Section 3: Enquiry Source & Assignment */}
        {step === 3 && (
        <div className="rounded-xl border border-ink-100 bg-white p-3 sm:p-4">
          <h3 className="font-display text-base font-bold text-ink-900">
            Enquiry Channel & Assignment
          </h3>
          <p className="mt-1 text-xs text-slate/55">Add context and decide who owns the next step.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                Enquiry Mode *
              </label>
              <select
                value={enquiryType}
                onChange={(e) => setEnquiryType(e.target.value as EnquiryType)}
                className="w-full rounded-lg border border-ink-100 bg-white p-2.5 text-sm"
              >
                {ENQUIRY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                Enquiry Source *
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-lg border border-ink-100 bg-white p-2.5 text-sm"
              >
                {ENQUIRY_SOURCES.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                Assign to Staff Member
              </label>
              <select
                value={assignedStaffId}
                onChange={(e) => setAssignedStaffId(e.target.value)}
                className="w-full rounded-lg border border-ink-100 bg-white p-2.5 text-sm"
              >
                <option value="">Select staff member...</option>
                {eligibleStaff.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                Initial Remarks / Requirements
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any special requests, bus facility requirements, previous school background..."
                className="w-full rounded-lg border border-ink-100 p-2.5 text-sm"
              />
            </div>
          </div>
        </div>

        )}

        <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate/50">Your enquiry will be saved as a new lead.</p>
          <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => (step === 1 ? router.push("/enquiries") : setStep((step - 1) as 1 | 2 | 3))}
            disabled={pending}
          >
            {step === 1 ? "Cancel" : "← Back"}
          </Button>
          {step < 3 ? (
            <Button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goToStep((step + 1) as 1 | 2 | 3);
              }}
            >
              Continue <span className="ml-1">→</span>
            </Button>
          ) : (
            <Button type="submit" disabled={pending} className="bg-ink-700 px-6 text-white hover:bg-ink-600">
              {pending ? "Saving..." : "Save Enquiry"}
            </Button>
          )}
          </div>
        </div>
      </form>
    </Card>
  );
}
