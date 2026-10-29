import { API_HEADERS } from "@/lib/api";
import { getProducts, isDemo } from "@/lib/data";
import { freshness } from "@/lib/health";

// GET /api/health: 200 while prices were read in the last 36 hours, 503 once they are stale or missing.
// Meant for an uptime monitor; it returns only the time of the newest read per source.
export async function GET() {
  const headers = { ...API_HEADERS, "cache-control": "no-store" };
  if (isDemo) return Response.json({ status: "ok", demo: true }, { headers });
  const report = freshness(await getProducts(), Date.now());
  return Response.json(report, { status: report.status === "ok" ? 200 : 503, headers });
}
