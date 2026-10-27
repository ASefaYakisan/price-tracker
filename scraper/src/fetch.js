const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Set SCRAPER_USER_AGENT to add a contact address for shop operators, e.g. 'PriceTrackerBot/0.1 (+https://your-site)'.
const USER_AGENT = process.env.SCRAPER_USER_AGENT || 'PriceTrackerBot/0.1';

// Polite fetch: identifies itself, retries transient failures with backoff.
// Errors for an HTTP answer carry its `status`; `timeoutMs` gives up on a slow server with a TimeoutError.
// With a `guard` (async url => void, throws to refuse), redirects are followed by hand and every address is checked first;
// use it for links visitors saved, not for the fixed addresses of rate and price feeds.
export async function fetchText(url, { retries = 3, accept = 'text/html', headers = {}, timeoutMs, guard } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const signal = timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined;
      const init = { headers: { 'user-agent': USER_AGENT, accept, ...headers }, signal };
      const res = guard ? await fetchGuarded(url, init, guard) : await fetch(url, init);
      if (res.ok) return await res.text();
      const error = Object.assign(new Error(`HTTP ${res.status} for ${url}`), { status: res.status });
      if (res.status < 500 && res.status !== 429) throw error;
      throw Object.assign(error, { retryable: true });
    } catch (err) {
      const retryable = err.retryable || err.name === 'TypeError';
      if (!retryable || attempt >= retries) throw err;
      await sleep(1000 * 2 ** (attempt - 1));
    }
  }
}

export const MAX_REDIRECTS = 5;

async function fetchGuarded(url, init, guard) {
  let current = url;
  for (let hops = 0; ; hops++) {
    await guard(current);
    const res = await fetch(current, { ...init, redirect: 'manual' });
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
    if (!location) return res;
    if (hops >= MAX_REDIRECTS) throw new Error(`too many redirects from ${url}`);
    current = new URL(location, current).href;
  }
}

export async function fetchJson(url, options = {}) {
  return JSON.parse(await fetchText(url, { accept: 'application/json', ...options }));
}

export { sleep };
