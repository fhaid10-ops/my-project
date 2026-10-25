(function () {
  "use strict";

  const STORAGE_KEY = "hotmail_contacts_v1";

  const fileInput = document.getElementById("fileInput");
  const dropZone = document.getElementById("dropZone");
  const searchInput = document.getElementById("searchInput");
  const kindFilter = document.getElementById("kindFilter");
  const listEl = document.getElementById("list");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const exportVcfBtn = document.getElementById("exportVcfBtn");
  const clearBtn = document.getElementById("clearBtn");

  function loadContacts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveContacts(contacts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  }

  function showToast(message, type) {
    const toast = document.getElementById("toast");
    toast.hidden = false;
    toast.textContent = message;
    toast.className = "toast show" + (type === "error" ? " error" : "");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      toast.className = "toast";
    }, 2800);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function matchesQuery(card, query) {
    if (!query) return true;
    const hay = [
      card.name,
      (card.emails || []).join(" "),
      (card.phones || []).map(function (p) { return [p.display, p.e164, p.raw].join(" "); }).join(" "),
    ].join(" ").toLowerCase();
    return hay.indexOf(query) !== -1;
  }

  function visiblePhones(card, kind) {
    const phones = card.phones || [];
    if (kind === "mobile") return phones.filter(function (p) { return p.kind === "mobile"; });
    if (kind === "whatsapp") return phones.filter(function (p) { return p.whatsapp; });
    return phones;
  }

  function filteredContacts() {
    const query = String(searchInput.value || "").trim().toLowerCase();
    const kind = kindFilter.value;
    return loadContacts()
      .slice()
      .sort(HotmailVCard.arabicSort)
      .filter(function (card) {
        if (!matchesQuery(card, query)) return false;
        if (kind === "all") return true;
        return visiblePhones(card, kind).length > 0;
      });
  }

  function render() {
    const all = loadContacts();
    const shown = filteredContacts();
    const mobileCount = all.reduce(function (sum, card) {
      return sum + card.phones.filter(function (p) { return p.kind === "mobile"; }).length;
    }, 0);

    document.getElementById("statTotal").textContent = String(all.length);
    document.getElementById("statMobile").textContent = String(mobileCount);
    document.getElementById("statShown").textContent = String(shown.length);
    exportCsvBtn.disabled = !all.length;
    exportVcfBtn.disabled = !all.length;
    clearBtn.disabled = !all.length;

    if (!shown.length) {
      listEl.innerHTML = '<p class="empty">' +
        (all.length ? "لا توجد نتائج مطابقة" : "لم يتم استيراد جهات بعد") +
        "</p>";
      return;
    }

    listEl.innerHTML = shown.map(function (card) {
      const phones = visiblePhones(card, kindFilter.value);
      const phoneText = phones.map(function (p) { return p.display; }).join(" · ") || "بدون رقم";
      const emailText = card.emails && card.emails.length ? "<br>" + escapeHtml(card.emails.join(" · ")) : "";
      const first = phones[0] || {};
      const callHref = first.e164 ? "tel:" + first.e164 : "";
      const waHref = first.whatsapp ? "https://wa.me/" + first.whatsapp : "";
      return (
        '<article class="contact">' +
          '<div class="who">' +
            "<h3>" + escapeHtml(card.name) + "</h3>" +
            "<p>" + escapeHtml(phoneText) + emailText + "</p>" +
          "</div>" +
          '<div class="links">' +
            (callHref ? '<a class="call" href="' + callHref + '">اتصال</a>' : "") +
            (waHref ? '<a class="wa" href="' + waHref + '" target="_blank" rel="noopener">واتساب</a>' : "") +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBuffer(buffer, filename) {
    return HotmailZip.extractVcfText(buffer, filename).then(function (text) {
      const incoming = HotmailVCard.parseCards(text);
      if (!incoming.length) throw new Error("empty");
      const merged = HotmailVCard.mergeContacts(loadContacts(), incoming);
      saveContacts(merged);
      render();
      showToast("تم استيراد " + incoming.length + " جهة — المجموع " + merged.length);
    });
  }

  function readFile(file) {
    return file.arrayBuffer().then(function (buf) {
      return importBuffer(new Uint8Array(buf), file.name);
    }).catch(function () {
      showToast("تعذر قراءة الملف. تأكد أنه Zip أو vCard من Hotmail", "error");
    });
  }

  fileInput.addEventListener("change", function () {
    const file = fileInput.files && fileInput.files[0];
    if (file) readFile(file);
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach(function (eventName) {
    dropZone.addEventListener(eventName, function (e) {
      e.preventDefault();
      dropZone.classList.add("drag");
    });
  });
  ["dragleave", "drop"].forEach(function (eventName) {
    dropZone.addEventListener(eventName, function (e) {
      e.preventDefault();
      dropZone.classList.remove("drag");
    });
  });
  dropZone.addEventListener("drop", function (e) {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) readFile(file);
  });

  searchInput.addEventListener("input", render);
  kindFilter.addEventListener("change", render);

  exportCsvBtn.addEventListener("click", function () {
    downloadText("hotmail-contacts.csv", HotmailVCard.toCsv(loadContacts()), "text/csv;charset=utf-8");
  });
  exportVcfBtn.addEventListener("click", function () {
    downloadText("hotmail-contacts.vcf", HotmailVCard.toVcard30(loadContacts()), "text/vcard;charset=utf-8");
  });
  clearBtn.addEventListener("click", function () {
    if (!confirm("مسح كل الجهات المحفوظة على هذا الجهاز؟")) return;
    localStorage.removeItem(STORAGE_KEY);
    render();
    showToast("تم المسح");
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(function () {});
  }

  render();
})();
