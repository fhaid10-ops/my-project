/**
 * سجل العملاء — يحفظ نشاط الوارد/الصادر لعرض اليوم وأمس في اللوحة
 * تخزين: ذاكرة + ملف JSON (يبقى حتى إعادة التشغيل/النشر)
 */
const fs = require("fs");
const path = require("path");

const TIMEZONE = "Asia/Riyadh";
const MAX_CUSTOMERS = 5000;
const MAX_EVENTS_PER_CUSTOMER = 40;
const MAX_BACKUPS = 20;
const DEFAULT_DATA_DIR =
  process.env.CUSTOMERS_DATA_DIR || path.join(__dirname, "..", "data");
const DEFAULT_DATA_FILE = path.join(DEFAULT_DATA_DIR, "customers.json");
const DEFAULT_BACKUP_DIR = path.join(DEFAULT_DATA_DIR, "backups");

function pad(n) {
  return String(n).padStart(2, "0");
}

/** تاريخ تقويمي في توقيت الرياض YYYY-MM-DD */
function calendarDayKey(date = new Date(), timeZone = TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

function shiftDayKey(dayKey, deltaDays) {
  const [y, m, d] = String(dayKey).split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + deltaDays);
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(
    utc.getUTCDate()
  )}`;
}

function dayBoundsIso(dayKey, timeZone = TIMEZONE) {
  // حدود تقريبية عبر البحث في sticky offset — نستخدم فلترة باليوم المفتاحي مباشرة
  return { dayKey, timeZone };
}

function createCustomerLedger(options = {}) {
  const dataFile = options.dataFile || DEFAULT_DATA_FILE;
  const backupDir = options.backupDir || DEFAULT_BACKUP_DIR;
  const customers = new Map();
  let writeTimer = null;
  let loaded = false;

  function ensureDir(dir = path.dirname(dataFile)) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  function load() {
    if (loaded) return;
    loaded = true;
    try {
      if (!fs.existsSync(dataFile)) return;
      const raw = JSON.parse(fs.readFileSync(dataFile, "utf8"));
      const rows = Array.isArray(raw?.customers) ? raw.customers : [];
      for (const row of rows) {
        if (!row?.key) continue;
        customers.set(row.key, normalizeRow(row));
      }
    } catch (err) {
      console.error("[customer-ledger:load]", err.message);
    }
  }

  function scheduleSave() {
    if (writeTimer) return;
    writeTimer = setTimeout(() => {
      writeTimer = null;
      saveNow({ snapshot: false });
    }, 800);
    if (typeof writeTimer.unref === "function") writeTimer.unref();
  }

  function exportPayload() {
    load();
    const list = [...customers.values()].sort(
      (a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt)
    );
    return {
      ok: true,
      kind: "raed-customer-ledger",
      version: 1,
      updatedAt: new Date().toISOString(),
      timezone: TIMEZONE,
      count: list.length,
      customers: list.slice(0, MAX_CUSTOMERS),
    };
  }

  function rotateBackups() {
    try {
      if (!fs.existsSync(backupDir)) return;
      const files = fs
        .readdirSync(backupDir)
        .filter((f) => f.startsWith("customers-") && f.endsWith(".json"))
        .map((f) => ({
          f,
          t: fs.statSync(path.join(backupDir, f)).mtimeMs,
        }))
        .sort((a, b) => b.t - a.t);
      for (const old of files.slice(MAX_BACKUPS)) {
        fs.unlinkSync(path.join(backupDir, old.f));
      }
    } catch (err) {
      console.error("[customer-ledger:rotate]", err.message);
    }
  }

  function createSnapshot(label = "auto") {
    load();
    try {
      ensureDir(backupDir);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const file = path.join(
        backupDir,
        `customers-${stamp}-${String(label).replace(/[^\w.-]+/g, "")}.json`
      );
      fs.writeFileSync(file, JSON.stringify(exportPayload(), null, 2), "utf8");
      rotateBackups();
      return { ok: true, file, count: customers.size };
    } catch (err) {
      console.error("[customer-ledger:snapshot]", err.message);
      return { ok: false, error: err.message };
    }
  }

  function saveNow({ snapshot = false } = {}) {
    try {
      ensureDir();
      // Snapshot فقط عند الطلب الصريح (قبل استيراد / إيقاف السيرفر / زر بكب)
      if (snapshot && fs.existsSync(dataFile) && customers.size > 0) {
        createSnapshot("presave");
      }
      fs.writeFileSync(
        dataFile,
        JSON.stringify(exportPayload(), null, 2),
        "utf8"
      );
    } catch (err) {
      console.error("[customer-ledger:save]", err.message);
    }
  }

  function normalizeRow(row = {}) {
    return {
      key: String(row.key),
      phone: String(row.phone || ""),
      countryCode: String(row.countryCode || "+966"),
      firstSeenAt: row.firstSeenAt || new Date().toISOString(),
      lastSeenAt: row.lastSeenAt || row.firstSeenAt || new Date().toISOString(),
      lastInboundAt: row.lastInboundAt || null,
      lastOutboundAt: row.lastOutboundAt || null,
      lastInboundText: row.lastInboundText || "",
      lastOutboundPreview: row.lastOutboundPreview || "",
      inboundCount: Number(row.inboundCount || 0),
      outboundCount: Number(row.outboundCount || 0),
      flow: row.flow || null,
      step: row.step || null,
      maxAmount: row.maxAmount ?? null,
      dayKey: row.dayKey || calendarDayKey(new Date(row.lastSeenAt || Date.now())),
      source: row.source || null,
      syncedAt: row.syncedAt || null,
      events: Array.isArray(row.events) ? row.events.slice(0, MAX_EVENTS_PER_CUSTOMER) : [],
    };
  }

  function getOrCreate(countryCode, phone) {
    load();
    const cc = String(countryCode || "+966");
    const p = String(phone || "").replace(/\D/g, "");
    if (!p) return null;
    const key = `${cc}:${p}`;
    if (!customers.has(key)) {
      const now = new Date().toISOString();
      customers.set(
        key,
        normalizeRow({
          key,
          phone: p,
          countryCode: cc,
          firstSeenAt: now,
          lastSeenAt: now,
          dayKey: calendarDayKey(),
        })
      );
    }
    return customers.get(key);
  }

  function touchMeta(row, patch = {}) {
    const now = new Date();
    const iso = now.toISOString();
    row.lastSeenAt = iso;
    row.dayKey = calendarDayKey(now);
    if (patch.flow != null) row.flow = patch.flow;
    if (patch.step != null) row.step = patch.step;
    if (patch.maxAmount != null) row.maxAmount = patch.maxAmount;
  }

  function pushEvent(row, event) {
    row.events.unshift({
      ...event,
      at: event.at || new Date().toISOString(),
    });
    if (row.events.length > MAX_EVENTS_PER_CUSTOMER) {
      row.events.length = MAX_EVENTS_PER_CUSTOMER;
    }
  }

  function recordInbound(countryCode, phone, text, meta = {}) {
    const row = getOrCreate(countryCode, phone);
    if (!row) return null;
    const preview = String(text || "").slice(0, 120);
    const now = new Date().toISOString();
    touchMeta(row, meta);
    row.lastInboundAt = now;
    row.lastInboundText = preview;
    row.inboundCount += 1;
    pushEvent(row, {
      type: "inbound",
      text: preview,
      flow: meta.flow || row.flow,
      step: meta.step || row.step,
    });
    trimOldest();
    scheduleSave();
    return row;
  }

  function recordOutbound(countryCode, phone, preview, meta = {}) {
    const row = getOrCreate(countryCode, phone);
    if (!row) return null;
    const text = String(preview || "").slice(0, 120);
    const now = new Date().toISOString();
    touchMeta(row, meta);
    row.lastOutboundAt = now;
    row.lastOutboundPreview = text;
    row.outboundCount += 1;
    pushEvent(row, {
      type: "outbound",
      text,
      mode: meta.mode || null,
      flow: meta.flow || row.flow,
      step: meta.step || row.step,
    });
    trimOldest();
    scheduleSave();
    return row;
  }

  function updateState(countryCode, phone, meta = {}) {
    const row = getOrCreate(countryCode, phone);
    if (!row) return null;
    touchMeta(row, meta);
    scheduleSave();
    return row;
  }

  function trimOldest() {
    if (customers.size <= MAX_CUSTOMERS) return;
    const sorted = [...customers.values()].sort(
      (a, b) => Date.parse(a.lastSeenAt) - Date.parse(b.lastSeenAt)
    );
    const removeCount = customers.size - MAX_CUSTOMERS;
    for (let i = 0; i < removeCount; i += 1) {
      customers.delete(sorted[i].key);
    }
  }

  function listByDay(day = "today") {
    load();
    const today = calendarDayKey();
    const yesterday = shiftDayKey(today, -1);
    let target = null;
    if (day === "today") target = today;
    else if (day === "yesterday") target = yesterday;
    else if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) target = day;

    const rows = [...customers.values()]
      .filter((row) => {
        if (!target) return true;
        const lastDay = calendarDayKey(new Date(row.lastSeenAt));
        const firstDay = calendarDayKey(new Date(row.firstSeenAt));
        const syncedDay = row.syncedAt
          ? calendarDayKey(new Date(row.syncedAt))
          : null;
        // يظهر في اليوم إذا رأى أو بدأ فيه أو تم جلبه اليوم
        return (
          lastDay === target || firstDay === target || syncedDay === target
        );
      })
      .sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));

    return {
      timezone: TIMEZONE,
      today,
      yesterday,
      day: target || "all",
      count: rows.length,
      customers: rows,
    };
  }

  function summary() {
    load();
    const todayPack = listByDay("today");
    const yesterdayPack = listByDay("yesterday");
    return {
      timezone: TIMEZONE,
      today: todayPack.today,
      yesterday: yesterdayPack.yesterday,
      counts: {
        today: todayPack.count,
        yesterday: yesterdayPack.count,
        all: customers.size,
      },
    };
  }

  function flush() {
    if (writeTimer) {
      clearTimeout(writeTimer);
      writeTimer = null;
    }
    saveNow({ snapshot: true });
  }

  /**
   * استيراد ملف بكب — merge يحافظ على البيانات الأغنى محليًا
   */
  function importPayload(payload, options = {}) {
    load();
    const merge = options.merge !== false;
    const rows = Array.isArray(payload?.customers)
      ? payload.customers
      : Array.isArray(payload)
        ? payload
        : [];
    if (!rows.length) {
      return { ok: false, error: "الملف لا يحتوي عملاء", imported: 0 };
    }
    createSnapshot("pre-import");
    let imported = 0;
    let updated = 0;
    for (const raw of rows) {
      const phone = String(raw.phone || "")
        .replace(/\D/g, "")
        .replace(/^0+/, "");
      const countryCode = String(raw.countryCode || "+966");
      if (!phone) continue;
      const key = raw.key || `${countryCode}:${phone}`;
      const incoming = normalizeRow({ ...raw, key, phone, countryCode });
      const existing = customers.get(key);
      if (!existing || !merge) {
        customers.set(key, incoming);
        imported += 1;
        continue;
      }
      // دمج: لا نمحو نشاط محلي أحدث
      const keepLocalNewer =
        Date.parse(existing.lastSeenAt) > Date.parse(incoming.lastSeenAt);
      customers.set(
        key,
        normalizeRow({
          ...incoming,
          ...existing,
          firstSeenAt:
            Date.parse(existing.firstSeenAt) <= Date.parse(incoming.firstSeenAt)
              ? existing.firstSeenAt
              : incoming.firstSeenAt,
          lastSeenAt: keepLocalNewer ? existing.lastSeenAt : incoming.lastSeenAt,
          lastInboundAt: existing.lastInboundAt || incoming.lastInboundAt,
          lastOutboundAt: existing.lastOutboundAt || incoming.lastOutboundAt,
          lastInboundText:
            existing.lastInboundText || incoming.lastInboundText || "",
          lastOutboundPreview:
            existing.lastOutboundPreview || incoming.lastOutboundPreview || "",
          inboundCount: Math.max(
            existing.inboundCount || 0,
            incoming.inboundCount || 0
          ),
          outboundCount: Math.max(
            existing.outboundCount || 0,
            incoming.outboundCount || 0
          ),
          maxAmount: existing.maxAmount ?? incoming.maxAmount,
          flow: existing.flow || incoming.flow,
          step: existing.step || incoming.step,
          source: existing.source || incoming.source || null,
          events: [...(existing.events || []), ...(incoming.events || [])].slice(
            0,
            MAX_EVENTS_PER_CUSTOMER
          ),
        })
      );
      updated += 1;
    }
    trimOldest();
    saveNow({ snapshot: false });
    return {
      ok: true,
      imported,
      updated,
      total: customers.size,
    };
  }

  /** إدراج/تحديث من جهة اتصال Interakt (بدون محو النشاط المحلي) */
  function upsertContact(contact = {}) {
    load();
    let phone = String(
      contact.phone || contact.phoneNumber || contact.phone_number || ""
    ).replace(/\D/g, "");
    let countryCode = String(
      contact.countryCode || contact.country_code || "+966"
    );
    if (!countryCode.startsWith("+")) countryCode = `+${countryCode}`;
    if (phone.startsWith("966") && phone.length > 9) phone = phone.slice(3);
    if (phone.startsWith("0")) phone = phone.slice(1);
    if (!phone) return null;

    const nowIso = new Date().toISOString();
    const seenAt = contact.touchNow
      ? nowIso
      : contact.lastSeenAt ||
        contact.modified_at_utc ||
        contact.modifiedAt ||
        contact.created_at_utc ||
        contact.createdAt ||
        nowIso;
    const key = `${countryCode}:${phone}`;
    const existing = customers.get(key);
    if (!existing) {
      const row = normalizeRow({
        key,
        phone,
        countryCode,
        firstSeenAt: contact.firstSeenAt || contact.created_at_utc || seenAt,
        lastSeenAt: seenAt,
        lastInboundText: contact.lastInboundText || contact.name || "من Interakt",
        source: contact.source || "interakt",
        syncedAt: nowIso,
        inboundCount: Number(contact.inboundCount || 0),
        outboundCount: Number(contact.outboundCount || 0),
      });
      customers.set(key, row);
      scheduleSave();
      return { row, created: true };
    }
    existing.syncedAt = nowIso;
    if (contact.touchNow || Date.parse(seenAt) >= Date.parse(existing.lastSeenAt)) {
      existing.lastSeenAt = seenAt;
      existing.dayKey = calendarDayKey(new Date(seenAt));
    }
    if (!existing.lastInboundText) {
      existing.lastInboundText = contact.name || "من Interakt";
    }
    existing.source = existing.source || contact.source || "interakt";
    scheduleSave();
    return { row: existing, created: false };
  }

  function listBackups() {
    try {
      ensureDir(backupDir);
      return fs
        .readdirSync(backupDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => {
          const full = path.join(backupDir, f);
          const st = fs.statSync(full);
          return {
            file: f,
            size: st.size,
            mtime: st.mtime.toISOString(),
          };
        })
        .sort((a, b) => Date.parse(b.mtime) - Date.parse(a.mtime));
    } catch {
      return [];
    }
  }

  load();

  return {
    recordInbound,
    recordOutbound,
    updateState,
    listByDay,
    summary,
    flush,
    exportPayload,
    importPayload,
    createSnapshot,
    upsertContact,
    listBackups,
    calendarDayKey,
    shiftDayKey,
    TIMEZONE,
    _customers: customers,
    _dataFile: dataFile,
    _backupDir: backupDir,
  };
}

module.exports = {
  createCustomerLedger,
  calendarDayKey,
  shiftDayKey,
  TIMEZONE,
};
