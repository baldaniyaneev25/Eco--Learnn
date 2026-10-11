import { describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, MOBILE_TOKEN_TTL_SECONDS, verifySessionToken } from "@/lib/auth/session";
import { backoffDelayMinutes, withRetry } from "@/lib/ingestion/sync";
import { FetchError } from "@/lib/security/safe-fetch";

const SECRET = "x".repeat(40);

describe("passwords", () => {
  it("hashes and verifies with scrypt", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).toMatch(/^scrypt\$/);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
});

describe("session tokens", () => {
  it("round-trips a signed token", () => {
    const token = createSessionToken("abc", "admin", SECRET, 0);
    expect(verifySessionToken(token, SECRET, 1000)).toMatchObject({ uid: "abc", role: "admin" });
  });

  it("issues longer-lived mobile tokens that still expire", () => {
    const token = createSessionToken("abc", "student", SECRET, 0, MOBILE_TOKEN_TTL_SECONDS);
    expect(verifySessionToken(token, SECRET, 13 * 3600 * 1000)).toMatchObject({ uid: "abc" });
    expect(verifySessionToken(token, SECRET, 31 * 86400 * 1000)).toBeNull();
  });

  it("rejects tampered, foreign and expired tokens", () => {
    const token = createSessionToken("abc", "student", SECRET, 0);
    const [data, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "abc", role: "admin", exp: 9e9 })).toString("base64url");
    expect(verifySessionToken(`${forged}.${sig}`, SECRET, 1000)).toBeNull();
    expect(verifySessionToken(`${data}.${sig}`, "y".repeat(40), 1000)).toBeNull();
    expect(verifySessionToken(token, SECRET, 13 * 3600 * 1000)).toBeNull();
    expect(verifySessionToken(undefined, SECRET)).toBeNull();
  });
});

describe("backoffDelayMinutes", () => {
  it("doubles with failures, never below the interval, capped at a day", () => {
    expect(backoffDelayMinutes(60, 0)).toBe(60);
    expect(backoffDelayMinutes(60, 1)).toBe(120);
    expect(backoffDelayMinutes(60, 3)).toBe(480);
    expect(backoffDelayMinutes(60, 20)).toBe(1440);
    expect(backoffDelayMinutes(2880, 5)).toBe(2880);
  });
});

describe("withRetry", () => {
  it("retries retryable errors with exponential backoff and honours Retry-After", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new FetchError("HTTP 503", true, 503))
      .mockRejectedValueOnce(new FetchError("HTTP 429", true, 429, 5000))
      .mockResolvedValueOnce("ok");
    const result = await withRetry(fn, { attempts: 3, baseDelayMs: 100, sleep });
    expect(result).toEqual({ value: "ok", attempts: 3 });
    expect(sleep.mock.calls.map((c) => (c as unknown[])[0])).toEqual([100, 5000]);
  });

  it("does not retry permanent errors (e.g. 403 access control)", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn().mockRejectedValue(new FetchError("HTTP 403", false, 403));
    await expect(withRetry(fn, { attempts: 3, sleep })).rejects.toThrow("HTTP 403");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("gives up after the attempt limit", async () => {
    const fn = vi.fn().mockRejectedValue(new FetchError("timeout", true));
    await expect(withRetry(fn, { attempts: 3, sleep: async () => {} })).rejects.toThrow("timeout");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
