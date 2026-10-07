import { apiError, json } from "@/lib/api";
import { getProducts } from "@/lib/data";

// GET /api/products?source=coingecko&q=bitcoin&limit=50
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const source = params.get("source");
  const q = params.get("q")?.toLowerCase();
  const limit = Number(params.get("limit") ?? 100);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) return apiError("limit must be an integer from 1 to 200", 400);

  const items = (await getProducts())
    .filter((p) => !source || p.source === source)
    .filter((p) => !q || p.title.toLowerCase().includes(q))
    .slice(0, limit);
  return json({ count: items.length, items });
}
