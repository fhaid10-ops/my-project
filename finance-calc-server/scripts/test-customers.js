const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const express = require("express");
const {
  appendCustomerEvent,
  listCustomersFromLog,
  defaultYesterdayToToday,
  getRiyadhYmd,
  normalizePhone,
} = require("../lib/customer-log");
const { createAdminRouter } = require("../lib/admin-routes");
const { showMainMenu } = require("../lib/main-menu");

assert.strictEqual(normalizePhone("0501112233"), "501112233");

const tmp = path.join(os.tmpdir(), `customers-test-${Date.now()}.jsonl`);
const today = getRiyadhYmd();
const { from, to } = defaultYesterdayToToday();
assert.strictEqual(to, today);

appendCustomerEvent(
  {
    phone: "0501112233",
    countryCode: "+966",
    eventType: "message_received",
    preview: "السلام عليكم",
  },
  tmp
);
appendCustomerEvent(
  {
    at: new Date().toISOString(),
    phone: "501112233",
    countryCode: "+966",
    eventType: "message_received",
    preview: "تمويل",
  },
  tmp
);

const local = listCustomersFromLog(from, to, tmp);
assert.ok(local.length >= 1);
assert.strictEqual(local[0].phone, "501112233");
assert.ok(local[0].events >= 2);

const sessions = new Map();
const drafts = new Map();
const pausedChats = new Set();
function sessionKey(cc, phone) {
  return `${cc}:${phone}`;
}

const fakeUsers = {
  users: [
    {
      phone_number: "509998877",
      country_code: "+966",
      traits: { name: "عميل تجريبي" },
      modified_at_utc: new Date().toISOString(),
      created_at_utc: new Date().toISOString(),
    },
  ],
  has_next_page: false,
};

const realFetch = global.fetch;
global.fetch = async (url, opts) => {
  if (String(url).includes("/apis/users/")) {
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify(fakeUsers);
      },
    };
  }
  return realFetch(url, opts);
};

const app = express();
app.use(express.json());
app.use(
  "/admin/api",
  createAdminRouter({
    adminToken: "x",
    sessions,
    drafts,
    pausedChats,
    sessionKey,
    clearDraft: () => {},
    clearSession: () => {},
    pauseChat: () => {},
    resumeChat: () => {},
    isChatPaused: () => false,
    saveDraft: () => {},
    sendInteraktText: async () => ({ ok: true }),
    sendResultReply: async () => "text",
    showMainMenu,
    interaktConfigured: true,
    interaktApiKey: "test-key",
  })
);

function getJson(port, pathName) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: "127.0.0.1", port, path: pathName }, (res) => {
        let body = "";
        res.on("data", (c) => {
          body += c;
        });
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(body) });
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

(async () => {
  const server = app.listen(0);
  const port = server.address().port;
  const { status, json } = await getJson(
    port,
    `/admin/api/customers?from=${from}&to=${to}`
  );
  server.close();
  global.fetch = realFetch;
  assert.strictEqual(status, 200);
  assert.strictEqual(json.ok, true);
  assert.ok(json.count >= 1);
  assert.ok(json.customers.some((c) => c.phone === "509998877"));
  try {
    fs.unlinkSync(tmp);
  } catch (_) {
    /* ignore */
  }
  console.log("test-customers: OK", json.count);
})().catch((err) => {
  global.fetch = realFetch;
  console.error("FAIL", err);
  process.exitCode = 1;
});
