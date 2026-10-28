// Owner-only usage numbers (migration 0011). ADMIN_EMAILS is a comma-separated list of accounts allowed to read them.
export type UsageStats = {
  users: number;
  products: number;
  pasted_links: number;
  list_items: number;
  alerts: number;
  alerts_sent: number;
  prices_last_24h: number;
  prices_total: number;
  link_reads_7d: number;
  link_reads_ok_7d: number;
};

export function isAdminEmail(email: string | null | undefined, list = process.env.ADMIN_EMAILS) {
  if (!email || !list) return false;
  return list
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

// Share of link reads in the last 7 days that found a price, as a 0-100 number, or null before any read.
export function linkSuccessRate(stats: Pick<UsageStats, "link_reads_7d" | "link_reads_ok_7d">) {
  const total = Number(stats.link_reads_7d);
  return total > 0 ? Math.round((Number(stats.link_reads_ok_7d) / total) * 1000) / 10 : null;
}
