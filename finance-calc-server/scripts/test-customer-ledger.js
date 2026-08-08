const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  createCustomerLedger,
  calendarDayKey,
  shiftDayKey,
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
ledger.recordOutbound("+966", "508031055", "مرحبا معاك رائد", {
  mode: "text+interactive",
  flow: "main_menu",
});

const todayPack = ledger.listByDay("today");
assert.ok(todayPack.count >= 1);
assert.strictEqual(todayPack.today, today);
assert.strictEqual(todayPack.yesterday, yesterday);

const exported = ledger.exportPayload();
assert.strictEqual(exported.kind, "raed-customer-ledger");
assert.ok(exported.count >= 1);

const saved = ledger.flush();
assert.ok(saved.ok);
assert.ok(fs.existsSync(dataFile));
const snap = ledger.createSnapshot("test");
assert.ok(snap.ok);
assert.ok(fs.existsSync(snap.file));

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

console.log("OK: customer ledger export/import/backup + interakt upsert + persistence");
