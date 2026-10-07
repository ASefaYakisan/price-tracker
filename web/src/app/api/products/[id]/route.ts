import { apiError, json } from "@/lib/api";
import { getProduct } from "@/lib/data";

export async function GET(_request: Request, { params }: RouteContext<"/api/products/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return apiError("id must be a positive integer", 400);
  const product = await getProduct(id);
  return product ? json(product) : apiError("product not found", 404);
}
