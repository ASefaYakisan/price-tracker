import { isDemo } from "@/lib/data";
import { adminDb, alertError as error, EMAIL, UUID } from "@/lib/alerts-server";
import { currentUser } from "@/lib/supabase/server";

async function parse(request: Request, ctx: RouteContext<"/api/alerts/[id]">) {
  const id = Number((await ctx.params).id);
  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? "");
  return { id, token, body, valid: Number.isInteger(id) && id > 0 };
}

// An alert can be changed by whoever holds its manage token, or by the account that owns it.
// The token path uses the server key; the account path runs as the user under row level security.
async function scoped(id: number, token: string) {
  if (UUID.test(token)) {
    const admin = adminDb();
    return admin ? { db: admin, filter: { id, manage_token: token } } : null;
  }
  const user = await currentUser();
  return user ? { db: user.db, filter: { id } } : null;
}

// Change the target or email. Saving also re-arms an alert that already sent its email.
export async function PATCH(request: Request, ctx: RouteContext<"/api/alerts/[id]">) {
  const { id, token, body, valid } = await parse(request, ctx);
  if (!valid) return error("This alert can't be changed from here.", 404);
  const email = String(body?.email ?? "").trim();
  const target = Number(body?.targetPrice);
  if (!EMAIL.test(email) || email.length > 254) return error("Enter a valid email address.");
  if (!Number.isFinite(target) || target <= 0) return error("Enter a target price above zero.");
  if (isDemo) return Response.json({ ok: true, demo: true });

  const scope = await scoped(id, token);
  if (!scope) return error("This alert can't be changed from here.", 404);
  const { data, error: dbError } = await scope.db
    .from("alerts")
    .update({ email, target_price: target, last_sent_at: null })
    .match(scope.filter)
    .select("id")
    .maybeSingle();
  if (dbError?.code === "23505") return error("You already have another alert on this item for that email.", 409);
  if (dbError) return error("Could not save the change. Please try again.", 500);
  if (!data) return error("This alert no longer exists.", 404);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/alerts/[id]">) {
  const { id, token, valid } = await parse(request, ctx);
  if (!valid) return error("This alert can't be deleted from here.", 404);
  if (isDemo) return Response.json({ ok: true, demo: true });

  const scope = await scoped(id, token);
  if (!scope) return error("This alert can't be deleted from here.", 404);
  const { error: dbError } = await scope.db.from("alerts").delete().match(scope.filter);
  if (dbError) return error("Could not delete the alert. Please try again.", 500);
  // Already gone counts as deleted.
  return Response.json({ ok: true });
}
