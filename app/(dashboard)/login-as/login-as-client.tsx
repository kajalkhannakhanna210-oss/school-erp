"use client";

import { useMemo, useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { useToast } from "@/components/toaster";
import type { MasterOrganization, MasterSchool } from "@/lib/security/master-data-context";

type UserType = "staff" | "student";
type UserResult = { id: string; name: string; identifier: string; role: UserType; detail: string; schoolName: string };
const selectClass = "mt-2 h-12 w-full rounded-xl border-2 border-ink-100 bg-white px-3.5 text-sm font-medium text-ink-700 outline-none transition focus:border-ink-700 focus:ring-4 focus:ring-ink-100";

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

  return <div className="mx-auto -mx-1 -mt-2 max-w-7xl space-y-6 sm:-mx-2 sm:-mt-3 lg:-mx-3 lg:-mt-4">
    <header className="relative overflow-hidden rounded-2xl bg-ink-700 px-5 py-2.5 text-white shadow-[0_12px_35px_rgba(34,47,87,0.18)] sm:px-8 sm:py-3"><div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border-[24px] border-gold-500/20" /><div className="relative flex items-center justify-between gap-5"><div><div className="mb-1 inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-gold-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Secure support access</div><h1 className="font-display text-xl font-bold sm:text-2xl">Login as a user</h1><p className="mt-0.5 max-w-xl text-xs leading-5 text-white/70">Use a temporary, audited view of a staff or student account to resolve issues quickly.</p></div><div className="hidden rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-right sm:block"><p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Access mode</p><p className="mt-1 text-sm font-semibold">Support view</p></div></div></header>
    <Card className="!p-0 overflow-hidden"><div className="border-b border-ink-100 bg-ink-50/55 px-5 py-4 sm:px-7"><h2 className="font-display text-lg font-bold text-ink-700">Choose a user to access</h2><p className="mt-1 text-sm text-slate/60">Complete the steps below. The user will not be notified or asked for their password.</p></div><div className="grid gap-0 lg:grid-cols-[1fr_1fr_1.2fr]">
      <section className="border-b border-ink-100 p-5 sm:p-7 lg:border-b-0 lg:border-r"><Step n="1" label="Context" title="Select school" /><div className="mt-5 space-y-4">{isSuperAdmin && <div><Label htmlFor="login-as-org">Organisation</Label><select id="login-as-org" value={organizationId} onChange={(event) => changeOrganization(event.target.value)} className={selectClass}><option value="">Select organisation</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.code} - {org.name}</option>)}</select></div>}<div><Label htmlFor="login-as-school">School</Label><select id="login-as-school" value={schoolId} onChange={(event) => { setSchoolId(event.target.value); setResults([]); }} className={selectClass}><option value="">Select school</option>{visibleSchools.map((school) => <option key={school.id} value={school.id}>{school.code} - {school.name}</option>)}</select></div></div></section>
      <section className="border-b border-ink-100 p-5 sm:p-7 lg:border-b-0 lg:border-r"><Step n="2" label="Account type" title="Who are you helping?" /><div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-ink-50 p-1.5"><button type="button" onClick={() => { setType("staff"); setResults([]); }} className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${type === "staff" ? "bg-ink-700 text-white shadow" : "text-slate/65 hover:bg-white"}`}>Faculty</button><button type="button" onClick={() => { setType("student"); setResults([]); }} className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${type === "student" ? "bg-ink-700 text-white shadow" : "text-slate/65 hover:bg-white"}`}>Student</button></div><div className="mt-6 rounded-xl border border-dashed border-ink-200 p-4 text-sm leading-6 text-slate/60">Access is limited to the selected school and recorded in the security log.</div></section>
      <section className="p-5 sm:p-7"><Step n="3" label="Directory" title="Find the account" /><div className="mt-5"><Label htmlFor="login-as-search">Search {type === "staff" ? "faculty" : "students"}</Label><Input id="login-as-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") search(); }} placeholder={type === "staff" ? "Name, employee ID, email or mobile" : "Name, admission number or class"} className="!mt-2 !h-12 !rounded-xl !border-2 !border-ink-100" /></div><Button type="button" disabled={pending || !schoolId} onClick={search} className="mt-4 h-12 w-full rounded-xl">{pending ? "Searching..." : "Search accounts"}</Button></section>
    </div></Card>
    <Card className="!p-0 overflow-hidden"><div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 sm:px-7"><div><h2 className="font-display text-lg font-bold text-ink-700">Search results</h2><p className="mt-1 text-xs text-slate/55">Select an account to start a secure support session.</p></div><span className="rounded-full bg-ink-50 px-3 py-1 text-xs font-bold text-ink-700">{results.length} found</span></div><div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7">{results.map((user) => <article key={user.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-50 font-display font-bold text-gold-700">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div><div className="min-w-0"><h3 className="truncate font-semibold text-ink-700">{user.name}</h3><p className="mt-1 truncate font-mono text-xs text-slate/55">{user.identifier}</p></div><span className="ml-auto rounded-full bg-ink-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-700">{user.role === "staff" ? "Faculty" : "Student"}</span></div><p className="mt-4 min-h-10 text-sm text-slate/65">{user.detail}</p><Button className="mt-4 w-full rounded-xl" onClick={() => setConfirmTarget(user)}>Access account</Button></article>)}{!results.length && <div className="col-span-full grid min-h-40 place-items-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/35 px-5 text-center"><div><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-white text-xl shadow-sm">⌕</div><p className="mt-3 text-sm font-semibold text-ink-700">No accounts to show yet</p><p className="mt-1 text-xs text-slate/55">Select a school, then search the directory.</p></div></div>}</div></Card>
    {confirmTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/60 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="bg-ink-700 px-6 py-5 text-white"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-300">Confirmation required</p><h2 className="mt-1 font-display text-xl font-bold">Start support session?</h2></div><div className="p-6"><div className="flex items-center gap-3 rounded-xl bg-ink-50 p-4"><div className="grid h-10 w-10 place-items-center rounded-lg bg-gold-100 font-bold text-gold-700">{confirmTarget.name[0]}</div><div><p className="font-semibold text-ink-700">{confirmTarget.name}</p><p className="text-xs text-slate/60">{confirmTarget.identifier} · {confirmTarget.role === "staff" ? "Faculty" : "Student"}</p></div></div><p className="mt-4 text-sm leading-6 text-slate/65">You will temporarily use this account's permissions. This action is audited and no password is changed.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={() => setConfirmTarget(null)}>Cancel</Button><Button disabled={pending} onClick={startLogin}>{pending ? "Starting..." : "Start support session"}</Button></div></div></div></div>}
  </div>;
}

function Step({ n, label, title }: { n: string; label: string; title: string }) { return <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-ink-700 text-sm font-bold text-white">{n}</span><div><p className="text-xs font-bold uppercase tracking-widest text-slate/50">{label}</p><h3 className="font-semibold text-ink-700">{title}</h3></div></div>; }
