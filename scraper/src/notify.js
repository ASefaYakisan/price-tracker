// Optional outputs after each run: a Telegram digest of price drops and a Google Sheets copy.
// Each one switches on when its secrets exist and is skipped (with a log line) otherwise.
import { createSign } from 'node:crypto';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

export async function loadLatest(db) {
  const { data, error } = await db
    .from('product_latest')
    .select('id, source, title, url, currency, price, previous_price, in_stock, scraped_at')
    .order('source')
    .order('title');
  if (error) throw error;
  return data.map((r) => ({
    ...r,
    price: r.price == null ? null : Number(r.price),
    previous_price: r.previous_price == null ? null : Number(r.previous_price),
  }));
}

// ---------- Telegram ----------

// Drops of at least minPct since the previous scrape, biggest first.
export function priceDrops(rows, minPct = 2) {
  return rows
    .filter((r) => r.price != null && r.previous_price > 0)
    .map((r) => ({ ...r, pct: ((r.price - r.previous_price) / r.previous_price) * 100 }))
    .filter((r) => r.pct <= -minPct)
    .sort((a, b) => a.pct - b.pct);
}

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function telegramDigest(drops, { siteUrl, limit = 15 } = {}) {
  if (!drops.length) return null;
  const fmt = (v, c) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: c ?? 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: v < 1 ? 6 : 2 }).format(v);
  const lines = drops.slice(0, limit).map((d) => {
    const link = siteUrl ? `${siteUrl.replace(/\/$/, '')}/products/${d.id}` : d.url;
    return `▼ ${d.pct.toFixed(1)}%  <a href="${escapeHtml(link)}">${escapeHtml(d.title)}</a>\n     ${fmt(d.previous_price, d.currency)} → <b>${fmt(d.price, d.currency)}</b>`;
  });
  const more = drops.length > limit ? `\n…and ${drops.length - limit} more` : '';
  return `<b>📉 ${drops.length} price drop${drops.length === 1 ? '' : 's'} today</b>\n\n${lines.join('\n')}${more}`;
}

export async function sendTelegram(rows, env = process.env) {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = env;
  if (!token || !chatId) return 'skipped (no TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)';
  const text = telegramDigest(priceDrops(rows, Number(env.TELEGRAM_MIN_DROP ?? 2)), { siteUrl: env.SITE_URL });
  if (!text) return 'no drops to report';
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
  return 'sent';
}

// ---------- Google Sheets ----------

export function sheetRows(rows, scrapedAt) {
  return {
    latest: [
      ['Product', 'Source', 'Price', 'Previous price', 'Change %', 'Currency', 'In stock', 'Scraped at', 'URL'],
      ...rows.map((r) => [
        r.title,
        r.source,
        r.price,
        r.previous_price,
        r.price != null && r.previous_price > 0 ? Number((((r.price - r.previous_price) / r.previous_price) * 100).toFixed(2)) : null,
        r.currency,
        r.in_stock === false ? 'no' : 'yes',
        r.scraped_at,
        r.url,
      ]),
    ],
    history: rows.filter((r) => r.price != null).map((r) => [scrapedAt, r.title, r.source, r.price, r.currency]),
  };
}

const b64url = (s) => Buffer.from(s).toString('base64url');

async function googleToken({ client_email, private_key }) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(
    JSON.stringify({ iss: client_email, scope: SHEETS_SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }),
  )}`;
  const assertion = `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(private_key, 'base64url')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new Error(`Google auth ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

export async function syncSheet(rows, scrapedAt, env = process.env) {
  const { GOOGLE_SERVICE_ACCOUNT_JSON: credentials, GOOGLE_SHEET_ID: sheetId } = env;
  if (!credentials || !sheetId) return 'skipped (no GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_SHEET_ID)';
  const token = await googleToken(JSON.parse(credentials));
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
  const call = async (path, method = 'GET', body) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: body && JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Sheets ${res.status}: ${await res.text()}`);
    return res.json();
  };

  // Create the two tabs on first use.
  const { sheets } = await call('?fields=sheets.properties.title');
  const missing = ['Latest', 'History'].filter((t) => !sheets.some((s) => s.properties.title === t));
  if (missing.length) await call(':batchUpdate', 'POST', { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) });

  const { latest, history } = sheetRows(rows, scrapedAt);
  // RAW input: cell text is never evaluated as a formula.
  await call('/values/Latest:clear', 'POST', {});
  await call('/values/Latest!A1?valueInputOption=RAW', 'PUT', { values: latest });
  if (missing.includes('History')) await call('/values/History!A1?valueInputOption=RAW', 'PUT', { values: [['Scraped at', 'Product', 'Source', 'Price', 'Currency']] });
  await call('/values/History!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', 'POST', { values: history });
  return `wrote ${latest.length - 1} rows`;
}
