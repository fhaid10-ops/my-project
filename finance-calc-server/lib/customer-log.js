/**
 * سجل أحداث العملاء (ملف JSONL محلي)
 * يبقى بعد إعادة تشغيل السيرفر — بخلاف الجلسات في الذاكرة
 */
const fs = require("fs");
const path = require("path");

const DEFAULT_DIR = path.join(__dirname, "..", "data");
const DEFAULT_FILE = path.join(DEFAULT_DIR, "customers.jsonl");

function ensureDir(filePath = DEFAULT_FILE) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function getRiyadhYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDaysYmd(ymd, delta) {
  const d = new Date(`${ymd}T12:00:00+03:00`);
  d.setTime(d.getTime() + delta * 24 * 60 * 60 * 1000);
  return getRiyadhYmd(d);
}

function riyadhRangeToUtc(fromYmd, toYmd) {
  const from = new Date(`${fromYmd}T00:00:00+03:00`);
  const to = new Date(`${toYmd}T23:59:59.999+03:00`);
  return { from, to };
}

function defaultYesterdayToToday() {
  const today = getRiyadhYmd();
  const yesterday = addDaysYmd(today, -1);
  return { from: yesterday, to: today };
}

function normalizePhone(phone) {
  let p = String(phone || "").replace(/\D/g, "").replace(/^0+/, "");
  if (p.startsWith("966") && p.length > 9) p = p.slice(3);
  return p;
}

function appendCustomerEvent(entry, filePath = DEFAULT_FILE) {
  try {
    ensureDir(filePath);
    const row = {
      at: entry.at || new Date().toISOString(),
      phone: normalizePhone(entry.phone),
      countryCode: entry.countryCode || "+966",
      eventType: entry.eventType || "",
      preview: String(entry.preview || "").slice(0, 160),
      direction: entry.direction || "in",
    };
    if (!row.phone) return false;
    fs.appendFileSync(filePath, `${JSON.stringify(row)}\n`, "utf8");
    return true;
  } catch (err) {
    console.error("[customer-log:write]", err.message);
    return false;
  }
}

function readEvents(filePath = DEFAULT_FILE) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const text = fs.readFileSync(filePath, "utf8");
    const rows = [];
    for (const line of text.split(/\n+/)) {
      if (!line.trim()) continue;
      try {
        rows.push(JSON.parse(line));
      } catch {
        /* ignore bad line */
      }
    }
    return rows;
  } catch (err) {
    console.error("[customer-log:read]", err.message);
    return [];
  }
}

/**
 * تجميع العملاء في فترة زمنية من السجل المحلي
 */
function listCustomersFromLog(fromYmd, toYmd, filePath = DEFAULT_FILE) {
  const { from, to } = riyadhRangeToUtc(fromYmd, toYmd);
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const byPhone = new Map();

  for (const row of readEvents(filePath)) {
    const atMs = Date.parse(row.at || "");
    if (!Number.isFinite(atMs) || atMs < fromMs || atMs > toMs) continue;
    const phone = normalizePhone(row.phone);
    if (!phone) continue;
    const prev = byPhone.get(phone);
    if (!prev || atMs > Date.parse(prev.lastAt || 0)) {
      byPhone.set(phone, {
        phone,
        countryCode: row.countryCode || "+966",
        lastAt: row.at,
        lastPreview: row.preview || "",
        lastEvent: row.eventType || "",
        events: (prev?.events || 0) + 1,
        source: "local",
      });
    } else if (prev) {
      prev.events += 1;
    }
  }

  return [...byPhone.values()].sort(
    (a, b) => Date.parse(b.lastAt || 0) - Date.parse(a.lastAt || 0)
  );
}

module.exports = {
  DEFAULT_FILE,
  normalizePhone,
  appendCustomerEvent,
  readEvents,
  listCustomersFromLog,
  getRiyadhYmd,
  addDaysYmd,
  riyadhRangeToUtc,
  defaultYesterdayToToday,
};
