"use client";

import { useMemo, useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { useToast } from "@/components/toaster";
import type { MasterOrganization, MasterSchool } from "@/lib/security/master-data-context";

type UserType = "staff" | "student";
type UserResult = { id: string; name: string; identifier: string; role: UserType; detail: string; schoolName: string };

export function LoginAsClient({ organizations, schools, isSuperAdmin }: { organizations: MasterOrganization[]; schools: MasterSchool[]; isSuperAdmin: boolean }) {
  const { push } = useToast();
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? (schools[0]?.organization_id ?? ""));
  const [schoolId, setSchoolId] = useState("");
  const [type, setType] = useState<UserType>("staff");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [pending, setPending] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<UserResult | null>(null);
  const visibleSchools = useMemo(() => schools.filter((school) => !organizationId || school.organization_id === organizationId), [schools, organizationId]);

  function changeOrganization(value: string) { setOrganizationId(value); setSchoolId(""); setResults([]); }
  async function search() {
    if (!schoolId) { push("Select a school first.", "error"); return; }
    setPending(true);
    const response = await fetch(`/api/admin/login-as?type=${type}&schoolId=${encodeURIComponent(schoolId)}&q=${encodeURIComponent(query)}`);
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) { push(body.error ?? "Could not search users.", "error"); return; }
    setResults(body.users ?? []);
  }
  async function startLogin() {
    if (!confirmTarget) return;
    setPending(true);
    const response = await fetch("/api/admin/login-as", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetId: confirmTarget.id, targetRole: confirmTarget.role, schoolId }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { push(body.error ?? "Could not start access.", "error"); setPending(false); return; }
    window.location.href = "/dashboard";
  }
  return <div className="mx-auto max-w-6xl space-y-5">
    <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-700">Secure support access</p><h1 className="mt-1 font-display text-2xl font-bold text-ink-700 sm:text-3xl">Login As User</h1><p className="mt-1 text-sm text-slate/65">Temporarily access a faculty or student account for support and troubleshooting.</p></div>
    <Card className="space-y-6">
      <section><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate/55">Step 1 · Select school context</p><div className="mt-3 grid gap-4 sm:grid-cols-2">{isSuperAdmin && <div><Label htmlFor="login-as-org">Organisation</Label><select id="login-as-org" value={organizationId} onChange={(event) => changeOrganization(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm"><option value="">Select organisation</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.code} — {org.name}</option>)}</select></div>}<div className={!isSuperAdmin ? "sm:col-span-2" : ""}><Label htmlFor="login-as-school">School</Label><select id="login-as-school" value={schoolId} onChange={(event) => { setSchoolId(event.target.value); setResults([]); }} className="mt-1.5 h-11 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm"><option value="">Select school</option>{visibleSchools.map((school) => <option key={school.id} value={school.id}>{school.code} — {school.name}</option>)}</select></div></div></section>
      <section><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate/55">Step 2 · Select user type</p><div className="mt-3 flex gap-2"><Button type="button" variant={type === "staff" ? "primary" : "outline"} onClick={() => { setType("staff"); setResults([]); }}>Faculty</Button><Button type="button" variant={type === "student" ? "primary" : "outline"} onClick={() => { setType("student"); setResults([]); }}>Student</Button></div></section>
      <section><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate/55">Step 3 · Find user</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") search(); }} placeholder={type === "staff" ? "Search by name, employee code, email, mobile..." : "Search by name, admission number, class, section..."} className="sm:flex-1" /><Button type="button" disabled={pending || !schoolId} onClick={search}>Search</Button></div></section>
    </Card>
    <Card><div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold text-ink-700">{type === "staff" ? "Faculty" : "Students"} results</h2><span className="text-sm text-slate/60">{results.length} results</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{results.map((user) => <article key={user.id} className="rounded-xl border border-ink-100 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-ink-700">{user.name}</h3><p className="mt-1 font-mono text-xs text-slate/60">{user.identifier}</p></div><span className="rounded-full bg-ink-50 px-2.5 py-1 text-xs font-semibold text-ink-700">{user.role === "staff" ? "Faculty" : "Student"}</span></div><p className="mt-3 text-sm text-slate/70">{user.detail}</p><Button className="mt-4 w-full" onClick={() => setConfirmTarget(user)}>Login As {user.role === "staff" ? "Faculty" : "Student"}</Button></article>)}{!results.length && <p className="py-8 text-center text-sm text-slate/55 md:col-span-2">Select a school and search to find users.</p>}</div></Card>
    {confirmTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">Confirm secure access</p><h2 className="mt-2 font-display text-xl font-bold text-ink-700">Login as this user?</h2><p className="mt-3 font-semibold text-ink-700">{confirmTarget.name}</p><p className="text-sm text-slate/65">{confirmTarget.identifier} · {confirmTarget.role === "staff" ? "Faculty" : "Student"}</p><p className="mt-4 text-sm leading-6 text-slate/70">You will temporarily view the ERP using this user’s permissions. No password is requested or changed.</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmTarget(null)}>Cancel</Button><Button disabled={pending} onClick={startLogin}>Login As</Button></div></div></div>}
  </div>;
}
