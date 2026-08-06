/**
 * جلب جهات اتصال Interakt (Get Users API) لتعبئة سجل العملاء السابق
 * ملاحظة: يجلب الأرقام/تواريخ التواصل — مو نص المحادثات كامل
 */
async function fetchInteraktUsersPage({
  apiKey,
  offset = 0,
  limit = 100,
  filters = [],
}) {
  const url = `https://api.interakt.ai/v1/public/apis/users/?offset=${offset}&limit=${limit}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filters }),
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

function extractUsers(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.users)) return payload.users;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.users)) return payload.data.users;
  if (Array.isArray(payload.data?.results)) return payload.data.results;
  return [];
}

function hasNextPage(payload, pageLen, limit) {
  if (payload?.has_next_page === true || payload?.hasNextPage === true) {
    return true;
  }
  if (payload?.data?.has_next_page === true) return true;
  return pageLen >= limit;
}

/**
 * يجلب جهات الاتصال المعدّلة منذ sinceIso (مثل قبل يومين)
 */
async function syncInteraktUsersSince({
  apiKey,
  sinceIso,
  maxPages = 20,
  onUser,
}) {
  if (!apiKey) {
    return { ok: false, error: "INTERAKT_API_KEY غير مضبوط", fetched: 0 };
  }
  const filters = [
    {
      trait: "modified_at_utc",
      op: "gt",
      val: sinceIso,
    },
  ];

  let offset = 0;
  const limit = 100;
  let fetched = 0;
  let created = 0;
  let updated = 0;
  let pages = 0;

  while (pages < maxPages) {
    const payload = await fetchInteraktUsersPage({
      apiKey,
      offset,
      limit,
      filters,
    });
    const users = extractUsers(payload);
    pages += 1;
    if (!users.length) break;

    for (const user of users) {
      fetched += 1;
      const traits = user.traits || user.Traits || {};
      const result = onUser?.({
        phone: user.phoneNumber || user.phone_number || user.phone || traits.phone,
        countryCode:
          user.countryCode || user.country_code || traits.country_code || "+966",
        name: traits.name || user.name || "",
        created_at_utc:
          user.created_at_utc || traits.created_at_utc || user.createdAt,
        modified_at_utc:
          user.modified_at_utc || traits.modified_at_utc || user.updatedAt,
      });
      if (result?.created) created += 1;
      else if (result) updated += 1;
    }

    if (!hasNextPage(payload, users.length, limit)) break;
    offset += limit;
  }

  return { ok: true, fetched, created, updated, pages };
}

module.exports = {
  fetchInteraktUsersPage,
  syncInteraktUsersSince,
  extractUsers,
};
