import assert from "node:assert/strict";
import test from "node:test";
import { RULES, passes, isStrong, score, generate } from "../src/lib/password.ts";

test("password length rejects seven characters and accepts eight", () => {
  assert.equal(RULES.ruleLength("Aa1!aaa"), false);
  assert.equal(RULES.ruleLength("Aa1!aaaa"), true);
});

test("character rules require their own character class", () => {
  for (const [rule, accepted, rejected] of [
    [RULES.ruleUpper, "A", "a1!"],
    [RULES.ruleLower, "a", "A1!"],
    [RULES.ruleNumber, "1", "Aa!"],
    [RULES.ruleSymbol, "!", "Aa1"],
  ] as const) {
    assert.equal(rule(accepted), true);
    assert.equal(rule(rejected), false);
  }
  for (const [name, rule] of Object.entries(RULES)) assert.equal(rule(""), false, name);
});

test("passes and isStrong require all five rules", () => {
  assert.equal(passes(""), 0);
  assert.equal(isStrong(""), false);
  assert.equal(passes("Abcdef1!"), 5);
  assert.equal(isStrong("Abcdef1!"), true);
  for (const password of ["Aa1!aaa", "abcdef1!", "ABCDEF1!", "Abcdefg!", "Abcdefg1"]) {
    assert.equal(passes(password), 4);
    assert.equal(isStrong(password), false);
  }
});

test("score progresses from zero to four and adds the twelve-character bonus", () => {
  const examples = ["", "a", "aA1", "Abcdef1!", "Abcdefghij1!"];
  assert.deepEqual(examples.map(score), [0, 1, 2, 3, 4]);
  // Same rules met on either side of the length bonus boundary.
  assert.equal(passes("abcdefghijk"), passes("abcdefghijkl"));
  assert.equal(score("abcdefghijk"), 1);
  assert.equal(score("abcdefghijkl"), 2);
  assert.equal(score("Abcdefghi1!"), 3);
  assert.equal(score("Abcdefghij1!"), 4);
});

test("generate defaults to sixteen characters and respects a requested length", () => {
  assert.equal(generate().length, 16);
  assert.equal(generate(20).length, 20);
});

test("200 generated passwords are strong, distinct and avoid ambiguous characters", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const length = i % 2 === 0 ? 16 : 20;
    const password = length === 16 ? generate() : generate(length);
    assert.equal(password.length, length);
    assert.equal(isStrong(password), true);
    assert.doesNotMatch(password, /[0O1lI]/);
    assert.equal(seen.has(password), false, "duplicate generated password");
    seen.add(password);
  }
  assert.equal(seen.size, 200);
});
