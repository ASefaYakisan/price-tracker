// Shop apps share text like "Bu ürüne bak! https://ty.gl/abc123", and people copy addresses
// without https://. Returns the first link in the text, with https:// added when it was left out.
export function findUrl(text: string): string | null {
  const withScheme = text.match(/https?:\/\/[^\s<>"'`]+/i);
  if (withScheme) return trimEnd(withScheme[0]);
  // Without a scheme, only "www.shop.com..." or "shop.com/path" count, so "e.g." or "Ltd.Şti" do not.
  const bare = text.match(/(?:^|[\s(])((?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?\/[^\s<>"'`]*|www\.(?:[a-z0-9-]+\.)+[a-z]{2,}\b)/i);
  return bare ? `https://${trimEnd(bare[1])}` : null;
}

const OPENER: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

// Drops the sentence's own punctuation after a link: "(...abc123)." -> "...abc123",
// but keeps brackets that belong to the link: ".../Foo_(bar)".
function trimEnd(link: string) {
  let out = link.replace(/[.,;:!?…»”’]+$/u, "");
  for (let last = out.at(-1)!; OPENER[last] && count(out, OPENER[last]) < count(out, last); last = out.at(-1)!) {
    out = out.slice(0, -1).replace(/[.,;:!?…»”’]+$/u, "");
  }
  return out;
}

function count(text: string, char: string) {
  return text.split(char).length - 1;
}
