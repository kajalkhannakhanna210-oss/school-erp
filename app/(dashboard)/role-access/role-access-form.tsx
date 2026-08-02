"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/toaster";
import type { UserRole } from "@/lib/types";
import { navItems } from "../nav-config";
import { updateRolePageAccess } from "./actions";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "staff", label: "Staff" },
  { value: "student", label: "Student" },
];

export function RoleAccessForm({ initialAccess }: { initialAccess: { role: UserRole; page_key: string }[] }) {
  const { push } = useToast();
  const [role, setRole] = useState<UserRole>("staff");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const availablePages = navItems.filter((item) => item.roles.includes(role));

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

  function save() {
    startTransition(async () => {
      const { error } = await updateRolePageAccess(role, [...selected]);
      if (error) return push(error, "error");
      push(`${ROLES.find((item) => item.value === role)?.label} menu access updated.`);
    });
  }

  return (
    <Card className="mt-6 max-w-2xl">
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
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {availablePages.map((page) => (
            <label key={page.key} className="flex items-center gap-3 rounded-md border border-ink-100 p-3 text-sm text-slate">
              <input type="checkbox" checked={selected.has(page.key)} onChange={() => togglePage(page.key)} />
              {page.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Button className="mt-6" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save page access"}</Button>
    </Card>
  );
}
