// Shop probe: opens sample product links and reports, per shop, how far reading got.
// `npm run probe` reads probe-urls.txt; `npm run probe -- <url> <url>` checks just those links.
// Each link goes through the same layers as the daily refresh: plain request, then a real browser when Playwright's
// Chromium is installed, then the scraping API when SCRAPER_API_KEY and the database (for the monthly count) are set.
// PROBE_API=0 skips the paid layer. Probe reads are not logged, so they do not count toward UNBLOCK_MONTHLY_LIMIT.
// On GitHub Actions the table also goes to the job summary.
// The run also writes probe-report.json (PROBE_REPORT overrides the path). When PROBE_PREVIOUS points at an earlier
// report, a link that read a price then and does not now is listed as broken and the run exits with code 1.
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { readThroughLayers } from './adapters/custom.js';
import { createBrowserReader } from './browser-fetch.js';
import { sleep } from './fetch.js';
import { createStore } from './store.js';
import { attemptRow } from './track-outcome.js';
import { createUnblocker } from './unblock-fetch.js';

export function probeRow(url, { outcome, httpStatus, layer, html, product }) {
  const { host } = attemptRow({ url, stage: 'add', outcome });
  return {
    host,
    status: httpStatus ?? '-',
    size: html ? `${Math.round(Buffer.byteLength(html) / 1024)} KB` : '-',
    jsonLd: html ? (/<script[^>]+application\/ld\+json/i.test(html) ? 'yes' : 'no') : '-',
    price: product ? `${product.price} ${product.currency ?? ''}`.trim() : '-',
    layer: layer ?? '-',
    outcome,
  };
}

// For a page that came back without a price: what it is and where a price might hide, to help write an adapter.
export function pageHints(html) {
  const title = html.match(/<title[^>]*>([^<]*)/i)?.[1]?.trim() ?? '';
  const scriptIds = [...html.matchAll(/<script[^>]+id=["']([^"']+)/gi)].map((m) => m[1]);
  const windowVars = [...new Set([...html.matchAll(/window(?:\.|\[["'])([\w$]+)["']?\]?\s*=/g)].map((m) => m[1]))];
  const priceBits = [...html.matchAll(/.{0,60}(?:price|fiyat).{0,80}/gi)].slice(0, 8).map((m) => m[0].replace(/\s+/g, ' '));
  const text = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
  const jsonLd = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => {
    let parses = true;
    try {
      JSON.parse(m[1]);
    } catch {
      parses = false;
    }
    return { parses, start: m[1].trim().slice(0, 700) };
  });
  return { title, text, jsonLd, scriptIds: scriptIds.slice(0, 20), windowVars: windowVars.slice(0, 20), priceBits };
}

export function markdownTable(rows) {
  const head = ['Shop', 'HTTP', 'HTML size', 'JSON-LD', 'Price', 'Layer', 'Outcome'];
  const lines = rows.map((r) => [r.host, r.status, r.size, r.jsonLd, r.price, r.layer, r.outcome]);
  return [head, head.map(() => '---'), ...lines].map((cells) => `| ${cells.join(' | ')} |`).join('\n');
}

// Links that read a price in the earlier report and do not now. Links missing from the earlier report are new, not broken.
export function findRegressions(previous, rows) {
  const was = new Map((previous?.rows ?? []).map((r) => [r.url, r.outcome]));
  return rows.filter((r) => was.get(r.url) === 'ok' && r.outcome !== 'ok');
}

export function regressionSection(regressions) {
  if (!regressions.length) return '';
  const lines = regressions.map((r) => `- ${r.host}: read a price last time, now \`${r.outcome}\` (HTTP ${r.status}) ${r.url}`);
  return `### Broken since the last report\n\n${lines.join('\n')}\n`;
}

export function parseUrlList(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/#.*/, '').trim())
    .filter(Boolean);
}

async function main() {
  const args = process.argv.slice(2);
  const urls = args.length ? args : parseUrlList(await readFile(new URL('../probe-urls.txt', import.meta.url), 'utf8'));
  const { db } = createStore();
  const unblocker = process.env.PROBE_API === '0' ? null : createUnblocker({ db });
  const browser = createBrowserReader();
  const rows = [];
  try {
    for (const url of urls) {
      const attempt = await readThroughLayers(url, { retries: 1, browser, unblocker });
      if (attempt.outcome === 'no_price' && attempt.html) console.log(url, JSON.stringify(pageHints(attempt.html), null, 1));
      rows.push({ url, ...probeRow(url, attempt) });
      await sleep(1000);
    }
  } finally {
    await browser.close();
  }
  const ok = rows.filter((r) => r.outcome === 'ok').length;
  const api = unblocker ? 'on' : 'off';
  let previous = null;
  if (process.env.PROBE_PREVIOUS) {
    try {
      previous = JSON.parse(await readFile(process.env.PROBE_PREVIOUS, 'utf8'));
    } catch {
      console.log('No earlier report to compare with.');
    }
  }
  const regressions = findRegressions(previous, rows);
  const rate = rows.length ? Math.round((ok / rows.length) * 100) : 0;
  const report =
    `## Shop probe\n\n${ok} of ${rows.length} links read a price (${rate}%, scraping API ${api}).\n\n${markdownTable(rows)}\n` +
    (regressions.length ? `\n${regressionSection(regressions)}` : '');
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report);
  const json = { date: new Date().toISOString(), api: Boolean(unblocker), ok, total: rows.length, rows };
  await writeFile(process.env.PROBE_REPORT || 'probe-report.json', JSON.stringify(json, null, 2));
  if (regressions.length) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
