/**
 * مسودات وجلسات المحادثة — ذاكرة + ملف JSON
 * حتى لا يضيع مسار العميل بعد نشر Render / إعادة التشغيل
 */
const fs = require("fs");
const path = require("path");
const { resolveCustomersDataDir } = require("./customer-ledger");

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 6;
const SAVE_DEBOUNCE_MS = 400;

function createChatState(options = {}) {
  const dataDir = options.dataDir || resolveCustomersDataDir();
  const dataFile =
    options.dataFile || path.join(dataDir, "chat-state.json");
  const ttlMs = Number(options.ttlMs) > 0 ? Number(options.ttlMs) : DEFAULT_TTL_MS;

  const sessions = options.sessions || new Map();
  const drafts = options.drafts || new Map();
  const pausedChats = options.pausedChats || new Set();
  let saveTimer = null;

  function ensureDir() {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  }

  function pruneExpired(map, now = Date.now()) {
    for (const [key, row] of map.entries()) {
      if (!row || now - Number(row.savedAt || 0) > ttlMs) {
        map.delete(key);
      }
    }
  }

  function load() {
    try {
      if (!fs.existsSync(dataFile)) return;
      const raw = JSON.parse(fs.readFileSync(dataFile, "utf8"));
      const now = Date.now();
      for (const [key, row] of Object.entries(raw.sessions || {})) {
        if (row && now - Number(row.savedAt || 0) <= ttlMs) {
          sessions.set(key, {
            data: row.data,
            savedAt: Number(row.savedAt) || now,
          });
        }
      }
      for (const [key, row] of Object.entries(raw.drafts || {})) {
        if (row && now - Number(row.savedAt || 0) <= ttlMs) {
          drafts.set(key, {
            data: row.data,
            savedAt: Number(row.savedAt) || now,
          });
        }
      }
      for (const key of raw.paused || []) {
        if (key) pausedChats.add(String(key));
      }
      console.log(
        `[chat-state:load] drafts=${drafts.size} sessions=${sessions.size} paused=${pausedChats.size} · ${dataFile}`
      );
    } catch (err) {
      console.error("[chat-state:load]", err.message);
    }
  }

  function serialize() {
    pruneExpired(sessions);
    pruneExpired(drafts);
    return {
      savedAt: new Date().toISOString(),
      sessions: Object.fromEntries(sessions),
      drafts: Object.fromEntries(drafts),
      paused: [...pausedChats],
    };
  }

  function flush() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    try {
      ensureDir();
      const tmp = `${dataFile}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(serialize(), null, 2), "utf8");
      fs.renameSync(tmp, dataFile);
    } catch (err) {
      console.error("[chat-state:save]", err.message);
    }
  }

  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      flush();
    }, SAVE_DEBOUNCE_MS);
    if (typeof saveTimer.unref === "function") saveTimer.unref();
  }

  function sessionKey(countryCode, phone) {
    return `${countryCode}:${phone}`;
  }

  function saveSession(countryCode, phone, data) {
    sessions.set(sessionKey(countryCode, phone), {
      data,
      savedAt: Date.now(),
    });
    scheduleSave();
  }

  function getSession(countryCode, phone) {
    const key = sessionKey(countryCode, phone);
    const row = sessions.get(key);
    if (!row) return null;
    if (Date.now() - row.savedAt > ttlMs) {
      sessions.delete(key);
      scheduleSave();
      return null;
    }
    return row.data;
  }

  function saveDraft(countryCode, phone, data) {
    drafts.set(sessionKey(countryCode, phone), {
      data,
      savedAt: Date.now(),
    });
    scheduleSave();
  }

  function getDraft(countryCode, phone) {
    const key = sessionKey(countryCode, phone);
    const row = drafts.get(key);
    if (!row) return null;
    if (Date.now() - row.savedAt > ttlMs) {
      drafts.delete(key);
      scheduleSave();
      return null;
    }
    return row.data;
  }

  function clearDraft(countryCode, phone) {
    if (drafts.delete(sessionKey(countryCode, phone))) scheduleSave();
  }

  function clearSession(countryCode, phone) {
    if (sessions.delete(sessionKey(countryCode, phone))) scheduleSave();
  }

  function isChatPaused(countryCode, phone) {
    return pausedChats.has(sessionKey(countryCode, phone));
  }

  function pauseChat(countryCode, phone) {
    pausedChats.add(sessionKey(countryCode, phone));
    scheduleSave();
  }

  function resumeChat(countryCode, phone) {
    if (pausedChats.delete(sessionKey(countryCode, phone))) scheduleSave();
  }

  load();

  return {
    sessions,
    drafts,
    pausedChats,
    sessionKey,
    saveSession,
    getSession,
    saveDraft,
    getDraft,
    clearDraft,
    clearSession,
    isChatPaused,
    pauseChat,
    resumeChat,
    flush,
    _dataFile: dataFile,
  };
}

module.exports = {
  createChatState,
};
