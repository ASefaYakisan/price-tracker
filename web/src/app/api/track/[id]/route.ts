import { revalidateTag } from "next/cache";
import { adminDb } from "@/lib/alerts-server";
import { currentUser } from "@/lib/supabase/server";

const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status });

// The added_by column stays on the server; the page only learns whether this visitor may remove the item.
async function owned(id: number) {
  const [user, admin] = [await currentUser(), adminDb()];
  if (!user || !admin || !Number.isInteger(id)) return null;
  const { data } = await admin.from("products").select("id").eq("id", id).eq("source", "custom").eq("added_by", user.id).maybeSingle();
  return data ? admin : null;
}

// GET -> { canRemove }
export async function GET(_request: Request, { params }: RouteContext<"/api/track/[id]">) {
  return Response.json({ ok: true, canRemove: Boolean(await owned(Number((await params).id))) });
}

// DELETE -> stops tracking a link the visitor added; its history and alerts go with it (on delete cascade).
export async function DELETE(_request: Request, { params }: RouteContext<"/api/track/[id]">) {
  const id = Number((await params).id);
  const admin = await owned(id);
  if (!admin) return fail("Only the person who added this item can remove it.", 403);
  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) return fail("Could not remove the item. Please try again.", 500);
  revalidateTag("products", { expire: 0 });
  return Response.json({ ok: true });
}
