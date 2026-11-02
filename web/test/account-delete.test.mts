import assert from "node:assert/strict";
import test from "node:test";
import { deleteAccount } from "../src/lib/account-delete.ts";

const user = { id: "u1", email: "Ada@Example.com" };

test("no session -> 401 and nothing is deleted", async () => {
  let called = false;
  const r = await deleteAccount({ user: null, confirmEmail: "ada@example.com", deleteUser: async () => ((called = true), null) });
  assert.equal(r.status, 401);
  assert.equal(called, false);
});

test("wrong or missing confirmation email -> 400", async () => {
  let called = false;
  const deleteUser = async () => ((called = true), null);
  for (const confirmEmail of ["other@example.com", "", undefined, 42]) {
    assert.equal((await deleteAccount({ user, confirmEmail, deleteUser })).status, 400);
  }
  assert.equal(called, false);
});

test("matching email (any case, padded) deletes the signed-in user's id", async () => {
  const ids: string[] = [];
  const r = await deleteAccount({ user, confirmEmail: "  ada@EXAMPLE.com ", deleteUser: async (id) => (ids.push(id), null) });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.deepEqual(ids, ["u1"]);
});

test("no service role key -> 503", async () => {
  assert.equal((await deleteAccount({ user, confirmEmail: "ada@example.com", deleteUser: null })).status, 503);
});

test("Supabase refuses the delete -> 500", async () => {
  const r = await deleteAccount({ user, confirmEmail: "ada@example.com", deleteUser: async () => ({ message: "boom" }) });
  assert.equal(r.status, 500);
  assert.equal(r.body.ok, false);
});

test("an account without an email cannot be confirmed", async () => {
  const r = await deleteAccount({ user: { id: "u2", email: null }, confirmEmail: "", deleteUser: async () => null });
  assert.equal(r.status, 400);
});
