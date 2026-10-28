import { adminDb } from "@/lib/alerts-server";
import { currentUser } from "@/lib/supabase/server";
import { isAdminEmail, linkSuccessRate, type UsageStats } from "@/lib/usage-stats";

// Owner-only usage counts. Anyone else gets a plain 404 so the endpoint is not advertised.
export async function GET() {
  const user = await currentUser();
  if (!isAdminEmail(user?.email)) return new Response("Not found", { status: 404 });
  const db = adminDb();
  if (!db) return Response.json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not set." }, { status: 503 });
  const { data, error } = await db.rpc("usage_stats");
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  const stats = data as UsageStats;
  return Response.json({ ok: true, ...stats, link_success_rate_7d: linkSuccessRate(stats) }, { headers: { "Cache-Control": "no-store" } });
}
