const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createChatState } = require("../lib/chat-state");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chat-state-"));
const dataFile = path.join(dir, "chat-state.json");

const first = createChatState({ dataFile, dataDir: dir });
first.saveDraft("+966", "551234567", { flow: "personal_chat", step: "sector" });
first.pauseChat("+966", "559999999");
first.flush();

assert.ok(fs.existsSync(dataFile));

const second = createChatState({ dataFile, dataDir: dir });
assert.deepStrictEqual(second.getDraft("+966", "551234567"), {
  flow: "personal_chat",
  step: "sector",
});
assert.strictEqual(second.isChatPaused("+966", "559999999"), true);

second.clearDraft("+966", "551234567");
second.resumeChat("+966", "559999999");
second.flush();

const third = createChatState({ dataFile, dataDir: dir });
assert.strictEqual(third.getDraft("+966", "551234567"), null);
assert.strictEqual(third.isChatPaused("+966", "559999999"), false);

const stuckFile = path.join(dir, "stuck.json");
fs.writeFileSync(
  stuckFile,
  JSON.stringify({
    savedAt: new Date().toISOString(),
    sessions: {},
    drafts: {},
    paused: ["+966:511111111"],
  }),
  "utf8"
);
const stuck = createChatState({ dataFile: stuckFile, dataDir: dir });
assert.strictEqual(
  stuck.isChatPaused("+966", "511111111"),
  false,
  "الإيقاف القديم بدون وقت ينفك تلقائيًا"
);

const expiredFile = path.join(dir, "expired.json");
const freshPause = createChatState({
  dataFile: expiredFile,
  dataDir: dir,
  ttlMs: 1000,
});
freshPause.pauseChat("+966", "500000002");
freshPause.flush();
const raw = JSON.parse(fs.readFileSync(expiredFile, "utf8"));
raw.paused[0].savedAt = Date.now() - 5000;
fs.writeFileSync(expiredFile, JSON.stringify(raw), "utf8");
const expired = createChatState({
  dataFile: expiredFile,
  dataDir: dir,
  ttlMs: 1000,
});
assert.strictEqual(expired.isChatPaused("+966", "500000002"), false);

fs.rmSync(dir, { recursive: true, force: true });
console.log("OK: chat-state persist");
