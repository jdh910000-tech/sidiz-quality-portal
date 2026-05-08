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
};

// ===== 다이캐스팅 =====
function getDieFiltered() {
  const spec = $('str-die-spec').value, source = $('str-die-source').value;
  const j = $('str-die-judge').value;
  const from = $('str-die-from').value, to = $('str-die-to').value;
  return STATE.die.filter(r =>
    (!spec || r.spec === spec) &&
    (!source || r.source === source) &&
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

  // 사양별 평균 강도 vs 기준
  const specAvgs = specs.map(s => avg(rows.filter(r => r.spec === s).map(r => r.strength)));
  const specThres = specs.map(s => DIE_SPEC_THRESHOLDS[s] || 0);
  makeBar('dieAvg', $('str-die-avg').getContext('2d'), specs, [
    { label: '평균 강도', data: specAvgs, backgroundColor: PALETTE.slice(0, specs.length), borderRadius: 6 },
    { label: '기준', data: specThres, backgroundColor: '#FF8C00AA', borderRadius: 6, type: 'line', borderColor: C.rose, borderDash: [4,4], borderWidth: 2, pointRadius: 4, fill: false },
  ], {
    scales: { y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: 'kgf', font: { size: 10 } } }, x: { grid: { display: false } } },
    plugins: { legend: { display: true, position: 'top', align: 'end' }, datalabels: { display: false } }
  });

  // 시디즈 vs GCK (4000G / S-TILT)
  const compareSpecs = ['4000G', 'S-TILT'];
  const sourcesOrder = ['시디즈', 'GCK'];
  const compareDatasets = sourcesOrder.map((src, i) => ({
    label: src,
    data: compareSpecs.map(sp => avg(rows.filter(r => r.spec === sp && r.source === src).map(r => r.strength))),
    backgroundColor: i === 0 ? C.blue : C.amber,
    borderRadius: 6,
  }));
  makeBar('dieCompare', $('str-die-compare').getContext('2d'), compareSpecs, compareDatasets, {
    scales: { y: { beginAtZero: false, grid: { color: C.border }, title: { display: true, text: '평균 강도 (kgf)', font: { size: 10 } } }, x: { grid: { display: false } } },
    plugins: { legend: { display: true, position: 'top', align: 'end' }, datalabels: { anchor: 'end', align: 'top', color: C.text, font: { weight: 700, size: 11 }, formatter: v => v ? v.toFixed(0) : '-' } }
  });

  // 부적합 도넛
  const ok = rows.filter(r => judge(r) === 'OK').length;
  const ng = rows.filter(r => judge(r) === 'NG').length;
  makeDoughnut('dieJudge', $('str-die-judge-pie').getContext('2d'), ['OK (적합)', 'NG (부적합)'], [ok, ng], [C.emerald, C.rose]);
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
    { label: '평균 강도', data: specAvgs, backgroundColor: PALETTE.slice(0, specs.length), borderRadius: 6 },
    { label: '기준', data: specs.map(() => 1134.7), type: 'line', borderColor: C.rose, borderDash: [4,4], borderWidth: 2, pointRadius: 4, fill: false },
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
    const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': 'return=representation' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    alert('✅ 저장 완료');
    document.querySelectorAll(`#str-form-${kind} input:not([type="date"])`).forEach(i => i.value = '');
    await loadStrengthData(true);
    if (kind === 'die') renderDie(); else renderInj();
  } catch (e) {
    console.error(e); alert('❌ 저장 실패: ' + e.message);
  }
}

window.deleteStrengthRow = async function (table, id) {
  if (!confirm('이 측정이력을 삭제하시겠습니까?')) return;
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
    ['str-die-spec', 'str-die-source', 'str-die-judge', 'str-die-from', 'str-die-to'].forEach(id => $(id).value = '');
    renderDie();
  } else {
    ['str-inj-spec', 'str-inj-judge', 'str-inj-from', 'str-inj-to'].forEach(id => $(id).value = '');
    renderInj();
  }
};

window.exportStrength = function (kind) {
  if (!window.XLSX) { alert('XLSX 라이브러리 미로드'); return; }
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let rows, header, mapper, filename;
  if (kind === 'die') {
    rows = getDieFiltered();
    filename = `강도시험_다이캐스팅_${today}.xlsx`;
    header = ['측정일', '사양', '측정 주체', '금형번호', '중량(g)', '강도(kgf)', '기준(kgf)', '판정'];
    mapper = r => [r.measure_date, r.spec, r.source, r.mold_number, r.weight, r.strength, r.threshold, judge(r)];
  } else {
    rows = getInjFiltered();
    filename = `강도시험_사출베이스_${today}.xlsx`;
    header = ['측정일', '사양', '재료', '중량(g)', '강도(kgf)', '기준(kgf)', '판정'];
    mapper = r => [r.measure_date, r.spec, r.material, r.weight, r.strength, r.threshold, judge(r)];
  }
  const aoa = [header, ...rows.sort((a,b)=>(b.measure_date||'').localeCompare(a.measure_date||'')).map(mapper)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = header.map(() => ({ wch: 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '데이터');
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

    if (!confirm(`총 ${records.length}건의 GCK 측정 데이터를 추가하시겠습니까?`)) {
      event.target.value = '';
      return;
    }

    const res = await fetch(`${SB_URL}/rest/v1/strength_diecasting`, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
      body: JSON.stringify(records),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    alert(`✅ GCK ${records.length}건 업로드 완료`);
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
      dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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
    ['str-die-spec', 'str-die-source', 'str-die-judge', 'str-die-from', 'str-die-to'].forEach(id => $(id)?.addEventListener('input', renderDie));
    ['str-inj-spec', 'str-inj-judge', 'str-inj-from', 'str-inj-to'].forEach(id => $(id)?.addEventListener('input', renderInj));
    STATE.bound = true;
  }
  switchLabTab(STATE.currentTab);
};

})();
