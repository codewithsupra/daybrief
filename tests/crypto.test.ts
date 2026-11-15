import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { decrypt, encrypt, newToken, sha256 } from "@/lib/crypto";

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("token encryption", () => {
  it("round-trips and never produces the same ciphertext twice", () => {
    const a = encrypt("1//refresh-token");
    const b = encrypt("1//refresh-token");
    expect(a).not.toBe(b);
    expect(a).not.toContain("refresh-token");
    expect(decrypt(a)).toBe("1//refresh-token");
  });

  it("refuses tampered ciphertext", () => {
    const buf = Buffer.from(encrypt("secret"), "base64");
    buf[buf.length - 1] ^= 1;
    expect(() => decrypt(buf.toString("base64"))).toThrow();
  });

  it("rejects a key of the wrong length", () => {
    const good = process.env.TOKEN_ENCRYPTION_KEY;
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.from("short").toString("base64");
    expect(() => encrypt("x")).toThrow(/32 bytes/);
    process.env.TOKEN_ENCRYPTION_KEY = good;
  });

  it("makes distinct extension tokens and stable hashes", () => {
    expect(newToken()).not.toBe(newToken());
    expect(newToken()).toMatch(/^db_[\w-]{32}$/);
    expect(sha256("a")).toBe(sha256("a"));
  });
});
