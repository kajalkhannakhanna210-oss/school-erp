"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { updateEnquiryAction } from "../../actions";
import { EnquiryRow, ENQUIRY_SOURCES, ENQUIRY_TYPES, EnquiryType } from "@/lib/enquiries";

export function EditEnquiryForm({
  enquiry,
  classes,
  sessions,
}: {
  enquiry: EnquiryRow;
  classes: { id: string; name: string }[];
  sessions: { id: string; name: string; is_current?: boolean }[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  const [studentName, setStudentName] = useState(enquiry.student_name);
  const [dob, setDob] = useState(enquiry.dob ?? "");
  const [gender, setGender] = useState(enquiry.gender ?? "");
  const [classId, setClassId] = useState(enquiry.class_id ?? "");
  const [parentName, setParentName] = useState(enquiry.parent_name);
  const [mobile, setMobile] = useState(enquiry.mobile);
  const [alternateMobile, setAlternateMobile] = useState(enquiry.alternate_mobile ?? "");
  const [email, setEmail] = useState(enquiry.email ?? "");
  const [address, setAddress] = useState(enquiry.address ?? "");
  const [sessionId, setSessionId] = useState(enquiry.session_id ?? "");
  const [enquiryType, setEnquiryType] = useState<EnquiryType>(enquiry.enquiry_type);
  const [source, setSource] = useState(enquiry.source);
  const [remarks, setRemarks] = useState(enquiry.remarks ?? "");

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
      const res = await updateEnquiryAction(enquiry.id, {
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
      });

      if (res.error) {
        push(res.error, "error");
      } else {
        push("Enquiry details updated successfully");
        router.push(`/enquiries/${enquiry.id}`);
      }
    });
  };

  return (
    <Card className="border-ink-100 p-5 shadow-sm sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-6 text-sm">
        {/* Section 1: Student Info */}
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

        {/* Section 2: Parent / Contact Info */}
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
                className="w-full rounded-lg border border-ink-100 p-2.5 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Channel Info */}
        <div>
          <h3 className="font-display text-base font-bold text-ink-700 border-b border-ink-100 pb-2">
            Enquiry Channel & Remarks
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                Remarks
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-lg border border-ink-100 p-2.5 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-ink-100 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(`/enquiries/${enquiry.id}`)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending} className="bg-ink-700 px-6 text-white hover:bg-ink-600">
            {pending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
