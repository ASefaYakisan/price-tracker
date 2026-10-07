import { apiError, json } from "@/lib/api";
import { getPriceHistory, getProduct } from "@/lib/data";

// GET /api/products/12/history?days=30
export async function GET(request: Request, { params }: RouteContext<"/api/products/[id]/history">) {
  const id = Number((await params).id);
  const days = Number(new URL(request.url).searchParams.get("days") ?? 90);
  if (!Number.isInteger(id) || id < 1) return apiError("id must be a positive integer", 400);
  if (!Number.isInteger(days) || days < 1 || days > 365) return apiError("days must be an integer from 1 to 365", 400);

  const [product, points] = await Promise.all([getProduct(id), getPriceHistory(id, days)]);
  if (!product) return apiError("product not found", 404);
  return json({ id, currency: product.currency, days, points });
}
