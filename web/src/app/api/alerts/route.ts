import { createClient } from "@supabase/supabase-js";
import { isDemo } from "@/lib/data";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Price-drop signup. The anon key can insert alerts (RLS) but never read them back.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const productId = Number(body?.productId);
  const email = String(body?.email ?? "").trim();
  const target = Number(body?.targetPrice);

  if (!Number.isInteger(productId) || productId <= 0) return error("Unknown item.");
  if (!EMAIL.test(email) || email.length > 254) return error("Enter a valid email address.");
  if (!Number.isFinite(target) || target <= 0) return error("Enter a target price above zero.");

  if (isDemo) return Response.json({ ok: true, demo: true });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error: dbError } = await db.from("alerts").insert({ product_id: productId, email, target_price: target });
  if (dbError?.code === "23505") {
    // Same item and address: move the target instead of refusing. Needs the server-side key,
    // because visitors can only insert alerts, never change them.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return error("You already have an alert on this item.", 409);
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } });
    const { error: updateError } = await admin
      .from("alerts")
      .update({ target_price: target })
      .eq("product_id", productId)
      .ilike("email", email.replace(/[%_\\]/g, "\\$&"))
      .is("last_sent_at", null);
    if (updateError) return error("Could not update the alert. Please try again.", 500);
    return Response.json({ ok: true, updated: true });
  }
  if (dbError) return error("Could not save the alert. Please try again.", 500);
  return Response.json({ ok: true });
}

function error(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}
