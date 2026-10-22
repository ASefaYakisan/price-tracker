import { revalidateTag } from "next/cache";
import { adminDb } from "@/lib/alerts-server";
import { currentUser } from "@/lib/supabase/server";

const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status });

// A link the scraper gave up on (status 'failed', see scraper/src/link-status.js), added by this visitor.
async function retryable(id: number) {
  const [user, admin] = [await currentUser(), adminDb()];
  if (!user || !admin || !Number.isInteger(id)) return null;
  const { data } = await admin
    .from("products")
    .select("id")
    .eq("id", id)
    .eq("source", "custom")
    .eq("added_by", user.id)
    .eq("status", "failed")
    .maybeSingle();
  return data ? admin : null;
}

// GET -> { canRetry }
export async function GET(_request: Request, { params }: RouteContext<"/api/track/[id]/retry">) {
  return Response.json({ ok: true, canRetry: Boolean(await retryable(Number((await params).id))) });
}

// POST -> puts the link back in the 15-minute queue (scraper/src/pending.js) with a fresh set of tries.
export async function POST(_request: Request, { params }: RouteContext<"/api/track/[id]/retry">) {
  const id = Number((await params).id);
  const admin = await retryable(id);
  if (!admin) return fail("Only the person who added this item can retry it.", 403);
  const { error } = await admin.from("products").update({ status: "pending", failed_checks: 0 }).eq("id", id);
  if (error) return fail("Could not queue the item. Please try again.", 500);
  revalidateTag("products", { expire: 0 });
  return Response.json({ ok: true });
}
