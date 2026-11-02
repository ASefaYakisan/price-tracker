// Sorts a failed page read into the outcome stored in track_attempts and the message the visitor sees.
// web/src/lib/track-outcome.ts is a TypeScript port of this file; keep them in step.

export const BLOCKED_STATUSES = [401, 403, 429, 503];

// A small page that answered 200 but is a robot check, not the product (Amazon's captcha page, Cloudflare's wait page).
// It counts as the shop turning the request away, so the next layer gets a go.
const BOT_WALL = /captcha|robot check|are you a (?:human|robot)|unusual traffic|pardon our interruption|just a moment\.\.\.|cf-chl|access denied|request blocked/i;

export function botWall(html) {
  return typeof html === 'string' && html.length < 60_000 && BOT_WALL.test(html);
}

// A 200 page that is an empty shell: the price is drawn by scripts after the page opens (React, Vue, Nuxt apps).
// Plain requests cannot read it, but the real browser on GitHub's servers can, so the link is kept instead of refused.
const SHELL_MARKERS = /id=["'](?:root|__next|app|__nuxt)["']|__NUXT__|__INITIAL_STATE__|<noscript/i;
const SHELL_TEXT_LIMIT = 400;

export function scriptRendered(html) {
  if (typeof html !== 'string' || html.length >= 600_000 || !/<title[\s>]/i.test(html) || !SHELL_MARKERS.test(html)) return false;
  const text = html
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length < SHELL_TEXT_LIMIT;
}

export function outcomeForError(err) {
  if (err?.status) return 'http_error';
  return err?.name === 'TimeoutError' || err?.cause?.name === 'TimeoutError' ? 'timeout' : 'network';
}

export function messageFor(outcome, httpStatus = null) {
  if (outcome === 'http_error') {
    if (BLOCKED_STATUSES.includes(httpStatus)) return 'The shop refused the request. Some shops block automated visits.';
    if (httpStatus === 404 || httpStatus === 410) return 'That page was not found at the shop. Check the link and try again.';
    return "The shop's page returned an error. Try again later.";
  }
  if (outcome === 'no_price') return 'No price found on that page. Paste the link of a single product page.';
  if (outcome === 'timeout') return 'The shop did not respond in time. Try again later.';
  return 'Could not open that page. Check the link and try again.';
}

// A track_attempts row; host comes from the link so failures group by shop.
export function attemptRow({ url, stage, outcome, httpStatus = null, layer = null, userId = null }) {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {}
  return { url, host, user_id: userId, stage, outcome, http_status: httpStatus, layer };
}
