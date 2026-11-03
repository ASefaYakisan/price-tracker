// Approximate price conversion using the central-bank rates the scraper already stores (USD/TRY, EUR/TRY, ...).
// Every rate is "Turkish lira per one unit"; any pair is converted through the lira.
export type Rates = Record<string, number>;

export const DISPLAY_CURRENCIES = ["TRY", "USD", "EUR", "GBP", "CHF", "JPY", "SAR"] as const;

// Rate rows are titled "US Dollar (USD/TRY)" and priced in lira.
export function ratesFromProducts(rows: { source: string; title: string; price: number | null }[]): Rates {
  const rates: Rates = { TRY: 1 };
  for (const r of rows) {
    const code = r.source === "tcmb" ? /\(([A-Z]{3})\/TRY\)/.exec(r.title)?.[1] : undefined;
    if (code && r.price != null && r.price > 0) rates[code] = r.price;
  }
  return rates;
}

export function convertPrice(value: number, from: string | null, to: string, rates: Rates): number | null {
  const a = rates[(from ?? "USD").toUpperCase()];
  const b = rates[to.toUpperCase()];
  return a && b ? (value * a) / b : null;
}
