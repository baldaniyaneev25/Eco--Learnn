import { describe, expect, it } from "vitest";
import { isBlockedIp } from "@/lib/security/ip";
import { safeFetch, safeLookup } from "@/lib/security/safe-fetch";
import { validateSourceUrl, UrlNotAllowedError } from "@/lib/security/url-guard";
import { rateLimit } from "@/lib/security/rate-limit";

describe("isBlockedIp", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.5",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // cloud metadata
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fe80::1",
    "fd00:ec2::254",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:169.254.169.254",
    "64:ff9b::10.0.0.1",
    "not-an-ip",
  ])("blocks %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "203.0.114.1", "2606:4700:4700::1111", "172.32.0.1"])("allows public %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });
});

describe("validateSourceUrl", () => {
  it("accepts approved https domains and subdomains", () => {
    expect(validateSourceUrl("https://www.rbi.org.in/pressreleases_rss.xml").approved.domain).toBe("rbi.org.in");
    expect(validateSourceUrl("https://api.worldbank.org/v2/country/IND").approved.domain).toBe("api.worldbank.org");
  });

  it.each([
    ["http://www.rbi.org.in/feed", "https"],
    ["https://evil.example.com/feed", "allowlist"],
    ["https://rbi.org.in.evil.com/feed", "allowlist"],
    ["https://127.0.0.1/feed", "IP"],
    ["https://[::1]/feed", "IP"],
    ["https://localhost/feed", "Internal"],
    ["https://metadata.google.internal/", "Internal"],
    ["https://user:pass@www.rbi.org.in/", "credentials"],
    ["https://www.rbi.org.in:8443/", "ports"],
    ["file:///etc/passwd", "https"],
    ["not a url", "Invalid"],
  ])("rejects %s", (url, reason) => {
    expect(() => validateSourceUrl(url)).toThrow(UrlNotAllowedError);
    expect(() => validateSourceUrl(url)).toThrow(new RegExp(reason, "i"));
  });

  it("honours extra domains from configuration", () => {
    expect(() => validateSourceUrl("https://data.example.org/x")).toThrow();
    expect(validateSourceUrl("https://data.example.org/x", ["example.org"]).approved.domain).toBe("example.org");
  });
});

describe("safeLookup / safeFetch", () => {
  it("refuses hostnames that resolve to loopback", async () => {
    const err = await new Promise<Error | null>((resolve) =>
      safeLookup("localhost", {}, (e) => resolve(e as Error | null)),
    );
    expect(err?.message).toMatch(/Blocked address/);
  });

  it("refuses non-allowlisted URLs before any network access", async () => {
    await expect(safeFetch("https://169.254.169.254/latest/meta-data/")).rejects.toThrow(UrlNotAllowedError);
    await expect(safeFetch("https://example.com/")).rejects.toThrow(UrlNotAllowedError);
  });
});

describe("rateLimit", () => {
  it("limits within a window and resets afterwards", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 1000, 0).ok).toBe(true);
    expect(rateLimit(key, 3, 1000, 10).ok).toBe(false);
    expect(rateLimit(key, 3, 1000, 1001).ok).toBe(true);
  });
});
