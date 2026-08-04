(() => {
  const loginView = document.getElementById("login-view");
  const appView = document.getElementById("app-view");
  const tokenInput = document.getElementById("token-input");
  const loginBtn = document.getElementById("login-btn");
  const loginError = document.getElementById("login-error");
  const logoutBtn = document.getElementById("logout-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const panelTitle = document.getElementById("panel-title");
  const panelSub = document.getElementById("panel-sub");

  const titles = {
    overview: ["نظرة عامة", "حالة السيرفر والجلسات النشطة"],
    conversations: ["المحادثات", "الجلسات والمسودات الحالية على الكوبري"],
    compose: ["إرسال رسالة", "أرسل نصًا أو القائمة الرئيسية لعميل"],
    followup: ["متابعة التقديم", "أرسل رسالة المتابعة لرقم أو أكثر"],
  };

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let res;
    try {
      res = await fetch(`/admin/api${path}`, {
        ...options,
        headers,
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (err) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        throw new Error("السيرفر لا يرد — تأكد أن start-calc.bat شغّال");
      }
      throw new Error("تعذر الاتصال بالسيرفر — شغّل start-calc.bat");
    }
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function showLogin(msg) {
    appView.hidden = true;
    loginView.hidden = false;
    if (msg) {
      loginError.hidden = false;
      loginError.textContent = msg;
    } else {
      loginError.hidden = true;
    }
  }

  function showApp() {
    loginView.hidden = true;
    appView.hidden = false;
  }

  function setBootMessage(msg) {
    const sub = document.querySelector(".login-sub");
    if (sub) sub.textContent = msg;
  }

  function formatMoney(n) {
    if (n == null || n === "") return "—";
    return Number(n).toLocaleString("en-US");
  }

  function formatTime(ts) {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleString("ar-SA");
    } catch {
      return String(ts);
    }
  }

  function actionLabel(action) {
    const map = {
      pause: "إيقاف رد",
      resume: "استئناف",
      reset: "تصفير جلسة",
      "send-text": "رسالة",
      "send-followup": "متابعة",
      "send-menu": "قائمة",
      "bulk-followup": "متابعة جماعية",
    };
    return map[action] || action;
  }

  async function refreshOverview() {
    const status = await api("/status");
    document.getElementById("stat-conversations").textContent =
      status.counts.conversations;
    document.getElementById("stat-sessions").textContent = status.counts.sessions;
    document.getElementById("stat-drafts").textContent = status.counts.drafts;
    document.getElementById("stat-paused").textContent = status.counts.paused;
    document.getElementById("interakt-status").textContent = status.interaktConfigured
      ? "Interakt متصل ✓"
      : "مفتاح Interakt غير مضبوط";
    document.getElementById("brand-line").textContent = status.brand || "";

    const followupMsg = document.getElementById("followup-message");
    if (followupMsg && !followupMsg.dataset.touched) {
      followupMsg.value = status.followUpPreview || "";
    }
    const delay = document.getElementById("followup-delay");
    if (delay && !delay.dataset.touched) {
      delay.value = String(status.outboundDelayMs || 3500);
    }

    const activity = await api("/activity");
    const list = document.getElementById("activity-list");
    list.innerHTML = "";
    if (!activity.activity.length) {
      list.innerHTML = "<li>لا يوجد نشاط بعد</li>";
      return;
    }
    for (const row of activity.activity.slice(0, 12)) {
      const li = document.createElement("li");
      li.textContent = `${actionLabel(row.action)} · ${row.countryCode || ""}${row.phone || ""} · ${formatTime(row.at)}`;
      list.appendChild(li);
    }
  }

  async function refreshConversations() {
    const data = await api("/conversations");
    const body = document.getElementById("conversations-body");
    body.innerHTML = "";
    if (!data.conversations.length) {
      body.innerHTML =
        '<tr><td colspan="6" class="empty">لا توجد محادثات نشطة</td></tr>';
      return;
    }
    for (const row of data.conversations) {
      const tr = document.createElement("tr");
      const flow = row.draft?.flow || (row.session ? "جلسة حسبة" : "—");
      const step = row.draft?.step || "—";
      const amount = formatMoney(row.session?.maxAmount);
      const badge = row.paused
        ? '<span class="badge paused">موقوف</span>'
        : '<span class="badge active">نشط</span>';
      tr.innerHTML = `
        <td dir="ltr">${row.countryCode}${row.phone}</td>
        <td>${flow}</td>
        <td>${step}</td>
        <td dir="ltr">${amount}</td>
        <td>${badge}</td>
        <td>
          <div class="actions">
            <button class="btn tiny secondary" data-act="menu" data-phone="${row.phone}" data-cc="${row.countryCode}" type="button">قائمة</button>
            <button class="btn tiny secondary" data-act="${row.paused ? "resume" : "pause"}" data-phone="${row.phone}" data-cc="${row.countryCode}" type="button">${row.paused ? "تشغيل" : "إيقاف"}</button>
            <button class="btn tiny danger" data-act="reset" data-phone="${row.phone}" data-cc="${row.countryCode}" type="button">تصفير</button>
          </div>
        </td>
      `;
      body.appendChild(tr);
    }
  }

  async function refreshAll() {
    await refreshOverview();
    await refreshConversations();
  }

  function switchPanel(name) {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.panel === name);
    });
    document.querySelectorAll(".panel").forEach((panel) => {
      panel.hidden = panel.id !== `panel-${name}`;
    });
    const [title, sub] = titles[name] || ["لوحة التحكم", ""];
    panelTitle.textContent = title;
    panelSub.textContent = sub;
  }

  async function openPanel() {
    setBootMessage("جاري فتح اللوحة...");
    // أولًا تأكد السيرفر يرد
    try {
      const ping = await api("/ping");
      if (!ping.ok) throw new Error("السيرفر لا يستجيب");
    } catch (err) {
      showLogin(err.message || "السيرفر غير متصل — شغّل start-calc.bat");
      return false;
    }

    try {
      await api("/status");
      showApp();
      try {
        await refreshAll();
      } catch (refreshErr) {
        console.warn("refresh failed", refreshErr);
        panelSub.textContent = refreshErr.message || "تعذر تحديث البيانات";
      }
      return true;
    } catch (err) {
      showLogin(err.message || "فشل فتح اللوحة");
      return false;
    }
  }

  loginBtn.addEventListener("click", async () => {
    loginBtn.disabled = true;
    loginBtn.textContent = "جاري الدخول...";
    try {
      await openPanel();
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "دخول";
    }
  });

  tokenInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loginBtn.click();
  });

  logoutBtn.addEventListener("click", () => {
    showLogin("اضغط دخول للعودة");
  });

  refreshBtn.addEventListener("click", () => {
    refreshAll().catch((err) => alert(err.message));
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchPanel(btn.dataset.panel));
  });

  document.getElementById("conversations-body").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const phone = btn.dataset.phone;
    const countryCode = btn.dataset.cc;
    try {
      if (act === "pause") await api("/pause", { method: "POST", body: JSON.stringify({ phone, countryCode }) });
      if (act === "resume") await api("/resume", { method: "POST", body: JSON.stringify({ phone, countryCode }) });
      if (act === "reset") await api("/reset", { method: "POST", body: JSON.stringify({ phone, countryCode }) });
      if (act === "menu") await api("/send-menu", { method: "POST", body: JSON.stringify({ phone, countryCode }) });
      await refreshAll();
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById("compose-send").addEventListener("click", async () => {
    const status = document.getElementById("compose-status");
    status.hidden = false;
    try {
      await api("/send-text", {
        method: "POST",
        body: JSON.stringify({
          phone: document.getElementById("compose-phone").value,
          message: document.getElementById("compose-message").value,
        }),
      });
      status.className = "status ok";
      status.textContent = "تم إرسال الرسالة";
      await refreshOverview();
    } catch (err) {
      status.className = "status bad";
      status.textContent = err.message;
    }
  });

  document.getElementById("compose-menu").addEventListener("click", async () => {
    const status = document.getElementById("compose-status");
    status.hidden = false;
    try {
      await api("/send-menu", {
        method: "POST",
        body: JSON.stringify({
          phone: document.getElementById("compose-phone").value,
        }),
      });
      status.className = "status ok";
      status.textContent = "تم إرسال القائمة الرئيسية";
      await refreshAll();
    } catch (err) {
      status.className = "status bad";
      status.textContent = err.message;
    }
  });

  document.getElementById("followup-message").addEventListener("input", (e) => {
    e.target.dataset.touched = "1";
  });
  document.getElementById("followup-delay").addEventListener("input", (e) => {
    e.target.dataset.touched = "1";
  });

  document.getElementById("followup-send").addEventListener("click", async () => {
    const status = document.getElementById("followup-status");
    status.hidden = false;
    const phones = document
      .getElementById("followup-phones")
      .value.split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      status.className = "status";
      status.textContent = "جاري الإرسال...";
      const result = await api("/bulk-followup", {
        method: "POST",
        body: JSON.stringify({
          phones,
          message: document.getElementById("followup-message").value,
          delayMs: Number(document.getElementById("followup-delay").value || 0),
        }),
      });
      status.className = "status ok";
      status.textContent = `تم: ${result.sent} | فشل: ${result.failed}`;
      await refreshOverview();
    } catch (err) {
      status.className = "status bad";
      status.textContent = err.message;
    }
  });

  tokenInput.value = "123456";
  openPanel();
})();
