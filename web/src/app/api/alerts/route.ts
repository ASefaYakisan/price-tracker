import { createClient } from "@supabase/supabase-js";
import { isDemo } from "@/lib/data";
import { adminDb, alertError as error, EMAIL, escapeLike } from "@/lib/alerts-server";
import { currentUser } from "@/lib/supabase/server";

// Price-drop signup. Returns the alert's id and manage token so this browser can edit or delete it later.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const productId = Number(body?.productId);
  const email = String(body?.email ?? "").trim();
  const target = Number(body?.targetPrice);

  if (!Number.isInteger(productId) || productId <= 0) return error("Unknown item.");
  if (!EMAIL.test(email) || email.length > 254) return error("Enter a valid email address.");
  if (!Number.isFinite(target) || target <= 0) return error("Enter a target price above zero.");

  if (isDemo) return Response.json({ ok: true, demo: true, id: Date.now(), token: crypto.randomUUID() });

  const user = await currentUser();
  if (user) {
    // Signed in: the alert belongs to the account. Runs as the user, so row level security checks ownership.
    const { data, error: dbError } = await user.db
      .from("alerts")
      .insert({ product_id: productId, email, target_price: target, user_id: user.id })
      .select("id, manage_token")
      .single();
    if (dbError?.code === "23505") {
      const { data: updated } = await user.db
        .from("alerts")
        .update({ target_price: target })
        .eq("product_id", productId)
        .ilike("email", escapeLike(email))
        .is("last_sent_at", null)
        .select("id, manage_token");
      if (!updated?.length) return error("This email already has an alert on this item.", 409);
      return Response.json({ ok: true, updated: true, account: true, id: updated[0].id, token: updated[0].manage_token });
    }
    if (dbError) return error("Could not save the alert. Please try again.", 500);
    return Response.json({ ok: true, account: true, id: data.id, token: data.manage_token });
  }

  const admin = adminDb();
  if (!admin) {
    // Without the server key we can still sign people up, just not hand back a way to manage the alert.
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error: dbError } = await db.from("alerts").insert({ product_id: productId, email, target_price: target });
    if (dbError?.code === "23505") return error("You already have an alert on this item.", 409);
    if (dbError) return error("Could not save the alert. Please try again.", 500);
    return Response.json({ ok: true });
  }

  const { data, error: dbError } = await admin
    .from("alerts")
    .insert({ product_id: productId, email, target_price: target })
    .select("id, manage_token")
    .single();
  if (dbError?.code === "23505") {
    // Same item and address: move the target instead of refusing.
    const { data: updated, error: updateError } = await admin
      .from("alerts")
      .update({ target_price: target })
      .eq("product_id", productId)
      .ilike("email", escapeLike(email))
      .is("last_sent_at", null)
      .select("id, manage_token")
      .single();
    if (updateError) return error("Could not update the alert. Please try again.", 500);
    return Response.json({ ok: true, updated: true, id: updated.id, token: updated.manage_token });
  }
  if (dbError) return error("Could not save the alert. Please try again.", 500);
  return Response.json({ ok: true, id: data.id, token: data.manage_token });
}
