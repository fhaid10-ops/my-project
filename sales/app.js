(function () {
  'use strict';

  const STORAGE_KEY = 'daily_sales_v1';

  const form = document.getElementById('saleForm');
  const amountEl = document.getElementById('amount');
  const productEl = document.getElementById('product');
  const quantityEl = document.getElementById('quantity');
  const paymentEl = document.getElementById('payment');
  const customerEl = document.getElementById('customer');
  const dateEl = document.getElementById('date');
  const timeEl = document.getElementById('time');
  const notesEl = document.getElementById('notes');

  const tbody = document.getElementById('salesBody');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const filterPayment = document.getElementById('filterPayment');

  const statToday = document.getElementById('statToday');
  const statMonth = document.getElementById('statMonth');
  const statTotal = document.getElementById('statTotal');
  const statCount = document.getElementById('statCount');

  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  const resetBtn = document.getElementById('resetBtn');
  const toast = document.getElementById('toast');

  let sales = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function nowTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  function formatMoney(n) {
    return (Number(n) || 0).toLocaleString('ar-EG', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
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

  function paymentClass(p) {
    switch (p) {
      case 'نقدي': return 'cash';
      case 'شبكة': return 'card';
      case 'تحويل بنكي': return 'transfer';
      case 'آجل': return 'debt';
      default: return '';
    }
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
    if (!quantityEl.value) quantityEl.value = 1;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function updateStats() {
    const today = todayISO();
    const monthKey = today.slice(0, 7);
    let total = 0, monthTotal = 0, todayTotal = 0;
    for (const s of sales) {
      const amt = Number(s.amount) || 0;
      total += amt;
      if (s.date === today) todayTotal += amt;
      if ((s.date || '').slice(0, 7) === monthKey) monthTotal += amt;
    }
    statTotal.textContent = formatMoney(total);
    statMonth.textContent = formatMoney(monthTotal);
    statToday.textContent = formatMoney(todayTotal);
    statCount.textContent = sales.length.toLocaleString('ar-EG');
  }

  function render() {
    updateStats();

    const q = searchInput.value.trim().toLowerCase();
    const fp = filterPayment.value;

    const sorted = [...sales].sort((a, b) => {
      const ak = (a.date || '') + 'T' + (a.time || '00:00');
      const bk = (b.date || '') + 'T' + (b.time || '00:00');
      return bk.localeCompare(ak);
    });

    const filtered = sorted.filter(s => {
      if (fp && s.payment !== fp) return false;
      if (!q) return true;
      const hay = [s.product, s.customer, s.notes, s.payment, s.amount, s.date]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    tbody.innerHTML = filtered.map(s => `
      <tr>
        <td>${formatDate(s.date)}</td>
        <td>${formatTime(s.time)}</td>
        <td>${escapeHtml(s.product || '—')}${s.notes ? `<br><small style="color:var(--muted)">${escapeHtml(s.notes)}</small>` : ''}</td>
        <td>${Number(s.quantity || 1).toLocaleString('ar-EG')}</td>
        <td class="amount-cell">${formatMoney(s.amount)} <small style="color:var(--muted);font-weight:600">ريال</small></td>
        <td><span class="badge ${paymentClass(s.payment)}">${escapeHtml(s.payment || '—')}</span></td>
        <td>${s.customer ? escapeHtml(s.customer) : '<span style="color:var(--muted)">—</span>'}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-action="delete" data-id="${escapeAttr(s.id)}" title="حذف">حذف</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const amount = parseFloat(amountEl.value);
    if (!(amount > 0)) { showToast('الرجاء إدخال مبلغ صحيح', 'error'); amountEl.focus(); return; }
    if (!productEl.value.trim()) { showToast('أدخل اسم المنتج أو الخدمة', 'error'); productEl.focus(); return; }
    if (!paymentEl.value) { showToast('اختر طريقة الدفع', 'error'); paymentEl.focus(); return; }
    if (!dateEl.value) { showToast('أدخل التاريخ', 'error'); dateEl.focus(); return; }
    if (!timeEl.value) { showToast('أدخل الساعة', 'error'); timeEl.focus(); return; }

    const record = {
      id: uid(),
      amount: Number(amount.toFixed(2)),
      product: productEl.value.trim(),
      quantity: Math.max(1, parseInt(quantityEl.value || '1', 10)),
      payment: paymentEl.value,
      customer: customerEl.value.trim(),
      notes: notesEl.value.trim(),
      date: dateEl.value,
      time: timeEl.value,
      createdAt: new Date().toISOString(),
    };

    sales.push(record);
    save();
    render();
    showToast('تم حفظ عملية البيع', 'success');

    form.reset();
    setDefaults();
    amountEl.focus();
  });

  resetBtn.addEventListener('click', () => {
    setTimeout(setDefaults, 0);
  });

  tbody.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action="delete"]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const item = sales.find(s => s.id === id);
    if (!item) return;
    if (!confirm(`هل تريد حذف عملية بيع بقيمة ${formatMoney(item.amount)} ريال؟`)) return;
    sales = sales.filter(s => s.id !== id);
    save();
    render();
    showToast('تم حذف العملية');
  });

  searchInput.addEventListener('input', render);
  filterPayment.addEventListener('change', render);

  clearBtn.addEventListener('click', () => {
    if (sales.length === 0) { showToast('لا توجد مبيعات لمسحها'); return; }
    if (!confirm('سيتم حذف كل المبيعات بشكل نهائي. هل أنت متأكد؟')) return;
    sales = [];
    save();
    render();
    showToast('تم مسح جميع المبيعات');
  });

  exportBtn.addEventListener('click', () => {
    if (sales.length === 0) { showToast('لا توجد بيانات للتصدير'); return; }
    const headers = ['التاريخ', 'الساعة', 'المنتج/الخدمة', 'الكمية', 'المبلغ', 'طريقة الدفع', 'العميل', 'ملاحظات'];
    const rows = sales.map(s => [
      s.date, s.time, s.product, s.quantity || 1, s.amount, s.payment, s.customer || '', s.notes || ''
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
    a.download = `sales-${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('تم تصدير البيانات', 'success');
  });

  setDefaults();
  render();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
