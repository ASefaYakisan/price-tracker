import { currentUser } from "@/lib/supabase/server";

// GET -> the signed-in account's own data as a JSON download (email, alerts, list). Runs as the user, so RLS applies.
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ ok: false, error: "Sign in to download your data." }, { status: 401 });
  const [alerts, list] = await Promise.all([
    user.db.from("alerts").select("*").order("created_at", { ascending: false }).limit(1000),
    user.db.from("user_products").select("product_id, created_at").order("created_at", { ascending: false }).limit(5000),
  ]);
  if (alerts.error || list.error) return Response.json({ ok: false, error: "Could not prepare your data." }, { status: 500 });
  const ids = [...new Set([...(alerts.data ?? []).map((a) => a.product_id), ...(list.data ?? []).map((l) => l.product_id)])];
  const titles = new Map<number, { title: string; url: string }>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await user.db.from("products").select("id, title, url").in("id", ids.slice(i, i + 200));
    for (const p of data ?? []) titles.set(p.id, { title: p.title, url: p.url });
  }
  const withItem = <T extends { product_id: number }>(row: T) => ({ ...row, item: titles.get(row.product_id) ?? null });
  const body = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    // The secret manage token is left out on purpose.
    alerts: (alerts.data ?? []).map((row) => withItem(Object.fromEntries(Object.entries(row).filter(([k]) => k !== "manage_token")) as typeof row)),
    list: (list.data ?? []).map(withItem),
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="price-tracker-my-data.json"',
      "cache-control": "private, no-store",
    },
  });
}
