import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { register } from "node:module";
import { siteUrl } from "../src/lib/site-url.ts";
import en from "../src/i18n/dictionaries/en.ts";

// Resolve only these Next.js aliases inside this isolated Node test process.
register(`data:text/javascript,${encodeURIComponent(`
  const aliases = ${JSON.stringify({
    "@/lib/site-url": new URL("../src/lib/site-url.ts", import.meta.url).href,
    "@/i18n/dictionaries/en": new URL("../src/i18n/dictionaries/en.ts", import.meta.url).href,
  })};
  export function resolve(specifier, context, nextResolve) {
    return nextResolve(aliases[specifier] ?? specifier, context);
  }
`)}`, import.meta.url);
const { default: robots } = await import("../src/app/robots.ts");
const { default: manifest } = await import("../src/app/manifest.ts");

test("robots protects private routes and uses the configured sitemap origin", () => {
  const names = ["NEXT_PUBLIC_SITE_URL", "VERCEL_PROJECT_PRODUCTION_URL"] as const;
  const saved = names.map(name => process.env[name]);
  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    for (const origin of [undefined, "https://custom.example/"]) {
      if (origin) process.env.NEXT_PUBLIC_SITE_URL = origin;
      const result = robots();
      assert.deepEqual(result.rules, {
        userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/*/reset-password"],
      });
      const sitemap = new URL(String(result.sitemap));
      assert.equal(sitemap.origin, siteUrl().origin);
      assert.equal(sitemap.pathname, "/sitemap.xml");
    }
  } finally {
    names.forEach((name, i) => {
      if (saved[i] === undefined) delete process.env[name];
      else process.env[name] = saved[i];
    });
  }
});

test("manifest labels and installed app settings match the application", () => {
  const result = manifest();
  assert.equal(result.name, en.meta.title);
  assert.equal(result.short_name, en.meta.title);
  assert.equal(result.description, en.meta.description);
  assert.equal(result.start_url, "/");
  assert.equal(result.scope, "/");
  assert.equal(result.display, "standalone");
  assert.deepEqual(result.share_target, {
    action: "/add", method: "GET", params: { url: "url", text: "text", title: "title" },
  });
  assert.ok(existsSync(new URL("../src/app/[lang]/add/route.ts", import.meta.url)));
});

test("manifest icons exist with matching PNG dimensions and a maskable icon", () => {
  const icons = manifest().icons;
  assert.ok(icons?.length);
  assert.ok(icons.some(icon => icon.purpose === "maskable"));
  for (const icon of icons) {
    assert.equal(icon.type, "image/png");
    const bytes = readFileSync(new URL(`../public${icon.src}`, import.meta.url));
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], icon.src);
    assert.equal(bytes.toString("ascii", 12, 16), "IHDR");
    assert.equal(icon.sizes, `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.src);
  }
});
