import { currentUser } from "@/lib/supabase/server";

// GET -> { ids }: the items in the signed-in visitor's list. Runs as that user, so row level security returns only their rows.
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ ok: false, error: "Sign in to keep your own list." }, { status: 401 });
  const { data, error } = await user.db.from("user_products").select("product_id").limit(5000);
  if (error) return Response.json({ ok: false, error: "Could not update your list. Please try again." }, { status: 500 });
  return Response.json({ ok: true, ids: data.map((row) => Number(row.product_id)) });
}
