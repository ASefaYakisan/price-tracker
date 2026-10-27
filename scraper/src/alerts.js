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

// lang: the alert's saved site language (alert.lang). English is the only text so far; the languages are added with
// the alert-i18n texts, and an unknown language falls back to English.
export function alertEmail({ id, manage_token, product, target_price }, siteUrl, lang = 'en') {
  const fmt = (v) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: product.currency ?? 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 8 }).format(v);
  const link = siteUrl ? `${siteUrl.replace(/\/$/, '')}/products/${product.id}` : product.url;
  const removeLink = siteUrl && id && manage_token
    ? `${siteUrl.replace(/\/$/, '')}/alerts/remove?${new URLSearchParams({ id: String(id), token: manage_token })}`
    : null;
  return {
    ...(removeLink ? { headers: { 'List-Unsubscribe': `<${removeLink}>` } } : {}),
    subject: `Price alert: ${product.title} is now ${fmt(product.price)}`,
    text: [
      `${product.title} dropped to ${fmt(product.price)} (your target: ${fmt(target_price)}).`,
      '',
      `Price history: ${link}`,
      `Source: ${product.url}`,
      '',
      'You get this email once per alert. Create a new alert on the product page to track it again.',
      ...(siteUrl ? [`Set or change a target: ${link}#alert`] : []),
      ...(removeLink ? [`Remove this alert: ${removeLink}`] : []),
    ].join('\n'),
  };
}

// Resend's HTTP API; without a key we only log, so local runs never send mail.
async function sendEmail(to, { subject, text, headers }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`  [dry run] would email ${to}: ${subject}`);
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.ALERT_FROM || 'Price Tracker <onboarding@resend.dev>', to, subject, text, ...(headers ? { headers } : {}) }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return true;
}

export async function processAlerts(db, { siteUrl = process.env.SITE_URL } = {}) {
  const columns = 'id, product_id, email, target_price, manage_token';
  let { data: alerts, error } = await db.from('alerts').select(`${columns}, lang`).is('last_sent_at', null);
  // Migration 0012 (lang column) not applied yet: keep sending, in English.
  if (error) ({ data: alerts, error } = await db.from('alerts').select(columns).is('last_sent_at', null));
  if (error) throw error;
  if (!alerts.length) return { checked: 0, sent: 0 };

  const ids = [...new Set(alerts.map((a) => a.product_id))];
  const { data: latest, error: latestError } = await db
    .from('product_latest')
    .select('id, title, url, currency, price, in_stock')
    .in('id', ids);
  if (latestError) throw latestError;

  let sent = 0;
  for (const alert of dueAlerts(alerts, new Map(latest.map((p) => [p.id, p])))) {
    try {
      if (await isHeldBySanity(db, alert)) continue;
      if (!(await sendEmail(alert.email, alertEmail(alert, siteUrl, alert.lang ?? 'en')))) continue;
      const { error: markError } = await db.from('alerts').update({ last_sent_at: new Date().toISOString() }).eq('id', alert.id);
      if (markError) throw markError;
      sent++;
    } catch (err) {
      console.error(`  alert ${alert.id} failed: ${err.message ?? err}`);
    }
  }
  return { checked: alerts.length, sent };
}
