/* incoming-data.js — 인수검사 (볼트/중심봉/스폰지) Supabase 연동 + 차트 + 입력 + 리포트 */
(function () {
'use strict';

// ===== 전역 상태 =====
const STATE = {
  bolts: [], rods: [], sponges: [], reamers: [], roughness: [], colorimetry: [],
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
    // 리포트 진입 시 현재 카테고리 유지 (기본: 볼트)
    switchReportCat(STATE.reportCat || 'bolt');
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
  const el = $('inq-reamer-kpi'); if (!el) return;
  el.innerHTML = `
    <div class="kpi-card"><div class="kpi-label">총 측정 건수</div><div class="kpi-value">${total.toLocaleString()}</div><div class="kpi-change">이번 달 ${thisMonth}건</div></div>
    <div class="kpi-card"><div class="kpi-label">합격률</div><div class="kpi-value" style="color:${okRate>=95?'var(--accent-emerald)':'var(--accent-rose)'}">${okRate}%</div><div class="kpi-change">NG ${ngCount}건</div></div>
    ${pAvgs.map(({p,a})=>{
      const s=REAMER_SPECS[p]; const ok=a!==null&&a>=s.lo&&a<=s.hi;
      return `<div class="kpi-card"><div class="kpi-label">${p} 평균</div><div class="kpi-value" style="${a===null?'':(ok?'color:var(--accent-emerald)':'color:var(--accent-rose)')}">${a!==null?a.toFixed(3):'-'}</div><div class="kpi-change">기준 ${s.label}</div></div>`;
    }).join('')}
  `;
}
function renderReamerCharts(rows) {
  const months = [...new Set(rows.map(r=>r.measure_date?.slice(0,7)).filter(Boolean))].sort();
  const clrs = [SIDIZ_COLORS.blue, SIDIZ_COLORS.cyan, SIDIZ_COLORS.emerald, SIDIZ_COLORS.amber];
  // 월별 추이
  const tCtx = document.getElementById('inq-reamer-trend')?.getContext('2d');
  if (tCtx) {
    const datasets = INSP_PRODUCTS.map((p,i)=>({
      label: p,
      data: months.map(m=>{
        const vals=rows.filter(r=>r.product_code===p&&r.measure_date?.startsWith(m)).map(r=>+r.value).filter(v=>!isNaN(v));
        return vals.length ? +avg(vals).toFixed(3) : null;
      }),
      borderColor:clrs[i], backgroundColor:clrs[i]+'20', tension:0.3, pointRadius:3, borderWidth:2, spanGaps:true,
    }));
    makeLine('reamer-trend', tCtx, months, datasets, {
      scales:{
        x:{grid:{display:false},ticks:{font:{size:9}}},
        y:{min:2,max:7,grid:{color:SIDIZ_COLORS.border},title:{display:true,text:'mm',font:{size:10}}}
      }
    });
  }
  // 기종별 평균 (가로 막대)
  const aCtx = document.getElementById('inq-reamer-avg')?.getContext('2d');
  if (aCtx) {
    const avgs = INSP_PRODUCTS.map(p=>{
      const vals=rows.filter(r=>r.product_code===p).map(r=>+r.value).filter(v=>!isNaN(v));
      return vals.length?+avg(vals).toFixed(3):null;
    });
    const bclrs = INSP_PRODUCTS.map((p,i)=>{const s=REAMER_SPECS[p];return(avgs[i]!==null&&avgs[i]>=s.lo&&avgs[i]<=s.hi)?SIDIZ_COLORS.emerald:SIDIZ_COLORS.rose;});
    makeBar('reamer-avg', aCtx, INSP_PRODUCTS, [{label:'평균값',data:avgs,backgroundColor:bclrs,borderRadius:6}], {
      indexAxis:'y',
      scales:{
        x:{min:2,max:7,grid:{color:SIDIZ_COLORS.border},title:{display:true,text:'mm',font:{size:10}}},
        y:{grid:{display:false}}
      },
      plugins:{legend:{display:false},datalabels:{display:true,anchor:'end',align:'right',color:SIDIZ_COLORS.text,font:{weight:700,size:11},formatter:v=>v!==null?v.toFixed(3):'-'}}
    });
  }
  // 공급업체별 비교
  const sCtx = document.getElementById('inq-reamer-supplier')?.getContext('2d');
  if (sCtx) {
    const sups = uniq(rows.map(r=>r.supplier).filter(Boolean)).sort();
    const datasets = INSP_PRODUCTS.map((p,i)=>({
      label:p,
      data:sups.map(s=>{
        const vals=rows.filter(r=>r.supplier===s&&r.product_code===p).map(r=>+r.value).filter(v=>!isNaN(v));
        return vals.length?+avg(vals).toFixed(3):null;
      }),
      backgroundColor:clrs[i], borderRadius:4,
    }));
    makeBar('reamer-supplier', sCtx, sups.length?sups:['(데이터없음)'], datasets, {
      plugins:{legend:{display:true,position:'top',align:'end',labels:{boxWidth:10,font:{size:10}}},datalabels:{display:false}},
      scales:{x:{grid:{display:false}},y:{min:2,max:7,grid:{color:SIDIZ_COLORS.border}}}
    });
  }
  // 판정 도넛
  const jCtx = document.getElementById('inq-reamer-judge')?.getContext('2d');
  if (jCtx) {
    const ok=rows.filter(r=>reamerJudge(r.product_code,r.value)==='OK').length;
    const ng=rows.filter(r=>reamerJudge(r.product_code,r.value)==='NG').length;
    const lb=[],dt=[],cl=[];
    if(ok){lb.push('OK');dt.push(ok);cl.push(SIDIZ_COLORS.emerald);}
    if(ng){lb.push('NG');dt.push(ng);cl.push(SIDIZ_COLORS.rose);}
    if(!ok&&!ng){lb.push('데이터없음');dt.push(1);cl.push(SIDIZ_COLORS.muted);}
    makeDoughnut('reamer-judge', jCtx, lb, dt, cl);
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
      <td>${r.measure_date||'-'}</td>
      <td>${escHtml(r.supplier||'-')}</td>
      <td><b>${escHtml(r.product_code||'-')}</b></td>
      <td style="font-weight:600;text-align:right">${r.value!==null?Number(r.value).toFixed(3):'-'} mm</td>
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
  renderReamerKPI(rows); renderReamerCharts(rows); renderReamerTable(rows);
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
  el.innerHTML=`
    <div class="kpi-card"><div class="kpi-label">총 측정 건수</div><div class="kpi-value">${total.toLocaleString()}</div><div class="kpi-change">이번 달 ${thisMonth}건</div></div>
    <div class="kpi-card"><div class="kpi-label">합격률 <span style="font-size:11px">(≤1.0μm)</span></div><div class="kpi-value" style="color:${okRate>=95?'var(--accent-emerald)':'var(--accent-rose)'}">${okRate}%</div><div class="kpi-change">NG ${ngCount}건</div></div>
    ${pAvgs.map(({p,a})=>{
      const ok=a!==null&&a<=ROUGH_THR;
      return `<div class="kpi-card"><div class="kpi-label">${p} 평균 Ra</div><div class="kpi-value" style="${a===null?'':(ok?'color:var(--accent-emerald)':'color:var(--accent-rose)')}">${a!==null?a.toFixed(3):'-'}</div><div class="kpi-change">기준 ≤ 1.0 μm</div></div>`;
    }).join('')}
  `;
}
function renderRoughnessCharts(rows) {
  const months=[...new Set(rows.map(r=>r.measure_date?.slice(0,7)).filter(Boolean))].sort();
  const clrs=[SIDIZ_COLORS.blue,SIDIZ_COLORS.cyan,SIDIZ_COLORS.emerald,SIDIZ_COLORS.amber];
  // 월별 추이
  const tCtx=document.getElementById('inq-rough-trend')?.getContext('2d');
  if(tCtx){
    const datasets=[
      ...INSP_PRODUCTS.map((p,i)=>({
        label:p,
        data:months.map(m=>{
          const vals=rows.filter(r=>r.product_code===p&&r.measure_date?.startsWith(m)).map(r=>+r.value).filter(v=>!isNaN(v));
          return vals.length?+avg(vals).toFixed(4):null;
        }),
        borderColor:clrs[i],backgroundColor:clrs[i]+'20',tension:0.3,pointRadius:3,borderWidth:2,spanGaps:true,fill:false,
      })),
      {label:'기준 1.0μm',data:months.map(()=>ROUGH_THR),borderColor:SIDIZ_COLORS.rose,borderDash:[6,4],borderWidth:2,pointRadius:0,fill:false},
    ];
    makeLine('rough-trend',tCtx,months,datasets,{
      scales:{
        x:{grid:{display:false},ticks:{font:{size:9}}},
        y:{min:0,suggestedMax:2.0,grid:{color:SIDIZ_COLORS.border},title:{display:true,text:'μm',font:{size:10}}}
      }
    });
  }
  // 기종별 평균 막대
  const aCtx=document.getElementById('inq-rough-avg')?.getContext('2d');
  if(aCtx){
    const avgs=INSP_PRODUCTS.map(p=>{
      const vals=rows.filter(r=>r.product_code===p).map(r=>+r.value).filter(v=>!isNaN(v));
      return vals.length?+avg(vals).toFixed(4):null;
    });
    const bclrs=avgs.map(v=>(v!==null&&v<=ROUGH_THR)?SIDIZ_COLORS.emerald:SIDIZ_COLORS.rose);
    const refLine=INSP_PRODUCTS.map(()=>ROUGH_THR);
    makeBar('rough-avg',aCtx,INSP_PRODUCTS,[
      {label:'평균 Ra',data:avgs,backgroundColor:bclrs,borderRadius:6,order:2},
      {label:'기준 1.0μm',data:refLine,type:'line',borderColor:SIDIZ_COLORS.rose,borderDash:[6,4],borderWidth:2,pointRadius:0,fill:false,order:1},
    ],{
      scales:{y:{min:0,suggestedMax:2.0,grid:{color:SIDIZ_COLORS.border},title:{display:true,text:'μm',font:{size:10}}},x:{grid:{display:false}}},
      plugins:{legend:{display:true,position:'top',align:'end',labels:{boxWidth:10,font:{size:10}}},datalabels:{display:true,anchor:'end',align:'top',color:SIDIZ_COLORS.text,font:{weight:700,size:11},formatter:(v,ctx)=>ctx.datasetIndex===0&&v!==null?v.toFixed(3):null}}
    });
  }
  // 공급업체별 비교
  const sCtx=document.getElementById('inq-rough-supplier')?.getContext('2d');
  if(sCtx){
    const sups=uniq(rows.map(r=>r.supplier).filter(Boolean)).sort();
    const datasets=INSP_PRODUCTS.map((p,i)=>({
      label:p,
      data:sups.map(s=>{
        const vals=rows.filter(r=>r.supplier===s&&r.product_code===p).map(r=>+r.value).filter(v=>!isNaN(v));
        return vals.length?+avg(vals).toFixed(4):null;
      }),
      backgroundColor:clrs[i],borderRadius:4,
    }));
    makeBar('rough-supplier',sCtx,sups.length?sups:['(데이터없음)'],datasets,{
      plugins:{legend:{display:true,position:'top',align:'end',labels:{boxWidth:10,font:{size:10}}},datalabels:{display:false}},
      scales:{x:{grid:{display:false}},y:{min:0,suggestedMax:2.0,grid:{color:SIDIZ_COLORS.border}}}
    });
  }
  // 판정 도넛
  const jCtx=document.getElementById('inq-rough-judge')?.getContext('2d');
  if(jCtx){
    const ok=rows.filter(r=>roughnessJudge(r.value)==='OK').length;
    const ng=rows.filter(r=>roughnessJudge(r.value)==='NG').length;
    const lb=[],dt=[],cl=[];
    if(ok){lb.push('OK (≤1.0μm)');dt.push(ok);cl.push(SIDIZ_COLORS.emerald);}
    if(ng){lb.push('NG (>1.0μm)');dt.push(ng);cl.push(SIDIZ_COLORS.rose);}
    if(!ok&&!ng){lb.push('데이터없음');dt.push(1);cl.push(SIDIZ_COLORS.muted);}
    makeDoughnut('rough-judge',jCtx,lb,dt,cl);
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
      <td>${r.measure_date||'-'}</td>
      <td>${escHtml(r.supplier||'-')}</td>
      <td><b>${escHtml(r.product_code||'-')}</b></td>
      <td style="font-weight:600;text-align:right">${r.value!==null?Number(r.value).toFixed(4):'-'} μm</td>
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
  renderRoughnessKPI(rows); renderRoughnessCharts(rows); renderRoughnessTable(rows);
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
  // 색상별 마스터 ΔE
  const sCtx=document.getElementById('inq-color-spec')?.getContext('2d');
  if(sCtx){
    const colors=uniq(rows.map(r=>r.color_code).filter(Boolean)).sort();
    const avgs=colors.map(c=>{const v=rows.filter(r=>r.color_code===c).map(r=>+r.delta_e_master).filter(v=>!isNaN(v));return v.length?+avg(v).toFixed(2):null;});
    const bclrs=avgs.map(v=>(v!==null&&v<=COLOR_THR)?SIDIZ_COLORS.blue:SIDIZ_COLORS.rose);
    makeBar('color-spec',sCtx,colors.length?colors:['(없음)'],[{label:'마스터 ΔE',data:avgs,backgroundColor:bclrs,borderRadius:4}],{
      plugins:{legend:{display:false},datalabels:{display:true,anchor:'end',align:'top',color:SIDIZ_COLORS.text,font:{weight:700,size:10},formatter:v=>v!==null?v.toFixed(2):'-'}},
      scales:{x:{grid:{display:false},ticks:{font:{size:9},maxRotation:45}},y:{min:0,suggestedMax:1.5,grid:{color:SIDIZ_COLORS.border}}}
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
  const jCtx=document.getElementById('inq-color-judge')?.getContext('2d');
  if(jCtx){
    const ok=rows.filter(r=>colorJudge(r.delta_e_master,r.delta_e_prev)==='OK').length;
    const ng=rows.filter(r=>colorJudge(r.delta_e_master,r.delta_e_prev)==='NG').length;
    const lb=[],dt=[],cl=[];
    if(ok){lb.push('OK');dt.push(ok);cl.push(SIDIZ_COLORS.emerald);}
    if(ng){lb.push('NG');dt.push(ng);cl.push(SIDIZ_COLORS.rose);}
    if(!ok&&!ng){lb.push('데이터없음');dt.push(1);cl.push(SIDIZ_COLORS.muted);}
    makeDoughnut('color-judge',jCtx,lb,dt,cl);
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
      <td style="text-align:right">${r.quantity_yd!=null?Number(r.quantity_yd).toLocaleString():'-'} Yd</td>
      <td style="font-weight:600;text-align:right;${mNG?'color:var(--accent-rose)':''}">${r.delta_e_master!=null?Number(r.delta_e_master).toFixed(2):'-'}</td>
      <td style="font-weight:600;text-align:right;${pNG?'color:var(--accent-rose)':''}">${r.delta_e_prev!=null?Number(r.delta_e_prev).toFixed(2):'-'}</td>
      <td>${judgeTag(j)}</td>
      <td style="font-size:12px;color:var(--text-muted);text-align:left">${escHtml(r.note||'-')}</td>
      <td><button class="btn-del" onclick="deleteColorimetry('${r.id}')">🗑</button></td>
    </tr>`;
  }).join('');
}
function renderColorimetry() {
  if(!STATE.colorimetry) return;
  const rows=getColorimetryFiltered();
  renderColorimetryKPI(rows); renderColorimetryCharts(rows); renderColorimetryTable(rows);
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

// ── 리머 보고서 생성 ────────────────────────────────────
window.generateReamerReport = function () {
  const rows = getReamerFiltered();
  const from = $('inq-reamer-from')?.value || '';
  const to   = $('inq-reamer-to')?.value   || '';
  const period = from && to ? `${from} ~ ${to}` : from ? `${from} 이후` : to ? `~ ${to}` : '전체 기간';
  const supplier = $('inq-reamer-supplier')?.value || '전체';
  const product  = $('inq-reamer-product')?.value  || '전체 기종';

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
  const supplier = $('inq-rough-supplier')?.value || '전체';
  const product  = $('inq-rough-product')?.value  || '전체 기종';

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
  const supplier  = $('inq-color-supplier')?.value || '전체';
  const colorCode = $('inq-color-code')?.value     || '전체 색상';

  const recs = _getColorimetryAnalysis(rows);
  const recHtml = _recToHtml(recs);

  // 검사 건수 요약
  const total = rows.length;
  const ngCount = rows.filter(r => colorJudge(r.delta_e_master, r.delta_e_prev) === 'NG').length;
  const mVals = rows.map(r => +r.delta_e_master).filter(v => !isNaN(v));
  const mAvg = mVals.length ? avg(mVals).toFixed(2) : '-';

  const imgTrend   = _captureInspectChart('inq-color-trend');
  const imgSpec    = _captureInspectChart('inq-color-spec');
  const imgJudge   = _captureInspectChart('inq-color-judge');

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

})();
