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

// 2025년 평균 강도 (다이캐스팅, 시디즈 기준)
const DIE_2025_AVG = {
  '4000G': 987.0,
  'S-TILT': 813.7,
  'ITO-TILT': 1327.7,
  'CH4800': 559.4,
  'T502F': 1576.1,
  '700 FLAT (POL)': 1748.9,
  '700 FLAT (RAW)': 1776.1,
};

// 2025년 평균 강도 (사출 베이스) — DB 사양명 기준 (괄호 포함)
const INJ_2025_AVG = {
  '690 각 (WW)': 1827.2,
  '690 각 (BK)': 1532.5,
  '690 Flat (WW)': 1577.9,
  '690 Flat (BK)': 1679.6,
  '690 통합 베이스 (BK)': 1551.6,
  '690 각 GC1 (WW)': 1769.9,
  '690 각 GC1 (BK)': 1627.8,
  '690 Flat (SG)': 1791.4,
  '690 Flat (IG)': 1808.6,
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
  // 사양별 평균 강도 차트 — 그룹형 막대 (2025년 평균 왼쪽 + 평균 강도 오른쪽) + 기준선 + 레이블 겹침 방지
  const die2025Data = orderedSpecs.map(s => DIE_2025_AVG[s] ?? null);
  destroyChart('dieAvg');
  STATE.charts['dieAvg'] = new Chart($('str-die-avg').getContext('2d'), {
    type: 'bar',
    data: {
      labels: orderedSpecs,
      datasets: [
        {
          label: '2025년 평균',
          data: die2025Data,
          backgroundColor: C.amber + 'BB',
          borderRadius: 6,
          order: 2,
          categoryPercentage: 0.85,
          barPercentage: 0.9,
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: C.amber,
            font: { weight: 600, size: 9 },
            offset: 6,
            formatter: v => v != null ? v.toFixed(1) : ''
          }
        },
        {
          label: '평균 강도',
          data: specAvgs,
          backgroundColor: PALETTE.slice(0, orderedSpecs.length),
          borderRadius: 6,
          order: 3,
          categoryPercentage: 0.85,
          barPercentage: 0.9,
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: C.text,
            font: { weight: 700, size: 10 },
            offset: 6,
            formatter: v => v != null ? v.toFixed(1) : '-'
          }
        },
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
            align: (ctx) => {
              const thr = specThres[ctx.dataIndex];
              const barV = specAvgs[ctx.dataIndex];
              const v2025 = die2025Data[ctx.dataIndex];
              const maxV = Math.max(barV ?? 0, v2025 ?? 0);
              return (maxV > thr && Math.abs(maxV - thr) < 250) ? 'bottom' : 'top';
            },
            anchor: 'end',
            offset: 4,
            formatter: v => v ? v.toLocaleString() : ''
          }
        },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 28 } },
      scales: {
        y: { beginAtZero: false, grace: '12%', grid: { color: C.border }, title: { display: true, text: 'kgf', font: { size: 10 } } },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: {
          display: true, position: 'top', align: 'end',
          labels: { boxWidth: 10, font: { size: 10 } }
        },
        datalabels: { display: false }
      }
    }
  });

  // 시디즈 vs GCK 강도 비교 (4000G / S-TILT) — 막대 + 기준선 + OK/NG 색상
  const compareSpecs = ['4000G', 'S-TILT'];
  const _cmpSidizData = compareSpecs.map(sp => avg(rows.filter(r => r.spec === sp && r.source === '시디즈').map(r => r.strength)));
  const _cmpGckData   = compareSpecs.map(sp => avg(rows.filter(r => r.spec === sp && r.source === 'GCK').map(r => r.strength)));
  const _cmpThres     = compareSpecs.map(sp => DIE_SPEC_THRESHOLDS[sp] || 0);
  // 기준 미달(NG)이면 빨간색, 기준 이상(OK)이면 원색 유지
  const _cmpSidizColors = compareSpecs.map((sp, i) =>
    (_cmpSidizData[i] !== null && _cmpSidizData[i] >= _cmpThres[i]) ? C.blue : '#FF4C6A');
  const _cmpGckColors = compareSpecs.map((sp, i) =>
    (_cmpGckData[i] !== null && _cmpGckData[i] >= _cmpThres[i]) ? C.amber : '#FF4C6A');
  makeBar('dieCompareStrength', $('str-die-compare-strength').getContext('2d'), compareSpecs, [
    { label: '시디즈', data: _cmpSidizData, backgroundColor: _cmpSidizColors, borderRadius: 6 },
    { label: 'GCK',   data: _cmpGckData,   backgroundColor: _cmpGckColors,   borderRadius: 6 },
    {
      label: '기준',
      data: _cmpThres,
      type: 'line',
      borderColor: '#dc2626', borderWidth: 2, borderDash: [6, 4],
      pointRadius: 7, pointHoverRadius: 9,
      pointBackgroundColor: '#dc2626', pointBorderColor: '#fff', pointBorderWidth: 2,
      fill: false, order: 0,
      datalabels: {
        display: true, color: '#dc2626',
        backgroundColor: '#fff', borderColor: '#dc2626', borderWidth: 1, borderRadius: 4,
        padding: { top: 2, bottom: 2, left: 5, right: 5 },
        font: { weight: 800, size: 11 },
        align: 'top', anchor: 'end', offset: 4,
        formatter: v => v ? v.toLocaleString() : ''
      }
    },
  ], {
    scales: {
      y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: '강도 (kgf)', font: { size: 10 } } },
      x: { grid: { display: false } }
    },
    plugins: {
      legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 11 } } },
      datalabels: { display: true, anchor: 'end', align: 'top', color: C.text, font: { weight: 700, size: 11 }, formatter: v => v ? v.toFixed(1) : '-' }
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
      datalabels: { display: true, anchor: 'end', align: 'top', color: C.text, font: { weight: 700, size: 11 }, formatter: v => v ? v.toFixed(1) : '-' }
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
  const INJ_THR = 1134.7;
  const injThres = specs.map(() => INJ_THR);
  // 사양별 평균 강도 차트 — 그룹형 막대 (2025년 평균 왼쪽 + 평균 강도 오른쪽) + 기준선 + 레이블 겹침 방지
  const inj2025Data = specs.map(s => INJ_2025_AVG[s] ?? null);
  destroyChart('injAvg');
  STATE.charts['injAvg'] = new Chart($('str-inj-avg').getContext('2d'), {
    type: 'bar',
    data: {
      labels: specs,
      datasets: [
        {
          label: '2025년 평균',
          data: inj2025Data,
          backgroundColor: C.amber + 'BB',
          borderRadius: 6,
          order: 2,
          categoryPercentage: 0.85,
          barPercentage: 0.9,
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: C.amber,
            font: { weight: 600, size: 9 },
            offset: 6,
            formatter: v => v != null ? v.toFixed(1) : ''
          }
        },
        {
          label: '평균 강도',
          data: specAvgs,
          backgroundColor: PALETTE.slice(0, specs.length),
          borderRadius: 6,
          order: 3,
          categoryPercentage: 0.85,
          barPercentage: 0.9,
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: C.text,
            font: { weight: 700, size: 10 },
            offset: 6,
            formatter: v => v != null ? v.toFixed(1) : '-'
          }
        },
        {
          label: '기준 1,134.7',
          data: injThres,
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
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 28 } },
      scales: {
        y: { beginAtZero: false, grace: '12%', grid: { color: C.border }, title: { display: true, text: 'kgf', font: { size: 10 } } },
        x: { grid: { display: false }, ticks: { font: { size: 10 } } }
      },
      plugins: {
        legend: {
          display: true, position: 'top', align: 'end',
          labels: { boxWidth: 10, font: { size: 10 } }
        },
        datalabels: { display: false }
      }
    }
  });

  const wAvgs = specs.map(s => avg(rows.filter(r => r.spec === s).map(r => r.weight)));
  makeBar('injWeight', $('str-inj-weight').getContext('2d'), specs, [
    { label: '평균 중량', data: wAvgs, backgroundColor: PALETTE.slice(0, specs.length), borderRadius: 6 }
  ], {
    scales: { y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: 'g', font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } },
    plugins: { legend: { display: false }, datalabels: { display: true, anchor: 'end', align: 'top', color: C.text, font: { weight: 700, size: 10 }, formatter: v => v ? v.toFixed(1) : '-' } }
  });

  // 기준 부적합 비율 차트 제거 (레이아웃 개선)
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

// ── ExcelJS 공통 스타일 헬퍼 ─────────────────────────────────────
const _EJS_BORDER = { style: 'thin', color: { argb: 'FFBFBFBF' } };
const _EJS_BORDER_ALL = { top: _EJS_BORDER, bottom: _EJS_BORDER, left: _EJS_BORDER, right: _EJS_BORDER };

function _ejsStyleCell(cell, opts) {
  // opts: isHdr, bold, redFont, pinkBg, redBg
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border    = _EJS_BORDER_ALL;
  const o = opts || {};
  if (o.isHdr) {
    cell.font = { name: 'Arial', size: 10, bold: true,
      color: o.redFont ? { argb: 'FFCC0000' } : { argb: 'FF000000' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  } else {
    cell.font = { name: 'Arial', size: 10, bold: !!o.bold,
      color: o.redFont ? { argb: 'FFCC0000' } : { argb: 'FF000000' } };
    if (o.pinkBg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2F2' } };
    if (o.redBg)  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
    if (o.grayBg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
  }
}

// ── 로우데이터 시트 (ExcelJS) ─────────────────────────────────────
function _buildRawSheetEJS(wb, header, data) {
  const ws = wb.addWorksheet('로우데이터');
  // 열 너비 (측정일|사양|주체|금형|중량|강도|기준|판정)
  const widths = [14, 14, 12, 12, 10, 10, 10, 8];
  header.forEach((_, i) => { ws.getColumn(i + 1).width = widths[i] || 14; });

  // 헤더 행
  const hdrRow = ws.addRow(header);
  hdrRow.height = 22;
  header.forEach((_, i) => _ejsStyleCell(hdrRow.getCell(i + 1), { isHdr: true }));

  // 데이터 행
  data.forEach(rowData => {
    const row = ws.addRow(rowData.map(v => v == null ? '' : v));
    row.height = 18;
    header.forEach((_, i) => _ejsStyleCell(row.getCell(i + 1)));
  });
}

// ── 차트 이미지 생성 (Chart.js 캔버스 → base64 PNG) ─────────────
async function _createSpecChartImage(spec, labels, sdValues, gkValues, threshold) {
  const W = 680, H = 340;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  canvas.style.cssText = 'position:absolute;visibility:hidden;top:0;left:0;';
  document.body.appendChild(canvas);

  // 데이터셋 구성
  const datasets = [
    {
      label: spec,
      data: sdValues,
      borderColor: '#3478c5',
      backgroundColor: 'rgba(52,120,197,0.07)',
      borderWidth: 2.5,
      pointRadius: 5,
      pointBackgroundColor: '#3478c5',
      tension: 0.35,
      spanGaps: true,
      fill: false,
    },
    {
      label: `기준 ${threshold}`,
      data: labels.map(() => threshold),
      borderColor: '#FF7043',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [7, 4],
      pointRadius: 0,
      tension: 0,
      fill: false,
    },
  ];
  // GCK 라인 (4000G, S-TILT만)
  if (gkValues) {
    datasets.splice(1, 0, {
      label: 'GCK',
      data: gkValues,
      borderColor: '#E53935',
      backgroundColor: 'transparent',
      borderWidth: 2.5,
      pointRadius: 5,
      pointBackgroundColor: '#E53935',
      tension: 0.35,
      spanGaps: true,
      fill: false,
    });
  }

  const chart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: false,
      animation: false,
      layout: { padding: { top: 10, right: 24, bottom: 10, left: 12 } },
      plugins: {
        title: {
          display: true,
          text: spec,
          font: { size: 14, weight: 'bold' },
          color: '#222',
          padding: { bottom: 8 },
        },
        legend: { position: 'top', align: 'end',
          labels: { boxWidth: 16, font: { size: 11 } } },
        datalabels: { display: false }, // ChartDataLabels 전역 플러그인 비활성화
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { color: '#555', font: { size: 11 } },
        },
        y: {
          title: { display: true, text: '강도 (kgf)', color: '#666', font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { color: '#555', font: { size: 11 } },
        },
      },
    },
  });

  await new Promise(r => setTimeout(r, 80)); // 렌더링 대기

  // 흰색 배경 합성 (차트는 기본 투명 배경)
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  const b64 = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
  chart.destroy();
  document.body.removeChild(canvas);
  return b64;
}

// ── 월별 강도 추이 시트 (데이터 테이블 + 사양별 차트 이미지, ExcelJS) ─────────────
async function _buildTrendSheetEJS(wb, rows) {
  // 사양 표시 순서 / GCK 포함 여부 / 열 수 (GCK 있으면 3열, 없으면 2열)
  const SPEC_DEF = [
    { key: '4000G',      gck: true,  label: '4000G',         cols: 3 },
    { key: 'S-TILT',     gck: true,  label: 'S-TILT',        cols: 3 },
    { key: 'OTOTILT',    gck: false, label: 'ITO-TILT',       cols: 2 },
    { key: 'CH4800',     gck: false, label: 'CH4800',         cols: 2 },
    { key: 'T502F',      gck: false, label: 'T502F',          cols: 2 },
    { key: '700FLATRAW', gck: false, label: '700 FLAT (RAW)', cols: 2 },
    { key: '700FLATPOL', gck: false, label: '700 FLAT (POL)', cols: 2 },
  ];
  function normSpec(s) { return String(s).replace(/[\s\-().]/g, '').toUpperCase(); }

  // DB 사양별 기준값
  const specMap = {};
  rows.forEach(r => { if (r.spec && r.threshold != null) specMap[r.spec] = r.threshold; });
  if (!Object.keys(specMap).length) return;

  // 순서에 맞게 DB 사양 매핑
  const orderedSpecs = [];
  SPEC_DEF.forEach(def => {
    const dbSpec = Object.keys(specMap).find(s =>
      normSpec(s) === normSpec(def.label) || normSpec(s) === normSpec(def.key));
    if (dbSpec) orderedSpecs.push({
      spec: dbSpec, gck: def.gck, label: def.label,
      cols: def.cols, threshold: specMap[dbSpec],
    });
  });
  // 목록에 없는 사양은 뒤에 추가 (GCK 없음)
  Object.keys(specMap).forEach(sp => {
    if (!orderedSpecs.find(o => o.spec === sp))
      orderedSpecs.push({ spec: sp, gck: false, label: sp, cols: 2, threshold: specMap[sp] });
  });

  // 월별 × 사양 × 업체 집계
  const agg = {};
  rows.forEach(r => {
    if (!r.measure_date || r.strength == null) return;
    const mo  = r.measure_date.slice(0, 7);
    const src = r.source || '시디즈';
    if (!agg[mo]) agg[mo] = {};
    if (!agg[mo][r.spec]) agg[mo][r.spec] = {};
    if (!agg[mo][r.spec][src]) agg[mo][r.spec][src] = { sum: 0, cnt: 0 };
    agg[mo][r.spec][src].sum += r.strength;
    agg[mo][r.spec][src].cnt++;
  });
  // 데이터 있는 월뿐 아니라, 해당 연도 1~12월 전체 표시 (빈 행 포함)
  const dataMonths = Object.keys(agg).sort();
  if (!dataMonths.length) return;
  const year = dataMonths[0].slice(0, 4);
  const months = Array.from({ length: 12 }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, '0')}`
  );

  const ws = wb.addWorksheet('월별 강도 추이');
  ws.views = [{ showGridLines: false }];

  // ─── 열 너비 + 사양별 1-based 시작 열 기록 ─────────────────────
  // 차트 433px가 겹치지 않으려면: 3열 사양 ≥ 21자/열, 2열 사양 ≥ 32자/열
  ws.getColumn(1).width = 12; // A (측정월/그래프)
  const specColStarts = []; // 각 사양의 1-based 시작 열
  let col1 = 2; // 1-based 현재 열 추적
  orderedSpecs.forEach(sp => {
    specColStarts.push(col1);
    const colW = sp.cols === 3 ? 21 : 32; // 3열=21자(≈462px), 2열=32자(≈453px)
    for (let i = 0; i < sp.cols; i++) ws.getColumn(col1 + i).width = colW;
    col1 += sp.cols;
  });

  // ─── 헤더 행 1: 측정월(A1:A2 병합) + 사양명 병합 ─────────
  ws.getRow(1).height = 22;
  ws.mergeCells(1, 1, 2, 1);
  const mo1 = ws.getCell(1, 1);
  mo1.value = '측정월';
  _ejsStyleCell(mo1, { isHdr: true });

  orderedSpecs.forEach((sp, si) => {
    const sc = specColStarts[si], ec = sc + sp.cols - 1;
    if (sp.cols > 1) ws.mergeCells(1, sc, 1, ec);
    const hc = ws.getCell(1, sc);
    hc.value = sp.label;
    _ejsStyleCell(hc, { isHdr: true });
    // 병합 내 나머지 셀 배경·border 유지 (Excel 렌더링 호환)
    for (let c = sc + 1; c <= ec; c++) {
      ws.getCell(1, c).border = _EJS_BORDER_ALL;
      ws.getCell(1, c).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    }
  });

  // ─── 헤더 행 2: 서브 헤더 (기준(kgf) 포함 모두 검정 굵게) ────
  ws.getRow(2).height = 20;
  orderedSpecs.forEach((sp, si) => {
    const subHdrs = sp.gck
      ? ['시디즈', 'GCK', '기준(kgf)']
      : ['시디즈', '기준(kgf)'];
    subHdrs.forEach((h, i) => {
      const cell = ws.getCell(2, specColStarts[si] + i);
      cell.value = h;
      _ejsStyleCell(cell, { isHdr: true }); // 기준(kgf)도 검정 굵게 (redFont 없음)
    });
  });

  // ─── 데이터 행 ──────────────────────────────────────────
  months.forEach((mo, mi) => {
    const rowNum = 3 + mi;
    ws.getRow(rowNum).height = 18;

    const moCell = ws.getCell(rowNum, 1);
    moCell.value = mo;
    _ejsStyleCell(moCell);

    orderedSpecs.forEach((sp, si) => {
      const spAgg = agg[mo] && agg[mo][sp.spec];
      const sdRaw = spAgg && spAgg['시디즈'];
      const gkRaw = spAgg && spAgg['GCK'];
      const sdVal = sdRaw ? Math.round(sdRaw.sum / sdRaw.cnt * 10) / 10 : null;
      const gkVal = gkRaw ? Math.round(gkRaw.sum / gkRaw.cnt * 10) / 10 : null;
      const thr   = sp.threshold;
      let c = specColStarts[si];

      // 시디즈 (미달 시 빨간 배경)
      const sdCell = ws.getCell(rowNum, c);
      sdCell.value = sdVal !== null ? sdVal : '';
      _ejsStyleCell(sdCell, sdVal !== null && sdVal < thr ? { redBg: true } : {});
      c++;

      // GCK (해당 사양만, 미달 시 빨간 배경)
      if (sp.gck) {
        const gkCell = ws.getCell(rowNum, c);
        gkCell.value = gkVal !== null ? gkVal : '';
        _ejsStyleCell(gkCell, gkVal !== null && gkVal < thr ? { redBg: true } : {});
        c++;
      }

      // 기준값: 검정 굵게 + 연회색 배경 (사용자 요청)
      const thrCell = ws.getCell(rowNum, c);
      thrCell.value = thr;
      _ejsStyleCell(thrCell, { bold: true, grayBg: true });
    });
  });

  // ─── 차트 영역: 사양별 병합 + 이미지 (참고파일 기준 배치) ────
  // 참고파일: 차트 433×254px, 모두 같은 행(테이블 바로 아래), 각 사양 시작 열에 배치
  const CHART_W  = 680, CHART_H  = 340; // 캔버스 렌더 크기 (고화질)
  const DISP_W   = 433, DISP_H   = 254; // 엑셀 표시 크기 (EMU 4125600×2422800)
  const CHART_ROWS = 13;                // 차트 영역 행 수 (254px ÷ 20px/행 ≈ 13)
  const chartR1  = 3 + months.length;  // 1-based 차트 시작 행
  const chartR2  = chartR1 + CHART_ROWS - 1;

  // A열: '그래프' 레이블 (측정월 헤더와 동일한 회색 음영)
  ws.mergeCells(chartR1, 1, chartR2, 1);
  const aChartCell = ws.getCell(chartR1, 1);
  aChartCell.value = '그래프';
  _ejsStyleCell(aChartCell, { isHdr: true }); // 측정월과 동일 스타일(회색 배경+검정 굵게)

  for (let si = 0; si < orderedSpecs.length; si++) {
    const { spec, gck, threshold, label } = orderedSpecs[si];
    const sc1 = specColStarts[si];
    const ec1 = sc1 + orderedSpecs[si].cols - 1;

    // 사양 열 병합 (참고파일과 동일한 구조)
    ws.mergeCells(chartR1, sc1, chartR2, ec1);
    ws.getCell(chartR1, sc1).border = _EJS_BORDER_ALL;

    // 차트 생성
    const sdValues = months.map(mo => {
      const d = agg[mo] && agg[mo][spec] && agg[mo][spec]['시디즈'];
      return d ? Math.round(d.sum / d.cnt * 10) / 10 : null;
    });
    const gkValues = gck ? months.map(mo => {
      const d = agg[mo] && agg[mo][spec] && agg[mo][spec]['GCK'];
      return d ? Math.round(d.sum / d.cnt * 10) / 10 : null;
    }) : null;

    const imgB64 = await _createSpecChartImage(label, months, sdValues, gkValues, threshold);
    const imgId  = wb.addImage({ base64: imgB64, extension: 'png' });
    // tl: 0-based (1-based sc1 → sc1-1), 참고파일과 동일한 col/row별 배치
    ws.addImage(imgId, {
      tl: { col: sc1 - 1 + 0.05, row: chartR1 - 1 + 0.1 },
      ext: { width: DISP_W, height: DISP_H },
    });
  }
}

// ── 사출 베이스 월별 강도 추이 시트 ────────────────────────────────
async function _buildInjTrendSheetEJS(wb, rows) {
  const INJ_THR = 1134.7;

  // 사양 목록 (데이터 있는 것만)
  const specSet = uniq(rows.map(r => r.spec).filter(Boolean)).sort();
  if (!specSet.length) return;

  // 월별 × 사양 집계 (시디즈 단일 업체)
  const agg = {};
  rows.forEach(r => {
    if (!r.measure_date || r.strength == null) return;
    const mo = r.measure_date.slice(0, 7);
    if (!agg[mo]) agg[mo] = {};
    if (!agg[mo][r.spec]) agg[mo][r.spec] = { sum: 0, cnt: 0 };
    agg[mo][r.spec].sum += r.strength;
    agg[mo][r.spec].cnt++;
  });

  const dataMonths = Object.keys(agg).sort();
  if (!dataMonths.length) return;
  const year = dataMonths[0].slice(0, 4);
  const months = Array.from({ length: 12 }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, '0')}`
  );

  const ws = wb.addWorksheet('월별 강도 추이');
  ws.views = [{ showGridLines: false }];

  // 열 너비: A(측정월) + 사양별 2열(시디즈·기준)
  ws.getColumn(1).width = 12;
  const specColStarts = [];
  let col1 = 2;
  specSet.forEach(() => {
    specColStarts.push(col1);
    ws.getColumn(col1).width = 32;     // 시디즈
    ws.getColumn(col1 + 1).width = 32; // 기준(kgf) — 2열 합계 ≥ 433px(차트 폭) 확보
    col1 += 2;
  });

  // 헤더 행 1: 측정월 병합 + 사양명
  ws.getRow(1).height = 22;
  ws.mergeCells(1, 1, 2, 1);
  const mo1 = ws.getCell(1, 1);
  mo1.value = '측정월'; _ejsStyleCell(mo1, { isHdr: true });

  specSet.forEach((sp, si) => {
    const sc = specColStarts[si];
    ws.mergeCells(1, sc, 1, sc + 1);
    const hc = ws.getCell(1, sc);
    hc.value = sp; _ejsStyleCell(hc, { isHdr: true });
    ws.getCell(1, sc + 1).border = _EJS_BORDER_ALL;
    ws.getCell(1, sc + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  });

  // 헤더 행 2: 서브헤더
  ws.getRow(2).height = 20;
  specSet.forEach((_, si) => {
    const sc = specColStarts[si];
    ['시디즈', '기준(kgf)'].forEach((h, i) => {
      const cell = ws.getCell(2, sc + i);
      cell.value = h; _ejsStyleCell(cell, { isHdr: true });
    });
  });

  // 데이터 행
  months.forEach((mo, mi) => {
    const rowNum = 3 + mi;
    ws.getRow(rowNum).height = 18;
    const moCell = ws.getCell(rowNum, 1);
    moCell.value = mo; _ejsStyleCell(moCell);

    specSet.forEach((sp, si) => {
      const sc = specColStarts[si];
      const d  = agg[mo] && agg[mo][sp];
      const v  = d ? Math.round(d.sum / d.cnt * 10) / 10 : null;
      const sdCell = ws.getCell(rowNum, sc);
      sdCell.value = v !== null ? v : '';
      _ejsStyleCell(sdCell, v !== null && v < INJ_THR ? { redBg: true } : {});
      const thrCell = ws.getCell(rowNum, sc + 1);
      thrCell.value = INJ_THR; _ejsStyleCell(thrCell, { bold: true, grayBg: true });
    });
  });

  // 차트 이미지 (사양별)
  const DISP_W = 433, DISP_H = 254;
  const CHART_ROWS = 13;
  const chartR1 = 3 + months.length;
  const chartR2 = chartR1 + CHART_ROWS - 1;

  ws.mergeCells(chartR1, 1, chartR2, 1);
  const aChartCell = ws.getCell(chartR1, 1);
  aChartCell.value = '그래프'; _ejsStyleCell(aChartCell, { isHdr: true });

  for (let si = 0; si < specSet.length; si++) {
    const sp = specSet[si];
    const sc = specColStarts[si];
    ws.mergeCells(chartR1, sc, chartR2, sc + 1);
    ws.getCell(chartR1, sc).border = _EJS_BORDER_ALL;

    const sdValues = months.map(mo => {
      const d = agg[mo] && agg[mo][sp];
      return d ? Math.round(d.sum / d.cnt * 10) / 10 : null;
    });
    const imgB64 = await _createSpecChartImage(sp, months, sdValues, null, INJ_THR);
    const imgId  = wb.addImage({ base64: imgB64, extension: 'png' });
    ws.addImage(imgId, {
      tl: { col: sc - 1 + 0.05, row: chartR1 - 1 + 0.1 },
      ext: { width: DISP_W, height: DISP_H },
    });
  }
}

// ── 자료변환 진입점 (ExcelJS) ─────────────────────────────────────
window.exportStrength = async function (kind) {
  if (!window.ExcelJS) { alert('ExcelJS 라이브러리 미로드'); return; }
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

  try {
    const wb     = new ExcelJS.Workbook();
    const sorted = rows.slice().sort((a, b) => (b.measure_date || '').localeCompare(a.measure_date || ''));

    // 시트 1: 월별 강도 추이
    if (kind === 'die') await _buildTrendSheetEJS(wb, rows);
    else await _buildInjTrendSheetEJS(wb, rows);

    // 시트 2(다이) / 2(사출): 로우데이터
    _buildRawSheetEJS(wb, header, sorted.map(mapper));

    // 다운로드
    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('exportStrength 오류:', e);
    alert('자료변환 실패: ' + e.message);
  }
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

// ── 다이캐스팅 강도 시험 보고서 ──────────────────────────────────────

// 분석 권장사항 배열 반환 (현재 필터 rows 기준)
function _getDieDiagRecs(rows) {
  const ngRows = rows.filter(r => judge(r) === 'NG');
  const specStats = {};
  rows.forEach(r => {
    if (!specStats[r.spec]) specStats[r.spec] = { total: 0, ng: 0 };
    specStats[r.spec].total++;
    if (judge(r) === 'NG') specStats[r.spec].ng++;
  });
  const topNG = [...ngRows]
    .map(r => ({ ...r, _diff: r.strength - r.threshold }))
    .sort((a, b) => a._diff - b._diff)
    .slice(0, 3);

  const recs = [];
  topNG.forEach(r => {
    recs.push({ level: 'critical', text: `<b>${escHtml(r.measure_date)} ${escHtml(r.spec)} (${escHtml(r.source)})</b> — 강도 ${r.strength.toFixed(1)} kgf (기준 ${r.threshold} kgf 대비 ${Math.abs(r._diff).toFixed(1)} kgf 미달). 시험 재진행 / 잉곳 조성 점검 권장.` });
  });
  Object.entries(specStats).forEach(([sp, st]) => {
    if (st.total >= 4 && st.ng / st.total > 0.10) {
      recs.push({ level: 'warning', text: `사양 <b>${escHtml(sp)}</b> — NG율 ${(st.ng/st.total*100).toFixed(1)}% (${st.ng}/${st.total}건). 10% 초과, 모니터링 강화 필요.` });
    }
  });
  ['4000G', 'S-TILT'].forEach(sp => {
    const sidiz = avg(rows.filter(r => r.spec === sp && r.source === '시디즈').map(r => r.strength));
    const gck   = avg(rows.filter(r => r.spec === sp && r.source === 'GCK').map(r => r.strength));
    if (sidiz !== null && gck !== null) {
      const diff = Math.abs(sidiz - gck);
      const pct  = diff / Math.min(sidiz, gck) * 100;
      if (pct > 20) {
        recs.push({ level: 'info', text: `<b>${escHtml(sp)}</b> — 시디즈(${sidiz.toFixed(1)}) vs GCK(${gck.toFixed(1)}) 강도 차이 ${diff.toFixed(1)} kgf (${pct.toFixed(1)}%). 측정 환경·방법 점검 권장.` });
      }
    }
  });
  if (recs.length === 0) recs.push({ level: 'info', text: '모든 측정값이 기준 이상 — 안정적 품질 유지 중.' });
  return recs;
}

// 전체 데이터(STATE.die)로 오프스크린 추이 차트 생성 → 흰 배경 PNG DataURL
// 보고서 삽입 전용 — 필터 기간과 무관하게 1월~현재 전체 기간을 표시
function _createDieTrendImageFull() {
  const allRows = STATE.die;
  if (!allRows || !allRows.length) return null;

  const months  = uniq(allRows.map(r => (r.measure_date || '').slice(0, 7))).sort();
  const specs   = uniq(allRows.map(r => r.spec));
  const datasets = [];
  specs.forEach((spec, i) => {
    datasets.push({
      label: spec,
      data: months.map(m => avg(
        allRows.filter(r => (r.measure_date||'').slice(0,7) === m && r.spec === spec)
               .map(r => r.strength)
      )),
      borderColor: PALETTE[i % PALETTE.length],
      backgroundColor: PALETTE[i % PALETTE.length] + '20',
      tension: 0.3, borderWidth: 2, pointRadius: 3, spanGaps: true,
    });
  });

  // 오프스크린 캔버스에 Chart.js 렌더 (animation:false → 동기)
  const canvas = document.createElement('canvas');
  canvas.width = 900; canvas.height = 380;
  const tmpChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels: months, datasets },
    options: {
      responsive: false, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: false, grid: { color: C.border },
             title: { display: true, text: '강도 (kgf)', font: { size: 10 } } }
      },
      plugins: {
        legend: { position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 10 } } },
        datalabels: { display: false }
      }
    }
  });

  // 흰 배경 합성
  const off = document.createElement('canvas');
  off.width = canvas.width; off.height = canvas.height;
  const offCtx = off.getContext('2d');
  offCtx.fillStyle = '#ffffff';
  offCtx.fillRect(0, 0, off.width, off.height);
  offCtx.drawImage(canvas, 0, 0);
  tmpChart.destroy();

  return off.toDataURL('image/png');
}

// 캔버스 → 흰 배경 PNG DataURL
function _captureChart(canvasId) {
  const c = document.getElementById(canvasId);
  if (!c) return null;
  const off = document.createElement('canvas');
  off.width = c.width; off.height = c.height;
  const ctx = off.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, off.width, off.height);
  ctx.drawImage(c, 0, 0);
  return off.toDataURL('image/png');
}

window.generateDieReport = function () {
  const filtered = getDieFiltered();
  const from = $('str-die-from').value;
  const to   = $('str-die-to').value;
  const period = from && to ? `${from} ~ ${to}` : from ? `${from} 이후` : to ? `~ ${to}` : '전체 기간';

  // 시료명: 현재 필터 기준 사양 목록 (지정 순서)
  const specSet = new Set(filtered.map(r => r.spec).filter(Boolean));
  const specNames = DIE_SPEC_ORDER_REP.filter(s => specSet.has(s))
    .concat([...specSet].filter(s => !DIE_SPEC_ORDER_REP.includes(s)))
    .join(', ') || '전체';

  // ── 분석 결과: ':' 형식으로 변환 ────────────────────
  const recs = _getDieDiagRecs(filtered);
  const recItems = recs.map(r => {
    const prefix = r.level === 'critical'
      ? '<span style="color:red;font-weight:bold;">[주의]</span> '
      : r.level === 'warning'
      ? '<span style="color:#CC7700;font-weight:bold;">[경고]</span> '
      : '';
    return `<p style="margin: 3px 0 3px 15px; font-size: 10pt;">: ${prefix}${r.text}</p>`;
  }).join('\n');

  // ── 차트 이미지 캡쳐 ─────────────────────────────
  // 추이 차트: STATE.die 전체 데이터 오프스크린 재생성 (필터 기간 무관)
  const imgTrend   = _createDieTrendImageFull();
  const imgAvg     = _captureChart('str-die-avg');
  const imgCompare = _captureChart('str-die-compare-strength');

  // ── EP 호환 HTML 생성 후 바로 다운로드 ──────────────
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>다이캐스팅 강도 시험 보고서</title>
</head>
<body style="font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 1.8; color: #000000;">

<p style="font-weight: bold; font-size: 10pt; margin: 20px 0 8px 0;">1. 시험 정보</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">1) 시험 내용 : 다이캐스팅 강도 시험 (잉곳)</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">2) 시험 장비 : UTM (만능 재료 시험기 5.0 Ton)</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">3) 시험 일자 : ${period}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">4) 시료 : ${specNames}</p>

<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">2. 시험 결과</p>
${recItems}

<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">3. 측정 결과 그래프</p>
${imgTrend ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">1) 사양별 월별 강도 추이 (기준선 자동 표시 · 전체 기간)</p>
<img src="${imgTrend}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${imgAvg ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">2) 사양별 평균 강도 (기준 대비, ${period})</p>
<img src="${imgAvg}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${imgCompare ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">3) 시디즈 vs GCK 강도 비교 (4000G / S-TILT, kgf)</p>
<img src="${imgCompare}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}

</body>
</html>`;

  // 팝업 없이 바로 다운로드
  var _blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var _url  = URL.createObjectURL(_blob);
  var _a    = document.createElement('a');
  _a.href   = _url;
  _a.download = '다이캐스팅_강도시험_보고서.html';
  document.body.appendChild(_a);
  _a.click();
  document.body.removeChild(_a);
  setTimeout(function(){ URL.revokeObjectURL(_url); }, 1000);
};

// 전체 데이터(STATE.inj)로 오프스크린 추이 차트 생성 → 흰 배경 PNG DataURL
function _createInjTrendImageFull() {
  const allRows = STATE.inj;
  if (!allRows || !allRows.length) return null;

  const months  = uniq(allRows.map(r => (r.measure_date || '').slice(0, 7))).sort();
  const specs   = uniq(allRows.map(r => r.spec)).sort();
  const datasets = [];
  specs.forEach((spec, i) => {
    datasets.push({
      label: spec,
      data: months.map(m => avg(
        allRows.filter(r => (r.measure_date||'').slice(0,7) === m && r.spec === spec)
               .map(r => r.strength)
      )),
      borderColor: PALETTE[i % PALETTE.length],
      backgroundColor: PALETTE[i % PALETTE.length] + '20',
      tension: 0.3, borderWidth: 2, pointRadius: 3, spanGaps: true,
    });
  });
  datasets.push({
    label: '기준 1,134.7',
    data: months.map(() => 1134.7),
    borderColor: '#dc2626', borderWidth: 2, borderDash: [6, 4], pointRadius: 0, fill: false,
  });

  const canvas = document.createElement('canvas');
  canvas.width = 900; canvas.height = 380;
  const tmpChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels: months, datasets },
    options: {
      responsive: false, maintainAspectRatio: false, animation: false,
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: false, grid: { color: C.border },
             title: { display: true, text: '강도 (kgf)', font: { size: 10 } } }
      },
      plugins: {
        legend: { position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 10 } } },
        datalabels: { display: false }
      }
    }
  });

  const off = document.createElement('canvas');
  off.width = canvas.width; off.height = canvas.height;
  const offCtx = off.getContext('2d');
  offCtx.fillStyle = '#ffffff';
  offCtx.fillRect(0, 0, off.width, off.height);
  offCtx.drawImage(canvas, 0, 0);
  tmpChart.destroy();
  return off.toDataURL('image/png');
}

window.generateInjReport = function () {
  const filtered = getInjFiltered();
  const from = $('str-inj-from').value;
  const to   = $('str-inj-to').value;
  const period = from && to ? `${from} ~ ${to}` : from ? `${from} 이후` : to ? `~ ${to}` : '전체 기간';

  // 시료명: 사양 + 재료 조합 (중복 제거, 예: 690 각 WW SNB240G33)
  const specimenSet = new Set();
  filtered.forEach(r => {
    const key = r.material ? `${r.spec} ${r.material}`.trim() : r.spec;
    specimenSet.add(key);
  });
  const specimenNames = [...specimenSet].sort().join(', ') || '전체';

  // 자동 분석 권장 조치사항 (불량분석 리포트와 동일 로직)
  const INJ_THR = 1134.7;
  const ngRows = filtered.filter(r => judge(r) === 'NG');
  const specStats = {};
  filtered.forEach(r => {
    if (!specStats[r.spec]) specStats[r.spec] = { total: 0, ng: 0 };
    specStats[r.spec].total++;
    if (judge(r) === 'NG') specStats[r.spec].ng++;
  });
  const topNG = [...ngRows]
    .map(r => ({ ...r, _diff: r.strength - r.threshold }))
    .sort((a, b) => a._diff - b._diff)
    .slice(0, 3);

  const recs = [];
  topNG.forEach(r => {
    recs.push({ level: 'critical', text: `${r.measure_date} ${r.spec} — 강도 ${r.strength.toFixed(1)} kgf (기준 ${INJ_THR} 대비 ${r._diff.toFixed(1)} kgf 미달). 사출 조건/재료 점검 권장.` });
  });
  Object.entries(specStats).forEach(([sp, st]) => {
    if (st.total >= 4 && st.ng / st.total > 0.10) {
      recs.push({ level: 'warning', text: `사양 ${sp} — NG율 ${(st.ng/st.total*100).toFixed(1)}% (${st.ng}/${st.total}건). 모니터링 강화.` });
    }
  });
  Object.keys(specStats).forEach(sp => {
    const sAvg = avg(filtered.filter(r => r.spec === sp).map(r => r.strength));
    if (sAvg !== null && sAvg < INJ_THR + 30 && sAvg > INJ_THR) {
      recs.push({ level: 'warning', text: `사양 ${sp} — 평균 강도 ${sAvg.toFixed(1)} kgf, 기준 대비 안전마진 30 kgf 미만. 잠재 NG 위험.` });
    }
  });
  if (recs.length === 0) recs.push({ level: 'info', text: '모든 측정값이 기준 이상 — 안정적 품질 유지 중.' });

  const recItems = recs.map(r => {
    const prefix = r.level === 'critical'
      ? '<span style="color:red;font-weight:bold;">[주의]</span> '
      : r.level === 'warning'
      ? '<span style="color:#CC7700;font-weight:bold;">[경고]</span> '
      : '';
    return `<p style="margin: 3px 0 3px 15px; font-size: 10pt;">: ${prefix}${r.text}</p>`;
  }).join('\n');

  // 차트 캡쳐: 전체기간 추이(오프스크린) + 필터기간 평균강도 + 사양별 평균 중량
  const imgTrend  = _createInjTrendImageFull();
  const imgAvg    = _captureChart('str-inj-avg');
  const imgWeight = _captureChart('str-inj-weight');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>사출 베이스 강도 시험 보고서</title>
</head>
<body style="font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 1.8; color: #000000;">

<p style="font-weight: bold; font-size: 10pt; margin: 20px 0 8px 0;">1. 시험 정보</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">1) 시험 내용 : 사출 베이스 강도 시험</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">2) 시험 장비 : UTM (만능 재료 시험기 5.0 Ton)</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">3) 시험 일자 : ${period}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">4) 시료명 : ${specimenNames}</p>

<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">2. 시험 결과</p>
${recItems}

<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">3. 측정 결과 그래프</p>
${imgTrend ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">1) 사양별 월별 강도 추이 (기준 1,134.7 kgf · 전체 기간)</p>
<img src="${imgTrend}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${imgAvg ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">2) 사양별 평균 강도 (기준 대비, ${period})</p>
<img src="${imgAvg}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${imgWeight ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">3) 사양별 평균 중량 (g, ${period})</p>
<img src="${imgWeight}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}

</body>
</html>`;

  var _blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var _url  = URL.createObjectURL(_blob);
  var _a    = document.createElement('a');
  _a.href   = _url;
  _a.download = '사출베이스_강도시험_보고서.html';
  document.body.appendChild(_a);
  _a.click();
  document.body.removeChild(_a);
  setTimeout(function(){ URL.revokeObjectURL(_url); }, 1000);
};

})();
