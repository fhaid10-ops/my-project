const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  createCustomerLedger,
  calendarDayKey,
  shiftDayKey,
} = require("../lib/customer-ledger");

const tmp = path.join(
  os.tmpdir(),
  `customer-ledger-test-${Date.now()}.json`
);

const ledger = createCustomerLedger({ dataFile: tmp });
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
assert.ok(todayPack.customers.some((c) => c.phone === "508031055"));

const row = todayPack.customers.find((c) => c.phone === "508031055");
assert.strictEqual(row.inboundCount, 1);
assert.strictEqual(row.outboundCount, 1);
assert.ok(String(row.lastInboundText).includes("السلام"));

ledger.flush();
assert.ok(fs.existsSync(tmp));

const ledger2 = createCustomerLedger({ dataFile: tmp });
const again = ledger2.listByDay("today");
assert.ok(again.customers.some((c) => c.phone === "508031055"));

const summary = ledger2.summary();
assert.ok(summary.counts.today >= 1);
assert.ok(summary.counts.all >= 1);

fs.unlinkSync(tmp);
console.log("OK: customer ledger today/yesterday + persistence");
