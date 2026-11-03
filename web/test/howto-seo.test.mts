import assert from "node:assert/strict";
import test from "node:test";
import { howToJsonLd } from "../src/lib/howto-seo.ts";

const base = {
  name: "Add a product", description: "Three ways", lang: "en", url: "https://example.com/en/how-to-add",
  ways: [{ title: "Phone", steps: ["Open the shop", "Share"] }, { title: "Paste", steps: ["Copy the link"] }],
};

test("HowTo JSON-LD numbers steps and directions", () => {
  const data = JSON.parse(howToJsonLd(base));
  assert.equal(data["@type"], "HowTo");
  assert.equal(data.step.length, 2);
  assert.equal(data.step[1].position, 2);
  assert.deepEqual(data.step[0].itemListElement.map((d: { text: string }) => d.text), ["Open the shop", "Share"]);
});

test("a closing script tag in text is escaped and round-trips", () => {
  const out = howToJsonLd({ ...base, name: "</script><script>x</script>" });
  assert.ok(!out.includes("</script>"));
  assert.equal(JSON.parse(out).name, "</script><script>x</script>");
});
