import { ALERT_COLUMNS, alertError as error, toStatus } from "@/lib/alerts-server";
import { currentUser } from "@/lib/supabase/server";

// The signed-in user's alerts. Runs as that user, so row level security returns only their rows.
export async function GET() {
  const user = await currentUser();
  if (!user) return error("Sign in to see your saved alerts.", 401);
  const { data, error: dbError } = await user.db.from("alerts").select(ALERT_COLUMNS).order("created_at", { ascending: false }).limit(100);
  if (dbError) return error("Could not load your alerts. Please try again.", 500);
  const alerts = await Promise.all(data.map((row, i) => toStatus(String(i), row)));
  return Response.json({ ok: true, alerts });
}
