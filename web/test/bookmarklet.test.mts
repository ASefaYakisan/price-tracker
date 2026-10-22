import assert from "node:assert/strict";
import test from "node:test";
import { bookmarklet } from "../src/lib/bookmarklet.ts";

test("the bookmark opens /<lang>/add with the current page's address", () => {
  const code = bookmarklet("https://price-tracker-shop.vercel.app", "tr");
  assert.ok(code.startsWith("javascript:"));
  let opened = "";
  const run = new Function("window", "location", code.slice("javascript:".length));
  run({ open: (url: string) => (opened = url) }, { href: "https://www.trendyol.com/x/y-p-1?boutiqueId=6&a=b" });
  assert.equal(
    opened,
    "https://price-tracker-shop.vercel.app/tr/add?url=https%3A%2F%2Fwww.trendyol.com%2Fx%2Fy-p-1%3FboutiqueId%3D6%26a%3Db",
  );
});

test("a quote in the origin cannot break out of the string", () => {
  const code = bookmarklet(`https://a.example'"`, "en");
  let opened = "";
  new Function("window", "location", code.slice("javascript:".length))({ open: (u: string) => (opened = u) }, { href: "x" });
  assert.equal(opened, `https://a.example'"/en/add?url=x`);
});
