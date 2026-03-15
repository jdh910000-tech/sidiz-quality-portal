// kpi-data.js — KPI 고객클레임 현황 데이터 + Supabase 실시간 연동

// ─── 정적 데이터 (엑셀 추출) ───
const KPI_DATA = {
  '2025': {
    sales: {
      kr:  [19188, 25611, 26634, 22664, 16594, 15728, 20759, 19984, 18343, 15763, 18826, 18874],
      vn:  [14003, 18428, 20237, 16333, 12583, 10609, 12931, 14754, 15927, 13178, 12220, 15709],
    },
    claims: {
      kr:  [334, 479, 462, 399, 355, 369, 404, 528, 529, 491, 490, 370],
      vn:  [169, 224, 257, 310, 327, 284, 255, 271, 318, 263, 320, 275],
    },
    // 판정유형별 종합 건수
    judgement: {
      kr:  [340, 503, 479, 401, 359, 373, 423, 546, 539, 506, 528, 381],
      vn:  [183, 255, 289, 319, 339, 291, 262, 280, 328, 271, 331, 273],
    },
    // 판정유형별 상세 — 국내
    detail_kr: {
      '제조':     [19, 60, 40, 32, 15, 35, 18, 36, 38, 36, 64, 35],
      '설계':     [144, 212, 188, 185, 155, 165, 211, 266, 263, 227, 205, 147],
      '서비스':   [4, 11, 17, 4, 5, 8, 4, 6, 4, 6, 10, 11],
      '고객불만': [62, 129, 118, 80, 100, 96, 107, 99, 114, 113, 100, null],
      '사양재검토': [111, 91, 116, 100, 84, 69, 83, 139, 120, 124, 149, 107],
    },
    // 판정유형별 상세 — 베트남
    detail_vn: {
      '제조':     [27, 41, 25, 95, 139, 79, 25, 49, 39, 45, 57, 79],
      '설계':     [46, 56, 69, 72, 89, 121, 138, 140, 161, 111, 101, 49],
      '서비스':   [8, 19, 30, 5, 3, 5, 1, 3, 3, 2, 3, 6],
      '고객불만': [61, 76, 86, 64, 70, 59, 57, 41, 77, 58, 76, null],
      '사양재검토': [41, 63, 79, 83, 38, 27, 41, 47, 48, 55, 94, 62],
    },
    prevYearAvg: { sales_kr: null, sales_vn: null, claims_kr: 434, claims_vn: 273 },
    target: 0.015,
  },
  '2026': {
    sales: {
      kr:  [20726, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      vn:  [16124, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    claims: {
      kr:  [360, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      vn:  [279, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    judgement: {
      kr:  [373, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      vn:  [293, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    detail_kr: {
      '제조':     [36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      '설계':     [150, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      '서비스':   [6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      '고객불만': [93, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      '사양재검토': [88, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    detail_vn: {
      '제조':     [75, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      '설계':     [57, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      '서비스':   [12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      '고객불만': [71, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      '사양재검토': [78, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    prevYearAvg: { sales_kr: 19914, sales_vn: 14743, claims_kr: 434, claims_vn: 273 },
    target: 0.015,
  }
};

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

// ─── Supabase 실시간 업데이트 (claims 테이블에서 가져와서 2026 데이터 업데이트) ───
async function updateKpiFromSupabase(year) {
  if (!window.SupabaseClient) return;
  try {
    // claims 테이블에서 해당 연도 데이터 가져오기
    const startDate = year + '-01-01';
    const endDate = year + '-12-31';
    const claims = await SupabaseClient.supabaseFetch('claims',
      `select=claim_date,country,category&claim_date=gte.${startDate}&claim_date=lte.${endDate}&limit=10000`);
    
    if (!claims || claims.length === 0) return;
    
    const data = KPI_DATA[year];
    if (!data) return;
    
    // 월별 국내/베트남 클레임 건수 집계
    const krByMonth = Array(12).fill(0);
    const vnByMonth = Array(12).fill(0);
    
    // 판정유형별 집계
    const types = ['제조','설계','서비스','고객불만','사양재검토'];
    const detailKr = {}; const detailVn = {};
    types.forEach(t => { detailKr[t] = Array(12).fill(0); detailVn[t] = Array(12).fill(0); });
    
    claims.forEach(c => {
      const monthIdx = parseInt(c.claim_date.slice(5, 7)) - 1;
      if (monthIdx < 0 || monthIdx > 11) return;
      
      const isVn = c.country === '베트남';
      if (isVn) vnByMonth[monthIdx]++;
      else krByMonth[monthIdx]++;
      
      // category → 판정유형 매핑
      const cat = c.category || '';
      // claims 테이블의 category는 다양하므로 매핑 필요
      let jType = null;
      if (cat === '제조') jType = '제조';
      else if (cat === '설계') jType = '설계';
      else if (cat === '서비스') jType = '서비스';
      else if (cat.includes('고객불만') || cat.includes('고객')) jType = '고객불만';
      else if (cat.includes('사양재검토') || cat.includes('사양')) jType = '사양재검토';
      // 나머지 (세트교환요구, 영업지원 등)은 judgement_type 참고
      
      if (jType) {
        if (isVn) detailVn[jType][monthIdx]++;
        else detailKr[jType][monthIdx]++;
      }
    });
    
    // 정적 데이터에 Supabase 데이터 병합 (0인 월만 업데이트)
    for (let i = 0; i < 12; i++) {
      if (krByMonth[i] > 0 && data.claims.kr[i] === 0) data.claims.kr[i] = krByMonth[i];
      if (vnByMonth[i] > 0 && data.claims.vn[i] === 0) data.claims.vn[i] = vnByMonth[i];
      
      types.forEach(t => {
        if (detailKr[t][i] > 0 && data.detail_kr[t][i] === 0) data.detail_kr[t][i] = detailKr[t][i];
        if (detailVn[t][i] > 0 && data.detail_vn[t][i] === 0) data.detail_vn[t][i] = detailVn[t][i];
      });
    }
    
    // sales_monthly 테이블에서 매출 데이터도 가져오기
    try {
      const sales = await SupabaseClient.supabaseFetch('sales_monthly',
        `select=*&year_month=gte.${year}-01&year_month=lte.${year}-12`);
      if (sales && sales.length > 0) {
        sales.forEach(s => {
          const monthIdx = parseInt(s.year_month.slice(5, 7)) - 1;
          if (monthIdx < 0 || monthIdx > 11) return;
          if (s.country === '베트남' && s.sales_count > 0) data.sales.vn[monthIdx] = s.sales_count;
          else if (s.sales_count > 0) data.sales.kr[monthIdx] = s.sales_count;
        });
      }
    } catch(e) { console.log('매출 데이터 없음 (정상):', e.message); }
    
    console.log(`✅ KPI ${year}년 Supabase 업데이트 완료`);
  } catch(e) {
    console.log('KPI Supabase 업데이트 실패:', e.message);
  }
}

// ─── KPI 렌더링 ───
let _kpiComboChart = null;

function renderKpiClaimSection(year) {
  const data = KPI_DATA[year];
  if (!data) return;
  
  const krTotal = data.claims.kr.reduce((s,v) => s + (v||0), 0);
  const vnTotal = data.claims.vn.reduce((s,v) => s + (v||0), 0);
  const totalClaims = krTotal + vnTotal;
  
  const krSalesTotal = data.sales.kr.reduce((s,v) => s + (v||0), 0);
  const vnSalesTotal = data.sales.vn.reduce((s,v) => s + (v||0), 0);
  const totalSales = krSalesTotal + vnSalesTotal;
  
  const avgDefectIdx = totalSales > 0 ? ((totalClaims / totalSales) * 100).toFixed(2) : '-';
  
  // 판정유형별 합계
  const types = ['제조','설계','서비스','고객불만','사양재검토'];
  const typeKrTotals = {}; const typeVnTotals = {};
  types.forEach(t => {
    typeKrTotals[t] = data.detail_kr[t].reduce((s,v) => s + (v||0), 0);
    typeVnTotals[t] = data.detail_vn[t].reduce((s,v) => s + (v||0), 0);
  });
  
  // 데이터가 있는 마지막 월 찾기
  let lastMonth = 0;
  for (let i = 11; i >= 0; i--) {
    if ((data.claims.kr[i] || 0) + (data.claims.vn[i] || 0) > 0) { lastMonth = i; break; }
  }
  const monthCount = lastMonth + 1;
  
  // ─── KPI 카드 업데이트 ───
  const kpiGrid = document.querySelector('#kpi-claim-kpi .kpi-grid');
  if (kpiGrid) {
    const mfgTotal = (typeKrTotals['제조']||0) + (typeVnTotals['제조']||0);
    const designTotal = (typeKrTotals['설계']||0) + (typeVnTotals['설계']||0);
    const mfgRate = totalSales > 0 ? ((mfgTotal / totalSales) * 100).toFixed(2) + '%' : '-';
    
    kpiGrid.innerHTML = `
      <div class="kpi-card"><div class="kpi-label">불량 합계 (${monthCount}월 누적)</div><div class="kpi-value" style="color:var(--sidiz-blue-bright)">${totalClaims.toLocaleString()}</div><div class="kpi-change">국내 ${krTotal.toLocaleString()} + 베트남 ${vnTotal.toLocaleString()}</div></div>
      <div class="kpi-card"><div class="kpi-label">불량지수 (평균)</div><div class="kpi-value" style="color:var(--accent-amber)">${avgDefectIdx}%</div><div class="kpi-change ${parseFloat(avgDefectIdx) > 1.5 ? 'up' : 'down'}">${parseFloat(avgDefectIdx) > 1.5 ? '▲' : '▼'} 목표 1.50% 대비</div></div>
      <div class="kpi-card"><div class="kpi-label">제조 클레임 (계)</div><div class="kpi-value" style="color:var(--accent-rose)">${mfgTotal.toLocaleString()}</div><div class="kpi-change">클레임율 ${mfgRate}</div></div>
      <div class="kpi-card"><div class="kpi-label">설계 클레임 (계)</div><div class="kpi-value" style="color:var(--accent-violet)">${designTotal.toLocaleString()}</div><div class="kpi-change">국내 ${(typeKrTotals['설계']||0).toLocaleString()} + 베트남 ${(typeVnTotals['설계']||0).toLocaleString()}</div></div>`;
  }
  
  // ─── 콤보 차트 업데이트 ───
  updateKpiComboChart(data, year);
  
  // ─── 메인 KPI 테이블 ───
  renderKpiMainTable(data, year);
  
  // ─── 판정유형별 테이블 ───
  renderKpiJudgementTables(data, year);
}

function updateKpiComboChart(data, year) {
  const ctx = document.getElementById('comboChart');
  if (!ctx) return;
  
  if (_kpiComboChart) _kpiComboChart.destroy();
  
  const krClaims = data.claims.kr.map(v => v || 0);
  const vnClaims = data.claims.vn.map(v => v || 0);
  
  // 불량지수 계산
  const defectIdx = [];
  for (let i = 0; i < 12; i++) {
    const totalC = (data.claims.kr[i]||0) + (data.claims.vn[i]||0);
    const totalS = (data.sales.kr[i]||0) + (data.sales.vn[i]||0);
    defectIdx.push(totalS > 0 ? parseFloat(((totalC / totalS) * 100).toFixed(2)) : 0);
  }
  
  _kpiComboChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MONTHS,
      datasets: [
        { label: '국내 클레임', data: krClaims, backgroundColor: 'rgba(45,125,210,0.75)', borderColor: 'rgba(45,125,210,1)', borderWidth: 1, borderRadius: 4, order: 3, yAxisID: 'y' },
        { label: '베트남 클레임', data: vnClaims, backgroundColor: 'rgba(216,87,72,0.7)', borderColor: 'rgba(216,87,72,1)', borderWidth: 1, borderRadius: 4, order: 3, yAxisID: 'y' },
        { label: '불량지수(%)', data: defectIdx, type: 'line', borderColor: '#ffb347', backgroundColor: 'rgba(255,179,71,0.1)', borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#ffb347', pointBorderColor: '#17293f', pointBorderWidth: 2, tension: 0.3, fill: false, order: 1, yAxisID: 'y1' },
        { label: '목표 (1.50%)', data: Array(12).fill(1.50), type: 'line', borderColor: 'rgba(255,107,122,0.7)', borderWidth: 2, borderDash: [6,4], pointRadius: 0, fill: false, order: 2, yAxisID: 'y1' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end', labels: { color: '#a0b4cb', font: { size: 11, family: "'Noto Sans KR'" }, usePointStyle: true, pointStyle: 'rectRounded', padding: 16 } },
        tooltip: { backgroundColor: 'rgba(23,41,63,0.95)', titleColor: '#f0f4f8', bodyColor: '#a0b4cb', borderColor: '#243b5a', borderWidth: 1, cornerRadius: 8, padding: 12, bodyFont: { family: "'JetBrains Mono'", size: 11 },
          callbacks: { label: function(c) { if (c.dataset.yAxisID === 'y1') return c.dataset.label + ': ' + c.parsed.y + '%'; return c.dataset.label + ': ' + c.parsed.y + '건'; } }
        }
      },
      scales: {
        x: { stacked: true, grid: { color: 'rgba(36,59,90,0.3)' }, ticks: { color: '#6b83a0', font: { size: 11 } } },
        y: { stacked: true, position: 'left', title: { display: true, text: '클레임 건수', color: '#6b83a0', font: { size: 11 } }, grid: { color: 'rgba(36,59,90,0.3)' }, ticks: { color: '#6b83a0', font: { size: 10, family: "'JetBrains Mono'" } }, min: 0 },
        y1: { position: 'right', title: { display: true, text: '불량지수 (%)', color: '#6b83a0', font: { size: 11 } }, grid: { drawOnChartArea: false }, ticks: { color: '#ffb347', font: { size: 10, family: "'JetBrains Mono'" }, callback: v => v + '%' }, min: 0, max: 3.5 }
      }
    }
  });
}

function renderKpiMainTable(data, year) {
  const container = document.getElementById('kpiMainTable');
  if (!container) return;
  
  const prevYear = String(parseInt(year) - 1);
  const prevData = KPI_DATA[prevYear];
  
  function avg(arr) { const valid = arr.filter(v => v && v > 0); return valid.length > 0 ? Math.round(valid.reduce((s,v)=>s+v,0)/valid.length) : '-'; }
  function pct(claims, sales) { return sales > 0 ? ((claims/sales)*100).toFixed(2)+'%' : '-'; }
  function monthCells(arr) { return arr.map(v => `<td>${v || '-'}</td>`).join(''); }
  function defectCells(claimsArr, salesArr) {
    return claimsArr.map((c,i) => {
      const s = salesArr[i] || 0;
      const val = (c && s > 0) ? ((c/s)*100).toFixed(2)+'%' : '-';
      const cls = (c && s > 0 && (c/s) > 0.02) ? ' class="danger"' : '';
      return `<td${cls}>${val}</td>`;
    }).join('');
  }
  
  const krSalesSum = data.sales.kr.reduce((s,v)=>s+(v||0),0);
  const vnSalesSum = data.sales.vn.reduce((s,v)=>s+(v||0),0);
  const totalSalesSum = krSalesSum + vnSalesSum;
  
  let html = `<div class="data-table-header"><h3>고객클레임 종합 현황 (${year}년)</h3></div>
  <table class="data-table"><thead><tr>
    <th style="text-align:left" colspan="2">구분</th>
    <th>${prevYear}평균</th><th>${year}평균</th>
    ${MONTHS.map(m => `<th>${m}</th>`).join('')}
  </tr></thead><tbody>`;
  
  // 총 매출건수
  html += `<tr><td class="row-header" rowspan="3">총 매출건수</td><td>국내</td><td>${prevData ? avg(prevData.sales.kr) : '-'}</td><td>${avg(data.sales.kr)}</td>${monthCells(data.sales.kr)}</tr>`;
  html += `<tr><td>베트남</td><td>${prevData ? avg(prevData.sales.vn) : '-'}</td><td>${avg(data.sales.vn)}</td>${monthCells(data.sales.vn)}</tr>`;
  const totalSales = data.sales.kr.map((v,i) => (v||0) + (data.sales.vn[i]||0));
  html += `<tr style="font-weight:600"><td>계</td><td>${prevData ? avg(prevData.sales.kr.map((v,i)=>(v||0)+(prevData.sales.vn[i]||0))) : '-'}</td><td>${avg(totalSales)}</td>${monthCells(totalSales.map(v=>v||null))}</tr>`;
  
  // 클레임 건수(불량)
  html += `<tr><td class="row-header" rowspan="3">클레임 건수(불량)</td><td>국내</td><td>${prevData ? avg(prevData.claims.kr) : '-'}</td><td>-</td>${monthCells(data.claims.kr)}</tr>`;
  html += `<tr><td>베트남</td><td>${prevData ? avg(prevData.claims.vn) : '-'}</td><td>-</td>${monthCells(data.claims.vn)}</tr>`;
  const totalClaims = data.claims.kr.map((v,i) => (v||0) + (data.claims.vn[i]||0));
  html += `<tr style="font-weight:600"><td>불량 계</td><td>${prevData ? avg(prevData.claims.kr.map((v,i)=>(v||0)+(prevData.claims.vn[i]||0))) : '-'}</td><td>-</td>${monthCells(totalClaims.map(v=>v||null))}</tr>`;
  
  // 불량지수
  html += `<tr><td class="row-header" rowspan="3">불량지수</td><td>국내</td><td>-</td><td>-</td>${defectCells(data.claims.kr, data.sales.kr)}</tr>`;
  html += `<tr><td>베트남</td><td>-</td><td>-</td>${defectCells(data.claims.vn, data.sales.vn)}</tr>`;
  html += `<tr style="font-weight:600"><td>불량 계</td><td>-</td><td>-</td>${defectCells(totalClaims, totalSales)}</tr>`;
  
  // 목표
  html += `<tr style="background:rgba(0,87,184,0.06)"><td class="row-header" colspan="2">목표</td><td>-</td><td>1.50%</td>${Array(12).fill('<td>1.50%</td>').join('')}</tr>`;
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function renderKpiJudgementTables(data, year) {
  const krContainer = document.getElementById('kpiJudgementKr');
  const vnContainer = document.getElementById('kpiJudgementVn');
  if (!krContainer || !vnContainer) return;
  
  const prevYear = String(parseInt(year) - 1);
  const prevData = KPI_DATA[prevYear];
  const types = ['제조','설계','서비스','고객불만','사양재검토'];
  
  function avg(arr) { const valid = arr.filter(v => v && v > 0); return valid.length > 0 ? Math.round(valid.reduce((s,v)=>s+v,0)/valid.length) : '-'; }
  function monthCells(arr) { return arr.map(v => `<td>${v || '-'}</td>`).join(''); }
  
  function buildTable(flag, label, detailData, prevDetailData) {
    let html = `<div class="data-table-header"><h3>${flag} ${label} — 판정유형별 클레임 건수</h3></div>
    <table class="data-table"><thead><tr><th style="text-align:left">판정유형</th><th>${prevYear}평균</th>${MONTHS.map(m=>`<th>${m}</th>`).join('')}</tr></thead><tbody>`;
    
    let totalArr = Array(12).fill(0);
    types.forEach(t => {
      const arr = detailData[t] || Array(12).fill(0);
      arr.forEach((v,i) => totalArr[i] += (v||0));
      const prevAvg = prevDetailData && prevDetailData[t] ? avg(prevDetailData[t]) : '-';
      html += `<tr><td class="row-header">${t}</td><td>${prevAvg}</td>${monthCells(arr)}</tr>`;
    });
    html += `<tr style="font-weight:700;background:rgba(0,87,184,0.04)"><td>합계</td><td>-</td>${monthCells(totalArr.map(v=>v||null))}</tr>`;
    html += '</tbody></table>';
    return html;
  }
  
  krContainer.innerHTML = buildTable('🇰🇷', '국내', data.detail_kr, prevData?.detail_kr);
  vnContainer.innerHTML = buildTable('🇻🇳', '베트남', data.detail_vn, prevData?.detail_vn);
}

// ─── 연도 변경 핸들러 ───
async function onKpiYearChange(year) {
  document.getElementById('kpiYearSelect').value = year;
  
  // Supabase에서 실시간 데이터 업데이트
  await updateKpiFromSupabase(year);
  
  // 렌더링
  renderKpiClaimSection(year);
}

// ─── 초기화 ───
async function initKpiSection() {
  const year = document.getElementById('kpiYearSelect')?.value || '2026';
  await updateKpiFromSupabase(year);
  renderKpiClaimSection(year);
}

window.KpiModule = {
  initKpiSection,
  onKpiYearChange,
  renderKpiClaimSection,
  KPI_DATA,
};
