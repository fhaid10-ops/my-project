const assert = require("assert");
const express = require("express");
const os = require("os");
const path = require("path");
const { createAdminRouter, normalizePhoneParts, parsePhoneList, isSaudiMobile, toInteraktAudienceCsv } = require("../lib/admin-routes");
const { showMainMenu } = require("../lib/main-menu");
const { createCustomerLedger } = require("../lib/customer-ledger");

const parts = normalizePhoneParts({ phone: "0501812339" });
assert.strictEqual(parts.phone, "501812339");
assert.strictEqual(parts.countryCode, "+966");
assert.strictEqual(isSaudiMobile("559526221"), true);
assert.strictEqual(isSaudiMobile("115033469"), false);
assert.deepStrictEqual(
  parsePhoneList("+966 55 952 6221\n050 429 7151\n+966 11 503 3469").map((p) => p.phone),
  ["559526221", "504297151", "115033469"]
);
const interaktCsv = toInteraktAudienceCsv("+966 55 952 6221\n0115033469\n0504297151");
assert.strictEqual(interaktCsv.count, 2);
assert.match(interaktCsv.csv, /^countryCode,phoneNumber\n/);
assert.match(interaktCsv.csv, /\+966,559526221/);
assert.doesNotMatch(interaktCsv.csv, /115033469/);

const sessions = new Map();
const drafts = new Map();
const pausedChats = new Set();
function sessionKey(cc, phone) {
  return `${cc}:${phone}`;
}

const customerLedger = createCustomerLedger({
  dataFile: path.join(os.tmpdir(), `admin-ledger-${Date.now()}.json`),
});
customerLedger.recordInbound("+966", "551234567", "مرحبا");

const sent = [];
const app = express();
app.use(express.json());
app.use(
  "/admin/api",
  createAdminRouter({
    adminToken: "test-token",
    sessions,
    drafts,
    pausedChats,
    sessionKey,
    clearDraft: (cc, phone) => drafts.delete(sessionKey(cc, phone)),
    clearSession: (cc, phone) => sessions.delete(sessionKey(cc, phone)),
    pauseChat: (cc, phone) => pausedChats.add(sessionKey(cc, phone)),
    resumeChat: (cc, phone) => pausedChats.delete(sessionKey(cc, phone)),
    isChatPaused: (cc, phone) => pausedChats.has(sessionKey(cc, phone)),
    saveDraft: (cc, phone, data) =>
      drafts.set(sessionKey(cc, phone), { data, savedAt: Date.now() }),
    sendInteraktText: async (cc, phone, message) => {
      sent.push({ cc, phone, message });
      return { ok: true };
    },
    sendResultReply: async (cc, phone, result) => {
      sent.push({ cc, phone, result });
      return "interactive";
    },
    showMainMenu,
    interaktConfigured: true,
    customerLedger,
  })
);

async function req(method, path, body, token = "test-token") {
  const server = app.listen(0);
  const port = server.address().port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/admin/api${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    return { status: res.status, json };
  } finally {
    server.close();
  }
}

(async () => {
  const unauthorized = await req("GET", "/status", null, "wrong");
  assert.strictEqual(unauthorized.status, 401);

  const login = await req("POST", "/login", { token: "test-token" });
  assert.strictEqual(login.status, 200);
  assert.strictEqual(login.json.ok, true);

  const status = await req("GET", "/status");
  assert.strictEqual(status.status, 200);
  assert.strictEqual(status.json.ok, true);
  assert.ok((status.json.counts.customersToday || 0) >= 1);

  const customers = await req("GET", "/customers?day=today");
  assert.strictEqual(customers.status, 200);
  assert.ok(customers.json.count >= 1);
  assert.ok(
    customers.json.customers.some((c) => c.phone === "551234567")
  );

  const paged = await req("GET", "/customers?day=today&limit=1&offset=0");
  assert.strictEqual(paged.status, 200);
  assert.ok(paged.json.count >= 1);
  assert.strictEqual(paged.json.customers.length, 1);
  assert.ok(!("events" in (paged.json.customers[0] || {})));

  const phonesOnly = await req("GET", "/customers?day=today&phonesOnly=1");
  assert.strictEqual(phonesOnly.status, 200);
  assert.ok((phonesOnly.json.phones || []).length >= 1);

  const pastDay = "2026-08-11";
  const datedRow = customerLedger._customers.get("+966:551234567");
  const prevLast = datedRow.lastSeenAt;
  const prevFirst = datedRow.firstSeenAt;
  const prevSynced = datedRow.syncedAt;
  datedRow.lastSeenAt = `${pastDay}T12:00:00.000Z`;
  datedRow.firstSeenAt = `${pastDay}T12:00:00.000Z`;
  datedRow.syncedAt = null;
  const byDate = await req("GET", `/customers?day=${pastDay}`);
  assert.strictEqual(byDate.status, 200);
  assert.strictEqual(byDate.json.day, pastDay);
  assert.ok(
    byDate.json.customers.some((c) => c.phone === "551234567"),
    "يمكن تحديد تاريخ للسجل"
  );
  datedRow.lastSeenAt = prevLast;
  datedRow.firstSeenAt = prevFirst;
  datedRow.syncedAt = prevSynced;

  const notes = await req("POST", "/customers/notes", {
    phone: "0551234567",
    notes: "عميل متابع",
  });
  assert.strictEqual(notes.status, 200);
  assert.strictEqual(notes.json.notes, "عميل متابع");
  const outcome = await req("POST", "/customers/outcome", {
    phone: "0551234567",
    outcome: "أخذ باقة",
  });
  assert.strictEqual(outcome.status, 200);
  assert.strictEqual(outcome.json.outcome, "أخذ باقة");
  const afterNotes = await req("GET", "/customers?day=today");
  assert.ok(
    afterNotes.json.customers.some(
      (c) =>
        c.phone === "551234567" &&
        c.notes === "عميل متابع" &&
        c.outcome === "أخذ باقة"
    )
  );

  const archive = await req("POST", "/customers/archive", {
    phone: "0551234567",
    archived: true,
  });
  assert.strictEqual(archive.status, 200);
  assert.strictEqual(archive.json.archived, true);
  const todayAfterArchive = await req("GET", "/customers?day=today");
  assert.ok(
    !todayAfterArchive.json.customers.some((c) => c.phone === "551234567")
  );
  const archiveList = await req("GET", "/customers?day=archive");
  assert.ok(archiveList.json.customers.some((c) => c.phone === "551234567"));
  assert.ok((archiveList.json.counts?.archive || 0) >= 1);
  const unarchive = await req("POST", "/customers/archive", {
    phone: "0551234567",
    archived: false,
  });
  assert.strictEqual(unarchive.json.archived, false);

  const manual = await req("POST", "/customers/manual", {
    phone: "0551234567",
    manual: true,
  });
  assert.strictEqual(manual.status, 200);
  assert.strictEqual(manual.json.manual, true);
  const todayAfterManual = await req("GET", "/customers?day=today");
  assert.ok(
    !todayAfterManual.json.customers.some((c) => c.phone === "551234567")
  );
  const manualList = await req("GET", "/customers?day=manual");
  assert.ok(manualList.json.customers.some((c) => c.phone === "551234567"));
  assert.ok((manualList.json.counts?.manual || 0) >= 1);
  const unmanual = await req("POST", "/customers/manual", {
    phone: "0551234567",
    manual: false,
  });
  assert.strictEqual(unmanual.json.manual, false);

  const rejected = await req("POST", "/customers/rejected", {
    phone: "0551234567",
    rejected: true,
  });
  assert.strictEqual(rejected.status, 200);
  assert.strictEqual(rejected.json.rejected, true);
  const todayAfterReject = await req("GET", "/customers?day=today");
  assert.ok(
    !todayAfterReject.json.customers.some((c) => c.phone === "551234567")
  );
  const rejectedList = await req("GET", "/customers?day=rejected");
  assert.ok(rejectedList.json.customers.some((c) => c.phone === "551234567"));
  assert.ok((rejectedList.json.counts?.rejected || 0) >= 1);
  const unreject = await req("POST", "/customers/rejected", {
    phone: "0551234567",
    rejected: false,
  });
  assert.strictEqual(unreject.json.rejected, false);

  const workplace = await req("POST", "/customers/workplace", {
    phone: "0551234567",
    workplace: "government",
  });
  assert.strictEqual(workplace.status, 200);
  assert.strictEqual(workplace.json.jobCategory, "civilian");
  assert.strictEqual(workplace.json.civilianSubtype, "government");
  const privateWp = await req("POST", "/customers/workplace", {
    phone: "0551234567",
    workplace: "private",
  });
  assert.strictEqual(privateWp.json.civilianSubtype, "private");
  const militaryWp = await req("POST", "/customers/workplace", {
    phone: "0551234567",
    workplace: "military",
  });
  assert.strictEqual(militaryWp.json.jobCategory, "military");

  const order = await req("POST", "/customers/order-number", {
    phone: "0551234567",
    orderNumber: "10171234",
  });
  assert.strictEqual(order.status, 200);
  assert.strictEqual(order.json.orderNumber, "10171234");
  assert.strictEqual(order.json.outcome, "رقم طلب");
  const orderTab = await req("GET", "/customers?day=order_number");
  assert.ok(
    orderTab.json.customers.some(
      (c) => c.phone === "551234567" && c.orderNumber === "10171234"
    )
  );
  const todayAfterOrder = await req("GET", "/customers?day=today");
  assert.ok(
    !todayAfterOrder.json.customers.some((c) => c.phone === "551234567"),
    "رقم الطلب يخرج العميل من سجل اليوم"
  );
  const clearOrder = await req("POST", "/customers/order-number", {
    phone: "0551234567",
    orderNumber: "",
  });
  assert.strictEqual(clearOrder.json.orderNumber, null);

  const exported = await req("GET", "/customers/export");
  assert.strictEqual(exported.status, 200);
  assert.ok((exported.json.customers || []).length >= 1);

  const backup = await req("POST", "/customers/backup", {});
  assert.strictEqual(backup.status, 200);
  assert.ok(backup.json.ok);

  const pause = await req("POST", "/pause", { phone: "0551234567" });
  assert.strictEqual(pause.json.paused, true);
  assert.ok(pausedChats.has("+966:551234567"));

  const send = await req("POST", "/send-text", {
    phone: "0551234567",
    message: "اختبار",
  });
  assert.strictEqual(send.json.sent, true);
  assert.strictEqual(sent[0].message, "اختبار");

  const followup = await req("POST", "/send-followup", { phone: "0551234567" });
  assert.strictEqual(followup.status, 200);
  assert.strictEqual(followup.json.sent, true);
  assert.strictEqual(followup.json.tab, "finance_link_sent");
  assert.ok(
    String(sent[sent.length - 1].message).includes("هل تم تقديم الطلب"),
    "رسالة سؤال التقديم"
  );
  assert.ok(
    String(sent[sent.length - 1].message).includes("ارسل رقم الطلب"),
    "طلب رقم الطلب"
  );
  const sentAfterAsk = await req("GET", "/customers?day=finance_link_sent");
  assert.ok(
    sentAfterAsk.json.customers.some((c) => c.phone === "551234567"),
    "سؤال عن الطلب ينقل العميل لتمت المتابعة"
  );
  const pendingAfterAsk = await req("GET", "/customers?day=finance_link_pending");
  assert.ok(
    !pendingAfterAsk.json.customers.some((c) => c.phone === "551234567"),
    "سؤال عن الطلب يخرجه من بدون متابعة"
  );

  const askPlus = await req("POST", "/send-followup", {
    phone: "0551234567",
    kind: "ask-plus",
  });
  assert.strictEqual(askPlus.status, 200);
  assert.strictEqual(askPlus.json.sent, true);
  assert.strictEqual(askPlus.json.tab, "finance_link_plus");
  assert.ok(
    String(sent[sent.length - 1].message).includes("نأسف لعدم تقديمكم للطلب"),
    "رسالة سؤال بلس"
  );
  assert.ok(
    String(sent[sent.length - 1].message).includes("انا بخدمتك"),
    "عرض الخدمة في سؤال بلس"
  );
  const plusAfterAsk = await req("GET", "/customers?day=finance_link_plus");
  assert.ok(
    plusAfterAsk.json.customers.some((c) => c.phone === "551234567"),
    "سؤال بلس ينقل العميل لمتابعة بلس"
  );
  const sentAfterAskPlus = await req("GET", "/customers?day=finance_link_sent");
  assert.ok(
    !sentAfterAskPlus.json.customers.some((c) => c.phone === "551234567"),
    "سؤال بلس يخرجه من تمت المتابعة"
  );
  customerLedger.setFollowupPlus("+966", "551234567", false);
  customerLedger.setOutcomeNotes("+966", "551234567", "أخذ باقة");

  // عميل أخذ رابط التمويل — للمتابعة الجماعية
  customerLedger.recordInbound("+966", "550000001", "تمويل");
  customerLedger.setOutcomeNotes("+966", "550000001", "أخذ رابط التمويل");
  customerLedger.recordInbound("+966", "550000002", "تمويل");
  customerLedger.setOutcomeNotes("+966", "550000002", "أخذ رابط التمويل");
  customerLedger.recordInbound("+966", "550000005", "تمويل");
  customerLedger.setOutcomeNotes("+966", "550000005", "أخذ رابط التمويل");
  customerLedger.recordInbound("+966", "550000006", "تمويل");
  customerLedger.setOutcomeNotes("+966", "550000006", "أخذ رابط التمويل");
  customerLedger.recordInbound("+966", "550000003", "باقة");
  customerLedger.setOutcomeNotes("+966", "550000003", "أخذ باقة");
  customerLedger.recordInbound("+966", "550000004", "تمويل");
  customerLedger.setOutcomeNotes("+966", "550000004", "أخذ رابط التمويل");
  customerLedger.recordOutbound(
    "+966",
    "550000004",
    "السلام عليكم / هل تم تقديم الطلب / في حال تم التقديم ارسل رقم الطلب"
  );

  const financeTab = await req("GET", "/customers?day=finance_link");
  assert.strictEqual(financeTab.status, 200);
  assert.ok(
    (financeTab.json.customers || []).some((c) => c.phone === "550000001")
  );
  assert.ok(
    !(financeTab.json.customers || []).some((c) => c.phone === "550000003")
  );
  assert.ok((financeTab.json.counts?.finance_link || 0) >= 3);

  const pendingTab = await req("GET", "/customers?day=finance_link_pending");
  assert.strictEqual(pendingTab.status, 200);
  assert.ok((pendingTab.json.customers || []).some((c) => c.phone === "550000001"));
  assert.ok((pendingTab.json.customers || []).some((c) => c.phone === "550000002"));
  assert.ok(
    !(pendingTab.json.customers || []).some((c) => c.phone === "550000004"),
    "من أُرسلت له متابعة لا يظهر في تبويب بدون متابعة"
  );
  assert.ok((pendingTab.json.counts?.finance_link_pending || 0) >= 2);

  const sentTab = await req("GET", "/customers?day=finance_link_sent");
  assert.strictEqual(sentTab.status, 200);
  assert.ok((sentTab.json.customers || []).some((c) => c.phone === "550000004"));
  assert.ok(
    !(sentTab.json.customers || []).some((c) => c.phone === "550000001"),
    "بدون متابعة لا يظهر في تبويب تمت المتابعة"
  );
  assert.ok((sentTab.json.counts?.finance_link_sent || 0) >= 1);

  const plusFlag = await req("POST", "/customers/followup-plus", {
    phone: "0550000004",
    plus: true,
  });
  assert.strictEqual(plusFlag.status, 200);
  assert.strictEqual(plusFlag.json.followupPlus, true);
  assert.strictEqual(plusFlag.json.outcome, "أخذ رابط التمويل");
  const plusTab = await req("GET", "/customers?day=finance_link_plus");
  assert.ok(plusTab.json.customers.some((c) => c.phone === "550000004"));
  assert.ok((plusTab.json.counts?.finance_link_plus || 0) >= 1);
  const sentAfterPlus = await req("GET", "/customers?day=finance_link_sent");
  assert.ok(
    !sentAfterPlus.json.customers.some((c) => c.phone === "550000004"),
    "متابعة بلس لا تظهر في تبويب تمت المتابعة"
  );
  const pendingAfterPlus = await req("GET", "/customers?day=finance_link_pending");
  assert.ok(
    !pendingAfterPlus.json.customers.some((c) => c.phone === "550000004"),
    "متابعة بلس لا تظهر في تبويب بدون متابعة"
  );
  const unplus = await req("POST", "/customers/followup-plus", {
    phone: "0550000004",
    plus: false,
  });
  assert.strictEqual(unplus.json.followupPlus, false);
  const sentAfterUnplus = await req("GET", "/customers?day=finance_link_sent");
  assert.ok(sentAfterUnplus.json.customers.some((c) => c.phone === "550000004"));

  const statusQuota = await req("GET", "/status");
  assert.strictEqual(statusQuota.status, 200);
  assert.ok(
    (statusQuota.json.outboundSafe?.dailyLimit || 0) >= 250,
    "الحصة اليومية تغطي قائمة أخذ الرابط (200+)"
  );
  assert.ok(
    (statusQuota.json.outboundSafe?.financeLinkTotal || 0) >= 2,
    "عدد من أخذوا الرابط"
  );
  assert.ok(
    (statusQuota.json.outboundSafe?.financeLinkPending || 0) >= 2,
    "بانتظار متابعة"
  );
  assert.ok(
    (statusQuota.json.outboundSafe?.financeLinkEligible || 0) >= 2,
    "قابل للإرسال الآن"
  );

  const CONFIG = require("../config");
  assert.ok((CONFIG.outbound?.dailyLimit || 0) >= 250);
  const prevOutbound = { ...CONFIG.outbound };
  CONFIG.outbound = {
    ...CONFIG.outbound,
    dailyLimit: 300,
  };
  const highCap = await req("GET", "/status");
  assert.strictEqual(
    highCap.json.outboundSafe.dailyLimit,
    300,
    "لا يُقص السقف اليومي عند 200"
  );

  CONFIG.outbound = {
    ...CONFIG.outbound,
    minDelayMs: 0,
    delayMs: 0,
    maxBatchSize: 2,
    dailyLimit: 3,
    skipIfFollowedUpWithinHours: 0,
  };

  const beforeBulk = sent.length;
  const pendingBeforeBulk = await req("GET", "/customers?day=finance_link_pending");
  const pendingBeforeCount = pendingBeforeBulk.json.counts?.finance_link_pending || 0;
  const bulk = await req("POST", "/bulk-followup", {
    fromOutcome: "finance_link",
    delayMs: 0,
    limit: 10,
  });
  assert.strictEqual(bulk.status, 200, bulk.json?.error || "bulk ok");
  assert.strictEqual(bulk.json.sent, 2, "حد الدفعة 2");
  assert.strictEqual(bulk.json.deferred, 2, "الباقي من بدون متابعة يُؤجّل بعد حد الدفعة");
  assert.ok(sent.length >= beforeBulk + 2);
  assert.ok(bulk.json.dailySent >= 2);
  assert.ok((bulk.json.financeLinkTotal || 0) >= 2);
  assert.ok(
    !(bulk.json.results || []).some((r) => r.phone === "550000004"),
    "لا يُعاد الإرسال لمن تمت متابعتهم مسبقاً"
  );
  const pendingAfterBulk = await req("GET", "/customers?day=finance_link_pending");
  assert.strictEqual(
    pendingAfterBulk.json.counts?.finance_link_pending,
    pendingBeforeCount - 2,
    "الدفعة تنقل من بدون متابعة إلى تمت المتابعة"
  );
  const movedPhone = (bulk.json.results || []).find((r) => r.ok)?.phone;
  assert.ok(movedPhone, "رقم نُقل بعد الإرسال");
  const sentAfterBulk = await req("GET", "/customers?day=finance_link_sent");
  assert.ok(
    (sentAfterBulk.json.customers || []).some((c) => c.phone === movedPhone),
    "بعد الإرسال الجماعي يظهر في تمت المتابعة"
  );
  customerLedger.recordOutbound("+966", movedPhone, "القائمة الرئيسية", {
    mode: "admin-menu",
  });
  const sentAfterBot = await req("GET", "/customers?day=finance_link_sent");
  assert.ok(
    (sentAfterBot.json.customers || []).some((c) => c.phone === movedPhone),
    "رد البوت لا يُرجع العميل لتبويب بدون متابعة"
  );
  const pendingAfterBot = await req("GET", "/customers?day=finance_link_pending");
  assert.ok(
    !(pendingAfterBot.json.customers || []).some((c) => c.phone === movedPhone),
    "رد البوت لا يُظهر العميل في بدون متابعة"
  );

  const bulk2 = await req("POST", "/bulk-followup", {
    fromOutcome: "finance_link",
    delayMs: 0,
    limit: 10,
  });
  assert.strictEqual(bulk2.status, 200);
  assert.ok(bulk2.json.sent <= 1, "باقي الحصة اليومية");

  const bulk3 = await req("POST", "/bulk-followup", {
    fromOutcome: "finance_link",
    delayMs: 0,
    limit: 10,
  });
  assert.strictEqual(bulk3.status, 429, "حد يومي");
  CONFIG.outbound = {
    ...prevOutbound,
    minDelayMs: 0,
    delayMs: 0,
    maxBatchSize: 10,
    dailyLimit: 250,
    skipIfFollowedUpWithinHours: 0,
  };
  const plusBulk = await req("POST", "/bulk-followup", {
    fromOutcome: "finance_link_plus",
    delayMs: 0,
    limit: 10,
  });
  assert.strictEqual(plusBulk.status, 200, plusBulk.json?.error || "plus bulk ok");
  assert.ok((plusBulk.json.sent || 0) >= 1, "متابعة بلس ترسل لمن تمت متابعتهم");
  assert.ok(
    String(sent[sent.length - 1].message).includes("نذكرك بتقديم الطلب"),
    "نص متابعة بلس الافتراضي"
  );
  const plusAfterBulk = await req("GET", "/customers?day=finance_link_plus");
  assert.ok((plusAfterBulk.json.counts?.finance_link_plus || 0) >= 1);
  CONFIG.outbound = prevOutbound;

  CONFIG.outbound = {
    ...prevOutbound,
    minDelayMs: 0,
    delayMs: 0,
    maxBatchSize: 10,
    dailyLimit: 250,
    skipIfFollowedUpWithinHours: 0,
  };
  const blast = await req("POST", "/bulk-followup", {
    phones: ["+966 55 952 6221", "0115033469", "0504297151"],
    message: "تجربة جماعية",
    delayMs: 0,
    limit: 10,
  });
  assert.strictEqual(blast.status, 200, blast.json?.error || "blast ok");
  assert.strictEqual(blast.json.sent, 2, "جوالان فقط");
  assert.ok(blast.json.skipped >= 1, "تخطي الثابت");
  CONFIG.outbound = prevOutbound;

  const menu = await req("POST", "/send-menu", { phone: "0551234567" });
  assert.strictEqual(menu.json.sent, true);
  assert.ok(drafts.has("+966:551234567"));

  console.log("test-admin: OK");
})().catch((err) => {
  console.error("FAIL:", err);
  process.exitCode = 1;
});
