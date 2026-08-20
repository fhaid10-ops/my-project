#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");

function grab(name) {
  const re = new RegExp(`function ${name}\\([\\s\\S]*?\\n  \\}\\n`);
  const m = src.match(re);
  if (!m) throw new Error("missing " + name);
  return m[0];
}

const fns = {};
eval(
  [
    grab("todayKey"),
    grab("shiftDay"),
    grab("parseDateValue"),
    grab("parseNumber"),
    grab("parseCsv"),
    grab("headerKey"),
    grab("formatDate"),
  ].join("\n") +
    `;
  fns.todayKey = todayKey;
  fns.shiftDay = shiftDay;
  fns.parseDateValue = parseDateValue;
  fns.parseNumber = parseNumber;
  fns.parseCsv = parseCsv;
  fns.headerKey = headerKey;
  fns.formatDate = formatDate;
`
);

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("fail", msg);
    return;
  }
  console.log("ok", msg);
}

assert(fns.parseDateValue("09-08-26") === "2026-08-09", "excel DD-MM-YY");
assert(fns.parseDateValue("2026-08-20") === "2026-08-20", "iso date");
assert(fns.parseDateValue("18/08/2026") === "2026-08-18", "slash date");
assert(fns.shiftDay("2026-08-20", -1) === "2026-08-19", "prev day");
assert(fns.shiftDay("2026-08-01", -1) === "2026-07-31", "month boundary");
assert(fns.parseNumber("50,000.00") === 50000, "amount commas");
assert(fns.formatDate("2026-08-09") === "09-08-26", "display date");
assert(fns.headerKey("رقم الطلب") === "orderNumber", "arabic header");
assert(fns.headerKey("Dakhli Income") === "income", "income header");
const rows = fns.parseCsv('التاريخ,رقم الطلب,اسم العميل\n09-08-26,10170379,"عبدالله محمد"');
assert(rows.length === 2 && rows[1][1] === "10170379", "csv parse");
const tabs = fns.parseCsv("التاريخ\tرقم الطلب\n09-08-26\t10170379");
assert(tabs[1][1] === "10170379", "tsv parse");

if (failed) {
  process.exit(1);
}
console.log("all tests passed");
