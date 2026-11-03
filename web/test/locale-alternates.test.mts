import assert from "node:assert/strict";
import test from "node:test";
import { localeAlternates } from "../src/lib/locale-alternates.ts";
import { LOCALE_CODES } from "../src/i18n/config.ts";

test("alternates list every locale and point x-default at English", () => {
  const a = localeAlternates("how-to-add");
  assert.equal(Object.keys(a).length, LOCALE_CODES.length + 1);
  assert.equal(a["x-default"], "/en/how-to-add");
  assert.equal(a.tr, "/tr/how-to-add");
});

test("home has no trailing slash and absolute origins are supported", () => {
  assert.equal(localeAlternates("").de, "/de");
  assert.equal(localeAlternates("terms", new URL("https://example.com")).fr, "https://example.com/fr/terms");
});
