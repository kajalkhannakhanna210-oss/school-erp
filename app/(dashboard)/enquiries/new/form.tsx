"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
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
  staffList: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentName.trim()) {
      push("Student name is required", "error");
      return;
    }
    if (!parentName.trim()) {
      push("Parent/guardian name is required", "error");
      return;
    }
    if (!mobile.trim()) {
      push("Mobile number is required", "error");
      return;
    }

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
    <Card className="border-ink-100 p-5 shadow-sm sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-6 text-sm">
        {/* Section 1: Student Information */}
        <div>
          <h3 className="font-display text-base font-bold text-ink-700 border-b border-ink-100 pb-2">
            Student Information
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-lg border border-ink-100 p-2.5 text-sm"
              />
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
                Class Interested
              </label>
              <select
                value={classId}
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

        {/* Section 2: Parent / Contact Details */}
        <div>
          <h3 className="font-display text-base font-bold text-ink-700 border-b border-ink-100 pb-2">
            Parent / Guardian Details
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
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
                value={alternateMobile}
                onChange={(e) => setAlternateMobile(e.target.value)}
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

        {/* Section 3: Enquiry Source & Assignment */}
        <div>
          <h3 className="font-display text-base font-bold text-ink-700 border-b border-ink-100 pb-2">
            Enquiry Channel & Assignment
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                <option value="">Unassigned (New)</option>
                {staffList.map((st) => (
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
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any special requests, bus facility requirements, previous school background..."
                className="w-full rounded-lg border border-ink-100 p-2.5 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-ink-100 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/enquiries")}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending} className="bg-ink-700 px-6 text-white hover:bg-ink-600">
            {pending ? "Saving..." : "Save Enquiry"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
