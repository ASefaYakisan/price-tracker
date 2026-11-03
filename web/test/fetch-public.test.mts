import test from "node:test";
import assert from "node:assert/strict";
import { fetchPublic, ReadError } from "../src/lib/fetch-public.ts";
import { assertPublicUrl } from "../src/lib/safe-url.ts";

const PUBLIC = { resolve: async () => ["93.184.216.34"] };
const guard = (raw: string) => assertPublicUrl(raw, PUBLIC);
const redirect = (location: string) => new Response(null, { status: 302, headers: { location } });
const start = new URL("https://shop.example/p");

test("a redirect to cloud metadata is refused and never requested", async () => {
  const seen: string[] = [];
  const request = (async (u: URL) => (seen.push(String(u)), redirect("http://169.254.169.254/latest/meta-data/"))) as unknown as typeof fetch;
  await assert.rejects(fetchPublic(start, { guard, request }), (e: ReadError) => e.outcome === "network" && /not a public website/.test(e.message));
  assert.deepEqual(seen, ["https://shop.example/p"]);
});

test("a host that starts resolving to a private address after the first hop is refused", async () => {
  let lookups = 0;
  const flipping = (raw: string) => assertPublicUrl(raw, { resolve: async () => (++lookups === 1 ? ["93.184.216.34"] : ["127.0.0.1"]) });
  const seen: string[] = [];
  const request = (async (u: URL) => (seen.push(String(u)), redirect("/next"))) as unknown as typeof fetch;
  await assert.rejects(fetchPublic(start, { guard: flipping, request }), /not a public website/);
  assert.equal(seen.length, 2); // the start link, then the first (public) redirect; the second hop is never requested
});

test("a redirect with credentials or a non-http scheme is refused", async () => {
  for (const to of ["file:///etc/passwd", "https://user:pw@shop.example/"]) {
    const request = (async () => redirect(to)) as unknown as typeof fetch;
    await assert.rejects(fetchPublic(start, { guard, request }), ReadError, to);
  }
});

test("more than five redirects end with a readable error", async () => {
  let n = 0;
  const request = (async () => (n++, redirect(`/hop${n}`))) as unknown as typeof fetch;
  await assert.rejects(fetchPublic(start, { guard, request }), /redirects too many times/);
  assert.equal(n, 5);
});

test("public redirects are followed and the final page is returned", async () => {
  const request = (async (u: URL) => (u.pathname === "/new" ? new Response("ok") : redirect("/new"))) as unknown as typeof fetch;
  const res = await fetchPublic(start, { guard, request });
  assert.equal(await res.text(), "ok");
});
