// Reads a response body without letting a huge file fill memory.
// Port of scraper/src/read-body.js (tested there); keep them in step.

export const MAX_BODY_BYTES = 3_000_000;

const PAGE_TYPE = /^(?:text\/[\w.+-]+|application\/xhtml\+xml|application\/(?:[\w.+-]+\+)?json)\b/i;

// A missing content-type header is let through: some small shops send none, and the size cap still protects memory.
export function isPageType(contentType: string | null | undefined) {
  const type = (contentType ?? "").trim();
  return type === "" || PAGE_TYPE.test(type);
}

// Streams the body and stops at maxBytes, cancelling the rest; a page cut short still has its price near the top.
export async function readCapped(res: Response, maxBytes = MAX_BODY_BYTES): Promise<string> {
  if (!res.body) return (await res.text()).slice(0, maxBytes);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        text += decoder.decode(value.subarray(0, value.byteLength - (bytes - maxBytes)));
        await reader.cancel().catch(() => {});
        return text;
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock?.();
  }
}
