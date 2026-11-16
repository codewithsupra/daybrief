import { DemoDashboard } from "@/components/demo/demo-dashboard";
import { summarizeDay, topSites } from "@/lib/attention";
import { demoWorld } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default function DemoHome() {
  const w = demoWorld();
  const summaries = w.days.map((d) => summarizeDay(d, w.events));
  const dateLabel = new Date(`${w.today}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return (
    <DemoDashboard
      dateLabel={dateLabel}
      summary={w.summary}
      items={w.items}
      threads={w.threads}
      summaries={summaries}
      yesterday={w.yday}
      weekMinutes={summaries.reduce((n, s) => n + s.totalMinutes, 0)}
      sites={topSites(w.ydayEvents, 5)}
    />
  );
}
