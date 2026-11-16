import { and, eq, inArray } from "drizzle-orm";
import { schema } from "@/db";
import { AttentionView } from "@/components/attention-view";
import { lastDays } from "@/lib/days";
import { requireUser } from "@/lib/user";

export default async function Attention({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { db, user, today } = await requireUser();
  const days = lastDays(today, 7);
  const { day: picked } = await searchParams;
  const day = picked && days.includes(picked) ? picked : today;

  const events = await db
    .select()
    .from(schema.browseEvents)
    .where(and(eq(schema.browseEvents.userId, user.id), inArray(schema.browseEvents.day, days)));

  if (events.length === 0) {
    return (
      <div className="max-w-[680px]">
        <h1 className="t-page">Attention</h1>
        <p className="mt-2 text-muted">
          Nothing recorded in the last 7 days. Load the Chrome extension and paste a token from{" "}
          <a className="underline" href="/settings">
            Settings
          </a>
          .
        </p>
      </div>
    );
  }
  return <AttentionView days={days} events={events} day={day} basePath="/attention" />;
}
