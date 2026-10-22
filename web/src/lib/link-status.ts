// Turns products.status / last_error / last_checked_at (migration 0009, written by scraper/src/link-status.js)
// into what a pasted link's badge says.
import type { Dict } from "@/i18n/dictionaries/en";
import { BLOCKED_STATUSES } from "./track-outcome.ts";

export type LinkState = "pending" | "active" | "failed";

type LinkFields = {
  source: string;
  scraped_at: string | null;
  status?: LinkState | null;
  last_error?: string | null;
  last_checked_at?: string | null;
};

// Only pasted links have a state; a link the site saved without a price is pending until the scraper reads it.
export function linkState(p: LinkFields): LinkState | null {
  if (p.source !== "custom") return null;
  if (p.status === "failed") return "failed";
  return p.scraped_at ? "active" : "pending";
}

// The newest read failed, so the price shown (if any) is older than the last check.
export function lastReadFailed(p: LinkFields) {
  if (!p.last_error || !p.last_checked_at) return false;
  return !p.scraped_at || Date.parse(p.last_checked_at) > Date.parse(p.scraped_at);
}

// 'http_error:403' -> "the shop blocked the request (HTTP 403)"
export function errorReason(code: string, t: Dict["linkStatus"]) {
  const [outcome, rawStatus] = code.split(":");
  const status = Number(rawStatus) || null;
  if (outcome === "http_error") {
    const text = status && BLOCKED_STATUSES.includes(status) ? t.blocked : status === 404 || status === 410 ? t.notFound : t.httpError;
    return status ? `${text} (HTTP ${status})` : text;
  }
  if (outcome === "no_price") return t.noPrice;
  if (outcome === "timeout") return t.timeout;
  return t.network;
}
