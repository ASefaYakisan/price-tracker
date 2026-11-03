import { assertPublicUrl } from "./safe-url.ts";
import { messageFor, outcomeForError, type TrackOutcome } from "./track-outcome.ts";

export const BROWSER_HEADERS = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
  "cache-control": "no-cache",
  "sec-ch-ua": '"Chromium";v="141", "Google Chrome";v="141", "Not?A_Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
};

export const MAX_REDIRECTS = 5;

// A failed read of the shop's page: the reason goes to track_attempts, the message to the visitor.
export class ReadError extends Error {
  outcome: TrackOutcome;
  httpStatus: number | null;
  constructor(outcome: TrackOutcome, httpStatus: number | null = null, message = messageFor(outcome, httpStatus)) {
    super(message);
    this.outcome = outcome;
    this.httpStatus = httpStatus;
  }
}

// Follows redirects by hand so every hop gets the same public-address check before it is requested.
// `guard` and `request` can be replaced in tests; in the app they are the real address check and fetch.
export async function fetchPublic(
  start: URL,
  { guard = assertPublicUrl, request = fetch }: { guard?: (raw: string) => Promise<URL>; request?: typeof fetch } = {},
) {
  let url = start;
  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    const res = await request(url, { headers: BROWSER_HEADERS, redirect: "manual", signal: AbortSignal.timeout(15_000) }).catch((err) => {
      throw new ReadError(outcomeForError(err));
    });
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return res;
    url = await guard(new URL(location, url).href).catch((err) => {
      throw new ReadError("network", null, (err as Error).message);
    });
  }
  throw new ReadError("network", null, "That link redirects too many times.");
}
