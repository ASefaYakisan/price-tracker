const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const USER_AGENT = 'FiyatTakipBot/0.1 (+https://github.com/ASefaYakisan/price-tracker)';

// Polite fetch: identifies itself, retries transient failures with backoff.
export async function fetchText(url, { retries = 3, accept = 'text/html', headers = {} } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept, ...headers } });
      if (res.ok) return await res.text();
      if (res.status < 500 && res.status !== 429) throw new Error(`HTTP ${res.status} for ${url}`);
      throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { retryable: true });
    } catch (err) {
      const retryable = err.retryable || err.name === 'TypeError';
      if (!retryable || attempt >= retries) throw err;
      await sleep(1000 * 2 ** (attempt - 1));
    }
  }
}

export async function fetchJson(url, options = {}) {
  return JSON.parse(await fetchText(url, { accept: 'application/json', ...options }));
}

export { sleep };
