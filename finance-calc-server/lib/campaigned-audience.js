/**
 * أرقام سبق أن دخلت حملة إنترأكت — محلية فقط، لا تُرفع لـ GitHub.
 */
const fs = require("fs");
const path = require("path");

function normalizePhone(raw) {
  let phone = String(raw || "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");
  if (phone.startsWith("966") && phone.length > 9) phone = phone.slice(3);
  return phone;
}

function isSaudiMobile(phone) {
  return /^5\d{8}$/.test(String(phone || ""));
}

function phonesFromCsv(text) {
  const phones = [];
  const seen = new Set();
  for (const line of String(text || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || /^country\s*code/i.test(trimmed)) continue;
    const parts = trimmed.split(/[,;\t]/).map((s) => s.trim());
    const candidate = parts.length >= 2 ? parts[parts.length - 1] : parts[0];
    const phone = normalizePhone(candidate);
    if (!isSaudiMobile(phone) || seen.has(phone)) continue;
    seen.add(phone);
    phones.push(phone);
  }
  return phones;
}

function createCampaignedAudience(options = {}) {
  const dataDir = options.dataDir || path.join(__dirname, "..", "data");
  const seedDir =
    options.seedDir === undefined
      ? path.join(__dirname, "..", "data", "audiences")
      : options.seedDir;
  const dataFile = options.dataFile || path.join(dataDir, "campaigned-phones.json");
  const phones = new Set();

  function persist() {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    const list = [...phones].sort();
    fs.writeFileSync(
      dataFile,
      `${JSON.stringify(
        {
          savedAt: new Date().toISOString(),
          note: "أرقام حملات سابقة — لا ترفع لـ GitHub",
          count: list.length,
          phones: list,
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }

  function add(list) {
    let added = 0;
    for (const raw of list || []) {
      const phone = normalizePhone(raw);
      if (!isSaudiMobile(phone) || phones.has(phone)) continue;
      phones.add(phone);
      added += 1;
    }
    if (added) persist();
    return { added, count: phones.size };
  }

  function importCsv(text) {
    return add(phonesFromCsv(text));
  }

  function seedFromDir(dir) {
    if (!dir || !fs.existsSync(dir)) return { added: 0, files: 0 };
    let files = 0;
    let added = 0;
    for (const name of fs.readdirSync(dir).sort()) {
      if (!name.endsWith(".csv")) continue;
      const text = fs.readFileSync(path.join(dir, name), "utf8");
      added += importCsv(text).added;
      files += 1;
    }
    return { added, files, count: phones.size };
  }

  if (fs.existsSync(dataFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(dataFile, "utf8"));
      if (Array.isArray(raw.phones)) add(raw.phones);
    } catch {
      /* ملف تالف — نعيد البناء من الـ CSV */
    }
  }

  if (seedDir) seedFromDir(seedDir);

  return {
    has(phone) {
      return phones.has(normalizePhone(phone));
    },
    add,
    importCsv,
    seedFromDir,
    count() {
      return phones.size;
    },
    excludeSet() {
      return new Set(phones);
    },
    dataFile,
  };
}

module.exports = {
  createCampaignedAudience,
  phonesFromCsv,
  normalizePhone,
  isSaudiMobile,
};
