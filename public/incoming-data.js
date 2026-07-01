/* incoming-data.js — 인수검사 (볼트/중심봉/스폰지) Supabase 연동 + 차트 + 입력 + 리포트 */
(function () {
'use strict';

// ===== 전역 상태 =====
const STATE = {
  bolts: [], rods: [], sponges: [], reamers: [], roughness: [], colorimetry: [],
  loaded: false,
  currentTab: 'dailylog',
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
function stdev(arr) {
  const v = arr.filter(x => x !== null && x !== undefined && !isNaN(x));
  if (v.length < 2) return 0;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
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
    // 테이블 미생성 시 빈 배열로 graceful 처리 (404 등)
    async function fetchAllSafe(table) {
      try { return await fetchAll(table); }
      catch(e) { console.warn(`[인수검사] ${table} 테이블 없음 — SQL로 생성 필요:`, e.message); return []; }
    }

    const [bolts, rods, sponges, reamers, roughness, colorimetry] = await Promise.all([
      fetchAll('incoming_bolts'),
      fetchAll('incoming_rods'),
      fetchAll('incoming_sponges'),
      fetchAllSafe('incoming_reamers'),
      fetchAllSafe('incoming_roughness'),
      fetchAllSafe('incoming_colorimetry'),
    ]);
    STATE.bolts = bolts;
    STATE.rods = rods;
    STATE.sponges = sponges;
    STATE.reamers = reamers;
    STATE.roughness = roughness;
    STATE.colorimetry = colorimetry;
    STATE.loaded = true;
    console.log(`[인수검사] 볼트=${bolts.length}, 중심봉=${rods.length}, 스폰지=${sponges.length}, 리머=${reamers.length}, 조도=${roughness.length}, 색차=${colorimetry.length}`);
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
  else if (tab === 'reamer') renderReamer();
  else if (tab === 'roughness') renderRoughness();
  else if (tab === 'colorimetry') renderColorimetry();
  else if (tab === 'report') {
    switchReportCat(STATE.reportCat || 'bolt');
  }
  else if (tab === 'dailylog') {
    renderDailyLog();
  }
};

// 리포트 카테고리 전환
STATE.reportCat = 'bolt';
window.switchReportCat = function (cat) {
  STATE.reportCat = cat;
  document.querySelectorAll('.report-cat-tab').forEach(b => b.classList.remove('active'));
  document.querySelector(`.report-cat-tab[data-cat="${cat}"]`)?.classList.add('active');
  document.querySelectorAll('.report-cat-pane').forEach(p => p.style.display = 'none');
  const pane = document.getElementById(`report-cat-${cat}`);
  if (pane) pane.style.display = 'block';
  if (cat === 'bolt') renderReportBolt();
  else if (cat === 'rod') renderReportRod();
  else if (cat === 'sponge') renderReportSponge();
  else if (cat === 'reamer') renderReportReamer();
  else if (cat === 'roughness') renderReportRoughness();
  else if (cat === 'colorimetry') renderReportColorimetry();
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
      layout: { padding: { top: 16, bottom: 16, left: 16, right: 16 } },
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true, padding: 8, boxWidth: 10 } },
        datalabels: {
          textAlign: 'center',
          font: { size: 11, weight: 'bold' },
          color: ctx => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total ? ctx.dataset.data[ctx.dataIndex] / total * 100 : 0;
            return pct >= 8 ? '#fff' : '#222';
          },
          anchor: ctx => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total ? ctx.dataset.data[ctx.dataIndex] / total * 100 : 0;
            return pct >= 8 ? 'center' : 'end';
          },
          align: ctx => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total ? ctx.dataset.data[ctx.dataIndex] / total * 100 : 0;
            return pct >= 8 ? 'center' : 'end';
          },
          offset: ctx => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total ? ctx.dataset.data[ctx.dataIndex] / total * 100 : 0;
            return pct >= 8 ? 0 : 6;
          },
          formatter: (v, ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total ? v / total * 100 : 0;
            if (pct < 2) return '';
            return ctx.chart.data.labels[ctx.dataIndex] + '\n' + v + '건';
          }
        }
      }
    }, opts),
    plugins: [ChartDataLabels]
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
  // ===== 자재별 경도 추이 =====
  // 선택된 자재가 있으면 그 자재의 시점별 측정값(HV1/HV2 평균), 없으면 측정횟수 TOP 5 자재
  const selCode = $('inq-bolt-code').value;
  const dates = uniq(rows.map(r => r.measure_date)).sort();
  let datasets;
  if (selCode) {
    const codeName = (STATE.bolts.find(r => r.code === selCode)?.name) || selCode;
    datasets = [{
      label: `${selCode} (HV)`,
      data: dates.map(d => {
        const ms = rows.filter(r => r.measure_date === d && r.code === selCode).map(boltHV).filter(v => v !== null);
        return ms.length ? avg(ms) : null;
      }),
      borderColor: SIDIZ_COLORS.blue, backgroundColor: SIDIZ_COLORS.blue + '20',
      tension: 0.3, pointRadius: 3, borderWidth: 2, spanGaps: true,
    }];
  } else {
    // 전체: 측정횟수 TOP 5 자재
    const codeCount = {};
    rows.forEach(r => { codeCount[r.code] = (codeCount[r.code] || 0) + 1; });
    const topCodes = Object.entries(codeCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
    datasets = topCodes.map((code, i) => ({
      label: code,
      data: dates.map(d => {
        const ms = rows.filter(r => r.measure_date === d && r.code === code).map(boltHV).filter(v => v !== null);
        return ms.length ? avg(ms) : null;
      }),
      borderColor: PALETTE[i % PALETTE.length],
      backgroundColor: PALETTE[i % PALETTE.length] + '20',
      tension: 0.3, pointRadius: 2, borderWidth: 2, spanGaps: true,
    }));
  }
  makeLine('boltTrend', $('inq-bolt-trend').getContext('2d'), dates, datasets, {
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } } },
      y: { beginAtZero: false, title: { display: true, text: 'HV (비커스)', font: { size: 10 } }, grid: { color: SIDIZ_COLORS.border } }
    }
  });

  // ===== 공급업체별 도넛 (유지) =====
  const sups = uniq(rows.map(r => r.supplier)).sort();
  const supCounts = sups.map(s => rows.filter(r => r.supplier === s).length);
  makeDoughnut('boltSup', $('inq-bolt-supplier-pie').getContext('2d'), sups, supCounts, PALETTE);

  // ===== 재질×업체 평균 HV (그룹 막대) =====
  const materials = uniq(rows.map(r => r.material || '미분류')).sort();
  const matDatasets = sups.map((sup, i) => ({
    label: sup,
    data: materials.map(mat => avg(rows.filter(r => (r.material || '미분류') === mat && r.supplier === sup).map(boltHV))),
    backgroundColor: PALETTE[i % PALETTE.length],
    borderRadius: 6,
  }));
  makeBar('boltMatSup', $('inq-bolt-supplier-bar').getContext('2d'), materials, matDatasets, {
    scales: { y: { beginAtZero: false, grid: { color: SIDIZ_COLORS.border }, title: { display: true, text: '평균 HV', font: { size: 10 } } }, x: { grid: { display: false } } },
    plugins: {
      legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 10 } } },
      datalabels: { display: false }
    }
  });

  // ===== 색상별 분포 (유지) =====
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
    tb.innerHTML = '<tr><td colspan="13" style="padding:40px;text-align:center;color:#8a8a9a">검색 결과가 없습니다</td></tr>';
    return;
  }
  tb.innerHTML = sorted.slice(0, 500).map(r => `
    <tr>
      <td>${escHtml(r.measure_date)}</td>
      <td>${escHtml(r.supplier)}</td>
      <td>${escHtml(r.material || '-')}</td>
      <td>${escHtml(r.code)}</td>
      <td>${escHtml(r.color || '')}</td>
      <td class="row-header" style="text-align:left">${escHtml(r.name)}</td>
      <td>${fmt(r.hv1)}</td><td>${fmt(r.hv2)}</td>
      <td class="highlight">${fmt(boltHV(r))}</td>
      <td>${fmt(r.hrc1)}</td><td>${fmt(r.hrc2)}</td>
      <td class="highlight">${fmt(boltHRC(r))}</td>
      <td><button onclick="deleteInspectRow('incoming_bolts', ${r.id})" class="btn-del" title="삭제" style="background:none;border:1px solid var(--border);color:var(--accent-rose);padding:3px 8px;border-radius:6px;cursor:pointer;font-size:13px">🗑</button></td>
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
    { label: '와블', data: dates.map(d => avg(byDate[d].w)), borderColor: '#FF8C00', backgroundColor: '#FF8C0020', yAxisID: 'y1', tension: 0.3, pointRadius: 2, borderWidth: 2 },
    { label: '높이 상한', data: dates.map(() => 7.0), borderColor: SIDIZ_COLORS.rose, borderWidth: 1, borderDash: [4, 4], pointRadius: 0, fill: false, yAxisID: 'y' },
    { label: '높이 하한', data: dates.map(() => 5.0), borderColor: SIDIZ_COLORS.rose, borderWidth: 1, borderDash: [4, 4], pointRadius: 0, fill: false, yAxisID: 'y' },
    { label: '와블 한계', data: dates.map(() => 1.0), borderColor: '#FF8C00', borderWidth: 1, borderDash: [2, 2], pointRadius: 0, fill: false, yAxisID: 'y1' },
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
  destroyChart('rodWobble');
  STATE.charts['rodWobble'] = new Chart($('inq-rod-wobble').getContext('2d'), {
    type: 'bar',
    data: { labels: sups, datasets: [
      { label: '평균 와블', data: wAvgs, backgroundColor: PALETTE.slice(0, sups.length), borderRadius: 6, type: 'bar' },
      { label: '기준 ≤1.0', data: sups.map(() => 1.0), type: 'line', borderColor: SIDIZ_COLORS.rose, borderWidth: 2, borderDash: [5, 4], pointRadius: 0, fill: false },
    ]},
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, suggestedMax: 1.5, grid: { color: SIDIZ_COLORS.border } }, x: { grid: { display: false } } },
      plugins: {
        legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 10 } } },
        datalabels: { display: ctx => ctx.datasetIndex === 0, anchor: 'end', align: 'top', color: SIDIZ_COLORS.text, font: { weight: 700, size: 11 }, formatter: v => v == null ? '-' : v.toFixed(2) }
      }
    }
  });

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
    tb.innerHTML = '<tr><td colspan="11" style="padding:40px;text-align:center;color:#8a8a9a">검색 결과가 없습니다</td></tr>';
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
      <td><button onclick="deleteInspectRow('incoming_rods', ${r.id})" class="btn-del" title="삭제" style="background:none;border:1px solid var(--border);color:var(--accent-rose);padding:3px 8px;border-radius:6px;cursor:pointer;font-size:13px">🗑</button></td>
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
// 자재명에서 제품코드 추출 (예: "TC11_좌판...", "T50RE 조절형..." → "TC11", "T50RE")
function extractProductCode(name) {
  if (!name) return '기타';
  const m = String(name).match(/^([A-Za-z][A-Za-z0-9]*)/);
  return m ? m[1].toUpperCase() : '기타';
}

// 자재명 차별화 키워드 (제품코드/공통어/규격 제거 후 남은 의미있는 부분)
function spongeDiffPart(name) {
  if (!name) return '';
  return String(name)
    .replace(/^[A-Za-z0-9]+/, '')                    // 시작 제품코드 제거
    .replace(/\([^)]*[±][^)]*\)/g, '')               // (35 ± 5) 등 규격 제거
    .replace(/[_,]/g, ' ')                           // _, 콤마 → 공백
    .replace(/좌판\s*스[펀폰]지|스[펀폰]지|좌판/g, '') // 공통어 제거
    .replace(/\([^)]*\)/g, '')                       // 남은 괄호(천)(가죽) 제거
    .replace(/\s+/g, ' ')
    .trim();
}

// 차트 라벨 결정: 같은 제품코드끼리만 차별화 키워드 부착
function spongeChartLabels(rowsForCode) {
  const codeNameMap = {};
  rowsForCode.forEach(r => { if (!codeNameMap[r.code]) codeNameMap[r.code] = r.name; });
  const productGroups = {};
  Object.entries(codeNameMap).forEach(([code, name]) => {
    const p = extractProductCode(name);
    (productGroups[p] = productGroups[p] || []).push({ code, name });
  });
  const labels = {};
  Object.entries(productGroups).forEach(([p, items]) => {
    if (items.length === 1) {
      labels[items[0].code] = p;
    } else {
      items.forEach(it => {
        const diff = spongeDiffPart(it.name);
        labels[it.code] = diff ? `${p} ${diff}` : p;
      });
    }
  });
  return labels;
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
  // ===== 자재별 경도 추이 =====
  // 선택된 자재가 있으면 그 자재 + 기준선(목표/상한/하한), 없으면 측정횟수 TOP 5 자재
  const selCode = $('inq-sponge-code').value;
  const allDates = uniq(rows.map(r => r.measure_date)).sort();
  let trendDatasets;
  if (selCode) {
    const sel = STATE.sponges.find(r => r.code === selCode);
    const target = sel?.spec_target;
    const tol = sel?.spec_tol || 5;
    trendDatasets = [{
      label: extractProductCode(sel?.name) || selCode,
      data: allDates.map(d => {
        const ms = rows.filter(r => r.measure_date === d && r.code === selCode).map(spongeAvg).filter(v => v !== null);
        return ms.length ? avg(ms) : null;
      }),
      borderColor: SIDIZ_COLORS.blue, backgroundColor: SIDIZ_COLORS.blue + '20',
      tension: 0.3, pointRadius: 3, borderWidth: 2, spanGaps: true,
    }];
    if (target !== null && target !== undefined) {
      trendDatasets.push(
        { label: `목표 ${target}`, data: allDates.map(() => target), borderColor: SIDIZ_COLORS.emerald, borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0, fill: false },
        { label: `상한 ${target + tol}`, data: allDates.map(() => target + tol), borderColor: SIDIZ_COLORS.rose, borderWidth: 1, borderDash: [3, 3], pointRadius: 0, fill: false },
        { label: `하한 ${target - tol}`, data: allDates.map(() => target - tol), borderColor: SIDIZ_COLORS.rose, borderWidth: 1, borderDash: [3, 3], pointRadius: 0, fill: false }
      );
    }
  } else {
    const codeCount = {};
    rows.forEach(r => { codeCount[r.code] = (codeCount[r.code] || 0) + 1; });
    const topCodes = Object.entries(codeCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
    // 같은 제품코드 중복 시 자재명 차별화 키워드 (TC11 → "TC11 살빼기 O" / "TC11 살빼기 X")
    const labels = spongeChartLabels(rows.filter(r => topCodes.includes(r.code)));
    trendDatasets = topCodes.map((code, i) => ({
      label: labels[code] || code,
      data: allDates.map(d => {
        const ms = rows.filter(r => r.measure_date === d && r.code === code).map(spongeAvg).filter(v => v !== null);
        return ms.length ? avg(ms) : null;
      }),
      borderColor: PALETTE[i % PALETTE.length],
      backgroundColor: PALETTE[i % PALETTE.length] + '20',
      tension: 0.3, borderWidth: 2, pointRadius: 2, spanGaps: true,
    }));
  }
  makeLine('spongeTrend', $('inq-sponge-trend').getContext('2d'), allDates, trendDatasets, {
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } } },
      y: { beginAtZero: false, title: { display: true, text: '경도', font: { size: 10 } }, grid: { color: SIDIZ_COLORS.border } }
    }
  });

  // ===== 제품별 측정 비율 (자재명 앞 코드: TC11, T50RE, GC1 등) =====
  const prodCounts = {};
  rows.forEach(r => {
    const p = extractProductCode(r.name);
    prodCounts[p] = (prodCounts[p] || 0) + 1;
  });
  const prodLabels = Object.keys(prodCounts).sort();
  const prodData = prodLabels.map(p => prodCounts[p]);
  makeDoughnut('spongeProd', $('inq-sponge-spec-pie').getContext('2d'),
    prodLabels, prodData, PALETTE);

  // ===== 위치별 평균 (유지) =====
  const cVals = rows.flatMap(r => [r.m1_center, r.m2_center]).filter(v => v !== null && v !== undefined);
  const lVals = rows.flatMap(r => [r.m1_left, r.m2_left]).filter(v => v !== null && v !== undefined);
  const rVals = rows.flatMap(r => [r.m1_right, r.m2_right]).filter(v => v !== null && v !== undefined);
  makeBar('spongePos', $('inq-sponge-position').getContext('2d'), ['중앙', '좌', '우'], [
    { label: '평균', data: [avg(cVals), avg(lVals), avg(rVals)], backgroundColor: [SIDIZ_COLORS.blue, SIDIZ_COLORS.cyan, SIDIZ_COLORS.emerald], borderRadius: 6 }
  ]);

  // ===== 기준 부적합 (유지) =====
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
    tb.innerHTML = '<tr><td colspan="13" style="padding:40px;text-align:center;color:#8a8a9a">검색 결과가 없습니다</td></tr>';
    return;
  }
  tb.innerHTML = sorted.slice(0, 500).map(r => {
    const a = spongeAvg(r), j = spongeJudge(r);
    const spec = (r.spec_target !== null && r.spec_target !== undefined) ? `${r.spec_target} ± ${r.spec_tol || 5}` : '-';
    const rowClass = j === 'NG' ? ' class="ng-row"' : '';
    return `<tr${rowClass}>
      <td>${escHtml(r.measure_date)}</td>
      <td>${escHtml(r.code)}</td>
      <td class="row-header" style="text-align:left">${escHtml(r.name)}</td>
      <td><b>${spec}</b></td>
      <td>${fmt(r.m1_center)}</td><td>${fmt(r.m1_left)}</td><td>${fmt(r.m1_right)}</td>
      <td>${fmt(r.m2_center)}</td><td>${fmt(r.m2_left)}</td><td>${fmt(r.m2_right)}</td>
      <td class="highlight">${fmt(a)}</td>
      <td><span class="${j === 'NG' ? 'danger' : (j === 'OK' ? 'success' : '')}">${j || '-'}</span></td>
      <td><button onclick="deleteInspectRow('incoming_sponges', ${r.id})" class="btn-del" title="삭제" style="background:none;border:1px solid var(--border);color:var(--accent-rose);padding:3px 8px;border-radius:6px;cursor:pointer;font-size:13px">🗑</button></td>
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

// ----- 볼트 리포트 (NG 기준 없음 → 측정 변동성/이상치 분석) -----
function renderReportBolt() {
  const rows = STATE.bolts;
  // 자재별 통계
  const codeMap = {};
  rows.forEach(r => {
    const k = r.code + '|' + r.name;
    if (!codeMap[k]) codeMap[k] = { code: r.code, name: r.name, supplier: r.supplier, hvs: [], hrcs: [] };
    const hv = boltHV(r), hrc = boltHRC(r);
    if (hv !== null) codeMap[k].hvs.push(hv);
    if (hrc !== null) codeMap[k].hrcs.push(hrc);
  });
  const stats = Object.values(codeMap).map(s => ({
    ...s,
    n: s.hvs.length,
    mean: avg(s.hvs),
    std: stdev(s.hvs),
    min: s.hvs.length ? Math.min(...s.hvs) : null,
    max: s.hvs.length ? Math.max(...s.hvs) : null,
    range: s.hvs.length ? Math.max(...s.hvs) - Math.min(...s.hvs) : null,
  }));

  // 공급업체별 통계
  const supMap = {};
  rows.forEach(r => {
    if (!supMap[r.supplier]) supMap[r.supplier] = { sup: r.supplier, hvs: [], n: 0 };
    const hv = boltHV(r);
    if (hv !== null) { supMap[r.supplier].hvs.push(hv); supMap[r.supplier].n++; }
  });
  const supStats = Object.values(supMap).map(s => ({ ...s, mean: avg(s.hvs), std: stdev(s.hvs) }));

  const allHV = rows.map(boltHV).filter(v => v !== null);
  const overallMean = avg(allHV), overallStd = stdev(allHV);

  $('rep-bolt-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">총 측정 건수</div><div class="kpi-value">${rows.length.toLocaleString()}</div><div class="kpi-change">자재 ${stats.length}종</div></div>
    <div class="kpi-card"><div class="kpi-label">전체 평균 HV</div><div class="kpi-value">${fmt(overallMean, 1)}</div><div class="kpi-change">표준편차 σ=${fmt(overallStd, 1)}</div></div>
    <div class="kpi-card"><div class="kpi-label">변동성 큰 자재</div><div class="kpi-value">${stats.filter(s => s.std > 20).length}</div><div class="kpi-change">σ &gt; 20 (편차 큰 자재)</div></div>
    <div class="kpi-card"><div class="kpi-label">공급업체별 평균</div><div class="kpi-value" style="font-size:14px">${supStats.map(s => `${s.sup} ${fmt(s.mean,0)}`).join(' · ')}</div><div class="kpi-change">${supStats.length}개사</div></div>
  `;

  // 권장 조치
  const recs = [];
  const topVar = [...stats].filter(s => s.n >= 2).sort((a, b) => b.std - a.std).slice(0, 3);
  topVar.forEach(s => {
    if (s.std > 20) recs.push({ level: 'warning', text: `자재 <b>${escHtml(s.code)}</b> (${escHtml(s.name)}) — 표준편차 ${s.std.toFixed(1)}, 측정값 편차 ${s.range.toFixed(1)} HV. 열처리 균일성 점검 권장.` });
  });
  supStats.forEach(s => {
    if (s.std > overallStd * 1.3) recs.push({ level: 'info', text: `공급업체 <b>${escHtml(s.sup)}</b> — 표준편차 σ=${s.std.toFixed(1)} (전체 ${overallStd.toFixed(1)} 대비 높음). 공정 일관성 모니터링.` });
  });
  if (recs.length === 0) recs.push({ level: 'info', text: '측정값 변동성 양호 — 안정적 품질 유지 중.' });
  $('rep-bolt-rec').innerHTML = recs.map(r => `<div class="analysis-item"><div class="analysis-dot ${r.level}"></div><div>${r.text}</div></div>`).join('');

  // 월별 평균 HV 추이
  const byMonth = {};
  rows.forEach(r => {
    const m = (r.measure_date || '').slice(0, 7);
    if (!m) return;
    if (!byMonth[m]) byMonth[m] = [];
    const hv = boltHV(r);
    if (hv !== null) byMonth[m].push(hv);
  });
  const months = Object.keys(byMonth).sort();
  makeBar('repBoltTrend', $('rep-bolt-trend').getContext('2d'), months, [
    { label: '월별 평균 HV', data: months.map(m => avg(byMonth[m])), backgroundColor: SIDIZ_COLORS.blue, borderRadius: 6 }
  ], { scales: { y: { beginAtZero: false, grid: { color: SIDIZ_COLORS.border } }, x: { grid: { display: false } } } });

  // 공급업체별 평균/편차
  const supLabels = supStats.map(s => s.sup);
  makeBar('repBoltSup', $('rep-bolt-supplier').getContext('2d'), supLabels, [
    { label: '평균 HV', data: supStats.map(s => s.mean), backgroundColor: SIDIZ_COLORS.blue, borderRadius: 6, yAxisID: 'y' },
    { label: '표준편차 σ', data: supStats.map(s => s.std), backgroundColor: SIDIZ_COLORS.rose, borderRadius: 6, yAxisID: 'y1' },
  ], {
    scales: {
      y: { type: 'linear', position: 'left', beginAtZero: false, grid: { color: SIDIZ_COLORS.border }, title: { display: true, text: '평균 HV', font: { size: 10 } } },
      y1: { type: 'linear', position: 'right', beginAtZero: true, grid: { display: false }, title: { display: true, text: '표준편차', font: { size: 10 } } },
      x: { grid: { display: false } }
    },
    plugins: { legend: { display: true, position: 'top', align: 'end' }, datalabels: { display: false } }
  });

  // 변동성 TOP10 테이블
  const top10 = [...stats].filter(s => s.n >= 2).sort((a, b) => b.std - a.std).slice(0, 10);
  $('rep-bolt-top10').innerHTML = top10.length ? top10.map((s, i) => `
    <tr>
      <td><span class="rct-rank-num ${i===0?'gold':i===1?'silver':i===2?'bronze':'normal'}">${i + 1}</span></td>
      <td>${escHtml(s.code)}</td>
      <td class="row-header" style="text-align:left">${escHtml(s.name)}</td>
      <td>${s.n}</td>
      <td>${fmt(s.mean, 1)}</td>
      <td><span class="${s.std > 20 ? 'danger' : (s.std > 10 ? 'highlight' : '')}">${fmt(s.std, 2)}</span></td>
      <td>${fmt(s.min, 1)}</td>
      <td>${fmt(s.max, 1)}</td>
      <td>${fmt(s.range, 1)}</td>
    </tr>
  `).join('') : '<tr><td colspan="9" style="padding:40px;text-align:center;color:#8a8a9a">데이터 없음</td></tr>';
}

// ----- 중심봉 리포트 -----
function renderReportRod() {
  const rows = STATE.rods;
  const ngRows = rows.filter(r => rodJudge(r) === 'NG');
  const ngRate = rows.length ? (ngRows.length / rows.length * 100) : 0;
  const codes = uniq(rows.map(r => r.code));
  const sups = uniq(rows.map(r => r.supplier)).sort();

  $('rep-rod-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">총 측정 건수</div><div class="kpi-value">${rows.length.toLocaleString()}</div><div class="kpi-change">자재 ${codes.length}종</div></div>
    <div class="kpi-card"><div class="kpi-label">부적합 건수</div><div class="kpi-value" style="background:linear-gradient(135deg,${ngRows.length>0?SIDIZ_COLORS.rose:SIDIZ_COLORS.emerald},#ffb347);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${ngRows.length}</div><div class="kpi-change ${ngRows.length>0?'up':'down'}">기준 5~7 / ≤1.0</div></div>
    <div class="kpi-card"><div class="kpi-label">부적합률</div><div class="kpi-value">${ngRate.toFixed(2)}%</div><div class="kpi-change">전체 측정 대비</div></div>
    <div class="kpi-card"><div class="kpi-label">공급업체</div><div class="kpi-value" style="font-size:18px">${sups.join(' · ')}</div><div class="kpi-change">${sups.length}개사</div></div>
  `;

  // 자재별 NG TOP10
  const codeStats = {};
  rows.forEach(r => {
    const k = r.code + '|' + r.name;
    if (!codeStats[k]) codeStats[k] = { code: r.code, name: r.name, total: 0, ng: 0 };
    codeStats[k].total++;
    if (rodJudge(r) === 'NG') codeStats[k].ng++;
  });
  const ngList = Object.values(codeStats).filter(s => s.ng > 0).sort((a, b) => b.ng - a.ng).slice(0, 10);
  $('rep-rod-top10').innerHTML = ngList.length ? ngList.map((s, i) => `
    <tr>
      <td><span class="rct-rank-num ${i===0?'gold':i===1?'silver':i===2?'bronze':'normal'}">${i + 1}</span></td>
      <td>${escHtml(s.code)}</td>
      <td class="row-header" style="text-align:left">${escHtml(s.name)}</td>
      <td><span class="danger">${s.ng}</span></td>
      <td>${s.total}</td>
      <td><span class="${s.ng/s.total > 0.1 ? 'danger' : 'highlight'}">${(s.ng / s.total * 100).toFixed(1)}%</span></td>
    </tr>
  `).join('') : '<tr><td colspan="6" style="padding:40px;text-align:center;color:#8a8a9a">전체 적합 — 부적합 자재가 없습니다</td></tr>';

  // 월별 NG 추이
  const ngByMonth = {};
  rows.forEach(r => {
    const m = (r.measure_date || '').slice(0, 7);
    if (!m) return;
    if (!ngByMonth[m]) ngByMonth[m] = { ok: 0, ng: 0 };
    if (rodJudge(r) === 'NG') ngByMonth[m].ng++; else ngByMonth[m].ok++;
  });
  const months = Object.keys(ngByMonth).sort();
  makeBar('repRodTrend', $('rep-rod-trend').getContext('2d'), months, [
    { label: 'OK', data: months.map(m => ngByMonth[m].ok), backgroundColor: SIDIZ_COLORS.emerald, borderRadius: 4, stack: 's' },
    { label: 'NG', data: months.map(m => ngByMonth[m].ng), backgroundColor: SIDIZ_COLORS.rose, borderRadius: 4, stack: 's' },
  ], {
    scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: SIDIZ_COLORS.border } } },
    plugins: { legend: { display: true, position: 'top', align: 'end' }, datalabels: { display: false } }
  });

  // 공급업체별 NG율
  const supStats = {};
  rows.forEach(r => {
    if (!supStats[r.supplier]) supStats[r.supplier] = { total: 0, ng: 0 };
    supStats[r.supplier].total++;
    if (rodJudge(r) === 'NG') supStats[r.supplier].ng++;
  });
  const supList = Object.keys(supStats).sort();
  makeBar('repRodSup', $('rep-rod-supplier').getContext('2d'), supList, [
    { label: 'NG율 (%)', data: supList.map(s => supStats[s].total ? supStats[s].ng / supStats[s].total * 100 : 0), backgroundColor: PALETTE.slice(0, supList.length), borderRadius: 6 }
  ], {
    scales: { y: { beginAtZero: true, suggestedMax: 5, grid: { color: SIDIZ_COLORS.border } }, x: { grid: { display: false } } },
    plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: SIDIZ_COLORS.text, font: { weight: 700, size: 11 }, formatter: v => v.toFixed(2) + '%' } }
  });

  // 권장 조치
  const recs = [];
  ngList.slice(0, 3).forEach(s => {
    recs.push({ level: 'critical', text: `자재 <b>${escHtml(s.code)}</b> (${escHtml(s.name)}) — NG ${s.ng}/${s.total}건 (${(s.ng/s.total*100).toFixed(1)}%). 공급업체 품질 협의 필요.` });
  });
  Object.entries(supStats).forEach(([s, st]) => {
    if (st.total >= 30 && st.ng / st.total > 0.05) {
      recs.push({ level: 'warning', text: `공급업체 <b>${escHtml(s)}</b> — NG율 ${(st.ng/st.total*100).toFixed(1)}% (${st.ng}/${st.total}건). 5% 초과로 모니터링 강화.` });
    }
  });
  if (recs.length === 0) recs.push({ level: 'info', text: '모든 자재가 기준 범위 내 — 안정적 품질 유지 중.' });
  $('rep-rod-rec').innerHTML = recs.map(r => `<div class="analysis-item"><div class="analysis-dot ${r.level}"></div><div>${r.text}</div></div>`).join('');
}

// ----- 스폰지 리포트 -----
function renderReportSponge() {
  const rows = STATE.sponges;
  const ngRows = rows.filter(r => spongeJudge(r) === 'NG');
  const ngRate = rows.length ? (ngRows.length / rows.length * 100) : 0;
  const codes = uniq(rows.map(r => r.code));

  // 제품 라벨 매핑 (자재명 앞부분 — 같은 키워드면 차별화 키워드 추가)
  const productLabels = spongeChartLabels(rows);

  // KPI 3개 (규격 종류 카드 제거)
  $('rep-sponge-kpi').style.gridTemplateColumns = 'repeat(3, 1fr)';
  $('rep-sponge-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">총 측정 건수</div><div class="kpi-value">${rows.length.toLocaleString()}</div><div class="kpi-change">자재 ${codes.length}종</div></div>
    <div class="kpi-card"><div class="kpi-label">부적합 건수</div><div class="kpi-value" style="background:linear-gradient(135deg,${ngRows.length>0?SIDIZ_COLORS.rose:SIDIZ_COLORS.emerald},#ffb347);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${ngRows.length}</div><div class="kpi-change ${ngRows.length>0?'up':'down'}">규격 ±5 이탈</div></div>
    <div class="kpi-card"><div class="kpi-label">부적합률</div><div class="kpi-value">${ngRate.toFixed(2)}%</div><div class="kpi-change">전체 측정 대비</div></div>
  `;

  // 자재별 NG TOP10
  const codeStats = {};
  rows.forEach(r => {
    const k = r.code + '|' + r.name;
    if (!codeStats[k]) codeStats[k] = { code: r.code, name: r.name, total: 0, ng: 0, spec: r.spec_target };
    codeStats[k].total++;
    if (spongeJudge(r) === 'NG') codeStats[k].ng++;
  });
  const ngList = Object.values(codeStats).filter(s => s.ng > 0).sort((a, b) => b.ng - a.ng).slice(0, 10);
  $('rep-sponge-top10').innerHTML = ngList.length ? ngList.map((s, i) => `
    <tr>
      <td><span class="rct-rank-num ${i===0?'gold':i===1?'silver':i===2?'bronze':'normal'}">${i + 1}</span></td>
      <td>${escHtml(s.code)}</td>
      <td class="row-header" style="text-align:left">${escHtml(s.name)}</td>
      <td>${s.spec ? s.spec + '±5' : '-'}</td>
      <td><span class="danger">${s.ng}</span></td>
      <td>${s.total}</td>
      <td><span class="${s.ng/s.total > 0.1 ? 'danger' : 'highlight'}">${(s.ng / s.total * 100).toFixed(1)}%</span></td>
    </tr>
  `).join('') : '<tr><td colspan="7" style="padding:40px;text-align:center;color:#8a8a9a">전체 적합 — 부적합 자재가 없습니다</td></tr>';

  // 월별 OK/NG
  const byMonth = {};
  rows.forEach(r => {
    const m = (r.measure_date || '').slice(0, 7);
    if (!m) return;
    if (!byMonth[m]) byMonth[m] = { ok: 0, ng: 0 };
    if (spongeJudge(r) === 'NG') byMonth[m].ng++; else byMonth[m].ok++;
  });
  const months = Object.keys(byMonth).sort();
  makeBar('repSpongeTrend', $('rep-sponge-trend').getContext('2d'), months, [
    { label: 'OK', data: months.map(m => byMonth[m].ok), backgroundColor: SIDIZ_COLORS.emerald, borderRadius: 4, stack: 's' },
    { label: 'NG', data: months.map(m => byMonth[m].ng), backgroundColor: SIDIZ_COLORS.rose, borderRadius: 4, stack: 's' },
  ], {
    scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: SIDIZ_COLORS.border } } },
    plugins: { legend: { display: true, position: 'top', align: 'end' }, datalabels: { display: false } }
  });

  // 제품별 NG율 / 평균 편차
  const prodStats = {};
  rows.forEach(r => {
    const label = productLabels[r.code];
    if (!label) return;
    if (!prodStats[label]) prodStats[label] = { total: 0, ng: 0, deviations: [] };
    prodStats[label].total++;
    const a = spongeAvg(r);
    if (a !== null && r.spec_target !== null && r.spec_target !== undefined) {
      prodStats[label].deviations.push(Math.abs(a - r.spec_target));
    }
    if (spongeJudge(r) === 'NG') prodStats[label].ng++;
  });
  const prodKeys = Object.keys(prodStats).sort();
  makeBar('repSpongeProd', $('rep-sponge-spec').getContext('2d'), prodKeys, [
    { label: 'NG율 (%)', data: prodKeys.map(k => prodStats[k].total ? prodStats[k].ng / prodStats[k].total * 100 : 0), backgroundColor: SIDIZ_COLORS.rose, borderRadius: 6, yAxisID: 'y' },
    { label: '평균 편차', data: prodKeys.map(k => avg(prodStats[k].deviations)), backgroundColor: SIDIZ_COLORS.cyan, borderRadius: 6, yAxisID: 'y1' },
  ], {
    scales: {
      y: { type: 'linear', position: 'left', beginAtZero: true, suggestedMax: 5, grid: { color: SIDIZ_COLORS.border }, title: { display: true, text: 'NG율 %', font: { size: 10 } } },
      y1: { type: 'linear', position: 'right', beginAtZero: true, suggestedMax: 5, grid: { display: false }, title: { display: true, text: '|평균-목표|', font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } }
    },
    plugins: { legend: { display: true, position: 'top', align: 'end' }, datalabels: { display: false } }
  });

  // 권장 조치
  const recs = [];
  ngList.slice(0, 3).forEach(s => {
    recs.push({ level: 'critical', text: `자재 <b>${escHtml(s.code)}</b> (${escHtml(s.name)}) — NG ${s.ng}/${s.total}건 (${(s.ng/s.total*100).toFixed(1)}%). 발포 공정 점검 권장.` });
  });
  Object.entries(prodStats).forEach(([p, st]) => {
    const avgDev = avg(st.deviations);
    if (avgDev !== null && avgDev > 3) {
      recs.push({ level: 'warning', text: `제품 <b>${escHtml(p)}</b> — 평균 편차 ${avgDev.toFixed(1)} (한계 ±5 대비 60% 이상). 발포량 조정 검토.` });
    }
    if (st.total >= 20 && st.ng / st.total > 0.05) {
      recs.push({ level: 'warning', text: `제품 <b>${escHtml(p)}</b> — NG율 ${(st.ng/st.total*100).toFixed(1)}%. 모니터링 강화.` });
    }
  });
  if (recs.length === 0) recs.push({ level: 'info', text: '모든 자재가 규격 범위 내 — 안정적 품질 유지 중.' });
  $('rep-sponge-rec').innerHTML = recs.map(r => `<div class="analysis-item"><div class="analysis-dot ${r.level}"></div><div>${r.text}</div></div>`).join('');
}

// ----- 리머 리포트 -----
function renderReportReamer() {
  const rows = STATE.reamers;
  const total = rows.length;
  const ngRows = rows.filter(r => reamerJudge(r.product_code, r.value) === 'NG');
  const okRate = total ? Math.round((total - ngRows.length) / total * 100) : 0;
  const allVals = rows.map(r => +r.value).filter(v => !isNaN(v));
  const codes = uniq(rows.map(r => r.product_code)).sort();

  $('rep-reamer-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">총 측정 건수</div><div class="kpi-value">${total.toLocaleString()}</div><div class="kpi-change">기종 ${codes.length}종</div></div>
    <div class="kpi-card"><div class="kpi-label">부적합 건수</div><div class="kpi-value" style="color:${ngRows.length>0?'var(--accent-rose)':'var(--accent-emerald)'}">${ngRows.length}</div><div class="kpi-change ${ngRows.length>0?'up':'down'}">기준 이탈</div></div>
    <div class="kpi-card"><div class="kpi-label">합격률</div><div class="kpi-value" style="color:${okRate>=95?'var(--accent-emerald)':'var(--accent-rose)'}">${okRate}%</div><div class="kpi-change">치수 기준 적합</div></div>
    <div class="kpi-card"><div class="kpi-label">전체 평균 (mm)</div><div class="kpi-value">${allVals.length ? fmt(avg(allVals), 3) : '-'}</div><div class="kpi-change">측정값 전체 평균</div></div>
  `;

  const recs = _getReamerAnalysis(rows);
  $('rep-reamer-rec').innerHTML = recs.map(r => `<div class="analysis-item"><div class="analysis-dot ${r.level}"></div><div>${r.text}</div></div>`).join('');

  // 기종별 월별 추이
  const months = [...new Set(rows.map(r => r.measure_date?.slice(0,7)).filter(Boolean))].sort();
  const tCtx = $('rep-reamer-trend')?.getContext('2d');
  if (tCtx) {
    const datasets = INSP_PRODUCTS.filter(p => rows.some(r => r.product_code===p)).map((p, i) => ({
      label: p,
      data: months.map(m => {
        const vs = rows.filter(r => r.product_code===p && r.measure_date?.startsWith(m)).map(r => +r.value).filter(v => !isNaN(v));
        return vs.length ? +avg(vs).toFixed(3) : null;
      }),
      borderColor: PALETTE[i % PALETTE.length], backgroundColor: PALETTE[i % PALETTE.length] + '20',
      tension: 0.3, pointRadius: 3, borderWidth: 2, spanGaps: true,
    }));
    makeLine('repReamerTrend', tCtx, months, datasets, {
      scales: { x: { grid: {display:false}, ticks:{font:{size:9}} }, y: { grid:{color:SIDIZ_COLORS.border}, title:{display:true,text:'mm',font:{size:10}} } }
    });
  }

  // 기종별 평균 vs 기준범위
  const aCtx = $('rep-reamer-avg')?.getContext('2d');
  if (aCtx) {
    const ps = INSP_PRODUCTS.filter(p => rows.some(r => r.product_code===p));
    const avgs = ps.map(p => {
      const vs = rows.filter(r => r.product_code===p).map(r => +r.value).filter(v => !isNaN(v));
      return vs.length ? +avg(vs).toFixed(3) : null;
    });
    const bclrs = ps.map((p, i) => {
      const s = REAMER_SPECS[p]; const v = avgs[i];
      return (v !== null && s && v >= s.lo && v <= s.hi) ? SIDIZ_COLORS.blue : SIDIZ_COLORS.rose;
    });
    makeBar('repReamerAvg', aCtx, ps, [{label:'평균 치수 (mm)', data:avgs, backgroundColor:bclrs, borderRadius:6}], {
      plugins: { legend:{display:false}, datalabels:{display:true,anchor:'end',align:'top',color:SIDIZ_COLORS.text,font:{weight:700,size:11},formatter:v=>v!==null?v.toFixed(3):'-'} },
      scales: { x:{grid:{display:false}}, y:{grid:{color:SIDIZ_COLORS.border}, title:{display:true,text:'mm',font:{size:10}}} }
    });
  }

  // 기종별 통계 테이블
  const tbody = $('rep-reamer-top10'); if (!tbody) return;
  const stats = INSP_PRODUCTS.map(p => {
    const pRows = rows.filter(r => r.product_code === p);
    if (!pRows.length) return null;
    const vs = pRows.map(r => +r.value).filter(v => !isNaN(v));
    const ngC = pRows.filter(r => reamerJudge(p, r.value)==='NG').length;
    const spec = REAMER_SPECS[p];
    return { p, n: pRows.length, avgV: avg(vs), minV: Math.min(...vs), maxV: Math.max(...vs), ng: ngC, spec };
  }).filter(Boolean).sort((a,b) => b.ng - a.ng || a.p.localeCompare(b.p));

  tbody.innerHTML = stats.length ? stats.map((s, i) => `
    <tr>
      <td><span class="rct-rank-num ${i===0&&s.ng>0?'gold':i===1&&s.ng>0?'silver':i===2&&s.ng>0?'bronze':'normal'}">${i+1}</span></td>
      <td><b>${escHtml(s.p)}</b></td>
      <td style="text-align:right">${s.n}</td>
      <td style="text-align:right;font-weight:600">${s.avgV !== null ? s.avgV.toFixed(3) : '-'} mm</td>
      <td style="text-align:right">${isFinite(s.minV) ? s.minV.toFixed(3) : '-'}</td>
      <td style="text-align:right">${isFinite(s.maxV) ? s.maxV.toFixed(3) : '-'}</td>
      <td style="font-size:11px;color:var(--text-muted)">${s.spec ? s.spec.label : '-'}</td>
      <td style="text-align:right;color:${s.ng>0?'var(--accent-rose)':'var(--accent-emerald)'};font-weight:600">${s.ng}</td>
      <td style="text-align:right">${s.n ? Math.round((s.n-s.ng)/s.n*100) : 0}%</td>
    </tr>`).join('') :
    `<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted)">데이터가 없습니다</td></tr>`;
}

// ----- 조도 리포트 -----
function renderReportRoughness() {
  const rows = STATE.roughness;
  const total = rows.length;
  const ngRows = rows.filter(r => roughnessJudge(r.value) === 'NG');
  const okRate = total ? Math.round((total - ngRows.length) / total * 100) : 0;
  const allVals = rows.map(r => +r.value).filter(v => !isNaN(v));
  const codes = uniq(rows.map(r => r.product_code)).sort();

  $('rep-rough-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">총 측정 건수</div><div class="kpi-value">${total.toLocaleString()}</div><div class="kpi-change">기종 ${codes.length}종</div></div>
    <div class="kpi-card"><div class="kpi-label">부적합 건수</div><div class="kpi-value" style="color:${ngRows.length>0?'var(--accent-rose)':'var(--accent-emerald)'}">${ngRows.length}</div><div class="kpi-change ${ngRows.length>0?'up':'down'}">Ra > 1.0 μm</div></div>
    <div class="kpi-card"><div class="kpi-label">합격률</div><div class="kpi-value" style="color:${okRate>=95?'var(--accent-emerald)':'var(--accent-rose)'}">${okRate}%</div><div class="kpi-change">Ra ≤ 1.0 μm 기준</div></div>
    <div class="kpi-card"><div class="kpi-label">전체 평균 Ra (μm)</div><div class="kpi-value">${allVals.length ? fmt(avg(allVals), 4) : '-'}</div><div class="kpi-change">측정값 전체 평균</div></div>
  `;

  const recs = _getRoughnessAnalysis(rows);
  $('rep-rough-rec').innerHTML = recs.map(r => `<div class="analysis-item"><div class="analysis-dot ${r.level}"></div><div>${r.text}</div></div>`).join('');

  // 기종별 월별 추이
  const months = [...new Set(rows.map(r => r.measure_date?.slice(0,7)).filter(Boolean))].sort();
  const tCtx = $('rep-rough-trend')?.getContext('2d');
  if (tCtx) {
    const ps = uniq(rows.map(r => r.product_code)).filter(Boolean).sort();
    const datasets = ps.map((p, i) => ({
      label: p,
      data: months.map(m => {
        const vs = rows.filter(r => r.product_code===p && r.measure_date?.startsWith(m)).map(r => +r.value).filter(v => !isNaN(v));
        return vs.length ? +avg(vs).toFixed(4) : null;
      }),
      borderColor: PALETTE[i % PALETTE.length], backgroundColor: PALETTE[i % PALETTE.length] + '20',
      tension: 0.3, pointRadius: 3, borderWidth: 2, spanGaps: true,
    }));
    datasets.push({ label:'기준 1.0', data: months.map(() => ROUGH_THR), borderColor: SIDIZ_COLORS.rose, borderDash:[6,4], borderWidth:2, pointRadius:0, fill:false });
    makeLine('repRoughTrend', tCtx, months, datasets, {
      scales: { x:{grid:{display:false},ticks:{font:{size:9}}}, y:{min:0,suggestedMax:1.5,grid:{color:SIDIZ_COLORS.border},title:{display:true,text:'Ra (μm)',font:{size:10}}} }
    });
  }

  // 기종별 평균 vs 기준
  const aCtx = $('rep-rough-avg')?.getContext('2d');
  if (aCtx) {
    const ps = uniq(rows.map(r => r.product_code)).filter(Boolean).sort();
    const avgs = ps.map(p => {
      const vs = rows.filter(r => r.product_code===p).map(r => +r.value).filter(v => !isNaN(v));
      return vs.length ? +avg(vs).toFixed(4) : null;
    });
    const bclrs = avgs.map(v => (v !== null && v <= ROUGH_THR) ? SIDIZ_COLORS.blue : SIDIZ_COLORS.rose);
    makeBar('repRoughAvg', aCtx, ps, [{label:'평균 Ra (μm)', data:avgs, backgroundColor:bclrs, borderRadius:6}], {
      plugins: { legend:{display:false}, datalabels:{display:true,anchor:'end',align:'top',color:SIDIZ_COLORS.text,font:{weight:700,size:11},formatter:v=>v!==null?v.toFixed(4):'-'} },
      scales: { x:{grid:{display:false}}, y:{min:0,suggestedMax:1.5,grid:{color:SIDIZ_COLORS.border},title:{display:true,text:'Ra (μm)',font:{size:10}}} }
    });
  }

  // 기종별 통계 테이블
  const tbody = $('rep-rough-top10'); if (!tbody) return;
  const ps = uniq(rows.map(r => r.product_code)).filter(Boolean).sort();
  const stats = ps.map(p => {
    const pRows = rows.filter(r => r.product_code === p);
    const vs = pRows.map(r => +r.value).filter(v => !isNaN(v));
    const ngC = pRows.filter(r => roughnessJudge(r.value)==='NG').length;
    return { p, n: pRows.length, avgV: avg(vs), maxV: Math.max(...vs), ng: ngC };
  }).sort((a,b) => b.ng - a.ng);

  tbody.innerHTML = stats.length ? stats.map((s, i) => `
    <tr>
      <td><span class="rct-rank-num ${i===0&&s.ng>0?'gold':i===1&&s.ng>0?'silver':i===2&&s.ng>0?'bronze':'normal'}">${i+1}</span></td>
      <td><b>${escHtml(s.p)}</b></td>
      <td style="text-align:right">${s.n}</td>
      <td style="text-align:right;font-weight:600">${s.avgV !== null ? s.avgV.toFixed(4) : '-'} μm</td>
      <td style="text-align:right;color:${s.maxV>ROUGH_THR?'var(--accent-rose)':''}">${isFinite(s.maxV) ? s.maxV.toFixed(4) : '-'}</td>
      <td style="font-size:11px;color:var(--text-muted)">≤ 1.0 μm</td>
      <td style="text-align:right;color:${s.ng>0?'var(--accent-rose)':'var(--accent-emerald)'};font-weight:600">${s.ng}</td>
      <td style="text-align:right">${s.n ? Math.round((s.n-s.ng)/s.n*100) : 0}%</td>
    </tr>`).join('') :
    `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted)">데이터가 없습니다</td></tr>`;
}

// ----- 색차 리포트 -----
function renderReportColorimetry() {
  const rows = STATE.colorimetry;
  const total = rows.length;
  const ngRows = rows.filter(r => colorJudge(r.delta_e_master, r.delta_e_prev) === 'NG');
  const okRate = total ? Math.round((total - ngRows.length) / total * 100) : 0;
  const mVals = rows.map(r => +r.delta_e_master).filter(v => !isNaN(v));
  const colors = uniq(rows.map(r => r.color_code)).filter(Boolean).sort();

  $('rep-color-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">총 검사 건수</div><div class="kpi-value">${total.toLocaleString()}</div><div class="kpi-change">색상 ${colors.length}종</div></div>
    <div class="kpi-card"><div class="kpi-label">부적합 건수</div><div class="kpi-value" style="color:${ngRows.length>0?'var(--accent-rose)':'var(--accent-emerald)'}">${ngRows.length}</div><div class="kpi-change ${ngRows.length>0?'up':'down'}">ΔE > 1.0</div></div>
    <div class="kpi-card"><div class="kpi-label">합격률</div><div class="kpi-value" style="color:${okRate>=95?'var(--accent-emerald)':'var(--accent-rose)'}">${okRate}%</div><div class="kpi-change">ΔE ≤ 1.0 기준</div></div>
    <div class="kpi-card"><div class="kpi-label">평균 ΔE (마스터)</div><div class="kpi-value" style="color:${mVals.length&&avg(mVals)<=COLOR_THR?'var(--accent-emerald)':'var(--accent-rose)'}">${mVals.length ? avg(mVals).toFixed(2) : '-'}</div><div class="kpi-change">기준 ≤ 1.0</div></div>
  `;

  const recs = _getColorimetryAnalysis(rows);
  $('rep-color-rec').innerHTML = recs.map(r => `<div class="analysis-item"><div class="analysis-dot ${r.level}"></div><div>${r.text}</div></div>`).join('');

  // 월별 ΔE 추이
  const months = [...new Set(rows.map(r => r.measure_date?.slice(0,7)).filter(Boolean))].sort();
  const tCtx = $('rep-color-trend')?.getContext('2d');
  if (tCtx) {
    const datasets = [
      { label:'ΔE 마스터', data:months.map(m=>{const v=rows.filter(r=>r.measure_date?.startsWith(m)).map(r=>+r.delta_e_master).filter(v=>!isNaN(v));return v.length?+avg(v).toFixed(2):null;}), borderColor:SIDIZ_COLORS.blue, backgroundColor:SIDIZ_COLORS.blue+'20', tension:0.3, pointRadius:3, borderWidth:2, spanGaps:true },
      { label:'ΔE 전lot', data:months.map(m=>{const v=rows.filter(r=>r.measure_date?.startsWith(m)).map(r=>+r.delta_e_prev).filter(v=>!isNaN(v));return v.length?+avg(v).toFixed(2):null;}), borderColor:SIDIZ_COLORS.cyan, backgroundColor:SIDIZ_COLORS.cyan+'20', tension:0.3, pointRadius:3, borderWidth:2, spanGaps:true },
      { label:'기준 1.0', data:months.map(()=>COLOR_THR), borderColor:SIDIZ_COLORS.rose, borderDash:[6,4], borderWidth:2, pointRadius:0, fill:false },
    ];
    makeLine('repColorTrend', tCtx, months, datasets, {
      scales: { x:{grid:{display:false},ticks:{font:{size:9}}}, y:{min:0,suggestedMax:1.5,grid:{color:SIDIZ_COLORS.border},title:{display:true,text:'ΔE',font:{size:10}}} }
    });
  }

  // 색상별 평균 ΔE
  const sCtx = $('rep-color-spec')?.getContext('2d');
  if (sCtx) {
    const avgs = colors.map(c => {
      const v = rows.filter(r=>r.color_code===c).map(r=>+r.delta_e_master).filter(v=>!isNaN(v));
      return v.length ? +avg(v).toFixed(2) : null;
    });
    const bclrs = avgs.map(v => (v!==null&&v<=COLOR_THR) ? SIDIZ_COLORS.blue : SIDIZ_COLORS.rose);
    makeBar('repColorSpec', sCtx, colors.length?colors:['(없음)'], [{label:'마스터 ΔE', data:avgs, backgroundColor:bclrs, borderRadius:4}], {
      plugins:{legend:{display:false},datalabels:{display:true,anchor:'end',align:'top',color:SIDIZ_COLORS.text,font:{weight:700,size:10},formatter:v=>v!==null?v.toFixed(2):'-'}},
      scales:{x:{grid:{display:false},ticks:{font:{size:9},maxRotation:45}},y:{min:0,suggestedMax:1.5,grid:{color:SIDIZ_COLORS.border}}}
    });
  }

  // 색상별 통계 테이블
  const tbody = $('rep-color-top10'); if (!tbody) return;
  const stats = colors.map(c => {
    const cRows = rows.filter(r => r.color_code === c);
    const mv = cRows.map(r => +r.delta_e_master).filter(v => !isNaN(v));
    const pv = cRows.map(r => +r.delta_e_prev).filter(v => !isNaN(v));
    const ngC = cRows.filter(r => colorJudge(r.delta_e_master, r.delta_e_prev)==='NG').length;
    return { c, n: cRows.length, mAvg: avg(mv), pAvg: avg(pv), ng: ngC };
  }).sort((a,b) => b.ng - a.ng || b.mAvg - a.mAvg);

  tbody.innerHTML = stats.length ? stats.map((s, i) => `
    <tr>
      <td><span class="rct-rank-num ${i===0&&s.ng>0?'gold':i===1&&s.ng>0?'silver':i===2&&s.ng>0?'bronze':'normal'}">${i+1}</span></td>
      <td><b>${escHtml(s.c)}</b></td>
      <td style="text-align:right">${s.n}</td>
      <td style="text-align:right;font-weight:600;color:${s.mAvg!==null&&s.mAvg>COLOR_THR?'var(--accent-rose)':''}">${s.mAvg !== null ? s.mAvg.toFixed(2) : '-'}</td>
      <td style="text-align:right;color:${s.pAvg!==null&&s.pAvg>COLOR_THR?'var(--accent-rose)':''}">${s.pAvg !== null ? s.pAvg.toFixed(2) : '-'}</td>
      <td style="font-size:11px;color:var(--text-muted)">≤ 1.0</td>
      <td style="text-align:right;color:${s.ng>0?'var(--accent-rose)':'var(--accent-emerald)'};font-weight:600">${s.ng}</td>
      <td style="text-align:right">${s.n ? Math.round((s.n-s.ng)/s.n*100) : 0}%</td>
    </tr>`).join('') :
    `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted)">데이터가 없습니다</td></tr>`;
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
    material: $('form-bolt-material').value.trim() || null,
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
  const name = $('form-sponge-name').value.trim();
  // 자재명에서 자동 파싱: 예 "TC11 좌판 스펀지(35 ± 5)" → target=35, tol=5
  let spec_target = null, spec_tol = null;
  const specMatch = name.match(/\((\d+)\s*[±]\s*(\d+)\)/);
  if (specMatch) {
    spec_target = parseInt(specMatch[1]);
    spec_tol = parseInt(specMatch[2]);
  }
  const data = {
    measure_date: $('form-sponge-date').value,
    code: $('form-sponge-code').value.trim(),
    color: $('form-sponge-color').value.trim() || null,
    name,
    spec_target,
    spec_tol,
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

// ===== 측정이력 삭제 (비밀번호 보호) =====
window.deleteInspectRow = async function (table, id) {
  const pw = prompt('이 측정이력을 삭제하려면 비밀번호를 입력하세요:');
  if (pw === null) return; // 취소
  if (pw !== '1234') { alert('❌ 비밀번호가 일치하지 않습니다.\n삭제가 취소되었습니다.'); return; }
  if (!confirm('비밀번호 확인 완료. 정말 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.')) return;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'DELETE',
      headers: SB_HEADERS,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status}: ${txt}`);
    }
    await loadIncomingData(true);
    if (table === 'incoming_bolts') renderBolt();
    else if (table === 'incoming_rods') renderRod();
    else if (table === 'incoming_sponges') renderSponge();
  } catch (e) {
    console.error(e);
    alert('❌ 삭제 실패: ' + e.message);
  }
};

// ===== datalist 자동완성 + 자재코드↔자재명 자동연동 =====
function fillDatalist(id, options) {
  const dl = $(id);
  if (!dl) return;
  dl.innerHTML = uniq(options).sort().map(o => `<option value="${escHtml(o)}">`).join('');
}

let _formAutoBound = false;
function bindFormAutocomplete() {
  if (_formAutoBound) return;
  _formAutoBound = true;

  // 자재코드 ↔ 자재명: 1:1 관계이므로 항상 덮어쓰기
  // 다른 필드(색상/공급업체/재질): 비어있을 때만 채움 (사용자 입력 보호)
  // input + change 둘 다 처리: datalist 클릭 즉시 반응 + 키보드 입력 후 포커스 아웃 모두 커버

  function setupAutoFill(prefix, dataset) {
    const codeEl = $(`form-${prefix}-code`);
    const nameEl = $(`form-${prefix}-name`);

    const fromCode = () => {
      const code = codeEl.value.trim();
      if (!code) return;
      const m = dataset().find(r => r.code === code);
      if (!m) return;
      nameEl.value = m.name; // 항상 덮어씀
      const colorEl = $(`form-${prefix}-color`);
      const supplierEl = $(`form-${prefix}-supplier`);
      const materialEl = $(`form-${prefix}-material`);
      if (colorEl && !colorEl.value) colorEl.value = m.color || '';
      if (supplierEl && !supplierEl.value) supplierEl.value = m.supplier || '';
      if (materialEl && !materialEl.value && m.material) materialEl.value = m.material;
    };
    const fromName = () => {
      const name = nameEl.value.trim();
      if (!name) return;
      const m = dataset().find(r => r.name === name);
      if (!m) return;
      codeEl.value = m.code; // 항상 덮어씀
      const colorEl = $(`form-${prefix}-color`);
      const supplierEl = $(`form-${prefix}-supplier`);
      const materialEl = $(`form-${prefix}-material`);
      if (colorEl && !colorEl.value) colorEl.value = m.color || '';
      if (supplierEl && !supplierEl.value) supplierEl.value = m.supplier || '';
      if (materialEl && !materialEl.value && m.material) materialEl.value = m.material;
    };

    // input 이벤트: datalist 선택 즉시 반응 (클릭만으로 자동완성)
    codeEl?.addEventListener('input', fromCode);
    nameEl?.addEventListener('input', fromName);
    // change 이벤트: 직접 타이핑 후 포커스 아웃에도 작동
    codeEl?.addEventListener('change', fromCode);
    nameEl?.addEventListener('change', fromName);
  }

  setupAutoFill('bolt', () => STATE.bolts);
  setupAutoFill('rod', () => STATE.rods);
  setupAutoFill('sponge', () => STATE.sponges);
}

function refreshDatalists() {
  // 볼트
  fillDatalist('dl-bolt-supplier', STATE.bolts.map(r => r.supplier));
  fillDatalist('dl-bolt-code', STATE.bolts.map(r => r.code));
  fillDatalist('dl-bolt-color', STATE.bolts.map(r => r.color));
  fillDatalist('dl-bolt-name', STATE.bolts.map(r => r.name));
  fillDatalist('dl-bolt-material', STATE.bolts.map(r => r.material));
  // 중심봉
  fillDatalist('dl-rod-supplier', STATE.rods.map(r => r.supplier));
  fillDatalist('dl-rod-code', STATE.rods.map(r => r.code));
  fillDatalist('dl-rod-color', STATE.rods.map(r => r.color));
  fillDatalist('dl-rod-name', STATE.rods.map(r => r.name));
  // 스폰지
  fillDatalist('dl-sponge-code', STATE.sponges.map(r => r.code));
  fillDatalist('dl-sponge-color', STATE.sponges.map(r => r.color));
  fillDatalist('dl-sponge-name', STATE.sponges.map(r => r.name));
  // 색차
  fillDatalist('dl-color-supplier', (STATE.colorimetry || []).map(r => r.supplier));
  fillDatalist('dl-color-code', (STATE.colorimetry || []).map(r => r.color_code));
}

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
    refreshDatalists();
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
  } else if (kind === 'sponge') {
    rows = getSpongeFiltered();
    filename = `인수검사_스폰지_${today}.xlsx`;
    header = ['측정일', '자재코드', '자재명', '규격', '중앙(1)', '좌(1)', '우(1)', '중앙(2)', '좌(2)', '우(2)', '평균', '판정'];
    mapper = r => [r.measure_date, r.code, r.name, r.spec_target ? `${r.spec_target}±${r.spec_tol || 5}` : '', r.m1_center, r.m1_left, r.m1_right, r.m2_center, r.m2_left, r.m2_right, spongeAvg(r), spongeJudge(r)];
  } else if (kind === 'reamer') {
    rows = getReamerFiltered();
    filename = `인수검사_리머_${today}.xlsx`;
    header = ['측정일', '공급업체', '기종', '측정값(mm)', '기준범위', '판정', '비고'];
    mapper = r => [r.measure_date, r.supplier, r.product_code, r.value, (REAMER_SPECS[r.product_code]?.label || '-'), reamerJudge(r.product_code, r.value), r.note || ''];
  } else if (kind === 'roughness') {
    rows = getRoughnessFiltered();
    filename = `인수검사_조도_${today}.xlsx`;
    header = ['측정일', '공급업체', '기종', '측정값(μm)', '기준(μm)', '판정', '비고'];
    mapper = r => [r.measure_date, r.supplier, r.product_code, r.value, '≤ 1.0', roughnessJudge(r.value), r.note || ''];
  } else if (kind === 'colorimetry') {
    rows = getColorimetryFiltered();
    filename = `인수검사_색차_${today}.xlsx`;
    header = ['검사일', '공급처', '색상', 'LOT', '생산량(Yd)', 'ΔE(마스터)', 'ΔE(전lot)', '판정', '비고'];
    mapper = r => [r.measure_date, r.supplier, r.color_code, r.lot || '', r.quantity_yd || '', r.delta_e_master, r.delta_e_prev || '', colorJudge(r.delta_e_master, r.delta_e_prev), r.note || ''];
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
  } else if (kind === 'reamer') {
    ['inq-reamer-supplier', 'inq-reamer-product', 'inq-reamer-judge', 'inq-reamer-from', 'inq-reamer-to'].forEach(id => { const el=$(id); if(el) el.value=''; });
    renderReamer();
  } else if (kind === 'roughness') {
    ['inq-rough-supplier', 'inq-rough-product', 'inq-rough-judge', 'inq-rough-from', 'inq-rough-to'].forEach(id => { const el=$(id); if(el) el.value=''; });
    renderRoughness();
  } else if (kind === 'colorimetry') {
    ['inq-color-supplier', 'inq-color-code', 'inq-color-judge', 'inq-color-from', 'inq-color-to'].forEach(id => { const el=$(id); if(el) el.value=''; });
    renderColorimetry();
  }
};

// ======================================================================
// ============ 리머 / 조도 / 색차 ============
// ======================================================================

const REAMER_SPECS = {
  '4000G':    { lo: 5.50, hi: 6.00, nom: 5.75,  label: '5.75±0.25 mm' },
  'CH4800':   { lo: 2.20, hi: 3.30, nom: 2.75,  label: '2.5~3.0±0.3 mm' },
  'ITO-TILT': { lo: 4.70, hi: 5.30, nom: 5.00,  label: '5.0±0.3 mm' },
  'S-TILT':   { lo: 4.50, hi: 5.00, nom: 4.75,  label: '4.75±0.25 mm' },
};
const ROUGH_THR = 1.0;
const COLOR_THR = 1.0;
const INSP_PRODUCTS = ['4000G', 'CH4800', 'ITO-TILT', 'S-TILT'];
// 2025년 측정 평균 (엑셀 2026년 정기 조도,리머 측정 기준)
const REAMER_2025_AVG = { '4000G': 5.76, 'CH4800': 2.69, 'ITO-TILT': 5.05, 'S-TILT': 4.67 };
const ROUGH_2025_AVG  = { '4000G': 0.687, 'CH4800': 0.503, 'ITO-TILT': 0.545, 'S-TILT': 1.433 };

// ===== 판정 =====
function reamerJudge(product, value) {
  if (value === null || value === undefined || isNaN(+value)) return '';
  const s = REAMER_SPECS[product]; if (!s) return '';
  return (+value >= s.lo && +value <= s.hi) ? 'OK' : 'NG';
}
function roughnessJudge(value) {
  if (value === null || value === undefined || isNaN(+value)) return '';
  return +value <= ROUGH_THR ? 'OK' : 'NG';
}
function colorJudge(de_master, de_prev) {
  const m = +de_master;
  if (isNaN(m)) return '';
  const mOk = m <= COLOR_THR;
  const p = +de_prev;
  const pOk = isNaN(p) || p <= COLOR_THR;
  return (mOk && pOk) ? 'OK' : 'NG';
}
function judgeTag(j) {
  if (j === 'OK') return `<span style="color:var(--accent-emerald);font-weight:700">OK</span>`;
  if (j === 'NG') return `<span style="color:var(--accent-rose);font-weight:700">NG</span>`;
  return '<span style="color:var(--text-muted)">-</span>';
}

// ============ 리머 탭 ============
function getReamerFiltered() {
  const supplier = $('inq-reamer-supplier')?.value || '';
  const product  = $('inq-reamer-product')?.value  || '';
  const judge    = $('inq-reamer-judge')?.value    || '';
  const from     = $('inq-reamer-from')?.value     || '';
  const to       = $('inq-reamer-to')?.value       || '';
  return STATE.reamers.filter(r => {
    if (supplier && r.supplier !== supplier) return false;
    if (product  && r.product_code !== product)  return false;
    if (from && (!r.measure_date || r.measure_date < from)) return false;
    if (to   && (!r.measure_date || r.measure_date > to))   return false;
    if (judge && reamerJudge(r.product_code, r.value) !== judge) return false;
    return true;
  });
}
function renderReamerKPI(rows) {
  const total = rows.length;
  const now = new Date().toISOString().slice(0,7);
  const thisMonth = rows.filter(r => r.measure_date?.slice(0,7) === now).length;
  const ngCount = rows.filter(r => reamerJudge(r.product_code, r.value) === 'NG').length;
  const okRate = total ? Math.round((total - ngCount) / total * 100) : 0;
  const pAvgs = INSP_PRODUCTS.map(p => {
    const vals = rows.filter(r => r.product_code === p).map(r => +r.value).filter(v => !isNaN(v));
    return { p, a: vals.length ? avg(vals) : null };
  });
  // pAvgs 인덱스: 0=4000G, 1=CH4800, 2=ITO-TILT, 3=S-TILT
  const mkCard = ({p, a}) => {
    const s = REAMER_SPECS[p]; const ok = a!==null&&a>=s.lo&&a<=s.hi;
    return `<div class="kpi-card"><div class="kpi-label">${p} 평균</div><div class="kpi-value" style="${a===null?'':(ok?'color:var(--accent-emerald)':'color:var(--accent-rose)')}">${a!==null?a.toFixed(3):'-'}</div><div class="kpi-change">기준 ${s.label}</div></div>`;
  };
  const el = $('inq-reamer-kpi'); if (!el) return;
  // 배치: 총건수|4000G|S-TILT / 합격률|CH4800|ITO-TILT (3열)
  el.style.gridTemplateColumns = 'repeat(3, 1fr)';
  el.innerHTML = `
    <div class="kpi-card"><div class="kpi-label">총 측정 건수</div><div class="kpi-value">${total.toLocaleString()}</div><div class="kpi-change">이번 달 ${thisMonth}건</div></div>
    ${mkCard(pAvgs[0])}
    ${mkCard(pAvgs[3])}
    <div class="kpi-card"><div class="kpi-label">합격률</div><div class="kpi-value" style="color:${okRate>=95?'var(--accent-emerald)':'var(--accent-rose)'}">${okRate}%</div><div class="kpi-change">NG ${ngCount}건</div></div>
    ${mkCard(pAvgs[1])}
    ${mkCard(pAvgs[2])}
  `;
}
function renderReamerCharts(rows) {
  // ── 고정 X축: 현재 연도 1~12월 ──────────────────────────
  const yr = new Date().getFullYear();
  const monthsFixed = Array.from({length:12}, (_,i) => `${yr}-${String(i+1).padStart(2,'0')}`);
  const monthLabels  = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const clrs = [SIDIZ_COLORS.blue, SIDIZ_COLORS.cyan, SIDIZ_COLORS.emerald, SIDIZ_COLORS.amber];
  const allLo = Math.min(...INSP_PRODUCTS.map(p => REAMER_SPECS[p].lo));
  const allHi = Math.max(...INSP_PRODUCTS.map(p => REAMER_SPECS[p].hi));
  const axisPad = (allHi - allLo) * 0.10;
  const NPRODS = INSP_PRODUCTS.length;
  const SPEC_HI_IDX = NPRODS, SPEC_LO_IDX = NPRODS+1, SPEC_NOM_IDX = NPRODS+2;

  // 테이블 컬럼 하이라이트 헬퍼
  function _hlReamerCol(colIdx) {
    const tbl = document.getElementById('inq-reamer-trend-table');
    if (!tbl) return;
    tbl.querySelectorAll('[data-col]').forEach(el => {
      const isHl = colIdx >= 0 && parseInt(el.getAttribute('data-col')) === colIdx;
      el.style.boxShadow = '';
      if (!el.getAttribute('data-ng') && !el.getAttribute('data-spec')) {
        el.style.background = isHl ? 'rgba(230,168,0,0.22)' : '';
      }
    });
  }

  // ① 기종별 월별 추이 — 날짜 필터 무관, 전체 누적 데이터 사용
  const tCtx = document.getElementById('inq-reamer-trend')?.getContext('2d');
  if (tCtx) {
    const allData = STATE.reamers;
    // 이슈1: NG만 빨강, OK는 기본 계열 색상
    const productDatasets = INSP_PRODUCTS.map((p, i) => {
      const s = REAMER_SPECS[p];
      const monthAvgs = monthsFixed.map(m => {
        const vals = allData.filter(r => r.product_code===p && r.measure_date?.startsWith(m)).map(r=>+r.value).filter(v=>!isNaN(v));
        return vals.length ? +avg(vals).toFixed(3) : null;
      });
      return {
        label: p,
        data: monthAvgs,
        borderColor: clrs[i],
        backgroundColor: clrs[i]+'20',
        tension: 0.3, borderWidth: 2, spanGaps: true,
        pointRadius: monthAvgs.map(v => v!==null ? 5 : 0),
        pointHoverRadius: 7,
        // NG만 빨강 원, OK는 기본 계열색 원
        pointBackgroundColor: monthAvgs.map(v => (v!==null && (v<s.lo||v>s.hi)) ? SIDIZ_COLORS.rose : clrs[i]),
        pointBorderColor:     monthAvgs.map(v => (v!==null && (v<s.lo||v>s.hi)) ? SIDIZ_COLORS.rose : clrs[i]),
        pointBorderWidth: 2,
      };
    });
    // 이슈2: 범례 클릭 시 표시될 스펙 라인 (초기 숨김)
    const specDatasets = [
      { label:'_spec상한', data:monthsFixed.map(()=>null), borderColor:SIDIZ_COLORS.rose+'DD', borderDash:[5,5], borderWidth:2, pointRadius:0, fill:false, tension:0, hidden:true, spanGaps:true },
      { label:'_spec하한', data:monthsFixed.map(()=>null), borderColor:SIDIZ_COLORS.blue+'DD', borderDash:[5,5], borderWidth:2, pointRadius:0, fill:false, tension:0, hidden:true, spanGaps:true },
      { label:'_spec중심', data:monthsFixed.map(()=>null), borderColor:SIDIZ_COLORS.navy+'99', borderDash:[3,3], borderWidth:1.5, pointRadius:0, fill:false, tension:0, hidden:true, spanGaps:true },
    ];
    destroyChart('reamer-trend');
    STATE.charts['reamer-trend'] = new Chart(tCtx, {
      type: 'line',
      data: { labels: monthLabels, datasets: [...productDatasets, ...specDatasets] },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode:'index', intersect:false },
        plugins: {
          legend: {
            position:'top', align:'end',
            labels: {
              boxWidth:12, font:{size:10},
              filter: (item) => !String(item.text).startsWith('_'), // 스펙 라인 범례 숨김
            },
            // 이슈2: 범례 클릭 → 단일 기종 + 스펙범위 + Y축 조정
            onClick: (e, legendItem, legend) => {
              const chart = legend.chart;
              const idx = legendItem.datasetIndex;
              if (idx >= NPRODS) return;
              const clickedMeta = chart.getDatasetMeta(idx);
              const onlyThis = INSP_PRODUCTS.every((_,i) => i===idx || chart.getDatasetMeta(i).hidden);
              if (!clickedMeta.hidden && onlyThis) {
                // 단독 상태 → 전체 복귀
                INSP_PRODUCTS.forEach((_,i) => { chart.getDatasetMeta(i).hidden = false; });
                [SPEC_HI_IDX, SPEC_LO_IDX, SPEC_NOM_IDX].forEach(si => { chart.getDatasetMeta(si).hidden = true; });
                chart.options.scales.y.min = allLo - axisPad;
                chart.options.scales.y.max = allHi + axisPad;
              } else {
                // 해당 기종만 표시 + 스펙 범위
                INSP_PRODUCTS.forEach((_,i) => { chart.getDatasetMeta(i).hidden = (i!==idx); });
                const prod = INSP_PRODUCTS[idx];
                const s = REAMER_SPECS[prod];
                chart.data.datasets[SPEC_HI_IDX].data = monthsFixed.map(() => s.hi);
                chart.data.datasets[SPEC_LO_IDX].data = monthsFixed.map(() => s.lo);
                chart.data.datasets[SPEC_NOM_IDX].data = monthsFixed.map(() => s.nom);
                [SPEC_HI_IDX, SPEC_LO_IDX, SPEC_NOM_IDX].forEach(si => { chart.getDatasetMeta(si).hidden = false; });
                const pad2 = Math.max((s.hi - s.lo) * 0.6, 0.2);
                chart.options.scales.y.min = s.lo - pad2;
                chart.options.scales.y.max = s.hi + pad2;
              }
              chart.update();
              // 테이블 컬럼 하이라이트
              const nowAllVisible = INSP_PRODUCTS.every((_,i) => !chart.getDatasetMeta(i).hidden);
              _hlReamerCol(nowAllVisible ? -1 : idx);
            }
          },
          datalabels: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => {
                const v = item.raw;
                if (v===null||v===undefined) return null;
                const dsIdx = item.datasetIndex;
                if (dsIdx === SPEC_HI_IDX) return `스펙 상한: ${(+v).toFixed(3)} mm`;
                if (dsIdx === SPEC_LO_IDX) return `스펙 하한: ${(+v).toFixed(3)} mm`;
                if (dsIdx === SPEC_NOM_IDX) return `스펙 중심: ${(+v).toFixed(3)} mm`;
                const p = INSP_PRODUCTS[dsIdx];
                if (!p) return null;
                const s = REAMER_SPECS[p];
                const ok = +v>=s.lo && +v<=s.hi;
                return `${p}: ${(+v).toFixed(3)} mm [${s.label}] → ${ok?'✓ OK':'✗ NG'}`;
              }
            }
          }
        },
        scales: {
          x: { grid:{display:false}, ticks:{font:{size:9}} },
          y: { min:allLo-axisPad, max:allHi+axisPad, grid:{color:SIDIZ_COLORS.border}, title:{display:true, text:'mm', font:{size:10}} }
        }
      }
    });
  }

  // ② 기종별 평균 vs 관리기준 (2025년 평균 ● 마커 플러그인)
  const aCtx = document.getElementById('inq-reamer-avg')?.getContext('2d');
  if (aCtx) {
    const avgs = INSP_PRODUCTS.map(p => {
      const vals = rows.filter(r=>r.product_code===p).map(r=>+r.value).filter(v=>!isNaN(v));
      return vals.length ? +avg(vals).toFixed(3) : null;
    });
    const bclrs = INSP_PRODUCTS.map((p,i) => {
      const s = REAMER_SPECS[p];
      return (avgs[i]!==null && avgs[i]>=s.lo && avgs[i]<=s.hi) ? SIDIZ_COLORS.emerald : SIDIZ_COLORS.rose;
    });

    // 2025년 평균 ● 마커 (커스텀 플러그인)
    const prev2025Plugin = {
      id: 'reamer2025Markers',
      afterDatasetsDraw(chart) {
        const {ctx: c2, chartArea, scales} = chart;
        if (!chartArea || !scales.x || !scales.y) return;
        INSP_PRODUCTS.forEach((p) => {
          const v2025 = REAMER_2025_AVG[p];
          if (v2025 == null) return;
          const x = scales.x.getPixelForValue(v2025);
          const y = scales.y.getPixelForValue(p);
          if (!isFinite(x) || !isFinite(y)) return;
          c2.save();
          c2.fillStyle = SIDIZ_COLORS.amber;
          c2.strokeStyle = '#fff'; c2.lineWidth = 2;
          c2.beginPath();
          c2.arc(x, y, 7, 0, Math.PI * 2);
          c2.closePath(); c2.fill(); c2.stroke();
          c2.restore();
        });
      }
    };

    destroyChart('reamer-avg');
    STATE.charts['reamer-avg'] = new Chart(aCtx, {
      type: 'bar',
      data: {
        labels: INSP_PRODUCTS,
        datasets: [
          { label:'관리기준 범위', data:INSP_PRODUCTS.map(p=>[REAMER_SPECS[p].lo,REAMER_SPECS[p].hi]), backgroundColor:'rgba(0,43,210,0.08)', borderColor:'rgba(0,43,210,0.28)', borderWidth:1, order:3, barThickness:26 },
          { label:'측정 평균 (mm)', data:avgs, backgroundColor:bclrs.map(c=>c+'CC'), borderColor:bclrs, borderWidth:1, borderRadius:4, order:1, barThickness:26 },
          { label:'2025년 평균 ●', data:[], backgroundColor:'transparent', borderWidth:0, pointRadius:0 }, // 범례용 더미
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { right: 35, left: 5, bottom: 20 } },
        indexAxis: 'y',
        interaction: { mode:'index', intersect:false },
        scales: {
          x: {
            min: 1.5, max: 6.5,
            ticks: { stepSize: 0.5 },
            grid: { color: SIDIZ_COLORS.border },
            title: { display:true, text:'mm', font:{size:10} }
          },
          y: { grid:{display:false} }
        },
        plugins: {
          legend: {
            display: true, position:'top', align:'end',
            labels: {
              boxWidth:10, font:{size:10},
              generateLabels: (chart) => {
                const base = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                const item2025 = base.find(item => item.text && item.text.includes('●'));
                if (item2025) { item2025.fillStyle = SIDIZ_COLORS.amber; item2025.strokeStyle = '#fff'; }
                return base;
              }
            },
          },
          datalabels: {
            display: (ctx) => {
              if (ctx.datasetIndex === 0) return true; // 관리기준 범위 안에 spec 텍스트
              if (ctx.datasetIndex === 1) return ctx.dataset.data[ctx.dataIndex] !== null;
              return false;
            },
            formatter: (v, ctx) => {
              if (ctx.datasetIndex === 0) {
                const p = INSP_PRODUCTS[ctx.dataIndex];
                return REAMER_SPECS[p]?.label || '';
              }
              if (ctx.datasetIndex === 1) return v !== null ? Number(v).toFixed(3) : null;
              return null;
            },
            anchor: (ctx) => ctx.datasetIndex === 0 ? 'center' : 'end',
            align: (ctx) => ctx.datasetIndex === 0 ? 'center' : 'right',
            color: (ctx) => ctx.datasetIndex === 0 ? SIDIZ_COLORS.navy : SIDIZ_COLORS.text,
            font: (ctx) => ctx.datasetIndex === 0
              ? { size: 9, weight: 500 }
              : { size: 11, weight: 700 },
            clamp: false,
            clip: false,
          },
          tooltip: {
            callbacks: {
              label: (item) => {
                if (item.datasetIndex === 0) {
                  const p = INSP_PRODUCTS[item.dataIndex];
                  const s = REAMER_SPECS[p];
                  return `관리기준: ${s.lo.toFixed(2)} ~ ${s.hi.toFixed(2)} mm`;
                }
                if (item.datasetIndex === 1 && item.raw!==null) {
                  const p = INSP_PRODUCTS[item.dataIndex];
                  const s = REAMER_SPECS[p];
                  const ok = +item.raw>=s.lo && +item.raw<=s.hi;
                  return `측정 평균: ${(+item.raw).toFixed(3)} mm → ${ok?'✓ OK':'✗ NG'}`;
                }
                return null;
              },
              afterLabel: (item) => {
                if (item.datasetIndex <= 1) {
                  const p = INSP_PRODUCTS[item.dataIndex];
                  if (p) {
                    const v = REAMER_2025_AVG[p];
                    if (v != null) return `  ● 2025년 평균: ${v.toFixed(3)} mm`;
                  }
                }
                return null;
              }
            }
          }
        }
      },
      plugins: [prev2025Plugin]
    });
  }

  // ③ 기종별 월별 데이터 표 (월별 추이 카드 하단, 12개월 고정)
  const tblDiv = document.getElementById('inq-reamer-trend-table');
  if (tblDiv) {
    const allData3 = STATE.reamers;
    const monthRows = monthsFixed.map((m, mi) => {
      const cells = INSP_PRODUCTS.map(p => {
        const s = REAMER_SPECS[p];
        const vals = allData3.filter(r=>r.product_code===p && r.measure_date?.startsWith(m)).map(r=>+r.value).filter(v=>!isNaN(v));
        const v = vals.length ? +avg(vals).toFixed(3) : null;
        const ng = v !== null && (v < s.lo || v > s.hi);
        return { v, ng };
      });
      return { label: monthLabels[mi], cells };
    });
    let th = `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:4px">`;
    th += `<thead><tr>`;
    th += `<th style="padding:4px 8px;text-align:left;background:var(--bg);border-bottom:2px solid var(--border);font-size:10px;color:var(--text-muted);white-space:nowrap">구분</th>`;
    INSP_PRODUCTS.forEach((p, ci) => {
      th += `<th data-col="${ci}" style="padding:4px 8px;text-align:center;background:var(--bg);border-bottom:2px solid var(--border);font-size:10px;font-weight:700">${p}</th>`;
    });
    th += `</tr><tr>`;
    th += `<td style="padding:3px 8px;font-size:9px;color:var(--text-muted);background:#fafafa">관리기준</td>`;
    INSP_PRODUCTS.forEach((p, ci) => {
      th += `<td data-col="${ci}" data-spec="1" style="padding:3px 8px;text-align:center;font-size:9px;color:var(--text-muted);background:#fafafa">${REAMER_SPECS[p].label}</td>`;
    });
    th += `</tr></thead><tbody>`;
    monthRows.forEach(({label, cells}) => {
      th += `<tr>`;
      th += `<td style="padding:4px 8px;font-weight:600;font-size:11px;color:var(--text-secondary);white-space:nowrap;border-bottom:1px solid var(--border)">${label}</td>`;
      cells.forEach(({v, ng}, ci) => {
        const ngAttr = ng ? ' data-ng="1"' : '';
        const bgStyle = ng ? 'background:rgba(255,108,57,0.18);color:var(--accent-rose);' : '';
        th += `<td data-col="${ci}"${ngAttr} style="padding:4px 8px;text-align:center;${bgStyle}font-weight:${v!==null?600:400};border-bottom:1px solid var(--border)">${v!==null?v.toFixed(3):'-'}</td>`;
      });
      th += `</tr>`;
    });
    th += `</tbody></table>`;
    tblDiv.innerHTML = th;
  }

  // ④ 판정 분포 — 스택 바 (전체 + 공급업체별)
  const jCtx = document.getElementById('inq-reamer-judge-pie')?.getContext('2d');
  if (jCtx) {
    const allJ = STATE.reamers;
    const calcJ = (data) => ({
      ok: data.filter(r=>reamerJudge(r.product_code,r.value)==='OK').length,
      ng: data.filter(r=>reamerJudge(r.product_code,r.value)==='NG').length,
    });
    const jTotal = calcJ(allJ);
    const jGCK   = calcJ(allJ.filter(r=>r.supplier==='GCK'));
    const jDJ    = calcJ(allJ.filter(r=>r.supplier==='동진다이캐스팅'));
    const cats = ['전체', 'GCK', '동진다이캐스팅'];
    const okArr = [jTotal.ok, jGCK.ok, jDJ.ok];
    const ngArr = [jTotal.ng, jGCK.ng, jDJ.ng];
    const totArr = cats.map((_,i)=>okArr[i]+ngArr[i]);
    destroyChart('reamer-judge-pie');
    STATE.charts['reamer-judge-pie'] = new Chart(jCtx, {
      type: 'bar',
      data: {
        labels: cats,
        datasets: [
          { label:'합격 (OK)', data:okArr, backgroundColor:SIDIZ_COLORS.emerald+'CC', borderColor:SIDIZ_COLORS.emerald, borderWidth:1, borderRadius:4, stack:'s' },
          { label:'불합격 (NG)', data:ngArr, backgroundColor:SIDIZ_COLORS.rose+'CC', borderColor:SIDIZ_COLORS.rose, borderWidth:1, borderRadius:4, stack:'s' },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        clip: false,
        layout: { padding: { top: 24 } },
        interaction: { mode:'index', intersect:false },
        scales: {
          x: { stacked:true, grid:{display:false}, ticks:{font:{size:12, weight:600}} },
          y: { stacked:true, beginAtZero:true, grid:{color:SIDIZ_COLORS.border}, title:{display:true,text:'건',font:{size:10}} }
        },
        plugins: {
          legend: { display:true, position:'top', align:'end', labels:{boxWidth:10,font:{size:11}} },
          datalabels: {
            display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0,
            formatter: (v, ctx) => {
              const tot = totArr[ctx.dataIndex];
              const pct = tot > 0 ? Math.round(v/tot*100) : 0;
              return `${v}건\n${pct}%`;
            },
            anchor: (ctx) => {
              if (ctx.datasetIndex === 1) {
                const tot = totArr[ctx.dataIndex];
                return tot > 0 && ctx.dataset.data[ctx.dataIndex] / tot < 0.25 ? 'end' : 'center';
              }
              return 'center';
            },
            align: (ctx) => {
              if (ctx.datasetIndex === 1) {
                const tot = totArr[ctx.dataIndex];
                return tot > 0 && ctx.dataset.data[ctx.dataIndex] / tot < 0.25 ? 'top' : 'center';
              }
              return 'center';
            },
            color: (ctx) => {
              if (ctx.datasetIndex === 1) {
                const tot = totArr[ctx.dataIndex];
                return tot > 0 && ctx.dataset.data[ctx.dataIndex] / tot < 0.25 ? SIDIZ_COLORS.rose : '#fff';
              }
              return '#fff';
            },
            font:{weight:700, size:11},
            textAlign: 'center',
            clip: false,
          },
          tooltip: {
            callbacks: {
              label: (item) => {
                const v = item.raw;
                const tot = totArr[item.dataIndex];
                const pct = tot > 0 ? Math.round(v/tot*100) : 0;
                return `${item.dataset.label}: ${v}건 (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }
}
function renderReamerTable(rows) {
  const cnt=$('inq-reamer-count'); if(cnt) cnt.textContent=rows.length.toLocaleString();
  const tbody=$('inq-reamer-table-body'); if(!tbody) return;
  const sorted=[...rows].sort((a,b)=>(b.measure_date||'').localeCompare(a.measure_date||''));
  if(!sorted.length){tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">데이터가 없습니다</td></tr>`;return;}
  tbody.innerHTML=sorted.map(r=>{
    const j=reamerJudge(r.product_code,r.value);
    const spec=REAMER_SPECS[r.product_code];
    return `<tr>
      <td>${r.measure_date ? (r.measure_date.length>=10 ? r.measure_date.slice(0,10) : r.measure_date+'-01') : '-'}</td>
      <td>${escHtml(r.supplier||'-')}</td>
      <td><b>${escHtml(r.product_code||'-')}</b></td>
      <td style="font-weight:600;text-align:center">${r.value!==null?Number(r.value).toFixed(3):'-'} mm</td>
      <td style="font-size:11px;color:var(--text-muted)">${spec?spec.label:'-'}</td>
      <td>${judgeTag(j)}</td>
      <td style="font-size:12px;color:var(--text-muted)">${escHtml(r.note||'-')}</td>
      <td><button class="btn-del" onclick="deleteReamer('${r.id}')">🗑</button></td>
    </tr>`;
  }).join('');
}
function renderReamer() {
  if (!STATE.reamers) return;
  const rows=getReamerFiltered();
  renderReamerKPI(rows);
  try { renderReamerCharts(rows); } catch(e) { console.error('[리머 차트 오류]', e); }
  renderReamerTable(rows);
}
window.deleteReamer = async function(id){
  if(!confirm('삭제하시겠습니까?')) return;
  try {
    const res=await fetch(`${SB_URL}/rest/v1/incoming_reamers?id=eq.${id}`,{method:'DELETE',headers:SB_HEADERS});
    if(!res.ok) throw new Error(res.status);
    STATE.reamers=STATE.reamers.filter(r=>r.id!==id); renderReamer();
  } catch(e){alert('삭제 실패: '+e.message);}
};
window.submitInspectReamer = async function(){
  const date=$('form-reamer-date').value, supplier=$('form-reamer-supplier').value,
        product=$('form-reamer-product').value, value=$('form-reamer-value').value;
  if(!date||!supplier||!product||!value){alert('측정일, 공급업체, 기종, 측정값은 필수입니다');return;}
  await postRowExt('incoming_reamers',{measure_date:date,supplier,product_code:product,value:+value,note:$('form-reamer-note').value||null},'reamer');
};

// ============ 조도 탭 ============
function getRoughnessFiltered() {
  const supplier=$('inq-rough-supplier')?.value||'';
  const product =$('inq-rough-product')?.value ||'';
  const judge   =$('inq-rough-judge')?.value   ||'';
  const from    =$('inq-rough-from')?.value    ||'';
  const to      =$('inq-rough-to')?.value      ||'';
  return STATE.roughness.filter(r=>{
    if(supplier&&r.supplier!==supplier) return false;
    if(product&&r.product_code!==product) return false;
    if(from&&(!r.measure_date||r.measure_date<from)) return false;
    if(to&&(!r.measure_date||r.measure_date>to)) return false;
    if(judge&&roughnessJudge(r.value)!==judge) return false;
    return true;
  });
}
function renderRoughnessKPI(rows) {
  const total=rows.length, now=new Date().toISOString().slice(0,7);
  const thisMonth=rows.filter(r=>r.measure_date?.slice(0,7)===now).length;
  const ngCount=rows.filter(r=>roughnessJudge(r.value)==='NG').length;
  const okRate=total?Math.round((total-ngCount)/total*100):0;
  const pAvgs=INSP_PRODUCTS.map(p=>{
    const vals=rows.filter(r=>r.product_code===p).map(r=>+r.value).filter(v=>!isNaN(v));
    return{p,a:vals.length?avg(vals):null};
  });
  const el=$('inq-rough-kpi'); if(!el) return;
  // 배치: 총건수|4000G|S-TILT / 합격률|CH4800|ITO-TILT (3열)
  const mkRCard=({p,a})=>{
    const ok=a!==null&&a<=ROUGH_THR;
    return `<div class="kpi-card"><div class="kpi-label">${p} 평균 Ra</div><div class="kpi-value" style="${a===null?'':(ok?'color:var(--accent-emerald)':'color:var(--accent-rose)')}">${a!==null?a.toFixed(3):'-'}</div><div class="kpi-change">기준 ≤ 1.0 μm</div></div>`;
  };
  el.style.gridTemplateColumns='repeat(3, 1fr)';
  el.innerHTML=`
    <div class="kpi-card"><div class="kpi-label">총 측정 건수</div><div class="kpi-value">${total.toLocaleString()}</div><div class="kpi-change">이번 달 ${thisMonth}건</div></div>
    ${mkRCard(pAvgs[0])}
    ${mkRCard(pAvgs[3])}
    <div class="kpi-card"><div class="kpi-label">합격률 <span style="font-size:11px">(≤1.0μm)</span></div><div class="kpi-value" style="color:${okRate>=95?'var(--accent-emerald)':'var(--accent-rose)'}">${okRate}%</div><div class="kpi-change">NG ${ngCount}건</div></div>
    ${mkRCard(pAvgs[1])}
    ${mkRCard(pAvgs[2])}
  `;
}
function renderRoughnessCharts(rows) {
  // 고정 X축: 현재 연도 1~12월
  const yr2 = new Date().getFullYear();
  const monthsFixed2 = Array.from({length:12}, (_,i) => `${yr2}-${String(i+1).padStart(2,'0')}`);
  const monthLabels2 = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const clrs=[SIDIZ_COLORS.blue,SIDIZ_COLORS.cyan,SIDIZ_COLORS.emerald,SIDIZ_COLORS.amber];
  const NPRODS_R = INSP_PRODUCTS.length;

  // 테이블 컬럼 하이라이트 헬퍼 (조도)
  function _hlRoughCol(colIdx) {
    const tbl = document.getElementById('inq-rough-trend-table');
    if (!tbl) return;
    tbl.querySelectorAll('[data-col]').forEach(el => {
      const isHl = colIdx >= 0 && parseInt(el.getAttribute('data-col')) === colIdx;
      el.style.boxShadow = '';
      if (!el.getAttribute('data-ng') && !el.getAttribute('data-spec')) {
        el.style.background = isHl ? 'rgba(230,168,0,0.22)' : '';
      }
    });
  }

  // ① 기종별 월별 조도 추이 — 범례 클릭 기능 포함
  const tCtx=document.getElementById('inq-rough-trend')?.getContext('2d');
  if(tCtx){
    const allRough = STATE.roughness;
    const rProductDatasets = INSP_PRODUCTS.map((p,i)=>({
      label:p,
      data:monthsFixed2.map(m=>{
        const vals=allRough.filter(r=>r.product_code===p&&r.measure_date?.startsWith(m)).map(r=>+r.value).filter(v=>!isNaN(v));
        return vals.length?+avg(vals).toFixed(4):null;
      }),
      borderColor:clrs[i], backgroundColor:clrs[i]+'20', tension:0.3,
      pointRadius:monthsFixed2.map(m=>{const v=allRough.filter(r=>r.product_code===p&&r.measure_date?.startsWith(m)).map(r=>+r.value).filter(v=>!isNaN(v));return v.length?4:0;}),
      pointBackgroundColor:monthsFixed2.map(m=>{const v=allRough.filter(r=>r.product_code===p&&r.measure_date?.startsWith(m)).map(r=>+r.value).filter(v=>!isNaN(v));if(!v.length)return clrs[i];const a=avg(v);return a<=ROUGH_THR?SIDIZ_COLORS.emerald:SIDIZ_COLORS.rose;}),
      pointBorderColor:monthsFixed2.map(m=>{const v=allRough.filter(r=>r.product_code===p&&r.measure_date?.startsWith(m)).map(r=>+r.value).filter(v=>!isNaN(v));if(!v.length)return clrs[i];const a=avg(v);return a<=ROUGH_THR?SIDIZ_COLORS.emerald:SIDIZ_COLORS.rose;}),
      borderWidth:2, pointBorderWidth:2, spanGaps:true, fill:false,
    }));
    const rThreshDataset = {label:'기준 1.0μm',data:monthsFixed2.map(()=>ROUGH_THR),borderColor:SIDIZ_COLORS.rose,borderDash:[6,4],borderWidth:2,pointRadius:0,fill:false,tension:0};
    destroyChart('rough-trend');
    STATE.charts['rough-trend'] = new Chart(tCtx, {
      type:'line',
      data:{labels:monthLabels2, datasets:[...rProductDatasets, rThreshDataset]},
      options:{
        responsive:true, maintainAspectRatio:false,
        interaction:{mode:'index',intersect:false},
        plugins:{
          legend:{
            position:'top', align:'end', labels:{boxWidth:12,font:{size:10}},
            onClick:(e, legendItem, legend)=>{
              const chart=legend.chart;
              const idx=legendItem.datasetIndex;
              if(idx>=NPRODS_R) return;
              const clickedMeta=chart.getDatasetMeta(idx);
              const onlyThis=INSP_PRODUCTS.every((_,i)=>i===idx||chart.getDatasetMeta(i).hidden);
              if(!clickedMeta.hidden && onlyThis){
                INSP_PRODUCTS.forEach((_,i)=>{chart.getDatasetMeta(i).hidden=false;});
              } else {
                INSP_PRODUCTS.forEach((_,i)=>{chart.getDatasetMeta(i).hidden=(i!==idx);});
              }
              chart.update();
              const nowAllVisible=INSP_PRODUCTS.every((_,i)=>!chart.getDatasetMeta(i).hidden);
              _hlRoughCol(nowAllVisible?-1:idx);
            }
          },
          datalabels:{display:false},
          tooltip:{callbacks:{label:(item)=>{
            const v=item.raw;
            if(v===null||v===undefined) return null;
            const dsIdx=item.datasetIndex;
            if(dsIdx===NPRODS_R) return `기준: ${ROUGH_THR} μm`;
            const p=INSP_PRODUCTS[dsIdx];
            if(!p) return null;
            const ok=+v<=ROUGH_THR;
            return `${p}: ${(+v).toFixed(4)} μm → ${ok?'✓ OK':'✗ NG'}`;
          }}}
        },
        scales:{
          x:{grid:{display:false},ticks:{font:{size:9}}},
          y:{min:0,suggestedMax:2.0,grid:{color:SIDIZ_COLORS.border},title:{display:true,text:'μm',font:{size:10}}}
        }
      }
    });
  }
  // 기종별 평균 막대 (2025년 평균 막대 + 기준선 전체 폭)
  const aCtx=document.getElementById('inq-rough-avg')?.getContext('2d');
  if(aCtx){
    const avgs=INSP_PRODUCTS.map(p=>{
      const vals=rows.filter(r=>r.product_code===p).map(r=>+r.value).filter(v=>!isNaN(v));
      return vals.length?+avg(vals).toFixed(4):null;
    });
    const bclrs=avgs.map(v=>(v!==null&&v<=ROUGH_THR)?SIDIZ_COLORS.emerald:SIDIZ_COLORS.rose);
    const roughThreshPlugin = {
      id:'roughThreshLine',
      afterDraw(chart){
        const{ctx:c2,chartArea,scales}=chart;
        if(!chartArea||!scales.y) return;
        const y=scales.y.getPixelForValue(ROUGH_THR);
        if(!isFinite(y)) return;
        c2.save();
        c2.beginPath();
        c2.moveTo(chartArea.left,y);
        c2.lineTo(chartArea.right,y);
        c2.strokeStyle=SIDIZ_COLORS.rose;
        c2.setLineDash([6,4]);
        c2.lineWidth=2;
        c2.stroke();
        c2.setLineDash([]);
        c2.restore();
      }
    };
    destroyChart('rough-avg');
    STATE.charts['rough-avg'] = new Chart(aCtx, {
      type:'bar',
      data:{
        labels:INSP_PRODUCTS,
        datasets:[
          {label:'평균 Ra', data:avgs, backgroundColor:bclrs, borderRadius:4, categoryPercentage:0.90, barPercentage:0.90, order:2},
          {label:'2025년 평균', data:INSP_PRODUCTS.map(p=>ROUGH_2025_AVG[p]??null), backgroundColor:SIDIZ_COLORS.amber+'AA', borderColor:SIDIZ_COLORS.amber, borderWidth:1, borderRadius:4, categoryPercentage:0.90, barPercentage:0.90, order:1},
          {label:'기준 1.0μm', data:[], backgroundColor:'transparent', borderWidth:0},
        ]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        interaction:{mode:'index',intersect:false},
        scales:{
          y:{min:0,suggestedMax:2.0,grid:{color:SIDIZ_COLORS.border},title:{display:true,text:'μm',font:{size:10}}},
          x:{grid:{display:false}}
        },
        plugins:{
          legend:{
            display:true, position:'top', align:'end',
            labels:{
              boxWidth:10, font:{size:10},
              generateLabels:(chart)=>{
                const base=Chart.defaults.plugins.legend.labels.generateLabels(chart);
                const thrItem=base.find(item=>item.text&&item.text.includes('기준'));
                if(thrItem){thrItem.fillStyle='transparent';thrItem.strokeStyle=SIDIZ_COLORS.rose;thrItem.lineDash=[6,4];}
                const avg25=base.find(item=>item.text&&item.text.includes('2025'));
                if(avg25){avg25.fillStyle=SIDIZ_COLORS.amber+'AA';avg25.strokeStyle=SIDIZ_COLORS.amber;}
                return base;
              }
            }
          },
          datalabels:{
            display:(ctx)=>ctx.datasetIndex===0&&ctx.dataset.data[ctx.dataIndex]!==null,
            anchor:'end', align:'top',
            color:SIDIZ_COLORS.text, font:{weight:700,size:11},
            formatter:(v)=>v!=null?Number(v).toFixed(3):null
          },
          tooltip:{callbacks:{label:(item)=>{
            const p=INSP_PRODUCTS[item.dataIndex]; const v=item.raw;
            if(v===null||v===undefined) return null;
            if(item.datasetIndex===0) return `평균 Ra: ${Number(v).toFixed(3)} μm (${v<=ROUGH_THR?'✓ OK':'✗ NG'})`;
            if(item.datasetIndex===1) return `2025년 평균: ${Number(v).toFixed(3)} μm`;
            return null;
          }}}
        }
      },
      plugins:[roughThreshPlugin]
    });
  }
  // 기종별 월별 조도 데이터 표 (추이 카드 하단, 12개월 고정)
  const rTblDiv = document.getElementById('inq-rough-trend-table');
  if(rTblDiv){
    const allR3 = STATE.roughness;
    const rMonthRows = monthsFixed2.map((m, mi) => {
      const cells = INSP_PRODUCTS.map(p => {
        const vals = allR3.filter(r=>r.product_code===p && r.measure_date?.startsWith(m)).map(r=>+r.value).filter(v=>!isNaN(v));
        const v = vals.length ? +avg(vals).toFixed(4) : null;
        const ng = v !== null && v > ROUGH_THR;
        return { v, ng };
      });
      return { label: monthLabels2[mi], cells };
    });
    let rth = `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:4px">`;
    rth += `<thead><tr>`;
    rth += `<th style="padding:4px 8px;text-align:left;background:var(--bg);border-bottom:2px solid var(--border);font-size:10px;color:var(--text-muted)">구분</th>`;
    INSP_PRODUCTS.forEach((p, ci) => {
      rth += `<th data-col="${ci}" style="padding:4px 8px;text-align:center;background:var(--bg);border-bottom:2px solid var(--border);font-size:10px;font-weight:700">${p}</th>`;
    });
    rth += `</tr><tr>`;
    rth += `<td style="padding:3px 8px;font-size:9px;color:var(--text-muted);background:#fafafa">관리기준</td>`;
    INSP_PRODUCTS.forEach((_p, ci) => {
      rth += `<td data-col="${ci}" data-spec="1" style="padding:3px 8px;text-align:center;font-size:9px;color:var(--text-muted);background:#fafafa">≤ 1.0 μm</td>`;
    });
    rth += `</tr></thead><tbody>`;
    rMonthRows.forEach(({label, cells}) => {
      rth += `<tr>`;
      rth += `<td style="padding:4px 8px;font-weight:600;font-size:11px;color:var(--text-secondary);white-space:nowrap;border-bottom:1px solid var(--border)">${label}</td>`;
      cells.forEach(({v, ng}, ci) => {
        const ngAttr = ng ? ' data-ng="1"' : '';
        const bgStyle = ng ? 'background:rgba(255,108,57,0.18);color:var(--accent-rose);' : '';
        rth += `<td data-col="${ci}"${ngAttr} style="padding:4px 8px;text-align:center;${bgStyle}font-weight:${v!==null?600:400};border-bottom:1px solid var(--border)">${v!==null?v.toFixed(4):'-'}</td>`;
      });
      rth += `</tr>`;
    });
    rth += `</tbody></table>`;
    rTblDiv.innerHTML = rth;
  }
  // 판정 분포 — 스택 바 (전체 + 공급업체별)
  const jCtx=document.getElementById('inq-rough-judge-pie')?.getContext('2d');
  if(jCtx){
    const allJ2 = STATE.roughness;
    const calcRJ = (data) => ({
      ok: data.filter(r=>roughnessJudge(r.value)==='OK').length,
      ng: data.filter(r=>roughnessJudge(r.value)==='NG').length,
    });
    const jT2=calcRJ(allJ2), jG2=calcRJ(allJ2.filter(r=>r.supplier==='GCK')), jD2=calcRJ(allJ2.filter(r=>r.supplier==='동진다이캐스팅'));
    const cats2=['전체','GCK','동진다이캐스팅'];
    const okArr2=[jT2.ok,jG2.ok,jD2.ok], ngArr2=[jT2.ng,jG2.ng,jD2.ng];
    const totArr2=cats2.map((_,i)=>okArr2[i]+ngArr2[i]);
    destroyChart('rough-judge-pie');
    STATE.charts['rough-judge-pie'] = new Chart(jCtx, {
      type:'bar',
      data:{
        labels:cats2,
        datasets:[
          {label:'합격 (OK)',data:okArr2,backgroundColor:SIDIZ_COLORS.emerald+'CC',borderColor:SIDIZ_COLORS.emerald,borderWidth:1,borderRadius:4,stack:'s'},
          {label:'불합격 (NG)',data:ngArr2,backgroundColor:SIDIZ_COLORS.rose+'CC',borderColor:SIDIZ_COLORS.rose,borderWidth:1,borderRadius:4,stack:'s'},
        ]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        clip:false,
        layout:{padding:{top:24}},
        interaction:{mode:'index',intersect:false},
        scales:{
          x:{stacked:true,grid:{display:false},ticks:{font:{size:12,weight:600}}},
          y:{stacked:true,beginAtZero:true,grid:{color:SIDIZ_COLORS.border},title:{display:true,text:'건',font:{size:10}}}
        },
        plugins:{
          legend:{display:true,position:'top',align:'end',labels:{boxWidth:10,font:{size:11}}},
          datalabels:{
            display:(ctx)=>ctx.dataset.data[ctx.dataIndex]>0,
            formatter:(v,ctx)=>{const tot=totArr2[ctx.dataIndex];const pct=tot>0?Math.round(v/tot*100):0;return `${v}건\n${pct}%`;},
            anchor:(ctx)=>{if(ctx.datasetIndex===1){const tot=totArr2[ctx.dataIndex];return tot>0&&ctx.dataset.data[ctx.dataIndex]/tot<0.25?'end':'center';}return 'center';},
            align:(ctx)=>{if(ctx.datasetIndex===1){const tot=totArr2[ctx.dataIndex];return tot>0&&ctx.dataset.data[ctx.dataIndex]/tot<0.25?'top':'center';}return 'center';},
            color:(ctx)=>{if(ctx.datasetIndex===1){const tot=totArr2[ctx.dataIndex];return tot>0&&ctx.dataset.data[ctx.dataIndex]/tot<0.25?SIDIZ_COLORS.rose:'#fff';}return '#fff';},
            font:{weight:700,size:11},textAlign:'center',clip:false,
          },
          tooltip:{callbacks:{label:(item)=>{const v=item.raw;const tot=totArr2[item.dataIndex];const pct=tot>0?Math.round(v/tot*100):0;return `${item.dataset.label}: ${v}건 (${pct}%)`;}}}
        }
      }
    });
  }
}
function renderRoughnessTable(rows) {
  const cnt=$('inq-rough-count'); if(cnt) cnt.textContent=rows.length.toLocaleString();
  const tbody=$('inq-rough-table-body'); if(!tbody) return;
  const sorted=[...rows].sort((a,b)=>(b.measure_date||'').localeCompare(a.measure_date||''));
  if(!sorted.length){tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">데이터가 없습니다</td></tr>`;return;}
  tbody.innerHTML=sorted.map(r=>{
    const j=roughnessJudge(r.value);
    return `<tr>
      <td>${r.measure_date ? (r.measure_date.length>=10 ? r.measure_date.slice(0,10) : r.measure_date+'-01') : '-'}</td>
      <td>${escHtml(r.supplier||'-')}</td>
      <td><b>${escHtml(r.product_code||'-')}</b></td>
      <td style="font-weight:600;text-align:center">${r.value!==null?Number(r.value).toFixed(4):'-'} μm</td>
      <td style="font-size:11px;color:var(--text-muted)">≤ 1.0 μm</td>
      <td>${judgeTag(j)}</td>
      <td style="font-size:12px;color:var(--text-muted)">${escHtml(r.note||'-')}</td>
      <td><button class="btn-del" onclick="deleteRoughness('${r.id}')">🗑</button></td>
    </tr>`;
  }).join('');
}
function renderRoughness() {
  if(!STATE.roughness) return;
  const rows=getRoughnessFiltered();
  renderRoughnessKPI(rows);
  try { renderRoughnessCharts(rows); } catch(e) { console.error('[조도 차트 오류]', e); }
  renderRoughnessTable(rows);
}
window.deleteRoughness = async function(id){
  if(!confirm('삭제하시겠습니까?')) return;
  try {
    const res=await fetch(`${SB_URL}/rest/v1/incoming_roughness?id=eq.${id}`,{method:'DELETE',headers:SB_HEADERS});
    if(!res.ok) throw new Error(res.status);
    STATE.roughness=STATE.roughness.filter(r=>r.id!==id); renderRoughness();
  } catch(e){alert('삭제 실패: '+e.message);}
};
window.submitInspectRoughness = async function(){
  const date=$('form-rough-date').value, supplier=$('form-rough-supplier').value,
        product=$('form-rough-product').value, value=$('form-rough-value').value;
  if(!date||!supplier||!product||!value){alert('측정일, 공급업체, 기종, 측정값은 필수입니다');return;}
  await postRowExt('incoming_roughness',{measure_date:date,supplier,product_code:product,value:+value,note:$('form-rough-note').value||null},'roughness');
};

// ============ 색차 탭 ============
function getColorimetryFiltered() {
  const supplier=$('inq-color-supplier')?.value||'';
  const color   =$('inq-color-code')?.value   ||'';
  const judge   =$('inq-color-judge')?.value  ||'';
  const from    =$('inq-color-from')?.value   ||'';
  const to      =$('inq-color-to')?.value     ||'';
  return STATE.colorimetry.filter(r=>{
    if(supplier&&r.supplier!==supplier) return false;
    if(color&&r.color_code!==color) return false;
    if(from&&(!r.measure_date||r.measure_date<from)) return false;
    if(to&&(!r.measure_date||r.measure_date>to)) return false;
    if(judge&&colorJudge(r.delta_e_master,r.delta_e_prev)!==judge) return false;
    return true;
  });
}
function renderColorimetryKPI(rows) {
  const total=rows.length, now=new Date().toISOString().slice(0,7);
  const thisMonth=rows.filter(r=>r.measure_date?.slice(0,7)===now).length;
  const ngCount=rows.filter(r=>colorJudge(r.delta_e_master,r.delta_e_prev)==='NG').length;
  const okRate=total?Math.round((total-ngCount)/total*100):0;
  const mVals=rows.map(r=>+r.delta_e_master).filter(v=>!isNaN(v));
  const pVals=rows.map(r=>+r.delta_e_prev).filter(v=>!isNaN(v));
  const mAvg=mVals.length?avg(mVals):null;
  const pAvg=pVals.length?avg(pVals):null;
  const el=$('inq-color-kpi'); if(!el) return;
  el.innerHTML=`
    <div class="kpi-card"><div class="kpi-label">총 검사 건수</div><div class="kpi-value">${total.toLocaleString()}</div><div class="kpi-change">이번 달 ${thisMonth}건</div></div>
    <div class="kpi-card"><div class="kpi-label">합격률 <span style="font-size:11px">(ΔE≤1.0)</span></div><div class="kpi-value" style="color:${okRate>=95?'var(--accent-emerald)':'var(--accent-rose)'}">${okRate}%</div><div class="kpi-change">NG ${ngCount}건</div></div>
    <div class="kpi-card"><div class="kpi-label">평균 ΔE (마스터)</div><div class="kpi-value" style="${mAvg!==null?(mAvg<=COLOR_THR?'color:var(--accent-emerald)':'color:var(--accent-rose)'):''}">${mAvg!==null?mAvg.toFixed(2):'-'}</div><div class="kpi-change">기준 ≤ 1.0</div></div>
    <div class="kpi-card"><div class="kpi-label">평균 ΔE (전lot)</div><div class="kpi-value" style="${pAvg!==null?(pAvg<=COLOR_THR?'color:var(--accent-emerald)':'color:var(--accent-rose)'):''}">${pAvg!==null?pAvg.toFixed(2):'-'}</div><div class="kpi-change">기준 ≤ 1.0</div></div>
  `;
}
function renderColorimetryCharts(rows) {
  const months=[...new Set(rows.map(r=>r.measure_date?.slice(0,7)).filter(Boolean))].sort();
  // 월별 ΔE 추이
  const tCtx=document.getElementById('inq-color-trend')?.getContext('2d');
  if(tCtx){
    const datasets=[
      {label:'ΔE 마스터 비교',data:months.map(m=>{const v=rows.filter(r=>r.measure_date?.startsWith(m)).map(r=>+r.delta_e_master).filter(v=>!isNaN(v));return v.length?+avg(v).toFixed(2):null;}),borderColor:SIDIZ_COLORS.blue,backgroundColor:SIDIZ_COLORS.blue+'20',tension:0.3,pointRadius:3,borderWidth:2,spanGaps:true},
      {label:'ΔE 전lot 비교',data:months.map(m=>{const v=rows.filter(r=>r.measure_date?.startsWith(m)).map(r=>+r.delta_e_prev).filter(v=>!isNaN(v));return v.length?+avg(v).toFixed(2):null;}),borderColor:SIDIZ_COLORS.cyan,backgroundColor:SIDIZ_COLORS.cyan+'20',tension:0.3,pointRadius:3,borderWidth:2,spanGaps:true},
      {label:'기준 1.0',data:months.map(()=>COLOR_THR),borderColor:SIDIZ_COLORS.rose,borderDash:[6,4],borderWidth:2,pointRadius:0,fill:false},
    ];
    makeLine('color-trend',tCtx,months,datasets,{
      scales:{x:{grid:{display:false},ticks:{font:{size:9}}},y:{min:0,suggestedMax:1.5,grid:{color:SIDIZ_COLORS.border},title:{display:true,text:'ΔE',font:{size:10}}}}
    });
  }
  // 색상별 마스터 ΔE (기준선 전체 폭)
  const sCtx=document.getElementById('inq-color-spec')?.getContext('2d');
  if(sCtx){
    const colors=uniq(rows.map(r=>r.color_code).filter(Boolean)).sort();
    const avgs=colors.map(c=>{const v=rows.filter(r=>r.color_code===c).map(r=>+r.delta_e_master).filter(v=>!isNaN(v));return v.length?+avg(v).toFixed(2):null;});
    const bclrs=avgs.map(v=>(v!==null&&v<=COLOR_THR)?SIDIZ_COLORS.blue:SIDIZ_COLORS.rose);
    const colorThreshPlugin={
      id:'colorThreshLine',
      afterDraw(chart){
        const{ctx:c2,chartArea,scales}=chart;
        if(!chartArea||!scales.y) return;
        const y=scales.y.getPixelForValue(COLOR_THR);
        if(!isFinite(y)) return;
        c2.save();
        c2.beginPath();
        c2.moveTo(chartArea.left,y);
        c2.lineTo(chartArea.right,y);
        c2.strokeStyle=SIDIZ_COLORS.rose;
        c2.setLineDash([6,4]);
        c2.lineWidth=2;
        c2.stroke();
        c2.setLineDash([]);
        c2.restore();
      }
    };
    destroyChart('color-spec');
    STATE.charts['color-spec'] = new Chart(sCtx,{
      type:'bar',
      data:{labels:colors.length?colors:['(없음)'],datasets:[{label:'마스터 ΔE',data:avgs,backgroundColor:bclrs,borderRadius:4}]},
      options:{
        responsive:true, maintainAspectRatio:false,
        interaction:{mode:'index',intersect:false},
        plugins:{
          legend:{display:false},
          datalabels:{display:(ctx)=>ctx.dataset.data[ctx.dataIndex]!==null,anchor:'end',align:'top',color:SIDIZ_COLORS.text,font:{weight:700,size:10},formatter:v=>v!==null?v.toFixed(2):'-'},
          tooltip:{callbacks:{label:(item)=>{const v=item.raw;if(v===null)return null;return `ΔE: ${Number(v).toFixed(2)} (${v<=COLOR_THR?'✓ OK':'✗ NG'})`;}}}
        },
        scales:{
          x:{grid:{display:false},ticks:{font:{size:9},maxRotation:45}},
          y:{min:0,suggestedMax:1.5,grid:{color:SIDIZ_COLORS.border}}
        }
      },
      plugins:[colorThreshPlugin]
    });
  }
  // 공급처별 파이
  const pCtx=document.getElementById('inq-color-supplier-pie')?.getContext('2d');
  if(pCtx){
    const sups=uniq(rows.map(r=>r.supplier).filter(Boolean));
    const counts=sups.map(s=>rows.filter(r=>r.supplier===s).length);
    makeDoughnut('color-supplier-pie',pCtx,sups,counts,PALETTE.slice(0,sups.length));
  }
  // 판정 도넛
  const jCtx=document.getElementById('inq-color-judge-pie')?.getContext('2d');
  if(jCtx){
    const ok=rows.filter(r=>colorJudge(r.delta_e_master,r.delta_e_prev)==='OK').length;
    const ng=rows.filter(r=>colorJudge(r.delta_e_master,r.delta_e_prev)==='NG').length;
    const lb=[],dt=[],cl=[];
    if(ok){lb.push('OK');dt.push(ok);cl.push(SIDIZ_COLORS.emerald);}
    if(ng){lb.push('NG');dt.push(ng);cl.push(SIDIZ_COLORS.rose);}
    if(!ok&&!ng){lb.push('데이터없음');dt.push(1);cl.push(SIDIZ_COLORS.muted);}
    makeDoughnut('color-judge-pie',jCtx,lb,dt,cl);
  }
}
function renderColorimetryTable(rows) {
  const cnt=$('inq-color-count'); if(cnt) cnt.textContent=rows.length.toLocaleString();
  const tbody=$('inq-color-table-body'); if(!tbody) return;
  const sorted=[...rows].sort((a,b)=>(b.measure_date||'').localeCompare(a.measure_date||''));
  if(!sorted.length){tbody.innerHTML=`<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--text-muted)">데이터가 없습니다</td></tr>`;return;}
  tbody.innerHTML=sorted.map(r=>{
    const j=colorJudge(r.delta_e_master,r.delta_e_prev);
    const mNG=+r.delta_e_master>COLOR_THR;
    const pNG=!isNaN(+r.delta_e_prev)&&+r.delta_e_prev>COLOR_THR;
    return `<tr>
      <td>${r.measure_date||'-'}</td>
      <td>${escHtml(r.supplier||'-')}</td>
      <td><b>${escHtml(r.color_code||'-')}</b></td>
      <td>${escHtml(r.lot||'-')}</td>
      <td style="text-align:center">${r.quantity_yd!=null?Number(r.quantity_yd).toLocaleString():'-'} Yd</td>
      <td style="font-weight:600;text-align:center;${mNG?'color:var(--accent-rose)':''}">${r.delta_e_master!=null?Number(r.delta_e_master).toFixed(2):'-'}</td>
      <td style="font-weight:600;text-align:center;${pNG?'color:var(--accent-rose)':''}">${r.delta_e_prev!=null?Number(r.delta_e_prev).toFixed(2):'-'}</td>
      <td>${judgeTag(j)}</td>
      <td style="font-size:12px;color:var(--text-muted);text-align:left">${escHtml(r.note||'-')}</td>
      <td><button class="btn-del" onclick="deleteColorimetry('${r.id}')">🗑</button></td>
    </tr>`;
  }).join('');
}
function renderColorimetry() {
  if(!STATE.colorimetry) return;
  const rows=getColorimetryFiltered();
  renderColorimetryKPI(rows);
  try { renderColorimetryCharts(rows); } catch(e) { console.error('[색차 차트 오류]', e); }
  renderColorimetryTable(rows);
}
window.deleteColorimetry = async function(id){
  if(!confirm('삭제하시겠습니까?')) return;
  try {
    const res=await fetch(`${SB_URL}/rest/v1/incoming_colorimetry?id=eq.${id}`,{method:'DELETE',headers:SB_HEADERS});
    if(!res.ok) throw new Error(res.status);
    STATE.colorimetry=STATE.colorimetry.filter(r=>r.id!==id); renderColorimetry();
  } catch(e){alert('삭제 실패: '+e.message);}
};
window.submitInspectColorimetry = async function(){
  const date=$('form-color-date').value, supplier=$('form-color-supplier').value,
        color=$('form-color-code').value, master=$('form-color-master').value;
  if(!date||!supplier||!color||!master){alert('검사일, 공급처, 색상, ΔE(마스터)는 필수입니다');return;}
  const prev=$('form-color-prev').value, qty=$('form-color-qty').value;
  await postRowExt('incoming_colorimetry',{
    measure_date:date, supplier, color_code:color,
    lot:$('form-color-lot').value||null,
    quantity_yd:qty?+qty:null,
    delta_e_master:+master,
    delta_e_prev:prev?+prev:null,
    note:$('form-color-note').value||null
  },'colorimetry');
};

// ======================================================================
// ============ 보고서 생성 (리머 / 조도 / 색차) ============
// ======================================================================

// 차트 캡처 헬퍼 (canvas id → PNG dataURL)
function _captureInspectChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  try {
    const off = document.createElement('canvas');
    off.width = canvas.width; off.height = canvas.height;
    const ctx = off.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, off.width, off.height);
    ctx.drawImage(canvas, 0, 0);
    return off.toDataURL('image/png');
  } catch(e) { return null; }
}

// 보고서 HTML 다운로드 공통 함수
function _downloadInspectReport(html, filename) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 보고서 결과 항목 → HTML 변환
function _recToHtml(recs) {
  return recs.map(r => {
    const prefix = r.level === 'critical'
      ? '<span style="color:red;font-weight:bold;">[주의]</span> '
      : r.level === 'warning'
      ? '<span style="color:#CC7700;font-weight:bold;">[경고]</span> '
      : '';
    return `<p style="margin: 3px 0 3px 15px; font-size: 10pt;">: ${prefix}${r.text}</p>`;
  }).join('\n');
}

// 보고서용 오프스크린 Chart.js 차트 → PNG dataURL 동기 생성
function _makeReportChartSync(config, width, height) {
  if (!window.Chart) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width || 900;
  canvas.height = height || 280;
  canvas.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden';
  document.body.appendChild(canvas);
  if (!config.options) config.options = {};
  config.options.animation = false;
  config.options.responsive = false;
  if (!config.options.plugins) config.options.plugins = {};
  if (!config.options.plugins.datalabels) config.options.plugins.datalabels = { display: false };
  try {
    const chart = new Chart(canvas, config);
    const off = document.createElement('canvas');
    off.width = canvas.width; off.height = canvas.height;
    const ctx2 = off.getContext('2d');
    ctx2.fillStyle = '#ffffff';
    ctx2.fillRect(0, 0, off.width, off.height);
    ctx2.drawImage(canvas, 0, 0);
    const dataURL = off.toDataURL('image/png');
    chart.destroy();
    document.body.removeChild(canvas);
    return dataURL;
  } catch(e) {
    try { document.body.removeChild(canvas); } catch(_) {}
    return null;
  }
}

// ── 리머 자동 분석 ──────────────────────────────────────
function _getReamerAnalysis(rows) {
  const recs = [];
  const total = rows.length;
  if (!total) { recs.push({ level:'info', text:'측정 데이터가 없습니다.' }); return recs; }

  const ngRows = rows.filter(r => reamerJudge(r.product_code, r.value) === 'NG');
  const okRate = Math.round((total - ngRows.length) / total * 100);

  if (ngRows.length === 0) {
    recs.push({ level:'info', text:`전체 ${total}건 측정 결과 모두 기준 범위 내 — 양호한 치수 관리 상태입니다.` });
  } else {
    recs.push({ level:'warning', text:`전체 ${total}건 중 ${ngRows.length}건 기준 이탈 (합격률 ${okRate}%).` });
    INSP_PRODUCTS.forEach(p => {
      const pNG = rows.filter(r => r.product_code === p && reamerJudge(r.product_code, r.value) === 'NG');
      if (pNG.length > 0) {
        const spec = REAMER_SPECS[p];
        const vals = pNG.map(r => Number(r.value).toFixed(3)).join(', ');
        recs.push({ level:'critical', text:`${p}: ${pNG.length}건 기준 이탈 (기준 ${spec.label}) — 이탈값: ${vals}` });
      }
    });
  }
  INSP_PRODUCTS.forEach(p => {
    const vals = rows.filter(r => r.product_code === p).map(r => +r.value).filter(v => !isNaN(v));
    if (!vals.length) return;
    const avgVal = avg(vals);
    const spec = REAMER_SPECS[p];
    const ok = avgVal >= spec.lo && avgVal <= spec.hi;
    recs.push({ level: ok ? 'info' : 'warning', text:`${p} 평균 ${avgVal.toFixed(3)} mm (기준 ${spec.label}) — ${ok ? '기준 범위 내 정상' : '기준 이탈 확인 필요'}` });
  });
  return recs;
}

// ── 조도 자동 분석 ──────────────────────────────────────
function _getRoughnessAnalysis(rows) {
  const recs = [];
  const total = rows.length;
  if (!total) { recs.push({ level:'info', text:'측정 데이터가 없습니다.' }); return recs; }

  const ngRows = rows.filter(r => roughnessJudge(r.value) === 'NG');
  const okRate = Math.round((total - ngRows.length) / total * 100);

  if (ngRows.length === 0) {
    recs.push({ level:'info', text:`전체 ${total}건 측정 결과 모두 기준 이하 (Ra ≤ 1.0 μm) — 표면 조도 양호.` });
  } else {
    recs.push({ level:'warning', text:`전체 ${total}건 중 ${ngRows.length}건 기준 초과 (합격률 ${okRate}%).` });
    INSP_PRODUCTS.forEach(p => {
      const pNG = rows.filter(r => r.product_code === p && roughnessJudge(r.value) === 'NG');
      if (pNG.length > 0) {
        const vals = pNG.map(r => Number(r.value).toFixed(4)).join(', ');
        recs.push({ level:'critical', text:`${p}: ${pNG.length}건 기준 초과 (기준 ≤ 1.0 μm) — 초과값: ${vals} μm` });
      }
    });
  }
  INSP_PRODUCTS.forEach(p => {
    const vals = rows.filter(r => r.product_code === p).map(r => +r.value).filter(v => !isNaN(v));
    if (!vals.length) return;
    const avgVal = avg(vals);
    const ok = avgVal <= ROUGH_THR;
    recs.push({ level: ok ? 'info' : 'warning', text:`${p} 평균 Ra ${avgVal.toFixed(4)} μm (기준 ≤ 1.0 μm) — ${ok ? '기준 이하 정상' : '기준 초과 — 가공면 점검 권장'}` });
  });
  return recs;
}

// ── 색차 자동 분석 ──────────────────────────────────────
function _getColorimetryAnalysis(rows) {
  const recs = [];
  const total = rows.length;
  if (!total) { recs.push({ level:'info', text:'검사 데이터가 없습니다.' }); return recs; }

  const ngRows = rows.filter(r => colorJudge(r.delta_e_master, r.delta_e_prev) === 'NG');
  const okRate = Math.round((total - ngRows.length) / total * 100);

  if (ngRows.length === 0) {
    recs.push({ level:'info', text:`전체 ${total}건 검사 결과 모두 ΔE ≤ 1.0 — 원단 색차 기준 적합 상태입니다.` });
  } else {
    recs.push({ level:'warning', text:`전체 ${total}건 중 ${ngRows.length}건 기준 초과 (합격률 ${okRate}%).` });
    ngRows.forEach(r => {
      const mNG = +r.delta_e_master > COLOR_THR;
      const pNG = !isNaN(+r.delta_e_prev) && +r.delta_e_prev > COLOR_THR;
      const detail = [mNG ? `마스터 ΔE ${Number(r.delta_e_master).toFixed(2)}` : '', pNG ? `전lot ΔE ${Number(r.delta_e_prev).toFixed(2)}` : ''].filter(Boolean).join(', ');
      recs.push({ level:'critical', text:`${r.measure_date} ${r.supplier||''} ${r.color_code||''} (${r.lot||'-'}) — ${detail} 기준(1.0) 초과.` });
    });
  }
  // 색상별 평균
  const colors = uniq(rows.map(r => r.color_code).filter(Boolean)).sort();
  colors.forEach(c => {
    const cVals = rows.filter(r => r.color_code === c).map(r => +r.delta_e_master).filter(v => !isNaN(v));
    if (!cVals.length) return;
    const avgVal = avg(cVals);
    const ok = avgVal <= COLOR_THR;
    if (!ok) recs.push({ level:'warning', text:`색상 ${c} — 마스터 비교 평균 ΔE ${avgVal.toFixed(2)} (기준 ≤ 1.0) 초과. 색상 관리 주의.` });
  });
  return recs;
}

// ── 볼트 보고서 생성 ────────────────────────────────────
window.generateBoltReport = function () {
  const from     = $('inq-bolt-from')?.value || '';
  const to       = $('inq-bolt-to')?.value   || '';
  const supplier = $('inq-bolt-supplier')?.value || [...new Set(getBoltFiltered().map(r => r.supplier).filter(Boolean))].sort().join(', ') || '전체';
  const code     = $('inq-bolt-code')?.value || '전체';
  const period   = from && to ? `${from} ~ ${to}` : from ? `${from} 이후` : to ? `~ ${to}` : '전체 기간';

  const rows = getBoltFiltered();
  const total = rows.length;
  const allHV = rows.map(boltHV).filter(v => v !== null);
  const meanHV = avg(allHV), stdHV = stdev(allHV);
  const ngCount = rows.filter(r => {
    const hv = boltHV(r);
    return hv !== null && (hv < 250 || hv > 550);
  }).length;

  const recs = [];
  if (!total) { recs.push({ level:'info', text:'측정 데이터가 없습니다.' }); }
  else {
    const highStd = stdHV > 30;
    recs.push({ level: highStd ? 'warning' : 'info', text:`전체 ${total}건, 평균 HV ${fmt(meanHV,1)}, 표준편차 σ ${fmt(stdHV,1)} — ${highStd ? '변동성 높음, 경도 편차 관리 권장.' : '경도 편차 양호.'}` });
    if (ngCount > 0) recs.push({ level:'critical', text:`이상치(HV<250 또는 >550) ${ngCount}건 발견. 해당 LOT 원인 조사 필요.` });
  }
  const recHtml = _recToHtml(recs);
  // 26년 1월부터 월별 누적 HV 추이 (오프스크린 차트 — 필터 무관)
  const _bm = {};
  STATE.bolts.forEach(r => {
    const m = (r.measure_date || '').slice(0, 7);
    if (!m || m < '2026-01') return;
    if (!_bm[m]) _bm[m] = [];
    const hv = boltHV(r);
    if (hv !== null) _bm[m].push(hv);
  });
  const _bmKeys = Object.keys(_bm).sort();
  const _bmLabels = _bmKeys.map(m => parseInt(m.split('-')[1]) + '월');
  const imgTrend = _makeReportChartSync({
    type: 'bar',
    data: { labels: _bmLabels, datasets: [{ label: '월별 평균 HV', data: _bmKeys.map(m => { const v = _bm[m]; return v.length ? +avg(v).toFixed(1) : null; }), backgroundColor: '#002BD2', borderRadius: 6 }] },
    options: { scales: { y: { beginAtZero: false, grid: { color: '#E2E2EA' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false }, datalabels: { display: true, anchor: 'end', align: 'top', color: '#111111', font: { weight: 700, size: 11 }, formatter: v => v != null ? v.toFixed(1) : '-' } } }
  });
  const imgSupplier = _captureInspectChart('inq-bolt-supplier-bar');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>볼트 경도 검사 보고서</title>
</head>
<body style="font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 1.8; color: #000000;">
<p style="font-weight: bold; font-size: 10pt; margin: 20px 0 8px 0;">1. 검사 정보</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">1) 검사 내용 : 볼트 경도 검사 (HV 비커스 / HRC 로크웰)</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">2) 측정 도구 : 경도 측정기 (HV / HRC)</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">3) 검사 일자 : ${period}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">4) 공급업체 : ${supplier}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">5) 자재 코드 : ${code}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">6) 검사 건수 : 총 ${total}건 / 평균 HV ${fmt(meanHV,1)} / 표준편차 σ ${fmt(stdHV,1)}</p>
<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">2. 검사 결과</p>
${recHtml}
<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">3. 검사 결과 그래프</p>
${imgTrend ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">1) 월별 평균 HV 추이</p>
<img src="${imgTrend}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${imgSupplier ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">2) 공급업체별 평균 HV / 표준편차</p>
<img src="${imgSupplier}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
</body>
</html>`;
  _downloadInspectReport(html, '볼트_경도검사_보고서.html');
};

// ── 중심봉 보고서 생성 ────────────────────────────────────
window.generateRodReport = function () {
  const from     = $('inq-rod-from')?.value || '';
  const to       = $('inq-rod-to')?.value   || '';
  const supplier = $('inq-rod-supplier')?.value || [...new Set(getRodFiltered().map(r => r.supplier).filter(Boolean))].sort().join(', ') || '전체';
  const code     = $('inq-rod-code')?.value || '전체';
  const period   = from && to ? `${from} ~ ${to}` : from ? `${from} 이후` : to ? `~ ${to}` : '전체 기간';

  const rows = getRodFiltered();
  const total = rows.length;
  const ngRows = rows.filter(r => rodJudge(r) === 'NG');
  const okRate = total ? Math.round((total - ngRows.length) / total * 100) : 0;

  const recs = [];
  if (!total) { recs.push({ level:'info', text:'측정 데이터가 없습니다.' }); }
  else if (ngRows.length === 0) {
    recs.push({ level:'info', text:`전체 ${total}건 측정 결과 모두 기준 범위 내 (H 5~7 mm, 흔들림 ≤ 1.0 mm) — 양호.` });
  } else {
    recs.push({ level:'warning', text:`전체 ${total}건 중 ${ngRows.length}건 기준 이탈 (합격률 ${okRate}%).` });
    const wobbleNG = ngRows.filter(r => (r.wobble ?? 0) > 1.0);
    const heightNG = ngRows.filter(r => { const h = rodH(r); return h !== null && (h < 5.0 || h > 7.0); });
    if (heightNG.length) recs.push({ level:'critical', text:`높이 기준(5~7 mm) 이탈 ${heightNG.length}건.` });
    if (wobbleNG.length) recs.push({ level:'critical', text:`흔들림 기준(≤ 1.0 mm) 이탈 ${wobbleNG.length}건.` });
  }
  const recHtml = _recToHtml(recs);

  // 1) 월별 평균 테이퍼 높이/와블 추이 (dual-axis, 26년 1월 누적)
  const _rmAll = {};
  STATE.rods.forEach(r => {
    const m = (r.measure_date || '').slice(0, 7);
    if (!m || m < '2026-01') return;
    const h = rodH(r), w = r.wobble;
    if (!_rmAll[m]) _rmAll[m] = { h: [], w: [] };
    if (h !== null) _rmAll[m].h.push(h);
    if (w != null) _rmAll[m].w.push(w);
  });
  const _rmMKeys = Object.keys(_rmAll).sort();
  const _rmMLabels = _rmMKeys.map(m => parseInt(m.split('-')[1]) + '월');
  const imgTrend = _makeReportChartSync({
    type: 'line',
    data: { labels: _rmMLabels, datasets: [
      { label: '테이퍼 높이', data: _rmMKeys.map(m => _rmAll[m].h.length ? +avg(_rmAll[m].h).toFixed(2) : null), yAxisID: 'y', borderColor: '#002BD2', backgroundColor: '#002BD220', tension: 0.3, pointRadius: 3, borderWidth: 2, spanGaps: true, fill: false },
      { label: '높이 상한', data: _rmMKeys.map(() => 7.0), yAxisID: 'y', borderColor: '#FF6C39', borderWidth: 1, borderDash: [5, 4], pointRadius: 0, fill: false },
      { label: '높이 하한', data: _rmMKeys.map(() => 5.0), yAxisID: 'y', borderColor: '#FF6C39', borderWidth: 1, borderDash: [5, 4], pointRadius: 0, fill: false },
      { label: '와블', data: _rmMKeys.map(m => _rmAll[m].w.length ? +avg(_rmAll[m].w).toFixed(2) : null), yAxisID: 'y2', borderColor: '#e6a800', backgroundColor: '#e6a80020', tension: 0.3, pointRadius: 3, borderWidth: 2, spanGaps: true, fill: false },
      { label: '와블 한계', data: _rmMKeys.map(() => 1.0), yAxisID: 'y2', borderColor: '#FF6C39', borderWidth: 1, borderDash: [5, 4], pointRadius: 0, fill: false },
    ]},
    options: {
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { type: 'linear', position: 'left', title: { display: true, text: '높이 (mm)', font: { size: 10 } }, min: 4.5, suggestedMax: 7.5, grid: { color: '#E2E2EA' } },
        y2: { type: 'linear', position: 'right', title: { display: true, text: '와블', font: { size: 10 } }, min: 0, suggestedMax: 1.6, grid: { drawOnChartArea: false } }
      },
      plugins: { legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 10 } } }, datalabels: { display: false } }
    }
  }, 900, 280);

  // 2) 자재별 테이퍼 높이/와블 추이 (필터된 rows 기준 — 해당 기간 자재만)
  const _rCodesList = uniq(rows.map(r => r.code).filter(Boolean)).sort();
  const _rCodeCharts = [];
  for (const rc of _rCodesList) {
    const cRows = rows.filter(r => r.code === rc).sort((a, b) => (a.measure_date || '').localeCompare(b.measure_date || ''));
    if (!cRows.length) continue;
    const dates = uniq(cRows.map(r => r.measure_date)).sort();
    const dateH = dates.map(d => { const vs = cRows.filter(r => r.measure_date === d).map(rodH).filter(v => v !== null); return vs.length ? +avg(vs).toFixed(2) : null; });
    const dateW = dates.map(d => { const vs = cRows.filter(r => r.measure_date === d).map(r => r.wobble).filter(v => v != null); return vs.length ? +avg(vs).toFixed(2) : null; });
    const img = _makeReportChartSync({
      type: 'line',
      data: { labels: dates, datasets: [
        { label: '테이퍼 높이', data: dateH, yAxisID: 'y', borderColor: '#002BD2', backgroundColor: '#002BD220', tension: 0.3, pointRadius: 3, borderWidth: 2, spanGaps: true, fill: false },
        { label: '높이 상한 (7.0)', data: dates.map(() => 7.0), yAxisID: 'y', borderColor: '#FF6C39', borderWidth: 1, borderDash: [5, 4], pointRadius: 0, fill: false },
        { label: '높이 하한 (5.0)', data: dates.map(() => 5.0), yAxisID: 'y', borderColor: '#FF6C39', borderWidth: 1, borderDash: [5, 4], pointRadius: 0, fill: false },
        { label: '와블', data: dateW, yAxisID: 'y2', borderColor: '#e6a800', backgroundColor: '#e6a80020', tension: 0.3, pointRadius: 3, borderWidth: 2, spanGaps: true, fill: false },
        { label: '와블 한계 (1.0)', data: dates.map(() => 1.0), yAxisID: 'y2', borderColor: '#e6a800', borderWidth: 1, borderDash: [5, 4], pointRadius: 0, fill: false },
      ]},
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } } },
          y: { type: 'linear', position: 'left', title: { display: true, text: '높이 (mm)', font: { size: 10 } }, min: 4.5, suggestedMax: 7.5, grid: { color: '#E2E2EA' } },
          y2: { type: 'linear', position: 'right', title: { display: true, text: '와블', font: { size: 10 } }, min: 0, suggestedMax: 1.6, grid: { drawOnChartArea: false } }
        },
        plugins: { legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 10 } } }, datalabels: { display: false } }
      }
    });
    _rCodeCharts.push({ code: rc, img });
  }
  const _rCodeHtml = _rCodeCharts.map(mc => mc.img
    ? `<p style="margin: 3px 0 6px 30px; font-size: 10pt;">  - ${escHtml(mc.code)}</p>\n<img src="${mc.img}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">`
    : '').join('\n');

  // 3) 공급업체별 평균 와블 (기준선 전폭 + y축 1.0 붉은색)
  const _rsups = [...new Set(STATE.rods.map(r => r.supplier).filter(Boolean))].sort();
  const _rWavgs = _rsups.map(s => avg(STATE.rods.filter(r => r.supplier === s).map(r => r.wobble)));
  const imgSupplier = _makeReportChartSync({
    type: 'bar',
    data: { labels: _rsups, datasets: [
      { label: '평균 와블', data: _rWavgs, backgroundColor: ['#002BD2','#54DBC2','#00b87a','#e6a800','#FF6C39','#7c5fe6','#3C7DFF','#94a3b8'].slice(0, _rsups.length), borderRadius: 6 },
    ]},
    options: {
      scales: {
        y: { beginAtZero: true, suggestedMax: 1.5, grid: { color: '#E2E2EA' }, ticks: { color: ctx => ctx.tick.value === 1 ? '#FF6C39' : '#111', font: ctx => ctx.tick.value === 1 ? { weight: 'bold', size: 11 } : { size: 10 } } },
        x: { grid: { display: false } }
      },
      plugins: { legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 10 } } }, datalabels: { display: true, anchor: 'end', align: 'top', color: '#111111', font: { weight: 700, size: 11 }, formatter: v => v == null ? '-' : v.toFixed(2) } }
    },
    plugins: [{
      id: 'refLine',
      afterDraw(chart) {
        const { ctx, chartArea: { left, right }, scales: { y } } = chart;
        const yPos = y.getPixelForValue(1.0);
        ctx.save();
        ctx.strokeStyle = '#FF6C39';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(left, yPos);
        ctx.lineTo(right, yPos);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }]
  });

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>중심봉 치수 검사 보고서</title>
</head>
<body style="font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 1.8; color: #000000;">
<p style="font-weight: bold; font-size: 10pt; margin: 20px 0 8px 0;">1. 검사 정보</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">1) 검사 내용 : 중심봉 치수 검사 (높이 / 흔들림)</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">2) 측정 도구 : 검사 지그</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">3) 검사 일자 : ${period}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">4) 공급업체 : ${supplier}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">5) 자재 코드 : ${code}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">6) 관리 기준 : 높이 5~7 mm / 흔들림 ≤ 1.0 mm</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">7) 검사 건수 : 총 ${total}건 (합격 ${total-ngRows.length}건 / 불합격 ${ngRows.length}건)</p>
<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">2. 검사 결과</p>
${recHtml}
<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">3. 검사 결과 그래프</p>
${imgTrend ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">1) 월별 평균 테이퍼 높이/와블 추이</p>
<img src="${imgTrend}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${_rCodeCharts.length > 0 ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">2) 자재별 테이퍼 높이/와블 추이</p>\n${_rCodeHtml}` : ''}
${imgSupplier ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">3) 공급업체별 평균 와블 (기준 ≤1.0)</p>
<img src="${imgSupplier}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
</body>
</html>`;
  _downloadInspectReport(html, '중심봉_치수검사_보고서.html');
};

// ── 스폰지 보고서 생성 ────────────────────────────────────
window.generateSpongeReport = function () {
  const from   = $('inq-sponge-from')?.value || '';
  const to     = $('inq-sponge-to')?.value   || '';
  const code   = $('inq-sponge-code')?.value || [...new Set(getSpongeFiltered().map(r => r.code).filter(Boolean))].sort().join(', ') || '전체 자재';
  const period = from && to ? `${from} ~ ${to}` : from ? `${from} 이후` : to ? `~ ${to}` : '전체 기간';

  const rows = getSpongeFiltered();
  const total = rows.length;
  const ngRows = rows.filter(r => spongeJudge(r) === 'NG');
  const okRate = total ? Math.round((total - ngRows.length) / total * 100) : 0;

  const recs = [];
  if (!total) { recs.push({ level:'info', text:'측정 데이터가 없습니다.' }); }
  else if (ngRows.length === 0) {
    recs.push({ level:'info', text:`전체 ${total}건 측정 결과 모두 규격 범위 내 (타겟±5) — 양호한 품질 상태입니다.` });
  } else {
    recs.push({ level:'warning', text:`전체 ${total}건 중 ${ngRows.length}건 규격 이탈 (합격률 ${okRate}%).` });
    const codes = uniq(ngRows.map(r => r.code));
    codes.forEach(c => {
      const cNG = ngRows.filter(r => r.code === c);
      recs.push({ level:'critical', text:`${c}: ${cNG.length}건 규격(타겟±5) 이탈. 원재료 및 공정 점검 권장.` });
    });
  }
  const recHtml = _recToHtml(recs);

  // 1) 자재별 월 평균 두께 추이 (26년 1월 누적, 오프스크린, TOP5)
  const _smMonthMap = {};
  STATE.sponges.forEach(r => {
    const m = (r.measure_date || '').slice(0, 7);
    if (!m || m < '2026-01' || !r.code) return;
    const a = spongeAvg(r);
    if (a === null) return;
    if (!_smMonthMap[m]) _smMonthMap[m] = {};
    if (!_smMonthMap[m][r.code]) _smMonthMap[m][r.code] = [];
    _smMonthMap[m][r.code].push(a);
  });
  const _smKeys = Object.keys(_smMonthMap).sort();
  const _smMonthLabels = _smKeys.map(m => parseInt(m.split('-')[1]) + '월');
  const _smCodeCounts = {};
  STATE.sponges.forEach(r => { if (r.code) _smCodeCounts[r.code] = (_smCodeCounts[r.code] || 0) + 1; });
  const _smTopCodes = Object.entries(_smCodeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
  const _smChartLabels = spongeChartLabels(STATE.sponges);
  const imgTrend = _makeReportChartSync({
    type: 'line',
    data: { labels: _smMonthLabels, datasets: _smTopCodes.map((code, i) => ({
      label: _smChartLabels[code] || code,
      data: _smKeys.map(m => { const v = (_smMonthMap[m] && _smMonthMap[m][code]) || []; return v.length ? +avg(v).toFixed(1) : null; }),
      borderColor: PALETTE[i % PALETTE.length], backgroundColor: PALETTE[i % PALETTE.length] + '20',
      tension: 0.3, pointRadius: 3, borderWidth: 2, spanGaps: true, fill: false
    }))},
    options: {
      interaction: { mode: 'index', intersect: false },
      scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { beginAtZero: false, title: { display: true, text: '두께', font: { size: 10 } }, grid: { color: '#E2E2EA' } } },
      plugins: { legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 10 } } }, datalabels: { display: false } }
    }
  });

  // 2) 자재별 일자 기준 최근 6개월 추이 (오프스크린, 기준선 포함)
  const _s6ago = new Date();
  _s6ago.setMonth(_s6ago.getMonth() - 6);
  const _s6MonthCutoff = `${_s6ago.getFullYear()}-${String(_s6ago.getMonth()+1).padStart(2,'0')}-01`;
  const _scodes = uniq(STATE.sponges.map(r => r.code)).sort();
  const _sMaterialCharts = [];
  for (const sc of _scodes) {
    const cRows = STATE.sponges.filter(r => r.code === sc && (r.measure_date || '') >= _s6MonthCutoff).sort((a, b) => (a.measure_date || '').localeCompare(b.measure_date || ''));
    if (!cRows.length) continue;
    const codeName = cRows[0].name || sc;
    const target = cRows[0].spec_target;
    const tol = cRows[0].spec_tol != null ? cRows[0].spec_tol : 5;
    const dates = uniq(cRows.map(r => r.measure_date)).sort();
    const dateData = dates.map(d => {
      const ms = cRows.filter(r => r.measure_date === d).map(spongeAvg).filter(v => v !== null);
      return ms.length ? +avg(ms).toFixed(1) : null;
    });
    const datasets = [
      { label: '측정값', data: dateData, borderColor: '#002BD2', backgroundColor: '#002BD220', tension: 0.3, pointRadius: 3, borderWidth: 2, spanGaps: true }
    ];
    if (target !== null && target !== undefined) {
      datasets.push(
        { label: `목표 ${target}`, data: dates.map(() => target), borderColor: '#00b87a', borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0, fill: false },
        { label: `상한 ${target + tol}`, data: dates.map(() => target + tol), borderColor: '#FF6C39', borderWidth: 1, borderDash: [3, 3], pointRadius: 0, fill: false },
        { label: `하한 ${target - tol}`, data: dates.map(() => target - tol), borderColor: '#FF6C39', borderWidth: 1, borderDash: [3, 3], pointRadius: 0, fill: false }
      );
    }
    const img = _makeReportChartSync({
      type: 'line',
      data: { labels: dates, datasets },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } } },
          y: { beginAtZero: false, title: { display: true, text: '두께', font: { size: 10 } }, grid: { color: '#E2E2EA' } }
        },
        plugins: { legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 10 } } }, datalabels: { display: false } }
      }
    });
    _sMaterialCharts.push({ code: sc, name: codeName, target, tol, img });
  }
  const _sMaterialHtml = _sMaterialCharts.map((mc) => mc.img
    ? `<p style="margin: 3px 0 6px 30px; font-size: 10pt;">  - ${escHtml(mc.name)}${mc.target !== null && mc.target !== undefined ? ` — 기준 ${mc.target}±${mc.tol}` : ''}</p>\n<img src="${mc.img}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">`
    : '').join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>스폰지 두께 검사 보고서</title>
</head>
<body style="font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 1.8; color: #000000;">
<p style="font-weight: bold; font-size: 10pt; margin: 20px 0 8px 0;">1. 검사 정보</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">1) 검사 내용 : 스폰지 두께 검사 (6포인트 측정)</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">2) 측정 도구 : F-TYPE 경도계</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">3) 검사 일자 : ${period}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">4) 자재 코드 : ${code}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">5) 관리 기준 : 규격 타겟 ± 5 mm</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">6) 검사 건수 : 총 ${total}건 (합격 ${total-ngRows.length}건 / 불합격 ${ngRows.length}건)</p>
<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">2. 검사 결과</p>
${recHtml}
<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">3. 검사 결과 그래프</p>
${imgTrend ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">1) 경도 추이 (전체)</p>
<img src="${imgTrend}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${_sMaterialCharts.length > 0 ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">2) 경도 추이(자재별)</p>\n${_sMaterialHtml}` : ''}
</body>
</html>`;
  _downloadInspectReport(html, '스폰지_두께검사_보고서.html');
};

// ── 리머 보고서 생성 ────────────────────────────────────
window.generateReamerReport = function () {
  const rows = getReamerFiltered();
  const from = $('inq-reamer-from')?.value || '';
  const to   = $('inq-reamer-to')?.value   || '';
  const period = from && to ? `${from} ~ ${to}` : from ? `${from} 이후` : to ? `~ ${to}` : '전체 기간';
  const supplier = $('inq-reamer-supplier')?.value || [...new Set(getReamerFiltered().map(r => r.supplier).filter(Boolean))].sort().join(', ') || '전체';
  const product  = $('inq-reamer-product')?.value  || [...new Set(getReamerFiltered().map(r => r.product).filter(Boolean))].sort().join(', ') || '전체 기종';

  const recs = _getReamerAnalysis(rows);
  const recHtml = _recToHtml(recs);

  const imgTrend   = _captureInspectChart('inq-reamer-trend');
  const imgAvg     = _captureInspectChart('inq-reamer-avg');
  const imgSupplier = _captureInspectChart('inq-reamer-supplier');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>리머 치수 측정 보고서</title>
</head>
<body style="font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 1.8; color: #000000;">

<p style="font-weight: bold; font-size: 10pt; margin: 20px 0 8px 0;">1. 측정 정보</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">1) 측정 내용 : 리머 치수 측정 (다이캐스팅 리머 홀 내경)</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">2) 측정 도구 : 버니어캘리퍼스 / 마이크로미터</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">3) 측정 일자 : ${period}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">4) 공급업체 : ${supplier}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">5) 대상 기종 : ${product}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">6) 관리 기준 : 4000G 5.75±0.25 mm / CH4800 2.5~3.0±0.3 mm / ITO-TILT 5.0±0.3 mm / S-TILT 4.75±0.25 mm</p>

<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">2. 측정 결과</p>
${recHtml}

<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">3. 측정 결과 그래프</p>
${imgTrend ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">1) 기종별 월별 치수 추이 (mm)</p>
<img src="${imgTrend}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${imgAvg ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">2) 기종별 평균 치수 vs 기준범위 (${period})</p>
<img src="${imgAvg}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${imgSupplier ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">3) 공급업체별 기종 평균 비교</p>
<img src="${imgSupplier}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}

</body>
</html>`;
  _downloadInspectReport(html, '리머_치수측정_보고서.html');
};

// ── 조도 보고서 생성 ────────────────────────────────────
window.generateRoughnessReport = function () {
  const rows = getRoughnessFiltered();
  const from = $('inq-rough-from')?.value || '';
  const to   = $('inq-rough-to')?.value   || '';
  const period = from && to ? `${from} ~ ${to}` : from ? `${from} 이후` : to ? `~ ${to}` : '전체 기간';
  const supplier = $('inq-rough-supplier')?.value || [...new Set(getRoughnessFiltered().map(r => r.supplier).filter(Boolean))].sort().join(', ') || '전체';
  const product  = $('inq-rough-product')?.value  || [...new Set(getRoughnessFiltered().map(r => r.product).filter(Boolean))].sort().join(', ') || '전체 기종';

  const recs = _getRoughnessAnalysis(rows);
  const recHtml = _recToHtml(recs);

  const imgTrend    = _captureInspectChart('inq-rough-trend');
  const imgAvg      = _captureInspectChart('inq-rough-avg');
  const imgSupplier = _captureInspectChart('inq-rough-supplier');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>표면 조도 측정 보고서</title>
</head>
<body style="font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 1.8; color: #000000;">

<p style="font-weight: bold; font-size: 10pt; margin: 20px 0 8px 0;">1. 측정 정보</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">1) 측정 내용 : 표면 조도 측정 (Ra — 산술평균 조도)</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">2) 측정 도구 : 표면조도 측정기</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">3) 측정 일자 : ${period}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">4) 공급업체 : ${supplier}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">5) 대상 기종 : ${product}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">6) 관리 기준 : Ra ≤ 1.0 μm (전 기종 공통)</p>

<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">2. 측정 결과</p>
${recHtml}

<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">3. 측정 결과 그래프</p>
${imgTrend ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">1) 기종별 월별 조도 추이 (μm, 기준선 1.0)</p>
<img src="${imgTrend}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${imgAvg ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">2) 기종별 평균 Ra vs 기준 1.0 μm (${period})</p>
<img src="${imgAvg}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${imgSupplier ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">3) 공급업체별 기종 평균 Ra 비교</p>
<img src="${imgSupplier}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}

</body>
</html>`;
  _downloadInspectReport(html, '조도_표면조도측정_보고서.html');
};

// ── 색차 보고서 생성 ────────────────────────────────────
window.generateColorimetryReport = function () {
  const rows = getColorimetryFiltered();
  const from = $('inq-color-from')?.value || '';
  const to   = $('inq-color-to')?.value   || '';
  const period = from && to ? `${from} ~ ${to}` : from ? `${from} 이후` : to ? `~ ${to}` : '전체 기간';
  const supplier  = $('inq-color-supplier')?.value || [...new Set(getColorimetryFiltered().map(r => r.supplier).filter(Boolean))].sort().join(', ') || '전체';
  const colorCode = $('inq-color-code')?.value     || [...new Set(getColorimetryFiltered().map(r => r.color_code).filter(Boolean))].sort().join(', ') || '전체 색상';

  const recs = _getColorimetryAnalysis(rows);
  const recHtml = _recToHtml(recs);

  // 검사 건수 요약
  const total = rows.length;
  const ngCount = rows.filter(r => colorJudge(r.delta_e_master, r.delta_e_prev) === 'NG').length;
  const mVals = rows.map(r => +r.delta_e_master).filter(v => !isNaN(v));
  const mAvg = mVals.length ? avg(mVals).toFixed(2) : '-';

  const imgTrend   = _captureInspectChart('inq-color-trend');
  const imgSpec    = _captureInspectChart('inq-color-spec');
  const imgJudge   = _captureInspectChart('inq-color-judge-pie');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>원단 색차 검사 보고서</title>
</head>
<body style="font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 1.8; color: #000000;">

<p style="font-weight: bold; font-size: 10pt; margin: 20px 0 8px 0;">1. 검사 정보</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">1) 검사 내용 : 원단 색차 검사 (마스터 비교 및 전lot 비교)</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">2) 측정 도구 : 색차계 (ΔE CIE 기준)</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">3) 검사 일자 : ${period}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">4) 공급처 : ${supplier}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">5) 색상 : ${colorCode}</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">6) 관리 기준 : ΔE ≤ 1.0 (마스터 비교 및 전lot 비교 모두 적용)</p>
<p style="margin: 3px 0 3px 15px; font-size: 10pt;">7) 검사 건수 : 총 ${total}건 (합격 ${total - ngCount}건 / 불합격 ${ngCount}건) / 평균 ΔE ${mAvg}</p>

<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">2. 검사 결과</p>
${recHtml}

<p style="font-weight: bold; font-size: 10pt; margin: 25px 0 8px 0;">3. 검사 결과 그래프</p>
${imgTrend ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">1) 월별 ΔE 추이 (마스터 / 전lot 비교, 기준선 1.0)</p>
<img src="${imgTrend}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${imgSpec ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">2) 색상별 평균 ΔE (마스터 비교, ${period})</p>
<img src="${imgSpec}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}
${imgJudge ? `<p style="margin: 3px 0 6px 15px; font-size: 10pt;">3) 판정 분포 (기준 적합 / 초과)</p>
<img src="${imgJudge}" style="width:100%;margin:4px 0 20px 0;display:block;border:1px solid #ccc;">` : ''}

</body>
</html>`;
  _downloadInspectReport(html, '색차_원단검사_보고서.html');
};

// ===== 공통 postRowExt (신규 3개 탭용) =====
async function postRowExt(table, data, kind) {
  try {
    const res=await fetch(`${SB_URL}/rest/v1/${table}`,{
      method:'POST', headers:{...SB_HEADERS,'Prefer':'return=representation'}, body:JSON.stringify(data),
    });
    if(!res.ok){const txt=await res.text();throw new Error(`${res.status}: ${txt}`);}
    alert('✅ 저장되었습니다');
    document.querySelectorAll(`#inq-form-${kind} input:not([type="date"])`).forEach(i=>i.value='');
    document.querySelectorAll(`#inq-form-${kind} select`).forEach(s=>{if(!s.id.includes('supplier')&&!s.id.includes('product')) s.selectedIndex=0;});
    STATE.loaded=false;
    await loadIncomingData();
    refreshDatalists();
    if(kind==='reamer') renderReamer();
    else if(kind==='roughness') renderRoughness();
    else if(kind==='colorimetry') renderColorimetry();
  } catch(e){console.error(e);alert('❌ 저장 실패: '+e.message);}
}

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
    ['inq-reamer-supplier','inq-reamer-product','inq-reamer-judge','inq-reamer-from','inq-reamer-to'].forEach(id => {
      const el=$(id); if(el) el.addEventListener('input', renderReamer);
    });
    ['inq-rough-supplier','inq-rough-product','inq-rough-judge','inq-rough-from','inq-rough-to'].forEach(id => {
      const el=$(id); if(el) el.addEventListener('input', renderRoughness);
    });
    ['inq-color-supplier','inq-color-code','inq-color-judge','inq-color-from','inq-color-to'].forEach(id => {
      const el=$(id); if(el) el.addEventListener('input', renderColorimetry);
    });
    STATE.bound = true;
  }
  refreshDatalists();
  bindFormAutocomplete();
  switchInspectTab(STATE.currentTab);
};

// ===== 인수검사 일보 =====
STATE.dailyLog = { date: null };
STATE.dlPeriodData = null;
STATE.dlCompanyFilter = null;

const DL_FIELDS = [
  { label: '입고수량계', tk: 'inbound_today', ak: 'inbound_accum', id: 'inbound' },
  { label: '검사수량계', tk: 'inspect_today', ak: 'inspect_accum', id: 'inspect' },
  { label: '불량수량계', tk: 'defect_today',  ak: 'defect_accum',  id: 'defect'  },
  { label: '반품수량계', tk: 'return_today',  ak: 'return_accum',  id: 'ret'     },
  { label: '특채수량계', tk: 'special_today', ak: 'special_accum', id: 'special' },
  { label: '합격수량계', tk: 'pass_today',    ak: 'pass_accum',    id: 'pass'    },
];

async function _dlGet(table, date) {
  var orderParam = (table === 'daily_log_summary') ? '' : '&order=no.asc';
  const res = await fetch(SB_URL + '/rest/v1/' + table + '?log_date=eq.' + date + orderParam, { headers: SB_HEADERS });
  return res.ok ? res.json() : [];
}

window.dlLoadDate = async function () {
  const d = $('dl-date-input')?.value;
  if (!d) { alert('날짜를 선택해주세요.'); return; }
  STATE.dailyLog.date = d;
  const el = $('dl-editor');
  if (el) el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">⏳ 불러오는 중...</div>';
  const [sumArr, details, notes] = await Promise.all([
    _dlGet('daily_log_summary', d),
    _dlGet('daily_log_details', d),
    _dlGet('daily_log_notes', d),
  ]);
  _dlRender(d, sumArr[0] || {}, details, notes);
};

STATE._dlDr = 0;
STATE._dlNr = 0;

function _inp(val, extra, type) {
  if (extra === undefined) extra = '';
  if (type === undefined) type = 'text';
  const v = escHtml(val != null ? val : '');
  return '<input type="' + type + '" value="' + v + '" style="width:100%;padding:5px 7px;background:var(--sidiz-dark2);color:var(--text-primary);border:1px solid var(--border);border-radius:5px;font-size:12px;box-sizing:border-box;' + extra + '">';
}
function _inpList(val, listId, extra) {
  if (!extra) extra = '';
  const v = escHtml(val != null ? val : '');
  return '<input list="' + listId + '" value="' + v + '" autocomplete="off" style="width:100%;padding:5px 7px;background:var(--sidiz-dark2);color:var(--text-primary);border:1px solid var(--border);border-radius:5px;font-size:12px;box-sizing:border-box;' + extra + '">';
}

function _dlDetailRow(no, d) {
  if (!d) d = {};
  const id = ++STATE._dlDr;
  const td = 'padding:4px 5px;border-bottom:1px solid var(--border)';
  return '<tr id="dldr-' + id + '">'
    + '<td style="' + td + ';text-align:center;color:var(--text-muted);font-size:11px;width:34px">' + no + '</td>'
    + '<td style="' + td + '">' + _inp(d.company) + '</td>'
    + '<td style="' + td + '">' + _inp(d.code, 'font-family:monospace;font-size:11px') + '</td>'
    + '<td style="' + td + '">' + _inp(d.name) + '</td>'
    + '<td style="' + td + '">' + _inp(d.judge, 'text-align:center;max-width:70px') + '</td>'
    + '<td style="' + td + '">' + _inp(d.inbound, 'text-align:right;max-width:65px', 'number') + '</td>'
    + '<td style="' + td + '">' + _inp(d.return_qty, 'text-align:right;max-width:65px', 'number') + '</td>'
    + '<td style="' + td + '">' + _inp(d.pass_qty, 'text-align:right;max-width:65px', 'number') + '</td>'
    + '<td style="' + td + ';min-width:90px">' + _inpList(d.inspector, 'dl-inspector-list') + '</td>'
    + '<td style="' + td + ';min-width:220px">' + _inp(d.defect_info, 'min-width:220px') + '</td>'
    + '<td style="' + td + '">' + _inp(d.action) + '</td>'
    + '<td style="' + td + ';text-align:center;width:30px"><button onclick="dlRemRow(\'dldr-' + id + '\')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px">✕</button></td>'
    + '</tr>';
}

function _dlNoteRow(no, n) {
  if (!n) n = {};
  const id = ++STATE._dlNr;
  const td = 'padding:4px 5px;border-bottom:1px solid var(--border)';
  return '<tr id="dlnr-' + id + '">'
    + '<td style="' + td + ';text-align:center;color:var(--text-muted);font-size:11px;width:34px">' + no + '</td>'
    + '<td style="' + td + '">' + _inp(n.type, 'max-width:90px') + '</td>'
    + '<td style="' + td + '">' + _inp(n.product) + '</td>'
    + '<td style="' + td + '">' + _inp(n.content, 'min-width:180px') + '</td>'
    + '<td style="' + td + '">' + _inp(n.supplier, 'max-width:80px') + '</td>'
    + '<td style="' + td + '">' + _inp(n.note_date, 'max-width:90px') + '</td>'
    + '<td style="' + td + '">' + _inp(n.note) + '</td>'
    + '<td style="' + td + ';text-align:center;width:30px"><button onclick="dlRemRow(\'dlnr-' + id + '\')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px">✕</button></td>'
    + '</tr>';
}

function _dlRender(date, sum, details, notes) {
  const el = $('dl-editor');
  if (!el) return;
  const th = 'padding:8px 10px;background:var(--sidiz-dark2);color:var(--text-muted);font-size:11px;font-weight:600;text-align:center;white-space:nowrap;border-bottom:1px solid var(--border)';
  const td = 'padding:6px 8px;border-bottom:1px solid var(--border)';

  const inpStyle = 'width:100%;padding:5px 7px;background:var(--sidiz-dark2);color:var(--text-primary);border:1px solid var(--border);border-radius:5px;font-size:12px;text-align:right;box-sizing:border-box';

  let section1 = '<div style="background:var(--sidiz-card);border:1px solid var(--border);border-radius:12px;padding:18px 20px;margin-bottom:16px">'
    + '<div style="font-size:13px;font-weight:700;margin-bottom:14px">1. 인수검사현황'
    + '<span style="font-size:11px;color:var(--text-muted);font-weight:400;margin-left:8px">기준일 ' + date + '</span></div>'
    + '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%"><thead><tr>'
    + '<th style="' + th + ';text-align:left;min-width:70px">구분</th>'
    + DL_FIELDS.map(function(f) { return '<th style="' + th + '">' + f.label + '</th>'; }).join('')
    + '</tr></thead><tbody><tr>'
    + '<td style="' + td + ';font-weight:600;font-size:12px">Today</td>'
    + DL_FIELDS.map(function(f) { return '<td style="' + td + '"><input type="number" id="dlt-' + f.id + '" value="' + (sum[f.tk] || 0) + '" min="0" style="' + inpStyle + '"></td>'; }).join('')
    + '</tr></tbody></table></div></div>';

  let detailBody = details.length === 0
    ? '<tr id="dl-detail-empty"><td colspan="14" style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px">불합격 내역이 없습니다. + 행 추가로 입력하세요.</td></tr>'
    : details.map(function(d, i) { return _dlDetailRow(i + 1, d); }).join('');

  let section2 = '<div style="background:var(--sidiz-card);border:1px solid var(--border);border-radius:12px;padding:18px 20px;margin-bottom:16px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
    + '<div style="font-size:13px;font-weight:700">2. 검사내역 <span style="font-size:11px;color:var(--text-muted);font-weight:400">(불합격 내용 기재)</span></div>'
    + '<button onclick="dlAddDetail()" style="padding:5px 14px;background:var(--sidiz-blue);color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600">+ 행 추가</button>'
    + '</div>'
    + '<datalist id="dl-inspector-list"><option value="김철우"><option value="이광원"></datalist>'
    + '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;min-width:780px"><thead><tr>'
    + ['NO','업체명','자재코드','자재명','판정','입고','반품','합격','검사자','불합격정보(내용)','처리',''].map(function(h) { return '<th style="' + th + '">' + h + '</th>'; }).join('')
    + '</tr></thead><tbody id="dl-detail-body">' + detailBody + '</tbody></table></div></div>';

  let notesBody = notes.length === 0
    ? '<tr id="dl-notes-empty"><td colspan="8" style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px">특이사항이 없습니다. + 행 추가로 입력하세요.</td></tr>'
    : notes.map(function(n, i) { return _dlNoteRow(i + 1, n); }).join('');

  let section3 = '<div style="background:var(--sidiz-card);border:1px solid var(--border);border-radius:12px;padding:18px 20px;margin-bottom:16px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
    + '<div style="font-size:13px;font-weight:700">3. 특이사항 <span style="font-size:11px;color:var(--text-muted);font-weight:400">(업체 협의, 4M, 입고품변경 등)</span></div>'
    + '<button onclick="dlAddNote()" style="padding:5px 14px;background:var(--sidiz-blue);color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600">+ 행 추가</button>'
    + '</div><div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;min-width:680px"><thead><tr>'
    + ['NO','구분','제품','내용','공급처','날짜','비고',''].map(function(h) { return '<th style="' + th + '">' + h + '</th>'; }).join('')
    + '</tr></thead><tbody id="dl-notes-body">' + notesBody + '</tbody></table></div></div>';

  const uploadBar = '<div style="display:flex;justify-content:flex-start;margin-bottom:14px">'
    + '<label style="cursor:pointer;padding:7px 16px;background:var(--sidiz-dark2);color:var(--text-primary);border:1px solid var(--border);border-radius:8px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:6px">'
    + '📁 엑셀 업로드 <span style="font-size:11px;color:var(--text-muted);font-weight:400">(인수검사현황 + 검사내역)</span>'
    + '<input type="file" accept=".xlsx,.xls" onchange="dlUploadExcel(this)" style="display:none"></label>'
    + '</div>';

  const saveBtn = '<div style="display:flex;justify-content:flex-end;margin-top:4px">'
    + '<button onclick="dlSave()" style="padding:10px 32px;background:var(--sidiz-blue);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">💾 저장</button></div>';

  el.innerHTML = uploadBar + section1 + section2 + section3 + saveBtn;
}

window.dlAddDetail = function () {
  const tbody = $('dl-detail-body');
  if (!tbody) return;
  $('dl-detail-empty') && $('dl-detail-empty').remove();
  const cnt = tbody.querySelectorAll('tr').length + 1;
  tbody.insertAdjacentHTML('beforeend', _dlDetailRow(cnt));
};

window.dlAddNote = function () {
  const tbody = $('dl-notes-body');
  if (!tbody) return;
  $('dl-notes-empty') && $('dl-notes-empty').remove();
  const cnt = tbody.querySelectorAll('tr').length + 1;
  tbody.insertAdjacentHTML('beforeend', _dlNoteRow(cnt));
};

window.dlRemRow = function (id) { document.getElementById(id) && document.getElementById(id).remove(); };

window.dlSave = async function () {
  const date = STATE.dailyLog.date;
  if (!date) return;

  const getN = function(id) { const el = document.getElementById(id); return el ? (Number(el.value) || 0) : 0; };
  const summaryData = { log_date: date };
  DL_FIELDS.forEach(function(f) {
    summaryData[f.tk] = getN('dlt-' + f.id);
  });

  const detailRows = [];
  document.querySelectorAll('#dl-detail-body tr:not(#dl-detail-empty)').forEach(function(tr, i) {
    const inp = Array.from(tr.querySelectorAll('input'));
    if (inp.length < 6) return;
    const v = function(j) { return inp[j] ? inp[j].value.trim() : ''; };
    const nv = function(j) { return inp[j] ? (Number(inp[j].value) || 0) : 0; };
    if (!v(0) && !v(1) && !v(2)) return;
    detailRows.push({ log_date: date, no: i + 1, company: v(0), code: v(1), name: v(2), judge: v(3), inbound: nv(4), return_qty: nv(5), pass_qty: nv(6), inspector: v(7), defect_info: v(8), action: v(9) });
  });

  const noteRows = [];
  document.querySelectorAll('#dl-notes-body tr:not(#dl-notes-empty)').forEach(function(tr, i) {
    const inp = Array.from(tr.querySelectorAll('input'));
    if (inp.length < 6) return;
    const v = function(j) { return inp[j] ? inp[j].value.trim() : ''; };
    if (!v(0) && !v(1) && !v(2)) return;
    noteRows.push({ log_date: date, no: i + 1, type: v(0), product: v(1), content: v(2), supplier: v(3), note_date: v(4), note: v(5) });
  });

  try {
    const up = Object.assign({}, SB_HEADERS, { 'Prefer': 'resolution=merge-duplicates,return=minimal' });
    const rp = Object.assign({}, SB_HEADERS, { 'Prefer': 'return=minimal' });

    const r1 = await fetch(SB_URL + '/rest/v1/daily_log_summary?on_conflict=log_date', { method: 'POST', headers: up, body: JSON.stringify(summaryData) });
    if (!r1.ok) { const err = await r1.text(); alert('저장 오류(요약): ' + err); return; }

    const r2 = await fetch(SB_URL + '/rest/v1/daily_log_details?log_date=eq.' + date, { method: 'DELETE', headers: SB_HEADERS });
    if (!r2.ok) { const err = await r2.text(); alert('저장 오류(내역삭제): ' + err); return; }

    if (detailRows.length) {
      const r3 = await fetch(SB_URL + '/rest/v1/daily_log_details', { method: 'POST', headers: rp, body: JSON.stringify(detailRows) });
      if (!r3.ok) { const err = await r3.text(); alert('저장 오류(내역): ' + err); return; }
    }

    const r4 = await fetch(SB_URL + '/rest/v1/daily_log_notes?log_date=eq.' + date, { method: 'DELETE', headers: SB_HEADERS });
    if (!r4.ok) { const err = await r4.text(); alert('저장 오류(특이사항삭제): ' + err); return; }

    if (noteRows.length) {
      const r5 = await fetch(SB_URL + '/rest/v1/daily_log_notes', { method: 'POST', headers: rp, body: JSON.stringify(noteRows) });
      if (!r5.ok) { const err = await r5.text(); alert('저장 오류(특이사항): ' + err); return; }
    }

    alert('저장되었습니다.');
    dlCloseWrite();
    if ($('dl-from-input') && $('dl-from-input').value) { dlLoadPeriod(); }
  } catch (e) {
    alert('저장 오류: ' + e.message);
  }
};

window.dlLoadPeriod = async function () {
  var from = $('dl-from-input') ? $('dl-from-input').value : '';
  var to = $('dl-to-input') ? $('dl-to-input').value : '';
  if (!from || !to) { alert('기간을 선택해주세요.'); return; }
  if (from > to) { alert('시작일이 종료일보다 클 수 없습니다.'); return; }
  var kpiEl = $('dl-kpi');
  if (kpiEl) kpiEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">⏳ 불러오는 중...</div>';
  var fromDate = from, toDate = to;
  var year = from.substring(0, 4);
  var yearFrom = year + '-01-01', yearTo = year + '-12-31';
  var results = await Promise.all([
    fetch(SB_URL + '/rest/v1/daily_log_summary?log_date=gte.' + fromDate + '&log_date=lte.' + toDate + '&order=log_date.asc', { headers: SB_HEADERS }).then(function(r) { return r.ok ? r.json() : []; }),
    fetch(SB_URL + '/rest/v1/daily_log_details?log_date=gte.' + fromDate + '&log_date=lte.' + toDate + '&order=log_date.asc,no.asc', { headers: SB_HEADERS }).then(function(r) { return r.ok ? r.json() : []; }),
    fetch(SB_URL + '/rest/v1/daily_log_notes?log_date=gte.' + fromDate + '&log_date=lte.' + toDate + '&order=log_date.asc,no.asc', { headers: SB_HEADERS }).then(function(r) { return r.ok ? r.json() : []; }),
    fetch(SB_URL + '/rest/v1/daily_log_summary?log_date=gte.' + yearFrom + '&log_date=lte.' + yearTo + '&order=log_date.asc', { headers: SB_HEADERS }).then(function(r) { return r.ok ? r.json() : []; }),
  ]);
  STATE.dlPeriodData = { from: from, to: to, year: year, summaries: results[0], details: results[1], notes: results[2], yearSummaries: results[3] };
  STATE.dlCompanyFilter = null;
  _dlRenderAll();
};

function _dlRenderAll() {
  var d = STATE.dlPeriodData;
  if (!d) return;
  _dlRenderKPI(d.from, d.to, d.summaries);
  _dlRenderCompanyFilter(d.details);
  _dlRenderCharts(d.summaries, d.details, d.year, d.yearSummaries);
  _dlRenderNotesSection(d.notes);
}

function _dlRenderKPI(from, to, summaries) {
  var el = $('dl-kpi');
  if (!el) return;
  var total = { inbound_today: 0, inspect_today: 0, defect_today: 0, return_today: 0, special_today: 0, pass_today: 0 };
  summaries.forEach(function(s) { Object.keys(total).forEach(function(k) { total[k] += (s[k] || 0); }); });
  var defRate = total.inspect_today > 0 ? (total.defect_today / total.inspect_today * 100).toFixed(2) : '0.00';
  var periodLabel = from === to ? from : from + ' ~ ' + to;
  var cardDefs = [
    { label: '입고수량', val: total.inbound_today, color: null },
    { label: '검사수량', val: total.inspect_today, color: null },
    { label: '불량수량', val: total.defect_today, color: total.defect_today > 0 ? '#e53935' : null },
    { label: '반품수량', val: total.return_today, color: null },
    { label: '특채수량', val: total.special_today, color: null },
    { label: '합격수량', val: total.pass_today, color: '#1e88e5' },
  ];
  var card = function(def) {
    return '<div style="background:var(--sidiz-card);border:1px solid var(--border);border-radius:12px;padding:18px 20px">'
      + '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">' + def.label + '</div>'
      + '<div style="font-size:28px;font-weight:700;color:' + (def.color || 'var(--text-primary)') + '">' + Number(def.val).toLocaleString() + '</div>'
      + '<div style="font-size:11px;color:var(--text-muted);margin-top:6px">' + periodLabel + '</div>'
      + '</div>';
  };
  el.innerHTML = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:8px">'
    + cardDefs.map(card).join('') + '</div>'
    + (summaries.length ? '<div style="font-size:11px;color:var(--text-muted);text-align:right;margin-top:2px">불량율: <b style="color:' + (parseFloat(defRate) > 1 ? '#e53935' : '#43a047') + '">' + defRate + '%</b> &nbsp;|&nbsp; ' + summaries.length + '일 기록</div>' : '');
}

function _dlRenderCompanyFilter(details) {
  var sel = $('dl-company-select');
  if (!sel) return;
  var companies = [], seen = {};
  details.forEach(function(d) { if (d.company && !seen[d.company]) { seen[d.company] = 1; companies.push(d.company); } });
  companies.sort();
  var cur = STATE.dlCompanyFilter;
  sel.innerHTML = '<option value="">전체</option>'
    + companies.map(function(c) {
        return '<option value="' + escHtml(c) + '"' + (cur === c ? ' selected' : '') + '>' + escHtml(c) + '</option>';
      }).join('');
  if (cur) sel.value = cur;
}

window.dlSetCompany = function(company) {
  STATE.dlCompanyFilter = company || null;
  var sel = $('dl-company-select');
  if (sel) sel.value = company || '';
  var d = STATE.dlPeriodData;
  if (!d) return;
  _dlRenderCharts(d.summaries, d.details, d.year, d.yearSummaries);
};

function _dlRenderCharts(summaries, details, year, yearSummaries) {
  var el = $('dl-charts');
  if (!el) return;
  var chartCard = function(id, title) {
    return '<div style="background:var(--sidiz-card);border:1px solid var(--border);border-radius:12px;padding:16px 20px">'
      + '<div style="font-size:12px;font-weight:700;margin-bottom:10px">' + title + '</div>'
      + '<div style="position:relative;height:260px"><canvas id="' + id + '"></canvas></div></div>';
  };
  el.innerHTML = '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">'
    + chartCard('dl-chart-daily', '일 불합격 발생율')
    + chartCard('dl-chart-monthly', year + '년 월별 불량률 현황')
    + chartCard('dl-chart-deftype', '부적합 발생유형')
    + chartCard('dl-chart-company', '업체별 불합격 발생현황')
    + '</div>';

  function _mkDlChart(id, cfg) {
    if (STATE.charts && STATE.charts[id]) { try { STATE.charts[id].destroy(); } catch(e) {} delete STATE.charts[id]; }
    var cv = document.getElementById(id);
    if (!cv) return;
    if (!STATE.charts) STATE.charts = {};
    STATE.charts[id] = new Chart(cv, cfg);
  }

  var COLORS = ['#1e88e5','#43a047','#fb8c00','#e53935','#8e24aa','#00acc1','#f4511e','#039be5','#7cb342','#d81b60','#546e7a','#795548','#00838f','#558b2f','#ad1457'];

  if (summaries.length) {
    var dLabels = summaries.map(function(s) { return s.log_date.substring(5); });
    var dRates = summaries.map(function(s) { return (s.inspect_today || 0) > 0 ? parseFloat((s.defect_today / s.inspect_today * 100).toFixed(2)) : 0; });
    _mkDlChart('dl-chart-daily', {
      type: 'bar',
      data: { labels: dLabels, datasets: [{ label: '불량율(%)', data: dRates, backgroundColor: 'rgba(229,57,53,0.7)', barPercentage: 0.6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', formatter: function(v) { return v.toFixed(2) + '%'; }, font: { size: 8 }, color: 'var(--text-muted)' } }, scales: { x: { ticks: { color: 'var(--text-muted)', font: { size: 9 } } }, y: { min: 0, ticks: { color: 'var(--text-muted)', font: { size: 9 } } } } }
    });
  }

  var monthlyMap = {};
  yearSummaries.forEach(function(s) {
    var m = s.log_date.substring(0, 7);
    if (!monthlyMap[m]) monthlyMap[m] = { inspect: 0, defect: 0 };
    monthlyMap[m].inspect += (s.inspect_today || 0);
    monthlyMap[m].defect += (s.defect_today || 0);
  });
  var mLabels = [];
  for (var mi = 1; mi <= 12; mi++) mLabels.push(mi + '월');
  var mRates = mLabels.map(function(lbl, i) {
    var key = year + '-' + String(i + 1).padStart(2, '0');
    var m = monthlyMap[key];
    return (m && m.inspect > 0) ? parseFloat((m.defect / m.inspect * 100).toFixed(3)) : null;
  });
  _mkDlChart('dl-chart-monthly', {
    type: 'line',
    data: {
      labels: mLabels,
      datasets: [
        { label: '불량율(%)', data: mRates, borderColor: '#1e88e5', backgroundColor: 'rgba(30,136,229,0.08)', tension: 0.3, fill: true, pointRadius: 4, spanGaps: false,
          datalabels: { display: function(ctx) { return ctx.raw !== null; }, anchor: 'top', align: 'top', formatter: function(v) { return v !== null ? v.toFixed(2) + '%' : ''; }, font: { size: 8 }, color: '#1e88e5' } },
        { label: '기준선(0.02%)', data: Array(12).fill(0.02), borderColor: 'rgba(229,57,53,0.4)', borderDash: [4,3], borderWidth: 1.5, pointRadius: 0, fill: false, datalabels: { display: false } }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: 'var(--text-primary)', font: { size: 10 }, boxWidth: 12 } } }, scales: { x: { ticks: { color: 'var(--text-muted)', font: { size: 9 } } }, y: { min: 0, ticks: { color: 'var(--text-muted)', font: { size: 9 } } } } }
  });

  var fDetails = STATE.dlCompanyFilter ? details.filter(function(d) { return d.company === STATE.dlCompanyFilter; }) : details;

  var defTypeMap = {};
  fDetails.forEach(function(d) { if (d.defect_info && d.judge !== '합격') defTypeMap[d.defect_info] = (defTypeMap[d.defect_info] || 0) + 1; });
  var dtLabels = Object.keys(defTypeMap).sort(function(a,b){return defTypeMap[b]-defTypeMap[a];});
  var dtData = dtLabels.map(function(k){return defTypeMap[k];});
  if (dtLabels.length) {
    _mkDlChart('dl-chart-deftype', {
      type: 'bar',
      data: { labels: dtLabels, datasets: [{ label: '건수', data: dtData, backgroundColor: COLORS.slice(0, dtLabels.length), barPercentage: 0.6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', formatter: function(v){return v;}, font: { size: 8 }, color: 'var(--text-muted)' } }, scales: { x: { ticks: { color: 'var(--text-muted)', font: { size: 9 }, maxRotation: 30 } }, y: { min: 0, ticks: { color: 'var(--text-muted)', font: { size: 9 } } } } }
    });
  }

  var companyMap = {};
  fDetails.forEach(function(d) { if (d.company && d.judge !== '합격') companyMap[d.company] = (companyMap[d.company] || 0) + 1; });
  var cLabels = Object.keys(companyMap).sort(function(a,b){return companyMap[b]-companyMap[a];}).slice(0, 15);
  var cData = cLabels.map(function(k){return companyMap[k];});
  if (cLabels.length) {
    _mkDlChart('dl-chart-company', {
      type: 'bar',
      data: { labels: cLabels, datasets: [{ label: '불합격 건수', data: cData, backgroundColor: COLORS, barPercentage: 0.6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', formatter: function(v){return v;}, font: { size: 8 }, color: 'var(--text-muted)' } }, scales: { x: { ticks: { color: 'var(--text-muted)', font: { size: 9 }, maxRotation: 35 } }, y: { min: 0, ticks: { color: 'var(--text-muted)', font: { size: 9 } } } } }
    });
  }
}

function _dlRenderNotesSection(notes) {
  var el = $('dl-notes-section');
  if (!el) return;
  var th = 'padding:8px 10px;background:var(--sidiz-dark2);color:var(--text-muted);font-size:11px;font-weight:600;text-align:center;border-bottom:1px solid var(--border);white-space:nowrap';
  var td = 'padding:6px 8px;font-size:12px;border-bottom:1px solid var(--border)';
  var tdC = td + ';text-align:center';
  var rows = notes.map(function(n) {
    return '<tr>'
      + '<td style="' + tdC + ';white-space:nowrap">' + (n.log_date ? n.log_date.substring(5) : '') + '</td>'
      + '<td style="' + tdC + '">' + (n.no || '') + '</td>'
      + '<td style="' + tdC + '">' + escHtml(n.type || '') + '</td>'
      + '<td style="' + td + '">' + escHtml(n.product || '') + '</td>'
      + '<td style="' + td + ';min-width:180px">' + escHtml(String(n.content || '')).replace(/\n/g,'<br>') + '</td>'
      + '<td style="' + tdC + '">' + escHtml(n.supplier || '') + '</td>'
      + '<td style="' + tdC + '">' + escHtml(n.note_date || '') + '</td>'
      + '<td style="' + td + '">' + escHtml(n.note || '') + '</td>'
      + '</tr>';
  }).join('');
  el.innerHTML = '<div style="background:var(--sidiz-card);border:1px solid var(--border);border-radius:12px;padding:16px 20px">'
    + '<div style="font-size:13px;font-weight:700;margin-bottom:12px">특이사항 <span style="font-size:11px;color:var(--text-muted);font-weight:400">(업체 협의, 4M, 입고품변경 등)</span></div>'
    + (notes.length === 0
      ? '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px">특이사항이 없습니다.</div>'
      : '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%"><thead><tr>'
        + ['날짜','NO','구분','제품','내용','공급처','일자','비고'].map(function(h){return '<th style="'+th+'">'+h+'</th>';}).join('')
        + '</tr></thead><tbody>' + rows + '</tbody></table></div>')
    + '</div>';
}

window.dlOpenWrite = function() {
  if ($('dl-write-overlay')) return;
  var today = new Date().toISOString().substring(0, 10);
  var overlay = document.createElement('div');
  overlay.id = 'dl-write-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.addEventListener('click', function(e) { if (e.target === overlay) dlCloseWrite(); });
  overlay.innerHTML = '<div style="background:var(--sidiz-card);border-radius:16px;padding:24px 28px;width:94%;max-width:1000px;max-height:88vh;overflow-y:auto;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3)">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">'
    + '<div style="font-size:15px;font-weight:700">✏️ 인수검사 일보 작성 / 조회</div>'
    + '<button onclick="dlCloseWrite()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:22px;line-height:1;padding:2px 8px;border-radius:6px" title="닫기">✕</button>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:18px">'
    + '<label style="font-size:12px;color:var(--text-muted);white-space:nowrap">작성일</label>'
    + '<input type="date" id="dl-date-input" class="date-input" value="' + today + '">'
    + '<button onclick="dlLoadDate()" style="padding:7px 16px;background:var(--sidiz-blue);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">조회 / 작성</button>'
    + '</div>'
    + '<div id="dl-editor"></div>'
    + '</div>';
  document.body.appendChild(overlay);
};

window.dlCloseWrite = function() {
  var overlay = $('dl-write-overlay');
  if (overlay) overlay.remove();
};

window.dlUploadExcel = function(input) {
  const file = input.files[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') { alert('엑셀 라이브러리가 아직 로딩 중입니다. 잠시 후 다시 시도해주세요.'); input.value = ''; return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array', codepage: 949 });
      let summarySheet = null, detailSheet = null;
      wb.SheetNames.forEach(function(name) {
        const n = name.toLowerCase();
        if (!summarySheet && (n.includes('현황') || n.includes('summary'))) { summarySheet = wb.Sheets[name]; }
        else if (!detailSheet && (n.includes('내역') || n.includes('detail'))) { detailSheet = wb.Sheets[name]; }
      });
      if (!summarySheet && wb.SheetNames.length >= 1) summarySheet = wb.Sheets[wb.SheetNames[0]];
      if (!detailSheet && wb.SheetNames.length >= 2) detailSheet = wb.Sheets[wb.SheetNames[1]];

      // 컬럼 매핑 (ERP 컬럼명 포함)
      const sColMap = {
        inbound: ['입고수량','입고','입하수량','입하'],
        inspect: ['검사수량','검사'],
        defect:  ['불량수량','불량','부적합수량'],
        ret:     ['반품수량','반품'],
        special: ['특채수량','특채'],
        pass:    ['합격수량','합격'],
      };
      const dColMap = {
        company:     ['업체명','업체','공급업체','거래처명','거래처'],
        code:        ['자재코드','코드','품번','자재번호'],
        name:        ['자재명','품명','자재'],
        judge:       ['판정','합불','결과','검사결과','합격여부'],
        inbound:     ['입고수량','입고','수량','입하수량','입하'],
        return_qty:  ['반품수량','반품'],
        pass_qty:    ['합격수량','합격'],
        inspector:   ['검사자','담당자','검사원'],
        defect_info: ['불합격정보','불량내용','부적합내용','불합격내용','내용','부적합'],
        action:      ['처리','처리내용','조치','조치내용'],
      };

      function mapDetail(row) {
        var d = {};
        Object.keys(dColMap).forEach(function(field) {
          var keys = dColMap[field];
          for(var ki=0;ki<keys.length;ki++){
            if(row[keys[ki]]!==undefined && row[keys[ki]]!==''){d[field]=String(row[keys[ki]]);break;}
          }
        });
        return d;
      }

      let summaryFilled = false, detailFilled = false;
      var failRows = [];
      const allRows = XLSX.utils.sheet_to_json(summarySheet, { defval: '', raw: true });

      // ERP 포맷 감지: 거래처명·합격여부·입하수량 컬럼 존재 여부
      const firstRow = allRows[0] || {};
      const isERP = firstRow['거래처명'] !== undefined || firstRow['합격여부'] !== undefined || firstRow['입하수량'] !== undefined;

      if (isERP) {
        // ── ERP 1시트 형식 ──

        // 인수검사현황: TOTAL 행(번호·거래처명이 모두 빈, 마지막 숫자 행)의 값 직접 사용
        var totalRow = null;
        for (var ti = allRows.length - 1; ti >= 0; ti--) {
          var tr2 = allRows[ti];
          if (!String(tr2['번호']||'').trim() && !String(tr2['거래처명']||'').trim() && Number(tr2['입하수량']||0) > 0) {
            totalRow = tr2; break;
          }
        }
        if (totalRow) {
          var erp2f = { inbound:'입하수량', inspect:'검사수량', defect:'불량수량', ret:'반품수량', special:'특채수량', pass:'합격수량' };
          DL_FIELDS.forEach(function(f) {
            var col = erp2f[f.id];
            if (col) { var el=$('dlt-'+f.id); if(el){el.value=Number(totalRow[col]||0);summaryFilled=true;} }
          });
        }

        // 검사내역: 거래처명 있는 실제 데이터 행 중 불합격만
        var dataRows = allRows.filter(function(row) {
          return String(row['거래처명']||'').trim() !== '';
        });
        failRows = dataRows.filter(function(row) {
          var judge = String(row['합격여부']||row['판정']||'').trim();
          return judge !== '합격' && judge !== '';
        });
        var tbody = $('dl-detail-body');
        if (tbody) {
          tbody.innerHTML = '';
          STATE._dlDr = 0;
          var cnt = 0;
          failRows.forEach(function(row) {
            var d = mapDetail(row);
            if (d.company || d.name || d.code) {
              tbody.insertAdjacentHTML('beforeend', _dlDetailRow(++cnt, d));
              detailFilled = true;
            }
          });
          if (!detailFilled) tbody.innerHTML = '<tr id="dl-detail-empty"><td colspan="12" style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px">불합격 내역이 없습니다.</td></tr>';
        }
      } else {
        // ── 표준 2시트 형식 ──
        if (allRows.length > 0) {
          var row0 = allRows[0];
          DL_FIELDS.forEach(function(f) {
            var keys = sColMap[f.id] || [];
            for(var i=0;i<keys.length;i++){
              if(row0[keys[i]]!==undefined){
                var el=$('dlt-'+f.id);
                if(el){el.value=Number(row0[keys[i]])||0;summaryFilled=true;}
                break;
              }
            }
          });
        }
        if (detailSheet) {
          var dRows = XLSX.utils.sheet_to_json(detailSheet, { defval: '', raw: true });
          var tbody2 = $('dl-detail-body');
          if (tbody2 && dRows.length > 0) {
            tbody2.innerHTML = '';
            STATE._dlDr = 0;
            var cnt2 = 0;
            dRows.forEach(function(row) {
              var d = mapDetail(row);
              if (d.company || d.name || d.code) {
                tbody2.insertAdjacentHTML('beforeend', _dlDetailRow(++cnt2, d));
                detailFilled = true;
              }
            });
            if (!detailFilled) tbody2.innerHTML = '<tr id="dl-detail-empty"><td colspan="12" style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px">불합격 내역이 없습니다. + 행 추가로 입력하세요.</td></tr>';
          }
        }
      }

      var msg = '엑셀 업로드 완료' + (isERP ? ' (ERP 포맷 인식)' : '') + '\n';
      if (summaryFilled) msg += '✅ 인수검사현황: ' + (isERP ? '합계 자동 계산' : '데이터 입력됨') + '\n';
      if (detailFilled) msg += '✅ 검사내역: ' + (isERP ? failRows.length + '건 (불합격) / 전체 ' + allRows.length + '건' : '데이터 입력됨') + '\n';
      if (!summaryFilled && !detailFilled) msg += '⚠️ 매칭되는 컬럼을 찾지 못했습니다.\n컬럼명을 확인해주세요.';
      alert(msg);
    } catch(err) { alert('파일 파싱 오류: ' + err.message); }
    input.value = '';
  };
  reader.readAsArrayBuffer(file);
};

function renderDailyLog() {
  var today = new Date().toISOString().substring(0, 10);
  var firstDay = today.substring(0, 7) + '-01';
  var fi = $('dl-from-input'), ti = $('dl-to-input');
  if (fi && !fi.value) fi.value = firstDay;
  if (ti && !ti.value) ti.value = today;
  dlLoadPeriod();
}

window.dlGenerateReport = async function () {
  const fromM = $('dl-from-input') ? $('dl-from-input').value : '';
  const toM = $('dl-to-input') ? $('dl-to-input').value : '';
  if (!fromM || !toM) { alert('기간을 선택해주세요.'); return; }
  const from = fromM, to = toM;

  const results = await Promise.all([
    fetch(SB_URL + '/rest/v1/daily_log_summary?log_date=gte.' + from + '&log_date=lte.' + to + '&order=log_date.asc', { headers: SB_HEADERS }).then(function(r) { return r.json(); }),
    fetch(SB_URL + '/rest/v1/daily_log_notes?log_date=gte.' + from + '&log_date=lte.' + to + '&order=log_date.asc,no.asc', { headers: SB_HEADERS }).then(function(r) { return r.json(); }),
    fetch(SB_URL + '/rest/v1/daily_log_details?log_date=gte.' + from + '&log_date=lte.' + to + '&order=log_date.asc,no.asc', { headers: SB_HEADERS }).then(function(r) { return r.json(); }),
  ]);
  const summaries = results[0], allNotes = results[1], allDetails = results[2];
  if (!summaries.length) { alert('해당 월의 데이터가 없습니다.'); return; }

  const N = function(v) { return Number(v || 0).toLocaleString(); };
  const last = summaries[summaries.length - 1];
  const thS = 'border:1px solid #ccc;padding:6px 10px;background:#f0f0f0;font-size:10pt;white-space:nowrap';
  const tdR = 'border:1px solid #ccc;padding:6px 10px;text-align:right';
  const tdC = 'border:1px solid #ccc;padding:6px 10px;text-align:center';

  const sRows = summaries.map(function(s) {
    return '<tr>'
      + '<td style="' + tdC + '">' + s.log_date.substring(5) + '</td>'
      + '<td style="' + tdR + '">' + N(s.inbound_today) + '</td>'
      + '<td style="' + tdR + '">' + N(s.inspect_today) + '</td>'
      + '<td style="' + tdR + (s.defect_today > 0 ? ';color:red' : '') + '">' + N(s.defect_today) + '</td>'
      + '<td style="' + tdR + '">' + N(s.return_today) + '</td>'
      + '<td style="' + tdR + '">' + N(s.special_today) + '</td>'
      + '<td style="' + tdR + ';color:navy">' + N(s.pass_today) + '</td>'
      + '</tr>';
  }).join('');

  const nRows = allNotes.map(function(n) {
    return '<tr>'
      + '<td style="' + tdC + ';white-space:nowrap">' + n.log_date.substring(5) + '</td>'
      + '<td style="' + tdC + '">' + (n.no || '') + '</td>'
      + '<td style="border:1px solid #ccc;padding:6px 10px;white-space:nowrap">' + (n.type || '') + '</td>'
      + '<td style="border:1px solid #ccc;padding:6px 10px">' + (n.product || '') + '</td>'
      + '<td style="border:1px solid #ccc;padding:6px 10px">' + String(n.content || '').replace(/\n/g, '<br>') + '</td>'
      + '<td style="border:1px solid #ccc;padding:6px 10px;white-space:nowrap">' + (n.supplier || '') + '</td>'
      + '<td style="border:1px solid #ccc;padding:6px 10px;white-space:nowrap">' + (n.note_date || '') + '</td>'
      + '<td style="border:1px solid #ccc;padding:6px 10px">' + String(n.note || '').replace(/\n/g, '<br>') + '</td>'
      + '</tr>';
  }).join('');

  const thCols = ['날짜','입고수량','검사수량','불량수량','반품수량','특채수량','합격수량'].map(function(t) { return '<th style="' + thS + '">' + t + '</th>'; }).join('');
  const thNotes = ['날짜','번호','구분','제품','내용','공급처','날짜','비고'].map(function(t) { return '<th style="' + thS + '">' + t + '</th>'; }).join('');

  const defRate = (last.inspect_accum || 0) > 0 ? (((last.defect_accum || 0) / last.inspect_accum) * 100).toFixed(2) : '0.00';

  const defTypeMap = {};
  allDetails.forEach(function(d) { if (d.defect_info) defTypeMap[d.defect_info] = (defTypeMap[d.defect_info] || 0) + 1; });
  const dtRows = Object.keys(defTypeMap).sort(function(a,b){return defTypeMap[b]-defTypeMap[a];}).map(function(k, i) {
    return '<tr><td style="' + tdC + '">' + (i+1) + '</td><td style="border:1px solid #ccc;padding:6px 10px">' + k + '</td><td style="' + tdR + '">' + defTypeMap[k] + '건</td></tr>';
  }).join('');

  const companyMap = {};
  allDetails.forEach(function(d) { if (d.company && d.judge !== '합격') companyMap[d.company] = (companyMap[d.company] || 0) + 1; });
  const compRows = Object.keys(companyMap).sort(function(a,b){return companyMap[b]-companyMap[a];}).map(function(k, i) {
    return '<tr><td style="' + tdC + '">' + (i+1) + '</td><td style="border:1px solid #ccc;padding:6px 10px">' + k + '</td><td style="' + tdR + '">' + companyMap[k] + '건</td></tr>';
  }).join('');

  const kpiBoxStyle = 'display:inline-block;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;padding:10px 20px;margin:4px;text-align:center;min-width:110px';

  const periodTitle = from + (from !== to ? ' ~ ' + to : '');
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    + '<title>' + periodTitle + ' 인수검사 현황 보고서</title>'
    + '<style>body{font-family:\'맑은 고딕\',\'Malgun Gothic\',sans-serif;font-size:10pt;color:#000;max-width:1200px;margin:0 auto;padding:24px}'
    + 'h2{text-align:center;font-size:14pt;margin-bottom:6px}.sub{text-align:center;color:#666;margin-bottom:28px}'
    + 'h3{font-size:11pt;margin:28px 0 10px}table{width:100%;border-collapse:collapse}'
    + '@media print{@page{margin:15mm}}</style></head><body>'
    + '<h2>인수검사 현황 보고서</h2>'
    + '<p class="sub">' + periodTitle + ' &nbsp;|&nbsp; ' + summaries.length + '일 기록 &nbsp;|&nbsp; 작성일: ' + new Date().toLocaleDateString('ko-KR') + '</p>'
    + '<div style="text-align:center;margin-bottom:20px">'
    + '<span style="' + kpiBoxStyle + '"><div style="font-size:8pt;color:#666">월 누적 입고</div><div style="font-size:14pt;font-weight:bold">' + N(last.inbound_accum) + '</div></span>'
    + '<span style="' + kpiBoxStyle + '"><div style="font-size:8pt;color:#666">월 누적 검사</div><div style="font-size:14pt;font-weight:bold">' + N(last.inspect_accum) + '</div></span>'
    + '<span style="' + kpiBoxStyle + '"><div style="font-size:8pt;color:#666">월 누적 불량</div><div style="font-size:14pt;font-weight:bold;color:' + (last.defect_accum > 0 ? 'red' : '#000') + '">' + N(last.defect_accum) + '</div></span>'
    + '<span style="' + kpiBoxStyle + '"><div style="font-size:8pt;color:#666">불량율</div><div style="font-size:14pt;font-weight:bold;color:' + (parseFloat(defRate) > 1 ? 'red' : 'green') + '">' + defRate + '%</div></span>'
    + '<span style="' + kpiBoxStyle + '"><div style="font-size:8pt;color:#666">월 누적 합격</div><div style="font-size:14pt;font-weight:bold;color:navy">' + N(last.pass_accum) + '</div></span>'
    + '</div>'
    + '<h3>1. 월간 인수검사 현황</h3>'
    + '<table><thead><tr>' + thCols + '</tr></thead><tbody>' + sRows
    + '<tr style="font-weight:bold;background:#f9f9f9">'
    + '<td style="' + tdC + '">월 누적</td>'
    + '<td style="' + tdR + '">' + N(last.inbound_accum) + '</td>'
    + '<td style="' + tdR + '">' + N(last.inspect_accum) + '</td>'
    + '<td style="' + tdR + (last.defect_accum > 0 ? ';color:red' : '') + '">' + N(last.defect_accum) + '</td>'
    + '<td style="' + tdR + '">' + N(last.return_accum) + '</td>'
    + '<td style="' + tdR + '">' + N(last.special_accum) + '</td>'
    + '<td style="' + tdR + ';color:navy">' + N(last.pass_accum) + '</td>'
    + '</tr></tbody></table>'
    + '<h3>2. 부적합 유형 현황</h3>'
    + (dtRows ? '<table style="max-width:400px"><thead><tr><th style="' + thS + ';width:40px">순위</th><th style="' + thS + '">부적합 유형</th><th style="' + thS + '">건수</th></tr></thead><tbody>' + dtRows + '</tbody></table>' : '<p>부적합 내역이 없습니다.</p>')
    + '<h3>3. 업체별 불합격 현황</h3>'
    + (compRows ? '<table style="max-width:400px"><thead><tr><th style="' + thS + ';width:40px">순위</th><th style="' + thS + '">업체명</th><th style="' + thS + '">건수</th></tr></thead><tbody>' + compRows + '</tbody></table>' : '<p>불합격 내역이 없습니다.</p>')
    + '<h3>4. 특이사항 종합</h3>'
    + (allNotes.length === 0 ? '<p>특이사항이 없습니다.</p>' : '<table><thead><tr>' + thNotes + '</tr></thead><tbody>' + nRows + '</tbody></table>')
    + '</body></html>';

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); setTimeout(function() { w.print(); }, 600); }
};

})();
