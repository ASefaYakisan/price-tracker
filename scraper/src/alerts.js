import { alertText } from './alert-i18n.js';
import { isSuspiciousJump } from './price-sanity.js';

// After each scrape: email everyone whose target price has been reached, once.

// Pure part, easy to test: which open alerts are due given the latest prices.
// Out-of-stock products wait (the alert stays open until they are back);
// unknown stock (null, e.g. crypto or currency rates) counts as in stock.
export function dueAlerts(alerts, latestById) {
  return alerts
    .map((a) => ({ ...a, product: latestById.get(a.product_id) }))
    .filter(
      (a) =>
        a.product?.price != null && a.product.in_stock !== false && Number(a.product.price) <= Number(a.target_price),
    );
}

// Days of daily reads in a row that failed before the owner of an open alert is told (products.failed_checks counts them).
export const DEAD_LINK_AFTER_CHECKS = 7;

// Open alerts on products whose page has not been readable for DEAD_LINK_AFTER_CHECKS reads in a row.
// Only the run that reaches the count exactly returns them, so each alert is told once without a column to remember it;
// a read that works again resets the count (link-status.js).
export function deadLinkAlerts(alerts, productsById, { afterChecks = DEAD_LINK_AFTER_CHECKS } = {}) {
  return alerts
    .map((a) => ({ ...a, product: productsById.get(a.product_id) }))
    .filter((a) => a.product && a.product.failed_checks === afterChecks && a.product.last_error);
}

const READ_FAILURE = {
  no_price: 'no price could be found on the page any more',
  timeout: 'the shop did not answer in time',
  network: 'the page could not be opened',
};

// 'http_error:404' -> "the shop no longer has the page (HTTP 404)"
export function failureReason(code) {
  const [outcome, rawStatus] = String(code).split(':');
  if (outcome !== 'http_error') return READ_FAILURE[outcome] ?? 'the page could not be read';
  const status = Number(rawStatus) || null;
  const text = status === 404 || status === 410 ? 'the shop no longer has the page' : 'the shop blocks or rejects our visits';
  return status ? `${text} (HTTP ${status})` : text;
}

export function deadLinkEmail({ id, manage_token, product, target_price }, siteUrl) {
  const base = siteUrl?.replace(/\/$/, '');
  const removeLink = base && id && manage_token
    ? `${base}/alerts/remove?${new URLSearchParams({ id: String(id), token: manage_token })}`
    : null;
  return {
    ...(removeLink ? { headers: { 'List-Unsubscribe': `<${removeLink}>` } } : {}),
    subject: `We can no longer read the price of ${product.title}`,
    text: [
      `For ${DEAD_LINK_AFTER_CHECKS} days in a row we could not read a price for ${product.title}: ${failureReason(product.last_error)}.`,
      `Your alert (target: ${target_price}) is still open, but it cannot fire until the price can be read again.`,
      '',
      `Check that the link still works: ${product.url}`,
      'If the shop moved the product, add the new link and remove this alert.',
      ...(removeLink ? [`Remove this alert: ${removeLink}`] : []),
      '',
      'You get this email once per alert.',
    ].join('\n'),
  };
}

// The latest reading is already in price_history when alerts run. If it jumped far from the reading before it, it
// is held: the next run compares the new reading with this one, and only a repeated price passes.
async function isHeldBySanity(db, alert) {
  const { data, error } = await db
    .from('price_history')
    .select('price')
    .eq('product_id', alert.product_id)
    .not('price', 'is', null)
    .order('scraped_at', { ascending: false })
    .limit(2);
  if (error || !data || data.length < 2) return false;
  const [latest, previous] = data;
  if (!isSuspiciousJump(previous.price, latest.price)) return false;
  console.warn(`  suspicious price jump: ${alert.product.url} ${previous.price} → ${latest.price}, alert ${alert.id} waits for a second reading`);
  return true;
}

// Unknown or omitted languages use the original English email.
export function alertEmail({ id, manage_token, product, target_price }, siteUrl, lang = 'en') {
  // Without a known currency only the number is written; guessing a currency would put the wrong symbol on a price.
  const fmt = (v) =>
    new Intl.NumberFormat('en-GB', {
      ...(product.currency ? { style: 'currency', currency: product.currency, currencyDisplay: 'narrowSymbol' } : {}),
      maximumFractionDigits: 8,
    }).format(v);
  const t = alertText(lang);
  const values = { title: product.title, price: fmt(product.price), target: fmt(target_price) };
  const fill = (text) => text.replace(/\{(title|price|target)\}/g, (_, key) => values[key]);
  const link = siteUrl ? `${siteUrl.replace(/\/$/, '')}/products/${product.id}` : product.url;
  const removeLink = siteUrl && id && manage_token
    ? `${siteUrl.replace(/\/$/, '')}/alerts/remove?${new URLSearchParams({ id: String(id), token: manage_token })}`
    : null;
  return {
    ...(removeLink ? { headers: { 'List-Unsubscribe': `<${removeLink}>` } } : {}),
    subject: fill(t.subject),
    text: [
      fill(t.body),
      '',
      `${t.history}: ${link}`,
      `${t.source}: ${product.url}`,
      '',
      t.once,
      ...(siteUrl ? [`${t.target}: ${link}#alert`] : []),
      ...(removeLink ? [`${t.remove}: ${removeLink}`] : []),
    ].join('\n'),
  };
}

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SEND_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 3000];
const MAX_RETRY_AFTER_MS = 10000;

// Resend's Retry-After is in seconds; fall back to our own backoff when it is missing or unusable.
function retryDelay(res, attempt) {
  const seconds = Number(res?.headers?.get('retry-after'));
  const fallback = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS.at(-1);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, MAX_RETRY_AFTER_MS) : fallback;
}

// Resend's HTTP API; without a key we only log, so local runs never send mail.
// Rate limits (429), server errors (5xx) and network errors are retried up to SEND_ATTEMPTS times; other 4xx fail at once.
async function sendEmail(to, { subject, text, headers }, sleep = defaultSleep) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`  [dry run] would email ${to}: ${subject}`);
    return false;
  }
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: process.env.ALERT_FROM || 'Price Tracker <onboarding@resend.dev>', to, subject, text, ...(headers ? { headers } : {}) }),
      });
    } catch (err) {
      if (attempt >= SEND_ATTEMPTS) throw err;
      await sleep(retryDelay(null, attempt));
      continue;
    }
    if (res.ok) return true;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= SEND_ATTEMPTS) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    await sleep(retryDelay(res, attempt));
  }
}

// sleep and gapMs are options so tests need no real waiting; gapMs spaces the mails to stay under Resend's rate limit.
export async function processAlerts(db, { siteUrl = process.env.SITE_URL, sleep = defaultSleep, gapMs = 600 } = {}) {
  const columns = 'id, product_id, email, target_price, manage_token';
  let { data: alerts, error } = await db.from('alerts').select(`${columns}, lang`).is('last_sent_at', null);
  // Migration 0012 (lang column) not applied yet: keep sending, in English.
  if (error) ({ data: alerts, error } = await db.from('alerts').select(columns).is('last_sent_at', null));
  if (error) throw error;
  if (!alerts.length) return { checked: 0, sent: 0, failed: 0 };

  const ids = [...new Set(alerts.map((a) => a.product_id))];
  const { data: latest, error: latestError } = await db
    .from('product_latest')
    .select('id, title, url, currency, price, in_stock')
    .in('id', ids);
  if (latestError) throw latestError;

  let sent = 0;
  let failed = 0;
  for (const alert of dueAlerts(alerts, new Map(latest.map((p) => [p.id, p])))) {
    try {
      if (await isHeldBySanity(db, alert)) continue;
      if (sent + failed > 0) await sleep(gapMs);
      if (!(await sendEmail(alert.email, alertEmail(alert, siteUrl, alert.lang ?? 'en'), sleep))) continue;
      const { error: markError } = await db.from('alerts').update({ last_sent_at: new Date().toISOString() }).eq('id', alert.id);
      if (markError) throw markError;
      sent++;
    } catch (err) {
      failed++;
      console.error(`  alert ${alert.id} failed: ${err.message ?? err}`);
    }
  }
  const notified = await notifyDeadLinks(db, alerts, ids, siteUrl);
  if (notified) console.log(`  ${notified} dead-link notices sent`);
  return { checked: alerts.length, sent, failed };
}

// A failure here never undoes the price-drop emails that were already sent.
async function notifyDeadLinks(db, alerts, productIds, siteUrl) {
  let notified = 0;
  try {
    const { data, error } = await db.from('products').select('id, url, title, failed_checks, last_error').in('id', productIds);
    if (error) throw error;
    for (const alert of deadLinkAlerts(alerts, new Map(data.map((p) => [p.id, p])))) {
      try {
        if (await sendEmail(alert.email, deadLinkEmail(alert, siteUrl))) notified++;
      } catch (err) {
        console.error(`  dead-link notice for alert ${alert.id} failed: ${err.message ?? err}`);
      }
    }
  } catch (err) {
    console.error(`  dead-link check failed: ${err.message ?? err}`);
  }
  return notified;
}
