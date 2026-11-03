import assert from "node:assert/strict";
import test from "node:test";
import { FREE_TRIES, IP_FREE_TRIES, lockSeconds, signIn, WINDOW_MS, type Failures } from "../src/lib/login-guard.ts";

const NOW = 1_000_000_000;
const fails = (n: number, ago = 1000) => Array.from({ length: n }, () => NOW - ago);

test("free until the allowed number of wrong passwords", () => {
  assert.equal(lockSeconds(fails(FREE_TRIES - 1), FREE_TRIES, NOW), 0);
  assert.ok(lockSeconds(fails(FREE_TRIES), FREE_TRIES, NOW) > 0);
});

test("lock doubles with each further miss and is capped", () => {
  const a = lockSeconds(fails(FREE_TRIES, 0), FREE_TRIES, NOW);
  const b = lockSeconds(fails(FREE_TRIES + 1, 0), FREE_TRIES, NOW);
  assert.equal(a, 30);
  assert.equal(b, 60);
  assert.equal(lockSeconds(fails(FREE_TRIES + 30, 0), FREE_TRIES, NOW), 900);
});

test("lock counts down and old failures stop counting", () => {
  assert.equal(lockSeconds(fails(FREE_TRIES, 10_000), FREE_TRIES, NOW), 20);
  assert.equal(lockSeconds(fails(FREE_TRIES, WINDOW_MS + 1), FREE_TRIES, NOW), 0);
});

function setup(failures: Failures | null, auth: Awaited<ReturnType<Parameters<typeof signIn>[0]["authenticate"]>>) {
  const calls = { auth: 0, record: 0, clear: 0 };
  const deps = {
    now: NOW,
    store: {
      load: async () => failures,
      record: async () => void calls.record++,
      clear: async () => void calls.clear++,
    },
    authenticate: async () => (calls.auth++, auth),
  };
  return { calls, deps };
}

test("a locked account is refused before the password is checked", async () => {
  const { calls, deps } = setup({ email: fails(FREE_TRIES), ip: [] }, { session: { access_token: "a", refresh_token: "r" } });
  const r = await signIn(deps);
  assert.equal(r.status, 429);
  assert.equal(r.body.code, "locked");
  assert.ok((r.body.retryAfter as number) > 0);
  assert.equal(calls.auth, 0);
});

test("one network guessing at many accounts is locked too", async () => {
  const { calls, deps } = setup({ email: [], ip: fails(IP_FREE_TRIES) }, { session: { access_token: "a", refresh_token: "r" } });
  assert.equal((await signIn(deps)).status, 429);
  assert.equal(calls.auth, 0);
});

test("a failed lookup blocks the sign-in (fail closed)", async () => {
  const { calls, deps } = setup(null, { session: { access_token: "a", refresh_token: "r" } });
  assert.equal((await signIn(deps)).status, 503);
  assert.equal(calls.auth, 0);
});

test("wrong password is recorded and answers 401", async () => {
  const { calls, deps } = setup({ email: [], ip: [] }, { error: { code: "invalid_credentials", message: "Invalid login credentials" } });
  const r = await signIn(deps);
  assert.equal(r.status, 401);
  assert.equal(r.body.code, "invalid_credentials");
  assert.equal(calls.record, 1);
});

test("other errors (unconfirmed email, captcha) are passed on and not counted as guesses", async () => {
  const { calls, deps } = setup({ email: [], ip: [] }, { error: { code: "email_not_confirmed", message: "Email not confirmed", status: 400 } });
  const r = await signIn(deps);
  assert.equal(r.body.code, "email_not_confirmed");
  assert.equal(calls.record, 0);
});

test("success clears the account's failures and returns the tokens", async () => {
  const { calls, deps } = setup({ email: fails(2), ip: [] }, { session: { access_token: "a", refresh_token: "r" } });
  const r = await signIn(deps);
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.access_token, r.body.refresh_token], ["a", "r"]);
  assert.equal(calls.clear, 1);
});

test("without a service key the lock is skipped and Supabase's own limits apply", async () => {
  let n = 0;
  const r = await signIn({ store: null, authenticate: async () => (n++, { session: { access_token: "a", refresh_token: "r" } }) });
  assert.equal(r.status, 200);
  assert.equal(n, 1);
});
