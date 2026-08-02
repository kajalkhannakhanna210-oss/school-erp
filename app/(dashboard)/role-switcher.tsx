"use client";
import { useTransition } from "react";
import { switchActiveRole } from "./role-actions";

export function RoleSwitcher({ role, roles }: { role: string; roles: string[] }) {
  const [pending, startTransition] = useTransition();
  if (roles.length < 2) return <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gold-600">{role.replace("_", " ")}</span>;
  return <select aria-label="Active role" disabled={pending} value={role} className="rounded-full bg-gold-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gold-600" onChange={(e) => startTransition(async () => { await switchActiveRole(e.target.value); window.location.assign("/dashboard"); })}>
    {roles.map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}
  </select>;
}
