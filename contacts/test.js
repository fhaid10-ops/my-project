#!/usr/bin/env node
"use strict";

const fs = require("fs");
const vcard = require("./vcard");
const zip = require("./zip");

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("fail", msg);
    return;
  }
  console.log("ok", msg);
}

const SAMPLE = [
  "BEGIN:VCARD",
  "VERSION:2.1",
  "N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=D8=B1=D9=85=D8=B2=D9=8A;=D8=A7=D8=A8=D9=88;;;",
  "FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=D8=A7=D8=A8=D9=88=20=D8=B1=D9=85=D8=B2=D9=8A",
  "TEL;CELL:0507114708",
  "END:VCARD",
  "BEGIN:VCARD",
  "VERSION:2.1",
  "FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=D8=A7=D8=AD=D9=85=D8=AF",
  "TEL;CELL:+966553794389",
  "TEL;HOME:0112345678",
  "EMAIL;HOME:sample@example.com",
  "END:VCARD",
  "BEGIN:VCARD",
  "VERSION:2.1",
  "FN:Empty",
  "END:VCARD",
].join("\r\n");

assert(vcard.decodeQuotedPrintable("=D8=A7=D8=A8=D9=88") === "ابو", "quoted-printable arabic");
assert(vcard.normalizePhone("0507114708").e164 === "+966507114708", "local 05 mobile");
assert(vcard.normalizePhone("507114708").display === "0507114708", "9-digit mobile");
assert(vcard.normalizePhone("+966553794389").whatsapp === "966553794389", "plus-966 mobile");
assert(vcard.normalizePhone("00966553794389").e164 === "+966553794389", "00 prefix");

const cards = vcard.parseCards(SAMPLE);
assert(cards.length === 3, "parsed 3 cards");
assert(cards[0].name === "ابو رمزي", "decoded FN");
assert(cards[0].phones[0].display === "0507114708", "first phone display");
assert(cards[1].phones.length === 2, "second card keeps two numbers");
assert(cards[1].emails[0] === "sample@example.com", "email kept");
assert(cards[2].name === "Empty", "name-only card kept");

const merged = vcard.mergeContacts(cards, vcard.parseCards(SAMPLE));
assert(merged.length === 3, "merge does not duplicate same phones");

const csv = vcard.toCsv(cards);
assert(csv.indexOf("ابو رمزي") !== -1 && csv.indexOf("+966507114708") !== -1, "csv export");
const modern = vcard.toVcard30(cards);
assert(modern.indexOf("VERSION:3.0") !== -1 && modern.indexOf("FN:ابو رمزي") !== -1, "vcard 3.0 export");

const folded = [
  "BEGIN:VCARD",
  "VERSION:2.1",
  "FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=D8=A7",
  " =D8=AD=D9=85=D8=AF",
  "TEL;CELL:0550000000",
  "END:VCARD",
].join("\n");
assert(vcard.parseCards(folded)[0].name === "احمد", "folded quoted-printable line");

function storeZip(name, content) {
  const nameBuf = Buffer.from(name);
  const data = Buffer.from(content);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(nameBuf.length, 26);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  return Buffer.concat([header, nameBuf, data]);
}

const realZip = "/home/ubuntu/.cursor/projects/workspace/uploads/Hotmail_b997.zip";
const realVcf = "/tmp/hotmail-extract/vcards_20111101_001934.vcf";

function finish() {
  if (failed) {
    console.error(failed + " failed");
    process.exit(1);
  }
  console.log("all tests passed");
}

function testSyntheticZip() {
  return zip.extractVcfText(storeZip("sample.vcf", SAMPLE), "sample.zip").then(function (text) {
    assert(vcard.parseCards(text)[0].name === "ابو رمزي", "synthetic zip vcf");
  });
}

function testRealExport() {
  if (!fs.existsSync(realVcf)) {
    console.log("skip real hotmail vcf (not present)");
    return Promise.resolve();
  }
  const text = fs.readFileSync(realVcf, "utf8");
  const real = vcard.parseCards(text);
  assert(real.length === 165, "real export has 165 cards, got " + real.length);
  assert(real.every(function (c) { return c.name && c.name !== "بدون اسم"; }), "every real card has a name");
  assert(real.filter(function (c) { return c.phones.length; }).length >= 160, "almost all cards have phones");
  assert(real.some(function (c) { return /[\u0600-\u06FF]/.test(c.name); }), "arabic names decoded");
  if (!fs.existsSync(realZip)) return Promise.resolve();
  return zip.extractVcfText(fs.readFileSync(realZip), "Hotmail.zip").then(function (fromZip) {
    const unzipped = vcard.parseCards(fromZip);
    assert(unzipped.length === real.length, "zip extract matches vcf count");
  });
}

testSyntheticZip()
  .then(testRealExport)
  .then(finish)
  .catch(function (err) {
    console.error(err);
    process.exit(1);
  });
