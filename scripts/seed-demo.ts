/**
 * Fills the local embedded database with a demo user and a week of made-up mail and browsing.
 * Run with: pnpm seed   (then start the app with DEMO_MODE=1)
 */
import { eq } from "drizzle-orm";
import { ensureUserRow } from "./seed-user";
import { getDb, schema } from "../src/db";
import { dayInZone, shiftDay } from "../src/lib/days";
import { cleanEvents } from "../src/lib/ingest";
import { classifyThreads } from "../src/lib/triage";

const TZ = process.env.DEFAULT_TIMEZONE ?? "UTC";

const MAIL = [
  ["Priya Nair", "priya@northwind.example", "Onboarding checklist — two items left", "Could you confirm your laptop serial and pick a benefits plan by Friday?", false, 1],
  ["Marcus Lee", "marcus@northwind.example", "Friday design review", "Can you share the volunteer flow prototype link before the review?", false, 0],
  ["City Utilities", "no-reply@cityutil.example", "Your bill is ready", "Payment due 22 Nov. Amount: 41.20. Unsubscribe from paper bills", false, 2],
  ["Ana Souza", "ana@creatorsguild.example", "Guest spot on the podcast?", "We'd love to have you on in December — let me know if you're interested.", false, 4],
  ["Dev Weekly", "newsletter@devweekly.example", "Issue 412: what's new in React", "This week: compiler updates, and more. Unsubscribe", false, 0],
  ["Rahul Mehta", "rahul@example.com", "Intro to the video editor I mentioned", "Sent him your details last week.", true, 6],
  ["Landlord", "office@harbourflats.example", "Lease renewal", "Thanks, got your message. Will send the renewal form.", true, 1],
] as const;

const SITES: [string, string, number][] = [
  ["https://github.com/northwind/volunteer-app/pull/42", "Volunteer flow redesign · Pull Request #42", 38],
  ["https://docs.google.com/document/d/abc/edit", "Onboarding notes", 22],
  ["https://www.youtube.com/watch?v=vid-learn-1", "System design explained: queues and backpressure - YouTube", 26],
  ["https://www.youtube.com/watch?v=vid-fun-1", "Top 40 football goals of the season - YouTube", 47],
  ["https://www.youtube.com/watch?v=vid-fun-2", "I rebuilt a 1970s arcade cabinet - YouTube", 31],
  ["https://www.reddit.com/r/all/", "all - Reddit", 34],
  ["https://x.com/home", "Home / X", 19],
  ["https://news.ycombinator.com/", "Hacker News", 12],
  ["https://www.figma.com/file/xyz", "Volunteer prototype – Figma", 28],
  ["https://www.amazon.ae/dp/B0", "Desk lamp", 6],
  ["https://stripe.com/docs/billing", "Billing docs", 9],
];
const CHANNELS: Record<string, string> = {
  "vid-learn-1": "ByteByteGo",
  "vid-fun-1": "Goal Reel",
  "vid-fun-2": "Retro Bench",
};

async function main() {
  const db = await getDb();
  const userId = await ensureUserRow("demo@daybrief.local", "Demo", TZ);
  const today = dayInZone(new Date(), TZ);

  await db.delete(schema.emailThreads).where(eq(schema.emailThreads.userId, userId));
  await db.delete(schema.browseEvents).where(eq(schema.browseEvents.userId, userId));
  await db.delete(schema.dailyPlans).where(eq(schema.dailyPlans.userId, userId));

  const threads = MAIL.map(([fromName, fromEmail, subject, snippet, lastFromMe, daysOld], i) => ({
    threadId: `demo-thread-${i}`,
    subject,
    fromName,
    fromEmail,
    snippet,
    lastFromMe,
    lastMessageId: `demo-msg-${i}`,
    lastMessageAt: new Date(Date.now() - daysOld * 86400_000 - 3600_000),
    messageCount: lastFromMe ? 2 : 1,
    unread: !lastFromMe,
    inInbox: true,
  }));
  const triage = await classifyThreads(threads, today);
  await db.insert(schema.emailThreads).values(
    threads.map((t, i) => ({
      ...t,
      userId,
      category: triage[i].category,
      reason: triage[i].reason,
      dueDate: triage[i].dueDate,
      triagedMessageId: t.lastMessageId,
    })),
  );

  for (let back = 6; back >= 0; back--) {
    const day = shiftDay(today, -back);
    // Vary the mix a little per day, deterministically.
    const factor = (n: number) => 0.5 + (((back * 7 + n * 3) % 10) / 10);
    const raw = SITES.map(([url, title, minutes], n) => ({
      url,
      title,
      day,
      startedAt: new Date(`${day}T09:00:00Z`).getTime() + n * 1800_000,
      durationSec: Math.round(minutes * 60 * factor(n) * (back === 0 ? 0.4 : 1)),
      channel: CHANNELS[new URL(url).searchParams.get("v") ?? ""] ?? null,
    }));
    const clean = cleanEvents(raw, []);
    await db.insert(schema.browseEvents).values(clean.map((e) => ({ ...e, userId })));
  }
  console.log(`Seeded demo data for ${today} (${TZ}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
