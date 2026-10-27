import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// Links saved by visitors are opened later by the scraper, which runs with the project's secrets.
// A page that looked public when it was saved can redirect to localhost, a cloud metadata address or a LAN host,
// so every address is checked again here. web/src/lib/safe-url.ts holds the same rules for the moment a link is added.

export class BlockedAddressError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BlockedAddressError';
  }
}

// Throws unless `raw` is an http(s) link without credentials whose host resolves only to public addresses.
export async function assertPublicUrl(raw, { resolve = defaultResolve } = {}) {
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    throw new BlockedAddressError(`not a link: ${raw}`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new BlockedAddressError(`only http and https links are read: ${url.protocol}`);
  if (url.username || url.password) throw new BlockedAddressError('links with a username or password are not read');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [host] : await resolve(host);
  if (!addresses.length) throw new BlockedAddressError(`could not resolve ${host}`);
  if (addresses.some(isPrivateAddress)) throw new BlockedAddressError(`${host} is not a public address`);
  return url;
}

async function defaultResolve(host) {
  return (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
}

export function isPrivateAddress(ip) {
  if (ip.includes(':')) {
    const v = ip.toLowerCase();
    if (v.startsWith('::ffff:')) {
      // new URL() writes the mapped IPv4 address in hex ([::ffff:7f00:1]), so both spellings are read.
      const hex = v.slice(7).match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
      if (!hex) return isPrivateAddress(v.slice(7));
      const [hi, lo] = [parseInt(hex[1], 16), parseInt(hex[2], 16)];
      return isPrivateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
  }
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}
