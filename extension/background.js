// Daybrief extension: tracks which tab is in front and for how long.
// State lives in chrome.storage.local because the service worker is stopped and restarted freely.

const HEARTBEAT = "heartbeat";
const IDLE_SECONDS = 60;
const MAX_QUEUE = 2000;
const CHUNK_MS = 5 * 60_000;

const get = (keys) => chrome.storage.local.get(keys);
const set = (obj) => chrome.storage.local.set(obj);

function localDay(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function hostChain(url) {
  try {
    const parts = new URL(url).hostname.replace(/^www\./, "").split(".");
    return parts.slice(0, -1).map((_, i) => parts.slice(i).join("."));
  } catch {
    return [];
  }
}

async function isRecordable(tab) {
  if (!tab || tab.incognito || !tab.url || !/^https?:/.test(tab.url)) return false;
  const { paused, blocklist = [] } = await get(["paused", "blocklist"]);
  if (paused) return false;
  const blocked = new Set(blocklist);
  return !hostChain(tab.url).some((h) => blocked.has(h));
}

async function channelName(tab) {
  try {
    const u = new URL(tab.url);
    if (u.hostname !== "www.youtube.com" || u.pathname !== "/watch") return null;
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () =>
        document.querySelector("ytd-watch-metadata ytd-channel-name a, #owner ytd-channel-name a")?.textContent?.trim() ||
        null,
    });
    return res?.result ?? null;
  } catch {
    return null;
  }
}

/** Close the open session (if any) at `endMs` and queue it. */
async function closeSession(endMs) {
  const { session, queue = [] } = await get(["session", "queue"]);
  if (!session) return;
  const end = Math.min(endMs, session.lastBeat + 90_000); // never count time the worker was asleep
  const durationSec = Math.round((end - session.start) / 1000);
  if (durationSec >= 5) {
    queue.push({
      url: session.url,
      title: session.title,
      channel: session.channel ?? null,
      startedAt: session.start,
      durationSec,
      day: localDay(session.start),
    });
  }
  await set({ session: null, queue: queue.slice(-MAX_QUEUE) });
}

/** Look at what is in front right now and start, continue or end a session accordingly. */
async function observe() {
  const now = Date.now();
  const idle = await chrome.idle.queryState(IDLE_SECONDS);
  const win = await chrome.windows.getLastFocused().catch(() => null);
  const [tab] = win?.focused ? await chrome.tabs.query({ active: true, windowId: win.id }) : [];
  // Video keeps playing while the keyboard is idle, so an audible tab still counts.
  const active = tab && (idle === "active" || (idle === "idle" && tab.audible)) && (await isRecordable(tab));

  const { session } = await get("session");
  if (!active) {
    if (session) await closeSession(now);
    return;
  }
  if (session && session.url === tab.url && now - session.start >= CHUNK_MS) {
    // Long stay on one page: bank what we have so it uploads now, then keep counting.
    session.lastBeat = now;
    await set({ session });
    await closeSession(now);
    await set({ session: { ...session, start: now, lastBeat: now } });
    return;
  }
  if (session && session.url === tab.url) {
    session.lastBeat = now;
    session.title = tab.title || session.title;
    if (!session.channel) session.channel = await channelName(tab);
    await set({ session });
    return;
  }
  if (session) await closeSession(now);
  await set({
    session: { url: tab.url, title: tab.title || "", channel: await channelName(tab), start: now, lastBeat: now },
  });
}

async function flush() {
  const { server, token, queue = [] } = await get(["server", "token", "queue"]);
  if (!server || !token || queue.length === 0) return;
  const batch = queue.slice(0, 200);
  try {
    const res = await fetch(`${server}/api/ingest`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ events: batch }),
    });
    if (res.ok) {
      const { queue: latest = [] } = await get("queue");
      await set({ queue: latest.slice(batch.length), lastSent: Date.now(), lastError: null });
    } else {
      await set({ lastError: res.status === 401 ? "Token rejected" : `Server said ${res.status}` });
    }
  } catch {
    await set({ lastError: "Can't reach the server" });
  }
}

async function refreshBlocklist() {
  const { server, token } = await get(["server", "token"]);
  if (!server || !token) return;
  try {
    const res = await fetch(`${server}/api/ingest`, { headers: { authorization: `Bearer ${token}` } });
    if (res.ok) await set({ blocklist: (await res.json()).blocklist, blocklistAt: Date.now() });
  } catch {
    /* keep the last list */
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== HEARTBEAT) return;
  await observe();
  await flush();
  const { blocklistAt = 0 } = await get("blocklistAt");
  if (Date.now() - blocklistAt > 3600_000) await refreshBlocklist();
});

const start = () => chrome.alarms.create(HEARTBEAT, { periodInMinutes: 0.5 });
chrome.runtime.onInstalled.addListener(start);
chrome.runtime.onStartup.addListener(start);

chrome.tabs.onActivated.addListener(observe);
chrome.tabs.onUpdated.addListener((_id, change, tab) => {
  if (tab.active && (change.url || change.title)) observe();
});
chrome.windows.onFocusChanged.addListener(observe);
chrome.idle.setDetectionInterval(IDLE_SECONDS);
chrome.idle.onStateChanged.addListener(observe);

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg === "settings-changed") {
    (async () => {
      await observe();
      await refreshBlocklist();
      await flush();
      reply(true);
    })();
    return true;
  }
});
