import test from "node:test";
import assert from "node:assert/strict";
import { assertPublicUrl, isPrivate } from "../src/lib/safe-url.ts";

const PUBLIC = { resolve: async () => ["93.184.216.34"] };

test("private, loopback, link-local and CGNAT addresses are refused", async () => {
  for (const host of ["127.0.0.1", "10.0.0.5", "172.16.1.1", "192.168.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "192.0.0.8", "198.18.0.1", "198.19.255.1", "[::1]", "[fd00::1]", "[fe80::1]", "[::ffff:127.0.0.1]", "[::ffff:7f00:1]"]) {
    await assert.rejects(assertPublicUrl(`http://${host}/`, PUBLIC), /not a public website/, host);
  }
});

test("NAT64, 6to4 and old site-local IPv6 ranges are refused when they hide a private address", async () => {
  for (const host of ["[64:ff9b::7f00:1]", "[64:ff9b::a9fe:a9fe]", "[2002:7f00:1::1]", "[2002:c0a8:101::]", "[fec0::1]"]) {
    await assert.rejects(assertPublicUrl(`http://${host}/`, PUBLIC), /not a public website/, host);
  }
});

test("public IPv4 and IPv6 addresses pass", () => {
  for (const ip of ["93.184.216.34", "8.8.8.8", "198.20.0.1", "2606:4700:4700::1111", "64:ff9b::808:808", "2002:808:808::1", "::ffff:8.8.8.8"]) {
    assert.equal(isPrivate(ip), false, ip);
  }
});

test("a host that resolves to several addresses is refused when any is private", async () => {
  await assert.rejects(assertPublicUrl("https://shop.example/", { resolve: async () => ["93.184.216.34", "10.0.0.1"] }), /not a public website/);
});

test("only public http(s) links without credentials pass", async () => {
  assert.equal((await assertPublicUrl("https://example.com/p?id=1", PUBLIC)).hostname, "example.com");
  await assert.rejects(assertPublicUrl("ftp://example.com/", PUBLIC), /Only http/);
  await assert.rejects(assertPublicUrl("https://user:pw@example.com/", PUBLIC), /username/);
  await assert.rejects(assertPublicUrl("https://nowhere.example/", { resolve: async () => [] }), /Could not find/);
  await assert.rejects(assertPublicUrl("nonsense", PUBLIC), /does not look like a link/);
});
