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
  const server = $("server").value.trim().replace(/\/+$/, "");
  let origin;
  try {
    origin = new URL(server).origin;
  } catch {
    $("status").textContent = "That address isn't a valid URL.";
    return;
  }
  // Ask for permission to talk to this one server only.
  const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
  if (!granted) {
    $("status").textContent = "Permission to reach the app was declined.";
    return;
  }
  await chrome.storage.local.set({ server: origin, token: $("token").value.trim(), lastError: null });
  await chrome.runtime.sendMessage("settings-changed");
  render();
});

$("pause").addEventListener("click", async () => {
  const { paused } = await chrome.storage.local.get("paused");
  await chrome.storage.local.set({ paused: !paused });
  await chrome.runtime.sendMessage("settings-changed");
  render();
});

render();
