import assert from "node:assert/strict";
import test from "node:test";
import { MAX_BODY_BYTES, isPageType, readCapped } from "../src/lib/read-body.ts";

test("isPageType accepts HTML and JSON, rejects files", () => {
  for (const type of ["text/html; charset=utf-8", "application/xhtml+xml", "application/json", "application/ld+json", null, ""]) {
    assert.equal(isPageType(type), true, String(type));
  }
  for (const type of ["application/pdf", "video/mp4", "application/octet-stream", "image/png"]) {
    assert.equal(isPageType(type), false, type);
  }
});

test("readCapped stops a 10 MB stream at the cap and cancels it", async () => {
  const state = { sent: 0, cancelled: false };
  const body = new ReadableStream({
    pull(controller) {
      if (state.sent >= 10_000_000) return controller.close();
      state.sent += 65_536;
      controller.enqueue(new Uint8Array(65_536).fill(97));
    },
    cancel() {
      state.cancelled = true;
    },
  });
  const text = await readCapped(new Response(body));
  assert.equal(text.length, MAX_BODY_BYTES);
  assert.equal(state.cancelled, true);
  assert.ok(state.sent < 10_000_000);
});

test("readCapped returns a normal page unchanged", async () => {
  const html = "<html><body>Fiyat: 1.299,90 ₺</body></html>";
  assert.equal(await readCapped(new Response(html)), html);
});
