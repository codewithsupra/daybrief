import { summarizeDay, topSites, type AttentionEvent } from "./attention";
import { domainOf, ruleCategory } from "./categorize";
import { dayInZone, lastDays, shiftDay } from "./days";

/**
 * Made-up data for the public demo. The demo pages read only this file: no database, no sign-in,
 * no real accounts. Dates are relative to today so it always looks current.
 */

export type DemoThread = {
  threadId: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  reason: string;
  category: "needs_reply" | "deadline" | "waiting";
  dueDate: string | null;
  daysOld: number;
  draft: string;
};

export type DemoItem = {
  id: string;
  title: string;
  why: string;
  goal: string;
  minutes: number;
  threadId: string | null;
};

const SITES: [url: string, title: string, minutes: number, channel?: string][] = [
  ["https://github.com/northwind/volunteer-app/pull/42", "Volunteer flow redesign · Pull Request #42", 38],
  ["https://docs.google.com/document/d/abc/edit", "Onboarding notes", 22],
  ["https://www.youtube.com/watch?v=demo-learn", "System design explained: queues and backpressure", 26, "Systems Weekly"],
  ["https://www.youtube.com/watch?v=demo-fun-1", "Top 40 football goals of the season", 47, "Goal Reel"],
  ["https://www.youtube.com/watch?v=demo-fun-2", "I rebuilt a 1970s arcade cabinet", 31, "Retro Bench"],
  ["https://www.reddit.com/r/all/", "all", 34],
  ["https://x.com/home", "Home", 19],
  ["https://news.ycombinator.com/", "Hacker News", 12],
  ["https://www.figma.com/file/xyz", "Volunteer prototype", 28],
  ["https://www.amazon.com/dp/B0", "Desk lamp", 6],
];

export function demoWorld(now: Date = new Date()) {
  const today = dayInZone(now, "UTC");
  const yesterday = shiftDay(today, -1);
  const days = lastDays(today, 7);

  const events: AttentionEvent[] = [];
  days.forEach((day, di) => {
    const back = 6 - di;
    SITES.forEach(([url, title, minutes, channel], n) => {
      const factor = (0.5 + ((back * 7 + n * 3) % 10) / 10) * (back === 0 ? 0.4 : 1);
      const domain = domainOf(url);
      events.push({
        day,
        durationSec: Math.round(minutes * 60 * factor),
        domain,
        title,
        url,
        category: ruleCategory(domain, title) ?? "other",
        videoId: new URL(url).searchParams.get("v"),
        channel: channel ?? null,
      });
    });
  });

  const yday = summarizeDay(yesterday, events);
  const ydayEvents = events.filter((e) => e.day === yesterday);
  const drain = topSites(ydayEvents, 8).find((s) => !["work_learning", "creator"].includes(s.category));

  const threads: DemoThread[] = [
    {
      threadId: "demo-marcus",
      fromName: "Marcus Lee",
      fromEmail: "marcus@northwind.example",
      subject: "Friday design review",
      reason: "Marcus is asking for the prototype link before Friday.",
      category: "needs_reply",
      dueDate: null,
      daysOld: 0,
      draft:
        "Hi Marcus,\n\nHere's the prototype link for Friday: figma.com/file/xyz. The volunteer sign-up flow is the part I'd most like your eyes on.\n\nHappy to walk through it before the review if that helps.\n\nBest,\nAlex",
    },
    {
      threadId: "demo-priya",
      fromName: "Priya Nair",
      fromEmail: "priya@northwind.example",
      subject: "Onboarding checklist: two items left",
      reason: "Priya needs your laptop serial and a benefits choice.",
      category: "needs_reply",
      dueDate: null,
      daysOld: 1,
      draft:
        "Hi Priya,\n\nThanks for the nudge. My laptop serial is on the sticker under the lid and I'll send it over today. I'll pick a benefits plan by end of day tomorrow.\n\nAlex",
    },
    {
      threadId: "demo-ana",
      fromName: "Ana Souza",
      fromEmail: "ana@creatorsguild.example",
      subject: "Guest spot on the podcast?",
      reason: "Ana is asking whether you can join in December.",
      category: "needs_reply",
      dueDate: null,
      daysOld: 4,
      draft:
        "Hi Ana,\n\nThanks for the invite, I'd love to. December works. Could you send two or three dates and the usual length of an episode?\n\nAlex",
    },
    {
      threadId: "demo-utilities",
      fromName: "City Utilities",
      fromEmail: "billing@cityutil.example",
      subject: "Your bill is ready",
      reason: "A bill of 41.20 is due soon.",
      category: "deadline",
      dueDate: shiftDay(today, 6),
      daysOld: 2,
      draft: "",
    },
    {
      threadId: "demo-rahul",
      fromName: "Rahul Mehta",
      fromEmail: "rahul@example.com",
      subject: "Intro to the video editor I mentioned",
      reason: "You wrote last; no answer from Rahul yet.",
      category: "waiting",
      dueDate: null,
      daysOld: 6,
      draft:
        "Hi Rahul,\n\nJust checking whether you had a chance to ask your editor friend. No rush, but I'd like to start on my first video this week.\n\nThanks,\nAlex",
    },
    {
      threadId: "demo-landlord",
      fromName: "Harbour Flats",
      fromEmail: "office@harbourflats.example",
      subject: "Lease renewal",
      reason: "You asked about renewal terms; no answer yet.",
      category: "waiting",
      dueDate: null,
      daysOld: 4,
      draft:
        "Hello,\n\nFollowing up on my question about the renewal terms. Could you send the form and the new monthly amount when you can?\n\nThank you,\nAlex",
    },
  ];

  const items: DemoItem[] = [
    { id: "i1", title: "Reply to Marcus about Friday's design review", why: "He asked for the prototype link before the review.", goal: "Perform well at the new job", minutes: 10, threadId: "demo-marcus" },
    { id: "i2", title: "Finish Priya's onboarding checklist", why: "Two items left: laptop serial and benefits plan.", goal: "Perform well at the new job", minutes: 15, threadId: "demo-priya" },
    { id: "i3", title: "Pay the City Utilities bill", why: "Due in 6 days.", goal: "", minutes: 5, threadId: "demo-utilities" },
    { id: "i4", title: "Outline your first video in three bullets", why: "No progress on this goal all week.", goal: "Start and grow a channel or site", minutes: 30, threadId: null },
    { id: "i5", title: "Reply to Ana about the podcast", why: "She asked four days ago; a guest spot builds an audience.", goal: "Start and grow a channel or site", minutes: 10, threadId: "demo-ana" },
    { id: "i6", title: "Keep YouTube under 20 minutes today", why: "It took 47 minutes yesterday.", goal: "Waste less time", minutes: 5, threadId: null },
  ];

  const summary =
    `Yesterday ${yday.alignedPct}% of your browser time went to your goals` +
    (drain ? `; ${drain.label} took the most.` : ".") +
    " Clear the replies first, then outline your first video.";

  return { today, yesterday, days, events, ydayEvents, yday, threads, items, summary };
}
