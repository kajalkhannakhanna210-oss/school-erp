"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/toaster";
import type { UserRole } from "@/lib/types";
import { navItems, navSections } from "../nav-config";
import { assignStaffRole, updateRolePageAccess, updateStaffSchoolScope } from "./actions";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "staff", label: "Staff" },
  { value: "student", label: "Student" },
];

type Organization = { id: string; name: string; code: string };
type School = { id: string; name: string; code: string; organization_id: string };
type StaffMember = { id: string; employee_id: string; organization_id: string | null; role_id: string | null; full_name: string };
type StaffRole = { id: string; role_code: string; role_name: string; role_scope: string };
type SchoolScope = { staff_id: string; scope_type: string; resource_id: string | null };

export function RoleAccessForm({
  initialAccess,
  organizations,
  schools,
  staff,
  initialSchoolScopes,
  roles,
}: {
  initialAccess: { role: UserRole; page_key: string }[];
  organizations: Organization[];
  schools: School[];
  staff: StaffMember[];
  initialSchoolScopes: SchoolScope[];
  roles: StaffRole[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [role, setRole] = useState<UserRole>("staff");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [scopeOrganizationId, setScopeOrganizationId] = useState(organizations[0]?.id ?? "");
  const scopedStaff = staff.filter((member) => member.organization_id === scopeOrganizationId);
  const [scopeStaffId, setScopeStaffId] = useState(scopedStaff[0]?.id ?? "");
  const [assignedRoleId, setAssignedRoleId] = useState("");
  const [scopeSchools, setScopeSchools] = useState<Set<string>>(new Set());
  const [allAuthorizedSchools, setAllAuthorizedSchools] = useState(false);

  useEffect(() => {
    setSelected(new Set(initialAccess.filter((access) => access.role === role).map((access) => access.page_key)));
  }, [initialAccess, role]);

  useEffect(() => {
    const nextStaff = staff.find((member) => member.organization_id === scopeOrganizationId);
    setScopeStaffId(nextStaff?.id ?? "");
  }, [scopeOrganizationId, staff]);

  useEffect(() => {
    const rows = initialSchoolScopes.filter((scope) => scope.staff_id === scopeStaffId);
    setAllAuthorizedSchools(rows.some((scope) => scope.scope_type === "ALL"));
    setScopeSchools(new Set(rows.filter((scope) => scope.scope_type === "SCHOOL" && scope.resource_id).map((scope) => scope.resource_id as string)));
  }, [initialSchoolScopes, scopeStaffId]);

  useEffect(() => {
    setAssignedRoleId(staff.find((member) => member.id === scopeStaffId)?.role_id ?? "");
  }, [staff, scopeStaffId]);

  function togglePage(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleSection(keys: string[]) {
    setSelected((current) => {
      const next = new Set(current);
      const allSelected = keys.every((k) => next.has(k));
      if (allSelected) {
        keys.forEach((k) => next.delete(k));
      } else {
        keys.forEach((k) => next.add(k));
      }
      return next;
    });
  }

  async function save() {
    startTransition(async () => {
      const { error } = await updateRolePageAccess(role, [...selected]);
      if (error) return push(error, "error");
      push(`${ROLES.find((item) => item.value === role)?.label} menu access updated.`);
      router.refresh();
    });
  }

  function saveScope() {
    startTransition(async () => {
      const result = await updateStaffSchoolScope(scopeStaffId, scopeOrganizationId, [...scopeSchools], allAuthorizedSchools);
      if (result.error) return push(result.error, "error");
      push("School access scope updated.");
      router.refresh();
    });
  }

  function saveStaffRole() {
    startTransition(async () => {
      const result = await assignStaffRole(scopeStaffId, assignedRoleId);
      if (result.error) return push(result.error, "error");
      push("Staff role and login scope updated.");
      router.refresh();
    });
  }

  // Build sections with pages from navSections
  const sections = navSections.map((s) => ({ section: s, pages: s.keys.map((k) => navItems.find((n) => n.key === k)).filter(Boolean) as typeof navItems }));
  const used = new Set(sections.flatMap((s) => s.section.keys));
  const others = navItems.filter((n) => !used.has(n.key));

  return (
    <Card className="mt-3 max-w-4xl p-2.5 sm:p-3">
      <label className="text-sm font-medium text-ink-700" htmlFor="role">Role</label>
      <select
        id="role"
        className="mt-2 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
        value={role}
        onChange={(event) => setRole(event.target.value as UserRole)}
      >
        {ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>

      <section className="mt-5 rounded-lg border border-ink-100 bg-ink-50/30 p-2.5 sm:p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-ink-700">School Access / Scope</h2>
            <p className="mt-1 text-xs text-slate/60">Choose which schools this staff member can access. This is separate from page permissions.</p>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate/60">Data scope</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select value={scopeOrganizationId} onChange={(event) => setScopeOrganizationId(event.target.value)} className="min-h-10 rounded-md border border-ink-100 bg-white px-3 text-sm text-ink-700" aria-label="Scope organization">
            <option value="">Select organization</option>
            {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.code} — {organization.name}</option>)}
          </select>
          <select value={scopeStaffId} onChange={(event) => setScopeStaffId(event.target.value)} className="min-h-10 rounded-md border border-ink-100 bg-white px-3 text-sm text-ink-700" aria-label="Scope staff member">
            <option value="">Select staff member</option>
            {scopedStaff.map((member) => <option key={member.id} value={member.id}>{member.employee_id} — {member.full_name}</option>)}
          </select>
        </div>
        {scopeStaffId && <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-64 flex-1 text-xs font-semibold uppercase tracking-wide text-slate/60">Login role
            <select value={assignedRoleId} onChange={(event) => setAssignedRoleId(event.target.value)} className="mt-1 min-h-10 w-full rounded-md border border-ink-100 bg-white px-3 text-sm font-normal normal-case tracking-normal text-ink-700">
              <option value="">Select role</option>
              {roles.map((item) => <option key={item.id} value={item.id}>{item.role_name} ({item.role_scope})</option>)}
            </select>
          </label>
          <Button type="button" onClick={saveStaffRole} disabled={pending || !assignedRoleId}>{pending ? "Saving…" : "Save role"}</Button>
        </div>}
        {scopeStaffId && <div className="mt-3 space-y-1.5">
          <label className="flex min-h-10 items-center gap-3 rounded-md border border-ink-100 bg-white px-3 text-sm font-medium text-ink-700">
            <input type="checkbox" checked={allAuthorizedSchools} onChange={(event) => setAllAuthorizedSchools(event.target.checked)} />
            All Authorized Schools
          </label>
          {!allAuthorizedSchools && schools.filter((school) => school.organization_id === scopeOrganizationId).map((school) => <label key={school.id} className="flex min-h-10 items-center gap-3 rounded-md border border-ink-100 bg-white px-3 text-sm text-ink-700">
            <input type="checkbox" checked={scopeSchools.has(school.id)} onChange={() => setScopeSchools((current) => { const next = new Set(current); next.has(school.id) ? next.delete(school.id) : next.add(school.id); return next; })} />
            <span><b>{school.name}</b><span className="ml-2 text-xs text-slate/60">{school.code}</span></span>
          </label>)}
          <Button type="button" className="mt-2" onClick={saveScope} disabled={pending}>{pending ? "Saving…" : "Save school scope"}</Button>
        </div>}
      </section>

      <fieldset className="mt-3">
        <legend className="text-sm font-medium text-ink-700">Visible sidebar pages</legend>

        <div className="mt-2 space-y-2.5">
          {sections.map(({ section, pages }) => (
            <div key={section.key} className="rounded-lg border border-ink-100 bg-white p-2.5 shadow-sm sm:p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => toggleSection(section.keys)} className="text-sm font-semibold text-ink-700">{section.label}</button>
                  <span className="text-xs text-slate/60">{pages.length} page{pages.length !== 1 ? "s" : ""}</span>
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={section.keys.every((k) => selected.has(k))}
                      onChange={() => toggleSection(section.keys)}
                    />
                    <span className="text-sm">All</span>
                  </label>
                </div>
              </div>

              <div className="mt-2 space-y-1.5">
                {Array.from({ length: Math.ceil(pages.length / 2) }, (_, rowIndex) => pages.slice(rowIndex * 2, rowIndex * 2 + 2)).map((row, rowIndex) => (
                  <div key={`${section.key}-row-${rowIndex}`} className={`grid grid-cols-1 gap-1.5 rounded-md p-1 sm:grid-cols-2 ${rowIndex % 2 === 0 ? "bg-ink-50/65" : "bg-white"}`}>
                    {row.map((page) => (
                      <label key={page.key} className="flex items-center gap-3 rounded-md border border-ink-100 bg-white p-2 text-sm transition-colors hover:bg-gold-50/60">
                        <input type="checkbox" checked={selected.has(page.key)} onChange={() => togglePage(page.key)} />
                        <div className="flex-1"><div className="font-medium text-ink-700">{page.label}</div><div className="text-xs text-slate/60">{page.href}</div></div>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {others.length > 0 && (
            <div className="rounded-lg border border-ink-100 bg-white p-2.5 shadow-sm sm:p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-ink-700">Other</div>
                <div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={others.every((p) => selected.has(p.key))} onChange={() => toggleSection(others.map((p) => p.key))} />
                    <span className="text-sm">All</span>
                  </label>
                </div>
              </div>
              <div className="mt-2 space-y-1.5">
                {Array.from({ length: Math.ceil(others.length / 2) }, (_, rowIndex) => others.slice(rowIndex * 2, rowIndex * 2 + 2)).map((row, rowIndex) => (
                  <div key={`other-row-${rowIndex}`} className={`grid grid-cols-1 gap-1.5 rounded-md p-1 sm:grid-cols-2 ${rowIndex % 2 === 0 ? "bg-ink-50/65" : "bg-white"}`}>
                    {row.map((page) => (
                      <label key={page.key} className="flex items-center gap-3 rounded-md border border-ink-100 bg-white p-2 text-sm transition-colors hover:bg-gold-50/60">
                        <input type="checkbox" checked={selected.has(page.key)} onChange={() => togglePage(page.key)} />
                        <div className="flex-1"><div className="font-medium text-ink-700">{page.label}</div><div className="text-xs text-slate/60">{page.href}</div></div>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </fieldset>

      <Button className="mt-4" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save page access"}</Button>
    </Card>
  );
}
