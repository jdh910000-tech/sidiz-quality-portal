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
    // 1월 데이터만 있음 (C11)
    revenue:       [9610981883, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    haza_general_return: [7909300, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    haza_product:  [45972315, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    haza_lig:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    haza_material: [20250627, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    haza_t50re:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    haza_t50re_labor: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    haza_claim:    [5445360, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    haza_subtotal: [71668302, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    je_haza:       [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    baros_contact: [54773900, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    baros_as:      [26377400, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    baros_logistics:[9698220, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    baros_subtotal:[90849520, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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

// ─── 실패비용 렌더링 메인 ───
function renderCostSection(year) {
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
  const barosTotal = data.baros_subtotal.slice(0, range).reduce((s, v) => s + (v || 0), 0);
  const revenueTotal = data.revenue.slice(0, range).reduce((s, v) => s + (v || 0), 0);
  const totalCost = hazaTotal + barosTotal;
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
  const barosM = data.baros_subtotal.map((v, i) => i < range ? Math.round((v || 0) / 10000) : 0);

  const ratioArr = data.revenue.map((rev, i) => {
    if (i >= range || !rev) return null;
    const cost = (data.haza_subtotal[i] || 0) + (data.baros_subtotal[i] || 0);
    return rev > 0 ? parseFloat(((cost / rev) * 100).toFixed(2)) : null;
  });

  const targetRatio = data.target?.ratio ? (data.target.ratio * 100) : 1.09;

  const rangeOverlay = {
    id: 'costRangeOverlay',
    beforeDraw(chart) {
      if (range >= 12) return;
      const { ctx: c, chartArea: { right, top, bottom }, scales: { x } } = chart;
      const startX = x.getPixelForValue(range - 0.5);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.15)';
      c.fillRect(startX, top, right - startX, bottom - top); c.restore();
    }
  };

  const costTotalLabel = {
    id: 'costTotalLabel',
    afterDatasetsDraw(chart) {
      const { ctx: c, data: d, scales: { x, y } } = chart;
      const haza = d.datasets[0].data, baros = d.datasets[1].data;
      c.save(); c.font = 'bold 10px JetBrains Mono, monospace'; c.textAlign = 'center';
      for (let i = 0; i < haza.length; i++) {
        const total = haza[i] + baros[i];
        if (total === 0) continue;
        c.fillStyle = i < range ? '#f0f4f8' : 'rgba(160,180,203,0.3)';
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
        { label: '하자보수비', data: hazaM, backgroundColor: 'rgba(255,107,122,0.7)', borderColor: 'rgba(255,107,122,1)', borderWidth: 1, borderRadius: 4, order: 3, yAxisID: 'y' },
        { label: '바로스 AS', data: barosM, backgroundColor: 'rgba(255,179,71,0.7)', borderColor: 'rgba(255,179,71,1)', borderWidth: 1, borderRadius: 4, order: 3, yAxisID: 'y' },
        { label: '매출 대비 비율(%)', data: ratioArr, type: 'line', borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.1)', borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#a78bfa', pointBorderColor: '#17293f', pointBorderWidth: 2, tension: 0.3, fill: false, order: 1, yAxisID: 'y1', spanGaps: false },
        { label: '목표 (' + targetRatio.toFixed(2) + '%)', data: Array(12).fill(targetRatio), type: 'line', borderColor: 'rgba(0,196,140,0.7)', borderWidth: 2, borderDash: [6, 4], pointRadius: 0, fill: false, order: 2, yAxisID: 'y1' }
      ]
    },
    plugins: [rangeOverlay, costTotalLabel],
    options: {
      responsive: true, maintainAspectRatio: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end', labels: { color: '#a0b4cb', font: { size: 11 }, usePointStyle: true, pointStyle: 'rectRounded', padding: 16 } },
        tooltip: { backgroundColor: 'rgba(23,41,63,0.95)', titleColor: '#f0f4f8', bodyColor: '#a0b4cb', borderColor: '#243b5a', borderWidth: 1, cornerRadius: 8, padding: 12,
          callbacks: { label: c => c.dataset.yAxisID === 'y1' ? c.dataset.label + ': ' + c.parsed.y + '%' : c.dataset.label + ': ' + (c.parsed.y || 0).toLocaleString() + '만원' }
        }
      },
      scales: {
        x: { stacked: true, grid: { color: 'rgba(36,59,90,0.3)' }, ticks: { color: '#6b83a0', font: { size: 11 } } },
        y: { stacked: true, position: 'left', title: { display: true, text: '비용 (만원)', color: '#6b83a0', font: { size: 11 } }, grid: { color: 'rgba(36,59,90,0.3)' }, ticks: { color: '#6b83a0', font: { size: 10, family: "'JetBrains Mono'" }, callback: v => v.toLocaleString() }, min: 0 },
        y1: { position: 'right', title: { display: true, text: '매출 대비 비율 (%)', color: '#6b83a0', font: { size: 11 } }, grid: { drawOnChartArea: false }, ticks: { color: '#a78bfa', font: { size: 10, family: "'JetBrains Mono'" }, callback: v => v + '%' }, min: 0, max: 3.0 }
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
  const total = computedHazaSub.map((h, i) => (h || 0) + (data.baros_subtotal[i] || 0));
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

  // 바로스 AS
  h += `<tr><td class="row-header" rowspan="4">바로스 AS</td><td class="row-header">AS 컨택센터</td><td>${prevAvgFmt('baros_contact')}</td><td>${tgtFmt('baros_contact')}</td><td>${yearAvgFmt(data.baros_contact)}</td>${mc(data.baros_contact)}<td>${costFmtMan(cumul(data.baros_contact))}</td></tr>`;
  h += `<tr><td class="row-header">AS조치비(무상)</td><td>${prevAvgFmt('baros_as')}</td><td>${tgtFmt('baros_as')}</td><td>${yearAvgFmt(data.baros_as)}</td>${mc(data.baros_as)}<td>${costFmtMan(cumul(data.baros_as))}</td></tr>`;
  h += `<tr><td class="row-header">AS물류비</td><td>${prevAvgFmt('baros_logistics')}</td><td>${tgtFmt('baros_logistics')}</td><td>${yearAvgFmt(data.baros_logistics)}</td>${mc(data.baros_logistics)}<td>${costFmtMan(cumul(data.baros_logistics))}</td></tr>`;
  h += `<tr style="font-weight:600"><td class="row-header">계</td><td>${prevAvgFmt('baros_subtotal')}</td><td>${tgtFmt('baros_subtotal')}</td><td>${yearAvgFmt(data.baros_subtotal)}</td>${mc(data.baros_subtotal)}<td>${costFmtMan(cumul(data.baros_subtotal))}</td></tr>`;

  // 소계
  h += `<tr style="font-weight:700;background:rgba(255,107,122,0.04)"><td class="row-header" colspan="2">소계</td>`;
  const prevTotal = (prevAvg.haza_subtotal || 0) + (prevAvg.baros_subtotal || 0);
  const prevTotalY = yAvg ? ((yAvg.haza_subtotal || 0) + (yAvg.baros_subtotal || 0)) : prevTotal;
  const tgtTotal = (tgt.haza_subtotal || 0) + (tgt.baros_subtotal || 0);
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
function onCostYearChange(year) {
  document.getElementById('costYearSelect').value = year;
  renderCostSection(year);
}
function onCostMonthRangeChange(val) {
  _costMonthRange = parseInt(val);
  const year = document.getElementById('costYearSelect')?.value || '2026';
  renderCostSection(year);
}

window.CostModule = { renderCostSection, onCostYearChange, onCostMonthRangeChange, COST_DATA };
