import { Resend } from "resend";
import type { PlanMetrics } from "@/db/schema";
import { formatMinutes } from "./days";
import { sourceUrl } from "./planner";

type EmailItem = { title: string; why: string; minutes: number; sourceType: string; sourceRef: string | null };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderPlanEmail(input: {
  day: string;
  summary: string;
  items: EmailItem[];
  metrics: PlanMetrics;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const { day, summary, items, metrics, appUrl } = input;
  const date = new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const numbers = [
    [`${metrics.needsReply}`, "emails waiting on you"],
    [`${metrics.alignedPct}%`, "of yesterday on your goals"],
    [formatMinutes(metrics.totalMinutes), "tracked yesterday"],
  ];
  const rows = items
    .map((it, i) => {
      const url = sourceUrl(it);
      return `<tr><td style="padding:10px 0;border-top:1px solid #e7e2d8;vertical-align:top;width:28px;color:#8a8478">${i + 1}</td>
<td style="padding:10px 0;border-top:1px solid #e7e2d8"><div style="font-weight:600;color:#1c1a17">${esc(it.title)} <span style="font-weight:400;color:#8a8478">· ${it.minutes}m</span></div>
<div style="color:#5c574d;font-size:14px;margin-top:2px">${esc(it.why)}${url ? ` <a href="${esc(url)}" style="color:#b4451f">Open</a>` : ""}</div></td></tr>`;
    })
    .join("");
  const html = `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1a17;background:#faf7f1">
<div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8a8478">Daybrief · ${esc(date)}</div>
<p style="font-size:18px;line-height:1.45;margin:12px 0 20px">${esc(summary)}</p>
<table style="width:100%;border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;font-size:15px">${rows}</table>
<table style="width:100%;margin-top:20px;font-family:Helvetica,Arial,sans-serif"><tr>${numbers
    .map(
      ([n, l]) =>
        `<td style="padding:12px;background:#f1ece2;border-radius:6px"><div style="font-size:20px;font-weight:700">${n}</div><div style="font-size:12px;color:#5c574d">${l}</div></td>`,
    )
    .join('<td style="width:8px"></td>')}</tr></table>
<p style="margin-top:20px;font-family:Helvetica,Arial,sans-serif;font-size:14px"><a href="${esc(appUrl)}/today" style="color:#b4451f">Open today's plan</a></p></div>`;
  const text = [
    `Daybrief · ${date}`,
    "",
    summary,
    "",
    ...items.map((it, i) => `${i + 1}. ${it.title} (${it.minutes}m)\n   ${it.why}`),
    "",
    numbers.map(([n, l]) => `${n} ${l}`).join(" · "),
    `${appUrl}/today`,
  ].join("\n");
  return { subject: `Today: ${items[0]?.title ?? "your plan"}`, html, text };
}

/** Sends the plan to the user. Returns false when email isn't configured. */
export async function sendPlanEmail(to: string, email: ReturnType<typeof renderPlanEmail>): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const { error } = await new Resend(key).emails.send({
    from: process.env.RESEND_FROM ?? "Daybrief <onboarding@resend.dev>",
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return true;
}
