// How fresh the scraped prices are. Used by /api/health and the "data may be out of date" note on the home page.
export const STALE_AFTER_HOURS = 36;

const HOUR = 3_600_000;

export type Freshness = {
  status: "ok" | "stale" | "empty";
  last_scraped_at: string | null;
  stale_after_hours: number;
  sources: { source: string; last_scraped_at: string; status: "ok" | "stale" }[];
};

export const isStale = (scrapedAt: string | null | undefined, now: number, hours = STALE_AFTER_HOURS) => {
  if (!scrapedAt) return false;
  const time = Date.parse(scrapedAt);
  return Number.isFinite(time) && now - time > hours * HOUR;
};

// The whole site is "ok" while the newest read, from any source, is recent; each source also gets its own status.
export function freshness(rows: { source: string; scraped_at: string | null }[], now: number, hours = STALE_AFTER_HOURS): Freshness {
  const latest = new Map<string, string>();
  for (const { source, scraped_at } of rows) {
    if (!scraped_at || !Number.isFinite(Date.parse(scraped_at))) continue;
    const seen = latest.get(source);
    if (!seen || scraped_at > seen) latest.set(source, scraped_at);
  }
  const sources = [...latest]
    .map(([source, last_scraped_at]) => ({ source, last_scraped_at, status: isStale(last_scraped_at, now, hours) ? ("stale" as const) : ("ok" as const) }))
    .sort((a, b) => a.source.localeCompare(b.source));
  const newest = sources.reduce<string | null>((max, s) => (!max || s.last_scraped_at > max ? s.last_scraped_at : max), null);
  return {
    status: !newest ? "empty" : isStale(newest, now, hours) ? "stale" : "ok",
    last_scraped_at: newest,
    stale_after_hours: hours,
    sources,
  };
}
