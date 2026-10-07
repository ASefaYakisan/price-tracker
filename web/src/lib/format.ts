export const SOURCE_LABELS: Record<string, string> = {
  "books-toscrape": "Books",
  coingecko: "Crypto",
  tcmb: "Exchange rates",
  gold: "Gold",
};

export const sourceLabel = (source: string) => SOURCE_LABELS[source] ?? source;

// Shoppers want prices to fall; for crypto, currencies and gold a rise is the good news.
const MARKET_SOURCES = new Set(["coingecko", "tcmb", "gold"]);
export const riseIsGood = (source: string) => MARKET_SOURCES.has(source);

// "good" | "bad" tone for a percentage move, from the viewer's side of the trade.
export function changeTone(pct: number, source: string): "good" | "bad" {
  return (pct > 0) === riseIsGood(source) ? "good" : "bad";
}

export function money(value: number | null | undefined, currency: string | null) {
  if (value == null) return "–";
  // Small values (cheap coins, yen) need more than two decimals to show any movement.
  const abs = Math.abs(value);
  const digits = abs >= 1 || abs === 0 ? 2 : Math.min(8, 3 - Math.floor(Math.log10(abs)));
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency ?? "USD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: Math.min(digits, 4),
    maximumFractionDigits: digits,
  }).format(value);
}

// Axis labels: short form for big numbers ($122K) so they never clip.
export function axisMoney(value: number, currency: string | null) {
  if (Math.abs(value) < 10_000) return money(value, currency);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency ?? "USD",
    currencyDisplay: "narrowSymbol",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function percentChange(price: number | null, previous: number | null) {
  if (price == null || previous == null || previous === 0) return null;
  return ((price - previous) / previous) * 100;
}

export function shortDate(value: string | number) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function dateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
