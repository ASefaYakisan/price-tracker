import assert from "node:assert/strict";
import test from "node:test";
import { LOCALE_CODES } from "../src/i18n/config.ts";
import en from "../src/i18n/dictionaries/en.ts";

function strings(value: unknown, path = ""): Map<string, string> {
  if (typeof value === "string") return new Map([[path, value]]);
  assert.ok(value !== null && typeof value === "object", `Unsupported dictionary value at ${path}`);
  return new Map(Object.entries(value).flatMap(([key, child]) =>
    [...strings(child, path ? `${path}.${key}` : key)]));
}

const english = strings(en);
// Measured across 24 dictionaries at d9f4412: title 13–13, description 33–142
// Unicode code points. Small margins catch accidental truncation/bloat, not SEO quality.
const metadataBounds = { "meta.title": [10, 20], "meta.description": [25, 155] } as const;

for (const lang of LOCALE_CODES) {
  test(`${lang}: dictionary strings are clean and metadata stays within measured bounds`, async () => {
    const { default: dictionary } = await import(`../src/i18n/dictionaries/${lang}.ts`);
    const values = strings(dictionary);
    const errors: string[] = [];
    let same = 0;
    for (const [key, text] of values) {
      const at = `${lang}: ${key}`;
      if (!text.trim()) errors.push(`${at}: empty text`);
      if (text !== text.trim()) errors.push(`${at}: leading/trailing whitespace`);
      if (text.includes("  ")) errors.push(`${at}: consecutive spaces`);
      // Uppercase markers are intentional: lowercase Spanish "todo" is normal prose.
      if (/TODO|FIXME|XXX|undefined|\[object Object\]/.test(text) || /lorem ipsum/i.test(text))
        errors.push(`${at}: unfinished or accidental placeholder text`);
      let balance = 0;
      let invalid = false;
      for (const character of text) {
        if (character === "{") balance++;
        if (character === "}" && --balance < 0) invalid = true;
      }
      if (balance !== 0 || invalid) errors.push(`${at}: unbalanced braces`);
      if (text === english.get(key)) same++;
    }
    for (const [key, [minimum, maximum]] of Object.entries(metadataBounds)) {
      const length = [...(values.get(key) ?? "")].length;
      if (length < minimum || length > maximum)
        errors.push(`${lang}: ${key}: ${length} code points, expected ${minimum}–${maximum}`);
    }
    console.info(`${lang}: ${same}/${values.size} strings exactly match English (informational)`);
    assert.deepEqual(errors, [], errors.join("\n"));
  });
}
