/**
 * جلب جهات الاتصال من Interakt (Get Users API)
 * https://api.interakt.ai/v1/public/apis/users/
 */
const { riyadhRangeToUtc, normalizePhone } = require("./customer-log");

async function fetchInteraktUsersPage({
  apiKey,
  offset = 0,
  limit = 100,
  filters = [],
  fetchImpl = fetch,
}) {
  const url = `https://api.interakt.ai/v1/public/apis/users/?offset=${offset}&limit=${limit}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(filters.length ? { filters } : {}),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    const err = new Error(`Interakt users API ${response.status}`);
    err.details = json;
    throw err;
  }
  return json;
}

function pickUsersArray(json) {
  if (!json || typeof json !== "object") return [];
  if (Array.isArray(json.users)) return json.users;
  if (Array.isArray(json.result)) return json.result;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.results)) return json.results;
  return [];
}

function normalizeInteraktUser(user) {
  const traits = user.traits || user.Traits || {};
  const phone = normalizePhone(
    user.phone_number ||
      user.phoneNumber ||
      traits.phone_number ||
      traits.whatsapp_number ||
      ""
  );
  let countryCode = String(
    user.country_code || user.countryCode || traits.country_code || "+966"
  ).trim();
  if (countryCode && !countryCode.startsWith("+")) {
    countryCode = `+${countryCode}`;
  }
  const name =
    user.name ||
    traits.name ||
    [traits.first_name, traits.last_name].filter(Boolean).join(" ") ||
    "";
  const createdAt =
    user.created_at_utc ||
    user.created_at ||
    traits.created_at_utc ||
    null;
  const modifiedAt =
    user.modified_at_utc ||
    user.modified_at ||
    traits.modified_at_utc ||
    createdAt;
  return {
    phone,
    countryCode: countryCode || "+966",
    name: String(name || "").trim(),
    createdAt,
    modifiedAt,
    lastAt: modifiedAt || createdAt || null,
    source: "interakt",
  };
}

/**
 * عملاء Interakt المعدّلون أو المُنشؤون بين fromYmd و toYmd (توقيت الرياض)
 */
async function listInteraktCustomersInRange({
  apiKey,
  fromYmd,
  toYmd,
  fetchImpl = fetch,
  maxPages = 20,
}) {
  if (!apiKey) {
    return { customers: [], error: "INTERAKT_API_KEY غير مضبوط" };
  }

  const { from, to } = riyadhRangeToUtc(fromYmd, toYmd);
  // أوسع قليلًا لضمان الالتقاط
  const fromIso = new Date(from.getTime() - 1000).toISOString();
  const toIso = new Date(to.getTime() + 1000).toISOString();

  const filterSets = [
    [
      { trait: "modified_at_utc", op: "gt", val: fromIso },
      {
        trait: "modified_at_utc",
        op: "lt",
        supr_op: "and",
        val: toIso,
      },
    ],
    [
      { trait: "created_at_utc", op: "gt", val: fromIso },
      {
        trait: "created_at_utc",
        op: "lt",
        supr_op: "and",
        val: toIso,
      },
    ],
  ];

  const byPhone = new Map();
  let lastError = null;

  for (const filters of filterSets) {
    let offset = 0;
    for (let page = 0; page < maxPages; page += 1) {
      try {
        const json = await fetchInteraktUsersPage({
          apiKey,
          offset,
          limit: 100,
          filters,
          fetchImpl,
        });
        const users = pickUsersArray(json);
        for (const raw of users) {
          const row = normalizeInteraktUser(raw);
          if (!row.phone) continue;
          const prev = byPhone.get(row.phone);
          if (
            !prev ||
            Date.parse(row.lastAt || 0) > Date.parse(prev.lastAt || 0)
          ) {
            byPhone.set(row.phone, row);
          }
        }
        const hasNext =
          json.has_next_page === true ||
          json.hasNextPage === true ||
          users.length >= 100;
        if (!hasNext || !users.length) break;
        offset += 100;
      } catch (err) {
        lastError = err.message;
        console.error("[interakt-users]", err.message, err.details || "");
        break;
      }
    }
  }

  const customers = [...byPhone.values()].sort(
    (a, b) => Date.parse(b.lastAt || 0) - Date.parse(a.lastAt || 0)
  );
  return { customers, error: customers.length ? null : lastError };
}

module.exports = {
  fetchInteraktUsersPage,
  listInteraktCustomersInRange,
  normalizeInteraktUser,
};
