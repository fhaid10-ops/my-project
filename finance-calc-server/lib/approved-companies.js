/**
 * قائمة الشركات المعتمدة — بحث بالاسم لاختيار عبر واتساب (حد القائمة 10)
 */
const path = require("path");
const fs = require("fs");

let cache = null;

function loadCompanies() {
  if (cache) return cache;
  const file = path.join(__dirname, "..", "data", "approved-companies.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const companies = (raw.companies || []).map((c, index) => ({
    index,
    name: String(c.name || "").trim(),
    nameEn: c.nameEn ? String(c.nameEn).trim() : "",
    sector: c.sector || null,
  }));
  cache = companies.filter((c) => c.name);
  return cache;
}

function normalizeCompanyText(text) {
  let t = String(text || "")
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^a-z0-9\u0600-\u06FF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // تجاهل بادئة "شركة" للمقارنة
  t = t.replace(/^(شركه|شركة|co|company)\s+/i, "").trim();
  return t;
}

function scoreMatch(queryNorm, company) {
  if (!queryNorm) return 0;
  const nameN = normalizeCompanyText(company.name);
  const enN = normalizeCompanyText(company.nameEn);
  if (!nameN && !enN) return 0;

  let score = 0;
  for (const target of [nameN, enN]) {
    if (!target) continue;
    if (target === queryNorm) score = Math.max(score, 100);
    else if (target.startsWith(queryNorm)) score = Math.max(score, 80);
    else if (target.includes(queryNorm)) score = Math.max(score, 60);
    else if (queryNorm.length >= 4 && queryNorm.includes(target) && target.length >= 4) {
      score = Math.max(score, 50);
    }
  }
  return score;
}

/**
 * ابحث عن شركات مطابقة — أقصى 10 لعرض واتساب
 */
function searchApprovedCompanies(query, { limit = 10 } = {}) {
  const q = normalizeCompanyText(query);
  if (!q || q.length < 2) return [];

  const scored = [];
  for (const company of loadCompanies()) {
    const score = scoreMatch(q, company);
    if (score > 0) scored.push({ ...company, score });
  }
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ar"));
  return scored.slice(0, limit);
}

function getApprovedCompanyCount() {
  return loadCompanies().length;
}

function companyListInteractive(matches, bodyText) {
  const rows = matches.slice(0, 10).map((c, i) => {
    const full = c.name;
    const title = full.length <= 24 ? full : `${full.slice(0, 21)}...`;
    const rest = full.length > 24 ? full.slice(21) : c.nameEn || "شركة معتمدة";
    return {
      id: `co_${i}`,
      title,
      description: String(rest).slice(0, 72),
    };
  });
  return {
    kind: "list",
    body: bodyText || "اختر شركتك من النتائج:",
    button: "اختر الشركة",
    sectionTitle: "الشركات المعتمدة",
    rows,
  };
}

function parseCompanyPick(text, matches = []) {
  const t = String(text || "").trim();
  const m = t.match(/^co_(\d+)$/i);
  if (m) {
    const idx = Number(m[1]);
    if (Number.isInteger(idx) && matches[idx]) return matches[idx];
  }
  // اختيار بالاسم الكامل إن طابق أحد النتائج
  const hit = matches.find(
    (c) =>
      c.name === t ||
      normalizeCompanyText(c.name) === normalizeCompanyText(t)
  );
  return hit || null;
}

function parseCivilianSubtype(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  if (
    /^(civilian_gov|civ_gov|gov|government)$/i.test(t) ||
    /حكومي/.test(t) ||
    /^1$/.test(t)
  ) {
    return "government";
  }
  if (
    /^(civilian_private|civ_private|private)$/i.test(t) ||
    /قطاع\s*خاص|خاص/.test(t) ||
    /^2$/.test(t)
  ) {
    return "private";
  }
  return null;
}

function civilianSubtypeButtons() {
  return {
    kind: "buttons",
    body: "مدني — اختر: حكومي أو قطاع خاص",
    buttons: [
      { id: "civilian_gov", title: "حكومي" },
      { id: "civilian_private", title: "قطاع خاص" },
    ],
  };
}

module.exports = {
  loadCompanies,
  normalizeCompanyText,
  searchApprovedCompanies,
  getApprovedCompanyCount,
  companyListInteractive,
  parseCompanyPick,
  parseCivilianSubtype,
  civilianSubtypeButtons,
};
