import { createClient } from "@supabase/supabase-js";
import type { AlertStatus } from "@/lib/alert-status";
import { getProduct, type ProductRow } from "@/lib/data";
import { lastReadFailed } from "@/lib/link-status";

export const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export { UUID } from "@/lib/alert-lookup";

// Server-only client. Visitors can insert alerts but never read them, so anything that
// reads or changes an alert goes through here and checks the alert's manage token.
export function adminDb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
}

export const escapeLike = (s: string) => s.replace(/[%_\\]/g, "\\$&");

export function alertError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}

export const ALERT_COLUMNS = "id, manage_token, product_id, email, target_price, last_sent_at, created_at";

type AlertRow = {
  id: number;
  manage_token: string;
  product_id: number;
  email: string;
  target_price: number | string;
  last_sent_at: string | null;
  created_at: string;
};

// The alert's item. Whoever holds the alert (it was found by its id and token, or belongs to the signed-in account)
// sees that item even when it is a pasted link, which the shared read does not return.
async function alertProduct(id: number) {
  const shared = await getProduct(id);
  if (shared) return shared;
  const { data } = (await adminDb()?.from("product_latest").select("*").eq("id", id).maybeSingle()) ?? {};
  return data ? ({ ...data, price: data.price == null ? null : Number(data.price) } as ProductRow) : null;
}

// An alert row joined with its item's latest price, in the shape the alerts page shows.
export async function toStatus(key: string, row: AlertRow): Promise<AlertStatus> {
  const product = await alertProduct(Number(row.product_id));
  return {
    key,
    id: Number(row.id),
    token: row.manage_token,
    productId: Number(row.product_id),
    email: row.email,
    target: Number(row.target_price),
    sentAt: row.last_sent_at,
    createdAt: row.created_at,
    title: product?.title ?? "Removed item",
    source: product?.source ?? "",
    imageUrl: product?.image_url ?? null,
    currency: product?.currency ?? null,
    price: product?.price ?? null,
    readError: product && lastReadFailed(product) ? product.last_error! : null,
  };
}
