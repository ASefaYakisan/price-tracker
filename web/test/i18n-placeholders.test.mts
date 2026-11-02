import test from "node:test";
import assert from "node:assert/strict";
import { LOCALE_CODES } from "../src/i18n/config.ts";
import en from "../src/i18n/dictionaries/en.ts";

// Dictionaries currently contain nested objects and string leaves, not functions.
// Reject unsupported leaves so future dynamic messages cannot silently escape this check.
function strings(value: unknown, path = ""): Map<string, string> {
  if (typeof value === "string") return new Map([[path, value]]);
  assert.ok(value !== null && typeof value === "object", `Unsupported dictionary value at ${path}`);
  return new Map(Object.entries(value).flatMap(([key, child]) =>
    [...strings(child, path ? `${path}.${key}` : key)]));
}

// Match the syntax used by fill() and compare sets, ignoring order and repetition.
const placeholders = (text: string) => new Set([...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]));
const reference = strings(en);

for (const locale of LOCALE_CODES.filter(code => code !== "en")) {
  test(`${locale}: placeholders match English for every message`, async () => {
    const { default: dictionary } = await import(`../src/i18n/dictionaries/${locale}.ts`);
    const translated = strings(dictionary);
    const errors: string[] = [];
    for (const [key, text] of reference) {
      const message = translated.get(key);
      if (message === undefined) {
        errors.push(`${locale}.${key}: missing message`);
        continue;
      }
      const expected = placeholders(text);
      const actual = placeholders(message);
      const missing = [...expected].filter(name => !actual.has(name));
      const extra = [...actual].filter(name => !expected.has(name));
      if (missing.length || extra.length) {
        errors.push(`${locale}.${key}: missing [${missing.join(", ")}]; extra [${extra.join(", ")}]`);
      }
    }
    assert.equal(errors.length, 0, errors.join("\n"));
  });
}
