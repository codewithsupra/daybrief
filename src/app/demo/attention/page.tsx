import { AttentionView } from "@/components/attention-view";
import { demoWorld } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default async function DemoAttention({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const w = demoWorld();
  const { day: picked } = await searchParams;
  const day = picked && w.days.includes(picked) ? picked : w.yesterday;
  return <AttentionView days={w.days} events={w.events} day={day} basePath="/demo/attention" />;
}
