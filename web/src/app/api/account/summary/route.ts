import { buildSummary } from "@/lib/account-summary";
import { currentUser } from "@/lib/supabase/server";

// GET -> counts for the profile page: list size, alerts and how much of each limit is used. Runs as the user.
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ ok: false, error: "Sign in to see your account." }, { status: 401 });
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count, () => null);
  const [listed, alertsTotal, alertsActive, ownedLinks, recentLinks] = await Promise.all([
    count(user.db.from("user_products").select("product_id", { count: "exact", head: true })),
    count(user.db.from("alerts").select("id", { count: "exact", head: true })),
    count(user.db.from("alerts").select("id", { count: "exact", head: true }).is("sent_at", null)),
    count(user.db.from("products").select("id", { count: "exact", head: true }).eq("added_by", user.id)),
    count(user.db.from("products").select("id", { count: "exact", head: true }).eq("added_by", user.id).gte("created_at", hourAgo)),
  ]);
  return Response.json(
    { ok: true, summary: buildSummary({ listed, alertsActive, alertsTotal, ownedLinks, recentLinks }) },
    { headers: { "cache-control": "private, no-store" } },
  );
}
