// The home page splits items into lists: your own, links everyone added, market feeds and the sample books.

export const LISTS = ["mine", "explore", "markets", "sample"] as const;
export type ListKey = (typeof LISTS)[number];

const MARKETS = new Set(["coingecko", "tcmb", "gold"]);
const SAMPLE = new Set(["books-toscrape"]);

export function isList(value: unknown): value is ListKey {
  return typeof value === "string" && (LISTS as readonly string[]).includes(value);
}

// The shared list an item belongs to; "mine" is a per-person view over all of them.
export function sharedListOf(source: string): Exclude<ListKey, "mine"> {
  if (MARKETS.has(source)) return "markets";
  if (SAMPLE.has(source)) return "sample";
  return "explore";
}

export function itemsInList<T extends { id: number; source: string }>(items: T[], list: ListKey, mine: ReadonlySet<number> | null): T[] {
  if (list === "mine") return mine ? items.filter((p) => mine.has(p.id)) : [];
  return items.filter((p) => sharedListOf(p.source) === list);
}

// Signed-in visitors start on their own list; everyone else on what people added, or the markets while that is empty.
export function defaultList(signedIn: boolean, exploreCount: number): ListKey {
  if (signedIn) return "mine";
  return exploreCount ? "explore" : "markets";
}

// A link nobody follows and nobody watches with an alert stops being checked; the built-in feeds always stay.
export function shouldDropProduct(product: { source: string; followers: number | null; alerts: number | null }) {
  return product.source === "custom" && product.followers === 0 && product.alerts === 0;
}
