import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { itemJson, itemNotFound, json } from "../src/lib/api.ts";

const migration = readFileSync(new URL("../../supabase/migrations/0013_private_custom_products.sql", import.meta.url), "utf8");

test("products policy hides pasted links unless they are in the reader's list", () => {
  assert.match(migration, /drop policy if exists "public read products" on products/);
  assert.match(migration, /source <> 'custom'/);
  assert.match(migration, /user_products u where u\.product_id = products\.id and u\.user_id = \(select auth\.uid\(\)\)/);
});

test("price history follows the visibility of its product", () => {
  assert.match(migration, /drop policy if exists "public read history" on price_history/);
  assert.match(migration, /exists \(select 1 from products p where p\.id = price_history\.product_id\)/);
});

test("added_by cannot be read from the browser", () => {
  const grant = migration.match(/grant select \(([^)]*)\)\s+on products to anon, authenticated/)?.[1] ?? "";
  assert.ok(grant.includes("source") && grant.includes("url"));
  assert.ok(!grant.includes("added_by"));
  assert.ok(!grant.includes("failed_checks"));
  assert.match(migration, /revoke select on products from anon, authenticated/);
});

test("shared items are cached publicly; pasted links and 404s are not", async () => {
  assert.equal(itemJson({ id: 1 }, true).headers.get("cache-control"), json({}).headers.get("cache-control"));
  const own = itemJson({ id: 2 }, false);
  assert.equal(own.headers.get("cache-control"), "private, no-store");
  assert.equal(own.headers.get("access-control-allow-origin"), null);
  const missing = itemNotFound();
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get("cache-control"), "private, no-store");
});
