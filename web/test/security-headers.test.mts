import assert from "node:assert/strict";
import test from "node:test";
import { securityHeaders } from "../src/lib/security-headers.ts";

const byKey = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));

test("blocks framing and content sniffing", () => {
  assert.equal(byKey["X-Content-Type-Options"], "nosniff");
  assert.equal(byKey["X-Frame-Options"], "DENY");
  assert.equal(byKey["Content-Security-Policy"], "frame-ancestors 'none'");
});

test("sets referrer, HSTS and permissions policies", () => {
  assert.equal(byKey["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.match(byKey["Strict-Transport-Security"], /^max-age=\d+; includeSubDomains$/);
  assert.match(byKey["Permissions-Policy"], /camera=\(\)/);
});

test("does not ship a script-restricting CSP", () => {
  assert.doesNotMatch(byKey["Content-Security-Policy"], /script-src|default-src/);
});
