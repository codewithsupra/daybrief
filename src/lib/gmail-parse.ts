export type GmailHeader = { name: string; value: string };
export type GmailMessage = {
  id: string;
  internalDate?: string;
  labelIds?: string[];
  snippet?: string;
  payload?: { headers?: GmailHeader[] };
};
export type GmailThread = { id: string; messages?: GmailMessage[] };

export type ThreadRow = {
  threadId: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  snippet: string;
  lastMessageId: string;
  lastMessageAt: Date;
  lastFromMe: boolean;
  unread: boolean;
  inInbox: boolean;
  messageCount: number;
};

const header = (m: GmailMessage, name: string) =>
  m.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

export function parseFrom(value: string): { name: string; email: string } {
  const m = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || m[2].trim(), email: m[2].trim().toLowerCase() };
  const email = value.trim().toLowerCase();
  return { name: email, email };
}

const decodeEntities = (s: string) =>
  s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

/** Reduce a Gmail thread (metadata format) to the one row we store. Drafts are ignored. */
export function threadToRow(thread: GmailThread): ThreadRow | null {
  const messages = (thread.messages ?? []).filter((m) => !m.labelIds?.includes("DRAFT"));
  if (messages.length === 0) return null;
  const last = messages[messages.length - 1];
  const lastFromMe = !!last.labelIds?.includes("SENT");
  // Show the other party: the latest message that isn't mine, else the last one.
  const other = [...messages].reverse().find((m) => !m.labelIds?.includes("SENT")) ?? last;
  const from = parseFrom(header(other, "From"));
  return {
    threadId: thread.id,
    subject: header(messages[0], "Subject") || "(no subject)",
    fromName: from.name,
    fromEmail: from.email,
    snippet: decodeEntities(last.snippet ?? ""),
    lastMessageId: last.id,
    lastMessageAt: new Date(Number(last.internalDate ?? Date.now())),
    lastFromMe,
    unread: messages.some((m) => m.labelIds?.includes("UNREAD")),
    inInbox: messages.some((m) => m.labelIds?.includes("INBOX")),
    messageCount: messages.length,
  };
}

const FIRST_SYNC_DAYS = 14;
const OVERLAP_SECONDS = 3600;

/**
 * Gmail search query for the next sync. The first run looks back 14 days; later runs
 * start an hour before the previous sync so nothing that arrived mid-sync is missed.
 */
export function syncQuery(lastSyncAt: Date | null, now: Date = new Date()): string {
  const since = lastSyncAt
    ? Math.floor(lastSyncAt.getTime() / 1000) - OVERLAP_SECONDS
    : Math.floor(now.getTime() / 1000) - FIRST_SYNC_DAYS * 86400;
  return `after:${since} -in:chats -in:spam -in:trash -category:promotions -category:social`;
}

const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64url");

/** RFC 2822 reply, base64url-encoded for Gmail's drafts.create. */
export function buildReplyRaw(input: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const subject = /^re:/i.test(input.subject) ? input.subject : `Re: ${input.subject}`;
  const encodedSubject = /^[\x20-\x7e]*$/.test(subject) ? subject : `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`;
  const lines = [
    `To: ${input.to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ];
  if (input.inReplyTo) {
    lines.push(`In-Reply-To: ${input.inReplyTo}`);
    lines.push(`References: ${[input.references, input.inReplyTo].filter(Boolean).join(" ")}`);
  }
  return b64url(`${lines.join("\r\n")}\r\n\r\n${input.body}`);
}

type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[] };

/** Best-effort plain text of a message payload (full format). */
export function plainText(part: Part | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    return Buffer.from(part.body.data, "base64url").toString("utf8");
  }
  for (const p of part.parts ?? []) {
    const t = plainText(p);
    if (t) return t;
  }
  if (part.mimeType === "text/html" && part.body?.data) {
    return Buffer.from(part.body.data, "base64url")
      .toString("utf8")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");
  }
  return "";
}
