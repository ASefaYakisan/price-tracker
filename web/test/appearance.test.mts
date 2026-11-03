import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { MODES, PALETTES, PALETTE_KEY, SWATCHES, APPEARANCE_SCRIPT } from "../src/lib/appearance.ts";

test("appearance choices have matching swatches", () => {
  assert.deepEqual(MODES, ["light", "dark", "system"]);
  assert.equal(PALETTE_KEY, "color");
  assert.deepEqual(Object.keys(SWATCHES).sort(), [...PALETTES].sort());
  for (const colors of Object.values(SWATCHES)) {
    assert.equal(colors.length, 2);
    for (const color of colors) assert.match(color, /^#[0-9a-f]{6}$/i);
  }
});

test("every non-default palette has light and dark CSS and no extra palettes exist", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const expected = PALETTES.filter(p => p !== "tag");
  const actual = [...new Set([...css.matchAll(/:root\[data-palette="([^"]+)"\]/g)].map(m => m[1]))];
  assert.deepEqual(actual.sort(), [...expected].sort());
  for (const palette of expected) {
    assert.ok(css.includes(`:root[data-palette="${palette}"] {`), `${palette}: light selector missing`);
    assert.ok(css.includes(`:root[data-palette="${palette}"][data-theme="dark"] {`), `${palette}: dark selector missing`);
  }
});

test("first-paint script uses the same storage keys and applies saved choices", () => {
  assert.ok(APPEARANCE_SCRIPT.includes('getItem("mode")'));
  assert.ok(APPEARANCE_SCRIPT.includes(`getItem("${PALETTE_KEY}")`));
  const run = new Function("document", "localStorage", APPEARANCE_SCRIPT);
  for (const [mode, color, expected] of [
    ["dark", "ocean", { theme: "dark", palette: "ocean" }],
    ["light", "tag", { theme: "light" }],
    ["system", null, {}],
  ] as const) {
    const document = { documentElement: { dataset: {} } };
    run(document, { getItem: (key: string) => key === "mode" ? mode : color });
    assert.deepEqual(document.documentElement.dataset, expected);
  }
  assert.doesNotThrow(() => run({ documentElement: { dataset: {} } }, {
    getItem() { throw new Error("storage unavailable"); },
  }));
});
