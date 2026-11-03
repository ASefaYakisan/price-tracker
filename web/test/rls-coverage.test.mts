import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const dir = new URL("../../supabase/migrations/", import.meta.url);
const all = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(new URL(f, dir), "utf8"))
  .join("\n");

const tables = [...all.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/gi)].map((m) => m[1].toLowerCase());
const rlsOn = new Set(
  [...all.matchAll(/alter\s+table\s+(?:public\.)?(\w+)\s+enable\s+row\s+level\s+security/gi)].map((m) => m[1].toLowerCase()),
);

test("migrations create at least the known tables", () => {
  for (const t of ["products", "price_history", "alerts", "track_attempts", "user_products"]) {
    assert.ok(tables.includes(t), `expected table ${t}`);
  }
});

test("every table created in a migration has row level security enabled", () => {
  const missing = tables.filter((t) => !rlsOn.has(t));
  assert.deepEqual(missing, [], `tables without RLS: ${missing.join(", ")}`);
});

test("every view created in a migration runs with the caller's rights", () => {
  const views = [...all.matchAll(/create\s+(?:or\s+replace\s+)?view\s+[\w.]+\s*(with\s*\([^)]*\))?/gi)];
  assert.ok(views.length > 0);
  for (const v of views) {
    assert.match(v[0], /security_invoker\s*=\s*true/i, `view without security_invoker: ${v[0]}`);
  }
});

test("security definer functions are not left executable by public roles", () => {
  const defs = [...all.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\w+)[\s\S]*?security\s+definer/gi)].map((m) => m[1]);
  for (const fn of defs) {
    const re = new RegExp(`revoke\\s+(?:all|execute)\\s+on\\s+function\\s+(?:public\\.)?${fn}\\b`, "i");
    assert.match(all, re, `function ${fn} is security definer but never revoked`);
  }
});
