// The home page splits items into lists: your own (pasted links live only here), market feeds and the sample books.

export const LISTS = ["mine", "markets", "sample"] as const;
export type ListKey = (typeof LISTS)[number];

const MARKETS = new Set(["coingecko", "tcmb", "gold"]);
const SAMPLE = new Set(["books-toscrape"]);

export function isList(value: unknown): value is ListKey {
  return typeof value === "string" && (LISTS as readonly string[]).includes(value);
}

// The shared list an item belongs to, or null for a pasted link: those are never shown to anyone but their owners.
export function sharedListOf(source: string): Exclude<ListKey, "mine"> | null {
  if (MARKETS.has(source)) return "markets";
  if (SAMPLE.has(source)) return "sample";
  return null;
}

// "mine" is the person's own items (given separately); the other lists are curated and shared.
export function itemsInList<T extends { source: string }>(shared: T[], list: ListKey, mine: T[] | null): T[] {
  if (list === "mine") return mine ?? [];
  return shared.filter((p) => sharedListOf(p.source) === list);
}

// Signed-in visitors start on their own list; everyone else on the markets.
export function defaultList(signedIn: boolean): ListKey {
  return signedIn ? "mine" : "markets";
}
