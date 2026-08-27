export default function EnquiriesLoading() {
  return (
    <div className="min-w-0 space-y-4 pb-4" aria-label="Loading enquiries" role="status">
      <div className="h-20 animate-pulse rounded-xl border border-ink-100 bg-white" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl border border-ink-100 bg-white" />
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-white p-2">
        <div className="h-9 flex-1 animate-pulse rounded-lg bg-ink-50" />
        <div className="h-9 w-20 animate-pulse rounded-lg bg-ink-100" />
      </div>
      <div className="rounded-xl border border-ink-100 bg-white p-4">
        <div className="mb-4 h-10 animate-pulse rounded-lg bg-ink-50" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-lg bg-ink-50" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading enquiry data…</span>
    </div>
  );
}
