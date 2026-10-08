import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static files and the public read-only API, which never use the session.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/products|api/openapi.json|docs|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
