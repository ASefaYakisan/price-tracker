import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// The server fetches whatever link a visitor pastes, so refuse anything that points
// back into a private network (localhost, cloud metadata, LAN addresses).
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("That does not look like a link. Paste the full address, starting with https://");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only http and https links are supported.");
  if (url.username || url.password) throw new Error("Links with a username or password are not supported.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (!addresses.length) throw new Error("Could not find that website.");
  if (addresses.some(isPrivate)) throw new Error("That address is not a public website.");
  return url;
}

function isPrivate(ip: string) {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return isPrivate(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224
  );
}
