// cost-data.js — 실패비용 현황 v1
// 단위: 원 (raw), 표시 시 만원 변환

const COST_DATA = {
  '2024': {
    // C10=1월 ~ C19=10월 (10개월 데이터), 11~12월 없음
    revenue:      [9388088163, 10099789228, 10759040631, 8393112900, 8277670981, 8317321343, 8715170022, 8827160068, 7128773347, 8667478797, 0, 0],
    haza_product:  [20564500, 22070200, 34356900, 25110582, 22718264, 25517000, 27060300, 26943400, 19349500, 17776950, 0, 0],
    haza_material: [23311784, 38679032, 5886210, 24195735, 22511307, 18339909, 22096349, 20658457, 31562479, 23967094, 0, 0],
    haza_t50re:    [0, 0, 0, 0, 0, 8091414, 14695521, 23682641, 23848110, 9758343, 0, 0],
    haza_t50re_labor: [0, 0, 0, 0, 0, 0, 3828752, 3249000, 0, 2210000, 0, 0],
    haza_claim:    [5513231, 4185565, 4971713, 4464210, 3180941, 4225914, 9645039, 7938550, 9126420, 10371200, 0, 0],
    haza_subtotal: [49389515, 64934797, 45214823, 53770527, 48410512, 56174237, 77325961, 82472048, 60038399, 52115244, 0, 0],
    je_haza:       [176307, 372965, 272478, 392733, 102965, 208124, 110535, 361566, 120993, 154329, 0, 0],
    baros_contact: [46345890, 44594110, 57074500, 54339600, 51374300, 50324200, 65398400, 65976700, 57868900, 57488500, 0, 0],
    baros_as:      [14977750, 22971400, 19595200, 23766900, 22790800, 23063200, 28715500, 30224700, 21814700, 24538700, 0, 0],
    baros_logistics:[7244390, 9053520, 14918810, 13766880, 13159500, 14052410, 17335390, 16831820, 12991160, 14552820, 0, 0],
    baros_subtotal:[68568030, 76619030, 91588510, 91873380, 87324600, 87439810, 111449290, 113033220, 92674760, 96580020, 0, 0],
    prevYearAvg: {
      revenue:       8977554854,
      haza_product:  24644612,
      haza_material: 20393062,
      haza_t50re:    0,
      haza_t50re_labor: 0,
      haza_claim:    9193395,
      haza_subtotal: 54231069,
      je_haza:       743804,
      baros_contact: 38700619,
      baros_as:      15910067,
      baros_logistics:7397413,
      baros_subtotal:62008099,
    },
    target: {
      revenue:       8528677111,
      haza_product:  21528000,
      haza_material: 18791000,
      haza_t50re:    0,
      haza_t50re_labor: 0,
      haza_claim:    5575507,
      haza_subtotal: 45894507,
      je_haza:       629464,
      baros_contact: 33056545,
      baros_as:      13000859,
      baros_logistics:6418625,
      baros_subtotal:52476029,
      ratio:         0.0116,
    },
  },
  '2025': {
    // 2025년 평균은 C7, 실제 월별은 없음 (정리(2)에 2025 평균만 있음)
    // 정리(2) 시트 기준: 2025 평균값을 12개월 동일 값으로 채울 수 없으므로 평균만 표시
    revenue:       [0,0,0,0,0,0,0,0,0,0,0,0],
    haza_product:  [0,0,0,0,0,0,0,0,0,0,0,0],
    haza_general_return: [0,0,0,0,0,0,0,0,0,0,0,0],
    haza_lig:      [0,0,0,0,0,0,0,0,0,0,0,0],
    haza_material: [0,0,0,0,0,0,0,0,0,0,0,0],
    haza_t50re:    [0,0,0,0,0,0,0,0,0,0,0,0],
    haza_t50re_labor: [0,0,0,0,0,0,0,0,0,0,0,0],
    haza_claim:    [0,0,0,0,0,0,0,0,0,0,0,0],
    haza_subtotal: [0,0,0,0,0,0,0,0,0,0,0,0],
    je_haza:       [0,0,0,0,0,0,0,0,0,0,0,0],
    baros_contact: [0,0,0,0,0,0,0,0,0,0,0,0],
    baros_as:      [0,0,0,0,0,0,0,0,0,0,0,0],
    baros_logistics:[0,0,0,0,0,0,0,0,0,0,0,0],
    baros_subtotal:[0,0,0,0,0,0,0,0,0,0,0,0],
    prevYearAvg: {
      revenue:       8857360548,
      haza_product:  24146760,
      haza_material: 23120836,
      haza_t50re:    8007603,
      haza_t50re_labor: 928775,
      haza_claim:    6362278,
      haza_subtotal: 58984606,
      je_haza:       227300,
      baros_contact: 55078510,
      baros_as:      23245885,
      baros_logistics:13390670,
      baros_subtotal:91715065,
    },
    target: {
      revenue:       10500000000,
      haza_product:  18500000,
      haza_material: 17000000,
      haza_t50re:    3500000,
      haza_t50re_labor: 800000,
      haza_claim:    5000000,
      haza_subtotal: 44800000,
      je_haza:       100000,
      baros_contact: 43000000,
      baros_as:      17000000,
      baros_logistics:10000000,
      baros_subtotal:70000000,
      ratio:         0.0109,
    },
    yearAvg: {
      revenue:       9013587231,
      haza_product:  32069596,
      haza_general_return: 3768793,
      haza_lig:      6871433,
      haza_material: 22003917,
      haza_t50re:    3881271,
      haza_t50re_labor: 0,
      haza_claim:    5299525,
      haza_subtotal: 70458817,
      je_haza:       102049,
      baros_contact: 56994942,
      baros_as:      23935258,
      baros_logistics:13246437,
      baros_subtotal:94176637,
    },
  },
  '2026': {
    // 1월, 2월 데이터
    revenue:       [9610981883, 10180000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    haza_general_return: [7909300, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    haza_product:  [45972315, 29730000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    haza_lig:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    haza_material: [20250627, 17240000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    haza_t50re:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    haza_t50re_labor: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    haza_claim:    [5445360, 4270000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    haza_subtotal: [71668302, 51240000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    je_haza:       [0, 60000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    baros_contact: [54773900, 45590000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    baros_as:      [26377400, 23970000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    baros_logistics:[9698220, 7330000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    baros_subtotal:[90849520, 76890000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    prevYearAvg: {
      revenue:       9013587231,
      haza_product:  32069596,
      haza_general_return: 3768793,
      haza_lig:      6871433,
      haza_material: 22003917,
      haza_t50re:    3881271,
      haza_t50re_labor: 0,
      haza_claim:    5299525,
      haza_subtotal: 70458817,
      je_haza:       102049,
      baros_contact: 56994942,
      baros_as:      23935258,
      baros_logistics:13246437,
      baros_subtotal:94176637,
    },
    target: {
      revenue:       10500000000,
      haza_product:  18500000,
      haza_material: 17000000,
      haza_t50re:    3500000,
      haza_t50re_labor: 800000,
      haza_claim:    5000000,
      haza_subtotal: 44800000,
      je_haza:       100000,
      baros_contact: 43000000,
      baros_as:      17000000,
      baros_logistics:10000000,
      baros_subtotal:70000000,
      ratio:         0.0109,
    },
  }
};

const COST_MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
let _costComboChart = null;
let _costMonthRange = 12;

// 만원 단위 변환 포맷
function costFmtMan(v) { return v ? Math.round(v / 10000).toLocaleString() : '-'; }
function costFmtManUnit(v) { return v ? Math.round(v / 10000).toLocaleString() + '만' : '-'; }
function costFmtEok(v) { return v ? (v / 100000000).toFixed(1) + '억' : '-'; }
function costFmt(v) { return v ? Number(v).toLocaleString() : '-'; }

// ─── Supabase failure_costs 동적 로드 ───
let _failureCostsLoaded = {};
async function loadFailureCostsFromSupabase(year) {
  if (_failureCostsLoaded[year]) return;
  if (!window.SupabaseClient?.fetchFailureCosts) return;
  try {
    const rows = await window.SupabaseClient.fetchFailureCosts(year);
    if (!rows || rows.length === 0) return;
    const data = COST_DATA[year];
    if (!data) return;
    rows.forEach(row => {
      const mi = parseInt(row.year_month.split('-')[1]) - 1;
      if (mi < 0 || mi > 11) return;
      if (row.revenue) data.revenue[mi] = row.revenue;
      data.haza_product[mi] = row.haza_product || 0;
      data.haza_material[mi] = row.haza_material || 0;
      if (data.haza_t50re) data.haza_t50re[mi] = row.haza_t50re || 0;
      if (data.haza_t50re_labor) data.haza_t50re_labor[mi] = row.haza_t50re_labor || 0;
      data.haza_claim[mi] = row.haza_claim || 0;
      if (data.je_haza) data.je_haza[mi] = row.je_haza || 0;
      data.baros_contact[mi] = row.baros_contact || 0;
      data.baros_as[mi] = row.baros_as || 0;
      data.baros_logistics[mi] = row.baros_logistics || 0;
      // subtotals 재계산
      if (data.haza_subtotal) data.haza_subtotal[mi] = (data.haza_product[mi]||0)+(data.haza_material[mi]||0)+(data.haza_t50re?data.haza_t50re[mi]:0)+(data.haza_t50re_labor?data.haza_t50re_labor[mi]:0)+(data.haza_claim[mi]||0);
      if (data.baros_subtotal) data.baros_subtotal[mi] = (data.baros_contact[mi]||0)+(data.baros_as[mi]||0)+(data.baros_logistics[mi]||0);
    });
    _failureCostsLoaded[year] = true;
    console.log('[CostModule] Supabase failure_costs 로드 완료:', year, rows.length+'건');
  } catch (e) { console.warn('[CostModule] Supabase failure_costs 로드 실패 (정적 데이터 사용):', e.message); }
}

// ─── 실패비용 렌더링 메인 ───
async function renderCostSection(year) {
  await loadFailureCostsFromSupabase(year);
  const data = COST_DATA[year]; if (!data) return;
  const range = _costMonthRange;
  const py = String(parseInt(year) - 1);
  const pd = COST_DATA[py];

  renderCostCards(data, year, range);
  renderCostComboChart(data, year, range);
  renderCostTable(data, year, range, pd, py);
}

// ─── KPI 카드 ───
function renderCostCards(data, year, range) {
  const container = document.getElementById('costKpiCards');
  if (!container) return;

  const activeMonths = data.haza_subtotal.filter(v => v > 0).length;
  const mc = Math.max(activeMonths, 1);

  const hazaTotal = data.haza_subtotal.slice(0, range).reduce((s, v) => s + (v || 0), 0);
  const jeHazaTotal = (data.je_haza || []).slice(0, range).reduce((s, v) => s + (v || 0), 0);
  const barosTotal = data.baros_subtotal.slice(0, range).reduce((s, v) => s + (v || 0), 0);
  const revenueTotal = data.revenue.slice(0, range).reduce((s, v) => s + (v || 0), 0);
  const totalCost = hazaTotal + jeHazaTotal + barosTotal;
  const ratio = revenueTotal > 0 ? ((totalCost / revenueTotal) * 100).toFixed(2) : '-';
  const targetRatio = data.target?.ratio ? (data.target.ratio * 100).toFixed(2) : '1.09';

  const hazaAvg = Math.round(hazaTotal / mc);
  const barosAvg = Math.round(barosTotal / mc);

  container.innerHTML = `
    <div class="cost-card"><div class="cost-label">하자보수비 (월평균)</div><div class="cost-value" style="color:var(--accent-rose)">${costFmtManUnit(hazaAvg)}</div><div class="cost-sub">목표: ${costFmtManUnit(data.target?.haza_subtotal)}</div></div>
    <div class="cost-card"><div class="cost-label">바로스 AS 용역료 (월평균)</div><div class="cost-value" style="color:var(--accent-amber)">${costFmtManUnit(barosAvg)}</div><div class="cost-sub">목표: ${costFmtManUnit(data.target?.baros_subtotal)}</div></div>
    <div class="cost-card"><div class="cost-label">매출액 대비 비율</div><div class="cost-value" style="color:var(--accent-violet)">${ratio}%</div><div class="cost-sub">목표: ${targetRatio}%</div></div>
    <div class="cost-card"><div class="cost-label">누적 하자보수비</div><div class="cost-value" style="color:var(--sidiz-blue-bright)">${costFmtEok(hazaTotal)}</div><div class="cost-sub">${mc}개월</div></div>
    <div class="cost-card"><div class="cost-label">누적 바로스 AS</div><div class="cost-value" style="color:var(--accent-cyan)">${costFmtEok(barosTotal)}</div><div class="cost-sub">${mc}개월</div></div>`;
}

// ─── 콤보 차트 ───
function renderCostComboChart(data, year, range) {
  const ctx = document.getElementById('costComboChart'); if (!ctx) return;
  if (_costComboChart) _costComboChart.destroy();

  const hazaM = data.haza_subtotal.map((v, i) => i < range ? Math.round((v || 0) / 10000) : 0);
  const jeHazaM = (data.je_haza || Array(12).fill(0)).map((v, i) => i < range ? Math.round((v || 0) / 10000) : 0);
  const barosM = data.baros_subtotal.map((v, i) => i < range ? Math.round((v || 0) / 10000) : 0);

  const ratioArr = data.revenue.map((rev, i) => {
    if (i >= range || !rev) return null;
    const cost = (data.haza_subtotal[i] || 0) + (data.je_haza?.[i] || 0) + (data.baros_subtotal[i] || 0);
    return rev > 0 ? parseFloat(((cost / rev) * 100).toFixed(2)) : null;
  });

  const targetRatio = data.target?.ratio ? (data.target.ratio * 100) : 1.09;

  const rangeOverlay = {
    id: 'costRangeOverlay',
    beforeDraw(chart) {
      if (range >= 12) return;
      const { ctx: c, chartArea: { right, top, bottom }, scales: { x } } = chart;
      const startX = x.getPixelForValue(range - 0.5);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.04)';
      c.fillRect(startX, top, right - startX, bottom - top); c.restore();
    }
  };

  const costTotalLabel = {
    id: 'costTotalLabel',
    afterDatasetsDraw(chart) {
      const { ctx: c, data: d, scales: { x, y } } = chart;
      const haza = d.datasets[0].data, jeH = d.datasets[1].data, baros = d.datasets[2].data;
      c.save(); c.font = 'bold 12px JetBrains Mono, monospace'; c.textAlign = 'center';
      for (let i = 0; i < haza.length; i++) {
        const total = haza[i] + jeH[i] + baros[i];
        if (total === 0) continue;
        c.fillStyle = i < range ? '#222233' : 'rgba(0,0,0,0.18)';
        c.fillText(total.toLocaleString(), x.getPixelForValue(i), y.getPixelForValue(total) - 6);
      }
      c.restore();
    }
  };

  _costComboChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: COST_MONTHS,
      datasets: [
        { label: '(판)하자보수비', data: hazaM, backgroundColor: 'rgba(255,76,106,0.78)', borderColor: 'transparent', borderWidth: 0, borderRadius: 6, borderSkipped: false, order: 3, yAxisID: 'y' },
        { label: '(제)하자보수비', data: jeHazaM, backgroundColor: 'rgba(148,163,184,0.70)', borderColor: 'transparent', borderWidth: 0, borderRadius: 6, borderSkipped: false, order: 3, yAxisID: 'y' },
        { label: '바로스 AS', data: barosM, backgroundColor: 'rgba(230,168,0,0.78)', borderColor: 'transparent', borderWidth: 0, borderRadius: 6, borderSkipped: false, order: 3, yAxisID: 'y' },
        { label: '매출 대비 비율(%)', data: ratioArr, type: 'line', borderColor: '#7c5fe6', backgroundColor: 'rgba(124,95,230,0.08)', borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#ffffff', pointBorderColor: '#7c5fe6', pointBorderWidth: 2, pointHoverRadius: 7, tension: 0.4, fill: false, order: 1, yAxisID: 'y1', spanGaps: false },
        { label: '목표 (' + targetRatio.toFixed(2) + '%)', data: Array(12).fill(targetRatio), type: 'line', borderColor: 'rgba(0,184,122,0.65)', borderWidth: 2, borderDash: [6, 4], pointRadius: 0, fill: false, order: 2, yAxisID: 'y1' }
      ]
    },
    plugins: [rangeOverlay, costTotalLabel],
    options: {
      responsive: true, maintainAspectRatio: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end', labels: { color: '#555566', font: { size: 12, family: "'Noto Sans KR'", weight: '600' }, usePointStyle: true, pointStyle: 'rectRounded', padding: 18, boxWidth: 14 } },
        tooltip: { backgroundColor: '#ffffff', titleColor: '#111111', bodyColor: '#444455', borderColor: '#E2E2EA', borderWidth: 1, cornerRadius: 10, padding: 12,
          titleFont: { family: "'Noto Sans KR'", weight: '700' },
          bodyFont: { family: "'Noto Sans KR'" },
          callbacks: { label: c => c.dataset.yAxisID === 'y1' ? ' ' + c.dataset.label + ': ' + c.parsed.y + '%' : ' ' + c.dataset.label + ': ' + (c.parsed.y || 0).toLocaleString() + '만원' }
        }
      },
      scales: {
        x: { stacked: true, grid: { color: 'rgba(0,0,0,0.05)', drawTicks: false }, ticks: { color: '#666677', font: { size: 12, family: "'Noto Sans KR'" } } },
        y: { stacked: true, position: 'left', title: { display: true, text: '비용 (만원)', color: '#666677', font: { size: 12 } }, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#666677', font: { size: 11, family: "'JetBrains Mono'" }, callback: v => v.toLocaleString() }, min: 0, max: 25000 },
        y1: { position: 'right', title: { display: true, text: '매출 대비 비율 (%)', color: '#7c5fe6', font: { size: 12 } }, grid: { drawOnChartArea: false }, ticks: { color: '#7c5fe6', font: { size: 11, family: "'JetBrains Mono'" }, callback: v => v + '%' }, min: 0, max: 3.0 }
      }
    }
  });
}

// ─── 상세 테이블 ───
function renderCostTable(data, year, range, pd, py) {
  const container = document.getElementById('costDetailTable'); if (!container) return;

  const prevAvg = data.prevYearAvg || {};
  const tgt = data.target || {};
  const yAvg = data.yearAvg; // 2025만 있음

  function avg(arr) { const v = arr.filter(x => x && x > 0); return v.length > 0 ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : 0; }
  function mc(arr) { return arr.map((v, i) => { const dim = i >= range ? ' style="opacity:0.25"' : ''; return `<td${dim}>${costFmtMan(v)}</td>`; }).join(''); }
  function cumul(arr) { return arr.slice(0, range).reduce((s, v) => s + (v || 0), 0); }

  function prevAvgFmt(key) {
    if (yAvg && yAvg[key]) return costFmtMan(yAvg[key]);
    if (prevAvg[key]) return costFmtMan(prevAvg[key]);
    return '-';
  }
  function tgtFmt(key) { return tgt[key] ? costFmtMan(tgt[key]) : '-'; }
  function yearAvgFmt(arr) { const a = avg(arr); return a > 0 ? costFmtMan(a) : '-'; }

  const mh = COST_MONTHS.map(m => `<th>${m}</th>`).join('');
  const rangeLabel = range < 12 ? ` · ~${range}월 강조` : '';

  // 하자 소계 계산
  const computedHazaSub = data.haza_subtotal.map((v, i) => v || (
    (data.haza_general_return?.[i] || 0) + (data.haza_product[i] || 0) + (data.haza_lig?.[i] || 0) +
    (data.haza_material[i] || 0) + (data.haza_t50re[i] || 0) + (data.haza_t50re_labor?.[i] || 0) + (data.haza_claim[i] || 0)
  ));
  const total = computedHazaSub.map((h, i) => (h || 0) + (data.je_haza?.[i] || 0) + (data.baros_subtotal[i] || 0));
  const ratioArr = data.revenue.map((rev, i) => {
    if (!rev || rev === 0) return '-';
    return ((total[i] / rev) * 100).toFixed(2) + '%';
  });

  let h = `<div class="data-table-header"><h3>하자보수비 및 바로스 용역료 상세 (${year}년${rangeLabel}, 단위: 만원)</h3></div>
  <table class="data-table"><thead><tr><th style="text-align:left" colspan="2">구분</th><th style="text-align:center">${py}평균</th><th style="text-align:center">${year}목표</th><th style="text-align:center">${year}평균</th>${mh}<th>누적</th></tr></thead><tbody>`;

  h += `<tr style="background:rgba(0,87,184,0.03)"><td class="row-header" colspan="2">매출액</td><td>${costFmtEok(prevAvg.revenue || yAvg?.revenue)}</td><td>${costFmtEok(tgt.revenue)}</td><td>${costFmtEok(avg(data.revenue))}</td>`;
  h += data.revenue.map((v, i) => { const dim = i >= range ? ' style="opacity:0.25"' : ''; return `<td${dim}>${costFmtEok(v)}</td>`; }).join('');
  h += `<td>${costFmtEok(cumul(data.revenue))}</td></tr>`;

  // 하자보수비 세부
  const hazaRows = [
    { key: 'haza_product', label: '제품' },
    { key: 'haza_lig', label: 'LIG 제품보상' },
    { key: 'haza_material', label: '자재' },
    { key: 'haza_t50re', label: 'T50RE 헤드 자재' },
    { key: 'haza_t50re_labor', label: 'T50RE 헤드 인건비' },
    { key: 'haza_claim', label: '클레임 보상' },
  ];

  const visibleHazaRows = hazaRows.filter(r => {
    const arr = data[r.key];
    if (!arr) return false;
    return arr.some(v => v > 0) || (prevAvg[r.key] && prevAvg[r.key] > 0) || (yAvg && yAvg[r.key] && yAvg[r.key] > 0) || (tgt[r.key] && tgt[r.key] > 0);
  });

  h += `<tr><td class="row-header" rowspan="${visibleHazaRows.length + 1}">(판)하자보수비</td><td class="row-header">${visibleHazaRows[0]?.label || ''}</td><td>${prevAvgFmt(visibleHazaRows[0]?.key)}</td><td>${tgtFmt(visibleHazaRows[0]?.key)}</td><td>${yearAvgFmt(data[visibleHazaRows[0]?.key] || [])}</td>${mc(data[visibleHazaRows[0]?.key] || [])}<td>${costFmtMan(cumul(data[visibleHazaRows[0]?.key] || []))}</td></tr>`;

  for (let i = 1; i < visibleHazaRows.length; i++) {
    const r = visibleHazaRows[i];
    h += `<tr><td class="row-header">${r.label}</td><td>${prevAvgFmt(r.key)}</td><td>${tgtFmt(r.key)}</td><td>${yearAvgFmt(data[r.key] || [])}</td>${mc(data[r.key] || [])}<td>${costFmtMan(cumul(data[r.key] || []))}</td></tr>`;
  }
  h += `<tr style="font-weight:600"><td class="row-header">계</td><td>${prevAvgFmt('haza_subtotal')}</td><td>${tgtFmt('haza_subtotal')}</td><td>${yearAvgFmt(computedHazaSub)}</td>${mc(computedHazaSub)}<td>${costFmtMan(cumul(computedHazaSub))}</td></tr>`;

  // (제)하자보수비
  const jeHaza = data.je_haza || Array(12).fill(0);
  h += `<tr style="background:rgba(255,179,71,0.05)"><td class="row-header" colspan="1">(제)하자보수비</td><td class="row-header">폐기</td><td>${prevAvgFmt('je_haza')}</td><td>${tgtFmt('je_haza')}</td><td>${yearAvgFmt(jeHaza)}</td>${mc(jeHaza)}<td>${costFmtMan(cumul(jeHaza))}</td></tr>`;

  // 바로스 AS
  h += `<tr><td class="row-header" rowspan="4">바로스 AS</td><td class="row-header">AS 컨택센터</td><td>${prevAvgFmt('baros_contact')}</td><td>${tgtFmt('baros_contact')}</td><td>${yearAvgFmt(data.baros_contact)}</td>${mc(data.baros_contact)}<td>${costFmtMan(cumul(data.baros_contact))}</td></tr>`;
  h += `<tr><td class="row-header">AS조치비(무상)</td><td>${prevAvgFmt('baros_as')}</td><td>${tgtFmt('baros_as')}</td><td>${yearAvgFmt(data.baros_as)}</td>${mc(data.baros_as)}<td>${costFmtMan(cumul(data.baros_as))}</td></tr>`;
  h += `<tr><td class="row-header">AS물류비</td><td>${prevAvgFmt('baros_logistics')}</td><td>${tgtFmt('baros_logistics')}</td><td>${yearAvgFmt(data.baros_logistics)}</td>${mc(data.baros_logistics)}<td>${costFmtMan(cumul(data.baros_logistics))}</td></tr>`;
  h += `<tr style="font-weight:600"><td class="row-header">계</td><td>${prevAvgFmt('baros_subtotal')}</td><td>${tgtFmt('baros_subtotal')}</td><td>${yearAvgFmt(data.baros_subtotal)}</td>${mc(data.baros_subtotal)}<td>${costFmtMan(cumul(data.baros_subtotal))}</td></tr>`;

  // 소계
  h += `<tr style="font-weight:700;background:rgba(255,107,122,0.04)"><td class="row-header" colspan="2">소계</td>`;
  const prevTotal = (prevAvg.haza_subtotal || 0) + (prevAvg.je_haza || 0) + (prevAvg.baros_subtotal || 0);
  const prevTotalY = yAvg ? ((yAvg.haza_subtotal || 0) + (yAvg.je_haza || 0) + (yAvg.baros_subtotal || 0)) : prevTotal;
  const tgtTotal = (tgt.haza_subtotal || 0) + (tgt.je_haza || 0) + (tgt.baros_subtotal || 0);
  h += `<td>${costFmtMan(prevTotalY || prevTotal)}</td><td>${costFmtMan(tgtTotal)}</td><td>${yearAvgFmt(total)}</td>`;
  h += total.map((v, i) => { const dim = i >= range ? ' style="opacity:0.25"' : ''; return `<td${dim}>${costFmtMan(v)}</td>`; }).join('');
  h += `<td>${costFmtMan(cumul(total))}</td></tr>`;

  // 매출액 대비 비율
  h += `<tr style="font-weight:600"><td class="row-header" colspan="2">매출액 대비 비율</td>`;
  const prevRatioVal = prevAvg.revenue ? (((prevTotal) / prevAvg.revenue) * 100).toFixed(2) : '-';
  const prevRatioY = yAvg?.revenue ? ((prevTotalY / yAvg.revenue) * 100).toFixed(2) : prevRatioVal;
  const tgtRatioVal = tgt.ratio ? (tgt.ratio * 100).toFixed(2) : '-';
  const revTotal = cumul(data.revenue); const costTotal = cumul(total);
  const yearRatio = revTotal > 0 ? ((costTotal / revTotal) * 100).toFixed(2) : '-';
  h += `<td>${prevRatioY}%</td><td>${tgtRatioVal}%</td><td>${yearRatio}%</td>`;
  h += ratioArr.map((v, i) => { const dim = i >= range ? ' style="opacity:0.25"' : ''; return `<td${dim}>${v}</td>`; }).join('');
  h += `<td>${yearRatio}%</td></tr>`;

  h += '</tbody></table>';
  container.innerHTML = h;
}

// ─── 핸들러 ───
async function onCostYearChange(year) {
  document.getElementById('costYearSelect').value = year;
  await renderCostSection(year);
}
async function onCostMonthRangeChange(val) {
  _costMonthRange = parseInt(val);
  const year = document.getElementById('costYearSelect')?.value || '2026';
  await renderCostSection(year);
}

window.CostModule = { renderCostSection, onCostYearChange, onCostMonthRangeChange, loadFailureCostsFromSupabase, COST_DATA };
