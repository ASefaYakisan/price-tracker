import assert from "node:assert/strict";
import { test } from "node:test";
import { dispatchPendingRun, shouldDispatch } from "../src/lib/dispatch-pending.ts";

const now = Date.parse("2026-10-26T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();
const env = { GITHUB_DISPATCH_TOKEN: "t", GITHUB_DISPATCH_REPO: "o/r" };

test("skips when a run is queued or started within a minute", () => {
  assert.equal(shouldDispatch([], now), true);
  assert.equal(shouldDispatch([{ status: "completed", created_at: ago(600_000) }], now), true);
  assert.equal(shouldDispatch([{ status: "in_progress", created_at: ago(300_000) }], now), true);
  assert.equal(shouldDispatch([{ status: "queued", created_at: ago(300_000) }], now), false);
  assert.equal(shouldDispatch([{ status: "completed", created_at: ago(20_000) }], now), false);
});

function fakeFetch(runs: unknown[], dispatchStatus = 204) {
  const calls: string[] = [];
  const fn = (async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (init?.method === "POST") return new Response(null, { status: dispatchStatus });
    return Response.json({ workflow_runs: runs });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

test("does nothing without a token or repo", async () => {
  const { fn, calls } = fakeFetch([]);
  assert.equal(await dispatchPendingRun({}, fn, now), false);
  assert.equal(await dispatchPendingRun({ GITHUB_DISPATCH_TOKEN: "t", GITHUB_DISPATCH_REPO: "bad repo" }, fn, now), false);
  assert.equal(calls.length, 0);
});

test("starts the workflow when idle", async () => {
  const { fn, calls } = fakeFetch([{ status: "completed", created_at: ago(900_000) }]);
  assert.equal(await dispatchPendingRun(env, fn, now), true);
  assert.match(calls[1], /^POST .*\/o\/r\/actions\/workflows\/pending\.yml\/dispatches$|^POST .*repos\/o\/r\/actions\/workflows\/pending\.yml\/dispatches$/);
});

test("does not start a second run while one is queued", async () => {
  const { fn, calls } = fakeFetch([{ status: "queued", created_at: ago(120_000) }]);
  assert.equal(await dispatchPendingRun(env, fn, now), false);
  assert.equal(calls.length, 1);
});

test("a failing start or network error never throws", async () => {
  assert.equal(await dispatchPendingRun(env, fakeFetch([], 403).fn, now), false);
  const boom = (async () => {
    throw new Error("down");
  }) as unknown as typeof fetch;
  assert.equal(await dispatchPendingRun(env, boom, now), false);
});
