// Loading placeholder shaped like the content it stands in for (rows or a detail page), so the page
// does not jump when data arrives. The label is read out by screen readers; the bars are hidden from them.
export function SkeletonRows({ label, rows = 4, className = "" }: { label: string; rows?: number; className?: string }) {
  return (
    <div role="status" aria-busy className={`overflow-hidden rounded-xl border border-line bg-card ${className}`}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
          <div className="size-10 shrink-0 animate-pulse rounded-lg bg-hover" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/5 animate-pulse rounded bg-hover" />
            <div className="h-3 w-2/5 animate-pulse rounded bg-hover" />
          </div>
          <div className="h-5 w-16 animate-pulse rounded bg-hover" />
        </div>
      ))}
    </div>
  );
}

// A product page: title block, price and the chart area.
export function SkeletonDetail({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div role="status" aria-busy className={`space-y-5 ${className}`}>
      <span className="sr-only">{label}</span>
      <div aria-hidden className="flex items-center gap-4">
        <div className="size-16 shrink-0 animate-pulse rounded-xl bg-hover" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-3/4 animate-pulse rounded bg-hover" />
          <div className="h-3.5 w-1/3 animate-pulse rounded bg-hover" />
        </div>
      </div>
      <div aria-hidden className="h-9 w-40 animate-pulse rounded bg-hover" />
      <div aria-hidden className="h-64 animate-pulse rounded-xl bg-hover" />
    </div>
  );
}
