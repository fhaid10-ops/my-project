(function () {
  'use strict';

  const SIMAH_PROFILES = [
    { id: 'no_active', label: 'لا قروض نشطة' },
    { id: 'no_active_closed', label: 'لا قروض نشطة أو مغلقة' },
    { id: 'no_mortgage', label: 'قرض قائم بدون رهن عقاري' },
    { id: 'mortgage_no_subsidy', label: 'قرض مع رهن عقاري — بدون دعم' },
    { id: 'mortgage_subsidy', label: 'قرض مع رهن عقاري — مع دعم' },
  ];

  const SEGMENTS = [
    {
      id: 'gov',
      label: 'حكومي / شبه حكومي',
      minSalary: 4000,
      minSalaryLabel: '4,000 ريال',
      maxFinancing: 3000000,
      samaSegment: 'gov_tdw',
      rates: {
        no_active: { other: 0, sfc: 0.33, global: 0.33 },
        no_active_closed: { other: 0, sfc: 0.33, global: 0.33 },
        no_mortgage: { other: 0.33, sfc: 0.12, global: 0.45 },
        mortgage_no_subsidy: { other: 0.33, sfc: 0.22, global: 0.55 },
        mortgage_subsidy: { other: 0.33, sfc: 0.32, global: 0.65 },
      },
    },
    {
      id: 'tadawul',
      label: 'شركة مدرجة في تداول',
      minSalary: 4000,
      minSalaryLabel: '4,000 ريال',
      maxFinancing: 1500000,
      samaSegment: 'gov_tdw',
      rates: {
        no_active: { other: 0, sfc: 0.33, global: 0.33 },
        no_active_closed: { other: 0, sfc: 0.33, global: 0.33 },
        no_mortgage: { other: 0.33, sfc: 0.12, global: 0.45 },
        mortgage_no_subsidy: { other: 0.33, sfc: 0.22, global: 0.55 },
        mortgage_subsidy: { other: 0.33, sfc: 0.32, global: 0.65 },
      },
    },
    {
      id: 'military_non_officer_low',
      label: 'عسكري غير ضابط (أقل من 10,000)',
      minSalary: 0,
      maxSalary: 9999,
      minSalaryLabel: 'أقل من 10,000 ريال',
      maxFinancing: null,
      suspended: true,
      rates: {},
    },
    {
      id: 'military_non_officer',
      label: 'عسكري غير ضابط (10,000 فأكثر)',
      minSalary: 10000,
      minSalaryLabel: 'أكثر من 10,000 ريال',
      maxFinancing: 100000,
      rates: {
        no_active: { other: 0, sfc: 0.12, global: 0.12 },
        no_active_closed: { other: 0, sfc: 0.33, global: 0.33 },
        no_mortgage: { other: 0.33, sfc: 0.12, global: 0.45 },
        mortgage_no_subsidy: { other: 0.33, sfc: 0.22, global: 0.55 },
        mortgage_subsidy: { other: 0.33, sfc: 0.32, global: 0.65 },
      },
    },
    {
      id: 'military_officer',
      label: 'عسكري ضابط',
      minSalary: 10000,
      minSalaryLabel: 'أكثر من 10,000 ريال',
      maxFinancing: 250000,
      rates: {
        no_active: { other: 0, sfc: 0.33, global: 0.33 },
        no_active_closed: { other: 0, sfc: 0.33, global: 0.33 },
        no_mortgage: { other: 0.33, sfc: 0.12, global: 0.45 },
        mortgage_no_subsidy: { other: 0.33, sfc: 0.22, global: 0.55 },
        mortgage_subsidy: { other: 0.33, sfc: 0.32, global: 0.65 },
      },
    },
    {
      id: 'private_approved',
      label: 'قطاع خاص — جهة عمل معتمدة',
      minSalary: 4000,
      minSalaryLabel: '4,000 ريال',
      maxFinancing: 500000,
      rates: {
        no_active: { other: 0, sfc: 0.12, global: 0.12 },
        no_active_closed: { other: 0, sfc: 0.33, global: 0.33 },
        no_mortgage: { other: 0.33, sfc: 0.12, global: 0.45 },
        mortgage_no_subsidy: { other: 0.33, sfc: 0.22, global: 0.55 },
        mortgage_subsidy: { other: 0.33, sfc: 0.32, global: 0.65 },
      },
    },
    {
      id: 'private_non_approved',
      label: 'قطاع خاص — جهة عمل غير معتمدة',
      minSalary: 25000,
      minSalaryLabel: '25,000 ريال (بدون استثناء)',
      maxFinancing: 250000,
      rates: {
        no_active: { other: 0, sfc: 0.12, global: 0.12 },
        no_active_closed: { other: 0, sfc: 0.33, global: 0.33 },
        no_mortgage: { other: 0.33, sfc: 0.12, global: 0.45 },
        mortgage_no_subsidy: { other: 0.33, sfc: 0.22, global: 0.55 },
        mortgage_subsidy: { other: 0.33, sfc: 0.32, global: 0.65 },
      },
    },
    {
      id: 'gosi_retired',
      label: 'متقاعد GOSI (عادي)',
      minSalary: 4000,
      minSalaryLabel: '4,000 ريال',
      maxFinancing: 500000,
      rates: {
        no_active: { other: 0, sfc: 0.25, global: 0.25 },
        no_active_closed: { other: 0, sfc: 0.25, global: 0.25 },
        no_mortgage: { other: 0.2, sfc: 0.25, global: 0.45 },
        mortgage_no_subsidy: { other: 0.25, sfc: 0.25, global: 0.55 },
        mortgage_subsidy: { other: 0.25, sfc: 0.25, global: 0.65 },
      },
    },
    {
      id: 'house_wife',
      label: 'ربة منزل',
      minSalary: 1,
      minSalaryLabel: 'متوسط الدخل × 3',
      maxFinancing: 25000,
      houseWife: true,
      rates: {
        no_active_closed: { other: null, sfc: null, global: 0.45 },
      },
    },
  ];

  const SAMA_WITHOUT_MORTGAGE = [
    { range: '4,000 – 24,999', consumer: 0.45, maxSfc: 0.33, global: 0.45, segment: 'الكل' },
    { range: '≥ 25,000', consumer: 0.65, maxSfc: null, global: 0.65, segment: '' },
    { range: '≥ 35,000', consumer: 0.75, maxSfc: null, global: 0.75, segment: 'حكومي / شبه حكومي / تداول' },
  ];

  const SAMA_WITH_MORTGAGE = [
    { range: '4,000 – 24,999', withMortgage: 0.55, withSubsidy: 0.65, global: 0.65, segment: 'الكل' },
    { range: '≥ 25,000', withMortgage: null, withSubsidy: null, global: null, segment: '' },
    { range: '≥ 35,000', withMortgage: 0.75, withSubsidy: null, global: null, segment: 'حكومي / شبه حكومي / تداول' },
  ];

  const segmentEl = document.getElementById('segment');
  const salaryEl = document.getElementById('salary');
  const simahEl = document.getElementById('simah');
  const calcBtn = document.getElementById('calcBtn');
  const resultEl = document.getElementById('result');
  const segmentHint = document.getElementById('segmentHint');
  const salaryHint = document.getElementById('salaryHint');

  function formatMoney(n) {
    return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n);
  }

  function formatPct(n) {
    if (n == null) return '—';
    return new Intl.NumberFormat('ar-SA', {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  }

  function formatPctTable(n) {
    if (n == null) return '—';
    return Math.round(n * 100) + '%';
  }

  function getSegment(id) {
    return SEGMENTS.find((s) => s.id === id);
  }

  function getSamaCeiling(salary, hasMortgage, segment) {
    if (salary >= 35000 && segment && segment.samaSegment === 'gov_tdw') {
      return hasMortgage ? 0.75 : 0.75;
    }
    if (salary >= 25000) return 0.65;
    if (salary >= 4000) return hasMortgage ? 0.65 : 0.45;
    return null;
  }

  function profileHasMortgage(profileId) {
    return profileId === 'mortgage_no_subsidy' || profileId === 'mortgage_subsidy';
  }

  function updateSegmentHint() {
    const seg = getSegment(segmentEl.value);
    if (!seg) {
      segmentHint.textContent = '';
      return;
    }
    let hint = `الحد الأدنى للراتب: ${seg.minSalaryLabel}`;
    if (seg.maxFinancing != null) {
      hint += ` · أقصى تمويل: ${formatMoney(seg.maxFinancing)} ريال`;
    }
    if (seg.suspended) hint += ' · غير مؤهل';
    segmentHint.textContent = hint;
  }

  function updateSimahOptions() {
    const seg = getSegment(segmentEl.value);
    const prev = simahEl.value;
    simahEl.innerHTML = '';

    if (!seg || seg.suspended) {
      simahEl.innerHTML = '<option value="">—</option>';
      simahEl.disabled = true;
      return;
    }

    simahEl.disabled = false;
    const allowed = seg.houseWife ? ['no_active_closed'] : SIMAH_PROFILES.map((p) => p.id);
    for (const p of SIMAH_PROFILES) {
      if (!allowed.includes(p.id)) continue;
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label;
      simahEl.appendChild(opt);
    }
    if (allowed.includes(prev)) simahEl.value = prev;
  }

  function validateSalary(seg, salary) {
    if (!seg) return 'اختر القطاع أولاً';
    if (seg.suspended) return 'هذا القطاع غير مؤهل للتمويل';
    if (!(salary > 0)) return 'أدخل الراتب الشهري';
    if (seg.maxSalary != null && salary > seg.maxSalary) {
      return `الراتب يتجاوز الحد (${formatMoney(seg.maxSalary)} ريال) — استخدم قطاع عسكري غير ضابط (10,000 فأكثر)`;
    }
    if (salary < seg.minSalary) {
      return `الراتب أقل من الحد الأدنى (${seg.minSalaryLabel})`;
    }
    return null;
  }

  function renderResult(html, kind) {
    resultEl.hidden = false;
    resultEl.className = 'result-card' + (kind ? ' ' + kind : '');
    resultEl.innerHTML = html;
  }

  function calculate() {
    const seg = getSegment(segmentEl.value);
    const salary = Number(salaryEl.value);
    const profileId = simahEl.value;
    const err = validateSalary(seg, salary);

    if (err) {
      renderResult(`<p class="result-error">${err}</p>`, 'error');
      return;
    }

    if (seg.suspended) {
      renderResult('<p class="result-error">غير مؤهل — التمويل موقوف لهذا القطاع</p>', 'error');
      return;
    }

    const rates = seg.rates[profileId];
    if (!rates) {
      renderResult('<p class="result-error">اختر ملف SIMAH</p>', 'error');
      return;
    }

    const hasMortgage = profileHasMortgage(profileId);
    const samaCeiling = getSamaCeiling(salary, hasMortgage, seg);
    const maxMonthly = salary * rates.global;
    const samaNote = samaCeiling != null && rates.global > samaCeiling
      ? `<p class="result-note warn">تنبيه: نسبة SFC (${formatPct(rates.global)}) تتجاوز سقف ساما (${formatPct(samaCeiling)}) لهذا الراتب</p>`
      : samaCeiling != null && seg.samaSegment === 'gov_tdw' && salary >= 35000
        ? `<p class="result-note">سقف ساما التنظيمي: ${formatPct(samaCeiling)} (يُطبق بصرامة لرواتب ≥ 35,000)</p>`
        : '';

    const otherCell = rates.other == null ? 'غير متاح' : formatPct(rates.other);
    const sfcCell = rates.sfc == null ? 'غير متاح' : formatPct(rates.sfc);

    renderResult(`
      <h3>نتيجة الاستعلام</h3>
      <div class="result-grid">
        <div class="result-item">
          <span class="result-label">قطاع العميل</span>
          <span class="result-value">${seg.label}</span>
        </div>
        <div class="result-item">
          <span class="result-label">الراتب الشهري</span>
          <span class="result-value">${formatMoney(salary)} ريال</span>
        </div>
        <div class="result-item">
          <span class="result-label">ملف SIMAH</span>
          <span class="result-value">${SIMAH_PROFILES.find((p) => p.id === profileId).label}</span>
        </div>
        <div class="result-item highlight">
          <span class="result-label">أقصى تمويل</span>
          <span class="result-value">${seg.maxFinancing != null ? formatMoney(seg.maxFinancing) + ' ريال' : '—'}</span>
        </div>
      </div>
      <div class="dbr-bars">
        <div class="dbr-bar">
          <div class="dbr-bar-head"><span>مُقرضو آخرون</span><strong>${otherCell}</strong></div>
          <div class="dbr-track"><div class="dbr-fill other" style="width:${rates.other != null ? rates.other * 100 : 0}%"></div></div>
        </div>
        <div class="dbr-bar">
          <div class="dbr-bar-head"><span>SFC DBR</span><strong>${sfcCell}</strong></div>
          <div class="dbr-track"><div class="dbr-fill sfc" style="width:${rates.sfc != null ? rates.sfc * 100 : 0}%"></div></div>
        </div>
        <div class="dbr-bar">
          <div class="dbr-bar-head"><span>Global DBR</span><strong>${formatPct(rates.global)}</strong></div>
          <div class="dbr-track"><div class="dbr-fill global" style="width:${rates.global * 100}%"></div></div>
        </div>
      </div>
      <div class="result-highlight">
        <span>أقصى التزام شهري (Global DBR × الراتب)</span>
        <strong>${formatMoney(Math.round(maxMonthly))} ريال</strong>
      </div>
      ${samaNote}
      <p class="result-note">Global DBR = مُقرضو آخرون + SFC DBR</p>
    `, 'success');
  }

  function renderSamaTables() {
    const withoutBody = document.getElementById('samaWithoutBody');
    const withBody = document.getElementById('samaWithBody');

    withoutBody.innerHTML = SAMA_WITHOUT_MORTGAGE.map((r) => `
      <tr>
        <td>${r.range}</td>
        <td>${formatPctTable(r.consumer)}</td>
        <td>${formatPctTable(r.maxSfc)}</td>
        <td>${formatPctTable(r.global)}</td>
        <td>${r.segment || '—'}</td>
      </tr>
    `).join('');

    withBody.innerHTML = SAMA_WITH_MORTGAGE.map((r) => `
      <tr>
        <td>${r.range}</td>
        <td>${formatPctTable(r.withMortgage)}</td>
        <td>${formatPctTable(r.withSubsidy)}</td>
        <td>${formatPctTable(r.global)}</td>
        <td>${r.segment || '—'}</td>
      </tr>
    `).join('');
  }

  SEGMENTS.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
    segmentEl.appendChild(opt);
  });

  segmentEl.addEventListener('change', () => {
    updateSegmentHint();
    updateSimahOptions();
    resultEl.hidden = true;
  });

  calcBtn.addEventListener('click', calculate);
  [salaryEl, simahEl].forEach((el) => {
    el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') calculate();
    });
  });

  updateSegmentHint();
  updateSimahOptions();
  renderSamaTables();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
