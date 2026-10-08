import { adminDb, alertError as error, UUID } from "@/lib/alerts-server";
import { currentUser } from "@/lib/supabase/server";

// Move alerts made in this browser as a guest into the signed-in account.
// Each one must come with its manage token, and only ownerless alerts can be claimed.
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return error("Sign in first.", 401);
  const body = await request.json().catch(() => null);
  const asks: { id?: number; token?: string }[] = Array.isArray(body?.alerts) ? body.alerts.slice(0, 50) : [];
  const valid = asks.filter((a) => Number.isInteger(a.id) && UUID.test(String(a.token)));
  if (!valid.length) return Response.json({ ok: true, claimed: 0 });

  const admin = adminDb();
  if (!admin) return error("Saving alerts to your account is not available right now.", 503);
  let claimed = 0;
  for (const a of valid) {
    const { data } = await admin
      .from("alerts")
      .update({ user_id: user.id })
      .eq("id", a.id!)
      .eq("manage_token", a.token!)
      .is("user_id", null)
      .select("id");
    claimed += data?.length ?? 0;
  }
  return Response.json({ ok: true, claimed });
}
