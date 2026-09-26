import { describe, expect, it } from "vitest";
import { UnsafeOutboundUrlError, validateOutboundHttpsUrl } from "@/shared/security/outbound-url";

const publicDns = async () => [{ address: "93.184.216.34" }];
const privateDns = async () => [{ address: "10.0.0.5" }];

describe("outbound integration URL validation", () => {
  it.each([
    "https://localhost", "https://127.0.0.1", "https://10.1.2.3", "https://172.20.1.1",
    "https://192.168.1.1", "https://169.254.169.254", "https://[::1]", "https://[fd00::1]",
    "http://example.com", "https://user:pass@example.com", "not a URL",
  ])("rejects unsafe endpoint %s", async (url) => {
    await expect(validateOutboundHttpsUrl(url, publicDns)).rejects.toBeInstanceOf(UnsafeOutboundUrlError);
  });

  it("accepts a public HTTPS hostname", async () => {
    await expect(validateOutboundHttpsUrl("https://shop.example.com/api", publicDns)).resolves.toMatchObject({ hostname: "shop.example.com" });
  });

  it("rejects DNS names resolving to a private address", async () => {
    await expect(validateOutboundHttpsUrl("https://shop.example.com", privateDns)).rejects.toBeInstanceOf(UnsafeOutboundUrlError);
  });
});
