// Sorts a failed page read into the outcome stored in track_attempts and the message the visitor sees.
// Port of scraper/src/track-outcome.js (tested there); keep them in step.

export type TrackOutcome = "ok" | "http_error" | "no_price" | "timeout" | "network";

export const BLOCKED_STATUSES = [401, 403, 429, 503];

export function outcomeForError(err: unknown): TrackOutcome {
  const e = err as { status?: number; name?: string; cause?: { name?: string } } | null;
  if (e?.status) return "http_error";
  return e?.name === "TimeoutError" || e?.cause?.name === "TimeoutError" ? "timeout" : "network";
}

// The shop turned the site's server away or was too slow: GitHub's servers get another go, so the link is kept.
export function retryLater(outcome: TrackOutcome, httpStatus: number | null = null) {
  return outcome === "timeout" || (outcome === "http_error" && httpStatus != null && BLOCKED_STATUSES.includes(httpStatus));
}

export function messageFor(outcome: TrackOutcome, httpStatus: number | null = null) {
  if (outcome === "http_error") {
    if (httpStatus != null && BLOCKED_STATUSES.includes(httpStatus)) return "The shop refused the request. Some shops block automated visits.";
    if (httpStatus === 404 || httpStatus === 410) return "That page was not found at the shop. Check the link and try again.";
    return "The shop's page returned an error. Try again later.";
  }
  if (outcome === "no_price") return "No price found on that page. Paste the link of a single product page.";
  if (outcome === "timeout") return "The shop did not respond in time. Try again later.";
  return "Could not open that page. Check the link and try again.";
}

// A track_attempts row; host comes from the link so failures group by shop.
export function attemptRow(a: {
  url: string;
  stage: "add" | "daily";
  outcome: TrackOutcome;
  httpStatus?: number | null;
  layer?: string | null;
  userId?: string | null;
}) {
  let host = "";
  try {
    host = new URL(a.url).hostname.replace(/^www\./, "");
  } catch {}
  return { url: a.url, host, user_id: a.userId ?? null, stage: a.stage, outcome: a.outcome, http_status: a.httpStatus ?? null, layer: a.layer ?? null };
}
