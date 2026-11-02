import assert from "node:assert/strict";
import test from "node:test";
import { paginate, parsePaging } from "../src/lib/paginate.ts";

const list = Array.from({ length: 120 }, (_, i) => i);

test("defaults to limit 100, offset 0", () => {
  assert.deepEqual(parsePaging(null, null), { limit: 100, offset: 0 });
});

test("accepts boundary values", () => {
  assert.deepEqual(parsePaging("1", "0"), { limit: 1, offset: 0 });
  assert.deepEqual(parsePaging("200", "5000"), { limit: 200, offset: 5000 });
});

test("rejects invalid limit", () => {
  for (const v of ["0", "201", "-1", "1.5", "abc", ""]) {
    assert.ok("error" in parsePaging(v, null), `limit=${v}`);
  }
});

test("rejects invalid offset", () => {
  for (const v of ["-1", "1.5", "abc", ""]) {
    const r = parsePaging(null, v);
    assert.ok("error" in r, `offset=${v}`);
    assert.match((r as { error: string }).error, /offset/);
  }
});

test("second page returns next items and filtered total", () => {
  const page = paginate(list, 50, 50);
  assert.equal(page.items.length, 50);
  assert.equal(page.items[0], 50);
  assert.equal(page.total, 120);
});

test("last page is partial", () => {
  const page = paginate(list, 50, 100);
  assert.equal(page.items.length, 20);
});

test("offset past the total gives an empty list with the right total", () => {
  const page = paginate(list, 50, 500);
  assert.deepEqual(page.items, []);
  assert.equal(page.total, 120);
});
