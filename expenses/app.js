(function () {
  'use strict';

  const STORAGE_KEY = 'daily_expenses_v1';
  const BACKUP_APP_ID = 'daily_expenses_v1';
  const INSTALL_DISMISS_KEY = 'expenses_install_dismissed_v2';
  const APP_URL = 'https://fhaid10-ops.github.io/my-project/expenses/';

  const form = document.getElementById('expenseForm');
  const amountEl = document.getElementById('amount');
  const typeEl = document.getElementById('type');
  const dateEl = document.getElementById('date');
  const timeEl = document.getElementById('time');
  const gasFields = document.getElementById('gasFields');
  const gasCarTypeEl = document.getElementById('gasCarType');
  const gasOdometerEl = document.getElementById('gasOdometer');
  const distributionFields = document.getElementById('distributionFields');
  const distributionNameEl = document.getElementById('distributionName');
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
  const backupBtn = document.getElementById('backupBtn');
  const importBackupBtn = document.getElementById('importBackupBtn');
  const importBackupInput = document.getElementById('importBackupInput');
  const installHeaderBtn = document.getElementById('installHeaderBtn');
  const installBar = document.getElementById('installBar');
  const installBtn = document.getElementById('installBtn');
  const installDismiss = document.getElementById('installDismiss');
  const installBarText = document.getElementById('installBarText');
  const installModal = document.getElementById('installModal');
  const installSteps = document.getElementById('installSteps');
  const installModalClose = document.getElementById('installModalClose');
  const optionsBtn = document.getElementById('optionsBtn');
  const optionsMenu = document.getElementById('optionsMenu');
  const importBackupMenuBtn = document.getElementById('importBackupMenuBtn');
  const backupMenuBtn = document.getElementById('backupMenuBtn');
  const exportMenuBtn = document.getElementById('exportMenuBtn');
  const clearMenuBtn = document.getElementById('clearMenuBtn');
  const clearBtn = document.getElementById('clearBtn');
  const resetBtn = document.getElementById('resetBtn');
  const toast = document.getElementById('toast');

  let expenses = load();
  let installPromptEvent = null;

  function isSalesBackup(payload) {
    return payload && (Array.isArray(payload.executions) || payload.config && payload.config.employees);
  }

  function isExpenseRecord(item) {
    return item && typeof item === 'object' && 'amount' in item && 'type' in item && 'date' in item;
  }

  function normalizeImportedExpenses(payload) {
    if (!payload || typeof payload !== 'object') return null;
    if (isSalesBackup(payload)) return null;
    if (payload.app && payload.app !== BACKUP_APP_ID) return null;
    if (Array.isArray(payload.expenses)) return payload.expenses.filter(isExpenseRecord);
    if (Array.isArray(payload) && payload.every(isExpenseRecord)) return payload;
    return null;
  }

  function exportJsonBackup() {
    const payload = {
      app: BACKUP_APP_ID,
      version: 1,
      exportedAt: new Date().toISOString(),
      expenses,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('تم حفظ النسخة الاحتياطية', 'success');
  }

  function importJsonBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const payload = JSON.parse(reader.result);
          if (isSalesBackup(payload)) {
            reject(new Error('sales_backup'));
            return;
          }
          const imported = normalizeImportedExpenses(payload);
          if (!imported) {
            reject(new Error('invalid_backup'));
            return;
          }
          expenses = imported;
          save();
          render();
          resolve(imported.length);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error('read_failed'));
      reader.readAsText(file);
    });
  }

  function isStandaloneApp() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function isChrome() {
    const ua = navigator.userAgent || '';
    return (/Chrome|CriOS/i.test(ua)) && !/Edg|OPR|SamsungBrowser|Firefox|FxiOS/i.test(ua);
  }

  function isOpera() {
    return /OPR|Opera/i.test(navigator.userAgent || '');
  }

  function isDesktopBrowser() {
    return window.matchMedia && window.matchMedia('(pointer:fine)').matches
      && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  }

  function isMobileBrowser() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  }

  function setupBrowserUi() {
    if (isMobileBrowser()) document.documentElement.classList.add('is-mobile');
    if (isDesktopBrowser()) document.documentElement.classList.add('is-desktop');
    try { localStorage.removeItem('expenses_desktop_site'); } catch (_) {}
  }

  function closeOptionsMenu() {
    if (!optionsMenu || !optionsBtn) return;
    optionsMenu.hidden = true;
    optionsBtn.setAttribute('aria-expanded', 'false');
  }

  function setupOptionsMenu() {
    if (!optionsBtn || !optionsMenu) return;
    optionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = optionsMenu.hidden;
      optionsMenu.hidden = !open;
      optionsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (optionsMenu.hidden) return;
      if (optionsBtn.contains(e.target) || optionsMenu.contains(e.target)) return;
      closeOptionsMenu();
    });
    if (importBackupMenuBtn) importBackupMenuBtn.addEventListener('click', () => { closeOptionsMenu(); importBackupBtn.click(); });
    if (backupMenuBtn) backupMenuBtn.addEventListener('click', () => { closeOptionsMenu(); backupBtn.click(); });
    if (exportMenuBtn) exportMenuBtn.addEventListener('click', () => { closeOptionsMenu(); exportBtn.click(); });
    if (clearMenuBtn) clearMenuBtn.addEventListener('click', () => { closeOptionsMenu(); clearBtn.click(); });
  }

  function getInstallSteps() {
    const ua = navigator.userAgent || '';
    const steps = [
      'احذف أي أيقونة قديمة للمصاريف أو المبيعات من الشاشة الرئيسية.',
    ];
    if (/iPhone|iPad|iPod/i.test(ua)) {
      steps.push(
        'افتح هذا الرابط في Safari: fhaid10-ops.github.io/my-project/expenses/',
        'اضغط زر المشاركة ⬆️ أسفل الشاشة.',
        'اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة».',
      );
    } else if (/Android/i.test(ua)) {
      steps.push(
        'من Chrome أو Opera: اضغط ⋮ في القائمة.',
        'اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».',
        'اضغط «تثبيت» — ستظهر أيقونة «المصاريف».',
      );
    } else {
      steps.push(
        'من Chrome أو Opera اضغط ⋮ في شريط العنوان.',
        'اختر «تثبيت المصاريف» أو Install app.',
      );
    }
    return steps;
  }

  function showInstallModal() {
    if (!installModal || !installSteps) return;
    installSteps.innerHTML = getInstallSteps()
      .map((step) => `<li>${escapeHtml(step)}</li>`)
      .join('');
    installModal.hidden = false;
  }

  function hideInstallModal() {
    if (installModal) installModal.hidden = true;
  }

  function getInstallHelpText() {
    if (isChrome() || isOpera()) {
      return 'اضغط ⋮ ثم «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»';
    }
    return 'يعمل على جميع المتصفحات — Chrome و Opera وغيرها';
  }

  function updateInstallUi() {
    const standalone = isStandaloneApp();
    const dismissed = localStorage.getItem(INSTALL_DISMISS_KEY) === '1';
    const canPrompt = !!installPromptEvent;
    const show = !standalone && !dismissed;

    if (installHeaderBtn) installHeaderBtn.hidden = standalone;
    if (installBar) {
      if (show) installBar.classList.add('show');
      else installBar.classList.remove('show');
      if (installBarText) {
        installBarText.textContent = canPrompt
          ? 'يمكنك تثبيت تطبيق المصاريف كأيقونة على شاشتك.'
          : getInstallHelpText();
      }
    }
  }

  async function promptInstallApp() {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      try {
        const choice = await installPromptEvent.userChoice;
        if (choice.outcome === 'accepted') showToast('تم تثبيت التطبيق', 'success');
      } catch (_) {}
      installPromptEvent = null;
      updateInstallUi();
      return;
    }
    showInstallModal();
  }

  async function cleanupLegacyServiceWorkers() {
    if (!('serviceWorker' in navigator)) return;
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      if (reg.scope.includes('/sales/')) continue;
      if (!reg.scope.includes('/expenses/')) {
        await reg.unregister();
      }
    }
  }

  const SW_VERSION = '16';

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    await cleanupLegacyServiceWorkers();
    try {
      const reg = await navigator.serviceWorker.register(`./sw.js?v=${SW_VERSION}`);
      reg.update();
    } catch (_) {}
  }

  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installPromptEvent = e;
      updateInstallUi();
      if (localStorage.getItem(INSTALL_DISMISS_KEY) !== '1' && installBar) {
        installBar.classList.add('show');
      }
    });

    window.addEventListener('appinstalled', () => {
      installPromptEvent = null;
      if (installBar) installBar.classList.remove('show');
      showToast('تم تثبيت التطبيق', 'success');
    });

    if (installHeaderBtn) installHeaderBtn.addEventListener('click', promptInstallApp);
    if (installBtn) installBtn.addEventListener('click', promptInstallApp);
    if (installDismiss) {
      installDismiss.addEventListener('click', () => {
        localStorage.setItem(INSTALL_DISMISS_KEY, '1');
        if (installBar) installBar.classList.remove('show');
      });
    }
    if (installModalClose) installModalClose.addEventListener('click', hideInstallModal);
    if (installModal) {
      installModal.addEventListener('click', (e) => {
        if (e.target === installModal) hideInstallModal();
      });
    }

    if (isMobileBrowser() && !isStandaloneApp() && localStorage.getItem(INSTALL_DISMISS_KEY) !== '1' && installBar) {
      installBar.classList.add('show');
    }

    updateInstallUi();
  }

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

  function updateTypeFieldsVisibility() {
    const isGas = typeEl.value === 'بنزين';
    const isOil = typeEl.value === 'زيت السيارة';
    const isDistribution = typeEl.value === 'توزيعات';
    gasFields.hidden = !isGas;
    oilFields.hidden = !isOil;
    distributionFields.hidden = !isDistribution;
    if (isOil) {
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

  function isOilExpense(e) {
    return e.isOilChange || e.type === 'زيت السيارة';
  }

  function lastOilChange() {
    const oils = expenses.filter(e => isOilExpense(e) && e.odometer);
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
      const hay = [e.type, e.carType, e.distributionName, e.notes, e.amount, e.date, e.odometer, e.gasOdometer]
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
      const oilBadge = isOilExpense(e)
        ? `<span class="badge oil">تبديل زيت</span>`
        : '';
      let detailsCell = '<span style="color:var(--muted)">—</span>';
      if (isOilExpense(e)) {
        detailsCell = `${escapeHtml(e.carType || '—')}<br><small>${e.odometer ? Number(e.odometer).toLocaleString('ar-EG') + ' كم' : '—'}</small>`;
      } else if (e.type === 'بنزين') {
        const parts = [];
        if (e.carType) parts.push(escapeHtml(e.carType));
        if (e.gasOdometer != null) {
          parts.push(`<small>${Number(e.gasOdometer).toLocaleString('ar-EG')} كم</small>`);
        }
        if (parts.length) detailsCell = parts.join('<br>');
      } else if (e.type === 'توزيعات' && e.distributionName) {
        detailsCell = escapeHtml(e.distributionName);
      }
      return `
        <tr>
          <td>${formatDate(e.date)}</td>
          <td>${formatTime(e.time)}</td>
          <td><span class="badge">${escapeHtml(e.type || '—')}</span> ${oilBadge}</td>
          <td class="amount-cell">${formatMoney(e.amount)} <small style="color:var(--muted);font-weight:600">ريال</small></td>
          <td class="oil-cell">${detailsCell}</td>
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

    const isOil = typeEl.value === 'زيت السيارة';
    const isGas = typeEl.value === 'بنزين';
    const isDistribution = typeEl.value === 'توزيعات';
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
    if (isGas) {
      if (!gasCarTypeEl.value) {
        showToast('اختر نوع السيارة', 'error');
        gasCarTypeEl.focus();
        return;
      }
      if (gasOdometerEl.value !== '' && !(parseFloat(gasOdometerEl.value) >= 0)) {
        showToast('أدخل قراءة العداد بشكل صحيح', 'error');
        gasOdometerEl.focus();
        return;
      }
    }
    if (isDistribution) {
      if (!distributionNameEl.value) {
        showToast('اختر الاسم', 'error');
        distributionNameEl.focus();
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
      carType: isOil ? carTypeEl.value.trim() : (isGas ? gasCarTypeEl.value : ''),
      odometer: isOil ? Number(odometerEl.value) : null,
      gasOdometer: isGas && gasOdometerEl.value !== '' ? Number(gasOdometerEl.value) : null,
      distributionName: isDistribution ? distributionNameEl.value : '',
      createdAt: new Date().toISOString(),
    };

    expenses.push(record);
    save();
    render();
    showToast('تم حفظ المصروف بنجاح', 'success');

    form.reset();
    updateTypeFieldsVisibility();
    setDefaults();
    amountEl.focus();
  });

  resetBtn.addEventListener('click', () => {
    setTimeout(() => {
      updateTypeFieldsVisibility();
      setDefaults();
    }, 0);
  });

  typeEl.addEventListener('change', updateTypeFieldsVisibility);

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

  backupBtn.addEventListener('click', () => {
    if (expenses.length === 0) {
      showToast('لا توجد بيانات للنسخ الاحتياطي');
      return;
    }
    exportJsonBackup();
  });

  importBackupBtn.addEventListener('click', () => importBackupInput.click());

  importBackupInput.addEventListener('change', async () => {
    const file = importBackupInput.files && importBackupInput.files[0];
    importBackupInput.value = '';
    if (!file) return;
    try {
      const count = await importJsonBackup(file);
      showToast(`تم استيراد ${count.toLocaleString('ar-EG')} مصروف`, 'success');
    } catch (err) {
      if (err && err.message === 'sales_backup') {
        showToast('هذه نسخة مبيعات وليست مصاريف — استوردها من تطبيق المبيعات فقط', 'error');
      } else {
        showToast('ملف النسخة الاحتياطية غير صالح للمصاريف', 'error');
      }
    }
  });

  exportBtn.addEventListener('click', () => {
    if (expenses.length === 0) {
      showToast('لا توجد بيانات للتصدير');
      return;
    }
    const headers = ['التاريخ', 'الساعة', 'نوع الشراء', 'المبلغ', 'تبديل زيت', 'نوع السيارة', 'قراءة العداد (كم)', 'قراءة العداد بنزين (كم)', 'اسم التوزيع'];
    const rows = expenses.map(e => [
      e.date, e.time, e.type, e.amount,
      isOilExpense(e) ? 'نعم' : 'لا',
      e.carType || '', e.odometer ?? '', e.gasOdometer ?? '', e.distributionName || ''
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
  updateTypeFieldsVisibility();
  setupBrowserUi();
  setupOptionsMenu();
  setupInstallPrompt();
  render();
  window.addEventListener('load', () => { registerServiceWorker(); });
})();
