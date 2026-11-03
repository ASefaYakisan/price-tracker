import assert from "node:assert/strict";
import test from "node:test";
import { API_HEADERS, PRIVATE_HEADERS, json, apiError, privateJson, itemJson, itemNotFound } from "../src/lib/api.ts";

function publicHeaders(response: Response) {
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(response.headers.get("cache-control"), "public, max-age=60");
}

function privateHeaders(response: Response) {
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.has("access-control-allow-origin"), false);
}

test("public JSON preserves data, status and public headers", async () => {
  for (const status of [200, 201]) {
    const response = status === 200 ? json({ value: 7 }) : json({ value: 7 }, status);
    assert.equal(response.status, status);
    publicHeaders(response);
    assert.deepEqual(await response.json(), { value: 7 });
  }
  const error = apiError("x", 400);
  assert.equal(error.status, 400);
  publicHeaders(error);
  assert.deepEqual(await error.json(), { error: "x" });
});

test("private JSON is not publicly cacheable or readable across origins", async () => {
  for (const status of [200, 201]) {
    const response = status === 200 ? privateJson({ value: 7 }) : privateJson({ value: 7 }, status);
    assert.equal(response.status, status);
    privateHeaders(response);
    assert.deepEqual(await response.json(), { value: 7 });
  }
});

test("item replies select visibility headers and keep not-found replies private", async () => {
  for (const shared of [true, false]) {
    const response = itemJson({ id: "product" }, shared);
    (shared ? publicHeaders : privateHeaders)(response);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { id: "product" });
  }
  const missing = itemNotFound();
  assert.equal(missing.status, 404);
  privateHeaders(missing);
  assert.deepEqual(await missing.json(), { error: "product not found" });
});

test("response header changes do not leak into constants or later responses", () => {
  const publicBefore = { ...API_HEADERS };
  const privateBefore = { ...PRIVATE_HEADERS };
  const firstPublic = json({});
  const firstPrivate = privateJson({});
  firstPublic.headers.set("cache-control", "changed");
  firstPublic.headers.delete("access-control-allow-origin");
  firstPrivate.headers.set("cache-control", "changed");
  firstPrivate.headers.set("access-control-allow-origin", "*");
  publicHeaders(json({}));
  privateHeaders(privateJson({}));
  assert.deepEqual(API_HEADERS, publicBefore);
  assert.deepEqual(PRIVATE_HEADERS, privateBefore);
});
