import { describe, expect, it } from "vitest";
import { buildReplyRaw, parseFrom, plainText, syncQuery, threadToRow } from "@/lib/gmail-parse";

const msg = (id: string, labels: string[], from: string, date: number, snippet = "") => ({
  id,
  internalDate: String(date),
  labelIds: labels,
  snippet,
  payload: { headers: [{ name: "From", value: from }, { name: "Subject", value: "Lease renewal" }] },
});

describe("syncQuery", () => {
  const now = new Date("2026-11-15T06:00:00Z");
  it("looks back 14 days on the first sync", () => {
    const since = Math.floor(now.getTime() / 1000) - 14 * 86400;
    expect(syncQuery(null, now)).toBe(
      `after:${since} -in:chats -in:spam -in:trash -category:promotions -category:social`,
    );
  });
  it("overlaps the previous sync by an hour so nothing is missed", () => {
    const last = new Date("2026-11-14T06:00:00Z");
    expect(syncQuery(last, now)).toContain(`after:${Math.floor(last.getTime() / 1000) - 3600} `);
  });
});

describe("threadToRow", () => {
  it("reports the other party and that they wrote last", () => {
    const row = threadToRow({
      id: "t1",
      messages: [
        msg("m1", ["SENT"], "Me <me@example.com>", 1000),
        msg("m2", ["INBOX", "UNREAD"], '"Harbour Flats" <office@harbour.example>', 2000, "Form attached &amp; ready"),
      ],
    });
    expect(row).toMatchObject({
      threadId: "t1",
      subject: "Lease renewal",
      fromName: "Harbour Flats",
      fromEmail: "office@harbour.example",
      lastMessageId: "m2",
      lastFromMe: false,
      unread: true,
      inInbox: true,
      messageCount: 2,
      snippet: "Form attached & ready",
    });
    expect(row?.lastMessageAt.getTime()).toBe(2000);
  });

  it("marks threads where I wrote last, still naming the other person", () => {
    const row = threadToRow({
      id: "t2",
      messages: [msg("m1", ["INBOX"], "Ana <ana@example.com>", 1000), msg("m2", ["SENT"], "Me <me@example.com>", 2000)],
    });
    expect(row).toMatchObject({ lastFromMe: true, fromName: "Ana", lastMessageId: "m2", unread: false });
  });

  it("ignores unsent drafts and empty threads", () => {
    const row = threadToRow({
      id: "t3",
      messages: [msg("m1", ["INBOX"], "Ana <ana@example.com>", 1000), msg("d1", ["DRAFT"], "Me <me@example.com>", 3000)],
    });
    expect(row).toMatchObject({ lastMessageId: "m1", lastFromMe: false, messageCount: 1 });
    expect(threadToRow({ id: "t4", messages: [msg("d1", ["DRAFT"], "Me <me@example.com>", 1)] })).toBeNull();
    expect(threadToRow({ id: "t5" })).toBeNull();
  });
});

describe("parseFrom", () => {
  it("handles names, quotes and bare addresses", () => {
    expect(parseFrom("Ana Souza <Ana@Example.com>")).toEqual({ name: "Ana Souza", email: "ana@example.com" });
    expect(parseFrom('"Lee, Marcus" <m@example.com>')).toEqual({ name: "Lee, Marcus", email: "m@example.com" });
    expect(parseFrom("solo@example.com")).toEqual({ name: "solo@example.com", email: "solo@example.com" });
  });
});

describe("buildReplyRaw", () => {
  const decode = (raw: string) => Buffer.from(raw, "base64url").toString("utf8");

  it("threads the reply and prefixes the subject once", () => {
    const text = decode(
      buildReplyRaw({ to: "ana@example.com", subject: "Guest spot?", body: "Yes, happy to.", inReplyTo: "<abc@mail>", references: "<root@mail>" }),
    );
    expect(text).toContain("To: ana@example.com\r\n");
    expect(text).toContain("Subject: Re: Guest spot?\r\n");
    expect(text).toContain("In-Reply-To: <abc@mail>\r\n");
    expect(text).toContain("References: <root@mail> <abc@mail>\r\n");
    expect(text.endsWith("\r\n\r\nYes, happy to.")).toBe(true);
    expect(decode(buildReplyRaw({ to: "a@b.c", subject: "RE: Hi", body: "" }))).toContain("Subject: RE: Hi\r\n");
  });

  it("encodes non-ASCII subjects", () => {
    const text = decode(buildReplyRaw({ to: "a@b.c", subject: "Café plans", body: "ok" }));
    expect(text).toContain(`Subject: =?UTF-8?B?${Buffer.from("Re: Café plans").toString("base64")}?=`);
  });
});

describe("plainText", () => {
  const b64 = (s: string) => Buffer.from(s).toString("base64url");
  it("prefers the text part of a multipart message", () => {
    expect(
      plainText({
        mimeType: "multipart/alternative",
        parts: [
          { mimeType: "text/plain", body: { data: b64("Hello there") } },
          { mimeType: "text/html", body: { data: b64("<p>Hello <b>there</b></p>") } },
        ],
      }),
    ).toBe("Hello there");
  });
  it("falls back to stripped HTML", () => {
    expect(plainText({ mimeType: "text/html", body: { data: b64("<style>p{}</style><p>Hi <b>you</b></p>") } }).trim()).toBe(
      "Hi you",
    );
  });
});
