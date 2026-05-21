/* strength-data.js — 강도 시험 (다이캐스팅 / 사출 베이스) Supabase 연동 + 차트 + 입력 + GCK 파일 업로드 */
(function () {
'use strict';

const SB_URL = 'https://cyxnbwczcvjeaqmrdzcb.supabase.co';
const SB_KEY = 'sb_publishable_i2Cw7SPjRn1BDa5XS-2NyA_qHNRC8Y5';
const SB_HEADERS = {
  'apikey': SB_KEY,
  'Authorization': `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json'
};

const STATE = { die: [], inj: [], loaded: false, currentTab: 'schedule', charts: {} };

const C = {
  blue: '#002BD2', blueLight: '#3C7DFF', blueBright: '#1A59FF',
  cyan: '#54DBC2', emerald: '#00b87a', amber: '#e6a800',
  rose: '#FF6C39', violet: '#7c5fe6', orange: '#FF8C00',
  text: '#111111', muted: '#8a8a9a', border: '#E2E2EA',
};
const PALETTE = [C.blue, C.cyan, C.emerald, C.amber, C.rose, C.violet, C.blueLight, '#94a3b8', '#FF8C00', '#a78bfa'];

// 다이캐스팅 사양별 기준값 (입력 폼 자동 결정용)
const DIE_SPEC_THRESHOLDS = {
  '4000G': 800,
  'S-TILT': 750,
  'ITO-TILT': 850,
  'CH4800': 400,
  'T502F': 1500,
  '700 FLAT (POL)': 1134.7,
  '700 FLAT (RAW)': 1134.7,
};

const $ = (id) => document.getElementById(id);
const avg = arr => { const v = arr.filter(x => x !== null && x !== undefined && !isNaN(x)); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; };
const fmt = (n, d=1) => (n == null || isNaN(n)) ? '-' : Number(n).toFixed(d);
const uniq = arr => [...new Set(arr)].filter(v => v !== null && v !== undefined && v !== '');
const escHtml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inDateRange = (d, f, t) => { if (!d) return false; if (f && d < f) return false; if (t && d > t) return false; return true; };

// 판정 (강도 ≥ 기준 → OK)
function judge(r) {
  if (r.strength === null || r.strength === undefined) return '';
  return r.strength >= (r.threshold || 0) ? 'OK' : 'NG';
}

// ===== Supabase fetch =====
async function loadStrengthData(force = false) {
  if (STATE.loaded && !force) return;
  try {
    async function fetchAll(table) {
      const PAGE = 1000;
      let all = [], offset = 0;
      while (true) {
        const res = await fetch(`${SB_URL}/rest/v1/${table}?select=*&order=measure_date.desc`, {
          headers: { ...SB_HEADERS, 'Range': `${offset}-${offset+PAGE-1}`, 'Range-Unit': 'items' }
        });
        if (!res.ok) throw new Error(`${table} ${res.status}`);
        const rows = await res.json();
        all = all.concat(rows);
        if (rows.length < PAGE) break;
        offset += PAGE;
      }
      return all;
    }
    const [die, inj] = await Promise.all([
      fetchAll('strength_diecasting'),
      fetchAll('strength_injection_base'),
    ]);
    STATE.die = die;
    STATE.inj = inj;
    STATE.loaded = true;
    console.log(`[강도시험] 다이캐스팅=${die.length}, 사출베이스=${inj.length}`);
  } catch (e) {
    console.error('[강도시험] 로드 실패:', e);
    alert('강도 시험 데이터 로드 실패: ' + e.message);
  }
}

// Chart.js 기본
function chartDefault() {
  if (window.Chart && window.ChartDataLabels) {
    try { Chart.register(window.ChartDataLabels); } catch (e) {}
  }
  if (window.Chart) {
    Chart.defaults.font.family = "'Noto Sans KR', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = C.text;
    Chart.defaults.plugins.datalabels = { display: false };
  }
}

// 차트 헬퍼
function destroyChart(k) { if (STATE.charts[k]) { STATE.charts[k].destroy(); STATE.charts[k] = null; } }
function makeLine(k, ctx, labels, datasets, opts = {}) {
  destroyChart(k);
  STATE.charts[k] = new Chart(ctx, {
    type: 'line', data: { labels, datasets },
    options: Object.assign({
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: { x: { grid: { display: false } }, y: { grid: { color: C.border } } },
      plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 10 } } } }
    }, opts)
  });
}
function makeBar(k, ctx, labels, datasets, opts = {}) {
  destroyChart(k);
  STATE.charts[k] = new Chart(ctx, {
    type: 'bar', data: { labels, datasets },
    options: Object.assign({
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: false, grid: { color: C.border } }, x: { grid: { display: false } } },
      plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: C.text, font: { weight: 700, size: 11 }, formatter: v => v == null ? '-' : v.toFixed(0) } }
    }, opts)
  });
}
function makeDoughnut(k, ctx, labels, data, colors, opts = {}) {
  destroyChart(k);
  STATE.charts[k] = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
    options: Object.assign({
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 } } },
        datalabels: { color: '#fff', font: { weight: 700, size: 12 }, formatter: (v, ctx) => { const t = ctx.dataset.data.reduce((a,b)=>a+b,0); return t && v ? Math.round(v/t*100) + '%' : ''; } }
      }
    }, opts)
  });
}

// ===== 서브탭 전환 =====
window.switchLabTab = function (tab) {
  STATE.currentTab = tab;
  document.querySelectorAll('.lab-subtab').forEach(b => b.classList.remove('active'));
  document.querySelector(`.lab-subtab[data-tab="${tab}"]`)?.classList.add('active');
  document.querySelectorAll('.lab-pane').forEach(p => p.style.display = 'none');
  $(`lab-pane-${tab}`).style.display = 'block';
  if (tab === 'die') renderDie();
  else if (tab === 'inj') renderInj();
  else if (tab === 'report') switchLabReportCat(STATE.labReportCat || 'die');
};

// 리포트 카테고리 전환
STATE.labReportCat = 'die';
window.switchLabReportCat = function (cat) {
  STATE.labReportCat = cat;
  document.querySelectorAll('.lab-report-cat-tab').forEach(b => b.classList.remove('active'));
  document.querySelector(`.lab-report-cat-tab[data-cat="${cat}"]`)?.classList.add('active');
  document.querySelectorAll('.lab-report-cat-pane').forEach(p => p.style.display = 'none');
  $(`lab-report-cat-${cat}`).style.display = 'block';
  if (cat === 'die') renderLabReportDie();
  else if (cat === 'inj') renderLabReportInj();
};

// ===== 다이캐스팅 =====
function getDieFiltered() {
  const spec = $('str-die-spec').value, source = $('str-die-source').value;
  const mold = $('str-die-mold').value;
  const j = $('str-die-judge').value;
  const from = $('str-die-from').value, to = $('str-die-to').value;
  return STATE.die.filter(r =>
    (!spec || r.spec === spec) &&
    (!source || r.source === source) &&
    (!mold || (r.mold_number || '') === mold) &&
    (!j || judge(r) === j) &&
    inDateRange(r.measure_date, from, to)
  );
}

function renderDieKPI(rows) {
  const sAvg = avg(rows.map(r => r.strength));
  const ng = rows.filter(r => judge(r) === 'NG').length;
  const ngRate = rows.length ? (ng / rows.length * 100) : 0;
  const specs = uniq(rows.map(r => r.spec));
  $('str-die-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">총 측정 건수</div><div class="kpi-value">${rows.length.toLocaleString()}</div><div class="kpi-change">사양 ${specs.length}종</div></div>
    <div class="kpi-card"><div class="kpi-label">평균 강도</div><div class="kpi-value">${fmt(sAvg, 1)}</div><div class="kpi-change">단위: kgf</div></div>
    <div class="kpi-card"><div class="kpi-label">기준 부적합</div><div class="kpi-value" style="background:linear-gradient(135deg,${ng>0?C.rose:C.emerald},#ffb347);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${ng}</div><div class="kpi-change ${ng>0?'up':'down'}">${ngRate.toFixed(1)}% NG율</div></div>
    <div class="kpi-card"><div class="kpi-label">측정 주체</div><div class="kpi-value" style="font-size:18px">${uniq(rows.map(r => r.source)).join(' · ')}</div><div class="kpi-change">시디즈 / GCK</div></div>
  `;
}

function renderDieCharts(rows) {
  // 사양별 월별 강도 추이 (월 평균)
  const months = uniq(rows.map(r => (r.measure_date || '').slice(0, 7))).sort();
  const specs = uniq(rows.map(r => r.spec));
  const datasets = [];
  specs.forEach((spec, i) => {
    datasets.push({
      label: spec,
      data: months.map(m => avg(rows.filter(r => (r.measure_date||'').slice(0,7) === m && r.spec === spec).map(r => r.strength))),
      borderColor: PALETTE[i % PALETTE.length],
      backgroundColor: PALETTE[i % PALETTE.length] + '20',
      tension: 0.3, borderWidth: 2, pointRadius: 3, spanGaps: true,
    });
  });
  // 선택된 사양이 있으면 그 사양의 기준선 추가
  const selSpec = $('str-die-spec').value;
  if (selSpec && DIE_SPEC_THRESHOLDS[selSpec]) {
    datasets.push({
      label: `기준 ${DIE_SPEC_THRESHOLDS[selSpec]}`,
      data: months.map(() => DIE_SPEC_THRESHOLDS[selSpec]),
      borderColor: C.rose, borderWidth: 2, borderDash: [6, 4], pointRadius: 0, fill: false
    });
  }
  makeLine('dieTrend', $('str-die-trend').getContext('2d'), months, datasets, {
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: '강도 (kgf)', font: { size: 10 } } }
    }
  });

  // 사양별 평균 강도 vs 기준 (기준선 빨간색 강조 + 앞으로)
  // X축 고정 순서: 4000G → S-TILT → ITO-TILT → CH4800 → T502F → 700 FLAT (RAW) → 700 FLAT (POL)
  const SPEC_ORDER = ['4000G', 'S-TILT', 'ITO-TILT', 'CH4800', 'T502F', '700 FLAT (RAW)', '700 FLAT (POL)'];
  const orderedSpecs = SPEC_ORDER.filter(s => specs.includes(s))
    .concat(specs.filter(s => !SPEC_ORDER.includes(s))); // 미정의 사양은 뒤로
  const specAvgs = orderedSpecs.map(s => avg(rows.filter(r => r.spec === s).map(r => r.strength)));
  const specThres = orderedSpecs.map(s => DIE_SPEC_THRESHOLDS[s] || 0);
  makeBar('dieAvg', $('str-die-avg').getContext('2d'), orderedSpecs, [
    { label: '평균 강도', data: specAvgs, backgroundColor: PALETTE.slice(0, orderedSpecs.length), borderRadius: 6, order: 2 },
    {
      label: '기준',
      data: specThres,
      type: 'line',
      borderColor: '#dc2626',
      borderWidth: 3,
      borderDash: [6, 4],
      pointRadius: 7,
      pointHoverRadius: 9,
      pointBackgroundColor: '#dc2626',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      fill: false,
      order: 1,
      datalabels: {
        display: true,
        color: '#dc2626',
        backgroundColor: '#fff',
        borderColor: '#dc2626',
        borderWidth: 1,
        borderRadius: 4,
        padding: { top: 2, bottom: 2, left: 5, right: 5 },
        font: { weight: 800, size: 11 },
        align: 'top',
        anchor: 'end',
        offset: 4,
        formatter: v => v ? v.toLocaleString() : ''
      }
    },
  ], {
    scales: { y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: 'kgf', font: { size: 10 } } }, x: { grid: { display: false } } },
    plugins: { legend: { display: true, position: 'top', align: 'end' }, datalabels: { display: false } }
  });

  // 시디즈 vs GCK 강도 비교 (4000G / S-TILT) — 막대
  const compareSpecs = ['4000G', 'S-TILT'];
  makeBar('dieCompareStrength', $('str-die-compare-strength').getContext('2d'), compareSpecs, [
    {
      label: '시디즈',
      data: compareSpecs.map(sp => avg(rows.filter(r => r.spec === sp && r.source === '시디즈').map(r => r.strength))),
      backgroundColor: C.blue, borderRadius: 6,
    },
    {
      label: 'GCK',
      data: compareSpecs.map(sp => avg(rows.filter(r => r.spec === sp && r.source === 'GCK').map(r => r.strength))),
      backgroundColor: C.amber, borderRadius: 6,
    },
  ], {
    scales: {
      y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: '강도 (kgf)', font: { size: 10 } } },
      x: { grid: { display: false } }
    },
    plugins: {
      legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 11 } } },
      datalabels: { anchor: 'end', align: 'top', color: C.text, font: { weight: 700, size: 11 }, formatter: v => v ? v.toFixed(1) : '-' }
    }
  });

  // 시디즈 vs GCK 중량 비교 (4000G / S-TILT) — 막대
  makeBar('dieCompareWeight', $('str-die-compare-weight').getContext('2d'), compareSpecs, [
    {
      label: '시디즈',
      data: compareSpecs.map(sp => avg(rows.filter(r => r.spec === sp && r.source === '시디즈').map(r => r.weight))),
      backgroundColor: C.blueLight, borderRadius: 6,
    },
    {
      label: 'GCK',
      data: compareSpecs.map(sp => avg(rows.filter(r => r.spec === sp && r.source === 'GCK').map(r => r.weight))),
      backgroundColor: '#FFB347', borderRadius: 6,
    },
  ], {
    scales: {
      y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: '중량 (g)', font: { size: 10 } } },
      x: { grid: { display: false } }
    },
    plugins: {
      legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 11 } } },
      datalabels: { anchor: 'end', align: 'top', color: C.text, font: { weight: 700, size: 11 }, formatter: v => v ? v.toFixed(1) : '-' }
    }
  });
}

function renderDieTable(rows) {
  $('str-die-count').textContent = rows.length.toLocaleString();
  const sorted = [...rows].sort((a, b) => (b.measure_date || '').localeCompare(a.measure_date || ''));
  const tb = $('str-die-table-body');
  if (!sorted.length) {
    tb.innerHTML = '<tr><td colspan="9" style="padding:40px;text-align:center;color:#8a8a9a">검색 결과가 없습니다</td></tr>';
    return;
  }
  tb.innerHTML = sorted.slice(0, 500).map(r => {
    const j = judge(r);
    const cls = j === 'NG' ? ' class="ng-row"' : '';
    return `<tr${cls}>
      <td>${escHtml(r.measure_date)}</td>
      <td>${escHtml(r.spec)}</td>
      <td>${escHtml(r.source)}</td>
      <td>${escHtml(r.mold_number || '')}</td>
      <td>${fmt(r.weight, 1)}</td>
      <td class="highlight">${fmt(r.strength, 1)}</td>
      <td>${fmt(r.threshold, 1)}</td>
      <td><span class="${j === 'NG' ? 'danger' : (j === 'OK' ? 'success' : '')}">${j || '-'}</span></td>
      <td><button onclick="deleteStrengthRow('strength_diecasting', ${r.id})" class="btn-del" title="삭제" style="background:none;border:1px solid var(--border);color:var(--accent-rose);padding:3px 8px;border-radius:6px;cursor:pointer;font-size:13px">🗑</button></td>
    </tr>`;
  }).join('');
}

function initDieDropdowns() {
  const specs = uniq(STATE.die.map(r => r.spec)).sort();
  const sel = $('str-die-spec');
  const cur = sel.value;
  sel.innerHTML = '<option value="">전체</option>' + specs.map(s => `<option value="${escHtml(s)}">${escHtml(s)}</option>`).join('');
  if ([...sel.options].some(o => o.value === cur)) sel.value = cur;

  // 금형번호 드롭다운
  const moldSel = $('str-die-mold');
  if (moldSel) {
    const molds = uniq(STATE.die.map(r => r.mold_number)).sort();
    const cm = moldSel.value;
    moldSel.innerHTML = '<option value="">전체</option>' + molds.map(m => `<option value="${escHtml(m)}">${escHtml(m)}</option>`).join('');
    if ([...moldSel.options].some(o => o.value === cm)) moldSel.value = cm;
  }

  // 입력 폼 사양 셀렉트
  const formSel = $('form-die-spec');
  formSel.innerHTML = Object.keys(DIE_SPEC_THRESHOLDS).map(s => `<option value="${escHtml(s)}">${escHtml(s)} (≥${DIE_SPEC_THRESHOLDS[s]} kgf)</option>`).join('');
}

function renderDie() {
  initDieDropdowns();
  const rows = getDieFiltered();
  renderDieKPI(rows);
  renderDieCharts(rows);
  renderDieTable(rows);
}

// ===== 사출 베이스 =====
function getInjFiltered() {
  const spec = $('str-inj-spec').value;
  const j = $('str-inj-judge').value;
  const from = $('str-inj-from').value, to = $('str-inj-to').value;
  return STATE.inj.filter(r =>
    (!spec || r.spec === spec) &&
    (!j || judge(r) === j) &&
    inDateRange(r.measure_date, from, to)
  );
}

function renderInjKPI(rows) {
  const sAvg = avg(rows.map(r => r.strength));
  const wAvg = avg(rows.map(r => r.weight));
  const ng = rows.filter(r => judge(r) === 'NG').length;
  const ngRate = rows.length ? (ng / rows.length * 100) : 0;
  const specs = uniq(rows.map(r => r.spec));
  $('str-inj-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">총 측정 건수</div><div class="kpi-value">${rows.length.toLocaleString()}</div><div class="kpi-change">사양 ${specs.length}종</div></div>
    <div class="kpi-card"><div class="kpi-label">평균 강도</div><div class="kpi-value">${fmt(sAvg, 1)}</div><div class="kpi-change">기준 1,134.7 kgf</div></div>
    <div class="kpi-card"><div class="kpi-label">평균 중량</div><div class="kpi-value">${fmt(wAvg, 1)}</div><div class="kpi-change">단위: g</div></div>
    <div class="kpi-card"><div class="kpi-label">기준 부적합</div><div class="kpi-value" style="background:linear-gradient(135deg,${ng>0?C.rose:C.emerald},#ffb347);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${ng}</div><div class="kpi-change ${ng>0?'up':'down'}">${ngRate.toFixed(1)}% NG율</div></div>
  `;
}

function renderInjCharts(rows) {
  const months = uniq(rows.map(r => (r.measure_date || '').slice(0, 7))).sort();
  const specs = uniq(rows.map(r => r.spec)).sort();
  const datasets = specs.map((spec, i) => ({
    label: spec,
    data: months.map(m => avg(rows.filter(r => (r.measure_date||'').slice(0,7) === m && r.spec === spec).map(r => r.strength))),
    borderColor: PALETTE[i % PALETTE.length],
    backgroundColor: PALETTE[i % PALETTE.length] + '20',
    tension: 0.3, borderWidth: 2, pointRadius: 2, spanGaps: true,
  }));
  // 기준선 (모든 사양 공통 1134.7)
  datasets.push({
    label: '기준 1,134.7',
    data: months.map(() => 1134.7),
    borderColor: C.rose, borderWidth: 2, borderDash: [6, 4], pointRadius: 0, fill: false
  });
  makeLine('injTrend', $('str-inj-trend').getContext('2d'), months, datasets, {
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: '강도 (kgf)', font: { size: 10 } } }
    }
  });

  const specAvgs = specs.map(s => avg(rows.filter(r => r.spec === s).map(r => r.strength)));
  makeBar('injAvg', $('str-inj-avg').getContext('2d'), specs, [
    { label: '평균 강도', data: specAvgs, backgroundColor: PALETTE.slice(0, specs.length), borderRadius: 6, order: 2 },
    {
      label: '기준 1,134.7',
      data: specs.map(() => 1134.7),
      type: 'line',
      borderColor: '#dc2626',
      borderWidth: 3,
      borderDash: [6, 4],
      pointRadius: 7,
      pointHoverRadius: 9,
      pointBackgroundColor: '#dc2626',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      fill: false,
      order: 1,
      datalabels: {
        display: ctx => ctx.dataIndex === 0,
        color: '#dc2626',
        backgroundColor: '#fff',
        borderColor: '#dc2626',
        borderWidth: 1,
        borderRadius: 4,
        padding: { top: 3, bottom: 3, left: 6, right: 6 },
        font: { weight: 800, size: 12 },
        align: 'left',
        anchor: 'start',
        offset: 6,
        formatter: () => '기준 1,134.7'
      }
    },
  ], {
    scales: { y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: 'kgf', font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } },
    plugins: { legend: { display: true, position: 'top', align: 'end' }, datalabels: { display: false } }
  });

  const wAvgs = specs.map(s => avg(rows.filter(r => r.spec === s).map(r => r.weight)));
  makeBar('injWeight', $('str-inj-weight').getContext('2d'), specs, [
    { label: '평균 중량', data: wAvgs, backgroundColor: PALETTE.slice(0, specs.length), borderRadius: 6 }
  ], { scales: { y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: 'g', font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } } });

  const ok = rows.filter(r => judge(r) === 'OK').length;
  const ng = rows.filter(r => judge(r) === 'NG').length;
  makeDoughnut('injJudge', $('str-inj-judge-pie').getContext('2d'), ['OK', 'NG'], [ok, ng], [C.emerald, C.rose]);
}

function renderInjTable(rows) {
  $('str-inj-count').textContent = rows.length.toLocaleString();
  const sorted = [...rows].sort((a, b) => (b.measure_date || '').localeCompare(a.measure_date || ''));
  const tb = $('str-inj-table-body');
  if (!sorted.length) {
    tb.innerHTML = '<tr><td colspan="8" style="padding:40px;text-align:center;color:#8a8a9a">검색 결과가 없습니다</td></tr>';
    return;
  }
  tb.innerHTML = sorted.slice(0, 500).map(r => {
    const j = judge(r);
    const cls = j === 'NG' ? ' class="ng-row"' : '';
    return `<tr${cls}>
      <td>${escHtml(r.measure_date)}</td>
      <td>${escHtml(r.spec)}</td>
      <td>${escHtml(r.material || '')}</td>
      <td>${fmt(r.weight, 1)}</td>
      <td class="highlight">${fmt(r.strength, 1)}</td>
      <td>${fmt(r.threshold, 1)}</td>
      <td><span class="${j === 'NG' ? 'danger' : (j === 'OK' ? 'success' : '')}">${j || '-'}</span></td>
      <td><button onclick="deleteStrengthRow('strength_injection_base', ${r.id})" class="btn-del" title="삭제" style="background:none;border:1px solid var(--border);color:var(--accent-rose);padding:3px 8px;border-radius:6px;cursor:pointer;font-size:13px">🗑</button></td>
    </tr>`;
  }).join('');
}

function initInjDropdowns() {
  const specs = uniq(STATE.inj.map(r => r.spec)).sort();
  const sel = $('str-inj-spec');
  const cur = sel.value;
  sel.innerHTML = '<option value="">전체</option>' + specs.map(s => `<option value="${escHtml(s)}">${escHtml(s)}</option>`).join('');
  if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
  // datalist
  const dlSpec = $('dl-inj-spec');
  if (dlSpec) dlSpec.innerHTML = specs.map(s => `<option value="${escHtml(s)}">`).join('');
  const dlMat = $('dl-inj-material');
  if (dlMat) dlMat.innerHTML = uniq(STATE.inj.map(r => r.material)).sort().map(m => `<option value="${escHtml(m)}">`).join('');
}

function renderInj() {
  initInjDropdowns();
  const rows = getInjFiltered();
  renderInjKPI(rows);
  renderInjCharts(rows);
  renderInjTable(rows);
}

// ===== 불량 분석 리포트 =====
const DIE_SPEC_ORDER_REP = ['4000G', 'S-TILT', 'ITO-TILT', 'CH4800', 'T502F', '700 FLAT (RAW)', '700 FLAT (POL)'];

function renderLabReportDie() {
  const rows = STATE.die;
  const ngRows = rows.filter(r => judge(r) === 'NG');
  const ngRate = rows.length ? (ngRows.length / rows.length * 100) : 0;
  const specsAll = uniq(rows.map(r => r.spec));
  const sources = uniq(rows.map(r => r.source)).sort();

  $('rep-die-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">총 측정 건수</div><div class="kpi-value">${rows.length.toLocaleString()}</div><div class="kpi-change">사양 ${specsAll.length}종</div></div>
    <div class="kpi-card"><div class="kpi-label">부적합 건수</div><div class="kpi-value" style="background:linear-gradient(135deg,${ngRows.length>0?C.rose:C.emerald},#ffb347);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${ngRows.length}</div><div class="kpi-change ${ngRows.length>0?'up':'down'}">기준값 미달 측정</div></div>
    <div class="kpi-card"><div class="kpi-label">부적합률</div><div class="kpi-value">${ngRate.toFixed(2)}%</div><div class="kpi-change">전체 측정 대비</div></div>
    <div class="kpi-card"><div class="kpi-label">측정 주체</div><div class="kpi-value" style="font-size:18px">${sources.join(' · ')}</div><div class="kpi-change">${sources.length}개사</div></div>
  `;

  // 사양별 통계
  const specStats = {};
  rows.forEach(r => {
    if (!specStats[r.spec]) specStats[r.spec] = { total: 0, ng: 0 };
    specStats[r.spec].total++;
    if (judge(r) === 'NG') specStats[r.spec].ng++;
  });

  // TOP10 (강도가 기준 대비 가장 많이 미달한 순)
  const topNG = [...ngRows]
    .map(r => ({ ...r, _diff: r.strength - r.threshold }))
    .sort((a, b) => a._diff - b._diff)
    .slice(0, 10);
  $('rep-die-top10').innerHTML = topNG.length ? topNG.map((r, i) => {
    return `<tr class="ng-row">
      <td><span class="rct-rank-num ${i===0?'gold':i===1?'silver':i===2?'bronze':'normal'}">${i + 1}</span></td>
      <td>${escHtml(r.measure_date)}</td>
      <td>${escHtml(r.spec)}</td>
      <td>${escHtml(r.source)}</td>
      <td>${escHtml(r.mold_number || '-')}</td>
      <td><span class="danger">${fmt(r.strength, 1)}</span></td>
      <td>${fmt(r.threshold, 1)}</td>
      <td><span class="danger">${r._diff.toFixed(1)} kgf</span></td>
    </tr>`;
  }).join('') : '<tr><td colspan="8" style="padding:40px;text-align:center;color:#8a8a9a">전체 적합 — 부적합 측정값이 없습니다</td></tr>';

  // 월별 OK/NG 스택 추이
  const byMonth = {};
  rows.forEach(r => {
    const m = (r.measure_date || '').slice(0, 7);
    if (!m) return;
    if (!byMonth[m]) byMonth[m] = { ok: 0, ng: 0 };
    if (judge(r) === 'NG') byMonth[m].ng++; else byMonth[m].ok++;
  });
  const months = Object.keys(byMonth).sort();
  makeBar('repDieTrend', $('rep-die-trend').getContext('2d'), months, [
    { label: 'OK', data: months.map(m => byMonth[m].ok), backgroundColor: C.emerald, borderRadius: 4, stack: 's' },
    { label: 'NG', data: months.map(m => byMonth[m].ng), backgroundColor: C.rose, borderRadius: 4, stack: 's' },
  ], {
    scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: C.border } } },
    plugins: { legend: { display: true, position: 'top', align: 'end' }, datalabels: { display: false } }
  });

  // 사양별 NG율 (정의된 순서로)
  const specs = DIE_SPEC_ORDER_REP.filter(s => specStats[s])
    .concat(Object.keys(specStats).filter(s => !DIE_SPEC_ORDER_REP.includes(s)));
  makeBar('repDieSpec', $('rep-die-spec').getContext('2d'), specs, [
    { label: 'NG율 (%)', data: specs.map(s => specStats[s].total ? specStats[s].ng / specStats[s].total * 100 : 0), backgroundColor: PALETTE.slice(0, specs.length), borderRadius: 6 }
  ], {
    scales: { y: { beginAtZero: true, suggestedMax: 5, grid: { color: C.border } }, x: { grid: { display: false } } },
    plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: C.text, font: { weight: 700, size: 11 }, formatter: v => v.toFixed(2) + '%' } }
  });

  // 권장 조치
  const recs = [];
  topNG.slice(0, 3).forEach(r => {
    recs.push({ level: 'critical', text: `<b>${escHtml(r.measure_date)} ${escHtml(r.spec)} (${escHtml(r.source)})</b> — 강도 ${r.strength.toFixed(1)} (기준 ${r.threshold} 대비 ${r._diff.toFixed(1)} kgf 미달). 시험 재진행 / 잉곳 조성 점검 권장.` });
  });
  Object.entries(specStats).forEach(([sp, st]) => {
    if (st.total >= 4 && st.ng / st.total > 0.10) {
      recs.push({ level: 'warning', text: `사양 <b>${escHtml(sp)}</b> — NG율 ${(st.ng/st.total*100).toFixed(1)}% (${st.ng}/${st.total}건). 10% 초과로 모니터링 강화.` });
    }
  });
  // 시디즈 vs GCK 강도 차이 분석
  ['4000G', 'S-TILT'].forEach(sp => {
    const sidiz = avg(rows.filter(r => r.spec === sp && r.source === '시디즈').map(r => r.strength));
    const gck = avg(rows.filter(r => r.spec === sp && r.source === 'GCK').map(r => r.strength));
    if (sidiz !== null && gck !== null) {
      const diff = Math.abs(sidiz - gck);
      const pctDiff = diff / Math.min(sidiz, gck) * 100;
      if (pctDiff > 20) {
        recs.push({ level: 'info', text: `<b>${sp}</b> — 시디즈(${sidiz.toFixed(1)}) vs GCK(${gck.toFixed(1)}) 강도 차이 ${diff.toFixed(1)} kgf (${pctDiff.toFixed(1)}%). 측정 환경/방법 점검 권장.` });
      }
    }
  });
  if (recs.length === 0) recs.push({ level: 'info', text: '모든 측정값이 기준 이상 — 안정적 품질 유지 중.' });
  $('rep-die-rec').innerHTML = recs.map(r => `<div class="analysis-item"><div class="analysis-dot ${r.level}"></div><div>${r.text}</div></div>`).join('');
}

function renderLabReportInj() {
  const rows = STATE.inj;
  const ngRows = rows.filter(r => judge(r) === 'NG');
  const ngRate = rows.length ? (ngRows.length / rows.length * 100) : 0;
  const specs = uniq(rows.map(r => r.spec)).sort();

  $('rep-inj-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">총 측정 건수</div><div class="kpi-value">${rows.length.toLocaleString()}</div><div class="kpi-change">사양 ${specs.length}종</div></div>
    <div class="kpi-card"><div class="kpi-label">부적합 건수</div><div class="kpi-value" style="background:linear-gradient(135deg,${ngRows.length>0?C.rose:C.emerald},#ffb347);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${ngRows.length}</div><div class="kpi-change ${ngRows.length>0?'up':'down'}">기준 1,134.7 kgf 미달</div></div>
    <div class="kpi-card"><div class="kpi-label">부적합률</div><div class="kpi-value">${ngRate.toFixed(2)}%</div><div class="kpi-change">전체 측정 대비</div></div>
    <div class="kpi-card"><div class="kpi-label">평균 강도</div><div class="kpi-value">${fmt(avg(rows.map(r => r.strength)), 1)}</div><div class="kpi-change">단위: kgf</div></div>
  `;

  // 사양별 통계
  const specStats = {};
  rows.forEach(r => {
    if (!specStats[r.spec]) specStats[r.spec] = { total: 0, ng: 0 };
    specStats[r.spec].total++;
    if (judge(r) === 'NG') specStats[r.spec].ng++;
  });

  // TOP10 (강도 미달 순)
  const topNG = [...ngRows]
    .map(r => ({ ...r, _diff: r.strength - r.threshold }))
    .sort((a, b) => a._diff - b._diff)
    .slice(0, 10);
  $('rep-inj-top10').innerHTML = topNG.length ? topNG.map((r, i) => `
    <tr class="ng-row">
      <td><span class="rct-rank-num ${i===0?'gold':i===1?'silver':i===2?'bronze':'normal'}">${i + 1}</span></td>
      <td>${escHtml(r.measure_date)}</td>
      <td>${escHtml(r.spec)}</td>
      <td>${escHtml(r.material || '-')}</td>
      <td><span class="danger">${fmt(r.strength, 1)}</span></td>
      <td>${fmt(r.threshold, 1)}</td>
      <td><span class="danger">${r._diff.toFixed(1)} kgf</span></td>
    </tr>
  `).join('') : '<tr><td colspan="7" style="padding:40px;text-align:center;color:#8a8a9a">전체 적합 — 부적합 측정값이 없습니다</td></tr>';

  // 월별 OK/NG
  const byMonth = {};
  rows.forEach(r => {
    const m = (r.measure_date || '').slice(0, 7);
    if (!m) return;
    if (!byMonth[m]) byMonth[m] = { ok: 0, ng: 0 };
    if (judge(r) === 'NG') byMonth[m].ng++; else byMonth[m].ok++;
  });
  const months = Object.keys(byMonth).sort();
  makeBar('repInjTrend', $('rep-inj-trend').getContext('2d'), months, [
    { label: 'OK', data: months.map(m => byMonth[m].ok), backgroundColor: C.emerald, borderRadius: 4, stack: 's' },
    { label: 'NG', data: months.map(m => byMonth[m].ng), backgroundColor: C.rose, borderRadius: 4, stack: 's' },
  ], {
    scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: C.border } } },
    plugins: { legend: { display: true, position: 'top', align: 'end' }, datalabels: { display: false } }
  });

  // 사양별 NG율
  const specOrder = Object.keys(specStats).sort();
  makeBar('repInjSpec', $('rep-inj-spec').getContext('2d'), specOrder, [
    { label: 'NG율 (%)', data: specOrder.map(s => specStats[s].total ? specStats[s].ng / specStats[s].total * 100 : 0), backgroundColor: PALETTE.slice(0, specOrder.length), borderRadius: 6 }
  ], {
    scales: { y: { beginAtZero: true, suggestedMax: 5, grid: { color: C.border } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } },
    plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: C.text, font: { weight: 700, size: 11 }, formatter: v => v.toFixed(2) + '%' } }
  });

  // 권장 조치
  const recs = [];
  topNG.slice(0, 3).forEach(r => {
    recs.push({ level: 'critical', text: `<b>${escHtml(r.measure_date)} ${escHtml(r.spec)}</b> — 강도 ${r.strength.toFixed(1)} (기준 1,134.7 대비 ${r._diff.toFixed(1)} kgf 미달). 사출 조건/재료 점검 권장.` });
  });
  Object.entries(specStats).forEach(([sp, st]) => {
    if (st.total >= 4 && st.ng / st.total > 0.10) {
      recs.push({ level: 'warning', text: `사양 <b>${escHtml(sp)}</b> — NG율 ${(st.ng/st.total*100).toFixed(1)}% (${st.ng}/${st.total}건). 모니터링 강화.` });
    }
  });
  // 평균 강도가 기준 +30 미만인 사양 (안전 마진 부족)
  Object.keys(specStats).forEach(sp => {
    const sAvg = avg(rows.filter(r => r.spec === sp).map(r => r.strength));
    if (sAvg !== null && sAvg < 1134.7 + 30 && sAvg > 1134.7) {
      recs.push({ level: 'warning', text: `사양 <b>${escHtml(sp)}</b> — 평균 강도 ${sAvg.toFixed(1)} kgf, 기준 대비 안전마진 30 kgf 미만. 잠재 NG 위험.` });
    }
  });
  if (recs.length === 0) recs.push({ level: 'info', text: '모든 측정값이 기준 이상 — 안정적 품질 유지 중.' });
  $('rep-inj-rec').innerHTML = recs.map(r => `<div class="analysis-item"><div class="analysis-dot ${r.level}"></div><div>${r.text}</div></div>`).join('');
}

// ===== 입력 / 저장 / 삭제 =====
window.toggleStrengthForm = function (kind) {
  const el = $(`str-form-${kind}`);
  if (el) el.style.display = (!el.style.display || el.style.display === 'none') ? 'block' : 'none';
};

window.submitStrengthDie = async function () {
  const spec = $('form-die-spec').value;
  const data = {
    measure_date: $('form-die-date').value,
    spec, source: $('form-die-source').value,
    mold_number: $('form-die-mold').value.trim() || null,
    weight: parseFloat($('form-die-weight').value) || null,
    strength: parseFloat($('form-die-strength').value) || null,
    threshold: DIE_SPEC_THRESHOLDS[spec] || null,
  };
  if (!data.measure_date || !spec || !data.source) { alert('측정일/사양/측정 주체는 필수'); return; }
  await postStrength('strength_diecasting', data, 'die');
};

window.submitStrengthInj = async function () {
  const data = {
    measure_date: $('form-inj-date').value,
    spec: $('form-inj-spec').value.trim(),
    material: $('form-inj-material').value.trim() || null,
    weight: parseFloat($('form-inj-weight').value) || null,
    strength: parseFloat($('form-inj-strength').value) || null,
    threshold: 1134.7,
  };
  if (!data.measure_date || !data.spec) { alert('측정일/사양은 필수'); return; }
  await postStrength('strength_injection_base', data, 'inj');
};

async function postStrength(table, data, kind) {
  try {
    // 다이캐스팅: (date, spec, source) UNIQUE → 같은 키 입력 시 자동 갱신 (upsert)
    const preferUpsert = (table === 'strength_diecasting');
    const headers = preferUpsert
      ? { ...SB_HEADERS, 'Prefer': 'return=representation,resolution=merge-duplicates' }
      : { ...SB_HEADERS, 'Prefer': 'return=representation' };
    const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    alert(preferUpsert ? '✅ 저장 완료 (동일 키는 자동 갱신)' : '✅ 저장 완료');
    document.querySelectorAll(`#str-form-${kind} input:not([type="date"])`).forEach(i => i.value = '');
    await loadStrengthData(true);
    if (kind === 'die') renderDie(); else renderInj();
  } catch (e) {
    console.error(e); alert('❌ 저장 실패: ' + e.message);
  }
}

window.deleteStrengthRow = async function (table, id) {
  const pw = prompt('이 측정이력을 삭제하려면 비밀번호를 입력하세요:');
  if (pw === null) return;
  if (pw !== '1234') { alert('❌ 비밀번호가 일치하지 않습니다.\n삭제가 취소되었습니다.'); return; }
  if (!confirm('비밀번호 확인 완료. 정말 삭제하시겠습니까?')) return;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method: 'DELETE', headers: SB_HEADERS });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    await loadStrengthData(true);
    if (table === 'strength_diecasting') renderDie(); else renderInj();
  } catch (e) {
    console.error(e); alert('❌ 삭제 실패: ' + e.message);
  }
};

window.resetStrengthFilter = function (kind) {
  if (kind === 'die') {
    ['str-die-spec', 'str-die-source', 'str-die-mold', 'str-die-judge', 'str-die-from', 'str-die-to'].forEach(id => $(id).value = '');
    renderDie();
  } else {
    ['str-inj-spec', 'str-inj-judge', 'str-inj-from', 'str-inj-to'].forEach(id => $(id).value = '');
    renderInj();
  }
};

// ── SheetJS 스타일 헬퍼 ──────────────────────────────────────────
function _xlsBorder(rgb) {
  return { style: 'thin', color: { rgb: rgb || 'BFBFBF' } };
}
function _xlsApplyStyles(ws, aoa, opts) {
  // opts: { headerRows, thresholdColStep, thresholdColOffset, specMap, specs }
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const defaultBorder = { top: _xlsBorder(), bottom: _xlsBorder(), left: _xlsBorder(), right: _xlsBorder() };

  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) { ws[addr] = { v: '', t: 's' }; }

      const isHdr = R < (opts.headerRows || 1);
      const s = {
        alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
        border: defaultBorder,
      };

      if (isHdr) {
        s.fill = { patternType: 'solid', fgColor: { rgb: 'D9D9D9' } };
        s.font = { bold: true, sz: 10 };
      }

      // 월별 추이 시트: 기준값 컬럼 (빨간 글씨)
      if (!isHdr && opts.thresholdColStep && C > 0) {
        const colInGroup = (C - 1) % opts.thresholdColStep;
        if (colInGroup === opts.thresholdColOffset) {
          s.font = { bold: true, color: { rgb: 'FF0000' } };
          s.fill = { patternType: 'solid', fgColor: { rgb: 'FFF2F2' } };
        }
        // 기준값 미달 셀 (시디즈/GCK 컬럼만)
        if (colInGroup !== opts.thresholdColOffset && opts.specs && opts.specMap) {
          const specIdx = Math.floor((C - 1) / opts.thresholdColStep);
          const spec = opts.specs[specIdx];
          const threshold = spec ? opts.specMap[spec] : null;
          const val = ws[addr].v;
          if (threshold !== null && typeof val === 'number' && val < threshold) {
            s.font = { bold: true, color: { rgb: 'C00000' } };
            s.fill = { patternType: 'solid', fgColor: { rgb: 'FFCCCC' } };
          }
        }
      }

      ws[addr].s = s;
    }
  }
}

// ── 월별 강도 추이 시트 생성 ─────────────────────────────────────
function _buildTrendSheet(rows) {
  // 사양별 기준값 수집
  const specMap = {};
  rows.forEach(r => { if (r.spec && r.threshold != null) specMap[r.spec] = r.threshold; });
  const specs = Object.keys(specMap).sort();
  if (!specs.length) return null;

  // 월별 × 사양별 × 업체별 평균 집계
  const agg = {};   // agg[month][spec][source] = { sum, cnt }
  rows.forEach(r => {
    if (!r.measure_date || r.strength == null) return;
    const month = r.measure_date.slice(0, 7);
    const src   = r.source || '시디즈';
    if (!agg[month])            agg[month] = {};
    if (!agg[month][r.spec])    agg[month][r.spec] = {};
    if (!agg[month][r.spec][src]) agg[month][r.spec][src] = { sum: 0, cnt: 0 };
    agg[month][r.spec][src].sum += r.strength;
    agg[month][r.spec][src].cnt++;
  });

  const months = Object.keys(agg).sort();

  // 헤더 2행: 사양명(merged 3칸) / 시디즈·GCK·기준
  const hdr1 = ['측정월'];
  const hdr2 = [''];
  specs.forEach(sp => { hdr1.push(sp, '', ''); hdr2.push('시디즈', 'GCK', '기준(kgf)'); });

  const dataRows = months.map(mo => {
    const row = [mo];
    specs.forEach(sp => {
      const threshold = specMap[sp];
      const sdData = agg[mo]?.[sp]?.['시디즈'];
      const gkData = agg[mo]?.[sp]?.['GCK'];
      const sdAvg = sdData ? Math.round(sdData.sum / sdData.cnt * 10) / 10 : null;
      const gkAvg = gkData ? Math.round(gkData.sum / gkData.cnt * 10) / 10 : null;
      row.push(sdAvg, gkAvg, threshold);
    });
    return row;
  });

  const aoa = [hdr1, hdr2, ...dataRows];
  const ws  = XLSX.utils.aoa_to_sheet(aoa);

  // 열 너비
  ws['!cols'] = [{ wch: 10 }, ...specs.flatMap(() => [{ wch: 11 }, { wch: 11 }, { wch: 11 }])];

  // 셀 병합: 사양명 3칸
  ws['!merges'] = specs.map((_, i) => ({
    s: { r: 0, c: 1 + i * 3 },
    e: { r: 0, c: 1 + i * 3 + 2 },
  }));

  // 스타일 적용 (헤더 2행, 기준값 컬럼=3번째/그룹 offset=2)
  _xlsApplyStyles(ws, aoa, {
    headerRows: 2,
    thresholdColStep: 3,
    thresholdColOffset: 2,
    specs,
    specMap,
  });

  return ws;
}

// ── 로우데이터 시트 생성 (테두리·정렬·헤더 음영) ──────────────────
function _buildRawSheet(aoa, numCols) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = Array(numCols).fill({ wch: 16 });
  _xlsApplyStyles(ws, aoa, { headerRows: 1 });
  return ws;
}

// ── 자료변환 진입점 ───────────────────────────────────────────────
window.exportStrength = function (kind) {
  if (!window.XLSX) { alert('XLSX 라이브러리 미로드'); return; }
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let rows, header, mapper, filename;

  if (kind === 'die') {
    rows     = getDieFiltered();
    filename = `강도시험_다이캐스팅_${today}.xlsx`;
    header   = ['측정일', '사양', '측정 주체', '금형번호', '중량(g)', '강도(kgf)', '기준(kgf)', '판정'];
    mapper   = r => [r.measure_date, r.spec, r.source, r.mold_number, r.weight, r.strength, r.threshold, judge(r)];
  } else {
    rows     = getInjFiltered();
    filename = `강도시험_사출베이스_${today}.xlsx`;
    header   = ['측정일', '사양', '재료', '중량(g)', '강도(kgf)', '기준(kgf)', '판정'];
    mapper   = r => [r.measure_date, r.spec, r.material, r.weight, r.strength, r.threshold, judge(r)];
  }

  const sorted = rows.slice().sort((a, b) => (b.measure_date || '').localeCompare(a.measure_date || ''));
  const aoa    = [header, ...sorted.map(mapper)];
  const wb     = XLSX.utils.book_new();

  // 시트 1: 월별 강도 추이 (다이캐스팅만)
  if (kind === 'die') {
    const trendWs = _buildTrendSheet(rows);
    if (trendWs) XLSX.utils.book_append_sheet(wb, trendWs, '월별 강도 추이');
  }

  // 시트 2(다이) / 시트 1(사출): 로우데이터
  const rawWs = _buildRawSheet(aoa, header.length);
  XLSX.utils.book_append_sheet(wb, rawWs, '로우데이터');

  XLSX.writeFile(wb, filename);
};

// ===== GCK 파일 자동 업로드 =====
window.handleGckUpload = async function (event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm(`GCK 파일 "${file.name}"을 업로드하여 다이캐스팅 데이터에 반영하시겠습니까?\n(기존 GCK 데이터와 중복되는 일자는 추가됩니다)`)) {
    event.target.value = '';
    return;
  }
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const records = [];

    // S-Tilt 시트 → spec='S-TILT', threshold=750
    parseGckSheet(wb, 'Raw data (S-Tilt)', 'S-TILT', 750, records);
    // 4000G Renewal → spec='4000G', threshold=800
    parseGckSheet(wb, 'Raw data (4000G Renewal)', '4000G', 800, records);

    if (!records.length) {
      alert('파싱된 데이터가 없습니다. 파일 구조를 확인해주세요.');
      event.target.value = '';
      return;
    }

    // 신규/갱신 분류 (현재 DB 상태 기준)
    const existKeys = new Set(STATE.die
      .filter(r => r.source === 'GCK')
      .map(r => `${r.measure_date}|${r.spec}|${r.source}`));
    const newCount = records.filter(r => !existKeys.has(`${r.measure_date}|${r.spec}|${r.source}`)).length;
    const updateCount = records.length - newCount;

    if (!confirm(
      `GCK 파일 파싱 결과:\n\n` +
      `• 총 ${records.length}건\n` +
      `• 신규 추가: ${newCount}건\n` +
      `• 기존 갱신: ${updateCount}건 (이미 등록된 일자는 값 자동 갱신)\n\n` +
      `진행하시겠습니까?`
    )) {
      event.target.value = '';
      return;
    }

    // upsert: (measure_date, spec, source) UNIQUE 제약 기반으로 자동 병합
    const res = await fetch(`${SB_URL}/rest/v1/strength_diecasting`, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': 'return=minimal,resolution=merge-duplicates' },
      body: JSON.stringify(records),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    alert(`✅ GCK 업로드 완료\n\n• 신규 추가: ${newCount}건\n• 기존 갱신: ${updateCount}건\n\n동일 일자/사양은 최신 값으로 자동 갱신되었습니다.`);
    await loadStrengthData(true);
    renderDie();
  } catch (e) {
    console.error(e);
    alert('❌ GCK 업로드 실패: ' + e.message);
  }
  event.target.value = '';
};

function parseGckSheet(wb, sheetName, spec, threshold, out) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return;
  const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true, dateNF: 'yyyy-mm-dd' });
  // 헤더 R9 (index 8): "시험 날짜", "Sample #1", "Sample #2", "Sample #3", ..., "Weight #1", "Weight #2"
  // 데이터 R10 (index 9) 부터
  const headerRow = json[8] || [];
  const dateIdx = 0;
  const s1Idx = 1, s2Idx = 2, s3Idx = 3;
  // Weight 컬럼 위치 찾기
  let w1Idx = -1, w2Idx = -1;
  for (let i = 0; i < headerRow.length; i++) {
    const h = String(headerRow[i] || '');
    if (h.includes('Weight') && h.includes('#1')) w1Idx = i;
    if (h.includes('Weight') && h.includes('#2')) w2Idx = i;
  }
  for (let i = 9; i < json.length; i++) {
    const row = json[i];
    if (!row || row[dateIdx] == null) continue;
    let d = row[dateIdx];
    let dateStr;
    if (d instanceof Date) {
      // SheetJS cellDates:true는 UTC 자정 기준 Date를 생성 → 한국시간(UTC+9)에서 하루 앞으로 밀림
      // +1일 보정 후 UTC 메서드로 날짜 추출
      const fixed = new Date(d.getTime() + 86400000);
      dateStr = `${fixed.getUTCFullYear()}-${String(fixed.getUTCMonth()+1).padStart(2,'0')}-${String(fixed.getUTCDate()).padStart(2,'0')}`;
    } else if (typeof d === 'string') {
      const m = d.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
      if (!m) continue;
      dateStr = `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    } else continue;
    // 2026년 데이터만 (사용자 요청)
    if (!dateStr.startsWith('2026')) continue;

    // B,C 강도 평균 (사용자가 요청한 B/C 두 컬럼)
    const s1 = row[s1Idx], s2 = row[s2Idx];
    const strengths = [s1, s2].filter(v => v !== null && v !== undefined && !isNaN(v));
    const strength = strengths.length ? strengths.reduce((a,b)=>a+b,0)/strengths.length : null;

    // K,L Weight 평균
    let weight = null;
    if (w1Idx >= 0 && w2Idx >= 0) {
      const w1 = row[w1Idx], w2 = row[w2Idx];
      const weights = [w1, w2].filter(v => v !== null && v !== undefined && !isNaN(v));
      if (weights.length) weight = weights.reduce((a,b)=>a+b,0)/weights.length;
    }

    if (strength === null && weight === null) continue;
    out.push({
      measure_date: dateStr,
      spec, source: 'GCK',
      mold_number: null,
      weight, strength,
      threshold,
      note: 'GCK 파일 자동 업로드',
    });
  }
}

// ===== 진입점 =====
window.initLabSection = async function () {
  chartDefault();
  if (!STATE.loaded) {
    await loadStrengthData();
  }
  if (!STATE.bound) {
    ['str-die-spec', 'str-die-source', 'str-die-mold', 'str-die-judge', 'str-die-from', 'str-die-to'].forEach(id => $(id)?.addEventListener('input', renderDie));
    ['str-inj-spec', 'str-inj-judge', 'str-inj-from', 'str-inj-to'].forEach(id => $(id)?.addEventListener('input', renderInj));
    STATE.bound = true;
  }
  switchLabTab(STATE.currentTab);
};

})();
