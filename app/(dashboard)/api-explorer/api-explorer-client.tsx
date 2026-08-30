"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui";

type ApiParam = { name: string; type: string; required: boolean; description: string };
type ApiEntry = {
  id: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  category: string;
  auth: boolean;
  params?: ApiParam[];
  responseExample?: string;
  addedOn?: string;
  tags?: string[];
};

const methodStyles: Record<string, string> = {
  GET: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  POST: "bg-blue-50 text-blue-700 ring-blue-200",
  PUT: "bg-amber-50 text-amber-700 ring-amber-200",
  PATCH: "bg-orange-50 text-orange-700 ring-orange-200",
  DELETE: "bg-rose-50 text-rose-700 ring-rose-200",
};

function MethodBadge({ method }: { method: string }) {
  return <span className={`inline-flex min-w-[4.5rem] justify-center rounded-md px-2 py-1 text-[10px] font-extrabold tracking-[0.14em] ring-1 ring-inset ${methodStyles[method] ?? "bg-slate-50 text-slate-600 ring-slate-200"}`}>{method}</span>;
}

function Chevron({ open }: { open: boolean }) {
  return <svg aria-hidden="true" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ApiCard({ api }: { api: ApiEntry }) {
  const [open, setOpen] = useState(false);
  const isNew = api.tags?.includes("new");

  return (
    <article className={`overflow-hidden rounded-xl border bg-white transition-all ${open ? "border-[#9eafd0] shadow-[0_10px_28px_rgba(34,47,87,.09)]" : "border-[#e1e6f0] shadow-[0_2px_8px_rgba(34,47,87,.04)] hover:-translate-y-px hover:border-[#b8c5dd] hover:shadow-[0_8px_20px_rgba(34,47,87,.07)]"}`}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center gap-3 p-3 text-left sm:gap-4 sm:px-4">
        <MethodBadge method={api.method} />
        <div className="min-w-0 flex-1">
          <code className="block truncate text-[13px] font-bold text-[#17213f] sm:text-sm">{api.path}</code>
          <span className="mt-1 block truncate text-xs text-[#77849f]">{api.name}</span>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {isNew && <span className="rounded-full bg-[#fff5ce] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#916d00]">New</span>}
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${api.auth ? "bg-[#eef1f8] text-[#52617e]" : "bg-[#f1f8f3] text-[#438157]"}`}>{api.auth ? "Auth required" : "Public"}</span>
        </div>
        <span className="text-[#8390a9]"><Chevron open={open} /></span>
      </button>

      {open && <div className="border-t border-[#e8ebf2] bg-[#fafbfe] px-3 pb-5 pt-4 sm:px-4">
        <p className="max-w-3xl text-sm leading-6 text-[#596783]">{api.description}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          {api.params && api.params.length > 0 && <div className="rounded-lg border border-[#e2e7f0] bg-white p-3 sm:p-4">
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#7d89a2]">Query parameters</p>
            <div className="divide-y divide-[#edf0f5]">
              {api.params.map((param) => <div key={param.name} className="grid gap-1 py-2.5 first:pt-0 sm:grid-cols-[minmax(100px,.7fr)_70px_1fr] sm:items-center sm:gap-3">
                <code className="text-xs font-bold text-[#26385f]">{param.name}</code>
                <span className="text-[11px] text-[#8893a9]">{param.type}</span>
                <span className="text-xs text-[#65728c]">{param.required ? <b className="mr-1 font-semibold text-rose-600">Required</b> : <b className="mr-1 font-semibold text-[#9aa4b7]">Optional</b>}{param.description}</span>
              </div>)}
            </div>
          </div>}
          {api.responseExample && <div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#7d89a2]">Example response</p>
            <pre className="max-h-56 overflow-auto rounded-lg bg-[#101a35] p-4 text-[11px] leading-5 text-[#b8e8c7] shadow-inner">{api.responseExample}</pre>
          </div>}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {api.tags?.filter((tag) => tag !== "new").map((tag) => <span key={tag} className="rounded-full border border-[#dfe5ef] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#71809d]">#{tag}</span>)}
          {api.addedOn && <span className="ml-auto text-[11px] text-[#98a2b5]">Added {api.addedOn}</span>}
        </div>
      </div>}
    </article>
  );
}

export function ApiExplorerClient() {
  const [apis, setApis] = useState<ApiEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeMethod, setActiveMethod] = useState("All");

  useEffect(() => {
    fetch("/api/dev/api-registry").then((response) => response.json()).then((data) => {
      if (data.error) throw new Error(data.error);
      setApis(data.apis ?? []);
      setCategories(["All", ...(data.categories ?? [])]);
    }).catch((reason) => setError(reason.message)).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => apis.filter((api) => {
    const query = search.toLowerCase();
    return (!query || api.name.toLowerCase().includes(query) || api.path.toLowerCase().includes(query) || api.description.toLowerCase().includes(query) || api.tags?.some((tag) => tag.includes(query))) && (activeCategory === "All" || api.category === activeCategory) && (activeMethod === "All" || api.method === activeMethod);
  }), [apis, search, activeCategory, activeMethod]);

  const grouped = useMemo(() => filtered.reduce<Record<string, ApiEntry[]>>((groups, api) => { (groups[api.category] ??= []).push(api); return groups; }, {}), [filtered]);
  const methods = ["All", "GET", "POST", "PUT", "PATCH", "DELETE"];
  const newCount = apis.filter((api) => api.tags?.includes("new")).length;

  if (loading) return <div className="flex items-center justify-center py-24 text-sm text-[#7d89a2]">Loading API registry...</div>;
  if (error) return <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">Failed to load APIs: {error}</div>;

  return <div className="mt-2">
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="rounded-xl border border-[#e1e6f0] bg-white p-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#8792a7]">Total endpoints</p><p className="mt-2 text-2xl font-extrabold text-[#17213f]">{apis.length}</p><p className="mt-1 text-xs text-[#7d89a2]">Across {categories.length - 1} service areas</p></div>
      <div className="rounded-xl border border-[#e1e6f0] bg-white p-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#8792a7]">Showing now</p><p className="mt-2 text-2xl font-extrabold text-[#17213f]">{filtered.length}</p><p className="mt-1 text-xs text-[#7d89a2]">Matching your current filters</p></div>
      <div className="rounded-xl border border-[#e1e6f0] bg-white p-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#8792a7]">Recently added</p><p className="mt-2 text-2xl font-extrabold text-[#916d00]">{newCount}</p><p className="mt-1 text-xs text-[#7d89a2]">New endpoints to review</p></div>
    </div>

    <div className="mt-3 flex items-end justify-between gap-3 border-b border-[#dfe5ef] pb-3">
      <div><p className="text-sm font-bold text-[#17213f]">Endpoint directory</p><p className="mt-1 text-xs text-[#7d89a2]">Select an endpoint to inspect its contract.</p></div><p className="text-xs font-semibold text-[#8995ab]"><span className="text-[#17213f]">{filtered.length}</span> result{filtered.length === 1 ? "" : "s"}</p>
    </div>

    <div className="mt-3 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="h-fit rounded-xl border border-[#e1e6f0] bg-white p-3 lg:sticky lg:top-5">
        <label className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#7d89a2]" htmlFor="api-search">Find an endpoint</label>
        <div className="relative mt-2"><svg aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#8995ab]" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" /><path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg><Input id="api-search" className="mt-0 h-10 min-h-10 pl-9 text-xs" placeholder="Name, path or tag" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="mt-5"><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#7d89a2]">Service area</p><div className="space-y-1">{categories.map((category) => <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${activeCategory === category ? "bg-[#17213f] text-white" : "text-[#65728c] hover:bg-[#f1f4f9]"}`}><span>{category}</span>{category !== "All" && <span className={activeCategory === category ? "text-white/60" : "text-[#aab3c2]"}>{apis.filter((api) => api.category === category).length}</span>}</button>)}</div></div>
        <div className="mt-5 border-t border-[#edf0f5] pt-5"><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#7d89a2]">HTTP method</p><div className="flex flex-wrap gap-1.5">{methods.map((method) => <button key={method} type="button" onClick={() => setActiveMethod(method)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ${activeMethod === method ? "bg-[#e8edf8] text-[#26385f] ring-1 ring-[#b9c6df]" : "bg-[#f6f7fa] text-[#7d89a2] hover:bg-[#edf0f5]"}`}>{method}</button>)}</div></div>
      </aside>

      <section className="min-w-0 space-y-4 bg-white">
        {Object.keys(grouped).length === 0 ? <div className="rounded-xl border border-dashed border-[#cfd7e5] bg-white py-16 text-center text-sm text-[#7d89a2]">No endpoints match your filters.</div> : Object.entries(grouped).map(([category, entries]) => <div key={category}><div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#f7c200]" /><h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#52617e]">{category}</h2><span className="text-[11px] text-[#a1aabd]">{entries.length}</span></div><div className="space-y-2">{entries.map((api) => <ApiCard key={api.id} api={api} />)}</div></div>)}
      </section>
    </div>
  </div>;
}
