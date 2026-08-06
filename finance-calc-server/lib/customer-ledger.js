/**
 * سجل العملاء — يحفظ نشاط الوارد/الصادر لعرض اليوم وأمس في اللوحة
 * تخزين: ذاكرة + ملف JSON (يبقى حتى إعادة التشغيل/النشر)
 */
const fs = require("fs");
const path = require("path");

const TIMEZONE = "Asia/Riyadh";
const MAX_CUSTOMERS = 5000;
const MAX_EVENTS_PER_CUSTOMER = 40;
const DEFAULT_DATA_FILE = path.join(__dirname, "..", "data", "customers.json");

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
  const customers = new Map();
  let writeTimer = null;
  let loaded = false;

  function ensureDir() {
    const dir = path.dirname(dataFile);
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
      saveNow();
    }, 800);
    if (typeof writeTimer.unref === "function") writeTimer.unref();
  }

  function saveNow() {
    try {
      ensureDir();
      const list = [...customers.values()].sort(
        (a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt)
      );
      fs.writeFileSync(
        dataFile,
        JSON.stringify(
          {
            updatedAt: new Date().toISOString(),
            timezone: TIMEZONE,
            customers: list.slice(0, MAX_CUSTOMERS),
          },
          null,
          2
        ),
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
        // يظهر في اليوم إذا رأى أو بدأ فيه
        return lastDay === target || firstDay === target;
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
    saveNow();
  }

  load();

  return {
    recordInbound,
    recordOutbound,
    updateState,
    listByDay,
    summary,
    flush,
    calendarDayKey,
    shiftDayKey,
    TIMEZONE,
    _customers: customers,
    _dataFile: dataFile,
  };
}

module.exports = {
  createCustomerLedger,
  calendarDayKey,
  shiftDayKey,
  TIMEZONE,
};
