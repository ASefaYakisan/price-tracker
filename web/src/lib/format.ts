import { intlLocale, type Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/en";

export const sourceLabel = (source: string, t: Dict) => (t.sources as Record<string, string>)[source] ?? source;

// Shoppers want prices to fall; for crypto, currencies and gold a rise is the good news.
const MARKET_SOURCES = new Set(["coingecko", "tcmb", "gold"]);
export const riseIsGood = (source: string) => MARKET_SOURCES.has(source);

// "good" | "bad" tone for a percentage move, from the viewer's side of the trade.
export function changeTone(pct: number, source: string): "good" | "bad" {
  return pct > 0 === riseIsGood(source) ? "good" : "bad";
}

export function money(value: number | null | undefined, currency: string | null, lang: Locale = "en") {
  if (value == null) return "–";
  // Small values (cheap coins, yen) need more than two decimals to show any movement.
  const abs = Math.abs(value);
  const digits = abs >= 1 || abs === 0 ? 2 : Math.min(8, 3 - Math.floor(Math.log10(abs)));
  return new Intl.NumberFormat(intlLocale(lang), {
    style: "currency",
    currency: currency ?? "USD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: Math.min(digits, 4),
    maximumFractionDigits: digits,
  }).format(value);
}

// Axis labels: short form for big numbers ($122K) so they never clip.
export function axisMoney(value: number, currency: string | null, lang: Locale = "en") {
  if (Math.abs(value) < 10_000) return money(value, currency, lang);
  return new Intl.NumberFormat(intlLocale(lang), {
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

export function shortDate(value: string | number, lang: Locale = "en") {
  return new Date(value).toLocaleDateString(intlLocale(lang), { day: "numeric", month: "short" });
}

export function dateTime(value: string, lang: Locale = "en") {
  return new Date(value).toLocaleString(intlLocale(lang), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Signed percentage in the reader's number format: +1.5 % / +1,5 %.
export function percent(value: number, lang: Locale = "en", signed = true) {
  return new Intl.NumberFormat(intlLocale(lang), {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: signed ? "exceptZero" : "never",
  }).format(value / 100);
}
