// Shop probe: opens sample product links and reports, per shop, how far reading got.
// `npm run probe` reads probe-urls.txt; `npm run probe -- <url> <url>` checks just those links.
// On GitHub Actions the table also goes to the job summary.
import { appendFile, readFile } from 'node:fs/promises';
import { readLink } from './adapters/custom.js';
import { sleep } from './fetch.js';
import { attemptRow } from './track-outcome.js';

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

export function markdownTable(rows) {
  const head = ['Shop', 'HTTP', 'HTML size', 'JSON-LD', 'Price', 'Layer', 'Outcome'];
  const lines = rows.map((r) => [r.host, r.status, r.size, r.jsonLd, r.price, r.layer, r.outcome]);
  return [head, head.map(() => '---'), ...lines].map((cells) => `| ${cells.join(' | ')} |`).join('\n');
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
  const rows = [];
  for (const url of urls) {
    rows.push(probeRow(url, await readLink(url, { retries: 1 })));
    await sleep(1000);
  }
  const ok = rows.filter((r) => r.outcome === 'ok').length;
  const report = `## Shop probe\n\n${ok} of ${rows.length} links read a price.\n\n${markdownTable(rows)}\n`;
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
