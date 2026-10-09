import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE, negotiate } from "@/i18n/config";
import { updateSession } from "@/lib/supabase/proxy";

// Pages live under a language segment (/tr/alerts). Old or bare links (/alerts, emailed /products/7)
// are sent to the visitor's saved language, else the best match from the browser, else English.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (!isLocale(first) && !pathname.startsWith("/api/") && !pathname.startsWith("/auth/")) {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    const lang = isLocale(saved) ? saved : negotiate(request.headers.get("accept-language"));
    return NextResponse.redirect(new URL(`/${lang}${pathname === "/" ? "" : pathname}${search}`, request.url));
  }
  return updateSession(request);
}

export const config = {
  // Skip static files, the API docs and the public read-only API, which never use the session.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/products|api/openapi.json|docs|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
