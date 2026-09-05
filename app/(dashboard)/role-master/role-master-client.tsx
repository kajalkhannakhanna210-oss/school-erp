"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { saveRole } from "./actions";

type Role = { id: string; role_code: string; role_name: string; role_scope: "ORGANISATION" | "SCHOOL"; description: string | null; is_active: boolean };
type Permission = { key: string; label: string };

export function RoleMasterClient({ roles, permissions, mappings }: { roles: Role[]; permissions: Permission[]; mappings: { role_id: string; permission_key: string }[] }) {
  const { push } = useToast();
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? "");
  const [editing, setEditing] = useState<Role | null>(roles[0] ?? null);
  const [permissionKeys, setPermissionKeys] = useState<string[]>(mappings.filter((row) => row.role_id === roles[0]?.id).map((row) => row.permission_key));
  const [pending, startTransition] = useTransition();
  const groups = useMemo(() => {
    const map = new Map<string, Permission[]>();
    permissions.forEach((permission) => { const group = permission.key.split(".")[0]; map.set(group, [...(map.get(group) ?? []), permission]); });
    return [...map.entries()];
  }, [permissions]);

  function selectRole(role: Role) { setSelectedRoleId(role.id); setEditing(role); setPermissionKeys(mappings.filter((row) => row.role_id === role.id).map((row) => row.permission_key)); }
  function newRole() { setSelectedRoleId(""); setEditing({ id: "", role_code: "", role_name: "", role_scope: "SCHOOL", description: "", is_active: true }); setPermissionKeys([]); }
  function toggle(key: string) { setPermissionKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]); }
  function save() { if (!editing) return; startTransition(async () => { const result = await saveRole({ id: editing.id || undefined, roleName: editing.role_name, roleCode: editing.role_code, roleScope: editing.role_scope, description: editing.description ?? "", isActive: editing.is_active, permissionKeys }); if (result.error) return push(result.error, "error"); push("Role and permissions saved."); }); }

  return <div className="mx-auto max-w-7xl space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">Access control</p><h1 className="mt-1 font-display text-2xl font-bold text-ink-700 sm:text-3xl">Role Master</h1><p className="mt-1 text-sm text-slate/60">Define staff roles and their permissions without changing application code.</p></div>
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="h-fit !p-3"><div className="flex items-center justify-between px-2 py-2"><h2 className="font-display font-bold text-ink-700">Roles</h2><Button size="sm" onClick={newRole}>+ New role</Button></div><div className="mt-2 space-y-1">{roles.map((role) => <button key={role.id} type="button" onClick={() => selectRole(role)} className={`w-full rounded-xl px-3 py-3 text-left transition ${selectedRoleId === role.id ? "bg-ink-700 text-white" : "hover:bg-ink-50"}`}><span className="block font-semibold">{role.role_name}</span><span className={`mt-1 block text-[11px] uppercase tracking-wide ${selectedRoleId === role.id ? "text-white/65" : "text-slate/50"}`}>{role.role_scope} · {role.is_active ? "Active" : "Inactive"}</span></button>)}{!roles.length && <p className="p-3 text-sm text-slate/55">No roles created yet.</p>}</div></Card>
      {editing && <Card><div className="flex flex-col justify-between gap-3 border-b border-ink-100 pb-5 sm:flex-row sm:items-center"><div><h2 className="font-display text-xl font-bold text-ink-700">{editing.id ? "Edit role" : "Create role"}</h2><p className="mt-1 text-sm text-slate/60">Role details and permission assignment</p></div><label className="flex items-center gap-2 text-sm font-semibold text-ink-700"><input type="checkbox" checked={editing.is_active} onChange={(event) => setEditing({ ...editing, is_active: event.target.checked })} /> Active</label></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="role-name">Role name</Label><Input id="role-name" value={editing.role_name} onChange={(event) => setEditing({ ...editing, role_name: event.target.value })} placeholder="Admission Officer" /></div><div><Label htmlFor="role-code">Role code</Label><Input id="role-code" value={editing.role_code} onChange={(event) => setEditing({ ...editing, role_code: event.target.value })} placeholder="ADMISSION_OFFICER" /></div><div><Label htmlFor="role-scope">Scope</Label><select id="role-scope" value={editing.role_scope} onChange={(event) => setEditing({ ...editing, role_scope: event.target.value as Role["role_scope"] })} className="mt-1.5 h-11 w-full rounded-lg border-2 border-ink-100 bg-white px-3 text-sm"><option value="SCHOOL">School</option><option value="ORGANISATION">Organisation</option></select></div><div><Label htmlFor="role-description">Description</Label><Input id="role-description" value={editing.description ?? ""} onChange={(event) => setEditing({ ...editing, description: event.target.value })} placeholder="What this role can do" /></div></div><div className="mt-7"><div className="flex items-center justify-between"><div><h3 className="font-display text-lg font-bold text-ink-700">Permissions</h3><p className="mt-1 text-sm text-slate/60">Choose the permissions granted to this role.</p></div><span className="rounded-full bg-ink-50 px-3 py-1 text-xs font-bold text-ink-700">{permissionKeys.length} selected</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{groups.map(([group, items]) => <div key={group} className="rounded-xl border border-ink-100 bg-ink-50/40 p-3"><div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-bold capitalize text-ink-700">{group}</h4><button type="button" className="text-[11px] font-semibold text-ink-600 underline" onClick={() => { const all = items.every((item) => permissionKeys.includes(item.key)); setPermissionKeys((current) => all ? current.filter((key) => !items.some((item) => item.key === key)) : [...new Set([...current, ...items.map((item) => item.key)])]); }}>{items.every((item) => permissionKeys.includes(item.key)) ? "Clear" : "All"}</button></div>{items.map((permission) => <label key={permission.key} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-white"><input type="checkbox" checked={permissionKeys.includes(permission.key)} onChange={() => toggle(permission.key)} className="mt-0.5" /><span><span className="block font-medium text-ink-700">{permission.label}</span><span className="block text-[10px] text-slate/50">{permission.key}</span></span></label>)}</div>)}</div></div><div className="mt-7 flex justify-end border-t border-ink-100 pt-5"><Button onClick={save} disabled={pending}>{pending ? "Saving..." : "Save role"}</Button></div></Card>}
    </div>
  </div>;
}
