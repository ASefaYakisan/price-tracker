import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// The server fetches whatever link a visitor pastes, so refuse anything that points
// back into a private network (localhost, cloud metadata, LAN addresses).
type Resolve = (host: string) => Promise<string[]>;

const defaultResolve: Resolve = async (host) => (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);

export async function assertPublicUrl(raw: string, { resolve = defaultResolve }: { resolve?: Resolve } = {}): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("That does not look like a link. Paste the full address, starting with https://");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only http and https links are supported.");
  if (url.username || url.password) throw new Error("Links with a username or password are not supported.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : await resolve(host);
  if (!addresses.length) throw new Error("Could not find that website.");
  if (addresses.some(isPrivate)) throw new Error("That address is not a public website.");
  return url;
}

export function isPrivate(ip: string): boolean {
  if (ip.includes(":")) {
    const g = ipv6Groups(ip.toLowerCase());
    if (!g) return true; // anything unreadable is refused
    const v4 = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
    if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) {
      // ::ffff:a.b.c.d (mapped) and ::a.b.c.d (compatible) carry an IPv4 address; :: and ::1 fall through below.
      if (g[5] === 0xffff || g[6] !== 0 || g[7] > 1) return isPrivate(v4(g[6], g[7]));
    }
    if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return isPrivate(v4(g[6], g[7])); // NAT64
    if (g[0] === 0x2002) return isPrivate(v4(g[1], g[2])); // 6to4
    const first = g[0];
    return (
      g.every((x, i) => x === 0 || (i === 7 && x === 1)) || // :: and ::1
      (first & 0xfe00) === 0xfc00 || // fc00::/7 unique local
      (first & 0xffc0) === 0xfe80 || // fe80::/10 link-local
      (first & 0xffc0) === 0xfec0 // fec0::/10 old site-local
    );
  }
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

// Reads an IPv6 address into eight 16-bit groups (an IPv4 tail such as ::ffff:1.2.3.4 is allowed). Null if malformed.
function ipv6Groups(v: string): number[] | null {
  let tail: number[] = [];
  const dotted = v.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const o = dotted[2].split(".").map(Number);
    if (o.some((n) => n > 255)) return null;
    tail = [(o[0] << 8) | o[1], (o[2] << 8) | o[3]];
    v = dotted[1] + "0:0";
  }
  const halves = v.split("::");
  if (halves.length > 2) return null;
  const parse = (s: string) => (s ? s.split(":") : []);
  const head = parse(halves[0]);
  const rest = halves.length === 2 ? parse(halves[1]) : [];
  const fill = halves.length === 2 ? 8 - head.length - rest.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null;
  const groups = [...head, ...Array(fill).fill("0"), ...rest].map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  if (groups.length !== 8 || groups.some(Number.isNaN)) return null;
  if (tail.length) groups.splice(6, 2, ...tail);
  return groups;
}
