const assert = require("assert");
const express = require("express");
const { createAdminRouter, normalizePhoneParts } = require("../lib/admin-routes");
const { showMainMenu } = require("../lib/main-menu");

const parts = normalizePhoneParts({ phone: "0501812339" });
assert.strictEqual(parts.phone, "501812339");
assert.strictEqual(parts.countryCode, "+966");

const sessions = new Map();
const drafts = new Map();
const pausedChats = new Set();
function sessionKey(cc, phone) {
  return `${cc}:${phone}`;
}

const sent = [];
const app = express();
app.use(express.json());
app.use(
  "/admin/api",
  createAdminRouter({
    adminToken: "test-token",
    sessions,
    drafts,
    pausedChats,
    sessionKey,
    clearDraft: (cc, phone) => drafts.delete(sessionKey(cc, phone)),
    clearSession: (cc, phone) => sessions.delete(sessionKey(cc, phone)),
    pauseChat: (cc, phone) => pausedChats.add(sessionKey(cc, phone)),
    resumeChat: (cc, phone) => pausedChats.delete(sessionKey(cc, phone)),
    isChatPaused: (cc, phone) => pausedChats.has(sessionKey(cc, phone)),
    saveDraft: (cc, phone, data) =>
      drafts.set(sessionKey(cc, phone), { data, savedAt: Date.now() }),
    sendInteraktText: async (cc, phone, message) => {
      sent.push({ cc, phone, message });
      return { ok: true };
    },
    sendResultReply: async (cc, phone, result) => {
      sent.push({ cc, phone, result });
      return "interactive";
    },
    showMainMenu,
    interaktConfigured: true,
  })
);

async function req(method, path, body, token = "test-token") {
  const server = app.listen(0);
  const port = server.address().port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/admin/api${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    return { status: res.status, json };
  } finally {
    server.close();
  }
}

(async () => {
  const unauthorized = await req("GET", "/status", null, "wrong");
  assert.strictEqual(unauthorized.status, 401);

  const status = await req("GET", "/status");
  assert.strictEqual(status.status, 200);
  assert.strictEqual(status.json.ok, true);

  const pause = await req("POST", "/pause", { phone: "0551234567" });
  assert.strictEqual(pause.json.paused, true);
  assert.ok(pausedChats.has("+966:551234567"));

  const send = await req("POST", "/send-text", {
    phone: "0551234567",
    message: "اختبار",
  });
  assert.strictEqual(send.json.sent, true);
  assert.strictEqual(sent[0].message, "اختبار");

  const menu = await req("POST", "/send-menu", { phone: "0551234567" });
  assert.strictEqual(menu.json.sent, true);
  assert.ok(drafts.has("+966:551234567"));

  console.log("test-admin: OK");
})().catch((err) => {
  console.error("FAIL:", err);
  process.exitCode = 1;
});
