import { apiError, json } from "@/lib/api";
import { getProducts } from "@/lib/data";
import { paginate, parsePaging } from "@/lib/paginate";

// GET /api/products?source=coingecko&q=bitcoin&limit=50&offset=50
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const source = params.get("source");
  const q = params.get("q")?.toLowerCase();
  const paging = parsePaging(params.get("limit"), params.get("offset"));
  if ("error" in paging) return apiError(paging.error, 400);

  const filtered = (await getProducts())
    .filter((p) => !source || p.source === source)
    .filter((p) => !q || p.title.toLowerCase().includes(q));
  const page = paginate(filtered, paging.limit, paging.offset);
  return json({ count: page.items.length, total: page.total, limit: page.limit, offset: page.offset, items: page.items });
}
