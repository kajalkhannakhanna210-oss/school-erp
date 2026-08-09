"use client";

import { useEffect, useState } from "react";

type Preferences = { theme: "default" | "ocean" | "forest"; fontSize: "small" | "medium" | "large"; dateFormat: "dd/MM/yyyy" | "MM/dd/yyyy" | "yyyy-MM-dd" };
const defaults: Preferences = { theme: "default", fontSize: "medium", dateFormat: "dd/MM/yyyy" };

export function UserPreferences() {
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  useEffect(() => {
    const saved = localStorage.getItem("school-preferences");
    if (saved) setPreferences({ ...defaults, ...JSON.parse(saved) });
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.fontSize = preferences.fontSize;
    localStorage.setItem("school-preferences", JSON.stringify(preferences));
  }, [preferences]);
  return (
    <details className="relative text-sm">
      <summary className="cursor-pointer rounded-md px-3 py-2 text-white hover:bg-white/10">Display</summary>
      <div style={{ width: "min(16rem, calc(100vw - 2rem))" }} className="absolute left-0 top-full z-20 mt-2 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-ink-100 bg-white p-3 shadow-lg sm:left-auto sm:right-0 sm:w-64 sm:p-4">
        <label className="block text-xs font-medium text-slate/60">Theme</label>
        <select className="mt-1 w-full rounded border border-ink-100 p-2" value={preferences.theme} onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as Preferences["theme"] })}>
          <option value="default">Classic</option><option value="ocean">Ocean</option><option value="forest">Forest</option>
        </select>
        <label className="mt-3 block text-xs font-medium text-slate/60">Font size</label>
        <select className="mt-1 w-full rounded border border-ink-100 p-2" value={preferences.fontSize} onChange={(e) => setPreferences({ ...preferences, fontSize: e.target.value as Preferences["fontSize"] })}>
          <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
        </select>
        <label className="mt-3 block text-xs font-medium text-slate/60">Date display format</label>
        <select className="mt-1 w-full rounded border border-ink-100 p-2" value={preferences.dateFormat} onChange={(e) => { const next = { ...preferences, dateFormat: e.target.value as Preferences["dateFormat"] }; setPreferences(next); localStorage.setItem("school-date-format", next.dateFormat); }}>
          <option value="dd/MM/yyyy">DD/MM/YYYY</option><option value="MM/dd/yyyy">MM/DD/YYYY</option><option value="yyyy-MM-dd">YYYY-MM-DD</option>
        </select>
        <p className="mt-3 text-xs text-slate/60">Date fields use a calendar picker. Preferences are saved for this browser.</p>
      </div>
    </details>
  );
}
