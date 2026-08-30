"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, Badge, Input } from "@/components/ui";

type ApiParam = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

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

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  POST: "bg-blue-100 text-blue-700 border border-blue-200",
  PUT: "bg-amber-100 text-amber-700 border border-amber-200",
  PATCH: "bg-orange-100 text-orange-700 border border-orange-200",
  DELETE: "bg-rose-100 text-rose-700 border border-rose-200",
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
        METHOD_COLORS[method] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {method}
    </span>
  );
}

function ApiCard({ api }: { api: ApiEntry }) {
  const [open, setOpen] = useState(false);
  const isNew = api.tags?.includes("new");

  return (
    <div className="rounded-xl border border-ink-100/80 bg-white shadow-[0_2px_10px_rgba(30,42,74,0.05)] overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full text-left flex flex-wrap items-start gap-3 px-4 py-4 hover:bg-ink-50/50 transition"
      >
        <MethodBadge method={api.method} />

        <span className="font-mono text-sm text-ink-700 font-semibold break-all flex-1 min-w-0">
          {api.path}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {isNew && (
            <span className="inline-flex items-center rounded-full bg-gold/20 text-amber-700 border border-amber-200 px-2 py-0.5 text-xs font-bold">
              ✨ NEW
            </span>
          )}
          {!api.auth && (
            <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 text-xs font-medium">
              Public
            </span>
          )}
          {api.auth && (
            <span className="inline-flex items-center rounded-full bg-ink-100 text-ink-600 border border-ink-200 px-2 py-0.5 text-xs font-medium">
              🔒 Auth
            </span>
          )}
          <span className="text-xs text-slate/40 hidden sm:inline">{api.name}</span>
          <span
            className={`ml-2 text-sm text-slate/40 transition-transform duration-200 ${
              open ? "rotate-90" : "rotate-0"
            }`}
          >
            ›
          </span>
        </div>
      </button>

      {/* Expandable detail */}
      {open && (
        <div className="border-t border-ink-100 px-4 py-4 space-y-4 bg-ink-50/30">
          <p className="text-sm text-slate/70">{api.description}</p>

          {api.params && api.params.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate/50 mb-2">
                Query Parameters
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 text-left text-xs text-slate/40 uppercase tracking-wide">
                      <th className="pb-1.5 pr-4">Name</th>
                      <th className="pb-1.5 pr-4">Type</th>
                      <th className="pb-1.5 pr-4">Required</th>
                      <th className="pb-1.5">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {api.params.map((p) => (
                      <tr key={p.name} className="border-b border-ink-50 last:border-0">
                        <td className="py-1.5 pr-4 font-mono text-xs text-ink-700 font-semibold">
                          {p.name}
                        </td>
                        <td className="py-1.5 pr-4 text-xs text-slate/60">{p.type}</td>
                        <td className="py-1.5 pr-4 text-xs">
                          {p.required ? (
                            <span className="text-rose-600 font-semibold">Yes</span>
                          ) : (
                            <span className="text-slate/40">No</span>
                          )}
                        </td>
                        <td className="py-1.5 text-xs text-slate/60">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {api.responseExample && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate/50 mb-1.5">
                Example Response
              </p>
              <pre className="rounded-lg bg-ink-900 text-emerald-300 text-xs p-3 overflow-x-auto whitespace-pre-wrap break-all">
                {api.responseExample}
              </pre>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {api.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-white border border-ink-100 text-slate/50 px-2.5 py-0.5 text-xs"
              >
                #{tag}
              </span>
            ))}
            {api.addedOn && (
              <span className="text-xs text-slate/40 ml-auto self-center">
                Added {api.addedOn}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ApiExplorerClient() {
  const [apis, setApis] = useState<ApiEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeMethod, setActiveMethod] = useState<string>("All");

  useEffect(() => {
    fetch("/api/dev/api-registry")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setApis(data.apis ?? []);
        setCategories(["All", ...(data.categories ?? [])]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return apis.filter((api) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        api.name.toLowerCase().includes(q) ||
        api.path.toLowerCase().includes(q) ||
        api.description.toLowerCase().includes(q) ||
        api.tags?.some((t) => t.includes(q));
      const matchCategory =
        activeCategory === "All" || api.category === activeCategory;
      const matchMethod =
        activeMethod === "All" || api.method === activeMethod;
      return matchSearch && matchCategory && matchMethod;
    });
  }, [apis, search, activeCategory, activeMethod]);

  const grouped = useMemo(() => {
    const map: Record<string, ApiEntry[]> = {};
    for (const api of filtered) {
      if (!map[api.category]) map[api.category] = [];
      map[api.category].push(api);
    }
    return map;
  }, [filtered]);

  const methods = ["All", "GET", "POST", "PUT", "PATCH", "DELETE"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate/50 text-sm">
        Loading API registry…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 mt-6">
        ⚠️ Failed to load APIs: {error}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Filters bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Input
          placeholder="Search by name, path, tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs mt-0"
        />

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
                activeCategory === cat
                  ? "bg-[#222F57] text-white border-[#222F57]"
                  : "bg-white text-slate/60 border-ink-200 hover:border-ink-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Method pills */}
        <div className="flex flex-wrap gap-1.5">
          {methods.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setActiveMethod(m)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
                activeMethod === m
                  ? "bg-[#222F57] text-white border-[#222F57]"
                  : "bg-white text-slate/60 border-ink-200 hover:border-ink-400"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 flex-wrap">
        <span className="text-sm text-slate/50">
          Showing <b className="text-ink-700">{filtered.length}</b> of{" "}
          <b className="text-ink-700">{apis.length}</b> endpoints
        </span>
        {apis.some((a) => a.tags?.includes("new")) && (
          <span className="text-sm text-amber-600 font-semibold">
            ✨ {apis.filter((a) => a.tags?.includes("new")).length} new API(s) recently added
          </span>
        )}
      </div>

      {/* Grouped API list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="py-12 text-center text-slate/40 text-sm">
          No APIs match your search.
        </div>
      ) : (
        Object.entries(grouped).map(([category, entries]) => (
          <div key={category}>
            <h2 className="font-display text-base font-bold text-ink-700 mb-2 flex items-center gap-2">
              <span className="inline-block h-4 w-1 rounded bg-gold" />
              {category}
              <span className="ml-1 text-xs text-slate/40 font-normal">
                ({entries.length})
              </span>
            </h2>
            <div className="space-y-2">
              {entries.map((api) => (
                <ApiCard key={api.id} api={api} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
