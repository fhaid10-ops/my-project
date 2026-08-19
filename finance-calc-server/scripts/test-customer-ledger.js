const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  createCustomerLedger,
  calendarDayKey,
  shiftDayKey,
  phoneQueryMatches,
} = require("../lib/customer-ledger");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-"));
const dataFile = path.join(dir, "customers.json");
const backupDir = path.join(dir, "backups");

const ledger = createCustomerLedger({ dataFile, backupDir });
const today = calendarDayKey();
const yesterday = shiftDayKey(today, -1);

ledger.recordInbound("+966", "508031055", "السلام", {
  flow: "main_menu",
  step: "awaiting_choice",
});
assert.strictEqual(ledger.findByPhone("0508031055").phone, "508031055");
assert.strictEqual(ledger.findByPhone("508031055").phone, "508031055");
assert.strictEqual(ledger.findByPhone("0599999999"), null);

assert.ok(phoneQueryMatches("0551", "551850488"));
assert.ok(phoneQueryMatches("0551850488", "551850488"));
assert.ok(phoneQueryMatches("551850488", "551850488"));
assert.ok(!phoneQueryMatches("0551", "559000111"));
assert.ok(!phoneQueryMatches("05", "551850488"));
ledger.recordOutbound("+966", "508031055", "مرحبا معاك رائد", {
  mode: "text+interactive",
  flow: "personal_chat",
  companyName: "شركة اختبار",
  jobCategory: "civilian",
  civilianSubtype: "private",
});
const noted = ledger.setNotes("+966", "508031055", "يتابع العرض");
assert.ok(noted);
assert.strictEqual(noted.companyName, "شركة اختبار");
assert.strictEqual(noted.notes, "يتابع العرض");
const wp = ledger.setWorkplace("+966", "508031055", "government");
assert.ok(wp.ok);
assert.strictEqual(wp.row.jobCategory, "civilian");
assert.strictEqual(wp.row.civilianSubtype, "government");
const cleared = ledger.setWorkplace("+966", "508031055", "clear");
assert.ok(cleared.ok);
assert.strictEqual(cleared.row.jobCategory, null);
const ordered = ledger.setOrderNumber("+966", "508031055", "10171234");
assert.ok(ordered);
assert.strictEqual(ordered.orderNumber, "10171234");
assert.ok(ordered.orderNumberAt);
assert.strictEqual(ordered.outcome, "رقم طلب");
assert.ok(ledger.listByDay("order_number").count >= 1);
assert.strictEqual(ledger.summary().counts.order_number, 1);
assert.ok(
  !ledger.listByDay("today").customers.some((c) => c.phone === "508031055"),
  "صاحب رقم الطلب لا يبقى في سجل اليوم"
);

const todayPack = ledger.listByDay("today");
assert.strictEqual(todayPack.today, today);
assert.strictEqual(todayPack.yesterday, yesterday);

ledger.setOutcomeNotes("+966", "508031055", "أخذ باقة");
assert.ok(
  ledger.listByDay("order_number").count >= 1,
  "وجود رقم الطلب يبقيهم في قسم رقم طلب"
);
assert.strictEqual(ledger.listByDay("package").count, 0);
ledger.setOrderNumber("+966", "508031055", "");
assert.strictEqual(ledger.listByDay("order_number").count, 0);
assert.ok(ledger.listByDay("package").count >= 1);
assert.strictEqual(ledger.summary().counts.package, 1);
ledger.setOutcomeNotes("+966", "508031055", "مستنفذ حد");
assert.ok(ledger.listByDay("limit_exhausted").count >= 1);
ledger.setOutcomeNotes("+966", "508031055", "إيقاف خدمات");
assert.ok(ledger.listByDay("service_stop").count >= 1);

const archived = ledger.setArchived("+966", "508031055", true);
assert.ok(archived.archived);
assert.ok(archived.archivedAt);
assert.strictEqual(ledger.listByDay("today").count, 0);
assert.strictEqual(ledger.listByDay("service_stop").count, 0, "المؤرشف لا يظهر في تبويب وش صار");
assert.strictEqual(ledger.listByDay("archive").count, 1);
assert.strictEqual(ledger.summary().counts.archive, 1);
assert.strictEqual(ledger.summary().counts.all, 0);
ledger.setArchived("+966", "508031055", false);
assert.ok(ledger.listByDay("today").count >= 1);
assert.ok(ledger.listByDay("service_stop").count >= 1);
assert.strictEqual(ledger.listByDay("archive").count, 0);
// أرشفة ثم رسالة واردة تُخرج من الأرشيف
ledger.setArchived("+966", "508031055", true);
ledger.recordInbound("+966", "508031055", "ارجع");
assert.strictEqual(ledger._customers.get("+966:508031055").archived, false);
assert.ok(ledger.listByDay("today").count >= 1);

const manual = ledger.setManual("+966", "508031055", true);
assert.ok(manual.manual);
assert.ok(manual.manualAt);
assert.strictEqual(ledger.listByDay("today").count, 0);
assert.strictEqual(ledger.listByDay("service_stop").count, 0, "اليدوي لا يظهر في تبويب وش صار");
assert.strictEqual(ledger.listByDay("manual").count, 1);
assert.strictEqual(ledger.summary().counts.manual, 1);
assert.strictEqual(ledger.summary().counts.all, 0);
ledger.recordInbound("+966", "508031055", "ما زال يدوي");
assert.strictEqual(ledger._customers.get("+966:508031055").manual, true, "الرسالة الواردة لا تلغي اليدوي");
ledger.setManual("+966", "508031055", false);
assert.ok(ledger.listByDay("today").count >= 1);
assert.strictEqual(ledger.listByDay("manual").count, 0);

const rejected = ledger.setRejected("+966", "508031055", true);
assert.ok(rejected.rejected);
assert.ok(rejected.rejectedAt);
assert.strictEqual(ledger.listByDay("today").count, 0);
assert.strictEqual(ledger.listByDay("service_stop").count, 0, "المرفوض لا يظهر في تبويب وش صار");
assert.strictEqual(ledger.listByDay("rejected").count, 1);
assert.strictEqual(ledger.summary().counts.rejected, 1);
assert.strictEqual(ledger.summary().counts.all, 0);
ledger.recordInbound("+966", "508031055", "ما زال مرفوض");
assert.strictEqual(ledger._customers.get("+966:508031055").rejected, true, "الرسالة الواردة لا تلغي الرفض");
ledger.setRejected("+966", "508031055", false);
assert.ok(ledger.listByDay("today").count >= 1);
assert.strictEqual(ledger.listByDay("rejected").count, 0);

ledger.setOutcomeNotes("+966", "508031055", "أخذ رابط التمويل");
const plus = ledger.setFollowupPlus("+966", "508031055", true);
assert.ok(plus.followupPlus);
assert.ok(plus.followupPlusAt);
assert.ok(
  ledger.listByDay("finance_link").customers.some((r) => r.phone === "508031055")
);
ledger.recordInbound("+966", "508031055", "ما زال بلس");
assert.strictEqual(
  ledger._customers.get("+966:508031055").followupPlus,
  true,
  "الرسالة الواردة لا تلغي متابعة بلس"
);
ledger.setFollowupPlus("+966", "508031055", false);
assert.strictEqual(ledger._customers.get("+966:508031055").followupPlus, false);

const sentPlace = ledger.placeInLinkFollowup("+966", "508031055", "sent");
assert.strictEqual(sentPlace.outcome, "أخذ رابط التمويل");
assert.strictEqual(sentPlace.followupPlus, false);
assert.strictEqual(sentPlace.followupSent, true);
assert.ok(sentPlace.followupSentAt);
ledger.recordOutbound("+966", "508031055", "القائمة الرئيسية", {
  mode: "admin-menu",
});
assert.strictEqual(
  ledger._customers.get("+966:508031055").followupSent,
  true,
  "رسالة البوت اللاحقة لا تُخرج العميل من تمت المتابعة"
);
assert.ok(
  ledger.listByDay("finance_link").customers.some((r) => r.phone === "508031055")
);
const plusPlace = ledger.placeInLinkFollowup("+966", "508031055", "plus");
assert.ok(plusPlace.followupPlus);
assert.strictEqual(plusPlace.outcome, "أخذ رابط التمويل");
ledger.setFollowupPlus("+966", "508031055", false);

const pastDay = shiftDayKey(today, -5);
const row = ledger._customers.get("+966:508031055");
row.lastSeenAt = `${pastDay}T12:00:00.000Z`;
row.firstSeenAt = `${pastDay}T12:00:00.000Z`;
row.syncedAt = null;
const dated = ledger.listByDay(pastDay);
assert.strictEqual(dated.day, pastDay);
assert.ok(
  dated.customers.some((c) => c.phone === "508031055"),
  "السجل يظهر حسب التاريخ المحدد"
);
assert.ok(!ledger.listByDay("today").customers.some((c) => c.phone === "508031055"));
row.lastSeenAt = new Date().toISOString();
row.firstSeenAt = row.lastSeenAt;

const exported = ledger.exportPayload();
assert.strictEqual(exported.kind, "raed-customer-ledger");
assert.ok(exported.count >= 1);

const saved = ledger.flush();
assert.ok(saved.ok);
assert.ok(fs.existsSync(dataFile));
const snap = ledger.createSnapshot("test");
assert.ok(snap.ok);
assert.ok(fs.existsSync(snap.file));

// لا يسمح بحفظ فارغ فوق سجل موجود بحجم معتبر
const guardFile = path.join(dir, "customers-empty-guard.json");
const guardBackup = path.join(dir, "backups-empty-guard");
const fatPayload = {
  customers: Array.from({ length: 20 }, (_, i) => ({
    key: `+966:5000000${String(i).padStart(2, "0")}`,
    phone: `5000000${String(i).padStart(2, "0")}`,
    countryCode: "+966",
    lastSeenAt: new Date().toISOString(),
  })),
};
fs.writeFileSync(guardFile, JSON.stringify(fatPayload, null, 2));
const blank = createCustomerLedger({
  dataFile: guardFile,
  backupDir: guardBackup,
});
assert.ok(blank.summary().counts.all >= 20);
blank._customers.clear();
const refused = blank.flush();
assert.ok(blank.summary().counts.all >= 20, "يجب استرجاع السجل بدل الكتابة الفارغة");
assert.ok(refused.ok !== false || refused.error);

const reloaded = createCustomerLedger({ dataFile, backupDir });
assert.ok(reloaded.summary().counts.all >= 1);
const info = reloaded.persistenceInfo();
assert.ok(info.exists);
assert.ok(info.count >= 1);
assert.ok(info.dataFile === dataFile);

const ledger2 = createCustomerLedger({
  dataFile: path.join(dir, "customers2.json"),
  backupDir: path.join(dir, "backups2"),
});
const imported = ledger2.importPayload(exported);
assert.ok(imported.ok);
assert.ok(imported.total >= 1);

const contact = ledger2.upsertContact({
  phone: "533248917",
  countryCode: "+966",
  name: "عميل Interakt",
  modified_at_utc: new Date().toISOString(),
});
assert.ok(contact.created);
assert.ok(ledger2.listByDay("today").customers.some((c) => c.phone === "533248917"));

// hydrate: ذاكرة فارغة + ملف على القرص (مجلد مستقل لتفادي مؤقتات الحفظ)
const hydDir = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-hyd-"));
const hydrateFile = path.join(hydDir, "customers-hydrate.json");
const hydrateBackup = path.join(hydDir, "backups-hydrate");
fs.writeFileSync(
  hydrateFile,
  JSON.stringify(
    {
      customers: Array.from({ length: 5 }, (_, i) => ({
        key: `+966:51111111${i}`,
        phone: `51111111${i}`,
        countryCode: "+966",
        lastSeenAt: new Date().toISOString(),
        notes: "x".repeat(40),
      })),
    },
    null,
    2
  )
);
const hydra = createCustomerLedger({
  dataFile: hydrateFile,
  backupDir: hydrateBackup,
});
assert.ok(hydra.summary().counts.all >= 5);
hydra._customers.clear();
assert.strictEqual(hydra._customers.size, 0);
assert.ok(hydra.hydrateFromDiskIfNeeded());
assert.ok(hydra.summary().counts.all >= 5);

const {
  resolveCustomersDataDir,
  isDurableDir,
} = require("../lib/customer-ledger");
assert.strictEqual(isDurableDir("/var/data/kobri"), true);
assert.strictEqual(isDurableDir(path.join(__dirname, "..", "data")), false);
assert.ok(
  resolveCustomersDataDir({ CUSTOMERS_DATA_DIR: "/var/data/kobri" }).endsWith(
    `${path.sep}var${path.sep}data${path.sep}kobri`
  ) || resolveCustomersDataDir({ CUSTOMERS_DATA_DIR: "/var/data/kobri" }) === "/var/data/kobri"
);

const searchDir = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-search-"));
const searchLedger = createCustomerLedger({
  dataFile: path.join(searchDir, "customers.json"),
  backupDir: path.join(searchDir, "backups"),
});
searchLedger.recordInbound("+966", "551850488", "مرحبا");
searchLedger.recordInbound("+966", "551850499", "مرحبا");
searchLedger.recordInbound("+966", "559000111", "مرحبا");
assert.deepStrictEqual(
  searchLedger.searchByPhone("0551").map((r) => r.phone).sort(),
  ["551850488", "551850499"]
);
assert.deepStrictEqual(
  searchLedger.searchByPhone("5518").map((r) => r.phone).sort(),
  ["551850488", "551850499"]
);
assert.strictEqual(searchLedger.searchByPhone("0551850488")[0].phone, "551850488");
assert.strictEqual(searchLedger.searchByPhone("05").length, 0);

console.log("OK: customer ledger export/import/backup + interakt upsert + persistence");
