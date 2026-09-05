"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { saveModule, saveOrganisationModules } from "./actions";

type Module = { id: string; module_code: string; module_name: string; description: string | null; display_order: number; is_active: boolean };
type Organisation = { id: string; name: string; code: string };
type Assignment = { organisation_id: string; module_id: string; is_enabled: boolean };
type Page = { module_id: string | null; page_code: string; page_name?: string; route?: string };

const iconTone: Record<string, string> = {
  dashboard: "bg-blue-50 text-blue-600", students: "bg-violet-50 text-violet-600", admissions: "bg-emerald-50 text-emerald-600",
  attendance: "bg-rose-50 text-rose-600", fees: "bg-orange-50 text-orange-600", examinations: "bg-purple-50 text-purple-600",
  library: "bg-cyan-50 text-cyan-600", transport: "bg-amber-50 text-amber-600", hr: "bg-slate-100 text-slate-600", payroll: "bg-slate-100 text-slate-600",
};

export function ModuleMasterClient({ modules, organisations, assignments, pages }: { modules: Module[]; organisations: Organisation[]; assignments: Assignment[]; pages: Page[] }) {
  const { push } = useToast();
  const [editing, setEditing] = useState<Module | null>(null);
  const [organisationId, setOrganisationId] = useState(organisations[0]?.id ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>(assignments.filter((a) => a.organisation_id === organisations[0]?.id && a.is_enabled).map((a) => a.module_id));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [tab, setTab] = useState<"modules" | "pages" | "organisation">("modules");
  const [pending, startTransition] = useTransition();

  const filteredModules = useMemo(() => modules.filter((module) => {
    const matchesStatus = status === "all" || (status === "active" ? module.is_active : !module.is_active);
    const text = `${module.module_name} ${module.module_code}`.toLowerCase();
    return matchesStatus && text.includes(query.toLowerCase());
  }), [modules, query, status]);
  const selected = new Set(selectedIds);
  const selectedPageCount = pages.filter((page) => page.module_id && selected.has(page.module_id)).length;

  function chooseOrganisation(value: string) {
    setOrganisationId(value);
    setSelectedIds(assignments.filter((assignment) => assignment.organisation_id === value && assignment.is_enabled).map((assignment) => assignment.module_id));
  }
  function toggleModule(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }
  function toggleVisibleModules() {
    const ids = filteredModules.map((module) => module.id);
    setSelectedIds((current) => ids.every((id) => current.includes(id)) ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]);
  }
  function saveModuleDetails() {
    if (!editing) return;
    startTransition(async () => {
      const result = await saveModule({ id: editing.id || undefined, moduleCode: editing.module_code, moduleName: editing.module_name, description: editing.description ?? "", displayOrder: editing.display_order, isActive: editing.is_active });
      if (result.error) return push(result.error, "error");
      push("Module saved.");
      setEditing(null);
    });
  }
  function saveOrganisationAccess() {
    startTransition(async () => {
      const result = await saveOrganisationModules(organisationId, selectedIds);
      if (result.error) return push(result.error, "error");
      push("Organisation modules saved.");
    });
  }

  return (
    <div className="-mx-2 -mt-2 min-w-0 sm:-mx-3 sm:-mt-3 lg:-mx-4 lg:-mt-4">
      <header className="border-b border-ink-100 bg-white px-4 pb-0 pt-3 shadow-sm sm:px-6 sm:pt-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-slate/55">⌂ <span className="mx-2">›</span> System Configuration <span className="mx-2">›</span> <span className="text-ink-700">Module Master</span></p>
            <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-700 sm:text-3xl">Module Master</h1>
            <p className="mt-1 text-sm text-slate/65">Create system modules and control which organisations own them.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <SummaryCard value={modules.length} label="Modules" tone="blue" />
            <SummaryCard value={pages.length} label="Pages" tone="green" />
            <SummaryCard value={organisations.length} label="Organisations" tone="violet" />
          </div>
        </div>
        <nav className="mt-6 flex gap-6 overflow-x-auto" aria-label="Module master sections">
          <Tab active={tab === "modules"} onClick={() => setTab("modules")}>Module Master</Tab>
          <Tab active={tab === "pages"} onClick={() => setTab("pages")}>Page List</Tab>
          <Tab active={tab === "organisation"} onClick={() => setTab("organisation")}>Organisation Access</Tab>
        </nav>
      </header>

      <main className="p-3 sm:p-5 lg:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="font-display text-xl font-bold text-ink-700">{tab === "organisation" ? "Organisation Access" : tab === "pages" ? "Page List" : "System Modules"}</h2><p className="mt-1 text-sm text-slate/60">{tab === "organisation" ? "Select which modules are available for the organisation." : tab === "pages" ? "Review pages grouped under each module." : "Manage all available modules in the system."}</p></div>
          {tab !== "organisation" && <Button size="sm" onClick={() => setEditing({ id: "", module_code: "", module_name: "", description: "", display_order: modules.length + 1, is_active: true })}>+ New Module</Button>}
        </div>
        {tab !== "organisation" && <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search modules..." className="!mt-0 h-11" /><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-11 w-32 rounded-lg border-2 border-ink-100 bg-white px-3 text-sm text-ink-700 sm:w-40"><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>}
        {tab === "modules" && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"><Card className="!p-3 sm:!p-4"><div className="mb-3 flex items-center justify-between px-1"><h3 className="font-display font-bold text-ink-700">System Modules</h3><span className="text-xs text-slate/55">{filteredModules.length} shown</span></div><ModuleRows modules={filteredModules} pages={pages} onEdit={setEditing} /></Card><AssignmentPanel organisations={organisations} organisationId={organisationId} modules={filteredModules} pages={pages} selected={selected} selectedPageCount={selectedPageCount} pending={pending} onOrganisationChange={chooseOrganisation} onToggle={toggleModule} onSelectAll={toggleVisibleModules} onSave={saveOrganisationAccess} /></div>}
        {tab === "pages" && <Card className="!p-3 sm:!p-4"><PageRows pages={pages} modules={modules} /></Card>}
        {tab === "organisation" && <AssignmentPanel organisations={organisations} organisationId={organisationId} modules={filteredModules} pages={pages} selected={selected} selectedPageCount={selectedPageCount} pending={pending} onOrganisationChange={chooseOrganisation} onToggle={toggleModule} onSelectAll={toggleVisibleModules} onSave={saveOrganisationAccess} />}
      </main>

      {editing && <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/50 p-4"><Card className="w-full max-w-lg"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold text-ink-700">{editing.id ? "Edit module" : "Create module"}</h2><button type="button" onClick={() => setEditing(null)} className="text-2xl text-slate/50" aria-label="Close">×</button></div><div className="mt-5 space-y-4"><div><Label htmlFor="module-name">Module name</Label><Input id="module-name" value={editing.module_name} onChange={(event) => setEditing({ ...editing, module_name: event.target.value })} placeholder="Payroll" /></div><div><Label htmlFor="module-code">Module code</Label><Input id="module-code" value={editing.module_code} onChange={(event) => setEditing({ ...editing, module_code: event.target.value })} placeholder="payroll" /></div><div><Label htmlFor="module-description">Description</Label><Input id="module-description" value={editing.description ?? ""} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></div><label className="flex items-center gap-2 text-sm font-semibold text-ink-700"><input type="checkbox" checked={editing.is_active} onChange={(event) => setEditing({ ...editing, is_active: event.target.checked })} /> Active module</label></div><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={pending} onClick={saveModuleDetails}>{pending ? "Saving..." : "Save module"}</Button></div></Card></div>}
    </div>
  );
}

function ModuleRows({ modules, pages, onEdit }: { modules: Module[]; pages: Page[]; onEdit: (module: Module) => void }) {
  return <div className="space-y-2">{modules.map((module) => <button type="button" key={module.id} onClick={() => onEdit(module)} className="flex w-full items-center gap-3 rounded-xl border border-ink-100 bg-white px-3 py-3 text-left transition hover:border-ink-300 hover:shadow-sm sm:px-4"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${iconTone[module.module_code] ?? "bg-ink-50 text-ink-700"}`}>▣</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-ink-700">{module.module_name}</span><span className="mt-1 block truncate text-xs text-slate/55">{module.module_code}</span></span><span className="shrink-0 rounded-full bg-ink-50 px-2.5 py-1 text-xs text-slate/70">{pages.filter((page) => page.module_id === module.id).length} pages</span><span className={`hidden rounded-full px-3 py-1 text-[10px] font-bold uppercase sm:inline-flex ${module.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{module.is_active ? "Active" : "Inactive"}</span><span className="text-xl text-slate/45">›</span></button>)}</div>;
}

function PageRows({ pages, modules }: { pages: Page[]; modules: Module[] }) {
  return <div className="space-y-2">{pages.map((page) => <div key={page.page_code} className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white px-3 py-3 sm:px-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-50 text-sm text-ink-700">▤</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink-700">{page.page_name ?? page.page_code}</p><p className="mt-1 truncate text-xs text-slate/55">{modules.find((module) => module.id === page.module_id)?.module_name ?? "System page"} · {page.route ?? page.page_code}</p></div><span className="font-mono text-xs text-slate/50">{page.page_code}</span></div>)}</div>;
}

function AssignmentPanel({ organisations, organisationId, modules, pages, selected, selectedPageCount, pending, onOrganisationChange, onToggle, onSelectAll, onSave }: { organisations: Organisation[]; organisationId: string; modules: Module[]; pages: Page[]; selected: Set<string>; selectedPageCount: number; pending: boolean; onOrganisationChange: (value: string) => void; onToggle: (id: string) => void; onSelectAll: () => void; onSave: () => void }) {
  const allSelected = modules.length > 0 && modules.every((module) => selected.has(module.id));
  return <Card className="!p-3 sm:!p-4"><div className="mb-4"><h3 className="font-display text-lg font-bold text-ink-700">Assign modules to organisation</h3><p className="mt-1 text-xs text-slate/60">Select which modules are available for the organisation.</p></div><Label htmlFor="module-assignment-org">Organisation</Label><select id="module-assignment-org" value={organisationId} onChange={(event) => onOrganisationChange(event.target.value)} className="mt-2 h-11 w-full rounded-lg border-2 border-ink-100 bg-white px-3 text-sm"><option value="">Select organisation</option>{organisations.map((organisation) => <option key={organisation.id} value={organisation.id}>{organisation.code} - {organisation.name}</option>)}</select><div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs leading-5 text-blue-800">Disabling a module automatically blocks all of its child pages for this organisation.</div><div className="mt-4 flex justify-end"><button type="button" onClick={onSelectAll} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">{allSelected ? "Clear All" : "✓ Select All"}</button></div><div className="mt-2 space-y-1.5">{modules.map((module) => <label key={module.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-100 bg-white px-3 py-3 transition hover:bg-ink-50 sm:px-4"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${iconTone[module.module_code] ?? "bg-ink-50 text-ink-700"}`}>▣</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink-700">{module.module_name}</span><span className="mt-0.5 block text-xs text-slate/55">{pages.filter((page) => page.module_id === module.id).length} pages</span></span><input type="checkbox" checked={selected.has(module.id)} onChange={() => onToggle(module.id)} className="h-5 w-5 rounded border-ink-200 text-ink-700 focus:ring-ink-100" /></label>)}</div><div className="mt-5 flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-ink-700">{[...selected].length} modules selected</p><p className="mt-1 text-xs text-slate/60">{selectedPageCount} pages will be enabled for this organisation.</p></div><Button disabled={pending || !organisationId} onClick={onSave} className="w-full sm:w-auto">{pending ? "Saving..." : "Save Changes"}</Button></div></Card>;
}

function SummaryCard({ value, label, tone }: { value: number; label: string; tone: string }) { return <div className={`min-w-[82px] rounded-xl border border-ink-100 bg-white px-3 py-2 shadow-sm ${tone === "blue" ? "text-blue-700" : tone === "green" ? "text-emerald-700" : "text-violet-700"}`}><p className="text-lg font-black leading-none sm:text-2xl">{value}</p><p className="mt-1 text-[10px] font-semibold text-slate/55 sm:text-xs">{label}</p></div>; }
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" onClick={onClick} className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-semibold transition ${active ? "border-blue-600 text-blue-600" : "border-transparent text-slate/60 hover:text-ink-700"}`}>{children}</button>; }
