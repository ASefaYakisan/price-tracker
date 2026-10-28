import { apiError, itemJson, itemNotFound } from "@/lib/api";
import { getVisible } from "@/lib/data";

export async function GET(_request: Request, { params }: RouteContext<"/api/products/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return apiError("id must be a positive integer", 400);
  const found = await getVisible(id);
  return found ? itemJson(found.product, found.shared) : itemNotFound();
}
