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
    [`${metrics.needsReply}`, "waiting on you"],
    [`${metrics.alignedPct}%`, "on goals yesterday"],
    [formatMinutes(metrics.totalMinutes), "browser time"],
  ];
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  const rows = items
    .map((it) => {
      const url = sourceUrl(it);
      const open = url
        ? ` <a href="${esc(url)}" style="color:#00e599;text-decoration:none;white-space:nowrap">Open &rsaquo;</a>`
        : "";
      return `<tr>
<td style="padding:12px 0 12px 16px;border-top:1px solid #1e2227;vertical-align:top;width:26px">
<div style="width:14px;height:14px;margin-top:2px;border:1.5px solid #656b74;border-radius:50%"></div></td>
<td style="padding:12px 8px 12px 0;border-top:1px solid #1e2227;vertical-align:top">
<div style="font-size:14px;font-weight:600;line-height:1.4;color:#ffffff">${esc(it.title)}</div>
<div style="margin-top:2px;font-size:13px;line-height:1.45;color:#a1a7b0">${esc(it.why)}${open}</div></td>
<td style="padding:13px 16px 12px 0;border-top:1px solid #1e2227;vertical-align:top;text-align:right;font-size:12px;color:#656b74;white-space:nowrap">${it.minutes}m</td>
</tr>`;
    })
    .join("");
  const tiles = numbers
    .map(
      ([n, l]) =>
        `<td width="33%" style="padding:12px 14px;border:1px solid #1e2227;border-radius:12px;background:#0b0c0e">
<div style="font-size:20px;font-weight:600;letter-spacing:-0.02em;color:#ffffff">${n}</div>
<div style="margin-top:2px;font-size:12px;color:#a1a7b0">${l}</div></td>`,
    )
    .join('<td width="8" style="font-size:0">&nbsp;</td>');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:#000000">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000000"><tr><td align="center" style="padding:28px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:${font}">
<tr><td style="padding-bottom:20px">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="font-size:15px;font-weight:600;color:#ffffff"><span style="display:inline-block;width:10px;height:10px;margin-right:8px;border-radius:3px;background:#00e599"></span>Daybrief</td>
<td align="right" style="font-size:13px;color:#656b74">${esc(date)}</td>
</tr></table></td></tr>
<tr><td style="padding-bottom:16px;font-size:15px;line-height:1.5;color:#c9ced6">${esc(summary)}</td></tr>
<tr><td style="padding-bottom:12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${tiles}</tr></table></td></tr>
<tr><td style="border:1px solid #1e2227;border-radius:12px;background:#0b0c0e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td colspan="3" style="padding:11px 16px;font-size:13px;font-weight:600;color:#ffffff">Today&rsquo;s plan <span style="font-weight:400;color:#656b74">&nbsp;${items.length} things, about ${formatMinutes(items.reduce((n, it) => n + it.minutes, 0))}</span></td></tr>
${rows}
</table></td></tr>
<tr><td align="center" style="padding:24px 0 8px">
<a href="${esc(appUrl)}/today" style="display:inline-block;padding:11px 24px;border-radius:999px;background:#00e599;color:#00140d;font-size:14px;font-weight:600;text-decoration:none">Open your dashboard</a></td></tr>
<tr><td align="center" style="padding-top:12px;font-size:12px;color:#656b74">Sent each morning. Turn it off in <a href="${esc(appUrl)}/settings" style="color:#a1a7b0">Settings</a>.</td></tr>
</table></td></tr></table></body></html>`;
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
