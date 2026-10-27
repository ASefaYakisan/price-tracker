import assert from "node:assert/strict";
import { test } from "node:test";
import { findUrl } from "../src/lib/find-url.ts";

// TrackForm searches by name only when the text holds no link.
test("a product name holds no link, so it is searched", () => {
  assert.equal(findUrl("razer viper v3 pro"), null);
  assert.equal(findUrl("iPhone 16 128 GB"), null);
});

test("a shared shop text still holds a link, so it is added", () => {
  assert.equal(findUrl("Bu ürüne bak! https://ty.gl/abc123"), "https://ty.gl/abc123");
});
