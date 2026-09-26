import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

export class UnsafeOutboundUrlError extends Error {}

function blockedIPv4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
}

function blockedIPv6(ip: string) {
  const value = ip.toLowerCase();
  return value === "::" || value === "::1" || value.startsWith("fe80:") ||
    value.startsWith("fc") || value.startsWith("fd") || value.startsWith("ff") ||
    value.startsWith("::ffff:127.") || value.startsWith("::ffff:10.") ||
    value.startsWith("::ffff:192.168.") || /^::ffff:172\.(1[6-9]|2\d|3[01])\./.test(value);
}

export function isPublicIp(address: string) {
  const family = isIP(address);
  if (family === 4) return !blockedIPv4(address);
  if (family === 6) return !blockedIPv6(address);
  return false;
}

/** Validates user-controlled integration endpoints before any server-side fetch. */
export async function validateOutboundHttpsUrl(
  raw: string,
  resolve: (hostname: string) => Promise<Array<{ address: string }>> = (hostname) => lookup(hostname, { all: true }),
) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new UnsafeOutboundUrlError("Malformed outbound URL"); }
  if (url.protocol !== "https:" || url.username || url.password || url.hash || !url.hostname) {
    throw new UnsafeOutboundUrlError("Outbound URL must be credential-free HTTPS");
  }
  // WHATWG URL keeps brackets around IPv6 literals in hostname.
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "metadata.google.internal") {
    throw new UnsafeOutboundUrlError("Internal hostname is not allowed");
  }
  if (isIP(hostname)) {
    if (!isPublicIp(hostname)) throw new UnsafeOutboundUrlError("Internal IP address is not allowed");
    return url;
  }
  let addresses: Array<{ address: string }>;
  try { addresses = await resolve(hostname); } catch { throw new UnsafeOutboundUrlError("Outbound hostname could not be resolved"); }
  if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new UnsafeOutboundUrlError("Outbound hostname resolves to an internal address");
  }
  return url;
}
