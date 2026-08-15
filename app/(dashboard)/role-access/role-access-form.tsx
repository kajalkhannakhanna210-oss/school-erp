"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/toaster";
import type { UserRole } from "@/lib/types";
import { navItems, navSections } from "../nav-config";
import { updateRolePageAccess } from "./actions";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "staff", label: "Staff" },
  { value: "student", label: "Student" },
];

export function RoleAccessForm({ initialAccess }: { initialAccess: { role: UserRole; page_key: string }[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [role, setRole] = useState<UserRole>("staff");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSelected(new Set(initialAccess.filter((access) => access.role === role).map((access) => access.page_key)));
  }, [initialAccess, role]);

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

  // Build sections with pages from navSections
  const sections = navSections.map((s) => ({ section: s, pages: s.keys.map((k) => navItems.find((n) => n.key === k)).filter(Boolean) as typeof navItems }));
  const used = new Set(sections.flatMap((s) => s.section.keys));
  const others = navItems.filter((n) => !used.has(n.key));

  return (
    <Card className="mt-6 max-w-4xl">
      <label className="text-sm font-medium text-ink-700" htmlFor="role">Role</label>
      <select
        id="role"
        className="mt-2 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
        value={role}
        onChange={(event) => setRole(event.target.value as UserRole)}
      >
        {ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-ink-700">Visible sidebar pages</legend>

        <div className="mt-3 space-y-4">
          {sections.map(({ section, pages }) => (
            <div key={section.key} className="rounded-md border border-ink-100 p-3">
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

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {pages.map((page) => (
                  <label key={page.key} className="flex items-center gap-3 rounded-md border border-ink-50 p-2 text-sm">
                    <input type="checkbox" checked={selected.has(page.key)} onChange={() => togglePage(page.key)} />
                    <div className="flex-1">
                      <div className="font-medium text-ink-700">{page.label}</div>
                      <div className="text-xs text-slate/60">{page.href}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {others.length > 0 && (
            <div className="rounded-md border border-ink-100 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-ink-700">Other</div>
                <div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={others.every((p) => selected.has(p.key))} onChange={() => toggleSection(others.map((p) => p.key))} />
                    <span className="text-sm">All</span>
                  </label>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {others.map((page) => (
                  <label key={page.key} className="flex items-center gap-3 rounded-md border border-ink-50 p-2 text-sm">
                    <input type="checkbox" checked={selected.has(page.key)} onChange={() => togglePage(page.key)} />
                    <div className="flex-1">
                      <div className="font-medium text-ink-700">{page.label}</div>
                      <div className="text-xs text-slate/60">{page.href}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

      </fieldset>

      <Button className="mt-6" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save page access"}</Button>
    </Card>
  );
}
