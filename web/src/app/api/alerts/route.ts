import { isDemo } from "@/lib/data";
import { alertError as error, EMAIL, escapeLike, missingColumn } from "@/lib/alerts-server";
import { currentUser } from "@/lib/supabase/server";
import { parseDirection } from "@/lib/alert-direction";
import { LOCALES } from "@/i18n/config";
import { accountAlertEmail } from "@/lib/alert-email";

// Price-drop signup for the signed-in account. Returns the alert's id and manage token.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const productId = Number(body?.productId);
  const requestedEmail = String(body?.email ?? "").trim();
  const target = Number(body?.targetPrice);
  // Language of the page the alert was created on; anything unknown is stored as null (English email).
  const lang = typeof body?.lang === "string" && body.lang in LOCALES ? body.lang : null;

  // "below" (default): at or below the target; "above": at or above it.
  const direction = parseDirection(body?.direction);

  if (!direction) return error("Choose whether to be alerted at or below or at or above the target.");
  if (!Number.isInteger(productId) || productId <= 0) return error("Unknown item.");
  if (!Number.isFinite(target) || target <= 0) return error("Enter a target price above zero.");

  if (isDemo) {
    if (!EMAIL.test(requestedEmail) || requestedEmail.length > 254) return error("Enter a valid email address.");
    return Response.json({ ok: true, demo: true, id: Date.now(), token: crypto.randomUUID() });
  }

  const user = await currentUser();
  if (user) {
    const email = accountAlertEmail(user.email, requestedEmail);
    if (email === null) return error("Alerts can only be sent to your account email.");
    if (!EMAIL.test(email) || email.length > 254) return error("Enter a valid email address.");
    // Signed in: the alert belongs to the account. Runs as the user, so row level security checks ownership.
    // "below" is the column's default, so it is only written for "above": a database without the column keeps working.
    const row = { product_id: productId, email, target_price: target, user_id: user.id, ...(direction === "above" ? { direction } : {}) };
    let { data, error: dbError } = await user.db.from("alerts").insert({ ...row, lang }).select("id, manage_token").single();
    // Column missing (migration 0012 not applied yet): save the alert without the language.
    if (missingColumn(dbError))
      ({ data, error: dbError } = await user.db.from("alerts").insert(row).select("id, manage_token").single());
    // Still missing: the direction column (migration 0014). Never save a rise alert as a drop alert.
    if (direction === "above" && missingColumn(dbError)) return error("Alerts for a price rise are not available yet.", 503);
    if (dbError?.code === "23505") {
      // Setting the same item and address again replaces the target and its direction.
      let update = await user.db
        .from("alerts")
        .update({ target_price: target, direction })
        .eq("product_id", productId)
        .ilike("email", escapeLike(email))
        .is("last_sent_at", null)
        .select("id, manage_token");
      if (direction === "below" && missingColumn(update.error))
        update = await user.db
          .from("alerts")
          .update({ target_price: target })
          .eq("product_id", productId)
          .ilike("email", escapeLike(email))
          .is("last_sent_at", null)
          .select("id, manage_token");
      if (direction === "above" && missingColumn(update.error)) return error("Alerts for a price rise are not available yet.", 503);
      const updated = update.data;
      if (!updated?.length) return error("This email already has an alert on this item.", 409);
      return Response.json({ ok: true, updated: true, account: true, id: updated[0].id, token: updated[0].manage_token });
    }
    if (dbError?.message === "alert_email_not_owner") return error("Alerts can only be sent to your account email.");
    if (dbError?.message === "alert_limit_total")
      return error("Your account already has the maximum number of alerts. Delete some first.", 429);
    if (dbError?.message === "alert_limit_hourly")
      return error("You created many alerts in the last hour. Try again later.", 429);
    if (dbError) return error("Could not save the alert. Please try again.", 500);
    return Response.json({ ok: true, account: true, id: data!.id, token: data!.manage_token });
  }

  // Alerts belong to accounts: guests are asked to sign in first.
  return error("Sign in to create an alert.", 401);
}
