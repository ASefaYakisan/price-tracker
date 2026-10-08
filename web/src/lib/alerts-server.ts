import { createClient } from "@supabase/supabase-js";
import type { AlertStatus } from "@/lib/alert-status";
import { getProduct } from "@/lib/data";

export const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// An alert row joined with its item's latest price, in the shape the alerts page shows.
export async function toStatus(key: string, row: AlertRow): Promise<AlertStatus> {
  const product = await getProduct(Number(row.product_id));
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
  };
}
