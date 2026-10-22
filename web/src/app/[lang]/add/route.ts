import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { findUrl } from "@/lib/find-url";

// GET /<lang>/add?url=&text=&title= -> the home page with the link in the box (/<lang>#track=<link>).
// The phone's Share menu opens this (see app/manifest.ts); shop apps put the link in any of the three fields.
export async function GET(request: Request, ctx: RouteContext<"/[lang]/add">) {
  const { lang } = await ctx.params;
  const params = new URL(request.url).searchParams;
  const shared = ["url", "text", "title"].map((key) => params.get(key) ?? "").join(" ").trim();
  const link = (findUrl(shared) ?? shared).slice(0, 2000);
  const home = new URL(`/${isLocale(lang) ? lang : DEFAULT_LOCALE}`, request.url);
  if (link) home.hash = `track=${encodeURIComponent(link)}`;
  return Response.redirect(home, 303);
}
