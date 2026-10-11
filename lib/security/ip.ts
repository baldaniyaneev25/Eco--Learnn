import net from "node:net";

// Addresses the fetcher must never connect to: loopback, private networks,
// link-local (incl. cloud metadata 169.254.169.254), CGNAT, multicast,
// documentation/benchmark ranges and IPv6 equivalents.
const blockList = new net.BlockList();

const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

const V6_BLOCKED: [string, number][] = [
  ["::", 128],
  ["::1", 128],
  ["100::", 64],
  ["2001::", 32], // Teredo
  ["2001:db8::", 32],
  ["2002::", 16], // 6to4 can tunnel to private v4
  ["fc00::", 7], // unique local (incl. fd00:ec2::254 metadata)
  ["fe80::", 10],
  ["ff00::", 8],
];

for (const [addr, prefix] of V4_BLOCKED) blockList.addSubnet(addr, prefix, "ipv4");
for (const [addr, prefix] of V6_BLOCKED) blockList.addSubnet(addr, prefix, "ipv6");

/** Extracts an embedded IPv4 address from IPv4-mapped / NAT64 / compatible forms. */
function embeddedIPv4(v6: string): string | undefined {
  const lower = v6.toLowerCase();
  const dotted = lower.match(/^(?:::ffff:|::|64:ff9b::)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) return dotted[1];
  const hex = lower.match(/^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return [hi >> 8, hi & 255, lo >> 8, lo & 255].join(".");
  }
  return undefined;
}

export function isBlockedIp(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return blockList.check(address, "ipv4");
  if (family === 6) {
    const v4 = embeddedIPv4(address);
    if (v4) return blockList.check(v4, "ipv4");
    // Any other ::ffff:/64:ff9b:: form we couldn't parse is rejected outright.
    if (/^(::ffff:|64:ff9b::)/i.test(address)) return true;
    return blockList.check(address, "ipv6");
  }
  // Not an IP address at all: treat as unsafe.
  return true;
}
