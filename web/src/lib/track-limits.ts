// Per-account limits for /api/track, checked before the server opens any page.

export const LINKS_PER_HOUR = 10; // links one account may add per hour
export const LINKS_PER_ACCOUNT = 30; // links one account may own in total
export const ATTEMPTS_PER_HOUR = 30; // reads one account may start per hour, failed ones included

export const LIMIT_CHECK_FAILED = "Could not check your limits right now. Try again in a minute.";

// Counts come from Supabase; null means the count failed. A failed count blocks the request (fail-closed),
// so a database hiccup cannot be used to skip the limits. Use limitCheckFailed() to answer with 503.
export function limitCheckFailed(counts: { recentLinks: number | null; ownedLinks: number | null; recentAttempts: number | null }) {
  return counts.recentLinks === null || counts.ownedLinks === null || counts.recentAttempts === null;
}

export function trackLimitMessage(counts: { recentLinks: number | null; ownedLinks: number | null; recentAttempts: number | null }) {
  if ((counts.recentLinks ?? 0) >= LINKS_PER_HOUR || (counts.recentAttempts ?? 0) >= ATTEMPTS_PER_HOUR)
    return "You added many links in the last hour. Try again later.";
  if ((counts.ownedLinks ?? 0) >= LINKS_PER_ACCOUNT) return "Your account already tracks the maximum number of links.";
  return null;
}
