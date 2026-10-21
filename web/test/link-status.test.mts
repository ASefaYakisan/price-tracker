import assert from "node:assert/strict";
import test from "node:test";
import { errorReason, lastReadFailed, linkState } from "../src/lib/link-status.ts";

const t = {
  blocked: "blocked",
  notFound: "not found",
  httpError: "error",
  noPrice: "no price",
  timeout: "timeout",
  network: "network",
} as Parameters<typeof errorReason>[1];

const link = { source: "custom", scraped_at: null as string | null };

test("only pasted links have a state", () => {
  assert.equal(linkState({ source: "coingecko", scraped_at: null }), null);
});

test("no price yet is pending until the scraper gives up", () => {
  assert.equal(linkState(link), "pending");
  assert.equal(linkState({ ...link, status: "active" }), "pending"); // saved by the site before 0009 marked it
  assert.equal(linkState({ ...link, status: "failed" }), "failed");
  assert.equal(linkState({ ...link, scraped_at: "2026-10-21T10:00:00Z", status: "active" }), "active");
});

test("a failure after the last price counts as the newest read", () => {
  const read = { ...link, scraped_at: "2026-10-21T10:00:00Z", last_error: "timeout" };
  assert.equal(lastReadFailed({ ...read, last_checked_at: "2026-10-22T10:00:00Z" }), true);
  assert.equal(lastReadFailed({ ...read, last_checked_at: "2026-10-20T10:00:00Z" }), false);
  assert.equal(lastReadFailed({ ...read, last_error: null, last_checked_at: "2026-10-22T10:00:00Z" }), false);
  assert.equal(lastReadFailed({ ...link, last_error: "no_price", last_checked_at: "2026-10-22T10:00:00Z" }), true);
});

test("error codes become a reason with the HTTP status", () => {
  assert.equal(errorReason("http_error:403", t), "blocked (HTTP 403)");
  assert.equal(errorReason("http_error:404", t), "not found (HTTP 404)");
  assert.equal(errorReason("http_error:500", t), "error (HTTP 500)");
  assert.equal(errorReason("no_price", t), "no price");
  assert.equal(errorReason("timeout", t), "timeout");
  assert.equal(errorReason("network", t), "network");
});
