import { describe, expect, it } from "vitest";
import { summarizeDay, topSites, topVideos, type AttentionEvent } from "@/lib/attention";
import { dayInZone, formatMinutes, lastDays, shiftDay } from "@/lib/days";

const ev = (over: Partial<AttentionEvent>): AttentionEvent => ({
  day: "2026-11-14",
  durationSec: 600,
  domain: "github.com",
  title: "PR",
  url: "https://github.com/a",
  category: "work_learning",
  ...over,
});

describe("summarizeDay", () => {
  it("totals minutes by category and computes the aligned share", () => {
    const s = summarizeDay("2026-11-14", [
      ev({ durationSec: 1800 }),
      ev({ durationSec: 600, category: "creator", domain: "canva.com" }),
      ev({ durationSec: 3600, category: "entertainment", domain: "youtube.com" }),
      ev({ day: "2026-11-13", durationSec: 9999 }),
    ]);
    expect(s.totalMinutes).toBe(100);
    expect(s.byCategory).toEqual({ work_learning: 30, creator: 10, entertainment: 60 });
    expect(s.alignedPct).toBe(40);
  });

  it("is all zeros for a day with nothing recorded", () => {
    expect(summarizeDay("2026-11-14", [])).toEqual({
      day: "2026-11-14",
      totalMinutes: 0,
      alignedPct: 0,
      byCategory: {},
    });
  });
});

describe("rankings", () => {
  const events = [
    ev({ domain: "reddit.com", category: "social", durationSec: 900 }),
    ev({ domain: "reddit.com", category: "social", durationSec: 900 }),
    ev({ durationSec: 1200 }),
    ev({ domain: "youtube.com", category: "entertainment", videoId: "v1", title: "Goals", channel: "Reel", durationSec: 300 }),
    ev({ domain: "youtube.com", category: "entertainment", videoId: "v1", title: "Goals", channel: "Reel", durationSec: 300 }),
  ];

  it("merges visits to the same site and sorts by time", () => {
    expect(topSites(events).map((s) => [s.label, s.minutes])).toEqual([
      ["reddit.com", 30],
      ["github.com", 20],
      ["youtube.com", 10],
    ]);
  });

  it("lists only videos, merged by video id", () => {
    expect(topVideos(events)).toEqual([
      { label: "Goals — Reel", minutes: 10, category: "entertainment", url: "https://www.youtube.com/watch?v=v1" },
    ]);
  });
});

describe("days", () => {
  it("uses the user's timezone, not UTC, for the calendar day", () => {
    const instant = new Date("2026-11-14T21:30:00Z");
    expect(dayInZone(instant, "Asia/Muscat")).toBe("2026-11-15");
    expect(dayInZone(instant, "America/Los_Angeles")).toBe("2026-11-14");
  });

  it("shifts across month and year boundaries", () => {
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(lastDays("2026-11-02", 3)).toEqual(["2026-10-31", "2026-11-01", "2026-11-02"]);
  });

  it("formats durations", () => {
    expect(formatMinutes(42.4)).toBe("42m");
    expect(formatMinutes(125)).toBe("2h 05m");
  });
});
