import { getMyProducts, getSparklines } from "@/lib/data";
import { currentUser } from "@/lib/supabase/server";

// GET -> { ids, items, sparklines }: the signed-in visitor's list. Runs as that user, so row level security returns only their rows.
// Pasted links are not in the shared lists on the home page; this is the only place they are listed.
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ ok: false, error: "Sign in to keep your own list." }, { status: 401 });
  try {
    const { data, error } = await user.db.from("user_products").select("product_id").limit(5000);
    if (error) throw new Error(error.message);
    const ids = data.map((row) => Number(row.product_id));
    const items = await getMyProducts(user.db, ids);
    const sparklines = await getSparklines(items.map((p) => p.id));
    return Response.json({ ok: true, ids, items, sparklines });
  } catch {
    return Response.json({ ok: false, error: "Could not update your list. Please try again." }, { status: 500 });
  }
}
