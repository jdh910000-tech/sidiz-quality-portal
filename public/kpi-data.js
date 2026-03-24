// kpi-data.js — KPI 고객클레임 현황 v3

const KPI_DATA = {
  '2025': {
    sales: {
      kr:  [19188, 25611, 26634, 22664, 16594, 15728, 20759, 19984, 18343, 15763, 18826, 18874],
      vn:  [14003, 18428, 20237, 16333, 12583, 10609, 12931, 14754, 15927, 13178, 12220, 15709],
    },
    judgement: {
      kr:  [340, 503, 479, 401, 359, 373, 423, 546, 539, 506, 528, 381],
      vn:  [183, 255, 289, 319, 339, 291, 262, 280, 328, 271, 331, 273],
    },
    claims: {
      kr:  [334, 479, 462, 399, 355, 369, 404, 528, 529, 491, 490, 370],
      vn:  [169, 224, 257, 310, 327, 284, 255, 271, 318, 263, 320, 275],
    },
    detail_kr: {
      '제조': [19, 60, 40, 32, 15, 35, 18, 36, 38, 36, 64, 35],
      '설계': [144, 212, 188, 185, 155, 165, 211, 266, 263, 227, 205, 147],
      '서비스': [4, 11, 17, 4, 5, 8, 4, 6, 4, 6, 10, 11],
      '고객불만': [62, 129, 118, 80, 100, 96, 107, 99, 114, 113, 100, null],
      '사양재검토': [111, 91, 116, 100, 84, 69, 83, 139, 120, 124, 149, 107],
    },
    detail_vn: {
      '제조': [27, 41, 25, 95, 139, 79, 25, 49, 39, 45, 57, 79],
      '설계': [46, 56, 69, 72, 89, 121, 138, 140, 161, 111, 101, 49],
      '서비스': [8, 19, 30, 5, 3, 5, 1, 3, 3, 2, 3, 6],
      '고객불만': [61, 76, 86, 64, 70, 59, 57, 41, 77, 58, 76, null],
      '사양재검토': [41, 63, 79, 83, 38, 27, 41, 47, 48, 55, 94, 62],
    },
    prevYearAvg: { claims_kr: 434, claims_vn: 273 },
    target: 0.015,
  },
  '2026': {
    // ※ 1~3월 정적값은 Supabase 실측 기준 (Supabase 우선 적용, 이 값은 fallback)
    sales: {
      kr:  [20726, 21632, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      vn:  [16124, 17593, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    judgement: {
      kr:  [394, 335, 257, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      vn:  [299, 208, 204, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    claims: {
      kr:  [394, 335, 257, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      vn:  [299, 208, 204, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    detail_kr: {
      '제조':      [36,  29,  32, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      '설계':      [151, 117,  88, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      '서비스':    [6,   7,    5,  0, 0, 0, 0, 0, 0, 0, 0, 0],
      '고객불만':  [113, 84,   68, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      '사양재검토':[88,  98,   64, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    detail_vn: {
      '제조':      [75,  33,  42, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      '설계':      [56,  46,  37, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      '서비스':    [12,  8,   5,  0, 0, 0, 0, 0, 0, 0, 0, 0],
      '고객불만':  [78,  61,  53, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      '사양재검토':[78,  60,  67, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    prevYearAvg: { claims_kr: 434, claims_vn: 273 },
    target: 0.015,
  }
};

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
let _kpiComboChart = null;
let _kpiMonthRange = 12; // 표시 구분: 12=전체, N=~N월 강조

// 숫자 포맷 헬퍼
function fmt(v) { return v != null && v !== 0 ? Number(v).toLocaleString() : '-'; }

// ─── Supabase 실시간 업데이트 ───
const VALID_KPI_CATS = ['제조','설계','서비스','고객불만','사양재검토'];
let _kpiBrandFilter = 'all';

// 원본 정적 데이터 보존 (최초 1회만 복사)
let _KPI_DATA_ORIGINAL = null;
function _backupKpiData() {
  if (_KPI_DATA_ORIGINAL) return;
  _KPI_DATA_ORIGINAL = JSON.parse(JSON.stringify(KPI_DATA));
}
function _restoreKpiData(year) {
  if (!_KPI_DATA_ORIGINAL || !_KPI_DATA_ORIGINAL[year]) return;
  const orig = _KPI_DATA_ORIGINAL[year];
  const data = KPI_DATA[year];
  data.judgement.kr = [...orig.judgement.kr];
  data.judgement.vn = [...orig.judgement.vn];
  data.sales.kr = [...orig.sales.kr];
  data.sales.vn = [...orig.sales.vn];
  const types = ['제조','설계','서비스','고객불만','사양재검토'];
  types.forEach(t => {
    data.detail_kr[t] = [...orig.detail_kr[t]];
    data.detail_vn[t] = [...orig.detail_vn[t]];
  });
}

async function updateKpiFromSupabase(year) {
  if (!window.SupabaseClient) return;
  _backupKpiData();
  // 항상 원본 정적 데이터로 복원 후 Supabase 값 병합
  _restoreKpiData(year);
  try {
    // 브랜드 필터를 URL 레벨에서 적용 (JS 후처리 제거 → 데이터 누락 방지)
    const validCatList = VALID_KPI_CATS.join(',');
    let query = `select=claim_date,country,category`
      + `&claim_date=gte.${year}-01-01&claim_date=lte.${year}-12-31`
      + `&category=in.(${validCatList})`;
    if (_kpiBrandFilter && _kpiBrandFilter !== 'all') {
      query += `&brand=eq.${_kpiBrandFilter}`; // raw 한글 사용 (PostgREST UTF-8 직접 처리)
    }
    query += `&limit=20000`; // 연간 전체도 안전하게 커버
    const validClaims = await SupabaseClient.supabaseFetch('claims', query);
    if (!validClaims || validClaims.length === 0) return;

    const data = KPI_DATA[year]; if (!data) return;
    const types = ['제조','설계','서비스','고객불만','사양재검토'];
    const jKr = Array(12).fill(0), jVn = Array(12).fill(0);
    const dKr = {}, dVn = {};
    types.forEach(t => { dKr[t] = Array(12).fill(0); dVn[t] = Array(12).fill(0); });

    validClaims.forEach(c => {
      const mi = parseInt(c.claim_date.slice(5,7)) - 1;
      if (mi < 0 || mi > 11) return;
      const isVn = c.country === '베트남';
      if (isVn) jVn[mi]++; else jKr[mi]++;
      // 카테고리 직접 매핑 (Supabase 값을 그대로 사용)
      const cat = (c.category || '').trim();
      let jt = null;
      if (cat === '제조') jt = '제조';
      else if (cat === '설계') jt = '설계';
      else if (cat === '서비스') jt = '서비스';
      else if (cat === '고객불만' || cat.includes('고객')) jt = '고객불만';
      else if (cat === '사양재검토' || cat.includes('사양')) jt = '사양재검토';
      if (jt) { if (isVn) dVn[jt][mi]++; else dKr[jt][mi]++; }
    });

    for (let i = 0; i < 12; i++) {
      // Supabase 값이 있는 월은 항상 Supabase 우선 (정적 데이터 덮어씀)
      if (jKr[i] > 0) data.judgement.kr[i] = jKr[i];
      if (jVn[i] > 0) data.judgement.vn[i] = jVn[i];
      types.forEach(t => {
        if (dKr[t][i] > 0) data.detail_kr[t][i] = dKr[t][i];
        if (dVn[t][i] > 0) data.detail_vn[t][i] = dVn[t][i];
      });
    }
    // 매출량 업데이트 (국내/베트남 별도)
    try {
      const sales = await SupabaseClient.supabaseFetch('sales_monthly',
        `select=*&year_month=gte.${year}-01&year_month=lte.${year}-12`);
      if (sales) sales.forEach(s => {
        const mi = parseInt(s.year_month.slice(5,7)) - 1;
        if (mi < 0 || mi > 11) return;
        if (s.country === '베트남' && s.sales_count > 0) data.sales.vn[mi] = s.sales_count;
        else if (s.sales_count > 0) data.sales.kr[mi] = s.sales_count;
      });
    } catch(e) {}
  } catch(e) { console.error('[KPI] updateKpiFromSupabase 오류:', e); }
}

// ─── 렌더링 ───
function renderKpiClaimSection(year) {
  const data = KPI_DATA[year]; if (!data) return;
  const range = _kpiMonthRange;

  // 범위 내 집계
  const krJ = data.judgement.kr.slice(0, range);
  const vnJ = data.judgement.vn.slice(0, range);
  const krJTotal = krJ.reduce((s,v) => s+(v||0), 0);
  const vnJTotal = vnJ.reduce((s,v) => s+(v||0), 0);
  const totalJ = krJTotal + vnJTotal;

  const krS = data.sales.kr.slice(0, range);
  const vnS = data.sales.vn.slice(0, range);
  const totalS = krS.reduce((s,v)=>s+(v||0),0) + vnS.reduce((s,v)=>s+(v||0),0);

  const avgIdx = totalS > 0 ? ((totalJ / totalS) * 100).toFixed(2) : '-';

  let lastMonth = 0;
  for (let i = range-1; i >= 0; i--) { if ((data.judgement.kr[i]||0)+(data.judgement.vn[i]||0) > 0) { lastMonth = i; break; } }
  const mc = lastMonth + 1;

  // KPI 카드: 판정종합, 불량지수, 국내(계), 베트남(계)
  const kpiGrid = document.querySelector('#kpi-claim-kpi .kpi-grid');
  if (kpiGrid) {
    kpiGrid.innerHTML = `
      <div class="kpi-card"><div class="kpi-label">판정종합 (${mc}월 누적)</div><div class="kpi-value" style="color:var(--sidiz-blue-bright)">${fmt(totalJ)}</div><div class="kpi-change">국내 ${fmt(krJTotal)} + 베트남 ${fmt(vnJTotal)}</div></div>
      <div class="kpi-card"><div class="kpi-label">불량지수 (평균)</div><div class="kpi-value" style="color:var(--accent-amber)">${avgIdx}%</div><div class="kpi-change ${parseFloat(avgIdx)>1.5?'up':'down'}">${parseFloat(avgIdx)>1.5?'▲':'▼'} 목표 1.50% 대비</div></div>
      <div class="kpi-card"><div class="kpi-label">국내 클레임 (계)</div><div class="kpi-value" style="color:var(--accent-rose)">${fmt(krJTotal)}</div><div class="kpi-change">${mc}월 누적</div></div>
      <div class="kpi-card"><div class="kpi-label">베트남 클레임 (계)</div><div class="kpi-value" style="color:var(--accent-violet)">${fmt(vnJTotal)}</div><div class="kpi-change">${mc}월 누적</div></div>`;
  }

  updateKpiComboChart(data, year, range);
  renderKpiMainTable(data, year, range);
  renderKpiJudgementTables(data, year, range);
}

// ─── 차트: X축 항상 1~12월, 범위 밖은 투명 처리 ───
function updateKpiComboChart(data, year, range) {
  const ctx = document.getElementById('comboChart'); if (!ctx) return;
  if (_kpiComboChart) _kpiComboChart.destroy();

  // 항상 12개월 데이터, 범위 밖은 0으로
  const krJ = data.judgement.kr.map((v,i) => i < range ? (v||0) : 0);
  const vnJ = data.judgement.vn.map((v,i) => i < range ? (v||0) : 0);

  const defIdx = [];
  for (let i = 0; i < 12; i++) {
    if (i >= range) { defIdx.push(null); continue; }
    const tc = (data.judgement.kr[i]||0) + (data.judgement.vn[i]||0);
    const ts = (data.sales.kr[i]||0) + (data.sales.vn[i]||0);
    defIdx.push(ts > 0 ? parseFloat(((tc/ts)*100).toFixed(2)) : 0);
  }

  // 범위 밖 막대 투명 처리용 배경색 배열
  const krBg = krJ.map((v,i) => i < range ? 'rgba(45,125,210,0.75)' : 'rgba(45,125,210,0.1)');
  const vnBg = vnJ.map((v,i) => i < range ? 'rgba(216,87,72,0.7)' : 'rgba(216,87,72,0.1)');
  const krBd = krJ.map((v,i) => i < range ? 'rgba(45,125,210,1)' : 'rgba(45,125,210,0.15)');
  const vnBd = vnJ.map((v,i) => i < range ? 'rgba(216,87,72,1)' : 'rgba(216,87,72,0.15)');

  const totalLabelPlugin = {
    id: 'totalLabel',
    afterDatasetsDraw(chart) {
      const { ctx: c, data: d, scales: { x, y } } = chart;
      const kr = d.datasets[0].data, vn = d.datasets[1].data;
      c.save();
      c.font = 'bold 13px JetBrains Mono, monospace';
      c.textAlign = 'center';
      for (let i = 0; i < kr.length; i++) {
        const total = kr[i] + vn[i];
        if (total === 0) continue;
        c.fillStyle = i < range ? '#f0f4f8' : 'rgba(160,180,203,0.3)';
        const xPos = x.getPixelForValue(i);
        const yPos = y.getPixelForValue(total);
        c.fillText(total.toLocaleString(), xPos, yPos - 8);
      }
      c.restore();
    }
  };

  // 범위 표시 플러그인 (범위 밖 영역에 배경)
  const rangeOverlay = {
    id: 'rangeOverlay',
    beforeDraw(chart) {
      if (range >= 12) return;
      const { ctx: c, chartArea: { left, right, top, bottom }, scales: { x } } = chart;
      const startX = x.getPixelForValue(range - 0.5);
      c.save();
      c.fillStyle = 'rgba(0,0,0,0.15)';
      c.fillRect(startX, top, right - startX, bottom - top);
      c.restore();
    }
  };

  _kpiComboChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MONTHS,
      datasets: [
        { label: '국내', data: krJ, backgroundColor: krBg, borderColor: krBd, borderWidth: 1, borderRadius: 4, order: 3, yAxisID: 'y' },
        { label: '베트남', data: vnJ, backgroundColor: vnBg, borderColor: vnBd, borderWidth: 1, borderRadius: 4, order: 3, yAxisID: 'y' },
        { label: '불량지수(%)', data: defIdx, type: 'line', borderColor: '#ffb347', backgroundColor: 'rgba(255,179,71,0.1)', borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#ffb347', pointBorderColor: '#17293f', pointBorderWidth: 2, tension: 0.3, fill: false, order: 1, yAxisID: 'y1', spanGaps: false },
        { label: '목표(1.50%)', data: Array(12).fill(1.50), type: 'line', borderColor: 'rgba(255,107,122,0.7)', borderWidth: 2, borderDash: [6,4], pointRadius: 0, fill: false, order: 2, yAxisID: 'y1' }
      ]
    },
    plugins: [totalLabelPlugin, rangeOverlay],
    options: {
      responsive: true, maintainAspectRatio: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end', labels: { color: '#a0b4cb', font: { size: 13, family: "'Noto Sans KR'" }, usePointStyle: true, pointStyle: 'rectRounded', padding: 16 } },
        tooltip: { backgroundColor: 'rgba(23,41,63,0.95)', titleColor: '#f0f4f8', bodyColor: '#a0b4cb', borderColor: '#243b5a', borderWidth: 1, cornerRadius: 8, padding: 12,
          callbacks: { label: c => c.dataset.yAxisID==='y1' ? c.dataset.label+': '+c.parsed.y+'%' : c.dataset.label+': '+(c.parsed.y||0).toLocaleString()+'건' } }
      },
      scales: {
        x: { stacked: true, grid: { color: 'rgba(36,59,90,0.3)' }, ticks: { color: '#6b83a0', font: { size: 13 } } },
        y: { stacked: true, position: 'left', title: { display: true, text: '판정종합 건수', color: '#6b83a0', font: { size: 13 } }, grid: { color: 'rgba(36,59,90,0.3)' }, ticks: { color: '#6b83a0', font: { size: 12, family: "'JetBrains Mono'" }, callback: v => v.toLocaleString() }, min: 0, max: 1000 },
        y1: { position: 'right', title: { display: true, text: '불량지수(%)', color: '#6b83a0', font: { size: 13 } }, grid: { drawOnChartArea: false }, ticks: { color: '#ffb347', font: { size: 12, family: "'JetBrains Mono'" }, callback: v=>v+'%' }, min: 0, max: 3.5 }
      }
    }
  });
}

// ─── 메인 테이블: 항상 1~12월, 범위 밖은 회색 표시 ───
function renderKpiMainTable(data, year, range) {
  const container = document.getElementById('kpiMainTable'); if (!container) return;
  const py = String(parseInt(year)-1); const pd = KPI_DATA[py];

  function avg(arr) { const v=arr.filter(x=>x&&x>0); return v.length>0?Math.round(v.reduce((s,x)=>s+x,0)/v.length):'-'; }
  // 월별 셀: 범위 밖이면 회색 스타일
  function mc(arr) { return arr.map((v,i) => {
    const dim = i >= range ? ' style="opacity:0.25"' : '';
    return `<td${dim}>${fmt(v)}</td>`;
  }).join(''); }
  function dc(cArr,sArr) { return cArr.map((c,i) => {
    const s = sArr[i]||0;
    const val = (c&&s>0) ? ((c/s)*100).toFixed(2)+'%' : '-';
    const dim = i >= range ? ' style="opacity:0.25"' : '';
    const cls = (c&&s>0&&(c/s)>0.015&&i<range) ? ' class="danger"' : '';
    return `<td${cls}${dim}>${val}</td>`;
  }).join(''); }

  const mh = MONTHS.map(m => `<th>${m}</th>`).join('');
  const rangeLabel = range < 12 ? ` · ~${range}월 강조` : '';

  let h = `<div class="data-table-header"><h3>고객클레임 종합 현황 (${year}년${rangeLabel})</h3></div>
  <table class="data-table"><thead><tr><th style="text-align:left" colspan="2">구분</th><th style="text-align:center">${py}평균</th><th style="text-align:center">${year}평균</th>${mh}</tr></thead><tbody>`;

  h+=`<tr><td class="row-header" rowspan="3">총 매출건수</td><td class="row-header">국내</td><td>${pd?fmt(avg(pd.sales.kr)):'-'}</td><td>${fmt(avg(data.sales.kr))}</td>${mc(data.sales.kr)}</tr>`;
  h+=`<tr><td class="row-header">베트남</td><td>${pd?fmt(avg(pd.sales.vn)):'-'}</td><td>${fmt(avg(data.sales.vn))}</td>${mc(data.sales.vn)}</tr>`;
  const tS=data.sales.kr.map((v,i)=>(v||0)+(data.sales.vn[i]||0));
  h+=`<tr style="font-weight:600"><td class="row-header">계</td><td>${pd?fmt(avg(pd.sales.kr.map((v,i)=>(v||0)+(pd.sales.vn[i]||0)))):'-'}</td><td>${fmt(avg(tS))}</td>${mc(tS)}</tr>`;

  h+=`<tr><td class="row-header" rowspan="3">판정종합 건수</td><td class="row-header">국내</td><td>${pd?fmt(avg(pd.judgement.kr)):'-'}</td><td>-</td>${mc(data.judgement.kr)}</tr>`;
  h+=`<tr><td class="row-header">베트남</td><td>${pd?fmt(avg(pd.judgement.vn)):'-'}</td><td>-</td>${mc(data.judgement.vn)}</tr>`;
  const tJ=data.judgement.kr.map((v,i)=>(v||0)+(data.judgement.vn[i]||0));
  h+=`<tr style="font-weight:600"><td class="row-header">판정 계</td><td>${pd?fmt(avg(pd.judgement.kr.map((v,i)=>(v||0)+(pd.judgement.vn[i]||0)))):'-'}</td><td>-</td>${mc(tJ)}</tr>`;

  h+=`<tr><td class="row-header" rowspan="3">불량지수</td><td class="row-header">국내</td><td>-</td><td>-</td>${dc(data.judgement.kr,data.sales.kr)}</tr>`;
  h+=`<tr><td class="row-header">베트남</td><td>-</td><td>-</td>${dc(data.judgement.vn,data.sales.vn)}</tr>`;
  h+=`<tr style="font-weight:600"><td class="row-header">불량 계</td><td>-</td><td>-</td>${dc(tJ,tS)}</tr>`;
  h+=`<tr style="background:rgba(0,87,184,0.06)"><td class="row-header" colspan="2">목표</td><td>-</td><td>1.50%</td>${Array(12).fill('<td>1.50%</td>').join('')}</tr>`;
  h+='</tbody></table>';
  container.innerHTML = h;
}

// ─── 판정유형별 테이블: 항상 1~12월, 범위 밖 회색 ───
function renderKpiJudgementTables(data, year, range) {
  const krC = document.getElementById('kpiJudgementKr');
  const vnC = document.getElementById('kpiJudgementVn');
  if (!krC||!vnC) return;
  const py = String(parseInt(year)-1); const pd = KPI_DATA[py];
  const types = ['제조','설계','서비스','고객불만','사양재검토'];

  function avg(arr) { const v=arr.filter(x=>x&&x>0); return v.length>0?Math.round(v.reduce((s,x)=>s+x,0)/v.length):'-'; }
  function mc(arr) { return arr.map((v,i) => {
    const dim = i >= range ? ' style="opacity:0.25"' : '';
    return `<td${dim}>${fmt(v)}</td>`;
  }).join(''); }

  function build(flag, label, dd, pdd) {
    const mh = MONTHS.map(m=>`<th>${m}</th>`).join('');
    let h = `<div class="data-table-header"><h3>${flag} ${label} — 판정유형별 클레임 건수</h3></div>
    <table class="data-table"><thead><tr><th style="text-align:left">판정유형</th><th style="text-align:center">${py}평균</th>${mh}</tr></thead><tbody>`;
    let tot = Array(12).fill(0);
    types.forEach(t => {
      const arr = dd[t]||Array(12).fill(0);
      arr.forEach((v,i) => tot[i]+=(v||0));
      h+=`<tr><td class="row-header">${t}</td><td>${pdd&&pdd[t]?fmt(avg(pdd[t])):'-'}</td>${mc(arr)}</tr>`;
    });
    h+=`<tr style="font-weight:700;background:rgba(0,87,184,0.04)"><td>합계</td><td>-</td>${mc(tot.map(v=>v||null))}</tr></tbody></table>`;
    return h;
  }
  krC.innerHTML = build('🇰🇷','국내', data.detail_kr, pd?.detail_kr);
  vnC.innerHTML = build('🇻🇳','베트남', data.detail_vn, pd?.detail_vn);
}

// ─── 핸들러 ───
async function onKpiYearChange(year) {
  document.getElementById('kpiYearSelect').value = year;
  await updateKpiFromSupabase(year);
  renderKpiClaimSection(year);
}
async function onKpiBrandChange(brand) {
  _kpiBrandFilter = brand;
  const year = document.getElementById('kpiYearSelect')?.value || '2026';
  await updateKpiFromSupabase(year);
  renderKpiClaimSection(year);
}
function onMonthRangeChange(val) {
  _kpiMonthRange = parseInt(val);
  const year = document.getElementById('kpiYearSelect')?.value || '2026';
  renderKpiClaimSection(year);
}
async function initKpiSection() {
  const year = document.getElementById('kpiYearSelect')?.value || '2026';
  // 브랜드 셀렉터 값 반영 (기본값: 시디즈)
  const brandSel = document.getElementById('kpiBrandSelect');
  if (brandSel && brandSel.value && brandSel.value !== 'all') {
    _kpiBrandFilter = brandSel.value;
  }
  await updateKpiFromSupabase(year);
  renderKpiClaimSection(year);
}

window.KpiModule = { initKpiSection, onKpiYearChange, onKpiBrandChange, onMonthRangeChange, renderKpiClaimSection, KPI_DATA };
