/**
 * سجل العملاء — يحفظ نشاط الوارد/الصادر لعرض اليوم وأمس في اللوحة
 * تخزين: ذاكرة + ملف JSON
 * على Render يلزم Persistent Disk تحت /var/data وإلا يُمسح السجل بعد إعادة التشغيل/النشر
 */
const fs = require("fs");
const path = require("path");
const {
  AUTO_OUTCOME_LABELS,
  OUTCOMES,
  OUTCOME_TAB_FILTERS,
  outcomeLabelForTab,
} = require("./customer-outcome");

const TIMEZONE = "Asia/Riyadh";
const MAX_CUSTOMERS = 5000;

/** رسالة متابعة التقديم — تُستخدم لتصنيف تبويب «تمت المتابعة» وللبيانات القديمة */
function looksLikeFollowupMessage(text) {
  const s = String(text || "");
  return /هل تم تقديم الطلب/i.test(s) || /ارسل رقم الطلب/i.test(s);
}

function isFollowupOutboundMode(mode) {
  const m = String(mode || "");
  return (
    m === "admin-followup" ||
    m === "admin-bulk-followup" ||
    m === "admin-bulk-followup-template" ||
    m === "admin-ask-plus" ||
    m === "admin-bulk-followup-plus"
  );
}

function outboundEventIsFollowup(event) {
  if (!event || event.type !== "outbound") return false;
  return (
    isFollowupOutboundMode(event.mode) || looksLikeFollowupMessage(event.text)
  );
}

/**
 * هل أُرسلت المتابعة الأولى لهذا العميل؟
 * العلم followupSent ثابت — لا يُلغى إذا ردّ البوت برسالة لاحقة.
 */
function hasFirstFollowup(row) {
  if (!row) return false;
  if (row.followupSent || row.followupPlus) return true;
  if (looksLikeFollowupMessage(row.lastOutboundPreview)) return true;
  const events = Array.isArray(row.events) ? row.events : [];
  return events.some(outboundEventIsFollowup);
}
const MAX_EVENTS_PER_CUSTOMER = 40;
const MAX_BACKUPS = 20;
const LOCAL_DATA_DIR = path.join(__dirname, "..", "data");
const DURABLE_MARKERS = ["/var/data", "/data/kobri", "/opt/render/project/src/data-persistent"];

function canWriteDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.write-probe-${process.pid}`);
    fs.writeFileSync(probe, "ok", "utf8");
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

function isDurableDir(dir) {
  const resolved = path.resolve(String(dir || ""));
  return DURABLE_MARKERS.some(
    (marker) => resolved === marker || resolved.startsWith(`${marker}${path.sep}`)
  );
}

/** يفضّل CUSTOMERS_DATA_DIR ثم قرص Render /var/data ثم مجلد المشروع */
function resolveCustomersDataDir(env = process.env) {
  const fromEnv = String(env.CUSTOMERS_DATA_DIR || "").trim();
  if (fromEnv) return path.resolve(fromEnv);

  // قرص Render المثبت عادة على /var/data — لا ننشئ /var/data بأنفسنا
  if (fs.existsSync("/var/data") && canWriteDir("/var/data/kobri")) {
    return path.resolve("/var/data/kobri");
  }
  return LOCAL_DATA_DIR;
}

function migrateLegacyCustomersFile(targetDir) {
  const targetFile = path.join(targetDir, "customers.json");
  if (fs.existsSync(targetFile)) return { migrated: false, reason: "target-exists" };
  const legacyFile = path.join(LOCAL_DATA_DIR, "customers.json");
  if (!fs.existsSync(legacyFile) || path.resolve(targetDir) === path.resolve(LOCAL_DATA_DIR)) {
    return { migrated: false, reason: "no-legacy" };
  }
  try {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(legacyFile, targetFile);
    const legacyBackups = path.join(LOCAL_DATA_DIR, "backups");
    const targetBackups = path.join(targetDir, "backups");
    if (fs.existsSync(legacyBackups)) {
      fs.mkdirSync(targetBackups, { recursive: true });
      for (const name of fs.readdirSync(legacyBackups)) {
        if (!name.endsWith(".json")) continue;
        const dest = path.join(targetBackups, name);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(legacyBackups, name), dest);
        }
      }
    }
    console.log(`[customer-ledger] نُقل السجل من ${legacyFile} → ${targetFile}`);
    return { migrated: true, from: legacyFile, to: targetFile };
  } catch (err) {
    console.error("[customer-ledger:migrate]", err.message);
    return { migrated: false, reason: err.message };
  }
}

const DEFAULT_DATA_DIR = resolveCustomersDataDir();
migrateLegacyCustomersFile(DEFAULT_DATA_DIR);
const DEFAULT_DATA_FILE = path.join(DEFAULT_DATA_DIR, "customers.json");
const DEFAULT_BACKUP_DIR = path.join(DEFAULT_DATA_DIR, "backups");

function pad(n) {
  return String(n).padStart(2, "0");
}

function hasOrderTicket(row) {
  if (String(row?.orderNumber || "").replace(/\D/g, "")) return true;
  return String(row?.outcome || "").trim() === OUTCOMES.ORDER_NUMBER;
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

  function readCustomersFile(file) {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const rows = Array.isArray(raw?.customers) ? raw.customers : [];
    let n = 0;
    for (const row of rows) {
      if (!row?.key) continue;
      customers.set(row.key, normalizeRow(row));
      n += 1;
    }
    return n;
  }

  function latestBackupFile() {
    try {
      if (!fs.existsSync(backupDir)) return null;
      const files = fs
        .readdirSync(backupDir)
        .filter((f) => f.startsWith("customers-") && f.endsWith(".json"))
        .map((f) => ({
          f,
          t: fs.statSync(path.join(backupDir, f)).mtimeMs,
        }))
        .sort((a, b) => b.t - a.t);
      return files[0] ? path.join(backupDir, files[0].f) : null;
    } catch {
      return null;
    }
  }

  function load() {
    if (loaded) return;
    loaded = true;
    try {
      if (fs.existsSync(dataFile)) {
        const n = readCustomersFile(dataFile);
        console.log(`[customer-ledger:load] ${n} عميل من ${dataFile}`);
        return;
      }
    } catch (err) {
      console.error("[customer-ledger:load]", err.message);
      customers.clear();
      const backup = latestBackupFile();
      if (backup) {
        try {
          const n = readCustomersFile(backup);
          console.log(`[customer-ledger:load] استرجاع ${n} من بكب ${backup}`);
          return;
        } catch (err2) {
          console.error("[customer-ledger:load-backup]", err2.message);
          customers.clear();
        }
      }
    }
  }

  /** إذا الذاكرة فارغة والملف على القرص فيه بيانات — أعد التحميل (يمنع التصفير الكاذب) */
  function hydrateFromDiskIfNeeded() {
    load();
    if (customers.size > 0) return false;
    try {
      if (!fs.existsSync(dataFile)) {
        const backup = latestBackupFile();
        if (!backup) return false;
        customers.clear();
        loaded = true;
        const n = readCustomersFile(backup);
        if (n > 0) {
          console.log(`[customer-ledger:hydrate] ${n} من بكب بعد ذاكرة فارغة`);
          saveNow({ snapshot: false, force: true });
          return true;
        }
        return false;
      }
      const st = fs.statSync(dataFile);
      if (st.size < 200) return false;
      customers.clear();
      loaded = true;
      const n = readCustomersFile(dataFile);
      if (n > 0) {
        console.log(`[customer-ledger:hydrate] ${n} من القرص بعد ذاكرة فارغة`);
        return true;
      }
    } catch (err) {
      console.error("[customer-ledger:hydrate]", err.message);
    }
    return false;
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

  function saveNow({ snapshot = false, force = false } = {}) {
    try {
      ensureDir();
      // لا نكتب ملف فارغ فوق سجل موجود — هذا سبب شائع لـ«يتصفر بعد التحديث»
      if (!force && customers.size === 0 && fs.existsSync(dataFile)) {
        const st = fs.statSync(dataFile);
        if (st.size > 200) {
          console.error(
            `[customer-ledger:save] رفض حفظ فارغ فوق ملف (${st.size} بايت) — إعادة تحميل`
          );
          loaded = false;
          customers.clear();
          load();
          if (customers.size === 0) {
            return {
              ok: false,
              error: "رفض الكتابة الفارغة فوق سجل موجود",
              bytes: st.size,
            };
          }
        }
      }
      // Snapshot فقط عند الطلب الصريح (قبل استيراد / إيقاف السيرفر / زر بكب)
      if (snapshot && fs.existsSync(dataFile) && customers.size > 0) {
        createSnapshot("presave");
      }
      const payload = JSON.stringify(exportPayload(), null, 2);
      const tmp = `${dataFile}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, payload, "utf8");
      fs.renameSync(tmp, dataFile);
      return { ok: true, bytes: Buffer.byteLength(payload), count: customers.size };
    } catch (err) {
      console.error("[customer-ledger:save]", err.message);
      try {
        const tmp = `${dataFile}.${process.pid}.tmp`;
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
      return { ok: false, error: err.message };
    }
  }

  function persistenceInfo() {
    hydrateFromDiskIfNeeded();
    let bytes = 0;
    let mtime = null;
    try {
      if (fs.existsSync(dataFile)) {
        const st = fs.statSync(dataFile);
        bytes = st.size;
        mtime = st.mtime.toISOString();
      }
    } catch {
      /* ignore */
    }
    const dataDir = path.dirname(dataFile);
    const durable = isDurableDir(dataDir);
    const writable = canWriteDir(dataDir);
    return {
      dataDir,
      dataFile,
      durable,
      writable,
      exists: fs.existsSync(dataFile),
      bytes,
      mtime,
      count: customers.size,
      hint: durable
        ? "التخزين على قرص دائم — يبقى بعد تحديث الصفحة وإعادة التشغيل"
        : "تحذير: التخزين مؤقت على Render — أي إعادة تشغيل أو نشر تمسح العملاء حتى تضيف Persistent Disk على /var/data وتضبط CUSTOMERS_DATA_DIR=/var/data/kobri",
    };
  }

  function migrateOutcomeFromNotes(row) {
    if (!row) return row;
    const notes = String(row.notes || "").trim();
    const outcome = String(row.outcome || "").trim();
    // نسخ قديمة: كانت الحالات تُحفظ داخل notes
    if (!outcome && AUTO_OUTCOME_LABELS.has(notes)) {
      row.outcome = notes;
      row.notes = "";
    }
    return row;
  }

  function normalizeRow(row = {}) {
    const normalized = {
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
      companyName: row.companyName || null,
      jobCategory: row.jobCategory || null,
      civilianSubtype: row.civilianSubtype || null,
      outcome: row.outcome || "",
      notes: row.notes || "",
      orderNumber: row.orderNumber || null,
      orderNumberAt: row.orderNumberAt || null,
      archived: Boolean(row.archived),
      archivedAt: row.archivedAt || null,
      manual: Boolean(row.manual),
      manualAt: row.manualAt || null,
      rejected: Boolean(row.rejected),
      rejectedAt: row.rejectedAt || null,
      followupPlus: Boolean(row.followupPlus),
      followupPlusAt: row.followupPlusAt || null,
      followupSent: Boolean(row.followupSent),
      followupSentAt: row.followupSentAt || null,
      dayKey: row.dayKey || calendarDayKey(new Date(row.lastSeenAt || Date.now())),
      source: row.source || null,
      syncedAt: row.syncedAt || null,
      events: Array.isArray(row.events) ? row.events.slice(0, MAX_EVENTS_PER_CUSTOMER) : [],
    };
    if (!normalized.followupSent && hasFirstFollowup(normalized)) {
      normalized.followupSent = true;
      const fromEvent = (normalized.events || []).find(outboundEventIsFollowup);
      normalized.followupSentAt =
        normalized.followupSentAt || fromEvent?.at || normalized.lastOutboundAt;
    }
    return migrateOutcomeFromNotes(normalized);
  }

  function findByPhone(phone) {
    hydrateFromDiskIfNeeded();
    let p = String(phone || "").replace(/\D/g, "").replace(/^0+/, "");
    if (p.startsWith("966") && p.length > 9) p = p.slice(3);
    if (!p) return null;
    const exact = customers.get(`+966:${p}`);
    if (exact) return exact;
    for (const row of customers.values()) {
      if (String(row.phone || "") === p) return row;
    }
    return null;
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
    if (patch.companyName != null && String(patch.companyName).trim()) {
      row.companyName = String(patch.companyName).trim();
    }
    if (patch.jobCategory != null && String(patch.jobCategory).trim()) {
      row.jobCategory = String(patch.jobCategory).trim();
    }
    if (patch.civilianSubtype != null && String(patch.civilianSubtype).trim()) {
      row.civilianSubtype = String(patch.civilianSubtype).trim();
    }
    if (patch.outcome != null) row.outcome = String(patch.outcome);
    if (patch.notes != null) row.notes = String(patch.notes);
    if (patch.orderNumber != null && String(patch.orderNumber).trim()) {
      row.orderNumber = String(patch.orderNumber).replace(/\D/g, "").slice(0, 8);
      row.orderNumberAt = patch.orderNumberAt || iso;
    }
  }

  function setNotes(countryCode, phone, notes) {
    const row = getOrCreate(countryCode, phone);
    if (!row) return null;
    migrateOutcomeFromNotes(row);
    row.notes = String(notes || "").slice(0, 500);
    scheduleSave();
    return row;
  }

  function clearIsolation(row, keep) {
    if (keep !== "archived") {
      row.archived = false;
      row.archivedAt = null;
    }
    if (keep !== "manual") {
      row.manual = false;
      row.manualAt = null;
    }
    if (keep !== "rejected") {
      row.rejected = false;
      row.rejectedAt = null;
    }
  }

  /** أرشفة / إلغاء أرشفة عميل */
  function setArchived(countryCode, phone, archived = true) {
    const row = getOrCreate(countryCode, phone);
    if (!row) return null;
    const next = Boolean(archived);
    row.archived = next;
    row.archivedAt = next ? new Date().toISOString() : null;
    if (next) clearIsolation(row, "archived");
    scheduleSave();
    return row;
  }

  /** رفع يدوي / إلغاء اليدوي — يعزل العميل في تبويب «يدوي» مثل الأرشيف */
  function setManual(countryCode, phone, manual = true) {
    const row = getOrCreate(countryCode, phone);
    if (!row) return null;
    const next = Boolean(manual);
    row.manual = next;
    row.manualAt = next ? new Date().toISOString() : null;
    if (next) clearIsolation(row, "manual");
    scheduleSave();
    return row;
  }

  /** رفض / إلغاء الرفض — يعزل العميل في تبويب «رفض» */
  function setRejected(countryCode, phone, rejected = true) {
    const row = getOrCreate(countryCode, phone);
    if (!row) return null;
    const next = Boolean(rejected);
    row.rejected = next;
    row.rejectedAt = next ? new Date().toISOString() : null;
    if (next) clearIsolation(row, "rejected");
    scheduleSave();
    return row;
  }

  /**
   * متابعة بلس — تذكير ثانٍ لمن أخذ رابط التمويل.
   * يخرج من أرشيف/يدوي/رفض حتى يظهر في تبويب «رابط — متابعة بلس».
   */
  function setFollowupPlus(countryCode, phone, plus = true) {
    const row = getOrCreate(countryCode, phone);
    if (!row) return null;
    const next = Boolean(plus);
    row.followupPlus = next;
    row.followupPlusAt = next ? new Date().toISOString() : null;
    if (next) {
      row.followupSent = true;
      row.followupSentAt = row.followupSentAt || new Date().toISOString();
      clearIsolation(row, "followupPlus");
    }
    scheduleSave();
    return row;
  }

  /**
   * نقل العميل إلى تبويب رابط التمويل بعد سؤال الطلب / سؤال بلس.
   * sent → رابط — تمت المتابعة | plus → رابط — متابعة بلس
   */
  function placeInLinkFollowup(countryCode, phone, bucket = "sent") {
    const row = getOrCreate(countryCode, phone);
    if (!row) return null;
    if (String(row.orderNumber || "").replace(/\D/g, "")) {
      row.outcome = OUTCOMES.ORDER_NUMBER;
      scheduleSave();
      return row;
    }
    const plus = bucket === "plus";
    row.followupPlus = plus;
    row.followupPlusAt = plus ? new Date().toISOString() : null;
    row.followupSent = true;
    row.followupSentAt = row.followupSentAt || new Date().toISOString();
    clearIsolation(row, plus ? "followupPlus" : "");
    row.outcome = "أخذ رابط التمويل";
    scheduleSave();
    return row;
  }

  /**
   * تحديث خانة «وش صار» (منفصلة عن الملاحظة الحرة)
   */
  function setOutcomeNotes(countryCode, phone, outcome) {
    const row = getOrCreate(countryCode, phone);
    if (!row) return null;
    migrateOutcomeFromNotes(row);
    const label = String(outcome || "").trim().slice(0, 80);
    if (String(row.outcome || "").trim() === label) return row;
    row.outcome = label;
    scheduleSave();
    return row;
  }

  function setOrderNumber(countryCode, phone, orderNumber) {
    const row = getOrCreate(countryCode, phone);
    if (!row) return null;
    const digits = String(orderNumber || "").replace(/\D/g, "");
    if (!digits) {
      row.orderNumber = null;
      row.orderNumberAt = null;
      if (String(row.outcome || "").trim() === OUTCOMES.ORDER_NUMBER) {
        row.outcome = "";
      }
      scheduleSave();
      return row;
    }
    row.orderNumber = digits.slice(0, 8);
    row.orderNumberAt = new Date().toISOString();
    row.outcome = OUTCOMES.ORDER_NUMBER;
    row.followupPlus = false;
    row.followupPlusAt = null;
    scheduleSave();
    return row;
  }

  /**
   * تعيين جهة العمل من اللوحة (اختياري)
   * حكومي → civilian/government | خاص → civilian/private | عسكري → military
   * القيمة الفارغة تمسح الاختيار
   */
  function setWorkplace(countryCode, phone, workplace) {
    const row = getOrCreate(countryCode, phone);
    if (!row) return null;
    const choice = String(workplace || "")
      .trim()
      .toLowerCase();
    if (!choice || choice === "none" || choice === "clear") {
      row.jobCategory = null;
      row.civilianSubtype = null;
    } else if (choice === "government" || choice === "gov" || choice === "حكومي") {
      row.jobCategory = "civilian";
      row.civilianSubtype = "government";
    } else if (choice === "private" || choice === "خاص") {
      row.jobCategory = "civilian";
      row.civilianSubtype = "private";
    } else if (choice === "military" || choice === "عسكري") {
      row.jobCategory = "military";
      row.civilianSubtype = null;
    } else {
      return { ok: false, error: "خيار جهة العمل غير معروف", row };
    }
    scheduleSave();
    return { ok: true, row };
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
    // رسالة جديدة تُخرج العميل من الأرشيف تلقائياً
    if (row.archived) {
      row.archived = false;
      row.archivedAt = null;
    }
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
    if (isFollowupOutboundMode(meta.mode) || looksLikeFollowupMessage(text)) {
      row.followupSent = true;
      row.followupSentAt = row.followupSentAt || now;
    }
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
    hydrateFromDiskIfNeeded();
    const today = calendarDayKey();
    const yesterday = shiftDayKey(today, -1);
    const wantArchive = day === "archive" || day === "archived";
    const wantManual = day === "manual" || day === "يدوي";
    const wantRejected = day === "rejected" || day === "رفض";
    const outcomeLabel = outcomeLabelForTab(day);
    let target = null;
    if (!wantArchive && !wantManual && !wantRejected && !outcomeLabel) {
      if (day === "today") target = today;
      else if (day === "yesterday") target = yesterday;
      else if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) target = day;
    }

    const rows = [...customers.values()]
      .filter((row) => {
        const isArchived = Boolean(row.archived);
        const isManual = Boolean(row.manual);
        const isRejected = Boolean(row.rejected);
        if (wantRejected) return isRejected && !isArchived && !isManual;
        if (wantManual) return isManual && !isArchived && !isRejected;
        if (wantArchive) return isArchived;
        if (isArchived || isManual || isRejected) return false;
        const orderTicket = hasOrderTicket(row);
        if (outcomeLabel === OUTCOMES.ORDER_NUMBER) return orderTicket;
        if (orderTicket) return false;
        if (outcomeLabel) {
          return String(row.outcome || "").trim() === outcomeLabel;
        }
        if (!target) return true; // الكل (غير المؤرشف)
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
      .sort((a, b) => {
        if (wantRejected) {
          return (
            Date.parse(b.rejectedAt || b.lastSeenAt) -
            Date.parse(a.rejectedAt || a.lastSeenAt)
          );
        }
        if (wantManual) {
          return (
            Date.parse(b.manualAt || b.lastSeenAt) -
            Date.parse(a.manualAt || a.lastSeenAt)
          );
        }
        if (wantArchive) {
          return (
            Date.parse(b.archivedAt || b.lastSeenAt) -
            Date.parse(a.archivedAt || a.lastSeenAt)
          );
        }
        return Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt);
      });

    let dayKey = "all";
    if (wantRejected) dayKey = "rejected";
    else if (wantManual) dayKey = "manual";
    else if (wantArchive) dayKey = "archive";
    else if (outcomeLabel) dayKey = String(day);
    else if (target) dayKey = target;

    return {
      timezone: TIMEZONE,
      today,
      yesterday,
      day: dayKey,
      outcome: outcomeLabel || null,
      count: rows.length,
      customers: rows,
    };
  }

  function summary() {
    hydrateFromDiskIfNeeded();
    const todayPack = listByDay("today");
    const yesterdayPack = listByDay("yesterday");
    const archivePack = listByDay("archive");
    const manualPack = listByDay("manual");
    const rejectedPack = listByDay("rejected");
    const orderPack = listByDay("order_number");
    const activeRows = [...customers.values()].filter(
      (r) => !r.archived && !r.manual && !r.rejected && !hasOrderTicket(r)
    );
    const outcomeCounts = {};
    for (const [key, label] of Object.entries(OUTCOME_TAB_FILTERS)) {
      if (key === "order_number") continue;
      outcomeCounts[key] = activeRows.filter(
        (r) => String(r.outcome || "").trim() === label
      ).length;
    }
    return {
      timezone: TIMEZONE,
      today: todayPack.today,
      yesterday: yesterdayPack.yesterday,
      counts: {
        today: todayPack.count,
        yesterday: yesterdayPack.count,
        all: activeRows.length,
        archive: archivePack.count,
        manual: manualPack.count,
        rejected: rejectedPack.count,
        order_number: orderPack.count,
        ...outcomeCounts,
      },
    };
  }

  function flush() {
    if (writeTimer) {
      clearTimeout(writeTimer);
      writeTimer = null;
    }
    return saveNow({ snapshot: true });
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
          companyName: existing.companyName || incoming.companyName || null,
          jobCategory: existing.jobCategory || incoming.jobCategory || null,
          civilianSubtype:
            existing.civilianSubtype || incoming.civilianSubtype || null,
          outcome: existing.outcome || incoming.outcome || "",
          notes: existing.notes || incoming.notes || "",
          archived: Boolean(existing.archived || incoming.archived),
          archivedAt: existing.archivedAt || incoming.archivedAt || null,
          manual: Boolean(existing.manual || incoming.manual),
          manualAt: existing.manualAt || incoming.manualAt || null,
          rejected: Boolean(existing.rejected || incoming.rejected),
          rejectedAt: existing.rejectedAt || incoming.rejectedAt || null,
          followupPlus: Boolean(existing.followupPlus || incoming.followupPlus),
          followupPlusAt: existing.followupPlusAt || incoming.followupPlusAt || null,
          followupSent: Boolean(existing.followupSent || incoming.followupSent),
          followupSentAt: existing.followupSentAt || incoming.followupSentAt || null,
          orderNumber: existing.orderNumber || incoming.orderNumber || null,
          orderNumberAt:
            existing.orderNumberAt || incoming.orderNumberAt || null,
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
    setNotes,
    setOutcomeNotes,
    setArchived,
    setManual,
    setRejected,
    setFollowupPlus,
    placeInLinkFollowup,
    setOrderNumber,
    setWorkplace,
    findByPhone,
    listByDay,
    summary,
    flush,
    exportPayload,
    importPayload,
    createSnapshot,
    upsertContact,
    listBackups,
    persistenceInfo,
    hydrateFromDiskIfNeeded,
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
  resolveCustomersDataDir,
  isDurableDir,
  looksLikeFollowupMessage,
  hasFirstFollowup,
  TIMEZONE,
};
