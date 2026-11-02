import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(new URL("../../supabase/migrations/0014_alert_email_own.sql", import.meta.url), "utf8");

test("the migration blocks signed-in users from using another address", () => {
  assert.match(sql, /alert_email_not_owner/);
  assert.match(sql, /before insert or update of email on alerts/);
  assert.match(sql, /auth\.jwt\(\)/);
});

test("the migration leaves the service role and existing rows alone", () => {
  assert.match(sql, /'authenticated'/);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
});
