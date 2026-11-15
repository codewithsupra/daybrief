const $ = (id) => document.getElementById(id);

async function render() {
  const s = await chrome.storage.local.get(["server", "token", "paused", "queue", "lastSent", "lastError"]);
  $("server").value = s.server ?? "";
  $("token").value = s.token ?? "";
  $("pause").textContent = s.paused ? "Resume recording" : "Pause recording";
  const parts = [];
  if (!s.server || !s.token) parts.push("Add the app address and a token to start.");
  else if (s.paused) parts.push("Paused. Nothing is being recorded.");
  else parts.push("Recording the active tab.");
  if (s.lastError) parts.push(`Last upload failed: ${s.lastError}.`);
  else if (s.lastSent) parts.push(`Last upload ${new Date(s.lastSent).toLocaleTimeString()}.`);
  if (s.queue?.length) parts.push(`${s.queue.length} waiting to upload.`);
  $("status").textContent = parts.join(" ");
}

$("save").addEventListener("click", async () => {
  let origin;
  try {
    origin = new URL($("server").value.trim()).origin;
  } catch {
    $("status").textContent = "That address isn't a valid URL.";
    return;
  }
  const token = $("token").value.trim();
  if (!token) {
    $("status").textContent = "Paste the code from Daybrief's Settings page.";
    return;
  }
  // Store first, so nothing is lost if this popup closes.
  await chrome.storage.local.set({ server: origin, token, lastError: null });

  // Check the address and code right away and say what happened.
  $("status").textContent = "Checking…";
  try {
    const res = await fetch(`${origin}/api/ingest`, { headers: { authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      $("status").textContent = "Daybrief didn't accept that code. Create a new one in Settings.";
      return;
    }
    if (!res.ok) {
      $("status").textContent = `Daybrief answered with an error (${res.status}).`;
      return;
    }
    const { blocklist } = await res.json();
    await chrome.storage.local.set({ blocklist, blocklistAt: Date.now() });
  } catch {
    $("status").textContent = "Can't reach Daybrief at that address. Is it running?";
    return;
  }
  chrome.runtime.sendMessage("settings-changed").catch(() => {});
  $("status").textContent = "Connected. Recording the active tab.";
});

$("pause").addEventListener("click", async () => {
  const { paused } = await chrome.storage.local.get("paused");
  await chrome.storage.local.set({ paused: !paused });
  await chrome.runtime.sendMessage("settings-changed");
  render();
});

render();
