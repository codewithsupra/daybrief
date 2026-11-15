import { describe, expect, it } from "vitest";
import { domainChain, isBlocked, ruleCategory, sanitizeUrl } from "@/lib/categorize";
import { DEFAULT_BLOCKLIST } from "@/lib/defaults";
import { cleanEvents, ingestSchema } from "@/lib/ingest";

describe("sanitizeUrl", () => {
  it("drops query strings and fragments", () => {
    expect(sanitizeUrl("https://shop.example/search?q=private+thing&token=abc#frag")).toBe(
      "https://shop.example/search",
    );
  });
  it("keeps only the video id on YouTube watch pages", () => {
    expect(sanitizeUrl("https://www.youtube.com/watch?v=abc123&list=PL9&t=42s")).toBe(
      "https://www.youtube.com/watch?v=abc123",
    );
  });
  it("rejects non-web addresses", () => {
    expect(sanitizeUrl("chrome://extensions")).toBeNull();
    expect(sanitizeUrl("file:///Users/me/secret.pdf")).toBeNull();
    expect(sanitizeUrl("not a url")).toBeNull();
  });
});

describe("categorisation rules", () => {
  it("matches subdomains through their parent", () => {
    expect(domainChain("a.b.example.com")).toEqual(["a.b.example.com", "b.example.com", "example.com"]);
    expect(ruleCategory("gist.github.com", "")).toBe("work_learning");
    expect(ruleCategory("old.reddit.com", "")).toBe("social");
  });
  it("prefers the most specific rule", () => {
    expect(ruleCategory("studio.youtube.com", "Channel dashboard")).toBe("creator");
    expect(ruleCategory("news.ycombinator.com", "")).toBe("news");
  });
  it("treats YouTube as entertainment unless the title reads like learning", () => {
    expect(ruleCategory("youtube.com", "Top 40 goals of the season")).toBe("entertainment");
    expect(ruleCategory("youtube.com", "System design explained: queues")).toBe("work_learning");
    expect(ruleCategory("youtube.com", "Postgres tutorial for beginners")).toBe("work_learning");
  });
  it("returns null for domains it doesn't know", () => {
    expect(ruleCategory("some-unknown-site.io", "Hello")).toBeNull();
  });
});

describe("blocklist", () => {
  it("blocks a listed domain and its subdomains, not lookalikes", () => {
    expect(isBlocked("secure.chase.com", ["chase.com"])).toBe(true);
    expect(isBlocked("chase.com", ["www.chase.com"])).toBe(true);
    expect(isBlocked("notchase.com", ["chase.com"])).toBe(false);
  });
});

describe("cleanEvents", () => {
  const base = { title: "T", startedAt: 1_800_000_000_000, durationSec: 60, day: "2026-11-14" };

  it("drops blocked, trivial and non-web events and strips the rest", () => {
    const out = cleanEvents(
      [
        { ...base, url: "https://mail.google.com/mail/u/0/#inbox" },
        { ...base, url: "https://github.com/x?tab=secret", durationSec: 3 },
        { ...base, url: "chrome://settings" },
        { ...base, url: "https://my-bank.example/accounts?id=9" },
        { ...base, url: "https://github.com/org/repo?tab=readme", title: "repo" },
      ],
      [...DEFAULT_BLOCKLIST, "my-bank.example"],
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      url: "https://github.com/org/repo",
      domain: "github.com",
      category: "work_learning",
      videoId: null,
    });
  });

  it("extracts the video id, cleans the YouTube title and keeps the channel", () => {
    const [e] = cleanEvents(
      [{ ...base, url: "https://www.youtube.com/watch?v=abc&t=10", title: "(3) Crash course in SQL - YouTube", channel: " Teach " }],
      [],
    );
    expect(e).toMatchObject({ videoId: "abc", title: "Crash course in SQL", channel: "Teach", category: "work_learning" });
  });

  it("caps absurd durations and ignores a channel on non-video pages", () => {
    const [e] = cleanEvents([{ ...base, url: "https://x.com/home", durationSec: 999_999, channel: "nope" }], []);
    expect(e.durationSec).toBe(4 * 3600);
    expect(e.channel).toBeNull();
  });
});

describe("ingestSchema", () => {
  it("rejects malformed days and oversized batches", () => {
    const e = { url: "https://a.example", title: "", startedAt: 1, durationSec: 10, day: "14/11/2026" };
    expect(ingestSchema.safeParse({ events: [e] }).success).toBe(false);
    const ok = { ...e, day: "2026-11-14" };
    expect(ingestSchema.safeParse({ events: Array(501).fill(ok) }).success).toBe(false);
    expect(ingestSchema.safeParse({ events: [ok] }).success).toBe(true);
  });
});
