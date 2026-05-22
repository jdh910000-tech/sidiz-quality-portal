/* strength-data.js ??媛뺣룄 ?쒗뿕 (?ㅼ씠罹먯뒪??/ ?ъ텧 踰좎씠?? Supabase ?곕룞 + 李⑦듃 + ?낅젰 + GCK ?뚯씪 ?낅줈??*/
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

// ?ㅼ씠罹먯뒪???ъ뼇蹂?湲곗?媛?(?낅젰 ???먮룞 寃곗젙??
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

// ?먯젙 (媛뺣룄 ??湲곗? ??OK)
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
    console.log(`[媛뺣룄?쒗뿕] ?ㅼ씠罹먯뒪??${die.length}, ?ъ텧踰좎씠??${inj.length}`);
  } catch (e) {
    console.error('[媛뺣룄?쒗뿕] 濡쒕뱶 ?ㅽ뙣:', e);
    alert('媛뺣룄 ?쒗뿕 ?곗씠??濡쒕뱶 ?ㅽ뙣: ' + e.message);
  }
}

// Chart.js 湲곕낯
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

// 李⑦듃 ?ы띁
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

// ===== ?쒕툕???꾪솚 =====
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

// 由ы룷??移댄뀒怨좊━ ?꾪솚
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

// ===== ?ㅼ씠罹먯뒪??=====
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
    <div class="kpi-card"><div class="kpi-label">珥?痢≪젙 嫄댁닔</div><div class="kpi-value">${rows.length.toLocaleString()}</div><div class="kpi-change">?ъ뼇 ${specs.length}醫?/div></div>
    <div class="kpi-card"><div class="kpi-label">?됯퇏 媛뺣룄</div><div class="kpi-value">${fmt(sAvg, 1)}</div><div class="kpi-change">?⑥쐞: kgf</div></div>
    <div class="kpi-card"><div class="kpi-label">湲곗? 遺?곹빀</div><div class="kpi-value" style="background:linear-gradient(135deg,${ng>0?C.rose:C.emerald},#ffb347);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${ng}</div><div class="kpi-change ${ng>0?'up':'down'}">${ngRate.toFixed(1)}% NG??/div></div>
    <div class="kpi-card"><div class="kpi-label">痢≪젙 二쇱껜</div><div class="kpi-value" style="font-size:18px">${uniq(rows.map(r => r.source)).join(' 쨌 ')}</div><div class="kpi-change">?쒕뵒利?/ GCK</div></div>
  `;
}

function renderDieCharts(rows) {
  // ?ъ뼇蹂??붾퀎 媛뺣룄 異붿씠 (???됯퇏)
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
  // ?좏깮???ъ뼇???덉쑝硫?洹??ъ뼇??湲곗???異붽?
  const selSpec = $('str-die-spec').value;
  if (selSpec && DIE_SPEC_THRESHOLDS[selSpec]) {
    datasets.push({
      label: `湲곗? ${DIE_SPEC_THRESHOLDS[selSpec]}`,
      data: months.map(() => DIE_SPEC_THRESHOLDS[selSpec]),
      borderColor: C.rose, borderWidth: 2, borderDash: [6, 4], pointRadius: 0, fill: false
    });
  }
  makeLine('dieTrend', $('str-die-trend').getContext('2d'), months, datasets, {
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: '媛뺣룄 (kgf)', font: { size: 10 } } }
    }
  });

  // ?ъ뼇蹂??됯퇏 媛뺣룄 vs 湲곗? (湲곗???鍮④컙??媛뺤“ + ?욎쑝濡?
  // X異?怨좎젙 ?쒖꽌: 4000G ??S-TILT ??ITO-TILT ??CH4800 ??T502F ??700 FLAT (RAW) ??700 FLAT (POL)
  const SPEC_ORDER = ['4000G', 'S-TILT', 'ITO-TILT', 'CH4800', 'T502F', '700 FLAT (RAW)', '700 FLAT (POL)'];
  const orderedSpecs = SPEC_ORDER.filter(s => specs.includes(s))
    .concat(specs.filter(s => !SPEC_ORDER.includes(s))); // 誘몄젙???ъ뼇? ?ㅻ줈
  const specAvgs = orderedSpecs.map(s => avg(rows.filter(r => r.spec === s).map(r => r.strength)));
  const specThres = orderedSpecs.map(s => DIE_SPEC_THRESHOLDS[s] || 0);
  makeBar('dieAvg', $('str-die-avg').getContext('2d'), orderedSpecs, [
    { label: '?됯퇏 媛뺣룄', data: specAvgs, backgroundColor: PALETTE.slice(0, orderedSpecs.length), borderRadius: 6, order: 2 },
    {
      label: '湲곗?',
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
    plugins: { legend: { display: true, position: 'top', align: 'end' },
      datalabels: { anchor: 'end', align: 'top', color: C.text, font: { weight: 700, size: 10 }, formatter: v => v ? v.toFixed(1) : '-' }
    }
  });

  // ?쒕뵒利?vs GCK 媛뺣룄 鍮꾧탳 (4000G / S-TILT) ??留됰? + 湲곗???+ OK/NG ?됱긽
  const compareSpecs = ['4000G', 'S-TILT'];
  const _cmpSidizData = compareSpecs.map(sp => avg(rows.filter(r => r.spec === sp && r.source === '?쒕뵒利?).map(r => r.strength)));
  const _cmpGckData   = compareSpecs.map(sp => avg(rows.filter(r => r.spec === sp && r.source === 'GCK').map(r => r.strength)));
  const _cmpThres     = compareSpecs.map(sp => DIE_SPEC_THRESHOLDS[sp] || 0);
  // 湲곗? 誘몃떖(NG)?대㈃ 鍮④컙?? 湲곗? ?댁긽(OK)?대㈃ ?먯깋 ?좎?
  const _cmpSidizColors = compareSpecs.map((sp, i) =>
    (_cmpSidizData[i] !== null && _cmpSidizData[i] >= _cmpThres[i]) ? C.blue : '#FF4C6A');
  const _cmpGckColors = compareSpecs.map((sp, i) =>
    (_cmpGckData[i] !== null && _cmpGckData[i] >= _cmpThres[i]) ? C.amber : '#FF4C6A');
  makeBar('dieCompareStrength', $('str-die-compare-strength').getContext('2d'), compareSpecs, [
    { label: '?쒕뵒利?, data: _cmpSidizData, backgroundColor: _cmpSidizColors, borderRadius: 6 },
    { label: 'GCK',   data: _cmpGckData,   backgroundColor: _cmpGckColors,   borderRadius: 6 },
    {
      label: '湲곗?',
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
      y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: '媛뺣룄 (kgf)', font: { size: 10 } } },
      x: { grid: { display: false } }
    },
    plugins: {
      legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 11 } } },
      datalabels: { anchor: 'end', align: 'top', color: C.text, font: { weight: 700, size: 11 }, formatter: v => v ? v.toFixed(1) : '-' }
    }
  });

  // ?쒕뵒利?vs GCK 以묐웾 鍮꾧탳 (4000G / S-TILT) ??留됰?
  makeBar('dieCompareWeight', $('str-die-compare-weight').getContext('2d'), compareSpecs, [
    {
      label: '?쒕뵒利?,
      data: compareSpecs.map(sp => avg(rows.filter(r => r.spec === sp && r.source === '?쒕뵒利?).map(r => r.weight))),
      backgroundColor: C.blueLight, borderRadius: 6,
    },
    {
      label: 'GCK',
      data: compareSpecs.map(sp => avg(rows.filter(r => r.spec === sp && r.source === 'GCK').map(r => r.weight))),
      backgroundColor: '#FFB347', borderRadius: 6,
    },
  ], {
    scales: {
      y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: '以묐웾 (g)', font: { size: 10 } } },
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
    tb.innerHTML = '<tr><td colspan="9" style="padding:40px;text-align:center;color:#8a8a9a">寃??寃곌낵媛 ?놁뒿?덈떎</td></tr>';
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
      <td><button onclick="deleteStrengthRow('strength_diecasting', ${r.id})" class="btn-del" title="??젣" style="background:none;border:1px solid var(--border);color:var(--accent-rose);padding:3px 8px;border-radius:6px;cursor:pointer;font-size:13px">?뿊</button></td>
    </tr>`;
  }).join('');
}

function initDieDropdowns() {
  const specs = uniq(STATE.die.map(r => r.spec)).sort();
  const sel = $('str-die-spec');
  const cur = sel.value;
  sel.innerHTML = '<option value="">?꾩껜</option>' + specs.map(s => `<option value="${escHtml(s)}">${escHtml(s)}</option>`).join('');
  if ([...sel.options].some(o => o.value === cur)) sel.value = cur;

  // 湲덊삎踰덊샇 ?쒕∼?ㅼ슫
  const moldSel = $('str-die-mold');
  if (moldSel) {
    const molds = uniq(STATE.die.map(r => r.mold_number)).sort();
    const cm = moldSel.value;
    moldSel.innerHTML = '<option value="">?꾩껜</option>' + molds.map(m => `<option value="${escHtml(m)}">${escHtml(m)}</option>`).join('');
    if ([...moldSel.options].some(o => o.value === cm)) moldSel.value = cm;
  }

  // ?낅젰 ???ъ뼇 ??됲듃
  const formSel = $('form-die-spec');
  formSel.innerHTML = Object.keys(DIE_SPEC_THRESHOLDS).map(s => `<option value="${escHtml(s)}">${escHtml(s)} (??{DIE_SPEC_THRESHOLDS[s]} kgf)</option>`).join('');
}

function renderDie() {
  initDieDropdowns();
  const rows = getDieFiltered();
  renderDieKPI(rows);
  renderDieCharts(rows);
  renderDieTable(rows);
}

// ===== ?ъ텧 踰좎씠??=====
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
    <div class="kpi-card"><div class="kpi-label">珥?痢≪젙 嫄댁닔</div><div class="kpi-value">${rows.length.toLocaleString()}</div><div class="kpi-change">?ъ뼇 ${specs.length}醫?/div></div>
    <div class="kpi-card"><div class="kpi-label">?됯퇏 媛뺣룄</div><div class="kpi-value">${fmt(sAvg, 1)}</div><div class="kpi-change">湲곗? 1,134.7 kgf</div></div>
    <div class="kpi-card"><div class="kpi-label">?됯퇏 以묐웾</div><div class="kpi-value">${fmt(wAvg, 1)}</div><div class="kpi-change">?⑥쐞: g</div></div>
    <div class="kpi-card"><div class="kpi-label">湲곗? 遺?곹빀</div><div class="kpi-value" style="background:linear-gradient(135deg,${ng>0?C.rose:C.emerald},#ffb347);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${ng}</div><div class="kpi-change ${ng>0?'up':'down'}">${ngRate.toFixed(1)}% NG??/div></div>
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
  // 湲곗???(紐⑤뱺 ?ъ뼇 怨듯넻 1134.7)
  datasets.push({
    label: '湲곗? 1,134.7',
    data: months.map(() => 1134.7),
    borderColor: C.rose, borderWidth: 2, borderDash: [6, 4], pointRadius: 0, fill: false
  });
  makeLine('injTrend', $('str-inj-trend').getContext('2d'), months, datasets, {
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: '媛뺣룄 (kgf)', font: { size: 10 } } }
    }
  });

  const specAvgs = specs.map(s => avg(rows.filter(r => r.spec === s).map(r => r.strength)));
  makeBar('injAvg', $('str-inj-avg').getContext('2d'), specs, [
    { label: '?됯퇏 媛뺣룄', data: specAvgs, backgroundColor: PALETTE.slice(0, specs.length), borderRadius: 6, order: 2 },
    {
      label: '湲곗? 1,134.7',
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
        formatter: () => '湲곗? 1,134.7'
      }
    },
  ], {
    scales: { y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: 'kgf', font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } },
    plugins: { legend: { display: true, position: 'top', align: 'end' },
      datalabels: { anchor: 'end', align: 'top', color: C.text, font: { weight: 700, size: 10 }, formatter: v => v ? v.toFixed(1) : '-' }
    }
  });

  const wAvgs = specs.map(s => avg(rows.filter(r => r.spec === s).map(r => r.weight)));
  makeBar('injWeight', $('str-inj-weight').getContext('2d'), specs, [
    { label: '?됯퇏 以묐웾', data: wAvgs, backgroundColor: PALETTE.slice(0, specs.length), borderRadius: 6 }
  ], {
    scales: { y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: 'g', font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } },
    plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: C.text, font: { weight: 700, size: 10 }, formatter: v => v ? v.toFixed(1) : '-' } }
  });

  const ok = rows.filter(r => judge(r) === 'OK').length;
  const ng = rows.filter(r => judge(r) === 'NG').length;
  makeDoughnut('injJudge', $('str-inj-judge-pie').getContext('2d'), ['OK', 'NG'], [ok, ng], [C.emerald, C.rose]);
}

function renderInjTable(rows) {
  $('str-inj-count').textContent = rows.length.toLocaleString();
  const sorted = [...rows].sort((a, b) => (b.measure_date || '').localeCompare(a.measure_date || ''));
  const tb = $('str-inj-table-body');
  if (!sorted.length) {
    tb.innerHTML = '<tr><td colspan="8" style="padding:40px;text-align:center;color:#8a8a9a">寃??寃곌낵媛 ?놁뒿?덈떎</td></tr>';
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
      <td><button onclick="deleteStrengthRow('strength_injection_base', ${r.id})" class="btn-del" title="??젣" style="background:none;border:1px solid var(--border);color:var(--accent-rose);padding:3px 8px;border-radius:6px;cursor:pointer;font-size:13px">?뿊</button></td>
    </tr>`;
  }).join('');
}

function initInjDropdowns() {
  const specs = uniq(STATE.inj.map(r => r.spec)).sort();
  const sel = $('str-inj-spec');
  const cur = sel.value;
  sel.innerHTML = '<option value="">?꾩껜</option>' + specs.map(s => `<option value="${escHtml(s)}">${escHtml(s)}</option>`).join('');
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

// ===== 遺덈웾 遺꾩꽍 由ы룷??=====
const DIE_SPEC_ORDER_REP = ['4000G', 'S-TILT', 'ITO-TILT', 'CH4800', 'T502F', '700 FLAT (RAW)', '700 FLAT (POL)'];

function renderLabReportDie() {
  const rows = STATE.die;
  const ngRows = rows.filter(r => judge(r) === 'NG');
  const ngRate = rows.length ? (ngRows.length / rows.length * 100) : 0;
  const specsAll = uniq(rows.map(r => r.spec));
  const sources = uniq(rows.map(r => r.source)).sort();

  $('rep-die-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">珥?痢≪젙 嫄댁닔</div><div class="kpi-value">${rows.length.toLocaleString()}</div><div class="kpi-change">?ъ뼇 ${specsAll.length}醫?/div></div>
    <div class="kpi-card"><div class="kpi-label">遺?곹빀 嫄댁닔</div><div class="kpi-value" style="background:linear-gradient(135deg,${ngRows.length>0?C.rose:C.emerald},#ffb347);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${ngRows.length}</div><div class="kpi-change ${ngRows.length>0?'up':'down'}">湲곗?媛?誘몃떖 痢≪젙</div></div>
    <div class="kpi-card"><div class="kpi-label">遺?곹빀瑜?/div><div class="kpi-value">${ngRate.toFixed(2)}%</div><div class="kpi-change">?꾩껜 痢≪젙 ?鍮?/div></div>
    <div class="kpi-card"><div class="kpi-label">痢≪젙 二쇱껜</div><div class="kpi-value" style="font-size:18px">${sources.join(' 쨌 ')}</div><div class="kpi-change">${sources.length}媛쒖궗</div></div>
  `;

  // ?ъ뼇蹂??듦퀎
  const specStats = {};
  rows.forEach(r => {
    if (!specStats[r.spec]) specStats[r.spec] = { total: 0, ng: 0 };
    specStats[r.spec].total++;
    if (judge(r) === 'NG') specStats[r.spec].ng++;
  });

  // TOP10 (媛뺣룄媛 湲곗? ?鍮?媛??留롮씠 誘몃떖????
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
  }).join('') : '<tr><td colspan="8" style="padding:40px;text-align:center;color:#8a8a9a">?꾩껜 ?곹빀 ??遺?곹빀 痢≪젙媛믪씠 ?놁뒿?덈떎</td></tr>';

  // ?붾퀎 OK/NG ?ㅽ깮 異붿씠
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

  // ?ъ뼇蹂?NG??(?뺤쓽???쒖꽌濡?
  const specs = DIE_SPEC_ORDER_REP.filter(s => specStats[s])
    .concat(Object.keys(specStats).filter(s => !DIE_SPEC_ORDER_REP.includes(s)));
  makeBar('repDieSpec', $('rep-die-spec').getContext('2d'), specs, [
    { label: 'NG??(%)', data: specs.map(s => specStats[s].total ? specStats[s].ng / specStats[s].total * 100 : 0), backgroundColor: PALETTE.slice(0, specs.length), borderRadius: 6 }
  ], {
    scales: { y: { beginAtZero: true, suggestedMax: 5, grid: { color: C.border } }, x: { grid: { display: false } } },
    plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: C.text, font: { weight: 700, size: 11 }, formatter: v => v.toFixed(2) + '%' } }
  });

  // 沅뚯옣 議곗튂
  const recs = [];
  topNG.slice(0, 3).forEach(r => {
    recs.push({ level: 'critical', text: `<b>${escHtml(r.measure_date)} ${escHtml(r.spec)} (${escHtml(r.source)})</b> ??媛뺣룄 ${r.strength.toFixed(1)} (湲곗? ${r.threshold} ?鍮?${r._diff.toFixed(1)} kgf 誘몃떖). ?쒗뿕 ?ъ쭊??/ ?됯납 議곗꽦 ?먭? 沅뚯옣.` });
  });
  Object.entries(specStats).forEach(([sp, st]) => {
    if (st.total >= 4 && st.ng / st.total > 0.10) {
      recs.push({ level: 'warning', text: `?ъ뼇 <b>${escHtml(sp)}</b> ??NG??${(st.ng/st.total*100).toFixed(1)}% (${st.ng}/${st.total}嫄?. 10% 珥덇낵濡?紐⑤땲?곕쭅 媛뺥솕.` });
    }
  });
  // ?쒕뵒利?vs GCK 媛뺣룄 李⑥씠 遺꾩꽍
  ['4000G', 'S-TILT'].forEach(sp => {
    const sidiz = avg(rows.filter(r => r.spec === sp && r.source === '?쒕뵒利?).map(r => r.strength));
    const gck = avg(rows.filter(r => r.spec === sp && r.source === 'GCK').map(r => r.strength));
    if (sidiz !== null && gck !== null) {
      const diff = Math.abs(sidiz - gck);
      const pctDiff = diff / Math.min(sidiz, gck) * 100;
      if (pctDiff > 20) {
        recs.push({ level: 'info', text: `<b>${sp}</b> ???쒕뵒利?${sidiz.toFixed(1)}) vs GCK(${gck.toFixed(1)}) 媛뺣룄 李⑥씠 ${diff.toFixed(1)} kgf (${pctDiff.toFixed(1)}%). 痢≪젙 ?섍꼍/諛⑸쾿 ?먭? 沅뚯옣.` });
      }
    }
  });
  if (recs.length === 0) recs.push({ level: 'info', text: '紐⑤뱺 痢≪젙媛믪씠 湲곗? ?댁긽 ???덉젙???덉쭏 ?좎? 以?' });
  $('rep-die-rec').innerHTML = recs.map(r => `<div class="analysis-item"><div class="analysis-dot ${r.level}"></div><div>${r.text}</div></div>`).join('');
}

function renderLabReportInj() {
  const rows = STATE.inj;
  const ngRows = rows.filter(r => judge(r) === 'NG');
  const ngRate = rows.length ? (ngRows.length / rows.length * 100) : 0;
  const specs = uniq(rows.map(r => r.spec)).sort();

  $('rep-inj-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">珥?痢≪젙 嫄댁닔</div><div class="kpi-value">${rows.length.toLocaleString()}</div><div class="kpi-change">?ъ뼇 ${specs.length}醫?/div></div>
    <div class="kpi-card"><div class="kpi-label">遺?곹빀 嫄댁닔</div><div class="kpi-value" style="background:linear-gradient(135deg,${ngRows.length>0?C.rose:C.emerald},#ffb347);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${ngRows.length}</div><div class="kpi-change ${ngRows.length>0?'up':'down'}">湲곗? 1,134.7 kgf 誘몃떖</div></div>
    <div class="kpi-card"><div class="kpi-label">遺?곹빀瑜?/div><div class="kpi-value">${ngRate.toFixed(2)}%</div><div class="kpi-change">?꾩껜 痢≪젙 ?鍮?/div></div>
    <div class="kpi-card"><div class="kpi-label">?됯퇏 媛뺣룄</div><div class="kpi-value">${fmt(avg(rows.map(r => r.strength)), 1)}</div><div class="kpi-change">?⑥쐞: kgf</div></div>
  `;

  // ?ъ뼇蹂??듦퀎
  const specStats = {};
  rows.forEach(r => {
    if (!specStats[r.spec]) specStats[r.spec] = { total: 0, ng: 0 };
    specStats[r.spec].total++;
    if (judge(r) === 'NG') specStats[r.spec].ng++;
  });

  // TOP10 (媛뺣룄 誘몃떖 ??
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
  `).join('') : '<tr><td colspan="7" style="padding:40px;text-align:center;color:#8a8a9a">?꾩껜 ?곹빀 ??遺?곹빀 痢≪젙媛믪씠 ?놁뒿?덈떎</td></tr>';

  // ?붾퀎 OK/NG
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

  // ?ъ뼇蹂?NG??  const specOrder = Object.keys(specStats).sort();
  makeBar('repInjSpec', $('rep-inj-spec').getContext('2d'), specOrder, [
    { label: 'NG??(%)', data: specOrder.map(s => specStats[s].total ? specStats[s].ng / specStats[s].total * 100 : 0), backgroundColor: PALETTE.slice(0, specOrder.length), borderRadius: 6 }
  ], {
    scales: { y: { beginAtZero: true, suggestedMax: 5, grid: { color: C.border } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } },
    plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: C.text, font: { weight: 700, size: 11 }, formatter: v => v.toFixed(2) + '%' } }
  });

  // 沅뚯옣 議곗튂
  const recs = [];
  topNG.slice(0, 3).forEach(r => {
    recs.push({ level: 'critical', text: `<b>${escHtml(r.measure_date)} ${escHtml(r.spec)}</b> ??媛뺣룄 ${r.strength.toFixed(1)} (湲곗? 1,134.7 ?鍮?${r._diff.toFixed(1)} kgf 誘몃떖). ?ъ텧 議곌굔/?щ즺 ?먭? 沅뚯옣.` });
  });
  Object.entries(specStats).forEach(([sp, st]) => {
    if (st.total >= 4 && st.ng / st.total > 0.10) {
      recs.push({ level: 'warning', text: `?ъ뼇 <b>${escHtml(sp)}</b> ??NG??${(st.ng/st.total*100).toFixed(1)}% (${st.ng}/${st.total}嫄?. 紐⑤땲?곕쭅 媛뺥솕.` });
    }
  });
  // ?됯퇏 媛뺣룄媛 湲곗? +30 誘몃쭔???ъ뼇 (?덉쟾 留덉쭊 遺議?
  Object.keys(specStats).forEach(sp => {
    const sAvg = avg(rows.filter(r => r.spec === sp).map(r => r.strength));
    if (sAvg !== null && sAvg < 1134.7 + 30 && sAvg > 1134.7) {
      recs.push({ level: 'warning', text: `?ъ뼇 <b>${escHtml(sp)}</b> ???됯퇏 媛뺣룄 ${sAvg.toFixed(1)} kgf, 湲곗? ?鍮??덉쟾留덉쭊 30 kgf 誘몃쭔. ?좎옱 NG ?꾪뿕.` });
    }
  });
  if (recs.length === 0) recs.push({ level: 'info', text: '紐⑤뱺 痢≪젙媛믪씠 湲곗? ?댁긽 ???덉젙???덉쭏 ?좎? 以?' });
  $('rep-inj-rec').innerHTML = recs.map(r => `<div class="analysis-item"><div class="analysis-dot ${r.level}"></div><div>${r.text}</div></div>`).join('');
}

// ===== ?낅젰 / ???/ ??젣 =====
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
  if (!data.measure_date || !spec || !data.source) { alert('痢≪젙???ъ뼇/痢≪젙 二쇱껜???꾩닔'); return; }
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
  if (!data.measure_date || !data.spec) { alert('痢≪젙???ъ뼇? ?꾩닔'); return; }
  await postStrength('strength_injection_base', data, 'inj');
};

async function postStrength(table, data, kind) {
  try {
    // ?ㅼ씠罹먯뒪?? (date, spec, source) UNIQUE ??媛숈? ???낅젰 ???먮룞 媛깆떊 (upsert)
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
    alert(preferUpsert ? '??????꾨즺 (?숈씪 ?ㅻ뒗 ?먮룞 媛깆떊)' : '??????꾨즺');
    document.querySelectorAll(`#str-form-${kind} input:not([type="date"])`).forEach(i => i.value = '');
    await loadStrengthData(true);
    if (kind === 'die') renderDie(); else renderInj();
  } catch (e) {
    console.error(e); alert('??????ㅽ뙣: ' + e.message);
  }
}

window.deleteStrengthRow = async function (table, id) {
  const pw = prompt('??痢≪젙?대젰????젣?섎젮硫?鍮꾨?踰덊샇瑜??낅젰?섏꽭??');
  if (pw === null) return;
  if (pw !== '1234') { alert('??鍮꾨?踰덊샇媛 ?쇱튂?섏? ?딆뒿?덈떎.\n??젣媛 痍⑥냼?섏뿀?듬땲??'); return; }
  if (!confirm('鍮꾨?踰덊샇 ?뺤씤 ?꾨즺. ?뺣쭚 ??젣?섏떆寃좎뒿?덇퉴?')) return;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method: 'DELETE', headers: SB_HEADERS });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    await loadStrengthData(true);
    if (table === 'strength_diecasting') renderDie(); else renderInj();
  } catch (e) {
    console.error(e); alert('????젣 ?ㅽ뙣: ' + e.message);
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

// ?? ExcelJS 怨듯넻 ?ㅽ????ы띁 ?????????????????????????????????????
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

// ?? 濡쒖슦?곗씠???쒗듃 (ExcelJS) ?????????????????????????????????????
function _buildRawSheetEJS(wb, header, data) {
  const ws = wb.addWorksheet('濡쒖슦?곗씠??);
  // ???덈퉬 (痢≪젙???ъ뼇|二쇱껜|湲덊삎|以묐웾|媛뺣룄|湲곗?|?먯젙)
  const widths = [14, 14, 12, 12, 10, 10, 10, 8];
  header.forEach((_, i) => { ws.getColumn(i + 1).width = widths[i] || 14; });

  // ?ㅻ뜑 ??  const hdrRow = ws.addRow(header);
  hdrRow.height = 22;
  header.forEach((_, i) => _ejsStyleCell(hdrRow.getCell(i + 1), { isHdr: true }));

  // ?곗씠????  data.forEach(rowData => {
    const row = ws.addRow(rowData.map(v => v == null ? '' : v));
    row.height = 18;
    header.forEach((_, i) => _ejsStyleCell(row.getCell(i + 1)));
  });
}

// ?? 李⑦듃 ?대?吏 ?앹꽦 (Chart.js 罹붾쾭????base64 PNG) ?????????????
async function _createSpecChartImage(spec, labels, sdValues, gkValues, threshold) {
  const W = 680, H = 340;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  canvas.style.cssText = 'position:absolute;visibility:hidden;top:0;left:0;';
  document.body.appendChild(canvas);

  // ?곗씠?곗뀑 援ъ꽦
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
      label: `湲곗? ${threshold}`,
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
  // GCK ?쇱씤 (4000G, S-TILT留?
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
        datalabels: { display: false }, // ChartDataLabels ?꾩뿭 ?뚮윭洹몄씤 鍮꾪솢?깊솕
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { color: '#555', font: { size: 11 } },
        },
        y: {
          title: { display: true, text: '媛뺣룄 (kgf)', color: '#666', font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { color: '#555', font: { size: 11 } },
        },
      },
    },
  });

  await new Promise(r => setTimeout(r, 80)); // ?뚮뜑留??湲?
  // ?곗깋 諛곌꼍 ?⑹꽦 (李⑦듃??湲곕낯 ?щ챸 諛곌꼍)
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

// ?? ?붾퀎 媛뺣룄 異붿씠 ?쒗듃 (?곗씠???뚯씠釉?+ ?ъ뼇蹂?李⑦듃 ?대?吏, ExcelJS) ?????????????
async function _buildTrendSheetEJS(wb, rows) {
  // ?ъ뼇 ?쒖떆 ?쒖꽌 / GCK ?ы븿 ?щ? / ????(GCK ?덉쑝硫?3?? ?놁쑝硫?2??
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

  // DB ?ъ뼇蹂?湲곗?媛?  const specMap = {};
  rows.forEach(r => { if (r.spec && r.threshold != null) specMap[r.spec] = r.threshold; });
  if (!Object.keys(specMap).length) return;

  // ?쒖꽌??留욊쾶 DB ?ъ뼇 留ㅽ븨
  const orderedSpecs = [];
  SPEC_DEF.forEach(def => {
    const dbSpec = Object.keys(specMap).find(s =>
      normSpec(s) === normSpec(def.label) || normSpec(s) === normSpec(def.key));
    if (dbSpec) orderedSpecs.push({
      spec: dbSpec, gck: def.gck, label: def.label,
      cols: def.cols, threshold: specMap[dbSpec],
    });
  });
  // 紐⑸줉???녿뒗 ?ъ뼇? ?ㅼ뿉 異붽? (GCK ?놁쓬)
  Object.keys(specMap).forEach(sp => {
    if (!orderedSpecs.find(o => o.spec === sp))
      orderedSpecs.push({ spec: sp, gck: false, label: sp, cols: 2, threshold: specMap[sp] });
  });

  // ?붾퀎 횞 ?ъ뼇 횞 ?낆껜 吏묎퀎
  const agg = {};
  rows.forEach(r => {
    if (!r.measure_date || r.strength == null) return;
    const mo  = r.measure_date.slice(0, 7);
    const src = r.source || '?쒕뵒利?;
    if (!agg[mo]) agg[mo] = {};
    if (!agg[mo][r.spec]) agg[mo][r.spec] = {};
    if (!agg[mo][r.spec][src]) agg[mo][r.spec][src] = { sum: 0, cnt: 0 };
    agg[mo][r.spec][src].sum += r.strength;
    agg[mo][r.spec][src].cnt++;
  });
  // ?곗씠???덈뒗 ?붾퓧 ?꾨땲?? ?대떦 ?곕룄 1~12???꾩껜 ?쒖떆 (鍮????ы븿)
  const dataMonths = Object.keys(agg).sort();
  if (!dataMonths.length) return;
  const year = dataMonths[0].slice(0, 4);
  const months = Array.from({ length: 12 }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, '0')}`
  );

  const ws = wb.addWorksheet('?붾퀎 媛뺣룄 異붿씠');
  ws.views = [{ showGridLines: false }];

  // ??? ???덈퉬 + ?ъ뼇蹂?1-based ?쒖옉 ??湲곕줉 ?????????????????????
  // 李⑦듃 433px媛 寃뱀튂吏 ?딆쑝?ㅻ㈃: 3???ъ뼇 ??21???? 2???ъ뼇 ??32????  ws.getColumn(1).width = 12; // A (痢≪젙??洹몃옒??
  const specColStarts = []; // 媛??ъ뼇??1-based ?쒖옉 ??  let col1 = 2; // 1-based ?꾩옱 ??異붿쟻
  orderedSpecs.forEach(sp => {
    specColStarts.push(col1);
    const colW = sp.cols === 3 ? 21 : 32; // 3??21????62px), 2??32????53px)
    for (let i = 0; i < sp.cols; i++) ws.getColumn(col1 + i).width = colW;
    col1 += sp.cols;
  });

  // ??? ?ㅻ뜑 ??1: 痢≪젙??A1:A2 蹂묓빀) + ?ъ뼇紐?蹂묓빀 ?????????
  ws.getRow(1).height = 22;
  ws.mergeCells(1, 1, 2, 1);
  const mo1 = ws.getCell(1, 1);
  mo1.value = '痢≪젙??;
  _ejsStyleCell(mo1, { isHdr: true });

  orderedSpecs.forEach((sp, si) => {
    const sc = specColStarts[si], ec = sc + sp.cols - 1;
    if (sp.cols > 1) ws.mergeCells(1, sc, 1, ec);
    const hc = ws.getCell(1, sc);
    hc.value = sp.label;
    _ejsStyleCell(hc, { isHdr: true });
    // 蹂묓빀 ???섎㉧吏 ? 諛곌꼍쨌border ?좎? (Excel ?뚮뜑留??명솚)
    for (let c = sc + 1; c <= ec; c++) {
      ws.getCell(1, c).border = _EJS_BORDER_ALL;
      ws.getCell(1, c).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    }
  });

  // ??? ?ㅻ뜑 ??2: ?쒕툕 ?ㅻ뜑 (湲곗?(kgf) ?ы븿 紐⑤몢 寃??援듦쾶) ????
  ws.getRow(2).height = 20;
  orderedSpecs.forEach((sp, si) => {
    const subHdrs = sp.gck
      ? ['?쒕뵒利?, 'GCK', '湲곗?(kgf)']
      : ['?쒕뵒利?, '湲곗?(kgf)'];
    subHdrs.forEach((h, i) => {
      const cell = ws.getCell(2, specColStarts[si] + i);
      cell.value = h;
      _ejsStyleCell(cell, { isHdr: true }); // 湲곗?(kgf)??寃??援듦쾶 (redFont ?놁쓬)
    });
  });

  // ??? ?곗씠??????????????????????????????????????????????
  months.forEach((mo, mi) => {
    const rowNum = 3 + mi;
    ws.getRow(rowNum).height = 18;

    const moCell = ws.getCell(rowNum, 1);
    moCell.value = mo;
    _ejsStyleCell(moCell);

    orderedSpecs.forEach((sp, si) => {
      const spAgg = agg[mo] && agg[mo][sp.spec];
      const sdRaw = spAgg && spAgg['?쒕뵒利?];
      const gkRaw = spAgg && spAgg['GCK'];
      const sdVal = sdRaw ? Math.round(sdRaw.sum / sdRaw.cnt * 10) / 10 : null;
      const gkVal = gkRaw ? Math.round(gkRaw.sum / gkRaw.cnt * 10) / 10 : null;
      const thr   = sp.threshold;
      let c = specColStarts[si];

      // ?쒕뵒利?(誘몃떖 ??鍮④컙 諛곌꼍)
      const sdCell = ws.getCell(rowNum, c);
      sdCell.value = sdVal !== null ? sdVal : '';
      _ejsStyleCell(sdCell, sdVal !== null && sdVal < thr ? { redBg: true } : {});
      c++;

      // GCK (?대떦 ?ъ뼇留? 誘몃떖 ??鍮④컙 諛곌꼍)
      if (sp.gck) {
        const gkCell = ws.getCell(rowNum, c);
        gkCell.value = gkVal !== null ? gkVal : '';
        _ejsStyleCell(gkCell, gkVal !== null && gkVal < thr ? { redBg: true } : {});
        c++;
      }

      // 湲곗?媛? 寃??援듦쾶 + ?고쉶??諛곌꼍 (?ъ슜???붿껌)
      const thrCell = ws.getCell(rowNum, c);
      thrCell.value = thr;
      _ejsStyleCell(thrCell, { bold: true, grayBg: true });
    });
  });

  // ??? 李⑦듃 ?곸뿭: ?ъ뼇蹂?蹂묓빀 + ?대?吏 (李멸퀬?뚯씪 湲곗? 諛곗튂) ????
  // 李멸퀬?뚯씪: 李⑦듃 433횞254px, 紐⑤몢 媛숈? ???뚯씠釉?諛붾줈 ?꾨옒), 媛??ъ뼇 ?쒖옉 ?댁뿉 諛곗튂
  const CHART_W  = 680, CHART_H  = 340; // 罹붾쾭???뚮뜑 ?ш린 (怨좏솕吏?
  const DISP_W   = 433, DISP_H   = 254; // ?묒? ?쒖떆 ?ш린 (EMU 4125600횞2422800)
  const CHART_ROWS = 13;                // 李⑦듃 ?곸뿭 ????(254px 첨 20px/????13)
  const chartR1  = 3 + months.length;  // 1-based 李⑦듃 ?쒖옉 ??  const chartR2  = chartR1 + CHART_ROWS - 1;

  // A?? '洹몃옒?? ?덉씠釉?(痢≪젙???ㅻ뜑? ?숈씪???뚯깋 ?뚯쁺)
  ws.mergeCells(chartR1, 1, chartR2, 1);
  const aChartCell = ws.getCell(chartR1, 1);
  aChartCell.value = '洹몃옒??;
  _ejsStyleCell(aChartCell, { isHdr: true }); // 痢≪젙?붽낵 ?숈씪 ?ㅽ????뚯깋 諛곌꼍+寃??援듦쾶)

  for (let si = 0; si < orderedSpecs.length; si++) {
    const { spec, gck, threshold, label } = orderedSpecs[si];
    const sc1 = specColStarts[si];
    const ec1 = sc1 + orderedSpecs[si].cols - 1;

    // ?ъ뼇 ??蹂묓빀 (李멸퀬?뚯씪怨??숈씪??援ъ“)
    ws.mergeCells(chartR1, sc1, chartR2, ec1);
    ws.getCell(chartR1, sc1).border = _EJS_BORDER_ALL;

    // 李⑦듃 ?앹꽦
    const sdValues = months.map(mo => {
      const d = agg[mo] && agg[mo][spec] && agg[mo][spec]['?쒕뵒利?];
      return d ? Math.round(d.sum / d.cnt * 10) / 10 : null;
    });
    const gkValues = gck ? months.map(mo => {
      const d = agg[mo] && agg[mo][spec] && agg[mo][spec]['GCK'];
      return d ? Math.round(d.sum / d.cnt * 10) / 10 : null;
    }) : null;

    const imgB64 = await _createSpecChartImage(label, months, sdValues, gkValues, threshold);
    const imgId  = wb.addImage({ base64: imgB64, extension: 'png' });
    // tl: 0-based (1-based sc1 ??sc1-1), 李멸퀬?뚯씪怨??숈씪??col/row蹂?諛곗튂
    ws.addImage(imgId, {
      tl: { col: sc1 - 1 + 0.05, row: chartR1 - 1 + 0.1 },
      ext: { width: DISP_W, height: DISP_H },
    });
  }
}

// ?? ?ъ텧 踰좎씠???붾퀎 媛뺣룄 異붿씠 ?쒗듃 ????????????????????????????????
async function _buildInjTrendSheetEJS(wb, rows) {
  const INJ_THR = 1134.7;

  // ?ъ뼇 紐⑸줉 (?곗씠???덈뒗 寃껊쭔)
  const specSet = uniq(rows.map(r => r.spec).filter(Boolean)).sort();
  if (!specSet.length) return;

  // ?붾퀎 횞 ?ъ뼇 吏묎퀎 (?쒕뵒利??⑥씪 ?낆껜)
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

  const ws = wb.addWorksheet('?붾퀎 媛뺣룄 異붿씠');
  ws.views = [{ showGridLines: false }];

  // ???덈퉬: A(痢≪젙?? + ?ъ뼇蹂?2???쒕뵒利댟룰린以)
  ws.getColumn(1).width = 12;
  const specColStarts = [];
  let col1 = 2;
  specSet.forEach(() => {
    specColStarts.push(col1);
    ws.getColumn(col1).width = 32;     // ?쒕뵒利?    ws.getColumn(col1 + 1).width = 32; // 湲곗?(kgf) ??2???⑷퀎 ??433px(李⑦듃 ?? ?뺣낫
    col1 += 2;
  });

  // ?ㅻ뜑 ??1: 痢≪젙??蹂묓빀 + ?ъ뼇紐?  ws.getRow(1).height = 22;
  ws.mergeCells(1, 1, 2, 1);
  const mo1 = ws.getCell(1, 1);
  mo1.value = '痢≪젙??; _ejsStyleCell(mo1, { isHdr: true });

  specSet.forEach((sp, si) => {
    const sc = specColStarts[si];
    ws.mergeCells(1, sc, 1, sc + 1);
    const hc = ws.getCell(1, sc);
    hc.value = sp; _ejsStyleCell(hc, { isHdr: true });
    ws.getCell(1, sc + 1).border = _EJS_BORDER_ALL;
    ws.getCell(1, sc + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  });

  // ?ㅻ뜑 ??2: ?쒕툕?ㅻ뜑
  ws.getRow(2).height = 20;
  specSet.forEach((_, si) => {
    const sc = specColStarts[si];
    ['?쒕뵒利?, '湲곗?(kgf)'].forEach((h, i) => {
      const cell = ws.getCell(2, sc + i);
      cell.value = h; _ejsStyleCell(cell, { isHdr: true });
    });
  });

  // ?곗씠????  months.forEach((mo, mi) => {
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

  // 李⑦듃 ?대?吏 (?ъ뼇蹂?
  const DISP_W = 433, DISP_H = 254;
  const CHART_ROWS = 13;
  const chartR1 = 3 + months.length;
  const chartR2 = chartR1 + CHART_ROWS - 1;

  ws.mergeCells(chartR1, 1, chartR2, 1);
  const aChartCell = ws.getCell(chartR1, 1);
  aChartCell.value = '洹몃옒??; _ejsStyleCell(aChartCell, { isHdr: true });

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

// ?? ?먮즺蹂??吏꾩엯??(ExcelJS) ?????????????????????????????????????
window.exportStrength = async function (kind) {
  if (!window.ExcelJS) { alert('ExcelJS ?쇱씠釉뚮윭由?誘몃줈??); return; }
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let rows, header, mapper, filename;

  if (kind === 'die') {
    rows     = getDieFiltered();
    filename = `媛뺣룄?쒗뿕_?ㅼ씠罹먯뒪??${today}.xlsx`;
    header   = ['痢≪젙??, '?ъ뼇', '痢≪젙 二쇱껜', '湲덊삎踰덊샇', '以묐웾(g)', '媛뺣룄(kgf)', '湲곗?(kgf)', '?먯젙'];
    mapper   = r => [r.measure_date, r.spec, r.source, r.mold_number, r.weight, r.strength, r.threshold, judge(r)];
  } else {
    rows     = getInjFiltered();
    filename = `媛뺣룄?쒗뿕_?ъ텧踰좎씠??${today}.xlsx`;
    header   = ['痢≪젙??, '?ъ뼇', '?щ즺', '以묐웾(g)', '媛뺣룄(kgf)', '湲곗?(kgf)', '?먯젙'];
    mapper   = r => [r.measure_date, r.spec, r.material, r.weight, r.strength, r.threshold, judge(r)];
  }

  try {
    const wb     = new ExcelJS.Workbook();
    const sorted = rows.slice().sort((a, b) => (b.measure_date || '').localeCompare(a.measure_date || ''));

    // ?쒗듃 1: ?붾퀎 媛뺣룄 異붿씠
    if (kind === 'die') await _buildTrendSheetEJS(wb, rows);
    else await _buildInjTrendSheetEJS(wb, rows);

    // ?쒗듃 2(?ㅼ씠) / 2(?ъ텧): 濡쒖슦?곗씠??    _buildRawSheetEJS(wb, header, sorted.map(mapper));

    // ?ㅼ슫濡쒕뱶
    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('exportStrength ?ㅻ쪟:', e);
    alert('?먮즺蹂???ㅽ뙣: ' + e.message);
  }
};

// ===== GCK ?뚯씪 ?먮룞 ?낅줈??=====
window.handleGckUpload = async function (event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm(`GCK ?뚯씪 "${file.name}"???낅줈?쒗븯???ㅼ씠罹먯뒪???곗씠?곗뿉 諛섏쁺?섏떆寃좎뒿?덇퉴?\n(湲곗〈 GCK ?곗씠?곗? 以묐났?섎뒗 ?쇱옄??異붽??⑸땲??`)) {
    event.target.value = '';
    return;
  }
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const records = [];

    // S-Tilt ?쒗듃 ??spec='S-TILT', threshold=750
    parseGckSheet(wb, 'Raw data (S-Tilt)', 'S-TILT', 750, records);
    // 4000G Renewal ??spec='4000G', threshold=800
    parseGckSheet(wb, 'Raw data (4000G Renewal)', '4000G', 800, records);

    if (!records.length) {
      alert('?뚯떛???곗씠?곌? ?놁뒿?덈떎. ?뚯씪 援ъ“瑜??뺤씤?댁＜?몄슂.');
      event.target.value = '';
      return;
    }

    // ?좉퇋/媛깆떊 遺꾨쪟 (?꾩옱 DB ?곹깭 湲곗?)
    const existKeys = new Set(STATE.die
      .filter(r => r.source === 'GCK')
      .map(r => `${r.measure_date}|${r.spec}|${r.source}`));
    const newCount = records.filter(r => !existKeys.has(`${r.measure_date}|${r.spec}|${r.source}`)).length;
    const updateCount = records.length - newCount;

    if (!confirm(
      `GCK ?뚯씪 ?뚯떛 寃곌낵:\n\n` +
      `??珥?${records.length}嫄?n` +
      `???좉퇋 異붽?: ${newCount}嫄?n` +
      `??湲곗〈 媛깆떊: ${updateCount}嫄?(?대? ?깅줉???쇱옄??媛??먮룞 媛깆떊)\n\n` +
      `吏꾪뻾?섏떆寃좎뒿?덇퉴?`
    )) {
      event.target.value = '';
      return;
    }

    // upsert: (measure_date, spec, source) UNIQUE ?쒖빟 湲곕컲?쇰줈 ?먮룞 蹂묓빀
    const res = await fetch(`${SB_URL}/rest/v1/strength_diecasting`, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': 'return=minimal,resolution=merge-duplicates' },
      body: JSON.stringify(records),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    alert(`??GCK ?낅줈???꾨즺\n\n???좉퇋 異붽?: ${newCount}嫄?n??湲곗〈 媛깆떊: ${updateCount}嫄?n\n?숈씪 ?쇱옄/?ъ뼇? 理쒖떊 媛믪쑝濡??먮룞 媛깆떊?섏뿀?듬땲??`);
    await loadStrengthData(true);
    renderDie();
  } catch (e) {
    console.error(e);
    alert('??GCK ?낅줈???ㅽ뙣: ' + e.message);
  }
  event.target.value = '';
};

function parseGckSheet(wb, sheetName, spec, threshold, out) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return;
  const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true, dateNF: 'yyyy-mm-dd' });
  // ?ㅻ뜑 R9 (index 8): "?쒗뿕 ?좎쭨", "Sample #1", "Sample #2", "Sample #3", ..., "Weight #1", "Weight #2"
  // ?곗씠??R10 (index 9) 遺??  const headerRow = json[8] || [];
  const dateIdx = 0;
  const s1Idx = 1, s2Idx = 2, s3Idx = 3;
  // Weight 而щ읆 ?꾩튂 李얘린
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
      // SheetJS cellDates:true??UTC ?먯젙 湲곗? Date瑜??앹꽦 ???쒓뎅?쒓컙(UTC+9)?먯꽌 ?섎（ ?욎쑝濡?諛由?      // +1??蹂댁젙 ??UTC 硫붿꽌?쒕줈 ?좎쭨 異붿텧
      const fixed = new Date(d.getTime() + 86400000);
      dateStr = `${fixed.getUTCFullYear()}-${String(fixed.getUTCMonth()+1).padStart(2,'0')}-${String(fixed.getUTCDate()).padStart(2,'0')}`;
    } else if (typeof d === 'string') {
      const m = d.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
      if (!m) continue;
      dateStr = `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    } else continue;
    // 2026???곗씠?곕쭔 (?ъ슜???붿껌)
    if (!dateStr.startsWith('2026')) continue;

    // B,C 媛뺣룄 ?됯퇏 (?ъ슜?먭? ?붿껌??B/C ??而щ읆)
    const s1 = row[s1Idx], s2 = row[s2Idx];
    const strengths = [s1, s2].filter(v => v !== null && v !== undefined && !isNaN(v));
    const strength = strengths.length ? strengths.reduce((a,b)=>a+b,0)/strengths.length : null;

    // K,L Weight ?됯퇏
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
      note: 'GCK ?뚯씪 ?먮룞 ?낅줈??,
    });
  }
}

// ===== 吏꾩엯??=====
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

// ?? ?ㅼ씠罹먯뒪??媛뺣룄 ?쒗뿕 蹂닿퀬????????????????????????????????????????

// 遺꾩꽍 沅뚯옣?ы빆 諛곗뿴 諛섑솚 (?꾩옱 ?꾪꽣 rows 湲곗?)
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
    recs.push({ level: 'critical', text: `<b>${escHtml(r.measure_date)} ${escHtml(r.spec)} (${escHtml(r.source)})</b> ??媛뺣룄 ${r.strength.toFixed(1)} kgf (湲곗? ${r.threshold} kgf ?鍮?${Math.abs(r._diff).toFixed(1)} kgf 誘몃떖). ?쒗뿕 ?ъ쭊??/ ?됯납 議곗꽦 ?먭? 沅뚯옣.` });
  });
  Object.entries(specStats).forEach(([sp, st]) => {
    if (st.total >= 4 && st.ng / st.total > 0.10) {
      recs.push({ level: 'warning', text: `?ъ뼇 <b>${escHtml(sp)}</b> ??NG??${(st.ng/st.total*100).toFixed(1)}% (${st.ng}/${st.total}嫄?. 10% 珥덇낵, 紐⑤땲?곕쭅 媛뺥솕 ?꾩슂.` });
    }
  });
  ['4000G', 'S-TILT'].forEach(sp => {
    const sidiz = avg(rows.filter(r => r.spec === sp && r.source === '?쒕뵒利?).map(r => r.strength));
    const gck   = avg(rows.filter(r => r.spec === sp && r.source === 'GCK').map(r => r.strength));
    if (sidiz !== null && gck !== null) {
      const diff = Math.abs(sidiz - gck);
      const pct  = diff / Math.min(sidiz, gck) * 100;
      if (pct > 20) {
        recs.push({ level: 'info', text: `<b>${escHtml(sp)}</b> ???쒕뵒利?${sidiz.toFixed(1)}) vs GCK(${gck.toFixed(1)}) 媛뺣룄 李⑥씠 ${diff.toFixed(1)} kgf (${pct.toFixed(1)}%). 痢≪젙 ?섍꼍쨌諛⑸쾿 ?먭? 沅뚯옣.` });
      }
    }
  });
  if (recs.length === 0) recs.push({ level: 'info', text: '紐⑤뱺 痢≪젙媛믪씠 湲곗? ?댁긽 ???덉젙???덉쭏 ?좎? 以?' });
  return recs;
}

// ?꾩껜 ?곗씠??STATE.die)濡??ㅽ봽?ㅽ겕由?異붿씠 李⑦듃 ?앹꽦 ????諛곌꼍 PNG DataURL
// 蹂닿퀬???쎌엯 ?꾩슜 ???꾪꽣 湲곌컙怨?臾닿??섍쾶 1???꾩옱 ?꾩껜 湲곌컙???쒖떆
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

  // ?ㅽ봽?ㅽ겕由?罹붾쾭?ㅼ뿉 Chart.js ?뚮뜑 (animation:false ???숆린)
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
             title: { display: true, text: '媛뺣룄 (kgf)', font: { size: 10 } } }
      },
      plugins: {
        legend: { position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 10 } } },
        datalabels: { display: false }
      }
    }
  });

  // ??諛곌꼍 ?⑹꽦
  const off = document.createElement('canvas');
  off.width = canvas.width; off.height = canvas.height;
  const offCtx = off.getContext('2d');
  offCtx.fillStyle = '#ffffff';
  offCtx.fillRect(0, 0, off.width, off.height);
  offCtx.drawImage(canvas, 0, 0);
  tmpChart.destroy();

  return off.toDataURL('image/png');
}

// 罹붾쾭??????諛곌꼍 PNG DataURL
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
  const period = from && to ? `${from} ~ ${to}` : from ? `${from} ?댄썑` : to ? `~ ${to}` : '?꾩껜 湲곌컙';

  // ?쒕즺紐? ?꾩옱 ?꾪꽣 湲곗? ?ъ뼇 紐⑸줉 (吏???쒖꽌)
  const specSet = new Set(filtered.map(r => r.spec).filter(Boolean));
  const specNames = DIE_SPEC_ORDER_REP.filter(s => specSet.has(s))
    .concat([...specSet].filter(s => !DIE_SPEC_ORDER_REP.includes(s)))
    .join(', ') || '?꾩껜';

  // ?? 遺꾩꽍 寃곌낵: ':' ?뺤떇?쇰줈 蹂??????????????????????
  const recs = _getDieDiagRecs(filtered);
  const recItems = recs.map(r => {
    const prefix = r.level === 'critical'
      ? '<span style="color:red;font-weight:bold;">[二쇱쓽]</span> '
      : r.level === 'warning'
      ? '<span style="color:#CC7700;font-weight:bold;">[寃쎄퀬]</span> '
      : '';
    return `<p style="margin: 3px 0 3px 15px; font-size: 10pt;">: ${prefix}${r.text}</p>`;
  }).join('\n');

  // ?? 李⑦듃 ?대?吏 罹≪퀜 ?????????????????????????????
  // 異붿씠 李⑦듃: STATE.die ?꾩껜 ?곗씠???ㅽ봽?ㅽ겕由??ъ깮??(?꾪꽣 湲곌컙 臾닿?)
  const imgTrend   = _createDieTrendImageFull();
  const imgAvg     = _captureChart('str-die-avg');
  const imgCompare = _captureChart('str-die-compare-strength');

  // ?? EP ?명솚 HTML ?앹꽦 ??諛붾줈 ?ㅼ슫濡쒕뱶 ??????????????
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>?ㅼ씠罹먯뒪??媛뺣룄 ?쒗뿕 蹂닿퀬??/title>
</head>
<body style="font-family: '留묒? 怨좊뵓', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 1.8; color: #000000;">

<p style="font-weight: bold; font-size: 10pt; margin: 20px 0 8px 0;">1. ?쒗뿕 ?뺣낫</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">1) ?쒗뿕 ?댁슜 : ?ㅼ씠罹먯뒪??媛뺣룄 ?쒗뿕 (?됯납)</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">2) ?쒗뿕 ?λ퉬 : UTM (留뚮뒫 ?щ즺 ?쒗뿕湲?5.0 Ton)</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">3) ?쒗뿕 ?쇱옄 : ${period}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">4) ?쒕즺 : ${specNames}</p>

<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">2. ?쒗뿕 寃곌낵</p>
${recItems}

<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">3. 痢≪젙 寃곌낵 洹몃옒??/p>
${imgTrend ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">1) ?ъ뼇蹂??붾퀎 媛뺣룄 異붿씠 (湲곗????먮룞 ?쒖떆 쨌 ?꾩껜 湲곌컙)</p>
<img src="${imgTrend}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${imgAvg ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">2) ?ъ뼇蹂??됯퇏 媛뺣룄 (湲곗? ?鍮? ${period})</p>
<img src="${imgAvg}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${imgCompare ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">3) ?쒕뵒利?vs GCK 媛뺣룄 鍮꾧탳 (4000G / S-TILT, kgf)</p>
<img src="${imgCompare}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}

</body>
</html>`;

  // ?앹뾽 ?놁씠 諛붾줈 ?ㅼ슫濡쒕뱶
  var _blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var _url  = URL.createObjectURL(_blob);
  var _a    = document.createElement('a');
  _a.href   = _url;
  _a.download = '?ㅼ씠罹먯뒪??媛뺣룄?쒗뿕_蹂닿퀬??html';
  document.body.appendChild(_a);
  _a.click();
  document.body.removeChild(_a);
  setTimeout(function(){ URL.revokeObjectURL(_url); }, 1000);
};

// ?꾩껜 ?곗씠??STATE.inj)濡??ㅽ봽?ㅽ겕由?異붿씠 李⑦듃 ?앹꽦 ????諛곌꼍 PNG DataURL
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
    label: '湲곗? 1,134.7',
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
             title: { display: true, text: '媛뺣룄 (kgf)', font: { size: 10 } } }
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
  const period = from && to ? `${from} ~ ${to}` : from ? `${from} ?댄썑` : to ? `~ ${to}` : '?꾩껜 湲곌컙';

  // ?쒕즺紐? ?ъ뼇 + ?щ즺 議고빀 (以묐났 ?쒓굅, ?? 690 媛?WW SNB240G33)
  const specimenSet = new Set();
  filtered.forEach(r => {
    const key = r.material ? `${r.spec} ${r.material}`.trim() : r.spec;
    specimenSet.add(key);
  });
  const specimenNames = [...specimenSet].sort().join(', ') || '?꾩껜';

  // ?먮룞 遺꾩꽍 沅뚯옣 議곗튂?ы빆 (遺덈웾遺꾩꽍 由ы룷?몄? ?숈씪 濡쒖쭅)
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
    recs.push({ level: 'critical', text: `${r.measure_date} ${r.spec} ??媛뺣룄 ${r.strength.toFixed(1)} kgf (湲곗? ${INJ_THR} ?鍮?${r._diff.toFixed(1)} kgf 誘몃떖). ?ъ텧 議곌굔/?щ즺 ?먭? 沅뚯옣.` });
  });
  Object.entries(specStats).forEach(([sp, st]) => {
    if (st.total >= 4 && st.ng / st.total > 0.10) {
      recs.push({ level: 'warning', text: `?ъ뼇 ${sp} ??NG??${(st.ng/st.total*100).toFixed(1)}% (${st.ng}/${st.total}嫄?. 紐⑤땲?곕쭅 媛뺥솕.` });
    }
  });
  Object.keys(specStats).forEach(sp => {
    const sAvg = avg(filtered.filter(r => r.spec === sp).map(r => r.strength));
    if (sAvg !== null && sAvg < INJ_THR + 30 && sAvg > INJ_THR) {
      recs.push({ level: 'warning', text: `?ъ뼇 ${sp} ???됯퇏 媛뺣룄 ${sAvg.toFixed(1)} kgf, 湲곗? ?鍮??덉쟾留덉쭊 30 kgf 誘몃쭔. ?좎옱 NG ?꾪뿕.` });
    }
  });
  if (recs.length === 0) recs.push({ level: 'info', text: '紐⑤뱺 痢≪젙媛믪씠 湲곗? ?댁긽 ???덉젙???덉쭏 ?좎? 以?' });

  const recItems = recs.map(r => {
    const prefix = r.level === 'critical'
      ? '<span style="color:red;font-weight:bold;">[二쇱쓽]</span> '
      : r.level === 'warning'
      ? '<span style="color:#CC7700;font-weight:bold;">[寃쎄퀬]</span> '
      : '';
    return `<p style="margin: 3px 0 3px 15px; font-size: 10pt;">: ${prefix}${r.text}</p>`;
  }).join('\n');

  // 李⑦듃 罹≪퀜: ?꾩껜湲곌컙 異붿씠(?ㅽ봽?ㅽ겕由? + ?꾪꽣湲곌컙 ?됯퇏媛뺣룄 + ?ъ뼇蹂??됯퇏 以묐웾
  const imgTrend  = _createInjTrendImageFull();
  const imgAvg    = _captureChart('str-inj-avg');
  const imgWeight = _captureChart('str-inj-weight');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>?ъ텧 踰좎씠??媛뺣룄 ?쒗뿕 蹂닿퀬??/title>
</head>
<body style="font-family: '留묒? 怨좊뵓', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 1.8; color: #000000;">

<p style="font-weight: bold; font-size: 10pt; margin: 20px 0 8px 0;">1. ?쒗뿕 ?뺣낫</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">1) ?쒗뿕 ?댁슜 : ?ъ텧 踰좎씠??媛뺣룄 ?쒗뿕</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">2) ?쒗뿕 ?λ퉬 : UTM (留뚮뒫 ?щ즺 ?쒗뿕湲?5.0 Ton)</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">3) ?쒗뿕 ?쇱옄 : ${period}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">4) ?쒕즺紐?: ${specimenNames}</p>

<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">2. ?쒗뿕 寃곌낵</p>
${recItems}

<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">3. 痢≪젙 寃곌낵 洹몃옒??/p>
${imgTrend ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">1) ?ъ뼇蹂??붾퀎 媛뺣룄 異붿씠 (湲곗? 1,134.7 kgf 쨌 ?꾩껜 湲곌컙)</p>
<img src="${imgTrend}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${imgAvg ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">2) ?ъ뼇蹂??됯퇏 媛뺣룄 (湲곗? ?鍮? ${period})</p>
<img src="${imgAvg}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${imgWeight ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">3) ?ъ뼇蹂??됯퇏 以묐웾 (g, ${period})</p>
<img src="${imgWeight}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}

</body>
</html>`;

  var _blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var _url  = URL.createObjectURL(_blob);
  var _a    = document.createElement('a');
  _a.href   = _url;
  _a.download = '?ъ텧踰좎씠??媛뺣룄?쒗뿕_蹂닿퀬??html';
  document.body.appendChild(_a);
  _a.click();
  document.body.removeChild(_a);
  setTimeout(function(){ URL.revokeObjectURL(_url); }, 1000);
};

})();

