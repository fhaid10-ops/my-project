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

fs.rmSync(dir, { recursive: true, force: true });
console.log("OK: chat-state persist");
