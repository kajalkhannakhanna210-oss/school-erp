export default function StudentsLoading() {
  return <div className="w-full animate-pulse space-y-5"><div className="h-20 rounded-xl border border-ink-100 bg-white shadow-sm" /><div className="h-16 rounded-xl border border-ink-100 bg-white shadow-sm" /><div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm"><div className="h-12 border-b border-ink-100 bg-ink-50" />{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-14 border-b border-ink-100 last:border-0" />)}</div></div>;
}
