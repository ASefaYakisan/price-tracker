import { revalidateTag } from "next/cache";
import { adminDb } from "@/lib/alerts-server";
import { shouldDropProduct } from "@/lib/lists";
import { currentUser } from "@/lib/supabase/server";

const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status });

// Runs as the signed-in visitor, so row level security keeps everyone to their own list.
async function listRow(id: number) {
  const user = await currentUser();
  if (!user || !Number.isInteger(id)) return null;
  const { data } = await user.db.from("user_products").select("product_id").eq("product_id", id).maybeSingle();
  return { user, inList: Boolean(data) };
}

// GET -> { inList }
export async function GET(_request: Request, { params }: RouteContext<"/api/track/[id]">) {
  const row = await listRow(Number((await params).id));
  return Response.json({ ok: true, inList: Boolean(row?.inList) });
}

// POST -> adds an item that is already tracked to the visitor's list.
export async function POST(_request: Request, { params }: RouteContext<"/api/track/[id]">) {
  const id = Number((await params).id);
  const row = await listRow(id);
  if (!row) return fail("Sign in to keep your own list.", 401);
  if (!row.inList) {
    const { error } = await row.user.db.from("user_products").insert({ user_id: row.user.id, product_id: id });
    if (error) return fail("Could not update your list. Please try again.", 500);
  }
  return Response.json({ ok: true, inList: true });
}

// DELETE -> removes the item from the visitor's list only. Other people's lists, the price history and alerts stay;
// a link left with no followers and no alerts stops being checked.
export async function DELETE(_request: Request, { params }: RouteContext<"/api/track/[id]">) {
  const id = Number((await params).id);
  const row = await listRow(id);
  if (!row) return fail("Sign in to keep your own list.", 401);
  const { error } = await row.user.db.from("user_products").delete().eq("product_id", id);
  if (error) return fail("Could not update your list. Please try again.", 500);

  const admin = adminDb();
  let dropped = false;
  if (admin) {
    const [product, followers, alerts] = await Promise.all([
      admin.from("products").select("source").eq("id", id).maybeSingle(),
      admin.from("user_products").select("product_id", { count: "exact", head: true }).eq("product_id", id),
      admin.from("alerts").select("id", { count: "exact", head: true }).eq("product_id", id),
    ]);
    // A failed count is null, and null never drops anything.
    if (product.data && shouldDropProduct({ source: product.data.source, followers: followers.count, alerts: alerts.count })) {
      dropped = !(await admin.from("products").delete().eq("id", id)).error;
      revalidateTag("products", { expire: 0 });
    }
  }
  return Response.json({ ok: true, inList: false, dropped });
}
