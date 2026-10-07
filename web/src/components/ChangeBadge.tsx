import { money, percentChange } from "@/lib/format";

export function ChangeBadge({
  price,
  previous,
  currency,
}: {
  price: number | null;
  previous: number | null;
  currency: string | null;
}) {
  const pct = percentChange(price, previous);
  if (pct == null || Math.abs(pct) < 0.005) {
    return <span className="text-sm text-faint">No change</span>;
  }
  const down = pct < 0;
  const diff = Math.abs((price ?? 0) - (previous ?? 0));
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium tabular-nums ${
        down ? "bg-good-soft text-good" : "bg-bad-soft text-bad"
      }`}
      title={`${down ? "Down" : "Up"} ${money(diff, currency)} since last scrape`}
    >
      <span aria-hidden>{down ? "▼" : "▲"}</span>
      {Math.abs(pct).toFixed(1)}%
      <span className="sr-only">{down ? "decrease" : "increase"}</span>
    </span>
  );
}

export function StockPill({ inStock }: { inStock: boolean | null }) {
  return inStock === false ? (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">
      <span className="size-1.5 rounded-full bg-warn" aria-hidden />
      Out of stock
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
      <span className="size-1.5 rounded-full bg-good" aria-hidden />
      In stock
    </span>
  );
}
