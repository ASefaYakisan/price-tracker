export function money(value: number | null | undefined, currency: string | null) {
  if (value == null) return "–";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency ?? "USD" }).format(value);
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
