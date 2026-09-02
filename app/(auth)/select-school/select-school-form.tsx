"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

type Organization = { id: string; name: string; code: string };
type School = { id: string; name: string; code: string; organization_id: string };

export function SelectSchoolForm({ organizations, schools }: { organizations: Organization[]; schools: School[] }) {
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const visibleSchools = schools.filter((school) => school.organization_id === organizationId);
  const [schoolId, setSchoolId] = useState(visibleSchools[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => setSchoolId(schools.find((school) => school.organization_id === organizationId)?.id ?? ""), [organizationId, schools]);
  async function submit() {
    setPending(true); setError(null);
    const response = await fetch("/api/auth/select-context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId, schoolId }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Unable to set school context."); setPending(false); return; }
    window.location.assign("/dashboard");
  }
  return <div className="mt-6 space-y-4"><label className="block text-sm font-semibold text-slate-700">Organization<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3"><option value="">Select organization</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.code} — {organization.name}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700">School<select value={schoolId} onChange={(event) => setSchoolId(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3"><option value="">Select school</option>{visibleSchools.map((school) => <option key={school.id} value={school.id}>{school.code} — {school.name}</option>)}</select></label>{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<Button type="button" className="min-h-11 w-full" onClick={submit} disabled={pending || !organizationId || !schoolId}>{pending ? "Continuing…" : "Continue to Dashboard"}</Button></div>;
}
