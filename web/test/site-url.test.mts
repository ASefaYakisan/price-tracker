import test from "node:test";
import assert from "node:assert/strict";
import { siteUrl } from "../src/lib/site-url.ts";

test("metadata origin prefers explicit site URL, then production host, then localhost", () => {
  const names = ["NEXT_PUBLIC_SITE_URL", "VERCEL_PROJECT_PRODUCTION_URL"] as const;
  const saved = names.map((name) => process.env[name]);
  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    assert.equal(siteUrl().origin, "http://localhost:3000");
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "production.example";
    assert.equal(siteUrl().origin, "https://production.example");
    process.env.NEXT_PUBLIC_SITE_URL = "https://custom.example/";
    assert.equal(siteUrl().origin, "https://custom.example");
  } finally {
    names.forEach((name, i) => {
      if (saved[i] === undefined) delete process.env[name];
      else process.env[name] = saved[i];
    });
  }
});
