// After each scrape: email everyone whose target price has been reached, once.

// Pure part, easy to test: which open alerts are due given the latest prices.
export function dueAlerts(alerts, latestById) {
  return alerts
    .map((a) => ({ ...a, product: latestById.get(a.product_id) }))
    .filter((a) => a.product?.price != null && Number(a.product.price) <= Number(a.target_price));
}

export function alertEmail({ product, target_price }, siteUrl) {
  const fmt = (v) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: product.currency ?? 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 8 }).format(v);
  const link = siteUrl ? `${siteUrl.replace(/\/$/, '')}/products/${product.id}` : product.url;
  return {
    subject: `Price alert: ${product.title} is now ${fmt(product.price)}`,
    text: [
      `${product.title} dropped to ${fmt(product.price)} (your target: ${fmt(target_price)}).`,
      '',
      `Price history: ${link}`,
      `Source: ${product.url}`,
      '',
      'You get this email once per alert. Create a new alert on the product page to track it again.',
    ].join('\n'),
  };
}

// Resend's HTTP API; without a key we only log, so local runs never send mail.
async function sendEmail(to, { subject, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`  [dry run] would email ${to}: ${subject}`);
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.ALERT_FROM ?? 'Price Tracker <onboarding@resend.dev>', to, subject, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return true;
}

export async function processAlerts(db, { siteUrl = process.env.SITE_URL } = {}) {
  const { data: alerts, error } = await db.from('alerts').select('id, product_id, email, target_price').is('last_sent_at', null);
  if (error) throw error;
  if (!alerts.length) return { checked: 0, sent: 0 };

  const ids = [...new Set(alerts.map((a) => a.product_id))];
  const { data: latest, error: latestError } = await db
    .from('product_latest')
    .select('id, title, url, currency, price')
    .in('id', ids);
  if (latestError) throw latestError;

  let sent = 0;
  for (const alert of dueAlerts(alerts, new Map(latest.map((p) => [p.id, p])))) {
    try {
      if (!(await sendEmail(alert.email, alertEmail(alert, siteUrl)))) continue;
      const { error: markError } = await db.from('alerts').update({ last_sent_at: new Date().toISOString() }).eq('id', alert.id);
      if (markError) throw markError;
      sent++;
    } catch (err) {
      console.error(`  alert ${alert.id} failed: ${err.message ?? err}`);
    }
  }
  return { checked: alerts.length, sent };
}
