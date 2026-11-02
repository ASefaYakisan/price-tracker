import assert from "node:assert/strict";
import test from "node:test";
import { botWall, scriptRendered } from "../src/lib/track-outcome.ts";

test("botWall spots robot-check pages but not product pages", () => {
  assert.equal(botWall("<title>Just a moment...</title>"), true);
  assert.equal(botWall("<h1>Kulaklık</h1>"), false);
});

test("scriptRendered spots empty app shells but not real text pages", () => {
  const shell = '<html><head><title>Kulaklık</title><script src="/app.js"></script></head><body><div id="__next"></div><noscript>Enable JavaScript</noscript></body></html>';
  assert.equal(scriptRendered(shell), true);
  const article = `<html><head><title>Blog</title></head><body><div id="app"><p>${"Bu bir yazı. ".repeat(100)}</p></div></body></html>`;
  assert.equal(scriptRendered(article), false);
  assert.equal(scriptRendered("<html><head><title>Hi</title></head><body><p>Short page</p></body></html>"), false);
});
