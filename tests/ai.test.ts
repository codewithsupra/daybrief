import { beforeEach, describe, expect, it, vi } from "vitest";

const generateObject = vi.fn();
let configured = true;
vi.mock("@/lib/ai", () => ({
  aiConfigured: () => configured,
  generateObject: (...args: unknown[]) => generateObject(...args),
}));
vi.mock("@/db", () => ({ getDb: vi.fn(), schema: {} }));

import { draftPlan, fallbackPlan, normalizeItems, sourceUrl, type PlanContext } from "@/lib/planner";
import { classifyThreads, heuristicTriage, type TriageInput } from "@/lib/triage";

const thread = (over: Partial<TriageInput>): TriageInput => ({
  threadId: "t1",
  subject: "Friday review",
  fromName: "Marcus",
  fromEmail: "marcus@work.example",
  snippet: "Can you share the link before Friday?",
  lastFromMe: false,
  lastMessageAt: new Date("2026-11-14T08:00:00Z"),
  messageCount: 1,
  ...over,
});

const ctx = (over: Partial<PlanContext> = {}): PlanContext => ({
  today: "2026-11-15",
  goals: [
    { title: "Perform well at the new job", detail: "Stay on top of commitments." },
    { title: "Start and grow a channel or site", detail: "Publish a first piece." },
    { title: "Waste less time", detail: "Keep attention on goals." },
  ],
  threads: [
    { threadId: "t1", subject: "Friday review", fromName: "Marcus", category: "needs_reply", reason: "Wants the link.", dueDate: null, daysOld: 1 },
    { threadId: "t2", subject: "Your bill", fromName: "Utilities", category: "deadline", reason: "Due soon.", dueDate: "2026-11-22", daysOld: 2 },
  ],
  metrics: { totalMinutes: 200, alignedPct: 30, byCategory: { social: 90, work_learning: 60, entertainment: 50 }, needsReply: 1, deadlines: 1 },
  topSites: [
    { label: "reddit.com", minutes: 90, category: "social" },
    { label: "github.com", minutes: 60, category: "work_learning" },
  ],
  topVideos: [],
  history: [],
  ...over,
});

beforeEach(() => {
  generateObject.mockReset();
  configured = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("triage", () => {
  it("uses the model's answer and discards malformed due dates", async () => {
    generateObject.mockResolvedValue({
      threads: [{ threadId: "t1", category: "needs_reply", reason: "Marcus needs the link.", dueDate: "Friday" }],
    });
    expect(await classifyThreads([thread({})], "2026-11-15")).toEqual([
      { threadId: "t1", category: "needs_reply", reason: "Marcus needs the link.", dueDate: null },
    ]);
    const call = generateObject.mock.calls[0][0];
    expect(call.model).toBe("fast");
    expect(call.prompt).toContain('"lastMessageBy": "them"');
  });

  it("falls back to rules for threads the model skipped", async () => {
    generateObject.mockResolvedValue({ threads: [] });
    const [r] = await classifyThreads([thread({ lastFromMe: true })], "2026-11-15");
    expect(r.category).toBe("waiting");
  });

  it("falls back to rules when the model call fails or no key is set", async () => {
    generateObject.mockRejectedValue(new Error("gateway down"));
    expect((await classifyThreads([thread({})], "2026-11-15"))[0].category).toBe("needs_reply");
    configured = false;
    generateObject.mockClear();
    await classifyThreads([thread({})], "2026-11-15");
    expect(generateObject).not.toHaveBeenCalled();
  });

  it("rules: automated senders are noise unless they mention a due date", () => {
    const auto = { fromEmail: "no-reply@shop.example", fromName: "Shop" };
    expect(heuristicTriage(thread({ ...auto, subject: "Big sale", snippet: "Can you believe these prices?" })).category).toBe("noise");
    expect(heuristicTriage(thread({ ...auto, subject: "Bill ready", snippet: "Payment due 22 Nov" })).category).toBe("deadline");
    expect(heuristicTriage(thread({ subject: "Notes", snippet: "Here are the notes from today." })).category).toBe("fyi");
  });
});

describe("planner", () => {
  it("keeps the model's plan but strips references it invented", async () => {
    generateObject.mockResolvedValue({
      summary: " Focus on Marcus. ",
      items: [
        { title: "Reply to Marcus", why: "He asked.", goal: "Perform well at the new job", minutes: 10, sourceType: "email", sourceRef: "t1" },
        { title: "Reply to a ghost", why: "?", goal: "Made-up goal", minutes: 9999, sourceType: "email", sourceRef: "t-not-real" },
        { title: "Read this", why: "?", goal: "", minutes: 0, sourceType: "web", sourceRef: "javascript:alert(1)" },
      ],
    });
    const plan = await draftPlan(ctx());
    expect(plan.source).toBe("model");
    expect(plan.summary).toBe("Focus on Marcus.");
    expect(plan.items[0]).toMatchObject({ sourceType: "email", sourceRef: "t1", goal: "Perform well at the new job" });
    expect(plan.items[1]).toMatchObject({ sourceType: "none", sourceRef: null, goal: "", minutes: 240 });
    expect(plan.items[2]).toMatchObject({ sourceType: "none", sourceRef: null, minutes: 15 });
  });

  it("caps the plan at seven items", () => {
    const item = { title: "x", why: "", goal: "", minutes: 10, sourceType: "none" as const, sourceRef: null };
    expect(normalizeItems(Array(12).fill(item), ctx())).toHaveLength(7);
  });

  it("uses the rule-based plan when the model fails or returns nothing", async () => {
    generateObject.mockRejectedValue(new Error("boom"));
    expect((await draftPlan(ctx())).source).toBe("fallback");
    generateObject.mockResolvedValue({ summary: "", items: [] });
    expect((await draftPlan(ctx())).source).toBe("fallback");
  });

  it("fallback: dated items first, then replies, a correction naming the drain, then goal steps", () => {
    const plan = fallbackPlan(ctx());
    expect(plan.items[0].title).toBe('Handle "Your bill" before 2026-11-22');
    expect(plan.items[1].title).toBe('Reply to Marcus about "Friday review"');
    expect(plan.items[2].title).toBe("Cap reddit.com at 45 minutes today");
    expect(plan.items[2].goal).toBe("Waste less time");
    expect(plan.items.some((i) => i.goal === "Start and grow a channel or site")).toBe(true);
    expect(plan.summary).toContain("30%");
  });

  it("fallback: no attention correction when the day was mostly on goals or nothing was tracked", () => {
    const good = fallbackPlan(ctx({ metrics: { ...ctx().metrics, alignedPct: 80 } }));
    expect(good.items.some((i) => i.title.startsWith("Cap "))).toBe(false);
    const empty = fallbackPlan(ctx({ metrics: { totalMinutes: 0, alignedPct: 0, byCategory: {}, needsReply: 1, deadlines: 1 }, topSites: [] }));
    expect(empty.items.some((i) => i.title.startsWith("Cap "))).toBe(false);
    expect(empty.summary).toContain("No browsing was recorded");
  });

  it("fallback: doesn't bring back what was dismissed", () => {
    const plan = fallbackPlan(
      ctx({ history: [{ title: 'Reply to Marcus about "Friday review"', status: "dismissed", day: "2026-11-14" }] }),
    );
    expect(plan.items.some((i) => i.title.includes("Marcus"))).toBe(false);
  });

  it("links emails to Gmail and web items to their URL", () => {
    expect(sourceUrl({ sourceType: "email", sourceRef: "t1" })).toBe("https://mail.google.com/mail/u/0/#all/t1");
    expect(sourceUrl({ sourceType: "web", sourceRef: "https://a.example" })).toBe("https://a.example");
    expect(sourceUrl({ sourceType: "none", sourceRef: null })).toBeNull();
  });
});
