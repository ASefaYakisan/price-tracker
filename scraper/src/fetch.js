const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Polite fetch: identifies itself, retries transient failures with backoff.
export async function fetchHtml(url, { retries = 3, userAgent = 'FiyatTakipBot/0.1 (+portfolio project)' } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': userAgent, accept: 'text/html' } });
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

export { sleep };
