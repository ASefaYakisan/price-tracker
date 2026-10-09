import type { Locale } from "@/i18n/config";
import { fill } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/en";
import { changeTone, money, percent, percentChange } from "@/lib/format";

export function ChangeBadge({
  price,
  previous,
  currency,
  source,
  t,
  lang,
}: {
  price: number | null;
  previous: number | null;
  currency: string | null;
  source: string;
  t: Dict;
  lang: Locale;
}) {
  const pct = percentChange(price, previous);
  if (pct == null || Math.abs(pct) < 0.005) {
    return <span className="text-sm text-faint">{t.change.none}</span>;
  }
  const down = pct < 0;
  const good = changeTone(pct, source) === "good";
  const amount = money(Math.abs((price ?? 0) - (previous ?? 0)), currency, lang);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium tabular-nums ${
        good ? "bg-good-soft text-good" : "bg-bad-soft text-bad"
      }`}
      title={fill(down ? t.change.downBy : t.change.upBy, { amount })}
    >
      <span aria-hidden>{down ? "▼" : "▲"}</span>
      {percent(pct, lang, false)}
      <span className="sr-only">{down ? t.change.decrease : t.change.increase}</span>
    </span>
  );
}

// Only the exception is worth a label; "in stock" on every row (or on a currency) is noise.
export function StockPill({ inStock, t }: { inStock: boolean | null; t: Dict }) {
  if (inStock !== false) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium whitespace-nowrap text-warn">
      <span className="size-1.5 rounded-full bg-warn" aria-hidden />
      {t.change.outOfStock}
    </span>
  );
}
