/* incoming-data.js — 인수검사 (볼트/중심봉/스폰지) Supabase 연동 + 차트 + 입력 + 리포트 */
(function () {
'use strict';

// ===== 전역 상태 =====
const STATE = {
  bolts: [], rods: [], sponges: [],
  loaded: false,
  currentTab: 'bolt',
  charts: {}, // chart instance 보관
};

const SIDIZ_COLORS = {
  blue: '#002BD2', blueLight: '#3C7DFF', blueBright: '#1A59FF',
  cyan: '#54DBC2', emerald: '#00b87a', amber: '#e6a800',
  rose: '#FF6C39', violet: '#7c5fe6', navy: '#000077',
  text: '#111111', muted: '#8a8a9a', border: '#E2E2EA',
};
const PALETTE = [SIDIZ_COLORS.blue, SIDIZ_COLORS.cyan, SIDIZ_COLORS.emerald, SIDIZ_COLORS.amber,
                 SIDIZ_COLORS.rose, SIDIZ_COLORS.violet, SIDIZ_COLORS.blueLight, '#94a3b8'];

// ===== 헬퍼 =====
const $ = (id) => document.getElementById(id);
function avg(arr) {
  const v = arr.filter(x => x !== null && x !== undefined && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function fmt(n, d = 1) { return (n === null || n === undefined || isNaN(n)) ? '-' : Number(n).toFixed(d); }
function uniq(arr) { return [...new Set(arr)].filter(v => v !== null && v !== undefined && v !== ''); }
function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function inDateRange(date, from, to) {
  if (!date) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

// ===== Supabase 설정 (supabase-client.js와 동일) =====
const SB_URL = 'https://cyxnbwczcvjeaqmrdzcb.supabase.co';
const SB_KEY = 'sb_publishable_i2Cw7SPjRn1BDa5XS-2NyA_qHNRC8Y5';
const SB_HEADERS = {
  'apikey': SB_KEY,
  'Authorization': `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json'
};

// ===== Supabase 페칭 =====
async function loadIncomingData(force = false) {
  if (STATE.loaded && !force) return;
  try {
    const headers = SB_HEADERS;
    const baseUrl = SB_URL;

    async function fetchAll(table) {
      const PAGE = 1000;
      let all = [], offset = 0;
      while (true) {
        const res = await fetch(`${baseUrl}/rest/v1/${table}?select=*&order=measure_date.desc`, {
          headers: { ...headers, 'Range': `${offset}-${offset + PAGE - 1}`, 'Range-Unit': 'items' }
        });
        if (!res.ok) throw new Error(`${table} fetch failed: ${res.status}`);
        const rows = await res.json();
        all = all.concat(rows);
        if (rows.length < PAGE) break;
        offset += PAGE;
      }
      return all;
    }

    const [bolts, rods, sponges] = await Promise.all([
      fetchAll('incoming_bolts'),
      fetchAll('incoming_rods'),
      fetchAll('incoming_sponges'),
    ]);
    STATE.bolts = bolts;
    STATE.rods = rods;
    STATE.sponges = sponges;
    STATE.loaded = true;
    console.log(`[인수검사] 볼트=${bolts.length}, 중심봉=${rods.length}, 스폰지=${sponges.length}`);
  } catch (e) {
    console.error('[인수검사] 로드 실패:', e);
    alert('인수검사 데이터 로드 실패: ' + e.message);
  }
}

// ===== Chart.js 기본 설정 =====
function chartDefault() {
  if (window.Chart && window.ChartDataLabels) {
    try { Chart.register(window.ChartDataLabels); } catch (e) {}
  }
  if (window.Chart) {
    Chart.defaults.font.family = "'Noto Sans KR', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = SIDIZ_COLORS.text;
    Chart.defaults.plugins.datalabels = { display: false };
  }
}

// ===== 서브탭 전환 =====
window.switchInspectTab = function (tab) {
  STATE.currentTab = tab;
  document.querySelectorAll('.inspect-subtab').forEach(b => b.classList.remove('active'));
  document.querySelector(`.inspect-subtab[data-tab="${tab}"]`)?.classList.add('active');
  document.querySelectorAll('.inspect-pane').forEach(p => p.style.display = 'none');
  const pane = document.getElementById(`inspect-pane-${tab}`);
  if (pane) pane.style.display = 'block';
  // 렌더
  if (tab === 'bolt') renderBolt();
  else if (tab === 'rod') renderRod();
  else if (tab === 'sponge') renderSponge();
  else if (tab === 'report') renderReport();
};

// ===== 측정 평균/판정 =====
function boltHV(r) { return avg([r.hv1, r.hv2]); }
function boltHRC(r) { return avg([r.hrc1, r.hrc2]); }
function rodH(r) { return avg([r.h1, r.h2]); }
function rodJudge(r) {
  const h = rodH(r), w = r.wobble;
  if (h === null && (w === null || w === undefined)) return '';
  const hOk = h === null || (h >= 5.0 && h <= 7.0);
  const wOk = (w === null || w === undefined) || w <= 1.0;
  return (hOk && wOk) ? 'OK' : 'NG';
}
function spongeAvg(r) {
  return avg([r.m1_center, r.m1_left, r.m1_right, r.m2_center, r.m2_left, r.m2_right]);
}
function spongeJudge(r) {
  const a = spongeAvg(r);
  if (a === null || r.spec_target === null || r.spec_target === undefined) return '';
  const tol = r.spec_tol || 5;
  return Math.abs(a - r.spec_target) <= tol ? 'OK' : 'NG';
}

// ===== 공통: 필터/드롭다운 초기화 =====
function fillSelect(sel, options, placeholder = '전체') {
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = `<option value="">${placeholder}</option>` +
    options.map(o => `<option value="${escHtml(o.value)}">${escHtml(o.label)}</option>`).join('');
  if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
}

// ===== 차트 헬퍼 =====
function destroyChart(key) {
  if (STATE.charts[key]) { STATE.charts[key].destroy(); STATE.charts[key] = null; }
}
function makeLine(key, ctx, labels, datasets, opts = {}) {
  destroyChart(key);
  STATE.charts[key] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: Object.assign({
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } } },
        y: { grid: { color: SIDIZ_COLORS.border } }
      },
      plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 10 } } } }
    }, opts)
  });
}
function makeBar(key, ctx, labels, datasets, opts = {}) {
  destroyChart(key);
  STATE.charts[key] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: Object.assign({
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: false, grid: { color: SIDIZ_COLORS.border } }, x: { grid: { display: false } } },
      plugins: {
        legend: { display: false },
        datalabels: { anchor: 'end', align: 'top', color: SIDIZ_COLORS.text, font: { weight: 700, size: 11 },
          formatter: v => v == null ? '-' : (Math.abs(v) < 10 ? v.toFixed(2) : v.toFixed(1)) }
      }
    }, opts)
  });
}
function makeDoughnut(key, ctx, labels, data, colors, opts = {}) {
  destroyChart(key);
  STATE.charts[key] = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
    options: Object.assign({
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 } } },
        datalabels: {
          color: '#fff', font: { weight: 700, size: 12 },
          formatter: (v, ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            return total && v ? Math.round(v / total * 100) + '%' : '';
          }
        }
      }
    }, opts)
  });
}

// ============ 볼트 탭 ============
function getBoltFilters() {
  return {
    supplier: $('inq-bolt-supplier').value,
    color: $('inq-bolt-color').value,
    code: $('inq-bolt-code').value,
    from: $('inq-bolt-from').value,
    to: $('inq-bolt-to').value,
  };
}
function getBoltFiltered() {
  const f = getBoltFilters();
  return STATE.bolts.filter(r =>
    (!f.supplier || r.supplier === f.supplier) &&
    (!f.color || r.color === f.color) &&
    (!f.code || r.code === f.code) &&
    inDateRange(r.measure_date, f.from, f.to)
  );
}
function renderBoltKPI(rows) {
  const hvAvg = avg(rows.map(boltHV));
  const hrcAvg = avg(rows.map(boltHRC));
  const codes = uniq(rows.map(r => r.code));
  const sups = uniq(rows.map(r => r.supplier));
  $('inq-bolt-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">총 측정 건수</div><div class="kpi-value">${rows.length.toLocaleString()}</div><div class="kpi-change">검사 횟수</div></div>
    <div class="kpi-card"><div class="kpi-label">자재 종류</div><div class="kpi-value">${codes.length}</div><div class="kpi-change">자재코드 기준</div></div>
    <div class="kpi-card"><div class="kpi-label">평균 HV (비커스)</div><div class="kpi-value">${fmt(hvAvg, 1)}</div><div class="kpi-change">전체 평균</div></div>
    <div class="kpi-card"><div class="kpi-label">평균 HRC (로크웰)</div><div class="kpi-value">${fmt(hrcAvg, 1)}</div><div class="kpi-change">${sups.length}개사 (${sups.join(' · ')})</div></div>
  `;
}
function renderBoltCharts(rows) {
  // 일별 평균 추이
  const byDate = {};
  rows.forEach(r => {
    if (!r.measure_date) return;
    if (!byDate[r.measure_date]) byDate[r.measure_date] = { hv: [], hrc: [] };
    const hv = boltHV(r), hrc = boltHRC(r);
    if (hv !== null) byDate[r.measure_date].hv.push(hv);
    if (hrc !== null) byDate[r.measure_date].hrc.push(hrc);
  });
  const dates = Object.keys(byDate).sort();
  makeLine('boltTrend', $('inq-bolt-trend').getContext('2d'), dates, [
    { label: 'HV (비커스)', data: dates.map(d => avg(byDate[d].hv)), borderColor: SIDIZ_COLORS.blue, backgroundColor: SIDIZ_COLORS.blue + '20', yAxisID: 'y', tension: 0.3, pointRadius: 2, borderWidth: 2 },
    { label: 'HRC (로크웰)', data: dates.map(d => avg(byDate[d].hrc)), borderColor: SIDIZ_COLORS.rose, backgroundColor: SIDIZ_COLORS.rose + '20', yAxisID: 'y1', tension: 0.3, pointRadius: 2, borderWidth: 2 },
  ], {
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } } },
      y: { type: 'linear', position: 'left', title: { display: true, text: 'HV', font: { size: 10 } }, grid: { color: SIDIZ_COLORS.border } },
      y1: { type: 'linear', position: 'right', title: { display: true, text: 'HRC', font: { size: 10 } }, grid: { display: false } },
    }
  });

  // 공급업체별 도넛
  const sups = uniq(rows.map(r => r.supplier)).sort();
  const supCounts = sups.map(s => rows.filter(r => r.supplier === s).length);
  makeDoughnut('boltSup', $('inq-bolt-supplier-pie').getContext('2d'), sups, supCounts, PALETTE);

  // 공급업체별 평균 HV
  const supAvgs = sups.map(s => avg(rows.filter(r => r.supplier === s).map(boltHV)));
  makeBar('boltSupBar', $('inq-bolt-supplier-bar').getContext('2d'), sups, [
    { label: '평균 HV', data: supAvgs, backgroundColor: PALETTE.slice(0, sups.length), borderRadius: 6 }
  ]);

  // 색상별 분포
  const cols = uniq(rows.map(r => r.color)).sort();
  const colCounts = cols.map(c => rows.filter(r => r.color === c).length);
  makeBar('boltCol', $('inq-bolt-color-bar').getContext('2d'), cols, [
    { label: '측정 건수', data: colCounts, backgroundColor: PALETTE.slice(0, cols.length), borderRadius: 6 }
  ], { plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: SIDIZ_COLORS.text, font: { weight: 700, size: 11 } } } });
}
function renderBoltTable(rows) {
  $('inq-bolt-count').textContent = rows.length.toLocaleString();
  const sorted = [...rows].sort((a, b) => (b.measure_date || '').localeCompare(a.measure_date || ''));
  const tb = $('inq-bolt-table-body');
  if (!sorted.length) {
    tb.innerHTML = '<tr><td colspan="11" style="padding:40px;text-align:center;color:#8a8a9a">검색 결과가 없습니다</td></tr>';
    return;
  }
  tb.innerHTML = sorted.slice(0, 500).map(r => `
    <tr>
      <td>${escHtml(r.measure_date)}</td>
      <td>${escHtml(r.supplier)}</td>
      <td>${escHtml(r.code)}</td>
      <td>${escHtml(r.color || '')}</td>
      <td class="row-header" style="text-align:left">${escHtml(r.name)}</td>
      <td>${fmt(r.hv1)}</td><td>${fmt(r.hv2)}</td>
      <td class="highlight">${fmt(boltHV(r))}</td>
      <td>${fmt(r.hrc1)}</td><td>${fmt(r.hrc2)}</td>
      <td class="highlight">${fmt(boltHRC(r))}</td>
    </tr>`).join('');
}
function initBoltDropdowns() {
  fillSelect($('inq-bolt-supplier'), uniq(STATE.bolts.map(r => r.supplier)).sort().map(s => ({ value: s, label: s })));
  fillSelect($('inq-bolt-color'), uniq(STATE.bolts.map(r => r.color)).sort().map(s => ({ value: s, label: s })));
  // 자재 드롭다운: 코드 기반, 라벨 = "코드 — 자재명"
  const map = {};
  STATE.bolts.forEach(r => { if (r.code && !map[r.code]) map[r.code] = r.name; });
  const opts = Object.keys(map).sort().map(c => ({ value: c, label: `${c} — ${map[c]}` }));
  fillSelect($('inq-bolt-code'), opts, '전체 자재');
}
function renderBolt() {
  initBoltDropdowns();
  const rows = getBoltFiltered();
  renderBoltKPI(rows);
  renderBoltCharts(rows);
  renderBoltTable(rows);
}

// ============ 중심봉 탭 ============
function getRodFiltered() {
  const sup = $('inq-rod-supplier').value, col = $('inq-rod-color').value;
  const judge = $('inq-rod-judge').value, code = $('inq-rod-code').value;
  const from = $('inq-rod-from').value, to = $('inq-rod-to').value;
  return STATE.rods.filter(r =>
    (!sup || r.supplier === sup) &&
    (!col || r.color === col) &&
    (!judge || rodJudge(r) === judge) &&
    (!code || r.code === code) &&
    inDateRange(r.measure_date, from, to)
  );
}
function renderRodKPI(rows) {
  const hAvg = avg(rows.map(rodH));
  const wAvg = avg(rows.map(r => r.wobble));
  const ng = rows.filter(r => rodJudge(r) === 'NG').length;
  const ngRate = rows.length ? (ng / rows.length * 100) : 0;
  const codes = uniq(rows.map(r => r.code));
  $('inq-rod-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">총 측정 건수</div><div class="kpi-value">${rows.length.toLocaleString()}</div><div class="kpi-change">자재 ${codes.length}종</div></div>
    <div class="kpi-card"><div class="kpi-label">평균 테이퍼 높이</div><div class="kpi-value">${fmt(hAvg, 2)}</div><div class="kpi-change">기준 5.0~7.0</div></div>
    <div class="kpi-card"><div class="kpi-label">평균 와블</div><div class="kpi-value">${fmt(wAvg, 2)}</div><div class="kpi-change">기준 ≤1.0</div></div>
    <div class="kpi-card"><div class="kpi-label">기준 부적합</div><div class="kpi-value" style="background:linear-gradient(135deg,${ng>0?SIDIZ_COLORS.rose:SIDIZ_COLORS.emerald},${ng>0?'#ffb347':SIDIZ_COLORS.cyan});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${ng}</div><div class="kpi-change ${ng>0?'up':'down'}">${ngRate.toFixed(1)}% NG율</div></div>
  `;
}
function renderRodCharts(rows) {
  const byDate = {};
  rows.forEach(r => {
    if (!r.measure_date) return;
    if (!byDate[r.measure_date]) byDate[r.measure_date] = { h: [], w: [] };
    const h = rodH(r);
    if (h !== null) byDate[r.measure_date].h.push(h);
    if (r.wobble !== null && r.wobble !== undefined) byDate[r.measure_date].w.push(r.wobble);
  });
  const dates = Object.keys(byDate).sort();
  makeLine('rodTrend', $('inq-rod-trend').getContext('2d'), dates, [
    { label: '테이퍼 높이', data: dates.map(d => avg(byDate[d].h)), borderColor: SIDIZ_COLORS.blue, backgroundColor: SIDIZ_COLORS.blue + '20', yAxisID: 'y', tension: 0.3, pointRadius: 2, borderWidth: 2 },
    { label: '와블', data: dates.map(d => avg(byDate[d].w)), borderColor: SIDIZ_COLORS.violet, backgroundColor: SIDIZ_COLORS.violet + '20', yAxisID: 'y1', tension: 0.3, pointRadius: 2, borderWidth: 2 },
    { label: '높이 상한', data: dates.map(() => 7.0), borderColor: SIDIZ_COLORS.rose, borderWidth: 1, borderDash: [4, 4], pointRadius: 0, fill: false, yAxisID: 'y' },
    { label: '높이 하한', data: dates.map(() => 5.0), borderColor: SIDIZ_COLORS.rose, borderWidth: 1, borderDash: [4, 4], pointRadius: 0, fill: false, yAxisID: 'y' },
    { label: '와블 한계', data: dates.map(() => 1.0), borderColor: SIDIZ_COLORS.violet, borderWidth: 1, borderDash: [2, 2], pointRadius: 0, fill: false, yAxisID: 'y1' },
  ], {
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } } },
      y: { type: 'linear', position: 'left', suggestedMin: 4.5, suggestedMax: 7.5, title: { display: true, text: '높이 (mm)', font: { size: 10 } }, grid: { color: SIDIZ_COLORS.border } },
      y1: { type: 'linear', position: 'right', suggestedMin: 0, suggestedMax: 1.5, title: { display: true, text: '와블', font: { size: 10 } }, grid: { display: false } },
    }
  });

  const sups = uniq(rows.map(r => r.supplier)).sort();
  makeDoughnut('rodSup', $('inq-rod-supplier-pie').getContext('2d'), sups,
    sups.map(s => rows.filter(r => r.supplier === s).length), PALETTE);

  const wAvgs = sups.map(s => avg(rows.filter(r => r.supplier === s).map(r => r.wobble)));
  makeBar('rodWobble', $('inq-rod-wobble').getContext('2d'), sups, [
    { label: '평균 와블', data: wAvgs, backgroundColor: PALETTE.slice(0, sups.length), borderRadius: 6 }
  ], { scales: { y: { beginAtZero: true, suggestedMax: 1.2, grid: { color: SIDIZ_COLORS.border } }, x: { grid: { display: false } } } });

  const ok = rows.filter(r => rodJudge(r) === 'OK').length;
  const ng = rows.filter(r => rodJudge(r) === 'NG').length;
  makeDoughnut('rodJudge', $('inq-rod-judge-pie').getContext('2d'),
    ['OK (적합)', 'NG (부적합)'], [ok, ng], [SIDIZ_COLORS.emerald, SIDIZ_COLORS.rose]);
}
function renderRodTable(rows) {
  $('inq-rod-count').textContent = rows.length.toLocaleString();
  const sorted = [...rows].sort((a, b) => (b.measure_date || '').localeCompare(a.measure_date || ''));
  const tb = $('inq-rod-table-body');
  if (!sorted.length) {
    tb.innerHTML = '<tr><td colspan="10" style="padding:40px;text-align:center;color:#8a8a9a">검색 결과가 없습니다</td></tr>';
    return;
  }
  tb.innerHTML = sorted.slice(0, 500).map(r => {
    const j = rodJudge(r);
    return `<tr>
      <td>${escHtml(r.measure_date)}</td>
      <td>${escHtml(r.supplier)}</td>
      <td>${escHtml(r.code)}</td>
      <td>${escHtml(r.color || '')}</td>
      <td class="row-header" style="text-align:left">${escHtml(r.name)}</td>
      <td>${fmt(r.h1, 2)}</td><td>${fmt(r.h2, 2)}</td>
      <td class="highlight">${fmt(rodH(r), 2)}</td>
      <td>${fmt(r.wobble, 2)}</td>
      <td><span class="${j === 'NG' ? 'danger' : (j === 'OK' ? 'success' : '')}">${j || '-'}</span></td>
    </tr>`;
  }).join('');
}
function initRodDropdowns() {
  fillSelect($('inq-rod-supplier'), uniq(STATE.rods.map(r => r.supplier)).sort().map(s => ({ value: s, label: s })));
  fillSelect($('inq-rod-color'), uniq(STATE.rods.map(r => r.color)).sort().map(s => ({ value: s, label: s })));
  const map = {};
  STATE.rods.forEach(r => { if (r.code && !map[r.code]) map[r.code] = r.name; });
  fillSelect($('inq-rod-code'), Object.keys(map).sort().map(c => ({ value: c, label: `${c} — ${map[c]}` })), '전체 자재');
}
function renderRod() {
  initRodDropdowns();
  const rows = getRodFiltered();
  renderRodKPI(rows);
  renderRodCharts(rows);
  renderRodTable(rows);
}

// ============ 스폰지 탭 ============
function getSpongeFiltered() {
  const judge = $('inq-sponge-judge').value;
  const code = $('inq-sponge-code').value, from = $('inq-sponge-from').value, to = $('inq-sponge-to').value;
  return STATE.sponges.filter(r =>
    (!judge || spongeJudge(r) === judge) &&
    (!code || r.code === code) &&
    inDateRange(r.measure_date, from, to)
  );
}
function renderSpongeKPI(rows) {
  const allAvg = avg(rows.map(spongeAvg));
  const ng = rows.filter(r => spongeJudge(r) === 'NG').length;
  const ngRate = rows.length ? (ng / rows.length * 100) : 0;
  const codes = uniq(rows.map(r => r.code));
  const cAvg = avg(rows.flatMap(r => [r.m1_center, r.m2_center]));
  const lAvg = avg(rows.flatMap(r => [r.m1_left, r.m2_left]));
  const rAvg = avg(rows.flatMap(r => [r.m1_right, r.m2_right]));
  $('inq-sponge-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">총 측정 건수</div><div class="kpi-value">${rows.length.toLocaleString()}</div><div class="kpi-change">자재 ${codes.length}종</div></div>
    <div class="kpi-card"><div class="kpi-label">전체 평균 경도</div><div class="kpi-value">${fmt(allAvg, 1)}</div><div class="kpi-change">중·좌·우 종합</div></div>
    <div class="kpi-card"><div class="kpi-label">위치별 평균</div><div class="kpi-value" style="font-size:18px">중 ${fmt(cAvg,1)} · 좌 ${fmt(lAvg,1)} · 우 ${fmt(rAvg,1)}</div><div class="kpi-change">중앙·좌·우</div></div>
    <div class="kpi-card"><div class="kpi-label">기준 부적합</div><div class="kpi-value" style="background:linear-gradient(135deg,${ng>0?SIDIZ_COLORS.rose:SIDIZ_COLORS.emerald},${ng>0?'#ffb347':SIDIZ_COLORS.cyan});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${ng}</div><div class="kpi-change ${ng>0?'up':'down'}">${ngRate.toFixed(1)}% NG율</div></div>
  `;
}
function renderSpongeCharts(rows) {
  const specs = uniq(rows.map(r => r.spec_target).filter(v => v !== null && v !== undefined)).sort((a, b) => a - b);
  const allDates = uniq(rows.map(r => r.measure_date)).sort();
  const datasets = specs.map((spec, i) => ({
    label: `${spec} ± ${rows.find(r => r.spec_target === spec)?.spec_tol || 5}`,
    data: allDates.map(d => {
      const ms = rows.filter(r => r.measure_date === d && r.spec_target === spec).map(spongeAvg).filter(v => v !== null);
      return ms.length ? avg(ms) : null;
    }),
    borderColor: PALETTE[i % PALETTE.length],
    backgroundColor: PALETTE[i % PALETTE.length] + '20',
    tension: 0.3, borderWidth: 2, pointRadius: 2, spanGaps: true,
  }));
  makeLine('spongeTrend', $('inq-sponge-trend').getContext('2d'), allDates, datasets, {
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } } },
      y: { beginAtZero: false, title: { display: true, text: '경도', font: { size: 10 } }, grid: { color: SIDIZ_COLORS.border } }
    }
  });

  makeDoughnut('spongeSpec', $('inq-sponge-spec-pie').getContext('2d'),
    specs.map(s => `${s} ± 5`), specs.map(s => rows.filter(r => r.spec_target === s).length), PALETTE);

  const cVals = rows.flatMap(r => [r.m1_center, r.m2_center]).filter(v => v !== null && v !== undefined);
  const lVals = rows.flatMap(r => [r.m1_left, r.m2_left]).filter(v => v !== null && v !== undefined);
  const rVals = rows.flatMap(r => [r.m1_right, r.m2_right]).filter(v => v !== null && v !== undefined);
  makeBar('spongePos', $('inq-sponge-position').getContext('2d'), ['중앙', '좌', '우'], [
    { label: '평균', data: [avg(cVals), avg(lVals), avg(rVals)], backgroundColor: [SIDIZ_COLORS.blue, SIDIZ_COLORS.cyan, SIDIZ_COLORS.emerald], borderRadius: 6 }
  ]);

  const ok = rows.filter(r => spongeJudge(r) === 'OK').length;
  const ng = rows.filter(r => spongeJudge(r) === 'NG').length;
  makeDoughnut('spongeJudge', $('inq-sponge-judge-pie').getContext('2d'),
    ['OK (적합)', 'NG (부적합)'], [ok, ng], [SIDIZ_COLORS.emerald, SIDIZ_COLORS.rose]);
}
function renderSpongeTable(rows) {
  $('inq-sponge-count').textContent = rows.length.toLocaleString();
  const sorted = [...rows].sort((a, b) => (b.measure_date || '').localeCompare(a.measure_date || ''));
  const tb = $('inq-sponge-table-body');
  if (!sorted.length) {
    tb.innerHTML = '<tr><td colspan="12" style="padding:40px;text-align:center;color:#8a8a9a">검색 결과가 없습니다</td></tr>';
    return;
  }
  tb.innerHTML = sorted.slice(0, 500).map(r => {
    const a = spongeAvg(r), j = spongeJudge(r);
    const spec = r.spec_target ? `${r.spec_target} ± ${r.spec_tol || 5}` : '-';
    return `<tr>
      <td>${escHtml(r.measure_date)}</td>
      <td>${escHtml(r.code)}</td>
      <td class="row-header" style="text-align:left">${escHtml(r.name)}</td>
      <td>${spec}</td>
      <td>${fmt(r.m1_center)}</td><td>${fmt(r.m1_left)}</td><td>${fmt(r.m1_right)}</td>
      <td>${fmt(r.m2_center)}</td><td>${fmt(r.m2_left)}</td><td>${fmt(r.m2_right)}</td>
      <td class="highlight">${fmt(a)}</td>
      <td><span class="${j === 'NG' ? 'danger' : (j === 'OK' ? 'success' : '')}">${j || '-'}</span></td>
    </tr>`;
  }).join('');
}
function initSpongeDropdowns() {
  const map = {};
  STATE.sponges.forEach(r => { if (r.code && !map[r.code]) map[r.code] = r.name; });
  fillSelect($('inq-sponge-code'), Object.keys(map).sort().map(c => ({ value: c, label: `${c} — ${map[c]}` })), '전체 자재');
}
function renderSponge() {
  initSpongeDropdowns();
  const rows = getSpongeFiltered();
  renderSpongeKPI(rows);
  renderSpongeCharts(rows);
  renderSpongeTable(rows);
}

// ============ 불량 분석 리포트 ============
function renderReport() {
  const allRows = [
    ...STATE.bolts.map(r => ({ kind: '볼트', date: r.measure_date, supplier: r.supplier, code: r.code, name: r.name, judge: '-' })),
    ...STATE.rods.map(r => ({ kind: '중심봉', date: r.measure_date, supplier: r.supplier, code: r.code, name: r.name, judge: rodJudge(r), spec: '높이 5~7 / 와블 ≤1.0' })),
    ...STATE.sponges.map(r => ({ kind: '스폰지', date: r.measure_date, supplier: '-', code: r.code, name: r.name, judge: spongeJudge(r), spec: r.spec_target ? `${r.spec_target}±${r.spec_tol || 5}` : '-' })),
  ];

  const rodNG = STATE.rods.filter(r => rodJudge(r) === 'NG');
  const spongeNG = STATE.sponges.filter(r => spongeJudge(r) === 'NG');
  const totalNG = rodNG.length + spongeNG.length;
  const judgeable = STATE.rods.length + STATE.sponges.length;
  const ngRate = judgeable ? (totalNG / judgeable * 100) : 0;

  $('inq-report-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">전체 측정 건수</div><div class="kpi-value">${(STATE.bolts.length+STATE.rods.length+STATE.sponges.length).toLocaleString()}</div><div class="kpi-change">3개 자재 통합</div></div>
    <div class="kpi-card"><div class="kpi-label">전체 부적합 건수</div><div class="kpi-value" style="background:linear-gradient(135deg,${SIDIZ_COLORS.rose},#ffb347);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${totalNG}</div><div class="kpi-change up">중심봉 ${rodNG.length} · 스폰지 ${spongeNG.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">전체 부적합률</div><div class="kpi-value">${ngRate.toFixed(2)}%</div><div class="kpi-change">판정 대상 ${judgeable.toLocaleString()}건</div></div>
    <div class="kpi-card"><div class="kpi-label">중심봉 NG율</div><div class="kpi-value">${STATE.rods.length ? (rodNG.length/STATE.rods.length*100).toFixed(2) : '0.00'}%</div><div class="kpi-change">스폰지 NG율 ${STATE.sponges.length ? (spongeNG.length/STATE.sponges.length*100).toFixed(2) : '0.00'}%</div></div>
  `;

  // 자재별 NG TOP10 (NG 건수 + NG율)
  const codeStats = {};
  STATE.rods.forEach(r => {
    const k = `중심봉|${r.code}|${r.name}`;
    if (!codeStats[k]) codeStats[k] = { kind: '중심봉', code: r.code, name: r.name, total: 0, ng: 0 };
    codeStats[k].total++;
    if (rodJudge(r) === 'NG') codeStats[k].ng++;
  });
  STATE.sponges.forEach(r => {
    const k = `스폰지|${r.code}|${r.name}`;
    if (!codeStats[k]) codeStats[k] = { kind: '스폰지', code: r.code, name: r.name, total: 0, ng: 0 };
    codeStats[k].total++;
    if (spongeJudge(r) === 'NG') codeStats[k].ng++;
  });
  const ngList = Object.values(codeStats).filter(s => s.ng > 0).sort((a, b) => b.ng - a.ng).slice(0, 10);

  // NG TOP10 테이블
  $('inq-report-top10').innerHTML = ngList.length ? ngList.map((s, i) => `
    <tr>
      <td><span class="rct-rank-num ${i===0?'gold':i===1?'silver':i===2?'bronze':'normal'}">${i + 1}</span></td>
      <td>${escHtml(s.kind)}</td>
      <td>${escHtml(s.code)}</td>
      <td class="row-header" style="text-align:left">${escHtml(s.name)}</td>
      <td><span class="danger">${s.ng}</span></td>
      <td>${s.total}</td>
      <td><span class="${s.ng/s.total > 0.1 ? 'danger' : 'highlight'}">${(s.ng / s.total * 100).toFixed(1)}%</span></td>
    </tr>
  `).join('') : '<tr><td colspan="7" style="padding:40px;text-align:center;color:#8a8a9a">전체 적합 — 부적합 자재가 없습니다</td></tr>';

  // 월별 NG 추이 차트
  const ngByMonth = {};
  [...rodNG, ...spongeNG].forEach(r => {
    const m = (r.measure_date || '').slice(0, 7);
    if (!m) return;
    if (!ngByMonth[m]) ngByMonth[m] = { rod: 0, sponge: 0 };
    if (r.h1 !== undefined || r.wobble !== undefined) ngByMonth[m].rod++;
    else ngByMonth[m].sponge++;
  });
  const months = Object.keys(ngByMonth).sort();
  makeBar('reportTrend', $('inq-report-trend').getContext('2d'), months, [
    { label: '중심봉', data: months.map(m => ngByMonth[m].rod), backgroundColor: SIDIZ_COLORS.rose, borderRadius: 6, stack: 's' },
    { label: '스폰지', data: months.map(m => ngByMonth[m].sponge), backgroundColor: SIDIZ_COLORS.amber, borderRadius: 6, stack: 's' },
  ], {
    scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: SIDIZ_COLORS.border } } },
    plugins: { legend: { display: true, position: 'top', align: 'end' }, datalabels: { display: false } }
  });

  // 공급업체별 NG (중심봉 한정)
  const supStats = {};
  STATE.rods.forEach(r => {
    if (!supStats[r.supplier]) supStats[r.supplier] = { total: 0, ng: 0 };
    supStats[r.supplier].total++;
    if (rodJudge(r) === 'NG') supStats[r.supplier].ng++;
  });
  const sups = Object.keys(supStats).sort();
  makeBar('reportSupplier', $('inq-report-supplier').getContext('2d'), sups, [
    { label: 'NG율 (%)', data: sups.map(s => supStats[s].total ? supStats[s].ng / supStats[s].total * 100 : 0), backgroundColor: PALETTE.slice(0, sups.length), borderRadius: 6 }
  ], { scales: { y: { beginAtZero: true, suggestedMax: 5, grid: { color: SIDIZ_COLORS.border } }, x: { grid: { display: false } } }, plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: SIDIZ_COLORS.text, font: { weight: 700, size: 11 }, formatter: v => v.toFixed(2) + '%' } } });

  // 권장 조치사항 자동 생성
  const recs = [];
  if (rodNG.length > 0) {
    const topNgCode = ngList.find(s => s.kind === '중심봉');
    if (topNgCode) recs.push({ level: 'critical', text: `중심봉 <b>${topNgCode.code}</b> (${topNgCode.name}) — NG ${topNgCode.ng}/${topNgCode.total}건 (${(topNgCode.ng/topNgCode.total*100).toFixed(1)}%). 공급업체 품질 협의 필요.` });
  }
  if (spongeNG.length > 0) {
    const topNgCode = ngList.find(s => s.kind === '스폰지');
    if (topNgCode) recs.push({ level: 'warning', text: `스폰지 <b>${topNgCode.code}</b> — 규격 이탈 발견. 발포 공정 점검 권장.` });
  }
  Object.entries(supStats).forEach(([s, st]) => {
    if (st.total >= 30 && st.ng / st.total > 0.05) {
      recs.push({ level: 'warning', text: `중심봉 공급업체 <b>${s}</b> — NG율 ${(st.ng/st.total*100).toFixed(1)}% (${st.ng}/${st.total}). 5% 초과로 모니터링 강화.` });
    }
  });
  if (recs.length === 0) recs.push({ level: 'info', text: '현재 모든 자재가 기준 범위 내 — 안정적 품질 유지 중.' });
  $('inq-report-recommendations').innerHTML = recs.map(r => `
    <div class="analysis-item"><div class="analysis-dot ${r.level}"></div><div>${r.text}</div></div>
  `).join('');
}

// ============ 입력 폼 ============
window.toggleInspectForm = function (kind) {
  const el = $(`inq-form-${kind}`);
  if (el) el.style.display = el.style.display === 'none' || !el.style.display ? 'block' : 'none';
};

window.submitInspectBolt = async function () {
  const data = {
    measure_date: $('form-bolt-date').value,
    supplier: $('form-bolt-supplier').value.trim(),
    code: $('form-bolt-code').value.trim(),
    color: $('form-bolt-color').value.trim() || null,
    name: $('form-bolt-name').value.trim(),
    hv1: parseFloat($('form-bolt-hv1').value) || null,
    hv2: parseFloat($('form-bolt-hv2').value) || null,
    hrc1: parseFloat($('form-bolt-hrc1').value) || null,
    hrc2: parseFloat($('form-bolt-hrc2').value) || null,
  };
  if (!data.measure_date || !data.supplier || !data.code || !data.name) {
    alert('측정일/공급업체/자재코드/자재명은 필수입니다.');
    return;
  }
  await postRow('incoming_bolts', data, 'bolt');
};
window.submitInspectRod = async function () {
  const data = {
    measure_date: $('form-rod-date').value,
    supplier: $('form-rod-supplier').value.trim(),
    code: $('form-rod-code').value.trim(),
    color: $('form-rod-color').value.trim() || null,
    name: $('form-rod-name').value.trim(),
    h1: parseFloat($('form-rod-h1').value) || null,
    h2: parseFloat($('form-rod-h2').value) || null,
    wobble: parseFloat($('form-rod-wobble').value) || null,
  };
  if (!data.measure_date || !data.supplier || !data.code || !data.name) {
    alert('측정일/공급업체/자재코드/자재명은 필수입니다.');
    return;
  }
  await postRow('incoming_rods', data, 'rod');
};
window.submitInspectSponge = async function () {
  const data = {
    measure_date: $('form-sponge-date').value,
    code: $('form-sponge-code').value.trim(),
    color: $('form-sponge-color').value.trim() || null,
    name: $('form-sponge-name').value.trim(),
    spec_target: parseInt($('form-sponge-spec').value) || null,
    spec_tol: parseInt($('form-sponge-tol').value) || 5,
    m1_center: parseFloat($('form-sponge-m1c').value) || null,
    m1_left: parseFloat($('form-sponge-m1l').value) || null,
    m1_right: parseFloat($('form-sponge-m1r').value) || null,
    m2_center: parseFloat($('form-sponge-m2c').value) || null,
    m2_left: parseFloat($('form-sponge-m2l').value) || null,
    m2_right: parseFloat($('form-sponge-m2r').value) || null,
  };
  if (!data.measure_date || !data.code || !data.name) {
    alert('측정일/자재코드/자재명은 필수입니다.');
    return;
  }
  await postRow('incoming_sponges', data, 'sponge');
};

async function postRow(table, data, kind) {
  try {
    const headers = SB_HEADERS;
    const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status}: ${txt}`);
    }
    alert('✅ 저장되었습니다');
    // 입력 필드 리셋 (날짜 제외)
    document.querySelectorAll(`#inq-form-${kind} input:not([type="date"])`).forEach(i => i.value = '');
    document.querySelectorAll(`#inq-form-${kind} select`).forEach(s => s.selectedIndex = 0);
    await loadIncomingData(true);
    if (kind === 'bolt') renderBolt();
    else if (kind === 'rod') renderRod();
    else if (kind === 'sponge') renderSponge();
  } catch (e) {
    console.error(e);
    alert('❌ 저장 실패: ' + e.message);
  }
}

// ============ 자료 변환 (xlsx) ============
window.exportInspect = function (kind) {
  if (!window.XLSX) { alert('XLSX 라이브러리가 로드되지 않았습니다'); return; }
  let rows, header, mapper, filename;
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  if (kind === 'bolt') {
    rows = getBoltFiltered();
    filename = `인수검사_볼트_${today}.xlsx`;
    header = ['측정일', '공급업체', '자재코드', '색상', '자재명', 'HV1', 'HV2', 'HV평균', 'HRC1', 'HRC2', 'HRC평균'];
    mapper = r => [r.measure_date, r.supplier, r.code, r.color, r.name, r.hv1, r.hv2, boltHV(r), r.hrc1, r.hrc2, boltHRC(r)];
  } else if (kind === 'rod') {
    rows = getRodFiltered();
    filename = `인수검사_중심봉_${today}.xlsx`;
    header = ['측정일', '공급업체', '자재코드', '색상', '자재명', '높이1', '높이2', '높이평균', '와블', '판정'];
    mapper = r => [r.measure_date, r.supplier, r.code, r.color, r.name, r.h1, r.h2, rodH(r), r.wobble, rodJudge(r)];
  } else {
    rows = getSpongeFiltered();
    filename = `인수검사_스폰지_${today}.xlsx`;
    header = ['측정일', '자재코드', '자재명', '규격', '중앙(1)', '좌(1)', '우(1)', '중앙(2)', '좌(2)', '우(2)', '평균', '판정'];
    mapper = r => [r.measure_date, r.code, r.name, r.spec_target ? `${r.spec_target}±${r.spec_tol || 5}` : '', r.m1_center, r.m1_left, r.m1_right, r.m2_center, r.m2_left, r.m2_right, spongeAvg(r), spongeJudge(r)];
  }
  const aoa = [header, ...rows.sort((a, b) => (b.measure_date || '').localeCompare(a.measure_date || '')).map(mapper)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = header.map(() => ({ wch: 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '데이터');
  XLSX.writeFile(wb, filename);
};

window.resetInspectFilter = function (kind) {
  if (kind === 'bolt') {
    ['inq-bolt-supplier', 'inq-bolt-color', 'inq-bolt-code', 'inq-bolt-from', 'inq-bolt-to'].forEach(id => $(id).value = '');
    renderBolt();
  } else if (kind === 'rod') {
    ['inq-rod-supplier', 'inq-rod-color', 'inq-rod-judge', 'inq-rod-code', 'inq-rod-from', 'inq-rod-to'].forEach(id => $(id).value = '');
    renderRod();
  } else if (kind === 'sponge') {
    ['inq-sponge-judge', 'inq-sponge-code', 'inq-sponge-from', 'inq-sponge-to'].forEach(id => $(id).value = '');
    renderSponge();
  }
};

// ============ 진입점 ============
window.initInspectSection = async function () {
  chartDefault();
  if (!STATE.loaded) {
    $('inq-loading').style.display = 'flex';
    await loadIncomingData();
    $('inq-loading').style.display = 'none';
  }
  // 필터 이벤트 1회 바인딩
  if (!STATE.bound) {
    ['inq-bolt-supplier', 'inq-bolt-color', 'inq-bolt-code', 'inq-bolt-from', 'inq-bolt-to'].forEach(id =>
      $(id).addEventListener('input', renderBolt));
    ['inq-rod-supplier', 'inq-rod-color', 'inq-rod-judge', 'inq-rod-code', 'inq-rod-from', 'inq-rod-to'].forEach(id =>
      $(id).addEventListener('input', renderRod));
    ['inq-sponge-judge', 'inq-sponge-code', 'inq-sponge-from', 'inq-sponge-to'].forEach(id =>
      $(id).addEventListener('input', renderSponge));
    STATE.bound = true;
  }
  switchInspectTab(STATE.currentTab);
};

})();
