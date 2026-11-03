import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

// The one-click alert button needs its text, with the {price} slot, in every language.
test("every dictionary has the quickAlert text with a price slot", () => {
  const dir = new URL("../src/i18n/dictionaries/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  assert.equal(files.length, 24);
  for (const f of files) {
    const m = readFileSync(new URL(f, dir), "utf8").match(/quickAlert: "([^"]+)"/);
    assert.ok(m, `${f} lacks quickAlert`);
    assert.ok(m[1].includes("{price}"), `${f} quickAlert lacks {price}`);
  }
});
