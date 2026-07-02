(function () {
  'use strict';

  const STORAGE_KEY = 'daily_expenses_v1';

  const form = document.getElementById('expenseForm');
  const amountEl = document.getElementById('amount');
  const typeEl = document.getElementById('type');
  const dateEl = document.getElementById('date');
  const timeEl = document.getElementById('time');
  const oilToggle = document.getElementById('oilToggle');
  const oilFields = document.getElementById('oilFields');
  const carTypeEl = document.getElementById('carType');
  const odometerEl = document.getElementById('odometer');
  const lastOilInfo = document.getElementById('lastOilInfo');

  const tbody = document.getElementById('expensesBody');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const filterType = document.getElementById('filterType');

  const statToday = document.getElementById('statToday');
  const statMonth = document.getElementById('statMonth');
  const statTotal = document.getElementById('statTotal');
  const statCount = document.getElementById('statCount');

  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  const resetBtn = document.getElementById('resetBtn');
  const toast = document.getElementById('toast');

  let expenses = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('Failed to load expenses', e);
      return [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function nowTime() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  function formatMoney(n) {
    const num = Number(n) || 0;
    return num.toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return iso; }
  }

  function formatTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    if (Number.isNaN(h)) return t;
    const period = h >= 12 ? 'م' : 'ص';
    const hour12 = ((h + 11) % 12) + 1;
    return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`;
  }

  function showToast(message, kind) {
    toast.textContent = message;
    toast.className = 'toast' + (kind ? ' ' + kind : '');
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toast.hidden = true; }, 2200);
  }

  function setDefaults() {
    if (!dateEl.value) dateEl.value = todayISO();
    if (!timeEl.value) timeEl.value = nowTime();
  }

  function updateOilVisibility() {
    const on = oilToggle.checked;
    oilFields.hidden = !on;
    if (on) {
      const last = lastOilChange();
      if (last) {
        lastOilInfo.textContent = `آخر تبديل زيت: ${formatDate(last.date)} - العداد: ${Number(last.odometer).toLocaleString('ar-EG')} كم`;
        lastOilInfo.classList.remove('warn');
      } else {
        lastOilInfo.textContent = 'لا يوجد سجل سابق لتبديل الزيت';
        lastOilInfo.classList.add('warn');
      }
    }
  }

  function lastOilChange() {
    const oils = expenses.filter(e => e.isOilChange && e.odometer);
    if (oils.length === 0) return null;
    return oils.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0];
  }

  function refreshTypeFilter() {
    const current = filterType.value;
    const types = Array.from(new Set(expenses.map(e => e.type).filter(Boolean))).sort();
    filterType.innerHTML = '<option value="">كل الأنواع</option>' +
      types.map(t => `<option value="${escapeAttr(t)}">${escapeHtml(t)}</option>`).join('');
    if (types.includes(current)) filterType.value = current;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function currentMonthKey(iso) {
    return iso ? iso.slice(0, 7) : '';
  }

  function updateStats() {
    const today = todayISO();
    const monthKey = today.slice(0, 7);
    let total = 0, monthTotal = 0, todayTotal = 0;
    for (const e of expenses) {
      const amt = Number(e.amount) || 0;
      total += amt;
      if (e.date === today) todayTotal += amt;
      if (currentMonthKey(e.date) === monthKey) monthTotal += amt;
    }
    statTotal.textContent = formatMoney(total);
    statMonth.textContent = formatMoney(monthTotal);
    statToday.textContent = formatMoney(todayTotal);
    statCount.textContent = expenses.length.toLocaleString('ar-EG');
  }

  function render() {
    updateStats();
    refreshTypeFilter();

    const q = searchInput.value.trim().toLowerCase();
    const ft = filterType.value;

    const sorted = [...expenses].sort((a, b) => {
      const ak = (a.date || '') + 'T' + (a.time || '00:00');
      const bk = (b.date || '') + 'T' + (b.time || '00:00');
      return bk.localeCompare(ak);
    });

    const filtered = sorted.filter(e => {
      if (ft && e.type !== ft) return false;
      if (!q) return true;
      const hay = [e.type, e.carType, e.notes, e.amount, e.date, e.odometer]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    tbody.innerHTML = filtered.map(e => {
      const oilBadge = e.isOilChange
        ? `<span class="badge oil">تبديل زيت</span>`
        : '';
      const oilCell = e.isOilChange
        ? `${escapeHtml(e.carType || '—')}<br><small>${e.odometer ? Number(e.odometer).toLocaleString('ar-EG') + ' كم' : '—'}</small>`
        : '<span style="color:var(--muted)">—</span>';
      return `
        <tr>
          <td>${formatDate(e.date)}</td>
          <td>${formatTime(e.time)}</td>
          <td><span class="badge">${escapeHtml(e.type || '—')}</span> ${oilBadge}</td>
          <td class="amount-cell">${formatMoney(e.amount)} <small style="color:var(--muted);font-weight:600">ريال</small></td>
          <td class="oil-cell">${oilCell}</td>
          <td>
            <div class="row-actions">
              <button class="icon-btn" data-action="delete" data-id="${escapeAttr(e.id)}" title="حذف">حذف</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const amount = parseFloat(amountEl.value);
    if (!(amount > 0)) {
      showToast('الرجاء إدخال مبلغ صحيح', 'error');
      amountEl.focus();
      return;
    }
    if (!typeEl.value) {
      showToast('الرجاء اختيار نوع الشراء', 'error');
      typeEl.focus();
      return;
    }
    if (!dateEl.value) {
      showToast('الرجاء إدخال التاريخ', 'error');
      dateEl.focus();
      return;
    }
    if (!timeEl.value) {
      showToast('الرجاء إدخال الساعة', 'error');
      timeEl.focus();
      return;
    }

    const isOil = oilToggle.checked;
    if (isOil) {
      if (!carTypeEl.value.trim()) {
        showToast('أدخل نوع السيارة', 'error');
        carTypeEl.focus();
        return;
      }
      if (!(parseFloat(odometerEl.value) >= 0)) {
        showToast('أدخل قراءة العداد', 'error');
        odometerEl.focus();
        return;
      }
    }

    const record = {
      id: uid(),
      amount: Number(amount.toFixed(2)),
      type: typeEl.value,
      date: dateEl.value,
      time: timeEl.value,
      isOilChange: isOil,
      carType: isOil ? carTypeEl.value.trim() : '',
      odometer: isOil ? Number(odometerEl.value) : null,
      createdAt: new Date().toISOString(),
    };

    expenses.push(record);
    save();
    render();
    showToast('تم حفظ المصروف بنجاح', 'success');

    form.reset();
    oilToggle.checked = false;
    updateOilVisibility();
    setDefaults();
    amountEl.focus();
  });

  resetBtn.addEventListener('click', () => {
    setTimeout(() => {
      oilToggle.checked = false;
      updateOilVisibility();
      setDefaults();
    }, 0);
  });

  oilToggle.addEventListener('change', updateOilVisibility);

  tbody.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action="delete"]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const item = expenses.find(e => e.id === id);
    if (!item) return;
    const confirmMsg = `هل تريد حذف مصروف بقيمة ${formatMoney(item.amount)} ريال؟`;
    if (!confirm(confirmMsg)) return;
    expenses = expenses.filter(e => e.id !== id);
    save();
    render();
    showToast('تم حذف المصروف');
  });

  searchInput.addEventListener('input', render);
  filterType.addEventListener('change', render);

  clearBtn.addEventListener('click', () => {
    if (expenses.length === 0) {
      showToast('لا توجد مصاريف لمسحها');
      return;
    }
    if (!confirm('سيتم حذف كل المصاريف بشكل نهائي. هل أنت متأكد؟')) return;
    expenses = [];
    save();
    render();
    showToast('تم مسح جميع المصاريف');
  });

  exportBtn.addEventListener('click', () => {
    if (expenses.length === 0) {
      showToast('لا توجد بيانات للتصدير');
      return;
    }
    const headers = ['التاريخ', 'الساعة', 'نوع الشراء', 'المبلغ', 'تبديل زيت', 'نوع السيارة', 'قراءة العداد (كم)'];
    const rows = expenses.map(e => [
      e.date, e.time, e.type, e.amount,
      e.isOilChange ? 'نعم' : 'لا',
      e.carType || '', e.odometer ?? ''
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('تم تصدير البيانات', 'success');
  });

  setDefaults();
  updateOilVisibility();
  render();
})();
