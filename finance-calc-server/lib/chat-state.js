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
  const pausedAt = new Map();
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
      let skippedStuckPause = 0;
      for (const item of raw.paused || []) {
        // الصيغة القديمة مصفوفة أرقام بدون وقت — توقف دائم يخلي البوت ما يرد
        if (typeof item === "string" || typeof item === "number") {
          skippedStuckPause += 1;
          continue;
        }
        const key = String(item?.key || "").trim();
        const savedAt = Number(item?.savedAt || 0);
        if (!key || !savedAt || now - savedAt > ttlMs) {
          if (key) skippedStuckPause += 1;
          continue;
        }
        pausedAt.set(key, savedAt);
        pausedChats.add(key);
      }
      console.log(
        `[chat-state:load] drafts=${drafts.size} sessions=${sessions.size} paused=${pausedChats.size} skippedStuckPause=${skippedStuckPause} · ${dataFile}`
      );
    } catch (err) {
      console.error("[chat-state:load]", err.message);
    }
  }

  function pruneExpiredPaused(now = Date.now()) {
    for (const [key, savedAt] of pausedAt.entries()) {
      if (now - Number(savedAt || 0) > ttlMs) {
        pausedAt.delete(key);
        pausedChats.delete(key);
      }
    }
  }

  function serialize() {
    pruneExpired(sessions);
    pruneExpired(drafts);
    pruneExpiredPaused();
    return {
      savedAt: new Date().toISOString(),
      sessions: Object.fromEntries(sessions),
      drafts: Object.fromEntries(drafts),
      paused: [...pausedAt.entries()].map(([key, savedAt]) => ({
        key,
        savedAt,
      })),
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
    const key = sessionKey(countryCode, phone);
    const savedAt = pausedAt.get(key);
    if (!savedAt) {
      if (pausedChats.has(key)) {
        pausedChats.delete(key);
        scheduleSave();
      }
      return false;
    }
    if (Date.now() - savedAt > ttlMs) {
      pausedAt.delete(key);
      pausedChats.delete(key);
      scheduleSave();
      return false;
    }
    return true;
  }

  function pauseChat(countryCode, phone) {
    const key = sessionKey(countryCode, phone);
    pausedAt.set(key, Date.now());
    pausedChats.add(key);
    scheduleSave();
  }

  function resumeChat(countryCode, phone) {
    const key = sessionKey(countryCode, phone);
    const hadAt = pausedAt.delete(key);
    const hadSet = pausedChats.delete(key);
    if (hadAt || hadSet) scheduleSave();
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
