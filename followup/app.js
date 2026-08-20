(() => {
  "use strict";

  const STORAGE_KEY = "sfc_followup_panel_v1";

  const STATUSES = [
    { id: "UNDERWRITING", label: "تحت الدراسة" },
    { id: "UND-FORWARDED", label: "محوّل للاكتتاب" },
    { id: "APPROVED", label: "موافق عليه" },
    { id: "REJECTED", label: "مرفوض" },
    { id: "DISBURSED", label: "مصروف" },
    { id: "CANCELLED", label: "ملغي" },
    { id: "PENDING", label: "قيد الانتظار" },
  ];

  const BRANCHES = [
    { id: "ONLINE", label: "ONLINE" },
    { id: "HAIL", label: "حائل" },
    { id: "TABUK", label: "تبوك" },
    { id: "MEDINA", label: "المدينة" },
    { id: "MUHAYIL_ASIR", label: "محايل عسير" },
    { id: "RIYADH", label: "الرياض" },
    { id: "JEDDAH", label: "جدة" },
    { id: "DAMMAM", label: "الدمام" },
  ];

  const EMPLOYEES = ["عبدالرحمن", "فايز علي", "ماجد", "رائد الحربي"];

  const SECTORS = [
    "Gov. Civil Education",
    "Gov. Civil Others",
    "Gov. Military Officer",
    "Gov. Military Non Officer",
    "Retired",
    "Private Approved",
    "Private Non Approved",
    "House Wife",
  ];

  const NOTE_PRESETS = ["", "PF", "PF BUYOUT", "PF-HOUSEWIFE", "TOP UP"];

  const CONTRACT_STATUSES = ["", "Pending", "Signed", "Issued", "لم يتم الفوترة"];

  const BOARDS = [
    { id: "followup", label: "المتابعة" },
    { id: "approval", label: "الموافقة" },
    { id: "portal", label: "بورتال" },
    { id: "platform", label: "منصة" },
    { id: "uninvoiced", label: "لم يتم الفوترة" },
  ];

  const state = {
    board: "followup",
    dateMode: "today",
    date: todayKey(),
    dateFrom: "",
    dateTo: "",
    search: "",
    status: "",
    branch: "",
    employee: "",
    sector: "",
  };

  function todayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function shiftDay(key, delta) {
    const [y, m, d] = String(key).split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + delta);
    return todayKey(dt);
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { records: [] };
      const parsed = JSON.parse(raw);
      return { records: Array.isArray(parsed.records) ? parsed.records : [] };
    } catch {
      return { records: [] };
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function toast(msg, type) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.className = "toast show " + (type || "success");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      el.className = "toast";
    }, 2800);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatMoney(n) {
    const v = Number(n || 0);
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  }

  function formatDate(key) {
    if (!key) return "—";
    const [y, m, d] = String(key).split("-");
    return `${d}-${m}-${String(y).slice(-2)}`;
  }

  function statusLabel(id) {
    return (STATUSES.find((s) => s.id === id) || {}).label || id || "—";
  }

  function branchLabel(id) {
    return (BRANCHES.find((b) => b.id === id) || {}).label || id || "—";
  }

  function boardLabel(id) {
    return (BOARDS.find((b) => b.id === id) || {}).label || id;
  }

  function parseDateValue(raw) {
    const s = String(raw || "").trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      let year = m[3];
      if (year.length === 2) year = Number(year) > 50 ? `19${year}` : `20${year}`;
      return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? "" : todayKey(d);
  }

  function parseNumber(raw) {
    const n = Number(String(raw || "").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeStatus(raw) {
    const s = String(raw || "").trim().toUpperCase();
    if (!s) return "UNDERWRITING";
    const hit = STATUSES.find((x) => x.id === s || x.label === String(raw).trim());
    if (hit) return hit.id;
    if (s.includes("FORWARD")) return "UND-FORWARDED";
    if (s.includes("APPROV") || s.includes("موافق")) return "APPROVED";
    if (s.includes("REJECT") || s.includes("رفض")) return "REJECTED";
    if (s.includes("UNDER")) return "UNDERWRITING";
    return s;
  }

  function normalizeBranch(raw) {
    const s = String(raw || "").trim().toUpperCase().replace(/\s+/g, "_");
    if (BRANCHES.some((b) => b.id === s)) return s;
    const map = {
      ONLINE: "ONLINE",
      HAIL: "HAIL",
      حائل: "HAIL",
      TABUK: "TABUK",
      تبوك: "TABUK",
      MEDINA: "MEDINA",
      المدينة: "MEDINA",
      "MUHAYIL ASIR": "MUHAYIL_ASIR",
      MUHAYIL_ASIR: "MUHAYIL_ASIR",
      "محايل عسير": "MUHAYIL_ASIR",
      RIYADH: "RIYADH",
      الرياض: "RIYADH",
      JEDDAH: "JEDDAH",
      جدة: "JEDDAH",
      DAMMAM: "DAMMAM",
      الدمام: "DAMMAM",
    };
    return map[String(raw || "").trim()] || map[s] || "ONLINE";
  }

  function emptyRecord() {
    return {
      id: "",
      date: todayKey(),
      orderNumber: "",
      status: "UNDERWRITING",
      customerName: "",
      amount: "",
      branch: "ONLINE",
      employee: EMPLOYEES[0],
      notes: "",
      sector: SECTORS[0],
      nationalId: "",
      income: "",
      contractStatus: "",
      board: state.board === "productivity" ? "followup" : state.board === "uninvoiced" ? "followup" : state.board,
      invoiced: false,
    };
  }

  function validate(rec) {
    const order = String(rec.orderNumber || "").replace(/\D/g, "");
    if (!order) return "رقم الطلب مطلوب";
    if (!/^\d{8}$/.test(order)) return "رقم الطلب يجب أن يكون 8 أرقام";
    if (!String(rec.customerName || "").trim()) return "اسم العميل مطلوب";
    if (!rec.date) return "التاريخ مطلوب";
    if (!(Number(rec.amount) >= 0)) return "المبلغ غير صحيح";
    return "";
  }

  function upsertRecord(payload) {
    const data = load();
    const rec = {
      ...emptyRecord(),
      ...payload,
      orderNumber: String(payload.orderNumber || "").replace(/\D/g, ""),
      customerName: String(payload.customerName || "").trim(),
      nationalId: String(payload.nationalId || "").replace(/\D/g, ""),
      amount: parseNumber(payload.amount),
      income: parseNumber(payload.income),
      invoiced: Boolean(payload.invoiced),
      updatedAt: new Date().toISOString(),
    };
    const err = validate(rec);
    if (err) return { error: err };

    const dup = data.records.find((r) => r.orderNumber === rec.orderNumber && r.id !== rec.id);
    if (dup) return { error: "رقم الطلب مسجّل مسبقاً" };

    if (rec.id) {
      const idx = data.records.findIndex((r) => r.id === rec.id);
      if (idx === -1) return { error: "الطلب غير موجود" };
      data.records[idx] = { ...data.records[idx], ...rec };
    } else {
      rec.id = uid();
      rec.createdAt = new Date().toISOString();
      data.records.unshift(rec);
    }
    save(data);
    return { ok: true, record: rec };
  }

  function deleteRecord(id) {
    const data = load();
    const next = data.records.filter((r) => r.id !== id);
    if (next.length === data.records.length) return { error: "الطلب غير موجود" };
    save({ records: next });
    return { ok: true };
  }

  function matchesBoard(rec, board) {
    if (board === "productivity") return true;
    if (board === "approval") return rec.status === "APPROVED" || rec.board === "approval";
    if (board === "uninvoiced") return rec.invoiced === false || rec.contractStatus === "لم يتم الفوترة" || rec.board === "uninvoiced";
    if (board === "portal") return rec.board === "portal";
    if (board === "platform") return rec.board === "platform";
    return rec.board !== "portal" && rec.board !== "platform";
  }

  function matchesDate(rec) {
    if (state.dateMode === "all") return true;
    if (state.dateMode === "range") {
      if (state.dateFrom && rec.date < state.dateFrom) return false;
      if (state.dateTo && rec.date > state.dateTo) return false;
      return true;
    }
    return rec.date === state.date;
  }

  function filteredRecords() {
    const q = state.search.trim().toLowerCase();
    return load().records.filter((rec) => {
      if (!matchesBoard(rec, state.board)) return false;
      if (!matchesDate(rec)) return false;
      if (state.status && rec.status !== state.status) return false;
      if (state.branch && rec.branch !== state.branch) return false;
      if (state.employee && rec.employee !== state.employee) return false;
      if (state.sector && rec.sector !== state.sector) return false;
      if (q) {
        const blob = [rec.orderNumber, rec.customerName, rec.nationalId, rec.employee, rec.notes, rec.branch, rec.status]
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }

  function fillSelect(el, items, { allLabel, valueKey, labelKey } = {}) {
    if (!el) return;
    const opts = [];
    if (allLabel) opts.push(`<option value="">${allLabel}</option>`);
    items.forEach((item) => {
      if (typeof item === "string") {
        opts.push(`<option value="${escapeHtml(item)}">${escapeHtml(item || "—")}</option>`);
      } else {
        const v = item[valueKey || "id"];
        const l = item[labelKey || "label"];
        opts.push(`<option value="${escapeHtml(v)}">${escapeHtml(l)}</option>`);
      }
    });
    el.innerHTML = opts.join("");
  }

  function renderStats(rows) {
    const all = load().records;
    const today = all.filter((r) => r.date === todayKey());
    const amount = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const under = rows.filter((r) => r.status === "UNDERWRITING" || r.status === "UND-FORWARDED").length;
    document.getElementById("statsRow").innerHTML = `
      <div class="stat"><span class="label">المعروض الآن</span><span class="value">${rows.length}</span></div>
      <div class="stat"><span class="label">طلبات اليوم</span><span class="value">${today.length}</span></div>
      <div class="stat"><span class="label">تحت الدراسة / محوّل</span><span class="value">${under}</span></div>
      <div class="stat"><span class="label">إجمالي المبالغ</span><span class="value">${formatMoney(amount)}</span></div>
    `;
  }

  function renderTable(rows) {
    const body = document.getElementById("rowsBody");
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="13" class="empty">لا توجد طلبات في هذا العرض. غيّر التاريخ أو اضغط إضافة طلب.</td></tr>`;
      return;
    }
    body.innerHTML = rows
      .map((r) => {
        const branchClass = `branch-${String(r.branch || "").replace(/\s+/g, "_")}`;
        return `<tr>
          <td data-label="التاريخ">${formatDate(r.date)}</td>
          <td data-label="رقم الطلب"><span class="num">${escapeHtml(r.orderNumber)}</span></td>
          <td data-label="الحالة"><span class="badge status-${escapeHtml(r.status)}">${escapeHtml(statusLabel(r.status))}</span></td>
          <td data-label="العميل">${escapeHtml(r.customerName)}</td>
          <td data-label="المبلغ" class="money">${formatMoney(r.amount)}</td>
          <td data-label="الفرع"><span class="branch ${branchClass}">${escapeHtml(branchLabel(r.branch))}</span></td>
          <td data-label="الموظف">${escapeHtml(r.employee)}</td>
          <td data-label="الملاحظات">${escapeHtml(r.notes || "—")}</td>
          <td data-label="القطاع">${escapeHtml(r.sector || "—")}</td>
          <td data-label="الهوية"><span class="num">${escapeHtml(r.nationalId || "—")}</span></td>
          <td data-label="الدخل" class="money">${r.income ? formatMoney(r.income) : "—"}</td>
          <td data-label="العقد">${escapeHtml(r.contractStatus || (r.invoiced ? "مفوتر" : "—"))}</td>
          <td class="actions" data-label="إجراءات">
            <button type="button" class="btn secondary small" data-edit="${r.id}">تعديل</button>
            <button type="button" class="btn danger small" data-delete="${r.id}">حذف</button>
          </td>
        </tr>`;
      })
      .join("");
  }

  function renderProductivity(rows) {
    const group = (key) => {
      const map = {};
      rows.forEach((r) => {
        const k = r[key] || "—";
        if (!map[k]) map[k] = { name: k, count: 0, amount: 0 };
        map[k].count += 1;
        map[k].amount += Number(r.amount || 0);
      });
      return Object.values(map).sort((a, b) => b.amount - a.amount);
    };
    const emp = group("employee");
    const br = group("branch");
    const rowHtml = (list, labelFn) =>
      list
        .map((x) => `<tr><td>${escapeHtml(labelFn(x.name))}</td><td>${x.count}</td><td class="money">${formatMoney(x.amount)}</td></tr>`)
        .join("") || `<tr><td colspan="3" class="empty">لا توجد بيانات</td></tr>`;
    document.getElementById("prodEmployeeBody").innerHTML = rowHtml(emp, (n) => n);
    document.getElementById("prodBranchBody").innerHTML = rowHtml(br, branchLabel);
    document.getElementById("prodMeta").textContent =
      state.dateMode === "all"
        ? "كل التواريخ"
        : state.dateMode === "range"
          ? `من ${state.dateFrom || "—"} إلى ${state.dateTo || "—"}`
          : `تاريخ ${formatDate(state.date)}`;
  }

  function render() {
    const prod = state.board === "productivity";
    document.getElementById("listSection").hidden = prod;
    document.getElementById("productivitySection").hidden = !prod;
    document.querySelectorAll("#boardTabs .tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.board === state.board);
    });

    const rows = filteredRecords();
    renderStats(rows);
    if (prod) renderProductivity(rows);
    else renderTable(rows);

    const dateLabel =
      state.dateMode === "all"
        ? "كل التواريخ"
        : state.dateMode === "range"
          ? `من ${state.dateFrom || "—"} إلى ${state.dateTo || "—"}`
          : formatDate(state.date);
    document.getElementById("listMeta").textContent =
      `${rows.length} طلب · ${boardLabel(state.board === "productivity" ? "followup" : state.board)} · ${dateLabel}`;

    const dateInput = document.getElementById("dateInput");
    if (document.activeElement !== dateInput) dateInput.value = state.date;
    dateInput.classList.toggle("picking", state.dateMode === "day");
  }

  function openModal(record) {
    const rec = record || emptyRecord();
    document.getElementById("recordId").value = rec.id || "";
    document.getElementById("modalTitle").textContent = rec.id ? "تعديل الطلب" : "إضافة طلب";
    document.getElementById("fDate").value = rec.date || todayKey();
    document.getElementById("fOrder").value = rec.orderNumber || "";
    document.getElementById("fName").value = rec.customerName || "";
    document.getElementById("fId").value = rec.nationalId || "";
    document.getElementById("fAmount").value = rec.amount === "" ? "" : rec.amount;
    document.getElementById("fIncome").value = rec.income === "" ? "" : rec.income;
    document.getElementById("fStatus").value = rec.status || "UNDERWRITING";
    document.getElementById("fBranch").value = rec.branch || "ONLINE";
    document.getElementById("fEmployee").value = rec.employee || EMPLOYEES[0];
    document.getElementById("fSector").value = rec.sector || SECTORS[0];
    document.getElementById("fNotesPreset").value = NOTE_PRESETS.includes(rec.notes) ? rec.notes : "";
    document.getElementById("fNotes").value = NOTE_PRESETS.includes(rec.notes) ? "" : rec.notes || "";
    document.getElementById("fContractStatus").value = rec.contractStatus || "";
    document.getElementById("fBoard").value = rec.board && rec.board !== "uninvoiced" ? rec.board : "followup";
    document.getElementById("fInvoiced").checked = Boolean(rec.invoiced);
    document.getElementById("modalDelete").hidden = !rec.id;
    document.getElementById("modal").hidden = false;
  }

  function closeModal() {
    document.getElementById("modal").hidden = true;
  }

  function readForm() {
    const preset = document.getElementById("fNotesPreset").value;
    const free = document.getElementById("fNotes").value.trim();
    return {
      id: document.getElementById("recordId").value,
      date: document.getElementById("fDate").value,
      orderNumber: document.getElementById("fOrder").value,
      customerName: document.getElementById("fName").value,
      nationalId: document.getElementById("fId").value,
      amount: document.getElementById("fAmount").value,
      income: document.getElementById("fIncome").value,
      status: document.getElementById("fStatus").value,
      branch: document.getElementById("fBranch").value,
      employee: document.getElementById("fEmployee").value,
      sector: document.getElementById("fSector").value,
      notes: free || preset,
      contractStatus: document.getElementById("fContractStatus").value,
      board: document.getElementById("fBoard").value,
      invoiced: document.getElementById("fInvoiced").checked,
    };
  }

  function parseCsv(text) {
    const src = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const firstLine = src.split("\n")[0] || "";
    const delimiter = firstLine.includes("\t") && !firstLine.includes(",") ? "\t" : ",";
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (inQuotes) {
        if (ch === '"' && src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cell += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(cell);
        cell = "";
      } else if (ch === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += ch;
      }
    }
    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }
    return rows.filter((r) => r.some((c) => String(c).trim()));
  }

  function headerKey(name) {
    const n = String(name || "").trim().toLowerCase();
    const map = {
      date: "date",
      التاريخ: "date",
      "رقم الطلب": "orderNumber",
      order: "orderNumber",
      "order number": "orderNumber",
      الحالة: "status",
      status: "status",
      "اسم العميل": "customerName",
      customer: "customerName",
      "customer name": "customerName",
      المبلغ: "amount",
      amount: "amount",
      الفرع: "branch",
      branch: "branch",
      "اسم الموظف": "employee",
      employee: "employee",
      الملاحظات: "notes",
      notes: "notes",
      القطاع: "sector",
      sector: "sector",
      الهوية: "nationalId",
      id: "nationalId",
      "national id": "nationalId",
      الدخل: "income",
      "dakhli income": "income",
      income: "income",
      "حالات العقود": "contractStatus",
      contract: "contractStatus",
      "contract status": "contractStatus",
    };
    return map[n] || "";
  }

  function importPayload(text, filename) {
    const name = String(filename || "").toLowerCase();
    if (name.endsWith(".json") || String(text).trim().startsWith("{") || String(text).trim().startsWith("[")) {
      const parsed = JSON.parse(text);
      const records = Array.isArray(parsed) ? parsed : parsed.records;
      if (!Array.isArray(records)) throw new Error("ملف JSON غير صالح");
      const data = load();
      let added = 0;
      records.forEach((raw) => {
        const rec = {
          date: parseDateValue(raw.date),
          orderNumber: raw.orderNumber,
          status: normalizeStatus(raw.status),
          customerName: raw.customerName,
          amount: raw.amount,
          branch: normalizeBranch(raw.branch),
          employee: raw.employee || EMPLOYEES[0],
          notes: raw.notes || "",
          sector: raw.sector || "",
          nationalId: raw.nationalId || raw.id || "",
          income: raw.income,
          contractStatus: raw.contractStatus || "",
          board: raw.board || "followup",
          invoiced: Boolean(raw.invoiced),
        };
        const result = upsertRecord(rec);
        if (result.ok) added += 1;
      });
      return added;
    }

    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error("ملف CSV فارغ");
    const headers = rows[0].map(headerKey);
    if (!headers.includes("orderNumber") && !headers.includes("customerName")) {
      throw new Error("تعذر قراءة عناوين الأعمدة. صدّر الملف CSV من إكسل مع صف العناوين.");
    }
    let added = 0;
    rows.slice(1).forEach((cols) => {
      const raw = {};
      headers.forEach((key, i) => {
        if (key) raw[key] = cols[i];
      });
      const result = upsertRecord({
        date: parseDateValue(raw.date) || todayKey(),
        orderNumber: raw.orderNumber,
        status: normalizeStatus(raw.status),
        customerName: raw.customerName,
        amount: raw.amount,
        branch: normalizeBranch(raw.branch),
        employee: raw.employee || EMPLOYEES[0],
        notes: raw.notes || "",
        sector: raw.sector || "",
        nationalId: raw.nationalId || "",
        income: raw.income,
        contractStatus: raw.contractStatus || "",
        board: "followup",
        invoiced: false,
      });
      if (result.ok) added += 1;
    });
    return added;
  }

  function exportData() {
    const data = load();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `followup-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);

    const header = [
      "التاريخ",
      "رقم الطلب",
      "الحالة",
      "اسم العميل",
      "المبلغ",
      "الفرع",
      "اسم الموظف",
      "الملاحظات",
      "القطاع",
      "الهوية",
      "الدخل",
      "حالات العقود",
    ];
    const lines = [header.join(",")];
    data.records.forEach((r) => {
      const cells = [
        r.date,
        r.orderNumber,
        r.status,
        r.customerName,
        r.amount,
        branchLabel(r.branch),
        r.employee,
        r.notes,
        r.sector,
        r.nationalId,
        r.income,
        r.contractStatus,
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    });
    const csv = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const b = document.createElement("a");
    b.href = URL.createObjectURL(csv);
    b.download = `followup-${todayKey()}.csv`;
    b.click();
    URL.revokeObjectURL(b.href);
  }

  function initFormOptions() {
    fillSelect(document.getElementById("statusFilter"), STATUSES, { allLabel: "كل الحالات" });
    fillSelect(document.getElementById("branchFilter"), BRANCHES, { allLabel: "كل الفروع" });
    fillSelect(document.getElementById("employeeFilter"), EMPLOYEES, { allLabel: "كل الموظفين" });
    fillSelect(document.getElementById("sectorFilter"), SECTORS, { allLabel: "كل القطاعات" });
    fillSelect(document.getElementById("fStatus"), STATUSES);
    fillSelect(document.getElementById("fBranch"), BRANCHES);
    fillSelect(document.getElementById("fEmployee"), EMPLOYEES);
    fillSelect(document.getElementById("fSector"), SECTORS);
    fillSelect(document.getElementById("fNotesPreset"), NOTE_PRESETS.map((n) => ({ id: n, label: n || "بدون ملاحظة جاهزة" })));
    fillSelect(document.getElementById("fContractStatus"), CONTRACT_STATUSES.map((n) => ({ id: n, label: n || "—" })));
    fillSelect(document.getElementById("fBoard"), BOARDS.filter((b) => b.id !== "uninvoiced"));
  }

  function bind() {
    document.getElementById("addBtn").addEventListener("click", () => openModal());
    document.getElementById("modalClose").addEventListener("click", closeModal);
    document.getElementById("modalCancel").addEventListener("click", closeModal);
    document.getElementById("modal").addEventListener("click", (e) => {
      if (e.target.id === "modal") closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !document.getElementById("modal").hidden) closeModal();
    });

    document.getElementById("recordForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const payload = readForm();
      const wasEdit = Boolean(payload.id);
      const result = upsertRecord(payload);
      if (result.error) {
        toast(result.error, "error");
        return;
      }
      closeModal();
      state.dateMode = "day";
      state.date = result.record.date;
      toast(wasEdit ? "تم تعديل الطلب" : "تمت إضافة الطلب", "success");
      render();
    });

    document.getElementById("modalDelete").addEventListener("click", () => {
      const id = document.getElementById("recordId").value;
      const rec = load().records.find((r) => r.id === id);
      if (!rec) return;
      if (!confirm(`حذف طلب ${rec.orderNumber} لـ ${rec.customerName}؟`)) return;
      const result = deleteRecord(id);
      if (result.error) {
        toast(result.error, "error");
        return;
      }
      closeModal();
      toast("تم الحذف", "success");
      render();
    });

    document.getElementById("rowsBody").addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit]");
      const del = e.target.closest("[data-delete]");
      if (edit) {
        const rec = load().records.find((r) => r.id === edit.dataset.edit);
        if (rec) openModal(rec);
        return;
      }
      if (del) {
        const rec = load().records.find((r) => r.id === del.dataset.delete);
        if (!rec) return;
        if (!confirm(`حذف طلب ${rec.orderNumber} لـ ${rec.customerName}؟`)) return;
        const result = deleteRecord(rec.id);
        if (result.error) toast(result.error, "error");
        else toast("تم الحذف", "success");
        render();
      }
    });

    document.getElementById("boardTabs").addEventListener("click", (e) => {
      const tab = e.target.closest(".tab");
      if (!tab) return;
      state.board = tab.dataset.board;
      render();
    });

    document.getElementById("dateInput").addEventListener("change", () => {
      state.dateMode = "day";
      state.date = document.getElementById("dateInput").value || todayKey();
      render();
    });
    document.getElementById("datePrev").addEventListener("click", () => {
      state.dateMode = "day";
      state.date = shiftDay(state.date || todayKey(), -1);
      render();
    });
    document.getElementById("dateNext").addEventListener("click", () => {
      state.dateMode = "day";
      state.date = shiftDay(state.date || todayKey(), 1);
      render();
    });
    document.getElementById("dateToday").addEventListener("click", () => {
      state.dateMode = "day";
      state.date = todayKey();
      render();
    });
    document.getElementById("dateAll").addEventListener("click", () => {
      state.dateMode = "all";
      render();
    });
    document.getElementById("dateFrom").addEventListener("change", () => {
      state.dateFrom = document.getElementById("dateFrom").value;
      state.dateMode = "range";
      render();
    });
    document.getElementById("dateTo").addEventListener("change", () => {
      state.dateTo = document.getElementById("dateTo").value;
      state.dateMode = "range";
      render();
    });

    document.getElementById("searchInput").addEventListener("input", () => {
      state.search = document.getElementById("searchInput").value;
      render();
    });
    document.getElementById("statusFilter").addEventListener("change", () => {
      state.status = document.getElementById("statusFilter").value;
      render();
    });
    document.getElementById("branchFilter").addEventListener("change", () => {
      state.branch = document.getElementById("branchFilter").value;
      render();
    });
    document.getElementById("employeeFilter").addEventListener("change", () => {
      state.employee = document.getElementById("employeeFilter").value;
      render();
    });
    document.getElementById("sectorFilter").addEventListener("change", () => {
      state.sector = document.getElementById("sectorFilter").value;
      render();
    });

    document.getElementById("exportBtn").addEventListener("click", () => {
      exportData();
      toast("تم تنزيل JSON و CSV", "success");
    });
    document.getElementById("importFile").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const added = importPayload(String(reader.result || ""), file.name);
          toast(`تم استيراد ${added} طلب`, "success");
          state.dateMode = "all";
          render();
        } catch (err) {
          toast(err.message || "تعذر الاستيراد", "error");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    });
  }

  function registerSw() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  initFormOptions();
  bind();
  render();
  registerSw();
})();
