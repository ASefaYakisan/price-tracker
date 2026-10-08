import { getProduct, isDemo } from "@/lib/data";
import type { AlertStatus } from "@/lib/alert-status";
import { adminDb, ALERT_COLUMNS, alertError as error, EMAIL, escapeLike, toStatus, UUID } from "@/lib/alerts-server";

type Ask = { id?: number; token?: string; productId?: number; email?: string };

// Live status for the alerts this browser created: current price, whether the email went out.
// Each alert is found by its id and manage token. Alerts saved before tokens existed are found
// once by item and email (only while still open) and get their token handed back.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const asks: Ask[] = Array.isArray(body?.alerts) ? body.alerts.slice(0, 50) : [];
  if (!asks.length) return Response.json({ ok: true, alerts: [] });

  const admin = isDemo ? null : adminDb();
  if (!isDemo && !admin) return error("Alert status is not available right now.", 503);

  const alerts: AlertStatus[] = await Promise.all(
    asks.map(async (ask, i): Promise<AlertStatus> => {
      const key = String(i);
      if (isDemo) return demoStatus(key, ask);
      let q = admin!.from("alerts").select(ALERT_COLUMNS);
      if (Number.isInteger(ask.id) && UUID.test(String(ask.token))) q = q.eq("id", ask.id!).eq("manage_token", ask.token!);
      else if (Number.isInteger(ask.productId) && EMAIL.test(String(ask.email)))
        q = q.eq("product_id", ask.productId!).ilike("email", escapeLike(ask.email!)).is("last_sent_at", null);
      else return { key, missing: true };
      const { data } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!data) return { key, missing: true };
      return toStatus(key, data);
    }),
  );
  return Response.json({ ok: true, alerts });
}

async function demoStatus(key: string, ask: Ask): Promise<AlertStatus> {
  const product = await getProduct(Number(ask.productId));
  if (!product) return { key, missing: true };
  const b = ask as Ask & { target?: number; createdAt?: string };
  return {
    key,
    id: Number(ask.id) || 0,
    token: String(ask.token ?? ""),
    productId: product.id,
    email: String(ask.email ?? ""),
    target: Number(b.target) || 0,
    sentAt: null,
    createdAt: b.createdAt ?? new Date().toISOString(),
    title: product.title,
    source: product.source,
    imageUrl: product.image_url,
    currency: product.currency,
    price: product.price,
  };
}
