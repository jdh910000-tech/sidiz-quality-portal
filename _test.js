
// ── 즉시 실행: 인증 여부 체크 ─────────────────────────────────────────────
(function() {
  if (sessionStorage.getItem('sidiz_auth') === '1') {
    document.getElementById('loginOverlay').style.display = 'none';
    return;
  }
  document.getElementById('loginPwInput').focus();
})();


// Light theme: Chart.js global defaults
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = '#6b6b80';
  Chart.defaults.borderColor = 'rgba(0,0,0,0.07)';
  Chart.defaults.plugins = Chart.defaults.plugins || {};
}


const now = new Date();
document.getElementById('currentDate').textContent = now.getFullYear()+'.'+String(now.getMonth()+1).padStart(2,'0')+'.'+String(now.getDate()).padStart(2,'0');

function showSection(id) {
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.getElementById('section-'+id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const map={home:0,claim:1,kpi:2,lab:3,as:4,inspect:5,closing:7,cert:8,team:9,okr:10};
  document.querySelectorAll('.nav-item')[map[id]]?.classList.add('active');
  window.scrollTo(0,0);
  if (id === 'team' && !_orgLoaded) { loadOrgChart(); _orgLoaded = true; }
}

function showClaimTab(tab,btn) {
  document.querySelectorAll('#section-claim .claim-content').forEach(c=>c.style.display='none');
  document.getElementById('claim-'+tab).style.display='block';
  document.querySelectorAll('#section-claim .sub-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  if (tab === 'receipt') {
    initReceiptDateDefaults();
    // 탭 진입 시 업로드일 모드 기본 활성화
    _rctDateMode = 'uploaded';
    const btnR = document.getElementById('rctModeReceipt');
    const btnU = document.getElementById('rctModeUploaded');
    if (btnR) { btnR.style.background = 'var(--sidiz-card)'; btnR.style.color = 'var(--text-muted)'; }
    if (btnU) { btnU.style.background = 'var(--sidiz-blue)'; btnU.style.color = 'white'; }
    const titleEl = document.querySelector('#claim-receipt .section-title span');
    if (titleEl) titleEl.textContent = '(업로드일 기준)';
    loadReceiptDashboard();
  }
  if (tab === 'product' && !_prodLoaded) { loadProdTab(); _prodLoaded = true; }

}

function showKpiTab(tab,btn) {
  document.querySelectorAll('#section-kpi .kpi-content').forEach(c=>c.style.display='none');
  document.getElementById('kpi-'+tab).style.display='block';
  document.querySelectorAll('#section-kpi .sub-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  // 탭 전환 시 분석 메모 로드
  if (tab === 'claim-kpi') loadKpiNote('claim');
  if (tab === 'cost-kpi')  loadKpiNote('cost');
}

// ─────────────────────────────────────────────────────────────
// KPI 월별 종합 분석 메모
// ─────────────────────────────────────────────────────────────
function _kpiNoteYearMonth(type) {
  // KPI 연도 selector + 현재 월 조합
  const yearEl = type === 'cost'
    ? document.getElementById('costYearSelect')
    : document.getElementById('kpiYearSelect');
  const year = yearEl?.value || new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function _prevYearMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

async function loadKpiNote(type) {
  const ym   = _kpiNoteYearMonth(type);
  const prev = _prevYearMonth(ym);
  const pfx  = type === 'claim' ? 'Claim' : 'Cost';

  const monthBadge = document.getElementById(`kpi${pfx}NoteMonth`);
  const textarea   = document.getElementById(`kpi${pfx}NoteArea`);
  const prevWrap   = document.getElementById(`kpi${pfx}PrevNoteWrap`);
  const prevEl     = document.getElementById(`kpi${pfx}PrevNote`);
  const prevLabel  = document.getElementById(`kpi${pfx}PrevNoteLabel`);

  if (monthBadge) monthBadge.textContent = ym;

  try {
    const rows = await SupabaseClient.fetchKpiNotes(type, ym);
    const cur  = rows.find(r => r.year_month === ym);
    const prevRow = rows.find(r => r.year_month === prev);

    if (textarea) textarea.value = cur?.content || '';
    if (prevRow && prevEl && prevWrap) {
      if (prevLabel) prevLabel.textContent = `${prev} 기록`;
      prevEl.textContent = prevRow.content || '(기록 없음)';
      prevWrap.style.display = 'block';
    } else if (prevWrap) {
      prevWrap.style.display = 'none';
    }
  } catch(e) {
    console.warn('loadKpiNote error', e);
  }
}

async function saveKpiNoteUI(type) {
  const ym   = _kpiNoteYearMonth(type);
  const pfx  = type === 'claim' ? 'Claim' : 'Cost';
  const textarea = document.getElementById(`kpi${pfx}NoteArea`);
  const statusEl = document.getElementById(`kpi${pfx}NoteSaveStatus`);
  const btn      = document.getElementById(`kpi${pfx}NoteSaveBtn`);

  if (!textarea) return;
  const content = textarea.value.trim();
  if (!content) {
    if (statusEl) { statusEl.style.color = '#e74c3c'; statusEl.textContent = '⚠ 내용을 입력해주세요.'; }
    return;
  }

  if (btn) btn.disabled = true;
  if (statusEl) { statusEl.style.color = 'var(--text-muted)'; statusEl.textContent = '저장 중...'; }

  try {
    await SupabaseClient.saveKpiNote(type, ym, content);
    if (statusEl) {
      statusEl.style.color = 'var(--accent-emerald)';
      statusEl.textContent = `✅ ${ym} 저장 완료`;
      setTimeout(() => { statusEl.textContent = ''; }, 3000);
    }
    // 저장 후 전월 기록 갱신
    await loadKpiNote(type);
  } catch(e) {
    console.error('saveKpiNoteUI 오류:', e);
    if (statusEl) { statusEl.style.color = '#e74c3c'; statusEl.textContent = '❌ 저장 실패: ' + (e.message||''); }
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ── KPI 자동 분석 ──
(function(){
  const VALID_CATS = ['설계','제조','서비스','사양재검토','고객불만'];
  const SUPABASE_URL = 'https://cyxnbwczcvjeaqmrdzcb.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_i2Cw7SPjRn1BDa5XS-2NyA_qHNRC8Y5';
  const HDR = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

  // 월 목록 생성 (2024-01 ~ 현재)
  function buildMonthOptions() {
    const sel1 = document.getElementById('analysisPrevMonth');
    const sel2 = document.getElementById('analysisCurMonth');
    if (!sel1 || !sel2) return;
    const now = new Date();
    const months = [];
    for (let y = 2024; y <= now.getFullYear(); y++) {
      const maxM = y === now.getFullYear() ? now.getMonth() + 1 : 12;
      for (let m = 1; m <= maxM; m++) months.push(`${y}-${String(m).padStart(2,'0')}`);
    }
    months.reverse();
    sel1.innerHTML = months.map(m => `<option value="${m}">${m}</option>`).join('');
    sel2.innerHTML = months.map(m => `<option value="${m}">${m}</option>`).join('');
    // 기본값: 2026-01(전월) / 2026-02(당월)
    sel1.value = '2026-01';
    sel2.value = '2026-02';
  }

  async function fetchMonthClaims(ym) {
    const [y, m] = ym.split('-');
    const from = `${y}-${m}-01`;
    const lastDay = new Date(+y, +m, 0).getDate();
    const to = `${y}-${m}-${String(lastDay).padStart(2,'0')}`;
    const url = `${SUPABASE_URL}/rest/v1/claims?select=claim_id,claim_date,brand,country,item,category,defect_type,inspection_result,claim_detail,defective_part,cost`
      + `&claim_date=gte.${from}&claim_date=lte.${to}&brand=eq.시디즈`
      + `&category=in.(설계,제조,서비스,사양재검토,고객불만)&limit=5000`;
    const res = await fetch(url, { headers: HDR });
    if (!res.ok) return [];
    return res.json();
  }

  function countBy(arr, key) {
    const m = {};
    arr.forEach(r => { const v = r[key]||'미분류'; m[v] = (m[v]||0) + 1; });
    return m;
  }

  function topN(obj, n) {
    return Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n);
  }

  function chg(cur, prev) {
    const diff = cur - prev;
    const pct = prev > 0 ? ((diff/prev)*100).toFixed(1) : '-';
    const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '━';
    const color = diff > 0 ? 'var(--accent-rose)' : diff < 0 ? 'var(--accent-emerald)' : 'var(--text-muted)';
    return `<span style="color:${color};font-weight:600">${arrow}${Math.abs(diff)}건 (${diff>0?'+':''}${pct}%)</span>`;
  }

  function renderSummaryCards(cur, prev, curYm, prevYm) {
    const cc = cur.length, pc = prev.length;
    const ccKr = cur.filter(r=>r.country==='국내').length;
    const ccVn = cur.filter(r=>r.country==='베트남').length;
    const pcKr = prev.filter(r=>r.country==='국내').length;
    const pcVn = prev.filter(r=>r.country==='베트남').length;

    document.getElementById('kpiAnSummaryCards').innerHTML = `
      <div style="background:var(--sidiz-dark2);border:1px solid var(--border);border-radius:10px;padding:16px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">📦 클레임 건수</div>
        <div style="font-size:22px;font-weight:700;color:var(--sidiz-blue-bright);font-family:'JetBrains Mono',monospace">${cc}건</div>
        <div style="font-size:11px;margin-top:4px;color:var(--text-muted)">전월(${prevYm}) ${pc}건 ${chg(cc,pc)}</div>
      </div>
      <div style="background:var(--sidiz-dark2);border:1px solid var(--border);border-radius:10px;padding:16px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">🇰🇷 국내</div>
        <div style="font-size:22px;font-weight:700;color:var(--accent-cyan);font-family:'JetBrains Mono',monospace">${ccKr}건</div>
        <div style="font-size:11px;margin-top:4px;color:var(--text-muted)">전월 ${pcKr}건 ${chg(ccKr,pcKr)}</div>
      </div>
      <div style="background:var(--sidiz-dark2);border:1px solid var(--border);border-radius:10px;padding:16px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">🇻🇳 베트남</div>
        <div style="font-size:22px;font-weight:700;color:var(--accent-amber);font-family:'JetBrains Mono',monospace">${ccVn}건</div>
        <div style="font-size:11px;margin-top:4px;color:var(--text-muted)">전월 ${pcVn}건 ${chg(ccVn,pcVn)}</div>
      </div>`;
  }

  function renderCategoryTable(cur, prev) {
    const cc = countBy(cur,'category'), pc = countBy(prev,'category');
    const cats = ['제조','설계','서비스','사양재검토','고객불만'];
    const rows = cats.map(cat => {
      const c = cc[cat]||0, p = pc[cat]||0, d = c - p;
      const arrow = d > 0 ? `<span style="color:var(--accent-rose)">▲${d}</span>` : d < 0 ? `<span style="color:var(--accent-emerald)">▼${Math.abs(d)}</span>` : `<span style="color:var(--text-muted)">━</span>`;
      return `<tr>
        <td style="padding:7px 10px;font-weight:500">${cat}</td>
        <td style="padding:7px 10px;text-align:right;color:var(--text-muted);font-family:'JetBrains Mono',monospace">${p}건</td>
        <td style="padding:7px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-weight:600;color:var(--text-primary)">${c}건</td>
        <td style="padding:7px 10px;text-align:right">${arrow}</td>
      </tr>`;
    }).join('');
    document.getElementById('kpiAnCategoryTable').innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="border-bottom:1px solid var(--border)">
          <th style="padding:6px 10px;text-align:left;color:var(--text-muted);font-weight:500">유형</th>
          <th style="padding:6px 10px;text-align:right;color:var(--text-muted);font-weight:500">전월</th>
          <th style="padding:6px 10px;text-align:right;color:var(--text-muted);font-weight:500">당월</th>
          <th style="padding:6px 10px;text-align:right;color:var(--text-muted);font-weight:500">증감</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // ── 제품별 Top 5 (당월 건수 + 하자유형 세부 포함) ──
  function renderItemTop5WithCategory(elId, curData, prevData) {
    const CATS = ['제조','설계','서비스','사양재검토','고객불만'];
    // item이 null/빈값/'미분류'/'null'인 레코드 사전 제거
    const validItem = r => r.item && r.item.trim() && r.item !== '미분류' && r.item !== 'null';
    const curFiltered  = curData.filter(validItem);
    const prevFiltered = prevData.filter(validItem);
    const curCounts  = countBy(curFiltered,  'item');
    const prevCounts = countBy(prevFiltered, 'item');
    const top5 = topN(curCounts, 5);

    document.getElementById(elId).innerHTML = top5.map(([name, cnt], idx) => {
      const pc   = prevCounts[name] || 0;
      const diff = cnt - pc;
      const diffStr = diff > 0
        ? `<span style="color:var(--accent-rose);font-size:11px">▲${diff}</span>`
        : diff < 0
        ? `<span style="color:var(--accent-emerald);font-size:11px">▼${Math.abs(diff)}</span>`
        : `<span style="color:var(--text-muted);font-size:11px">━</span>`;

      // 이 제품의 카테고리별 분포
      const itemRows = curData.filter(r => r.item === name);
      const catMap   = countBy(itemRows, 'category');
      const catBars  = CATS
        .map(cat => catMap[cat] ? `<span>${cat} <b style="color:var(--text-primary)">${catMap[cat]}</b></span>` : '')
        .filter(Boolean).join('<span style="color:var(--border);margin:0 3px">|</span>');

      return `<div style="padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.07)">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px">
          <span style="color:var(--text-primary);font-weight:600">${idx+1}. ${name}</span>
          <span style="font-family:'JetBrains Mono',monospace;color:var(--accent-cyan)">${cnt}건 ${diffStr}</span>
        </div>
        ${catBars ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">${catBars}</div>` : ''}
      </div>`;
    }).join('') || '<div style="color:var(--text-muted);font-size:12px">데이터 없음</div>';
  }

  // ── 전월대비 증감이 큰 제품 Top 5 (+ 주요 하자유형) ──
  function renderItemDiffTop5(elId, curData, prevData) {
    // item이 null/빈값/'미분류'/'null'인 레코드 사전 제거
    const validItem = r => r.item && r.item.trim() && r.item !== '미분류' && r.item !== 'null';
    const curCounts  = countBy(curData.filter(validItem),  'item');
    const prevCounts = countBy(prevData.filter(validItem), 'item');

    const allItems = new Set([...Object.keys(curCounts), ...Object.keys(prevCounts)]);
    const ranked = Array.from(allItems)
      .map(item => ({ item, cur: curCounts[item]||0, prev: prevCounts[item]||0, diff: (curCounts[item]||0)-(prevCounts[item]||0) }))
      .filter(d => d.diff > 0)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 5);

    document.getElementById(elId).innerHTML = ranked.map(({item, cur, prev, diff}, idx) => {
      // 당월 이 제품에서 가장 많은 하자유형 2개
      const itemRows = curData.filter(r => r.item === item);
      const topCats  = topN(countBy(itemRows, 'category'), 2)
        .map(([cat, c]) => `<span>${cat} <b style="color:var(--text-primary)">${c}</b></span>`)
        .join('<span style="color:var(--border);margin:0 3px">|</span>');

      return `<div style="padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.07)">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px">
          <span style="color:var(--text-primary);font-weight:600">${idx+1}. ${item}</span>
          <span style="color:var(--accent-rose);font-family:'JetBrains Mono',monospace;font-weight:700">▲${diff}건</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">
          전월 ${prev}건 → 당월 ${cur}건
          ${topCats ? `<span style="margin-left:6px">${topCats}</span>` : ''}
        </div>
      </div>`;
    }).join('') || '<div style="color:var(--text-muted);font-size:12px;padding:8px 0">전월 대비 증가 제품 없음</div>';
  }

  // ── 실패비용 탭 자동 분석 ──
  function buildCostMonthOptions() {
    const sel1 = document.getElementById('costAnalysisPrevMonth');
    const sel2 = document.getElementById('costAnalysisCurMonth');
    if (!sel1 || !sel2) return;
    const now = new Date();
    const months = [];
    for (let y = 2024; y <= now.getFullYear(); y++) {
      const maxM = y === now.getFullYear() ? now.getMonth() + 1 : 12;
      for (let m = 1; m <= maxM; m++) months.push(`${y}-${String(m).padStart(2,'0')}`);
    }
    months.reverse();
    sel1.innerHTML = months.map(m => `<option value="${m}">${m}</option>`).join('');
    sel2.innerHTML = months.map(m => `<option value="${m}">${m}</option>`).join('');
    // 기본값: 2026-01(전월) / 2026-02(당월)
    sel1.value = '2026-01';
    sel2.value = '2026-02';
  }

  window.runCostAutoAnalysis = function() {
    const curYm  = document.getElementById('costAnalysisCurMonth').value;
    const prevYm = document.getElementById('costAnalysisPrevMonth').value;
    if (!curYm || !prevYm) return;

    document.getElementById('costAnalysisEmpty').style.display   = 'none';
    document.getElementById('costAnalysisResult').style.display  = 'none';
    document.getElementById('costAnalysisLoading').style.display = 'block';

    const costData = window.CostModule && window.CostModule.COST_DATA;
    const year = curYm.slice(0,4);
    const cd = costData && costData[year];

    document.getElementById('costAnalysisLoading').style.display = 'none';
    document.getElementById('costAnalysisResult').style.display  = 'block';

    if (!cd) {
      document.getElementById('costAnSummaryCards').innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);font-size:12px">${year}년 실패비용 데이터 없음</div>`;
      document.getElementById('costAnDetailTable').innerHTML = '';
      return;
    }

    const curM  = parseInt(curYm.slice(5))  - 1;
    const prevM = parseInt(prevYm.slice(5)) - 1;
    const toW   = v => (v && v > 0) ? Math.round(v/10000).toLocaleString() : '-';

    const curTotal  = ((cd.haza_subtotal||[])[curM]||0)  + ((cd.baros_subtotal||[])[curM]||0)  + ((cd.je_haza||[])[curM]||0);
    const prevTotal = ((cd.haza_subtotal||[])[prevM]||0) + ((cd.baros_subtotal||[])[prevM]||0) + ((cd.je_haza||[])[prevM]||0);
    const curRev    = (cd.revenue||[])[curM]||0;
    const prevRev   = (cd.revenue||[])[prevM]||0;
    const curRatio  = curRev  > 0 ? ((curTotal/curRev)*100).toFixed(2)   : '-';
    const prevRatio = prevRev > 0 ? ((prevTotal/prevRev)*100).toFixed(2) : '-';
    const totalDiff = curTotal - prevTotal;
    const totalArrow = totalDiff < 0
      ? `<span style="color:var(--accent-emerald);font-size:12px">▼ ${toW(Math.abs(totalDiff))}만원 감소</span>`
      : `<span style="color:var(--accent-rose);font-size:12px">▲ ${toW(Math.abs(totalDiff))}만원 증가</span>`;

    // 요약 카드 3개
    document.getElementById('costAnSummaryCards').innerHTML = `
      <div style="background:var(--sidiz-dark2);border:1px solid rgba(231,76,60,0.2);border-radius:10px;padding:16px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">💰 당월 실패비용 합계</div>
        <div style="font-size:22px;font-weight:700;color:var(--accent-rose);font-family:'JetBrains Mono',monospace">${toW(curTotal)}만원</div>
        <div style="font-size:11px;margin-top:4px">${totalArrow}</div>
      </div>
      <div style="background:var(--sidiz-dark2);border:1px solid var(--border);border-radius:10px;padding:16px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">📊 매출 대비 비율</div>
        <div style="font-size:22px;font-weight:700;color:var(--accent-amber);font-family:'JetBrains Mono',monospace">${curRatio}%</div>
        <div style="font-size:11px;margin-top:4px;color:var(--text-muted)">전월 ${prevRatio}% · 목표 <b style="color:var(--accent-emerald)">1.09%</b></div>
      </div>
      <div style="background:var(--sidiz-dark2);border:1px solid var(--border);border-radius:10px;padding:16px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">📈 매출액</div>
        <div style="font-size:22px;font-weight:700;color:var(--accent-cyan);font-family:'JetBrains Mono',monospace">${curRev > 0 ? (curRev/100000000).toFixed(1)+'억' : '-'}</div>
        <div style="font-size:11px;margin-top:4px;color:var(--text-muted)">전월 ${prevRev > 0 ? (prevRev/100000000).toFixed(1)+'억' : '-'}</div>
      </div>`;

    // 상세 테이블
    const items = [
      ['(판)하자보수비 계', cd.haza_subtotal,  true],
      ['ㄴ 제품비',        cd.haza_product,   false],
      ['ㄴ 자재비',        cd.haza_material,  false],
      ['ㄴ 클레임보상',    cd.haza_claim,     false],
      ['(제)하자보수비',   cd.je_haza,        true],
      ['바로스 AS 계',     cd.baros_subtotal, true],
      ['ㄴ AS컨택센터',    cd.baros_contact,  false],
      ['ㄴ AS조치비(무상)',cd.baros_as,       false],
      ['ㄴ AS물류비',      cd.baros_logistics,false],
    ];
    const rows = items.map(([label, arr, isMain]) => {
      const p = (arr||[])[prevM]||0, c = (arr||[])[curM]||0;
      const diff = c - p;
      const arrow = diff > 0
        ? `<span style="color:var(--accent-rose)">▲${toW(Math.abs(diff))}</span>`
        : diff < 0
        ? `<span style="color:var(--accent-emerald)">▼${toW(Math.abs(diff))}</span>`
        : '<span style="color:var(--text-muted)">━</span>';
      return `<tr style="${isMain?'border-top:1px solid var(--border)':''}">
        <td style="padding:6px 10px;font-size:12px;font-weight:${isMain?'600':'400'};color:${isMain?'var(--text-primary)':'var(--text-secondary)'}">${label}</td>
        <td style="padding:6px 10px;text-align:right;font-size:12px;color:var(--text-muted);font-family:'JetBrains Mono',monospace">${toW(p)}만</td>
        <td style="padding:6px 10px;text-align:right;font-size:12px;font-family:'JetBrains Mono',monospace;font-weight:${isMain?'600':'400'}">${toW(c)}만</td>
        <td style="padding:6px 10px;text-align:right;font-size:11px">${arrow}</td>
      </tr>`;
    }).join('');
    document.getElementById('costAnDetailTable').innerHTML = `
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="border-bottom:1px solid var(--border)">
          <th style="padding:6px 10px;text-align:left;font-size:11px;color:var(--text-muted);font-weight:500">항목</th>
          <th style="padding:6px 10px;text-align:right;font-size:11px;color:var(--text-muted);font-weight:500">전월 (${prevYm})</th>
          <th style="padding:6px 10px;text-align:right;font-size:11px;color:var(--text-muted);font-weight:500">당월 (${curYm})</th>
          <th style="padding:6px 10px;text-align:right;font-size:11px;color:var(--text-muted);font-weight:500">증감</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    // 메모 로드
    if (window.loadKpiNote) window.loadKpiNote('cost', curYm);
  };

  // 실패비용 탭 열릴 때 월 옵션 초기화
  const _origShowKpiTabCost = window.showKpiTab;
  window.showKpiTab = function(id, el) {
    if (_origShowKpiTabCost) _origShowKpiTabCost(id, el);
    if (id === 'cost-kpi') buildCostMonthOptions();
  };
  document.addEventListener('DOMContentLoaded', buildCostMonthOptions);

  window.runKpiAutoAnalysis = async function() {
    const curYm = document.getElementById('analysisCurMonth').value;
    const prevYm = document.getElementById('analysisPrevMonth').value;
    if (!curYm || !prevYm) return;

    document.getElementById('kpiAnalysisEmpty').style.display = 'none';
    document.getElementById('kpiAnalysisResult').style.display = 'none';
    document.getElementById('kpiAnalysisLoading').style.display = 'block';

    const [curData, prevData] = await Promise.all([fetchMonthClaims(curYm), fetchMonthClaims(prevYm)]);

    // 엑셀 export용 캐시
    window._kpiAnLastData = { curData, prevData, curYm, prevYm };

    document.getElementById('kpiAnalysisLoading').style.display = 'none';
    document.getElementById('kpiAnalysisResult').style.display = 'block';

    renderSummaryCards(curData, prevData, curYm, prevYm);
    renderCategoryTable(curData, prevData);
    renderItemTop5WithCategory('kpiAnItemTable', curData, prevData);
    renderItemDiffTop5('kpiAnPartTable', curData, prevData);

    // 메모 로드
    if (window._kpiNoteCurrentYm !== curYm) {
      window._kpiNoteCurrentYm = curYm;
      if (window.loadKpiNote) window.loadKpiNote('claim', curYm);
    }
  };

  // DOM 준비 후 월 옵션 초기화
  document.addEventListener('DOMContentLoaded', buildMonthOptions);
  // KPI 탭 열릴 때도 초기화 (혹시 DOM이 늦게 생성되는 경우)
  const origShowKpiTab = window.showKpiTab;
  window.showKpiTab = function(id, el) {
    if (origShowKpiTab) origShowKpiTab(id, el);
    if (id === 'claim-kpi') buildMonthOptions();
  };
})();

// ========== 접수일 기준 클레임 대시보드 ==========
let _rctAllData = [];           // 전체 데이터 캐시
let _rctFilteredData = [];      // 필터된 데이터
let _rctSelectedProduct = 'all';
let _rctDateMode = 'receipt';   // 'receipt' = 접수일 기준 | 'uploaded' = 업로드일 기준
let _rctChartTrend = null;
let _rctChartCat = null;
let _rctChartProd = null;

// 날짜 기준 모드 전환
function setRctDateMode(mode) {
  _rctDateMode = mode;
  const btnReceipt  = document.getElementById('rctModeReceipt');
  const btnUploaded = document.getElementById('rctModeUploaded');

  if (mode === 'receipt') {
    btnReceipt.style.background  = 'var(--sidiz-blue)';
    btnReceipt.style.color       = 'white';
    btnUploaded.style.background = 'var(--sidiz-card)';
    btnUploaded.style.color      = 'var(--text-muted)';
  } else {
    btnUploaded.style.background = 'var(--sidiz-blue)';
    btnUploaded.style.color      = 'white';
    btnReceipt.style.background  = 'var(--sidiz-card)';
    btnReceipt.style.color       = 'var(--text-muted)';
  }
  // 헤더 타이틀 동기화
  const titleEl = document.querySelector('#claim-receipt .section-title span');
  if (titleEl) titleEl.textContent = mode === 'uploaded' ? '(업로드일 기준)' : '(접수일 기준)';
  loadReceiptDashboard();
}

// 날짜 기본값 세팅 (이번달 1일 ~ 오늘)
function initReceiptDateDefaults() {
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth();
  const firstDay = `${y}-${String(m+1).padStart(2,'0')}-01`;
  const todayStr = today.toISOString().split('T')[0];
  const fromEl = document.getElementById('rctDateFrom');
  const toEl   = document.getElementById('rctDateTo');
  if (fromEl && !fromEl.value) fromEl.value = firstDay;
  if (toEl   && !toEl.value)   toEl.value   = todayStr;
}

function setRctQuick(period) {
  const today = new Date();
  const toStr = today.toISOString().split('T')[0];
  let from = new Date();
  if (period === '1w')  from.setDate(today.getDate() - 7);
  else if (period === '1m') from.setMonth(today.getMonth() - 1);
  else if (period === '3m') from.setMonth(today.getMonth() - 3);
  else if (period === 'all') { document.getElementById('rctDateFrom').value = '2020-01-01'; document.getElementById('rctDateTo').value = toStr; loadReceiptDashboard(); return; }
  document.getElementById('rctDateFrom').value = from.toISOString().split('T')[0];
  document.getElementById('rctDateTo').value = toStr;
  loadReceiptDashboard();
}

function onRctProductChange() {
  _rctSelectedProduct = document.getElementById('rctProductFilter').value;
  _applyRctFilter();
}

async function loadReceiptDashboard() {
  const from = document.getElementById('rctDateFrom').value;
  const to   = document.getElementById('rctDateTo').value;
  if (!from || !to) { alert('기간을 선택해 주세요.'); return; }

  // 조회 버튼 로딩 상태
  const btn = document.querySelector('#claim-receipt button[onclick="loadReceiptDashboard()"]');
  if (btn) { btn.textContent = '로딩중...'; btn.disabled = true; }

  try {
    const data = _rctDateMode === 'uploaded'
      ? await SupabaseClient.fetchReceiptByUploadedDate(from, to)
      : await SupabaseClient.fetchReceiptByDateRange(from, to);
    _rctAllData = data || [];

    // 제품 필터 드롭다운 업데이트
    const products = [...new Set(_rctAllData.map(d => d.item).filter(Boolean))].sort();
    const sel = document.getElementById('rctProductFilter');
    const curVal = sel.value;
    sel.innerHTML = '<option value="all">전체 제품구분</option>' + products.map(p => `<option value="${p}">${p}</option>`).join('');
    if (products.includes(curVal)) sel.value = curVal;
    _rctSelectedProduct = sel.value;

    // 미분류 배지 — symptom_pending 실제 검토 큐 기준 (claims_receipt null 건수 아님)
    try {
      const pendingCnt = await SupabaseClient.countPending();
      _rctPendingQueueCount = pendingCnt;   // 요약 카드에서도 재사용
      const badge = document.getElementById('pendingBadge');
      const cnt   = document.getElementById('pendingCount');
      if (badge && cnt) { cnt.textContent = pendingCnt; badge.style.display = pendingCnt > 0 ? '' : 'none'; }
    } catch(_) {}

    _applyRctFilter();
  } catch(e) {
    alert('조회 오류: ' + e.message);
  } finally {
    if (btn) { btn.textContent = '조회'; btn.disabled = false; }
  }
}

function _applyRctFilter() {
  // 1단계: 제품 필터 (요약 카드용 — 미분류 포함 전체)
  const productFiltered = _rctSelectedProduct === 'all'
    ? _rctAllData
    : _rctAllData.filter(d => d.item === _rctSelectedProduct);

  // 2단계: 미분류 제외 (차트·테이블용)
  _rctFilteredData = productFiltered.filter(d =>
    d.defect_normalized &&
    d.defect_normalized.trim() !== '' &&
    d.defect_normalized !== '미분류' &&
    d.defect_normalized !== '(미분류)'
  );

  const empty = document.getElementById('rctEmptyState');
  const cards = document.getElementById('rctSummaryCards');
  if (_rctAllData.length === 0) {
    if (empty) empty.style.display = '';
    if (cards) cards.style.display = 'none';
    return;
  }
  if (empty) empty.style.display = 'none';
  if (cards) cards.style.display = 'flex';

  _renderRctSummary(_rctFilteredData);  // 총 클레임 카드 = 차트 건수 일치 (미분류 제외)
  _renderRctTrend();
  _renderRctCategory();
  _renderRctProductChart();
  _renderRctDefectChips();
  closeDefectDetail();
}

function _renderRctSummary(filteredData) {
  // 총 클레임·차트·테이블 모두 미분류 제외 기준(_rctFilteredData)으로 통일
  const data = filteredData || _rctFilteredData;
  const total = data.length;
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  const dateField = _rctDateMode === 'uploaded' ? 'uploaded_at' : 'receipt_date';
  const monthCount = data.filter(d => d[dateField] && d[dateField].startsWith(thisMonth)).length;
  // 분류완료: 미분류 제외 데이터이므로 defect_normalized 있는 건수 = 전체
  const classified = data.filter(d => d.defect_normalized).length;
  const rate = total > 0 ? ((classified / total) * 100).toFixed(1) : '0.0';

  _animateCounter('rctCardTotal', total);
  document.getElementById('rctCardTotalSub').textContent = `${[...new Set(data.map(d=>d.item).filter(Boolean))].length}개 제품구분`;
  _animateCounter('rctCardMonth', monthCount);
  document.getElementById('rctCardMonthSub').textContent = `${thisMonth} 기준`;
  _animateCounter('rctCardClassified', classified);
  document.getElementById('rctCardClassifiedSub').textContent = `자동분류율 ${rate}%`;
  _animateCounter('rctCardPending', _rctPendingQueueCount); // symptom_pending 검토 큐 기준
}

function _animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = 0, duration = 900;
  const startTime = performance.now();
  function tick(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + (target - start) * eased).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function _renderRctTrend() {
  const data = _rctFilteredData;
  // 날짜별 집계 (모드에 따라 접수일 / 업로드일 기준 전환)
  const dateField = _rctDateMode === 'uploaded' ? 'uploaded_at' : 'receipt_date';
  const byDate = {};
  data.forEach(d => {
    const dt = d[dateField] || 'unknown';
    if (dt !== 'unknown') byDate[dt] = (byDate[dt] || 0) + 1;
  });
  const labels = Object.keys(byDate).sort();
  const values = labels.map(l => byDate[l]);

  const titleEl = document.getElementById('rctTrendTitle');
  if (titleEl) {
    const from = document.getElementById('rctDateFrom')?.value || '';
    const to = document.getElementById('rctDateTo')?.value || '';
    const modeLabel = _rctDateMode === 'uploaded' ? '업로드일별' : '접수일별';
    titleEl.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:var(--accent-cyan);display:inline-block"></span> ${modeLabel} 클레임 추이 <span style="font-size:10px;color:var(--text-muted);font-weight:400">(${from} ~ ${to}, 일별)</span>`;
  }
  if (_rctChartTrend) _rctChartTrend.destroy();
  const ctx = document.getElementById('rctTrendChart');
  if (!ctx) return;
  _rctChartTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '접수 건수',
        data: values,
        borderColor: '#002BD2',
        backgroundColor: 'rgba(0,43,210,0.08)',
        borderWidth: 2.5,
        pointRadius: labels.length > 30 ? 2 : 5,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#002BD2',
        pointBorderWidth: 2,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#002BD2',
        fill: true,
        tension: 0.4,
      }]
    },
    plugins: [{
      id: 'trendGradient',
      beforeDatasetsDraw(chart) {
        const { ctx: c, chartArea } = chart;
        if (!chartArea) return;
        const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        grad.addColorStop(0, 'rgba(0,43,210,0.22)');
        grad.addColorStop(0.55, 'rgba(0,43,210,0.05)');
        grad.addColorStop(1, 'rgba(0,43,210,0.00)');
        chart.data.datasets[0].backgroundColor = grad;
      }
    }],
    options: {
      responsive: true,
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.05)', drawTicks: false },
          ticks: { color: '#8a8a9a', font: { size: 10, family: "'JetBrains Mono'" }, maxTicksLimit: 12, padding: 6 },
          border: { dash: [3, 3] }
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          beginAtZero: true,
          ticks: { stepSize: 1, color: '#8a8a9a', font: { size: 10, family: "'JetBrains Mono'" }, callback: v => Number.isInteger(v) ? v : '' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#ffffff',
          titleColor: '#111111',
          bodyColor: '#444455',
          borderColor: '#E2E2EA',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          titleFont: { family: "'Noto Sans KR'", weight: '700' },
          bodyFont: { family: "'Noto Sans KR'" },
          callbacks: {
            label: ctx => ` ${ctx.parsed.y}건`
          }
        }
      },
      animation: { duration: 1000, easing: 'easeOutQuart' }
    }
  });
}

// ── 카테고리 그룹 추출 및 고정 색상 시스템 ────────────────────────────────────
// "외관(오염)" → "외관", "작동성" → "작동성"
function getCatGroup(cat) {
  if (!cat) return null;
  const idx = cat.indexOf('(');
  return idx > 0 ? cat.substring(0, idx).trim() : cat;
}
// 고정 카테고리 목록 (이 외의 카테고리는 '기타'로 표시)
const FIXED_CATS = ['파손','작동성','체결','유격','소음','외관','오접수','수평','누락','시공불만'];
const _CAT_BASE_COLORS = {
  '파손':'#ff6b7a', '작동성':'#4a9eff', '체결':'#00c48c',
  '유격':'#a78bfa', '소음':'#ffb347',   '외관':'#f59e0b',
  '오접수':'#94a3b8','수평':'#00c6d7',  '누락':'#fb923c',
  '시공불만':'#e879f9','기타':'#64748b'
};
function getCatColorHex(cat) {
  if (!cat) return _CAT_BASE_COLORS['기타'];
  const group = getCatGroup(cat);
  // 고정 목록에 있으면 해당 색상, 없으면 기타 색상
  return _CAT_BASE_COLORS[group] || _CAT_BASE_COLORS['기타'];
}

let _rctPendingQueueCount = 0;    // symptom_pending 실제 검토 큐 수
let _rctSelectedCatGroup = null;

function _renderRctCategory() {
  const data = _rctFilteredData;
  // 부모 그룹 기준 집계, 고정 목록 외 → '기타'
  const counts = {};
  data.forEach(d => {
    if (!d.defect_category) return;
    const group = getCatGroup(d.defect_category);
    const key = FIXED_CATS.includes(group) ? group : '기타';
    counts[key] = (counts[key] || 0) + 1;
  });
  // 기타는 항상 마지막, 나머지는 건수 내림차순
  const entries = Object.entries(counts)
    .sort((a,b) => {
      if (a[0]==='기타') return 1;
      if (b[0]==='기타') return -1;
      return b[1]-a[1];
    });
  const labels = entries.map(e => e[0]);
  const values = entries.map(e => e[1]);
  const colors = labels.map(l => getCatColorHex(l));

  if (_rctChartCat) _rctChartCat.destroy();
  const ctx = document.getElementById('rctCategoryChart');
  if (!ctx) return;
  // 브랜드 컬러 팔레트 (세련된 그라데이션 색상)
  const BRAND_CAT_COLORS = {
    '파손':    { solid: '#FF4C6A', light: 'rgba(255,76,106,0.15)' },
    '작동성':  { solid: '#002BD2', light: 'rgba(0,43,210,0.13)' },
    '체결':    { solid: '#00B87A', light: 'rgba(0,184,122,0.13)' },
    '유격':    { solid: '#7c5fe6', light: 'rgba(124,95,230,0.13)' },
    '소음':    { solid: '#E6A800', light: 'rgba(230,168,0,0.15)' },
    '외관':    { solid: '#F59E0B', light: 'rgba(245,158,11,0.13)' },
    '오접수':  { solid: '#94A3B8', light: 'rgba(148,163,184,0.15)' },
    '수평':    { solid: '#54DBC2', light: 'rgba(84,219,194,0.13)' },
    '누락':    { solid: '#FF6C39', light: 'rgba(255,108,57,0.13)' },
    '시공불만':{ solid: '#D946EF', light: 'rgba(217,70,239,0.13)' },
    '기타':    { solid: '#64748B', light: 'rgba(100,116,139,0.13)' }
  };
  const barBg = labels.map(l => (BRAND_CAT_COLORS[l] || BRAND_CAT_COLORS['기타']).solid + 'cc');
  const barBorder = labels.map(l => (BRAND_CAT_COLORS[l] || BRAND_CAT_COLORS['기타']).solid);

  _rctChartCat = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: barBg,
        borderColor: barBorder,
        borderWidth: 0,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      cursor: 'pointer',
      layout: { padding: { right: 48 } },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)', drawTicks: false },
          beginAtZero: true,
          ticks: { color: '#8a8a9a', font: { size: 10, family: "'JetBrains Mono'" }, callback: v => Number.isInteger(v) ? v : '' }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#222233', font: { size: 12, weight: '700', family: "'Noto Sans KR'" }, padding: 4 }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#ffffff',
          titleColor: '#111111',
          bodyColor: '#444455',
          borderColor: '#E2E2EA',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: ctx => ` ${ctx.parsed.x}건  (클릭 시 상세)`,
            title: ctx => ctx[0]?.label ? `📂 ${ctx[0].label}` : ''
          }
        }
      },
      animation: { duration: 900, delay: ctx => ctx.dataIndex * 70 },
      onClick(e, elements) {
        if (!elements.length) return;
        const idx = elements[0].index;
        const catGroup = labels[idx];
        _rctSelectedCatGroup = catGroup;
        _rctSelectedDefect = null;
        _renderRctDefectChips();
        _showDefectDetail(null, catGroup);
      }
    },
    plugins: [{
      afterDatasetsDraw(chart) {
        const { ctx: c } = chart;
        chart.data.datasets.forEach((ds, i) => {
          chart.getDatasetMeta(i).data.forEach((bar, idx) => {
            const val = ds.data[idx];
            if (!val) return;
            c.save();
            c.fillStyle = '#333344';
            c.font = 'bold 11px "JetBrains Mono", monospace';
            c.textAlign = 'left';
            c.textBaseline = 'middle';
            c.fillText(`${val}건`, bar.x + 8, bar.y);
            c.restore();
          });
        });
      }
    }]
  });
  // 캔버스 커서 스타일
  if (ctx.canvas) ctx.canvas.style.cursor = 'pointer';
}

function _renderRctProductChart() {
  const data = _rctFilteredData;
  const byProd = {};
  data.forEach(d => {
    const p = d.item || '기타';
    byProd[p] = (byProd[p] || 0) + 1;
  });
  const sorted = Object.entries(byProd).sort((a,b) => b[1]-a[1]).slice(0, 10);
  const labels = sorted.map(([k]) => k);
  const values = sorted.map(([,v]) => v);
  // SIDIZ 브랜드 기반 제품 팔레트 (채도 높고 선명한 색상)
  const palette = ['#002BD2','#FF4C6A','#00B87A','#E6A800','#7c5fe6','#54DBC2','#FF6C39','#1A59FF','#D946EF','#64748B'];

  if (_rctChartProd) _rctChartProd.destroy();
  const ctx = document.getElementById('rctProductChart');
  if (!ctx) return;
  _rctChartProd = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette.slice(0, labels.length),
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 10,
        hoverBorderColor: '#ffffff',
      }]
    },
    options: {
      responsive: true,
      aspectRatio: 2,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            padding: 14,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 12, family: "'Noto Sans KR'", weight: '600' },
            boxWidth: 10,
            color: '#333344',
            generateLabels(chart) {
              const data = chart.data;
              return data.labels.map((label, i) => ({
                text: `${label}  ${data.datasets[0].data[i]}건`,
                fillStyle: data.datasets[0].backgroundColor[i],
                strokeStyle: '#ffffff',
                lineWidth: 2,
                hidden: false,
                index: i,
                datasetIndex: 0,
              }));
            }
          }
        },
        tooltip: {
          backgroundColor: '#ffffff',
          titleColor: '#111111',
          bodyColor: '#444455',
          borderColor: '#E2E2EA',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed}건 (${((ctx.parsed / values.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)`,
            footer: () => '클릭하면 증상·상세 조회'
          }
        }
      },
      animation: { animateRotate: true, duration: 1200, easing: 'easeOutQuart' },
      onClick(e, elements) {
        if (!elements.length) return;
        const productName = labels[elements[0].index];
        // 같은 제품 재클릭 → 필터 해제
        if (_rctChartProductFilter === productName) {
          closeDefectDetail();
          return;
        }
        _rctChartProductFilter = productName;
        _rctSelectedCatGroup   = null;
        _rctSelectedDefect     = null;
        _renderRctDefectChips();
        _showDefectDetail(null, null);  // 제품 필터만으로 전체 표시
      }
    }
  });
  if (ctx.canvas) ctx.canvas.style.cursor = 'pointer';
}

let _rctSelectedDefect = null;
let _rctChartProductFilter = null;   // 도넛 차트 제품 클릭 필터
let _rctDefectTrendChart = null;
let _rctDetailSorted = [];           // 현재 상세 테이블에 표시 중인 행 (삭제 참조용)

function _renderRctDefectChips() {
  // 1단계: 제품 필터 (도넛 차트 클릭)
  const productData = _rctChartProductFilter
    ? _rctFilteredData.filter(d => d.item === _rctChartProductFilter)
    : _rctFilteredData;

  // 2단계: 카테고리 필터 (카테고리 바 클릭)
  const chipData = _rctSelectedCatGroup
    ? productData.filter(d => getCatGroup(d.defect_category) === _rctSelectedCatGroup)
    : productData;

  const byDefect = {};
  chipData.forEach(d => {
    const key = d.defect_normalized || '(미분류)';
    if (!byDefect[key]) byDefect[key] = 0;
    byDefect[key]++;
  });
  const sorted = Object.entries(byDefect).sort((a,b) => b[1]-a[1]);
  const chips = document.getElementById('rctDefectChips');
  const total = document.getElementById('rctDefectChipTotal');
  if (!chips) return;

  // 타이틀: 활성 필터 표시
  if (total) {
    const parts = [];
    if (_rctChartProductFilter) parts.push(_rctChartProductFilter);
    if (_rctSelectedCatGroup)   parts.push(_rctSelectedCatGroup);
    total.textContent = parts.length
      ? `[${parts.join(' · ')}] 증상 ${sorted.length}가지`
      : `총 ${sorted.length}가지 증상`;
  }

  const totalCount = chipData.length;
  const hasFilter = !!(_rctSelectedDefect || _rctSelectedCatGroup || _rctChartProductFilter);
  // 필터 활성 시 '전체' 칩은 초기화 버튼 역할
  const allChip = `<div class="rct-product-chip ${hasFilter ? '' : 'active'}"
    onclick="closeDefectDetail()"
    style="border-color:${!hasFilter ? 'var(--accent-cyan)' : 'var(--border)'};${hasFilter ? 'opacity:0.6' : ''}">
    <div class="chip-name" style="word-break:keep-all;white-space:normal;line-height:1.3">${hasFilter ? '✕ 초기화' : '전체'}</div>
    <div class="chip-count" style="color:var(--accent-cyan)">${totalCount}</div>
    <div class="chip-sub">건</div>
  </div>`;

  chips.innerHTML = allChip + sorted.map(([name, cnt]) => {
    const isActive = name === _rctSelectedDefect;
    return `<div class="rct-product-chip ${isActive ? 'active' : ''}"
      onclick="selectDefectChip('${name.replace(/'/g,"\\'")}')">
      <div class="chip-name" style="word-break:keep-all;white-space:normal;line-height:1.3" title="${name}">${name}</div>
      <div class="chip-count">${cnt}</div>
      <div class="chip-sub">건</div>
      ${isActive ? '<div class="chip-sub" style="color:var(--accent-rose);font-size:10px">▼ 보는 중</div>' : ''}
    </div>`;
  }).join('');
}

function selectDefectChip(defectName) {
  // 이미 선택된 칩 재클릭 → 필터 해제
  if (defectName === _rctSelectedDefect) {
    closeDefectDetail();
    return;
  }
  _rctSelectedDefect = defectName;
  _rctSelectedCatGroup = null;
  _renderRctDefectChips();
  _showDefectDetail(defectName);
}

// ── 상세 테이블 선택 삭제 ──
async function deleteSelectedDetailRows() {
  const checks = document.querySelectorAll('#rctDetailTableBody input[type="checkbox"]:checked');
  if (!checks.length) { alert('삭제할 항목을 선택해 주세요.'); return; }

  const toDelete = Array.from(checks).map(cb => {
    const idx = parseInt(cb.dataset.idx);
    return _rctDetailSorted[idx];
  }).filter(Boolean);

  if (!confirm(`선택한 ${toDelete.length}건을 claims_receipt에서 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`)) return;

  const btn = document.getElementById('rctDeleteSelectedBtn');
  if (btn) { btn.disabled = true; btn.textContent = '삭제 중...'; }

  try {
    const BASE = SupabaseClient.SUPABASE_URL;
    const KEY  = SupabaseClient.SUPABASE_ANON_KEY;
    await Promise.all(toDelete.map(d =>
      fetch(`${BASE}/rest/v1/claims_receipt?receipt_id=eq.${encodeURIComponent(d.receipt_id)}&seq_no=eq.${d.seq_no}`, {
        method: 'DELETE',
        headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' }
      })
    ));

    // 메모리에서도 제거
    const deleteSet = new Set(toDelete.map(d => `${d.receipt_id}::${d.seq_no}`));
    _rctAllData = _rctAllData.filter(d => !deleteSet.has(`${d.receipt_id}::${d.seq_no}`));

    // 차트·카드 전체 갱신
    _applyRctFilter();
    // 상세 패널 닫기
    closeDefectDetail();

    // 삭제 완료 토스트
    const toast = document.createElement('div');
    toast.textContent = `✅ ${toDelete.length}건 삭제 완료`;
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#00c48c;color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,196,140,0.3)';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  } catch(e) {
    alert('삭제 오류: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🗑 선택 삭제'; }
  }
}

function closeDefectDetail() {
  _rctSelectedDefect      = null;
  _rctSelectedCatGroup    = null;
  _rctChartProductFilter  = null;
  _renderRctDefectChips();
  _renderRctCategory();
  const panel = document.getElementById('rctDefectDetail');
  if (panel) panel.style.display = 'none';
}

// defectName: 증상명 or '__ALL__' / catGroup: 카테고리 그룹 필터 (선택)
function _showDefectDetail(defectName, catGroup) {
  const panel = document.getElementById('rctDefectDetail');
  if (!panel) return;
  panel.style.display = '';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // 기본 데이터: 제품 필터(도넛 클릭) 우선 적용
  const baseData = _rctChartProductFilter
    ? _rctFilteredData.filter(d => d.item === _rctChartProductFilter)
    : _rctFilteredData;

  const prodPrefix = _rctChartProductFilter ? `[${_rctChartProductFilter}] ` : '';

  let matched;
  let titleText;
  if (catGroup) {
    matched = catGroup === '__ALL__'
      ? [...baseData]
      : baseData.filter(d => getCatGroup(d.defect_category) === catGroup);
    titleText = `📌 ${prodPrefix}${catGroup === '__ALL__' ? '전체 클레임' : '['+catGroup+'] 카테고리'} — 상세 내역`;
  } else if (!defectName || defectName === '__ALL__') {
    matched = [...baseData];
    titleText = `📌 ${prodPrefix}전체 클레임 — 상세 내역`;
  } else {
    matched = baseData.filter(d => (d.defect_normalized || '(미분류)') === defectName);
    titleText = `📌 ${prodPrefix}${defectName} — 상세 내역`;
  }

  // 타이틀 + 건수
  document.getElementById('rctDetailTitle').textContent = titleText;
  document.getElementById('rctDetailCount').textContent = `총 ${matched.length}건`;

  // 일별 추이 차트 (필터 기간 전체 기준)
  const fromStr = document.getElementById('rctDateFrom').value || '';
  const toStr   = document.getElementById('rctDateTo').value || '';

  // 필터 기간 내 전체 날짜 생성
  const dayLabels = [];
  if (fromStr && toStr) {
    let cur = new Date(fromStr);
    const end = new Date(toStr);
    while (cur <= end) {
      dayLabels.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
  }

  // 일별 집계
  const byDay = {};
  matched.forEach(d => {
    if (d.receipt_date) byDay[d.receipt_date] = (byDay[d.receipt_date] || 0) + 1;
  });

  const labels = dayLabels.length > 0 ? dayLabels : Object.keys(byDay).sort();
  const values = labels.map(d => byDay[d] || 0);

  if (_rctDefectTrendChart) _rctDefectTrendChart.destroy();
  const ctx = document.getElementById('rctDefectTrendChart');
  if (ctx) {
    _rctDefectTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '접수 건수',
          data: values,
          borderColor: '#ff6b7a',
          backgroundColor: 'rgba(255,107,122,0.08)',
          borderWidth: 2,
          pointRadius: labels.length > 60 ? 0 : 3,
          pointBackgroundColor: '#ff6b7a',
          fill: true,
          tension: 0.3,
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { font: { size: 10 }, maxTicksLimit: 15 } },
          y: { grid: { color: 'rgba(0,0,0,0.06)' }, beginAtZero: true, ticks: { stepSize: 1 } }
        },
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#ffffff', callbacks: { label: c => `${c.parsed.y}건` } }
        },
        animation: { duration: 700 }
      }
    });
  }

  // 상세 테이블 (접수일 오름차순)
  const sorted = [...matched].sort((a,b) => (a.receipt_date||'').localeCompare(b.receipt_date||''));
  _rctDetailSorted = sorted;  // 전역에 저장 (삭제 시 참조)
  const tbody = document.getElementById('rctDetailTableBody');
  if (!tbody) return;

  // 전체 선택 체크박스 초기화
  const selectAllCb = document.getElementById('rctSelectAll');
  if (selectAllCb) selectAllCb.checked = false;

  const CATS = ['작동성','소음','파손','유격','수평','체결','외관','기타'];

  tbody.innerHTML = sorted.map((d, idx) => {
    const rowId = `row_${idx}`;
    return `<tr id="${rowId}" style="border-bottom:1px solid rgba(0,0,0,0.06)" onmouseover="this.style.background='rgba(0,43,210,0.03)'" onmouseout="this.style.background=''">
      <td style="padding:7px 8px;text-align:center">
        <input type="checkbox" data-idx="${idx}" style="cursor:pointer;width:14px;height:14px;accent-color:var(--accent-rose)">
      </td>
      <td style="padding:7px 10px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-primary);white-space:nowrap">${d.receipt_id||'-'}</td>
      <td style="padding:7px 10px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px">${d.seq_no||'-'}</td>
      <td style="padding:7px 10px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;white-space:nowrap">${d.receipt_date||'-'}</td>
      <td style="padding:7px 10px;text-align:center;font-size:11px;font-weight:600;white-space:nowrap;cursor:pointer"
          onclick="startEdit(this,'item','${(d.receipt_id||'').replace(/'/g,"\\'").replace(/\\/g,'\\\\')}',${d.seq_no||1},'','${(d.item||'').replace(/'/g,"\\'").replace(/\\/g,'\\\\')}','')"
          title="클릭하여 제품구분 편집">${d.item||'<span style="color:var(--accent-violet);font-style:italic">미확인</span>'}</td>
      <td style="padding:7px 10px;cursor:pointer;color:var(--accent-emerald)"
          onclick="startEdit(this,'defect_normalized','${(d.receipt_id||'').replace(/'/g,"\\'").replace(/\\/g,'\\\\') }',${d.seq_no||1},'${(d.raw_symptom||'').replace(/'/g,"\\'").replace(/\n/g,' ').replace(/\\/g,'\\\\')}','${(d.defect_normalized||'').replace(/'/g,"\\'").replace(/\\/g,'\\\\')}','${(d.defect_category||'기타').replace(/'/g,"\\'")}')"
          title="클릭하여 편집">${d.defect_normalized||'<span style="color:var(--text-muted);font-style:italic">미분류</span>'}</td>
      <td style="padding:7px 10px;text-align:center;cursor:pointer"
          onclick="startEdit(this,'defect_category','${(d.receipt_id||'').replace(/'/g,"\\'").replace(/\\/g,'\\\\')}',${d.seq_no||1},'${(d.raw_symptom||'').replace(/'/g,"\\'").replace(/\n/g,' ').replace(/\\/g,'\\\\')}','${(d.defect_normalized||'').replace(/'/g,"\\'").replace(/\\/g,'\\\\')}','${(d.defect_category||'').replace(/'/g,"\\'")}')"
          title="클릭하여 편집">${(() => { const c=d.defect_category; if(!c) return '<span style="color:var(--text-muted)">-</span>'; const col=getCatColorHex(c); return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;color:${col};background:${col}1a;border:1px solid ${col}44">${c}</span>`; })()}</td>
      <td style="padding:7px 10px;cursor:pointer;color:var(--accent-amber);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
          onclick="showDetailPopover(event,'${encodeURIComponent(d.claim_detail||'')}')"
          title="클릭하여 전체 내용 보기">${(d.claim_detail||'-').substring(0,40)}${(d.claim_detail||'').length>40?'…':''}</td>
    </tr>`;
  }).join('');

  // 합계 행 (colspan 8로 수정)
  const tfoot = document.getElementById('rctDetailTableFoot');
  if (tfoot) {
    tfoot.innerHTML = `<tr style="background:rgba(255,255,255,0.97)">
      <td colspan="8" style="padding:8px 12px;text-align:right;color:var(--text-muted);font-size:11px;font-weight:600;border-top:2px solid var(--border)">
        합계&nbsp;<span style="color:var(--accent-amber);font-size:13px;font-weight:700">${sorted.length}</span>건
      </td>
    </tr>`;
  }
}

// ── 인라인 편집 ──
function startEdit(cell, field, receiptId, seqNo, rawSymptom, currentNorm, currentCat) {
  if (cell.querySelector('input,select')) return; // already editing
  const originalText = cell.textContent.trim();
  const originalHTML = cell.innerHTML;

  // datalist / input 생성
  const input = document.createElement('input');
  input.type = 'text';
  if (field === 'defect_category') {
    input.value = currentCat || originalText || '';
    input.placeholder = '예: 외관(오염), 작동성 등';
    input.style.cssText = 'background:var(--sidiz-dark2);color:var(--text-primary);border:1px solid var(--sidiz-blue-bright);border-radius:6px;padding:3px 6px;font-size:11px;width:100%;min-width:110px;box-sizing:border-box';
    const dlId = '_catEditList';
    let dl = document.getElementById(dlId);
    if (!dl) { dl = document.createElement('datalist'); dl.id = dlId; document.body.appendChild(dl); }
    const existing = [...new Set(_rctAllData.map(d=>d.defect_category).filter(Boolean))].sort();
    dl.innerHTML = existing.map(c=>`<option value="${c}">`).join('');
    input.setAttribute('list', dlId);
  } else if (field === 'item') {
    // currentNorm에 현재 item 값 전달됨
    input.value = currentNorm || '';
    input.placeholder = '예: T50, T90, S51 등';
    input.style.cssText = 'background:var(--sidiz-dark2);color:var(--text-primary);border:1px solid rgba(167,139,250,0.6);border-radius:6px;padding:3px 6px;font-size:11px;width:100%;min-width:90px;box-sizing:border-box';
    const dlId = '_itemEditList';
    let dl = document.getElementById(dlId);
    if (!dl) { dl = document.createElement('datalist'); dl.id = dlId; document.body.appendChild(dl); }
    const existingItems = [...new Set(_rctAllData.map(d=>d.item).filter(Boolean))].sort();
    dl.innerHTML = existingItems.map(c=>`<option value="${c}">`).join('');
    input.setAttribute('list', dlId);
  } else {
    input.value = originalText === '미분류' ? '' : originalText;
    input.style.cssText = 'background:var(--sidiz-dark2);color:var(--text-primary);border:1px solid var(--sidiz-blue-bright);border-radius:6px;padding:3px 6px;font-size:11px;width:100%;min-width:120px;box-sizing:border-box';
  }

  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();

  const saveEdit = async () => {
    const newValue = input.value.trim();
    if (!newValue || newValue === originalText) { cell.innerHTML = originalHTML; return; }

    cell.innerHTML = '<span style="color:var(--text-muted)">저장 중...</span>';

    try {
      // 1. Supabase claims_receipt 업데이트
      const updates = { [field]: newValue };
      const patchUrl = `${SupabaseClient.SUPABASE_URL}/rest/v1/claims_receipt?receipt_id=eq.${encodeURIComponent(receiptId)}&seq_no=eq.${seqNo}`;
      const res = await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'apikey': SupabaseClient.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SupabaseClient.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error(`PATCH ${res.status}`);

      // 2. 학습
      if (field === 'item') {
        // item 편집 학습: symptom_pending 레코드에도 item 반영
        try {
          const BASE = SupabaseClient.SUPABASE_URL, KEY = SupabaseClient.SUPABASE_ANON_KEY;
          await fetch(
            `${BASE}/rest/v1/symptom_pending?receipt_id=eq.${encodeURIComponent(receiptId)}&seq_no=eq.${seqNo}`,
            { method: 'PATCH',
              headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
              body: JSON.stringify({ item: newValue }) }
          );
        } catch(_) {} // pending 없는 경우 무시
      } else {
        // defect_normalized / defect_category 학습: 증상 사전 업데이트
        const learnNorm = field === 'defect_normalized' ? newValue : currentNorm;
        const learnCat  = field === 'defect_category'  ? newValue : currentCat;
        if (rawSymptom && rawSymptom.length > 2) {
          await SupabaseClient.upsertSymptomPattern(rawSymptom, learnNorm, learnCat, 'dashboard');
        }
      }

      // 3. 로컬 캐시 업데이트
      const cachedRow = _rctAllData.find(d => d.receipt_id === receiptId && d.seq_no == seqNo);
      if (cachedRow) cachedRow[field] = newValue;
      const filteredRow = _rctFilteredData.find(d => d.receipt_id === receiptId && d.seq_no == seqNo);
      if (filteredRow) filteredRow[field] = newValue;
      // _rctDetailSorted도 갱신 (삭제 참조용 배열)
      const detailRow = _rctDetailSorted.find(d => d.receipt_id === receiptId && d.seq_no == seqNo);
      if (detailRow) detailRow[field] = newValue;

      const highlightColor = field === 'item' ? 'var(--accent-violet)' : 'var(--accent-emerald)';
      cell.innerHTML = `<span style="color:${highlightColor}">${newValue}</span>`;
      cell.style.color = highlightColor;
      setTimeout(() => { cell.style.color = ''; }, 2000);

      // 칩 재렌더
      _renderRctDefectChips();

    } catch(e) {
      cell.innerHTML = originalHTML;
      alert('저장 실패: ' + e.message);
    }
  };

  input.addEventListener('blur', saveEdit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { input.blur(); }
    if (e.key === 'Escape') { cell.innerHTML = originalHTML; }
  });
}

function _renderRctProductChips() {
  // kept for compatibility but chips are now defect-based
}

function selectRctProduct(prod) {
  _rctSelectedProduct = prod;
  document.getElementById('rctProductFilter').value = prod;
  _applyRctFilter();
}

// 레거시 호환 함수
function applyDateFilter() { loadReceiptDashboard(); }
function setQuickDate(p) { setRctQuick(p === 'all' ? 'all' : p); }
function toggleReceiptCategory() {}
function showReceiptNormDetail() {}
function _updateReceiptUI() {}

// ── 미분류 배지 초기 로드 ──
(async () => {
  try {
    const cnt = await SupabaseClient.countPending();
    const badge = document.getElementById('pendingBadge');
    const el    = document.getElementById('pendingCount');
    if (badge && el && cnt > 0) { el.textContent = cnt; badge.style.display = ''; }
  } catch(_) {}
})();

// ─── 제품별 클레임 탭 — claims 테이블 기반 (claim_date 기준) ───
let _prodAllData = [];
let _prodSalesData = [];  // product_sales_monthly
let _prodBarChart = null;
let _prodPieChart = null;
let _prodTrendChart = null;
let _prodMonthlyBarChart = null;
let _prodLoaded = false;
let _prodDrillCat  = null;   // 바차트 클릭 시 선택된 판정유형
let _prodDrillItem = null;   // 파이차트 클릭 시 선택된 제품

// 판정유형 다중선택 드롭다운 토글
function toggleProdCatDD(e) {
  e.stopPropagation();
  const dd = document.getElementById('prodCatDD');
  if (!dd) return;
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}
// 외부 클릭 시 닫기
document.addEventListener('click', function(e) {
  const wrapper = document.getElementById('prodCatWrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    const dd = document.getElementById('prodCatDD');
    if (dd) dd.style.display = 'none';
  }
});
// 전체 체크박스 변경
function prodCatAllChanged(cb) {
  document.querySelectorAll('.prod-cat-cb').forEach(el => { el.checked = cb.checked; });
  _updateProdCatLabel();
  loadProdDashboard();
}
// 개별 체크박스 변경
function prodCatCbChanged() {
  const cbs = document.querySelectorAll('.prod-cat-cb');
  const allCb = document.getElementById('prodCatAll');
  if (allCb) allCb.checked = [...cbs].every(c => c.checked);
  _updateProdCatLabel();
  loadProdDashboard();
}
function _updateProdCatLabel() {
  const cbs = [...document.querySelectorAll('.prod-cat-cb')];
  const checked = cbs.filter(c => c.checked).map(c => c.value);
  const label = document.getElementById('prodCatLabel');
  if (!label) return;
  if (checked.length === 0 || checked.length === cbs.length) label.textContent = '전체 판정유형';
  else if (checked.length === 1) label.textContent = checked[0];
  else label.textContent = checked[0] + ' 외 ' + (checked.length-1) + '개';
}
function _getProdSelectedCats() {
  const cbs = [...document.querySelectorAll('.prod-cat-cb')];
  const checked = cbs.filter(c => c.checked).map(c => c.value);
  return checked.length === cbs.length ? [] : checked; // 빈 배열 = 전체
}

async function loadProdTab() {
  try {
    // claims + product_sales_monthly 병렬 로드
    const [rows, salesRows] = await Promise.all([
      SupabaseClient.fetchAllClaims(),
      SupabaseClient.fetchProductSalesMonthly()
    ]);
    _prodAllData = rows || [];
    _prodSalesData = salesRows || [];

    // 제품 드롭다운 (item 기준)
    const items = [...new Set(_prodAllData.map(r => r.item).filter(Boolean))].sort();
    const itemSel = document.getElementById('prodItemSelect');
    if (itemSel) itemSel.innerHTML = '<option value="all">전체 제품</option>' + items.map(i => `<option value="${i}">${i}</option>`).join('');

    // 판정유형 다중선택 체크박스 (claims.category 기준)
    const cats = [...new Set(_prodAllData.map(r => r.category).filter(Boolean))].sort();
    const catItems = document.getElementById('prodCatItems');
    if (catItems) {
      const CAT_COLORS = ['#4a9eff','#00c48c','#ffb347','#ff6b7a','#a78bfa','#00c6d7','#f59e0b','#6366f1','#10b981','#ef4444'];
      const DEFAULT_JUDGE = ['제조','설계','서비스','사양재검토','고객불만'];
      catItems.innerHTML = cats.map((c, i) => `
        <label style="display:flex;align-items:center;gap:8px;padding:5px 10px;cursor:pointer;font-size:12px;color:var(--text-primary);border-radius:4px" onmouseover="this.style.background='rgba(74,158,255,0.08)'" onmouseout="this.style.background=''">
          <input type="checkbox" class="prod-cat-cb" value="${c}" onchange="prodCatCbChanged()" ${DEFAULT_JUDGE.includes(c)?'checked':''} style="accent-color:${CAT_COLORS[i%CAT_COLORS.length]}">
          <span style="width:8px;height:8px;border-radius:50%;background:${CAT_COLORS[i%CAT_COLORS.length]};display:inline-block;flex-shrink:0"></span>
          ${c}
        </label>`).join('');
      // 전체 체크박스 & 레이블 초기 상태 갱신
      const allCbEl = document.getElementById('prodCatAll');
      if (allCbEl) allCbEl.checked = [...document.querySelectorAll('.prod-cat-cb')].every(c => c.checked);
      _updateProdCatLabel();
    }

    // 기본 기간: 이번 달 1일 ~ 오늘
    const _today = new Date();
    const _monthFirst = new Date(_today.getFullYear(), _today.getMonth(), 1).toISOString().split('T')[0];
    const _todayStr = _today.toISOString().split('T')[0];
    const _df = document.getElementById('prodDateFrom'); if (_df) _df.value = _monthFirst;
    const _dt = document.getElementById('prodDateTo');   if (_dt) _dt.value = _todayStr;
    document.querySelectorAll('.prod-quick-btn').forEach(b => { b.style.background='var(--sidiz-dark2)'; b.style.color='var(--text-muted)'; });
    loadProdDashboard();
  } catch(e) {
    console.error('loadProdTab error:', e);
  }
}

function onProdItemChange() { loadProdDashboard(); }
function onProdBrandChange() { refreshProdItemDropdown(); loadProdDashboard(); }
function onProdCountryChange() { refreshProdItemDropdown(); loadProdDashboard(); }

// 브랜드·국가 필터에 따라 제품 드롭다운 동적 갱신
function refreshProdItemDropdown() {
  const brand   = document.getElementById('prodBrandSel')?.value || 'all';
  const country = document.getElementById('prodCountrySel')?.value || 'all';
  const curItem = document.getElementById('prodItemSelect')?.value || 'all';

  // 현재 브랜드·국가에 해당하는 item 목록만 추출
  const filtered = _prodAllData.filter(r => {
    if (brand   !== 'all' && r.brand   !== brand)   return false;
    if (country !== 'all' && r.country !== country) return false;
    return true;
  });
  const items = [...new Set(filtered.map(r => r.item).filter(Boolean))].sort();

  const itemSel = document.getElementById('prodItemSelect');
  if (!itemSel) return;
  itemSel.innerHTML = '<option value="all">전체 제품</option>' + items.map(i => `<option value="${i}">${i}</option>`).join('');

  // 기존 선택값이 새 목록에 있으면 유지, 없으면 '전체'로 초기화
  if (items.includes(curItem)) itemSel.value = curItem;
  else itemSel.value = 'all';
}

function setProdQuick(period) {
  const today = new Date();
  const to = today.toISOString().split('T')[0];
  let from = to;
  if (period === '1w') { const d = new Date(today); d.setDate(d.getDate()-7); from = d.toISOString().split('T')[0]; }
  else if (period === '1m') { const d = new Date(today); d.setMonth(d.getMonth()-1); from = d.toISOString().split('T')[0]; }
  else if (period === '3m') { const d = new Date(today); d.setMonth(d.getMonth()-3); from = d.toISOString().split('T')[0]; }
  else if (period === 'all') { from = '2020-01-01'; }
  const df = document.getElementById('prodDateFrom'); if (df) df.value = from;
  const dt = document.getElementById('prodDateTo'); if (dt) dt.value = to;
  // 빠른 선택 버튼 하이라이트
  document.querySelectorAll('.prod-quick-btn').forEach(b => {
    b.style.background = 'var(--sidiz-dark2)'; b.style.color = 'var(--text-muted)';
  });
  const active = document.getElementById('pq-'+period);
  if (active) { active.style.background = 'rgba(74,158,255,0.15)'; active.style.color = 'var(--sidiz-blue-bright)'; }
  loadProdDashboard();
}

function _getProdFiltered() {
  const item    = document.getElementById('prodItemSelect')?.value || 'all';
  const cats    = _getProdSelectedCats();
  const brand   = document.getElementById('prodBrandSel')?.value || 'all';
  const country = document.getElementById('prodCountrySel')?.value || 'all';
  const from    = document.getElementById('prodDateFrom')?.value || '';
  const to      = document.getElementById('prodDateTo')?.value || '';
  return _prodAllData.filter(r => {
    if (item !== 'all' && r.item !== item) return false;
    if (cats.length > 0 && !cats.includes(r.category)) return false;
    if (brand !== 'all' && r.brand !== brand) return false;
    if (country !== 'all' && r.country !== country) return false;
    if (from && r.claim_date < from) return false;
    if (to && r.claim_date > to) return false;
    return true;
  });
}

function exportProdDataCSV() {
  if (typeof XLSX === 'undefined') {
    alert('Excel 라이브러리 로딩 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }
  const filtered = _getProdFiltered();
  if (!filtered || filtered.length === 0) {
    alert('내보낼 데이터가 없습니다. 먼저 조회해주세요.');
    return;
  }

  // 내보낼 컬럼 정의
  const cols = [
    { key: 'claim_id',          label: '접수번호' },
    { key: 'claim_date',        label: '회수일' },
    { key: 'brand',             label: '브랜드' },
    { key: 'country',           label: '국가' },
    { key: 'item',              label: '제품' },
    { key: 'category',          label: '판정유형' },
    { key: 'defect_type',       label: '하자유형' },
    { key: 'inspection_result', label: '판정내용' },
    { key: 'claim_detail',      label: '요구내역' },
  ];

  // 헤더 + 데이터 2차원 배열 생성
  const wsData = [
    cols.map(c => c.label),
    ...filtered.map(r => cols.map(c => (r[c.key] == null ? '' : String(r[c.key]))))
  ];

  // 워크시트 생성
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 열 너비 자동 조정
  ws['!cols'] = cols.map((c, ci) => {
    const maxLen = wsData.reduce((max, row) => Math.max(max, (row[ci] || '').length), 0);
    return { wch: Math.min(Math.max(maxLen + 2, c.label.length + 2), 60) };
  });

  // 워크북 생성 및 시트 추가
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '제품별클레임');

  // 파일명 생성: 제품별클레임_시디즈_T52_2025-01-01~2025-04-12_20250412.xlsx
  const item     = document.getElementById('prodItemSelect')?.value || 'all';
  const from     = document.getElementById('prodDateFrom')?.value || '';
  const to       = document.getElementById('prodDateTo')?.value || '';
  const brand    = document.getElementById('prodBrandSel')?.value || 'all';
  const itemLbl  = item  === 'all' ? '전체제품' : item;
  const brandLbl = brand === 'all' ? ''         : `_${brand}`;
  const dateLbl  = from  ? `_${from}~${to || ''}` : '';
  const today    = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const filename = `제품별클레임${brandLbl}_${itemLbl}${dateLbl}_${today}.xlsx`;

  XLSX.writeFile(wb, filename);
}

// ─────────────────────────────────────────────
// KPI 전월 대비 자동 분석 → 엑셀 내보내기
// ─────────────────────────────────────────────
function exportKpiAnalysisToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Excel 라이브러리 로딩 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }
  const cache = window._kpiAnLastData;
  if (!cache || !cache.curData) {
    alert('먼저 "🔄 분석 생성" 버튼으로 분석을 실행해주세요.');
    return;
  }
  const { curData, prevData, curYm, prevYm } = cache;

  // ── 공통 유틸 ──
  const CATS = ['제조','설계','서비스','사양재검토','고객불만'];
  const countBy = (arr, key) => arr.reduce((m,r)=>{const v=r[key]||'미분류';m[v]=(m[v]||0)+1;return m;},{});
  const topN = (obj, n) => Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n);
  const validItem = r => r.item && r.item.trim() && r.item !== '미분류' && r.item !== 'null';

  const wb = XLSX.utils.book_new();

  // Sheet 1: 요약
  const cc=curData.length, pc=prevData.length;
  const ccKr=curData.filter(r=>r.country==='국내').length, ccVn=curData.filter(r=>r.country==='베트남').length;
  const pcKr=prevData.filter(r=>r.country==='국내').length, pcVn=prevData.filter(r=>r.country==='베트남').length;
  const fmtChg = (c,p)=>{const d=c-p,pct=p>0?((d/p)*100).toFixed(1)+'%':'-';return (d>0?'+':'')+d+'건 ('+(d>0?'+':'')+pct+')';};
  const summaryData = [
    ['항목', `전월 (${prevYm})`, `당월 (${curYm})`, '증감'],
    ['전체 클레임', pc, cc, fmtChg(cc,pc)],
    ['🇰🇷 국내', pcKr, ccKr, fmtChg(ccKr,pcKr)],
    ['🇻🇳 베트남', pcVn, ccVn, fmtChg(ccVn,pcVn)],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1['!cols'] = [{wch:16},{wch:14},{wch:14},{wch:20}];
  XLSX.utils.book_append_sheet(wb, ws1, '1_요약');

  // Sheet 2: 판정유형별 변화
  const ccCat=countBy(curData,'category'), pcCat=countBy(prevData,'category');
  const catData = [['판정유형', `전월 (${prevYm})`, `당월 (${curYm})`, '증감']];
  CATS.forEach(cat=>{
    const c=ccCat[cat]||0, p=pcCat[cat]||0;
    catData.push([cat, p, c, fmtChg(c,p)]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(catData);
  ws2['!cols'] = [{wch:14},{wch:14},{wch:14},{wch:20}];
  XLSX.utils.book_append_sheet(wb, ws2, '2_판정유형별 변화');

  // Sheet 3: 제품별 Top 5 (당월 · 판정유형 분포 포함)
  const curValid = curData.filter(validItem);
  const prevValid = prevData.filter(validItem);
  const curItems = countBy(curValid,'item');
  const prevItems = countBy(prevValid,'item');
  const top5Item = topN(curItems, 5);
  const itemData = [['순위','제품','당월 건수','전월 건수','증감','제조','설계','서비스','사양재검토','고객불만']];
  top5Item.forEach(([name,cnt],idx)=>{
    const pcnt = prevItems[name]||0;
    const itemRows = curData.filter(r=>r.item===name);
    const catMap = countBy(itemRows,'category');
    itemData.push([idx+1, name, cnt, pcnt, fmtChg(cnt,pcnt),
      catMap['제조']||0, catMap['설계']||0, catMap['서비스']||0, catMap['사양재검토']||0, catMap['고객불만']||0]);
  });
  const ws3 = XLSX.utils.aoa_to_sheet(itemData);
  ws3['!cols'] = [{wch:6},{wch:18},{wch:10},{wch:10},{wch:18},{wch:8},{wch:8},{wch:8},{wch:12},{wch:10}];
  XLSX.utils.book_append_sheet(wb, ws3, '3_제품별 Top5');

  // Sheet 4: 전월대비 증감 Top 5
  const allItems = new Set([...Object.keys(curItems),...Object.keys(prevItems)]);
  const diffRanked = Array.from(allItems).map(item=>({
    item, cur:curItems[item]||0, prev:prevItems[item]||0, diff:(curItems[item]||0)-(prevItems[item]||0)
  })).filter(d=>d.diff>0).sort((a,b)=>b.diff-a.diff).slice(0,5);
  const diffData = [['순위','제품','전월','당월','증가폭','당월 주요 판정유형 Top2']];
  diffRanked.forEach(({item,cur,prev,diff},idx)=>{
    const itemRows = curData.filter(r=>r.item===item);
    const top2 = topN(countBy(itemRows,'category'),2).map(([c,n])=>`${c} ${n}`).join(' / ');
    diffData.push([idx+1, item, prev, cur, '▲'+diff, top2]);
  });
  const ws4 = XLSX.utils.aoa_to_sheet(diffData);
  ws4['!cols'] = [{wch:6},{wch:18},{wch:10},{wch:10},{wch:10},{wch:30}];
  XLSX.utils.book_append_sheet(wb, ws4, '4_증감 Top5');

  // Sheet 5: 당월 원본 데이터 (클레임 현황 자료변환과 동일 컬럼 구성)
  const rawCols = [
    {key:'claim_id',         label:'접수번호'},
    {key:'claim_date',       label:'회수일'},
    {key:'brand',            label:'브랜드'},
    {key:'country',          label:'국가'},
    {key:'item',             label:'제품'},
    {key:'category',         label:'판정유형'},
    {key:'defect_type',      label:'하자유형'},
    {key:'inspection_result',label:'판정내용'},
    {key:'claim_detail',     label:'요구내역'},
  ];
  const buildSheet = (data)=>{
    const rows = [rawCols.map(c=>c.label), ...data.map(r=>rawCols.map(c=>r[c.key]==null?'':String(r[c.key])))];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = rawCols.map((c,i)=>{
      const maxLen = rows.reduce((m,row)=>Math.max(m,(row[i]||'').toString().length),0);
      return {wch: Math.min(Math.max(maxLen+2, c.label.length+2), 40)};
    });
    return ws;
  };
  XLSX.utils.book_append_sheet(wb, buildSheet(curData), `5_당월 원본(${curYm})`);
  XLSX.utils.book_append_sheet(wb, buildSheet(prevData), `6_전월 원본(${prevYm})`);

  const today = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const filename = `KPI전월대비분석_${prevYm}vs${curYm}_${today}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ─────────────────────────────────────────────
// 클레임 현황 (접수일/업로드일 기준) → 엑셀 내보내기
// ─────────────────────────────────────────────
function exportReceiptDataToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Excel 라이브러리 로딩 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }
  const data = (typeof _rctFilteredData !== 'undefined' && _rctFilteredData && _rctFilteredData.length)
    ? _rctFilteredData
    : (typeof _rctAllData !== 'undefined' ? _rctAllData : []);
  if (!data || data.length === 0) {
    alert('내보낼 데이터가 없습니다. 먼저 조회해주세요.');
    return;
  }

  // claims_receipt의 대표 컬럼 정의 (실제 키가 없으면 빈 값 처리됨)
  const cols = [
    { key:'receipt_no',        label:'접수번호' },
    { key:'receipt_date',      label:'접수일' },
    { key:'uploaded_at',       label:'업로드일' },
    { key:'brand',             label:'브랜드' },
    { key:'country',           label:'국가' },
    { key:'item',              label:'제품' },
    { key:'defect_type',       label:'하자유형(원본)' },
    { key:'defect_normalized', label:'하자유형(표준화)' },
    { key:'category',          label:'판정유형' },
    { key:'inspection_result', label:'판정내용' },
    { key:'claim_detail',      label:'요구내역' },
    { key:'customer_name',     label:'고객명' },
    { key:'region',            label:'지역' },
    { key:'memo',              label:'비고' },
  ];

  // 실제 존재하는 key만 필터 (없는 컬럼은 제외)
  const sample = data[0] || {};
  const sampleKeys = new Set(Object.keys(sample));
  const activeCols = cols.filter(c => sampleKeys.has(c.key));
  // 그래도 남은 sample key (미정의 컬럼) 추가
  Object.keys(sample).forEach(k=>{
    if (!activeCols.find(c=>c.key===k) && k !== 'id') activeCols.push({key:k, label:k});
  });

  const wsData = [
    activeCols.map(c=>c.label),
    ...data.map(r => activeCols.map(c => (r[c.key]==null ? '' : String(r[c.key]))))
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = activeCols.map((c,ci)=>{
    const maxLen = wsData.reduce((m,row)=>Math.max(m,(row[ci]||'').length),0);
    return { wch: Math.min(Math.max(maxLen+2, c.label.length+2), 50) };
  });
  const wb = XLSX.utils.book_new();
  const modeLabel = (typeof _rctDateMode !== 'undefined' && _rctDateMode === 'uploaded') ? '업로드일' : '접수일';
  XLSX.utils.book_append_sheet(wb, ws, `클레임_${modeLabel}기준`);

  const from = document.getElementById('rctDateFrom')?.value || '';
  const to   = document.getElementById('rctDateTo')?.value || '';
  const prod = document.getElementById('rctProductFilter')?.value || 'all';
  const prodLbl = prod === 'all' ? '전체제품' : prod;
  const today = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const filename = `클레임현황_${modeLabel}_${prodLbl}_${from}~${to}_${today}.xlsx`;
  XLSX.writeFile(wb, filename);
}

async function loadProdDashboard() {
  _prodDrillCat = null;
  _prodDrillItem = null;
  const badge = document.getElementById('prodDrillBadge');
  if (badge) badge.style.display = 'none';
  const filtered = _getProdFiltered();
  const item = document.getElementById('prodItemSelect')?.value || 'all';
  const brand = document.getElementById('prodBrandSel')?.value || 'all';
  const from = document.getElementById('prodDateFrom')?.value || '';
  const to = document.getElementById('prodDateTo')?.value || '';
  const el = id => document.getElementById(id);

  // 매출량 계산: product_sales_monthly 에서 item + country + 기간 필터
  const country = document.getElementById('prodCountrySel')?.value || 'all';
  const salesFiltered = _prodSalesData.filter(s => {
    if (item !== 'all' && s.item !== item) return false;
    if (country !== 'all' && s.country !== country) return false;
    if (from && s.year_month < from.slice(0,7)) return false;
    if (to   && s.year_month > to.slice(0,7))   return false;
    return true;
  });
  const totalSales = salesFiltered.reduce((acc, s) => acc + (s.sales_count || 0), 0);
  const claimsCount = filtered.length;
  const defectIdx = (totalSales > 0) ? ((claimsCount / totalSales) * 100).toFixed(2) : null;

  // 카드 업데이트
  if (el('prodCardClaims')) el('prodCardClaims').textContent = claimsCount.toLocaleString() + '건';
  if (el('prodCardSales')) el('prodCardSales').textContent = totalSales > 0 ? totalSales.toLocaleString() + '개' : '-';
  if (el('prodCardDefect')) el('prodCardDefect').textContent = defectIdx !== null ? defectIdx + '%' : '-';
  if (el('prodCardClaimsSub')) el('prodCardClaimsSub').textContent = (item !== 'all' ? item : '전체 제품') + (from ? ` · ${from.slice(0,7)}~` : '');
  if (el('prodCardSalesSub')) el('prodCardSalesSub').textContent = totalSales > 0 ? (item !== 'all' ? item : '전체 제품') + (from ? ` · ${from.slice(0,7)}~` : '') : '매출량 데이터 없음';
  if (el('prodEmptyState')) el('prodEmptyState').style.display = filtered.length === 0 ? 'block' : 'none';

  // 기간 필터 무관 — 제품/브랜드/국가/판정유형만 적용 (막대차트·상세테이블 공용)
  const cats    = _getProdSelectedCats();
  const noDateFiltered = _prodAllData.filter(r => {
    if (item !== 'all' && r.item !== item) return false;
    if (brand !== 'all' && r.brand !== brand) return false;
    if (country !== 'all' && r.country !== country) return false;
    if (cats.length > 0 && !cats.includes(r.category)) return false;
    return true;
  });

  renderProdBarChart(filtered);
  renderProdPieChart(filtered);
  renderProdTrendChart(filtered, from, to);
  renderProdMonthlyBarChart(noDateFiltered, item);
  renderProdMonthlyTable(noDateFiltered, item, country);

  if (el('prodTrendTitle')) el('prodTrendTitle').textContent = `(${item !== 'all' ? item : '전체'} · ${from||'전체'}~${to||'현재'})`;
}

function _refreshProdBottom() {
  const item    = document.getElementById('prodItemSelect')?.value || 'all';
  const brand   = document.getElementById('prodBrandSel')?.value || 'all';
  const country = document.getElementById('prodCountrySel')?.value || 'all';
  const cats    = _getProdSelectedCats();
  const from    = document.getElementById('prodDateFrom')?.value || '';
  const to      = document.getElementById('prodDateTo')?.value || '';

  // 기본 필터 (기간 제외)
  const baseFiltered = _prodAllData.filter(r => {
    if (item !== 'all' && r.item !== item) return false;
    if (brand !== 'all' && r.brand !== brand) return false;
    if (country !== 'all' && r.country !== country) return false;
    if (cats.length > 0 && !cats.includes(r.category)) return false;
    return true;
  });

  // 드릴 필터 적용
  let noDateFiltered = [...baseFiltered];
  if (_prodDrillCat)  noDateFiltered = noDateFiltered.filter(r => r.category === _prodDrillCat);
  if (_prodDrillItem) noDateFiltered = noDateFiltered.filter(r => r.item === _prodDrillItem);

  const drillFiltered = noDateFiltered.filter(r => {
    if (from && r.claim_date < from) return false;
    if (to   && r.claim_date > to)   return false;
    return true;
  });

  // 상호 연결: 카테고리 선택 시 파이차트도 해당 카테고리 데이터로 갱신
  if (_prodDrillCat) {
    renderProdPieChart(baseFiltered.filter(r => r.category === _prodDrillCat));
  }
  // 상호 연결: 제품 선택 시 바차트도 해당 제품 데이터로 갱신
  if (_prodDrillItem) {
    const baseWithDate = baseFiltered.filter(r => {
      if (from && r.claim_date < from) return false;
      if (to   && r.claim_date > to)   return false;
      return true;
    });
    renderProdBarChart(baseWithDate.filter(r => r.item === _prodDrillItem));
  }

  const badge     = document.getElementById('prodDrillBadge');
  const badgeTxt  = document.getElementById('prodDrillBadgeText');
  if (_prodDrillCat || _prodDrillItem) {
    const label = _prodDrillCat ? `판정유형: ${_prodDrillCat}` : `제품: ${_prodDrillItem}`;
    if (badgeTxt) badgeTxt.textContent = `🔍 ${label} 필터 적용 중 · ${drillFiltered.length}건`;
    if (badge)    badge.style.display = 'flex';
  } else {
    if (badge) badge.style.display = 'none';
  }

  const dispItem = _prodDrillItem || (item !== 'all' ? item : '전체');
  renderProdTrendChart(drillFiltered, from, to);
  renderProdMonthlyBarChart(noDateFiltered, dispItem);
  renderProdMonthlyTable(noDateFiltered, _prodDrillItem || item, country);
  const el = id => document.getElementById(id);
  if (el('prodTrendTitle')) el('prodTrendTitle').textContent = `(${dispItem} · ${from||'전체'}~${to||'현재'})`;
}

function _clearProdDrill() {
  _prodDrillCat  = null;
  _prodDrillItem = null;
  loadProdDashboard();
}

function renderProdBarChart(claims) {
  if (_prodBarChart) { _prodBarChart.destroy(); _prodBarChart = null; }
  const ctx = document.getElementById('prodBarChart'); if (!ctx) return;
  // 불량 유형별 현황: claims.category 기준
  const CAT_COLORS = ['rgba(74,158,255,0.85)','rgba(0,196,140,0.85)','rgba(255,179,71,0.85)','rgba(167,139,250,0.85)','rgba(0,198,215,0.85)','rgba(255,107,122,0.85)','rgba(245,158,11,0.85)','rgba(99,102,241,0.85)','rgba(236,72,153,0.85)','rgba(107,131,160,0.7)'];
  const cats = {};
  claims.forEach(c => { const d = c.category || '기타'; cats[d] = (cats[d] || 0) + 1; });
  const sorted = Object.entries(cats).sort((a,b) => b[1]-a[1]);
  if (sorted.length === 0) return;
  _prodBarChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: sorted.map(e=>e[0]), datasets: [{ label: '건수', data: sorted.map(e=>e[1]), backgroundColor: sorted.map((_,i)=>CAT_COLORS[i%CAT_COLORS.length]), borderRadius: 4, borderWidth: 1 }] },
    options: { indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins: {
        legend: { display:false },
        tooltip: { backgroundColor:'#ffffff',titleColor:'#111111',bodyColor:'#444455',borderColor:'#e2e2ea',borderWidth:1, callbacks:{ label: ctx=>' '+ctx.parsed.x+'건' } },
        datalabels: {
          anchor: 'end', align: 'end',
          color: '#222233',
          font: { size:11, weight:'bold', family:"'JetBrains Mono'" },
          formatter: v => v + '건',
          clamp: true,
          padding: { right: 4 }
        }
      },
      layout: { padding: { right: 52 } },
      scales: {
        x: { grid:{color:'rgba(0,0,0,0.07)'}, ticks:{color:'#555566',font:{size:10},stepSize:1,callback:v=>Number.isInteger(v)?v:''}, beginAtZero:true },
        y: { grid:{display:false}, ticks:{color:'#333344',font:{size:11,weight:'600'}} }
      },
      onClick(e, elements) {
        if (!elements.length) return;
        const clickedCat = sorted[elements[0].index][0];
        _prodDrillCat  = (_prodDrillCat === clickedCat) ? null : clickedCat;
        _prodDrillItem = null;
        _refreshProdBottom();
      }
    },
    plugins: [ ChartDataLabels ]
  });
  if (ctx.canvas) ctx.canvas.style.cursor = 'pointer';
}

function renderProdPieChart(claims) {
  if (_prodPieChart) { _prodPieChart.destroy(); _prodPieChart = null; }
  const ctx = document.getElementById('prodPieChart'); if (!ctx) return;
  // 제품별 클레임 현황: claims.item 기준
  const byItem = {};
  claims.forEach(c => {
    const p = c.item || '기타';
    byItem[p] = (byItem[p] || 0) + 1;
  });
  const sorted = Object.entries(byItem).sort((a,b) => b[1]-a[1]).slice(0, 10);
  if (sorted.length === 0) return;
  const labels = sorted.map(([k]) => k);
  const values = sorted.map(([,v]) => v);
  const palette = ['#002BD2','#FF4C6A','#00B87A','#E6A800','#7c5fe6','#54DBC2','#FF6C39','#1A59FF','#D946EF','#64748B'];
  _prodPieChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: palette, borderColor: '#ffffff', borderWidth: 2 }] },
    options: { responsive:true, maintainAspectRatio:false,
      plugins: {
        legend: { position:'right', labels:{color:'#444455',font:{size:10},usePointStyle:true,padding:6,boxWidth:8} },
        tooltip: { backgroundColor:'#ffffff',titleColor:'#111111',bodyColor:'#444455',borderColor:'#E2E2EA',borderWidth:1,
          callbacks:{ label: ctx => ` ${ctx.label}: ${ctx.parsed}건` } }
      },
      onClick(e, elements) {
        if (!elements.length) return;
        const clickedItem = labels[elements[0].index];
        _prodDrillItem = (_prodDrillItem === clickedItem) ? null : clickedItem;
        _prodDrillCat  = null;
        _refreshProdBottom();
      }
    }
  });
  if (ctx.canvas) ctx.canvas.style.cursor = 'pointer';
}

function renderProdTrendChart(claims, from, to) {
  if (_prodTrendChart) { _prodTrendChart.destroy(); _prodTrendChart = null; }
  const ctx = document.getElementById('prodTrendChart'); if (!ctx) return;
  if (claims.length === 0) return;

  // 일별 클레임 추이 (claim_date 기준, 라인차트)
  const dateMap = {};
  claims.forEach(c => { if (!c.claim_date) return; dateMap[c.claim_date] = (dateMap[c.claim_date]||0)+1; });
  const keys = Object.keys(dateMap).sort();
  if (keys.length === 0) return;

  _prodTrendChart = new Chart(ctx, {
    type: 'line',
    data: { labels: keys.map(k => k.slice(5).replace('-','/')),
      datasets: [{
        label:'클레임 건수', data:keys.map(k=>dateMap[k]),
        borderColor:'#002BD2', backgroundColor:'rgba(0,43,210,0.08)',
        borderWidth:2.5,
        pointRadius: keys.length > 30 ? 2 : 5,
        pointBackgroundColor:'#ffffff',
        pointBorderColor:'#002BD2',
        pointBorderWidth:2,
        pointHoverRadius:7,
        tension:0.4, fill:true
      }]
    },
    plugins: [{
      id: 'prodTrendGrad',
      beforeDatasetsDraw(chart) {
        const { ctx: c, chartArea } = chart;
        if (!chartArea) return;
        const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        grad.addColorStop(0, 'rgba(0,43,210,0.20)');
        grad.addColorStop(0.55, 'rgba(0,43,210,0.04)');
        grad.addColorStop(1, 'rgba(0,43,210,0.00)');
        chart.data.datasets[0].backgroundColor = grad;
      }
    }],
    options: { responsive:true, maintainAspectRatio:false,
      plugins: { legend:{display:false}, tooltip:{
        backgroundColor:'#ffffff',titleColor:'#111111',bodyColor:'#444455',borderColor:'#E2E2EA',borderWidth:1,
        padding:12, cornerRadius:10,
        callbacks:{ title: items => keys[items[0].dataIndex], label: ctx=>' '+ctx.parsed.y+'건' }
      }},
      scales: {
        x:{grid:{color:'rgba(0,0,0,0.04)',drawTicks:false},ticks:{color:'#8a8a9a',font:{size:10,family:"'JetBrains Mono'"},maxRotation:45,autoSkip:true,maxTicksLimit:40}},
        y:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{color:'#8a8a9a',font:{size:10,family:"'JetBrains Mono'"},stepSize:1,callback:v=>Number.isInteger(v)?v:''},beginAtZero:true}
      }
    }
  });
}

// ─── inspection_result 유사 그룹핑 ───
function _normalizeInspectionResult(raw) {
  if (!raw) return '(판정내용 없음)';
  const s = raw.trim();
  // 팔걸이 기포 파손 계열
  if (/팔걸이.{0,6}기포.{0,6}파손|기포.{0,6}파손/.test(s)) return '팔걸이 기포 파손';
  // 사선조립 인서트 헛돔 계열
  if (/사선.{0,4}조립.{0,10}인서트|인서트.{0,6}헛돔/.test(s)) return '사선조립 인서트 헛돔';
  // 봉제 라인 벌어짐 계열
  if (/봉제.{0,4}라인|봉제라인/.test(s)) return '봉제 라인 벌어짐';
  // 상대물 없어서 확인불가 계열
  if (/상대물.{0,10}확인불가|회수품.{0,10}확인불가/.test(s)) return '상대물 없어서 확인불가';
  // 등판 볼트 파손/풀림 계열
  if (/등판.{0,15}볼트/.test(s)) return '등판 볼트 파손/풀림';
  // 좌판 골격 파손 계열
  if (/좌판.{0,6}골격.{0,6}파손/.test(s)) return '좌판 골격 파손';
  // 틸트 파손 계열
  if (/틸트.{0,6}파손|틸트.{0,6}하우징/.test(s)) return '틸트 파손';
  // 틸트 유격/락킹 계열
  if (/틸트.{0,6}유격|틸트.{0,6}락|틸트.{0,6}사양변경/.test(s)) return '틸트 유격/락킹';
  // 팔걸이 유격/소음 계열
  if (/팔걸이.{0,10}유격|팔걸이.{0,10}소음|VN.{0,6}팔걸이/.test(s)) return '팔걸이 유격 및 소음';
  // 팔걸이 커버 유격
  if (/팔걸이.{0,6}커버.{0,6}유격/.test(s)) return '팔걸이 커버 유격';
  // 좌판 오염/변색
  if (/좌판.{0,6}오염|좌판.{0,6}변색/.test(s)) return '좌판 오염/변색';
  // 좌판 봉제/소음
  if (/좌판.{0,6}골격.{0,6}소음/.test(s)) return '좌판 골격 소음';
  // 암후레임 간섭
  if (/암후레임|높이.{0,6}조절.{0,6}불가/.test(s)) return '암후레임 간섭 높이 조절 불가';
  // 헤드 조절 각도 변경
  if (/헤드.{0,6}조절.{0,6}각도/.test(s)) return '헤드 조절 각도 변경 전 사양';
  // 좌판+팔걸이 사양변경
  if (/좌판.{0,6}팔걸이.{0,6}사양|사양.{0,6}변경/.test(s)) return '사양 변경 교체';
  // 리미트 볼트 이탈
  if (/리미트.{0,6}볼트/.test(s)) return '리미트 볼트 이탈';
  // 베트남 상품
  if (/베트남.{0,10}정품화/.test(s)) return '베트남 상품 정품화 불가';
  // 단순 변심
  if (/단순.{0,4}변심/.test(s)) return '단순 변심';
  // 메쉬 텐션 불만
  if (/메쉬.{0,6}텐션/.test(s)) return '메쉬 텐션 불만';
  // 조립 미숙
  if (/조립.{0,6}미숙/.test(s)) return '조립 미숙';
  // 샤프트 파손
  if (/샤프트.{0,6}파손/.test(s)) return '샤프트 파손';
  // 고정핀 파손
  if (/고정핀/.test(s)) return '고정핀 파손';
  // 틸팅 레버 작동
  if (/틸팅.{0,6}레버/.test(s)) return '틸팅 레버 작동 불가';
  // 앞 40자로 그룹핑 (나머지)
  return s.length > 40 ? s.slice(0,40)+'…' : s;
}

// ─── 월별 클레임 막대차트 (1~12월 고정, 기간 필터 무관) ───
function renderProdMonthlyBarChart(allData, item) {
  if (_prodMonthlyBarChart) { _prodMonthlyBarChart.destroy(); _prodMonthlyBarChart = null; }
  const ctx = document.getElementById('prodMonthlyBarChart'); if (!ctx) return;
  const year = new Date().getFullYear();
  const monthLabels = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const monthCounts = new Array(12).fill(0);
  allData.forEach(c => {
    if (!c.claim_date) return;
    const d = new Date(c.claim_date);
    if (d.getFullYear() !== year) return;
    monthCounts[d.getMonth()]++;
  });
  const el = document.getElementById('prodMonthlyBarTitle');
  if (el) el.textContent = `(${item !== 'all' ? item : '전체 제품'} · ${year}년 누적)`;
  const maxVal = Math.max(...monthCounts.filter(v => v > 0), 1);
  const yMax   = Math.ceil(maxVal * 1.15);
  _prodMonthlyBarChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: monthLabels,
      datasets: [{ label:'클레임 건수', data: monthCounts,
        backgroundColor: monthCounts.map((v) => {
          if (v === 0) return 'rgba(0,0,0,0.06)';
          const max = Math.max(...monthCounts);
          const ratio = v / max;
          const r = Math.round(0 + (26 - 0) * (1 - ratio));
          const g = Math.round(43 + (89 - 43) * (1 - ratio));
          const b = Math.round(210 + (255 - 210) * (1 - ratio));
          return `rgba(${r},${g},${b},0.85)`;
        }),
        borderColor: 'transparent', borderWidth:0, borderRadius:7, borderSkipped:false
      }]
    },
    options: { responsive:true, maintainAspectRatio:false,
      plugins: {
        legend:{display:false},
        tooltip:{
          backgroundColor:'#ffffff',titleColor:'#111111',bodyColor:'#444455',borderColor:'#E2E2EA',borderWidth:1,
          callbacks:{ label: ctx => ' ' + ctx.parsed.y + '건' }
        },
        datalabels: {
          anchor: 'end', align: 'top',
          color: '#222233',
          font: { size:11, weight:'bold', family:"'JetBrains Mono'" },
          formatter: v => v > 0 ? v + '건' : '',
          clamp: true
        }
      },
      scales: {
        x:{grid:{color:'rgba(0,0,0,0.07)'},ticks:{color:'#555566',font:{size:11}}},
        y:{grid:{color:'rgba(0,0,0,0.07)'},ticks:{color:'#555566',font:{size:10},stepSize:1,callback:v=>Number.isInteger(v)?v:''},beginAtZero:true,max:yMax}
      }
    },
    plugins: [ChartDataLabels]
  });
}

function saveProdRowStatus(key, val) {
  localStorage.setItem('sidiz_pstatus_' + key, val);
}

function showProdDetailModal(idx) {
  const data = window._prodDetailData && window._prodDetailData[idx];
  if (!data) return;
  const modal = document.getElementById('prodDetailModal');
  const title = document.getElementById('prodDetailModalTitle');
  const content = document.getElementById('prodDetailModalContent');
  if (!modal) return;
  if (title) title.textContent = `📋 ${data.detail} — 상세 내역 (${data.records.length}건)`;
  if (content) {
    if (data.records.length === 0) {
      content.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted)">상세 데이터가 없습니다.</div>';
    } else {
      content.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="background:rgba(74,158,255,0.08)">
          <th style="padding:8px 12px;text-align:left;border-bottom:1px solid var(--border);color:var(--text-muted);font-weight:600;width:140px">접수번호</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:1px solid var(--border);color:var(--text-muted);font-weight:600">요구내역</th>
        </tr></thead>
        <tbody>${data.records.map((rec,i) => `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);background:${i%2===0?'transparent':'rgba(255,255,255,0.02)'}">
          <td style="padding:7px 12px;font-family:'JetBrains Mono',monospace;color:var(--sidiz-blue-bright);font-weight:600;white-space:nowrap">${rec.receipt_id}</td>
          <td style="padding:7px 12px;color:var(--text-primary);line-height:1.5;white-space:pre-wrap">${rec.claim_detail}</td>
        </tr>`).join('')}</tbody>
      </table>`;
    }
  }
  modal.style.display = 'flex';
}

function closeProdDetailModal() {
  const modal = document.getElementById('prodDetailModal');
  if (modal) modal.style.display = 'none';
}

function renderProdMonthlyTable(claims, selItem, selCountry) {
  window._prodDetailData = [];
  const wrap = document.getElementById('prodMonthlyTableWrap'); if (!wrap) return;

  // 타이틀 업데이트 (활성 필터 표시)
  const year = new Date().getFullYear();
  const brand   = document.getElementById('prodBrandSel')?.value || 'all';
  const cats    = _getProdSelectedCats();
  const catLabel = document.getElementById('prodCatLabel')?.textContent || '전체 판정유형';
  const parts = [];
  if (selItem !== 'all') parts.push(selItem);
  if (brand  !== 'all') parts.push(brand);
  if (selCountry !== 'all') parts.push(selCountry);
  if (cats.length > 0) parts.push(catLabel);
  const titleEl = document.getElementById('prodTableTitle');
  if (titleEl) titleEl.textContent = `(${parts.length > 0 ? parts.join(' · ') : '전체'} · ${year}년 누적)`;

  if (claims.length === 0) { wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">조회된 데이터가 없습니다.</div>'; return; }

  // 1~12월 고정 (현재 연도 기준, 기간 필터 무관)
  const allMonths = Array.from({length:12}, (_,i) => `${year}-${String(i+1).padStart(2,'0')}`);

  // 그룹핑: defect_type(하자유형) + category(판정유형) + 정규화된 inspection_result
  const groupMap = {};
  claims.forEach(c => {
    const dt = c.defect_type || '미분류';
    const cat = c.category || '미분류';
    const detail = _normalizeInspectionResult(c.inspection_result);
    const key = dt + '||' + cat + '||' + detail;
    const m = c.claim_date?.slice(0,7) || '미분류';
    if (!groupMap[key]) groupMap[key] = { defect_type: dt, category: cat, detail, total: 0, months: {}, records: [] };
    groupMap[key].total++;
    groupMap[key].months[m] = (groupMap[key].months[m]||0)+1;
    groupMap[key].records.push({ receipt_id: c.claim_id || '-', claim_detail: c.claim_detail || c.inspection_result || '-' });
  });

  const rows = Object.values(groupMap).sort((a,b) => b.total - a.total);

  // defect_type 그룹 (rowspan)
  const dtGroups = {};
  rows.forEach(r => {
    if (!dtGroups[r.defect_type]) dtGroups[r.defect_type] = { items:[], total:0 };
    dtGroups[r.defect_type].items.push(r);
    dtGroups[r.defect_type].total += r.total;
  });
  const dtSorted = Object.entries(dtGroups).sort((a,b) => b[1].total - a[1].total);

  const STATUS_OPTS = ['','개선중','개선완료','개선불가'];
  const STATUS_COLORS = { '':'#aaaaaa', '개선중':'#FF8C00', '개선완료':'#00B87A', '개선불가':'#FF4C6A' };
  function getProdStatus(key) { return localStorage.getItem('sidiz_pstatus_' + key) || ''; }

  const DEFECT_COLORS = { '파손':'var(--accent-rose)','소음':'var(--accent-amber)','유격':'var(--accent-violet)','작동성':'var(--sidiz-blue-bright)','수평':'var(--accent-cyan)','체결':'var(--accent-emerald)','외관':'#f59e0b','미분류':'var(--text-muted)' };
  const CAT_COLOR_MAP = { '설계':'#4a9eff','부품':'#ff6b7a','공정':'#ffb347','재료':'#a78bfa','기타':'#6b83a0','미분류':'#6b83a0' };
  const mh = allMonths.map(m => `<th style="text-align:center;white-space:nowrap;min-width:40px">${parseInt(m.slice(5))}월</th>`).join('');

  let tableRows = '';
  dtSorted.forEach(([dt, group]) => {
    // 서브카테고리("외관(오염)")도 부모 색상으로 자동 매칭
    const dtColor = DEFECT_COLORS[dt] || DEFECT_COLORS[getCatGroup(dt)] || (typeof getCatColorHex === 'function' ? getCatColorHex(dt) : '#a0b4cb');
    group.items.forEach((r, idx) => {
      const rowKey = encodeURIComponent(dt + '||' + r.category + '||' + r.detail);
      const savedStatus = getProdStatus(rowKey);
      const stColor = STATUS_COLORS[savedStatus] || 'var(--accent-cyan)';
      const catColor = CAT_COLOR_MAP[r.category] || '#a0b4cb';
      const rowIdx = window._prodDetailData ? window._prodDetailData.length : 0;
      if (window._prodDetailData) window._prodDetailData.push({ detail: r.detail, records: r.records || [] });
      tableRows += '<tr>';
      if (idx===0) tableRows += `<td class="row-header" rowspan="${group.items.length}" style="vertical-align:middle;border-right:1px solid var(--border);word-break:keep-all;text-align:center;padding:8px 6px;width:150px;min-width:150px;max-width:150px">
        <span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;color:${dtColor};background:${dtColor}18;border:1px solid ${dtColor}33;word-break:keep-all">${dt}</span>
        <div style="font-family:'JetBrains Mono';font-size:12px;color:${dtColor};font-weight:700;margin-top:4px">${group.total}건</div>
      </td>`;
      tableRows += `<td style="text-align:center;white-space:nowrap;padding:4px 8px"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;color:${catColor};background:${catColor}18;border:1px solid ${catColor}33">${r.category}</span></td>`;
      tableRows += `<td style="text-align:left;font-size:11px;min-width:280px;white-space:normal;line-height:1.5;padding:6px 8px;cursor:pointer;text-decoration:underline dotted;color:var(--sidiz-blue-bright)" title="클릭 시 상세 내역 보기" onclick="showProdDetailModal(${rowIdx})">${r.detail}</td>`;
      tableRows += `<td style="text-align:center;white-space:nowrap;padding:4px 8px">
        <select onchange="saveProdRowStatus('${rowKey}',this.value);this.style.color=({'개선중':'#FF8C00','개선완료':'#00B87A','개선불가':'#FF4C6A'}[this.value]||'#aaaaaa');this.style.borderColor=({'개선중':'#FF8C00','개선완료':'#00B87A','개선불가':'#FF4C6A'}[this.value]||'#cccccc')+'88'" onclick="event.stopPropagation()" style="background:${savedStatus?stColor+'12':'rgba(255,255,255,0.04)'};border:1.5px solid ${savedStatus?stColor+'88':'#cccccc88'};color:${savedStatus?stColor:'#aaaaaa'};padding:4px 10px;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;outline:none;min-width:72px;text-align:center">
          <option value="" ${savedStatus===''?'selected':''} style="color:#aaaaaa">—</option>
          <option value="개선중" ${savedStatus==='개선중'?'selected':''} style="color:#FF8C00">개선중</option>
          <option value="개선완료" ${savedStatus==='개선완료'?'selected':''} style="color:#00B87A">개선완료</option>
          <option value="개선불가" ${savedStatus==='개선불가'?'selected':''} style="color:#FF4C6A">개선불가</option>
        </select>
      </td>`;
      tableRows += allMonths.map(m => `<td style="text-align:center;font-size:11px">${r.months[m]||'-'}</td>`).join('');
      tableRows += `<td style="font-weight:700;color:var(--sidiz-blue-bright);text-align:center">${r.total}</td></tr>`;
    });
  });

  // 매출량/불량지수 행 — product_sales_monthly 기준
  const item    = selItem    || 'all';
  const country = selCountry || 'all';
  // 월별 클레임 건수 (allMonths 기준)
  const claimsByMonth = {};
  allMonths.forEach(m => { claimsByMonth[m] = 0; });
  claims.forEach(c => {
    const m = (c.claim_date || '').slice(0, 7);
    if (claimsByMonth[m] !== undefined) claimsByMonth[m]++;
  });
  // 월별 매출량 (product_sales_monthly)
  const salesByMonth = {};
  allMonths.forEach(m => { salesByMonth[m] = 0; });
  _prodSalesData.forEach(s => {
    if (item !== 'all' && s.item !== item) return;
    if (country !== 'all' && s.country !== country) return;
    if (salesByMonth[s.year_month] !== undefined) salesByMonth[s.year_month] += (s.sales_count || 0);
  });
  const totalSalesAll = allMonths.reduce((a, m) => a + salesByMonth[m], 0);
  const totalClaimsAll = allMonths.reduce((a, m) => a + claimsByMonth[m], 0);
  const totalDefect = totalSalesAll > 0 ? ((totalClaimsAll / totalSalesAll) * 100).toFixed(2) + '%' : '-';

  const salesRow = `<tr style="background:rgba(0,196,140,0.05)">
    <td colspan="4" style="text-align:right;font-size:11px;color:var(--accent-emerald);font-weight:600;padding:8px 10px">📦 매출량</td>
    ${allMonths.map(m => {
      const v = salesByMonth[m];
      return `<td style="text-align:center;font-size:11px;color:${v>0?'var(--accent-emerald)':'var(--text-muted)'}">${v>0?v.toLocaleString():'-'}</td>`;
    }).join('')}
    <td style="font-weight:700;color:var(--accent-emerald);text-align:center">${totalSalesAll>0?totalSalesAll.toLocaleString()+' 개':'-'}</td>
  </tr>`;
  const defectRow = `<tr style="background:rgba(255,179,71,0.05)">
    <td colspan="4" style="text-align:right;font-size:11px;color:var(--accent-amber);font-weight:600;padding:8px 10px">📊 불량지수 (×100)</td>
    ${allMonths.map(m => {
      const s = salesByMonth[m]; const c2 = claimsByMonth[m];
      const idx = s > 0 ? ((c2 / s) * 100).toFixed(2) : null;
      return `<td style="text-align:center;font-size:11px;color:${idx!==null?'var(--accent-amber)':'var(--text-muted)'}">${idx!==null?idx+'%':'-'}</td>`;
    }).join('')}
    <td style="font-weight:700;color:var(--accent-amber);text-align:center">${totalDefect}</td>
  </tr>`;

  wrap.innerHTML = `
    <table class="data-table" style="font-size:11px;min-width:800px">
      <thead>
        <tr style="background:rgba(255,255,255,0.97)">
          <th style="text-align:center;width:150px;min-width:150px;word-break:keep-all">하자유형</th>
          <th style="text-align:center;white-space:nowrap;min-width:85px">판정유형</th>
          <th style="text-align:left;min-width:280px">판정내용 (상세)</th>
          <th style="text-align:center;white-space:nowrap;min-width:60px">상태</th>
          ${mh}
          <th style="text-align:center;white-space:nowrap;font-weight:700">합계</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
      <tfoot>${salesRow}${defectRow}</tfoot>
    </table>`;

  const tableTitle = document.getElementById('prodTableTitle');
  if (tableTitle) {
    const item = document.getElementById('prodItemSelect')?.value || 'all';
    tableTitle.textContent = `(${item !== 'all' ? item : '전체 제품'} · ${allMonths[0]||'-'}~${allMonths[allMonths.length-1]||'-'})`;
  }
}

function toggleAccordion(i) { document.getElementById('acc-'+i).classList.toggle('open'); }

// 페이지 로드 시 자동 호출 (아래 initSupabase에서 호출)


// Receipt - Category drill-down data
const categoryData = {
  '작동성': [
    {product:'T50', items:[{name:'헤드레스트 작동불만(파손)',count:77},{name:'틸팅 레버 작동안됨',count:65},{name:'럼버 흘러내림',count:37},{name:'중심봉 기능 불만',count:34},{name:'팔걸이 높이조절 불가',count:1},{name:'뎁스 뻑뻑함',count:1},{name:'헤드 고정 불만',count:2}]},
    {product:'T80', items:[{name:'헤드레스트 고정 불만',count:2},{name:'리머 가공 문제 높이조절 불가',count:2}]},
    {product:'T90', items:[{name:'높이조절 불가',count:9},{name:'팔걸이 회전 불만',count:4}]},
    {product:'T25', items:[{name:'높이조절 불가(리머+테이퍼)',count:29}]},
    {product:'GC', items:[{name:'헤드 고정 불만',count:2},{name:'좌판 쿨링 기능 불만',count:1}]},
    {product:'S틸트', items:[{name:'리머문제 높이조절 불가',count:2}]},
    {product:'T55', items:[{name:'헤드 고정 불만',count:1}]},
  ],
  '소음': [
    {product:'T50', items:[{name:'좌판 소음',count:30},{name:'리머+테이퍼 소음',count:22},{name:'등판 소음',count:8},{name:'럼버 소음',count:8},{name:'틸팅 시 소음',count:8},{name:'스트럭쳐 소음',count:4}]},
    {product:'캐스터', items:[{name:'캐스터 소음',count:13}]},
    {product:'T80', items:[{name:'등판 메쉬 소음',count:2},{name:'리머+테이퍼 소음',count:2}]},
    {product:'4000G', items:[{name:'틸팅 시 소음',count:30}]},
  ],
  '파손': [
    {product:'종타이', items:[{name:'락커 파손',count:33}]},
    {product:'T20', items:[{name:'팔걸이 파손',count:11},{name:'스트럭처 파손',count:2}]},
    {product:'T50', items:[{name:'등판 스트럭쳐 파손',count:6},{name:'암버튼 파손',count:5},{name:'메쉬 찢김',count:3}]},
    {product:'GC', items:[{name:'좌판 미싱 헤짐',count:8},{name:'팔걸이 파손',count:2}]},
  ],
  '유격': [
    {product:'T50', items:[{name:'좌판 유격',count:23},{name:'팔걸이 유격',count:15},{name:'틸트 1단 유격',count:8}]},
  ],
  '수평': [
    {product:'T50', items:[{name:'수평 불만',count:26},{name:'리머+테이퍼로 인한 수평',count:11}]},
    {product:'T80', items:[{name:'수평 불만',count:5}]},
    {product:'아이블', items:[{name:'수평불만',count:4}]},
  ],
  '기타': [
    {product:'고객 부주의', items:[{name:'고객 부주의',count:12}]},
    {product:'T50', items:[{name:'착좌감 불만',count:7},{name:'외관 주름',count:8}]},
    {product:'T80', items:[{name:'착좌감 불만',count:6}]},
    {product:'기타', items:[{name:'기타(회수품 정상)',count:23},{name:'고객 오주문',count:4}]},
  ]
};

function toggleCategory(cat) { toggleCategoryLive(cat); }

function toggleCategoryLive(cat) {
  const detail = document.getElementById('categoryDetail');
  const body = document.getElementById('categoryDetailBody');
  const title = document.getElementById('categoryDetailTitle');
  title.textContent = cat + ' — 제품별 건수 (실시간)';
  if (!window._liveCatData || !window._liveCatData[cat]) {
    body.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">데이터가 없습니다. 먼저 날짜 조회를 실행해 주세요.</div>';
    detail.style.display='block'; return;
  }
  const ld = window._liveCatData[cat];
  const prods = Object.entries(ld).map(([item, claims]) => {
    const defects = {}; claims.forEach(c=>{ const dt=c.defect_type||c.claim_detail||'기타'; defects[dt]=(defects[dt]||0)+1; });
    return { product:item, items:Object.entries(defects).map(([n,c])=>({name:n,count:c})).sort((a,b)=>b.count-a.count) };
  }).sort((a,b)=>b.items.reduce((s,x)=>s+x.count,0)-a.items.reduce((s,x)=>s+x.count,0));
  let h='<table class="data-table" style="font-size:11px"><thead><tr><th style="text-align:left">제품</th><th style="text-align:left">하자 내용</th><th>건수</th><th>상세</th></tr></thead><tbody>';
  prods.forEach(p=>{ const tot=p.items.reduce((s,x)=>s+x.count,0);
    p.items.forEach((it,idx)=>{ h+='<tr>'; if(idx===0) h+=`<td class="row-header" rowspan="${p.items.length}" style="vertical-align:top">${p.product}<br><span style="font-family:'JetBrains Mono';font-size:13px;color:var(--sidiz-blue-bright);font-weight:700">${tot}건</span></td>`;
      h+=`<td style="text-align:left">${it.name}</td><td style="font-weight:600">${it.count}</td><td><button onclick="showClaimDetail('${p.product.replace(/'/g,"\\'")}','${it.name.replace(/'/g,"\\'")}')" style="background:rgba(0,87,184,0.1);border:1px solid rgba(0,87,184,0.2);color:var(--sidiz-blue-bright);padding:3px 8px;border-radius:5px;cursor:pointer;font-size:10px">접수건 조회</button></td></tr>`; }); });
  h+='</tbody></table><div style="padding:6px 14px;font-size:10px;color:var(--accent-emerald);border-top:1px solid var(--border)">✓ claims_receipt 실시간</div>';
  body.innerHTML=h; detail.style.display='block'; detail.scrollIntoView({behavior:'smooth',block:'nearest'});
}

async function showClaimDetail(product, defectType) {
  const detail = document.getElementById('claimDetail');
  const title = document.getElementById('claimDetailTitle');
  const body = document.getElementById('claimDetailBody');
  title.textContent = product+' — '+defectType+' (접수건 상세)';
  body.innerHTML='<div style="text-align:center;padding:24px"><div style="font-size:28px;margin-bottom:8px">⏳</div><p style="color:var(--text-secondary);font-size:12px">Supabase에서 조회 중...</p></div>';
  detail.style.display='block'; detail.scrollIntoView({behavior:'smooth',block:'nearest'});
  try {
    const claims = await SupabaseClient.fetchReceiptByDefect(product, defectType);
    if(claims.length===0){ body.innerHTML='<div style="text-align:center;padding:24px;color:var(--text-muted)">📭 해당 조건의 접수건이 없습니다.</div>'; return; }
    let h='<table class="data-table" style="font-size:11px"><thead><tr><th style="text-align:left">접수번호</th><th style="text-align:left">접수일</th><th style="text-align:left">제품/모델</th><th style="text-align:left">카테고리</th><th style="text-align:left">하자유형</th><th style="text-align:left">판정유형</th><th style="text-align:left">클레임 상세</th><th style="text-align:left">판정결과</th></tr></thead><tbody>';
    claims.forEach(c=>{ h+=`<tr><td style="text-align:left;color:var(--sidiz-blue-bright);font-weight:600">${c.receipt_id||'-'}</td><td style="text-align:left">${c.receipt_date||'-'}</td><td style="text-align:left">${c.item||'-'}${c.model?' / '+c.model:''}</td><td style="text-align:left">${c.category||'-'}</td><td style="text-align:left">${c.defect_type||'-'}</td><td style="text-align:left">${c.judgement_type||'-'}</td><td style="text-align:left;max-width:250px;white-space:normal">${c.claim_detail||'-'}</td><td style="text-align:left">${c.inspection_result||'-'}</td></tr>`; });
    h+=`</tbody></table><div style="padding:8px 14px;font-size:11px;color:var(--accent-emerald);border-top:1px solid var(--border)">✓ ${claims.length}건 · claims_receipt 실시간</div>`;
    body.innerHTML=h;
  } catch(e) { body.innerHTML=`<div style="text-align:center;padding:24px;color:var(--accent-rose)">⚠️ 조회 오류: ${e.message}</div>`; }
}

// ─── Supabase 초기 연결 ───
async function initSupabase() {
  const badge = document.getElementById('connectionBadge');
  try {
    const cnt = await SupabaseClient.supabaseCount('claims');
    let rcnt = 0; try { rcnt = await SupabaseClient.supabaseCount('claims_receipt'); } catch(e){}
    console.log('✅ Supabase:', cnt, '회수일,', rcnt, '접수일');
    if(badge) { const parts=[]; if(cnt>0) parts.push('회수'+cnt); if(rcnt>0) parts.push('접수'+rcnt);
      badge.innerHTML = '● LIVE ('+(parts.length>0?parts.join('·'):cnt+'건')+')';
      badge.style.background='rgba(0,196,140,0.1)'; badge.style.borderColor='rgba(0,196,140,0.2)'; badge.style.color='var(--accent-emerald)'; }
    // 홈 KPI 카드 ① 총 클레임 건수 — 2026년 · 시디즈 · 유효카테고리 정확한 건수
    const VALID_CATS = ['제조','설계','서비스','사양재검토','고객불만'];
    const curYear = new Date().getFullYear();
    try {
      // ① 브랜드 드롭다운 채우기 — 전체 브랜드 목록은 별도 쿼리로
      const brandList = await SupabaseClient.fetchClaims(
        `select=brand&claim_date=gte.${curYear}-01-01&claim_date=lte.${curYear}-12-31&limit=5000`
      );
      const brands = [...new Set((brandList||[]).map(c=>c.brand).filter(Boolean))].sort();
      const kbs = document.getElementById('kpiBrandSelect');
      if (kbs) {
        kbs.innerHTML = '<option value="all">전체</option>' + brands.map(b=>`<option value="${b}">${b}</option>`).join('');
        const sidizOpt = Array.from(kbs.options).find(o => o.text === '시디즈');
        if (sidizOpt) {
          kbs.value = sidizOpt.value;
          if (window.KpiModule) window.KpiModule.onKpiBrandChange(sidizOpt.value);
        }
      }
      // ② 시디즈 2026년 유효카테고리 정확한 건수 (헤더 카운트, 데이터 fetch 없음)
      const el = id => document.getElementById(id);
      const catFilter = VALID_CATS.map(c=>`category=eq.${encodeURIComponent(c)}`).join('&');
      const claimCount = await SupabaseClient.supabaseCountFiltered(
        'claims',
        `brand=eq.시디즈&claim_date=gte.${curYear}-01-01&claim_date=lte.${curYear}-12-31&category=in.(${VALID_CATS.join(',')})`
      );
      el('homeClaimCount').textContent = claimCount.toLocaleString();
      el('homeClaimSub').textContent = `${curYear}년 YTD · 시디즈 · 판정기준`;
    } catch(e) { console.warn('홈 클레임 카운트 실패:', e); }

    // 제품별 클레임 탭은 탭 클릭 시 lazy 로드 (_prodLoaded 플래그로 제어)
    // KPI 고객클레임 현황 초기화 (Supabase 데이터로 업데이트)
    if (window.KpiModule) await window.KpiModule.initKpiSection();
    if (window.CostModule) await window.CostModule.renderCostSection('2026');

    // 홈 KPI 나머지 카드 채우기 (KPI/Cost 모듈이 Supabase로 업데이트된 후)
    try {
      const el = id => document.getElementById(id);
      // 불량지수: KPI_DATA 2026 (Supabase 반영 후)
      if (window.KpiModule && window.KpiModule.KPI_DATA) {
        const kd = window.KpiModule.KPI_DATA[String(curYear)];
        if (kd) {
          const tJ = kd.judgement.kr.map((v,i)=>(v||0)+(kd.judgement.vn[i]||0));
          const tS = kd.sales.kr.map((v,i)=>(v||0)+(kd.sales.vn[i]||0));
          const totalJ = tJ.reduce((s,v)=>s+v,0), totalS = tS.reduce((s,v)=>s+v,0);
          const nonZeroM = tJ.filter(v=>v>0).length || 1;
          if (totalS > 0) {
            el('homeDefectIdx').textContent = ((totalJ/totalS)*100).toFixed(2)+'%';
            el('homeDefectSub').textContent = `${curYear}년 YTD · 목표 1.50%`;
          } else {
            el('homeDefectIdx').textContent = totalJ > 0 ? totalJ+'건' : '-';
            el('homeDefectSub').textContent = '매출 데이터 필요';
          }
        }
      }
      // 하자보수비·실패비용: CostModule (Supabase 반영 후)
      if (window.CostModule && window.CostModule.COST_DATA) {
        const cd = window.CostModule.COST_DATA[String(curYear)];
        if (cd) {
          const mc = (cd.haza_subtotal||[]).filter(v=>v>0).length || 1;
          const hazaT = (cd.haza_subtotal||[]).reduce((s,v)=>s+(v||0),0);
          const barosT = (cd.baros_subtotal||[]).reduce((s,v)=>s+(v||0),0);
          const jeT   = (cd.je_haza||[]).reduce((s,v)=>s+(v||0),0);
          el('homeCostAvg').textContent = hazaT > 0 ? Math.round(hazaT/mc/10000).toLocaleString()+'만' : '-';
          el('homeCostSub').textContent = `${curYear}년 월평균 · 목표: ${cd.target?.haza_subtotal ? Math.round(cd.target.haza_subtotal/10000).toLocaleString()+'만' : '-'}`;
          el('homeSalesCount').textContent = (hazaT+barosT+jeT) > 0 ? ((hazaT+barosT+jeT)/100000000).toFixed(2)+'억' : '-';
          el('homeSalesSub').textContent = `${curYear}년 누적 · 하자+바로스`;
        }
      }
    } catch(e) { console.warn('홈 KPI 나머지 카드 실패:', e); }
  } catch(e) { console.error('Supabase 연결 실패:', e);
    if(badge) { badge.innerHTML='⚠ 오프라인'; badge.style.background='rgba(255,179,71,0.1)'; badge.style.borderColor='rgba(255,179,71,0.2)'; badge.style.color='var(--accent-amber)'; } }
}
document.addEventListener('DOMContentLoaded', () => setTimeout(initSupabase, 300));

// ─── iframe 감지 → embed-mode 적용 ─────────────────────────────────────────
(function detectEmbed() {
  try {
    if (window.self !== window.top) {
      document.body.classList.add('embed-mode');
    }
  } catch(e) {
    // cross-origin iframe에서 window.top 접근 시 오류 → iframe 안에 있는 것
    document.body.classList.add('embed-mode');
  }
})();

// ─── URL 파라미터로 섹션/브랜드 자동 이동 ───────────────────────────────────
(function applyUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const section = params.get('section');
  const brand   = params.get('brand');
  const share   = params.get('share');

  // ?share=receipt → 클레임 현황(접수일) 전용 공유 모드
  if (share === 'receipt') {
    document.body.classList.add('share-mode');
    setTimeout(() => {
      showSection('claim');
      setTimeout(() => {
        const receiptBtn = document.querySelector('#section-claim .sub-tab[onclick*="receipt"]');
        if (receiptBtn) showClaimTab('receipt', receiptBtn);
      }, 300);
    }, 600);
    return;
  }

  if (section) {
    // KPI 모듈 로딩 후 이동 (약간 지연)
    setTimeout(() => {
      showSection(section);

      // brand 파라미터 처리
      const brandSel = document.getElementById('kpiBrandSelect');
      if (brandSel && brand) {
        // 옵션이 동적으로 생성되므로 KpiModule 로딩 후 적용
        const applyBrand = () => {
          const opt = Array.from(brandSel.options).find(o => o.value === brand || o.text === brand);
          if (opt) {
            brandSel.value = opt.value;
            if (window.KpiModule) window.KpiModule.onKpiBrandChange(opt.value);
          }
        };
        // KpiModule이 준비될 때까지 재시도
        let tries = 0;
        const tryApply = setInterval(() => {
          if (window.KpiModule || tries++ > 20) { clearInterval(tryApply); applyBrand(); }
        }, 200);
      }
    }, 600);
  }

  // ?section=kpi 일 때 브랜드 기본값: 시디즈 + 자동 분석 생성
  if (section === 'kpi') {
    setTimeout(() => {
      const applyDefault = () => {
        // 브랜드 기본값: 시디즈
        if (!brand) {
          const brandSel = document.getElementById('kpiBrandSelect');
          if (brandSel) {
            const opt = Array.from(brandSel.options).find(o => o.text === '시디즈');
            if (opt) { brandSel.value = opt.value; if (window.KpiModule) window.KpiModule.onKpiBrandChange(opt.value); }
          }
        }
        // 전월/당월 기본값: 2026-01(전월) → 2026-02(당월)
        const analysisPrev     = document.getElementById('analysisPrevMonth');
        const analysisCur      = document.getElementById('analysisCurMonth');
        const costAnalysisPrev = document.getElementById('costAnalysisPrevMonth');
        const costAnalysisCur  = document.getElementById('costAnalysisCurMonth');
        if (analysisPrev)     analysisPrev.value     = '2026-01';
        if (analysisCur)      analysisCur.value      = '2026-02';
        if (costAnalysisPrev) costAnalysisPrev.value = '2026-01';
        if (costAnalysisCur)  costAnalysisCur.value  = '2026-02';
        // 자동 분석 생성
        setTimeout(() => {
          if (typeof runKpiAutoAnalysis === 'function') runKpiAutoAnalysis();
          if (typeof runCostAutoAnalysis === 'function') runCostAutoAnalysis();
        }, 400);
      };
      let tries = 0;
      const tryDefault = setInterval(() => {
        if ((typeof KPI_DATA !== 'undefined') || tries++ > 20) { clearInterval(tryDefault); applyDefault(); }
      }, 200);
    }, 800);
  }
})();

// OKR Year tabs
function showOkrYear(year, btn) {
  document.querySelectorAll('.okr-year-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.okr-year-tab').forEach(t => t.classList.remove('active'));
  const target = document.getElementById('okr-' + year);
  if (target) { target.classList.add('active'); btn.classList.add('active'); }
}

function addOkrYear() {
  const years = document.querySelectorAll('.okr-year-tab');
  const lastYear = parseInt(years[years.length - 1].textContent);
  const newYear = lastYear + 1;
  
  // Add tab
  const tab = document.createElement('button');
  tab.className = 'okr-year-tab';
  tab.textContent = newYear;
  tab.onclick = function() { showOkrYear(newYear, this); };
  document.querySelector('.okr-add-year').before(tab);
  
  // Add content
  const content = document.createElement('div');
  content.id = 'okr-' + newYear;
  content.className = 'okr-year-content';
  content.innerHTML = `
    <div class="okr-summary">
      <div class="okr-summary-card"><div class="okr-summary-label">Objectives</div><div class="okr-summary-value" style="color:var(--sidiz-blue-bright)">-</div></div>
      <div class="okr-summary-card"><div class="okr-summary-label">Key Results</div><div class="okr-summary-value" style="color:var(--accent-cyan)">-</div></div>
      <div class="okr-summary-card"><div class="okr-summary-label">평균 달성률</div><div class="okr-summary-value" style="color:var(--accent-amber)">-</div></div>
      <div class="okr-summary-card"><div class="okr-summary-label">완료</div><div class="okr-summary-value" style="color:var(--accent-emerald)">-</div></div>
    </div>
    <div style="text-align:center;padding:40px;color:var(--text-muted)">
      <div style="font-size:36px;margin-bottom:12px">📝</div>
      <p style="font-size:14px;font-weight:500;margin-bottom:6px">${newYear}년 OKR을 작성해 주세요</p>
      <p style="font-size:12px">Objective(목표)와 Key Result(핵심결과)를 등록하면 이곳에 표시됩니다.</p>
    </div>`;
  document.getElementById('okr-' + lastYear).after(content);
  showOkrYear(newYear, tab);
}

// ── 요구내역 팝오버 ──
function showDetailPopover(event, encodedText) {
  event.stopPropagation();
  const text = decodeURIComponent(encodedText) || '(내용 없음)';
  let pop = document.getElementById('detailPopover');
  if (!pop) return;
  pop.querySelector('#detailPopoverText').textContent = text;
  pop.style.display = 'block';

  // 위치 계산 (클릭 지점 기준)
  const x = event.clientX;
  const y = event.clientY;
  const pw = 340;
  const ph = pop.offsetHeight || 160;
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  let left = x + 10;
  let top  = y + 10;
  if (left + pw > ww - 10) left = x - pw - 10;
  if (top  + ph > wh - 10) top  = y - ph - 10;
  pop.style.left = left + 'px';
  pop.style.top  = top  + 'px';
}

function closeDetailPopover() {
  const pop = document.getElementById('detailPopover');
  if (pop) pop.style.display = 'none';
}

document.addEventListener('click', function(e) {
  const pop = document.getElementById('detailPopover');
  if (pop && pop.style.display === 'block' && !pop.contains(e.target)) {
    pop.style.display = 'none';
  }
});
// ─── Confluence 연동 함수들 ──────────────────────────────────────────────────

async function confluenceUpload() {
  const btn = document.getElementById('confluenceUploadBtn');
  const year = document.getElementById('kpiYearSelect')?.value || '2026';
  const monthRange = parseInt(document.getElementById('kpiMonthRange')?.value || '2');
  const curM  = monthRange - 1; // 0-based
  const prevM = curM - 1;

  const kd = (typeof KPI_DATA !== 'undefined' ? KPI_DATA : window.KpiModule?.KPI_DATA)?.[year];
  if (!kd) { showConfluenceToast('error', 'KPI 데이터를 찾을 수 없습니다. KPI 현황 탭을 먼저 열어주세요.'); return; }

  // ── 판정유형별 클레임 행 구성 ──
  const cats = ['제조','설계','서비스','고객불만','사양재검토'];
  const claimRows = [];
  let prevTotal = 0, curTotal = 0;

  cats.forEach(cat => {
    const pKr = prevM >= 0 ? (kd.detail_kr[cat]?.[prevM] || 0) : 0;
    const cKr = kd.detail_kr[cat]?.[curM] || 0;
    const pVn = prevM >= 0 ? (kd.detail_vn[cat]?.[prevM] || 0) : 0;
    const cVn = kd.detail_vn[cat]?.[curM] || 0;
    const prev = pKr + pVn, cur = cKr + cVn;
    const diff = cur - prev;
    prevTotal += prev; curTotal += cur;
    claimRows.push({
      label: cat,
      prev:  prev > 0 ? prev.toString() : '-',
      cur:   cur  > 0 ? cur.toString()  : '-',
      change: diff !== 0 ? (diff > 0 ? `▲${diff}` : `▼${Math.abs(diff)}`) : '±0',
      changeColor: diff > 0 ? '#e74c3c' : diff < 0 ? '#27ae60' : '#888'
    });
  });

  // 합계 행
  const totalDiff = curTotal - prevTotal;
  claimRows.push({
    label: '합계',
    prev:  prevTotal > 0 ? prevTotal.toString() : '-',
    cur:   curTotal  > 0 ? curTotal.toString()  : '-',
    change: totalDiff !== 0 ? (totalDiff > 0 ? `▲${totalDiff}` : `▼${Math.abs(totalDiff)}`) : '±0',
    changeColor: totalDiff > 0 ? '#e74c3c' : totalDiff < 0 ? '#27ae60' : '#888'
  });

  // 불량지수 행
  const prevSales = prevM >= 0 ? ((kd.sales.kr[prevM]||0)+(kd.sales.vn[prevM]||0)) : 0;
  const curSales  = (kd.sales.kr[curM]||0)+(kd.sales.vn[curM]||0);
  claimRows.push({
    label: '불량지수 (%)',
    prev:  prevSales > 0 ? ((prevTotal/prevSales)*100).toFixed(2)+'%' : '-',
    cur:   curSales  > 0 ? ((curTotal/curSales)*100).toFixed(2)+'%'  : '-',
    change: '-',
    changeColor: '#888'
  });

  // ── 실패비용 행 구성 (CostModule 데이터 참조) ──
  const failureCostRows = [];
  const cd = window.CostModule?.COST_DATA?.[year];
  if (cd) {
    [
      { label: '제품 (하자보수비)',   key: 'haza_product'    },
      { label: '자재 (하자보수비)',   key: 'haza_material'   },
      { label: '클레임 보상',        key: 'haza_claim'      },
      { label: '(반)하자보수비 계',  key: 'haza_subtotal'   },
      { label: 'AS 컨택센터',        key: 'baros_contact'   },
      { label: 'AS조치비(무상)',      key: 'baros_as'        },
      { label: 'AS물류비',           key: 'baros_logistics' },
      { label: '바로스 AS 계',       key: 'baros_subtotal'  },
    ].forEach(ci => {
      const arr = cd[ci.key]; if (!arr) return;
      const prev = prevM >= 0 ? (arr[prevM]||0) : 0;
      const cur  = arr[curM]||0;
      const diff = Math.round((cur - prev)/10000);
      failureCostRows.push({
        label: ci.label,
        prev:  prev > 0 ? Math.round(prev/10000).toLocaleString()+'만원' : '-',
        cur:   cur  > 0 ? Math.round(cur/10000).toLocaleString()+'만원'  : '-',
        change: diff !== 0 ? (diff > 0 ? `▲${diff}만` : `▼${Math.abs(diff)}만`) : '±0'
      });
    });
  }

  const reportMonth  = `${year}-${String(monthRange).padStart(2,'0')}`;
  const analysisNote = document.getElementById('kpiClaimNoteArea')?.value || '';

  // ── API 호출 ──
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 업로드 중...'; }
  showConfluenceToast('loading', '⏳ Confluence 페이지에 업로드 중입니다...');

  try {
    const res = await fetch('/api/confluence-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportMonth, claimRows, analysisNote, failureCostRows, updatedAt: new Date().toLocaleString('ko-KR') })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showConfluenceToast('success', `✅ ${json.message}<br><a href="${json.pageUrl}" target="_blank" style="color:#90EE90;text-decoration:underline">🔗 Confluence 페이지 바로가기</a>`);
    } else {
      const missing = json.missing?.join(', ');
      showConfluenceToast('error', `❌ 업로드 실패: ${json.error || '알 수 없는 오류'}${missing ? '<br><small>미설정 환경변수: '+missing+'</small>' : ''}`);
    }
  } catch(e) {
    showConfluenceToast('error', `❌ 연결 오류: ${e.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<span>Confluence 업로드</span>'; }
  }
}

function confluenceIframeGuide() {
  const modal = document.getElementById('confluenceGuideModal');
  if (modal) modal.style.display = 'flex';
}

function showConfluenceToast(type, msg) {
  const el = document.getElementById('confluenceToast');
  if (!el) return;
  el.innerHTML = msg;
  el.style.display = 'block';
  el.style.background = type === 'success' ? 'rgba(30,130,76,0.97)'
                       : type === 'error'   ? 'rgba(180,30,30,0.97)'
                       : 'rgba(20,35,60,0.97)';
  el.style.border = type === 'success' ? '1px solid rgba(39,174,96,0.5)'
                  : type === 'error'   ? '1px solid rgba(231,76,60,0.5)'
                  : '1px solid rgba(74,158,255,0.3)';
  el.style.color = '#fff';
  if (type !== 'loading') setTimeout(() => { el.style.display = 'none'; }, 7000);
}

// ─── 인원현황 조직도 ─────────────────────────────────────────
const ORG_GROUPS = [
  { key:'inspection', label:'인수검사', desc:'입고 자재 · 제품 품질 검증', color:'#00c48c', emoji:'🔍' },
  { key:'as',         label:'AS판정',   desc:'클레임 판정 · 원인 분석',   color:'#ff6b7a', emoji:'🔧' },
  { key:'lab',        label:'시험실',   desc:'제품 시험 · 인증 관리',     color:'#a78bfa', emoji:'🔬' },
  { key:'office',     label:'사무실',   desc:'클레임 관리 · KPI · 기획', color:'#ffb347', emoji:'💼' },
];
let _orgData = [], _orgEditMode = false, _orgLoaded = false;
let _orgDragId = null, _orgPopupId = null, _orgPendingChanges = {};

async function loadOrgChart() {
  try {
    const url = `${SupabaseClient.SUPABASE_URL}/rest/v1/org_members?select=*&order=sort_order.asc`;
    const r = await fetch(url, { headers:{ apikey:SupabaseClient.SUPABASE_ANON_KEY, Authorization:`Bearer ${SupabaseClient.SUPABASE_ANON_KEY}` } });
    _orgData = await r.json();
    _orgPendingChanges = {};
    _renderOrgChart();
  } catch(e) { console.error('loadOrgChart', e); }
}

function _renderOrgChart() {
  const c = document.getElementById('orgChartContainer');
  if (!c) return;
  const total = _orgData.length;
  const countEl = document.getElementById('orgMemberCount');
  if (countEl) countEl.textContent = `품질관리팀 총 ${total}명`;

  const leader = _orgData.find(m => m.group_key === 'leader');
  let h = `<div style="display:flex;flex-direction:column;align-items:center;gap:0;padding:20px 0">`;

  // ── 팀장 카드 ──
  h += `<div style="background:linear-gradient(135deg,#0057b8,#2d7dd2);border-radius:14px;padding:20px 40px;text-align:center;box-shadow:0 8px 24px rgba(0,87,184,0.3);border:1px solid rgba(74,158,255,0.3);position:relative;min-width:220px"
    ${!_orgEditMode && leader ? `onclick="_orgOpenPopup('${leader.id}')" style="background:linear-gradient(135deg,#0057b8,#2d7dd2);border-radius:14px;padding:20px 40px;text-align:center;box-shadow:0 8px 24px rgba(0,87,184,0.3);border:1px solid rgba(74,158,255,0.3);position:relative;min-width:220px;cursor:pointer"` : ''}>`;
  if (_orgEditMode && leader) {
    h += `<div style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:1px;margin-bottom:6px">TEAM LEADER</div>
      <input value="${leader.name}" onchange="_orgPendingChanges['${leader.id}']={...(_orgPendingChanges['${leader.id}']||{}),name:this.value};_orgLocalUpdate('${leader.id}','name',this.value)"
        style="font-size:17px;font-weight:700;color:white;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:6px;padding:3px 10px;text-align:center;width:160px;display:block;margin:0 auto 6px">
      <input value="${leader.role}" placeholder="직책" onchange="_orgPendingChanges['${leader.id}']={...(_orgPendingChanges['${leader.id}']||{}),role:this.value};_orgLocalUpdate('${leader.id}','role',this.value)"
        style="font-size:11px;color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:2px 8px;text-align:center;width:160px;display:block;margin:0 auto">`;
  } else if (leader) {
    h += `<div style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:1px">TEAM LEADER</div>
      <div style="font-size:18px;font-weight:700;color:white;margin-top:5px">${leader.name}${leader.role?` <span style="font-size:12px;opacity:0.75">${leader.role}</span>`:''}</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:3px">품질관리팀 총괄</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:6px">클릭하여 업무 확인</div>`;
  }
  h += `</div>`;
  h += `<div style="width:2px;height:32px;background:var(--border-light)"></div>`;
  h += `<div style="height:2px;background:var(--border-light);align-self:stretch;margin:0 60px"></div>`;
  h += `</div>`;

  // ── 4개 그룹 ──
  h += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;width:100%">`;
  for (const g of ORG_GROUPS) {
    const members = _orgData.filter(m => m.group_key === g.key).sort((a,b) => a.sort_order - b.sort_order);
    h += `<div style="display:flex;flex-direction:column;align-items:center">
      <div style="width:2px;height:20px;background:var(--border-light)"></div>
      <div style="background:var(--sidiz-card);border:1px solid var(--border);border-top:3px solid ${g.color};border-radius:10px;padding:11px 14px;text-align:center;width:100%;box-sizing:border-box">
        <div style="font-size:14px;font-weight:700;color:var(--text-primary)">${g.emoji} ${g.label}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${g.desc}</div>
      </div>
      <div id="org-members-${g.key}" style="display:flex;flex-direction:column;gap:6px;width:100%;margin-top:8px"
        ondragover="event.preventDefault();_orgDragOver(event,'${g.key}')"
        ondrop="_orgDrop(event,'${g.key}')">`;
    for (const m of members) h += _orgMemberCard(m, g);
    if (_orgEditMode) {
      h += `<button onclick="_orgAddMember('${g.key}')"
        style="width:100%;padding:8px;background:rgba(74,158,255,0.05);border:1px dashed rgba(74,158,255,0.25);border-radius:8px;color:var(--sidiz-blue-bright);font-size:12px;cursor:pointer;box-sizing:border-box;margin-top:2px">
        + 인원 추가
      </button>`;
    }
    h += `</div></div>`;
  }
  h += `</div>`;

  // ── 하단 안내 ──
  h += `<div style="margin-top:24px;padding:13px 20px;background:rgba(0,87,184,0.05);border:1px dashed rgba(0,87,184,0.2);border-radius:10px;font-size:11px;color:var(--text-muted);text-align:center">
    📋 품질관리팀 총 <strong style="color:var(--text-secondary)">${total}명</strong>
    ${_orgEditMode
      ? ' &nbsp;·&nbsp; <span style="color:var(--accent-amber)">카드를 드래그해서 순서를 변경하세요. 변경사항은 저장 버튼으로 반영됩니다.</span>'
      : ' &nbsp;·&nbsp; 카드를 클릭하면 담당 업무를 확인·편집할 수 있습니다'}
  </div>`;

  c.innerHTML = h;
}

function _orgMemberCard(m, g) {
  if (_orgEditMode) {
    return `<div id="org-card-${m.id}" draggable="true"
      ondragstart="_orgDragStart(event,'${m.id}')"
      ondragend="document.querySelectorAll('.org-drag-over').forEach(el=>{el.style.borderColor='var(--border)';el.classList.remove('org-drag-over')})"
      style="background:var(--sidiz-card);border:1px solid var(--border);border-radius:8px;padding:9px 10px;display:flex;align-items:center;gap:7px;cursor:grab;box-sizing:border-box;transition:border-color 0.15s">
      <span style="color:var(--text-muted);font-size:18px;cursor:grab;flex-shrink:0;line-height:1">⠿</span>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">
        <div style="display:flex;gap:4px">
          <input value="${m.name}" onchange="_orgLocalUpdate('${m.id}','name',this.value)"
            style="font-size:12px;font-weight:600;color:var(--text-primary);background:var(--sidiz-dark2);border:1px solid var(--border);border-radius:4px;padding:2px 6px;width:0;flex:1;min-width:0">
          <input value="${m.role}" placeholder="직책" onchange="_orgLocalUpdate('${m.id}','role',this.value)"
            style="font-size:10px;color:var(--text-muted);background:var(--sidiz-dark2);border:1px solid var(--border);border-radius:4px;padding:2px 5px;width:52px;flex-shrink:0">
        </div>
        <input value="${m.job_desc||''}" placeholder="카드 표시 업무 타이틀" onchange="_orgLocalUpdate('${m.id}','job_desc',this.value)"
          style="font-size:10px;color:var(--text-muted);background:var(--sidiz-dark2);border:1px solid var(--border);border-radius:4px;padding:2px 6px;width:100%;box-sizing:border-box">
      </div>
      <button onclick="_orgDeleteMember('${m.id}')"
        style="background:rgba(255,107,122,0.1);border:1px solid rgba(255,107,122,0.25);color:#ff6b7a;border-radius:6px;padding:3px 7px;font-size:12px;cursor:pointer;flex-shrink:0;line-height:1">×</button>
    </div>`;
  }
  return `<div onclick="_orgOpenPopup('${m.id}')"
    style="background:var(--sidiz-card);border:1px solid var(--border);border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:9px;cursor:pointer;transition:border-color 0.15s,background 0.15s;box-sizing:border-box"
    onmouseover="this.style.borderColor='${g.color}';this.style.background='var(--sidiz-card-hover)'"
    onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--sidiz-card)'">
    <div style="width:32px;height:32px;border-radius:8px;background:${g.color}22;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${g.emoji}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:12px;font-weight:600;color:var(--text-primary)">
        ${m.name}${m.role?` <span style="font-size:9px;padding:1px 5px;border-radius:3px;background:${g.color}22;color:${g.color}">${m.role}</span>`:''}
      </div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.job_desc || '업무 미등록'}</div>
    </div>
    <span style="color:var(--text-muted);font-size:13px;flex-shrink:0">›</span>
  </div>`;
}

function _orgLocalUpdate(id, field, value) {
  const m = _orgData.find(x => x.id === id);
  if (m) m[field] = value;
  _orgPendingChanges[id] = { ...(_orgPendingChanges[id] || {}), [field]: value };
}

function _orgToggleEdit() {
  _orgEditMode = !_orgEditMode;
  document.getElementById('orgEditBtn').textContent    = _orgEditMode ? '💾 저장' : '✏️ 편집';
  document.getElementById('orgEditBtn').style.background = _orgEditMode ? 'var(--sidiz-blue)' : 'var(--sidiz-card)';
  document.getElementById('orgEditBtn').style.color    = _orgEditMode ? 'white' : 'var(--text-secondary)';
  document.getElementById('orgCancelBtn').style.display = _orgEditMode ? '' : 'none';
  document.getElementById('orgEditBadge').style.display = _orgEditMode ? '' : 'none';
  if (!_orgEditMode) _orgSaveAll();
  _renderOrgChart();
}

function _orgCancelEdit() {
  _orgEditMode = false;
  document.getElementById('orgEditBtn').textContent    = '✏️ 편집';
  document.getElementById('orgEditBtn').style.background = 'var(--sidiz-card)';
  document.getElementById('orgEditBtn').style.color    = 'var(--text-secondary)';
  document.getElementById('orgCancelBtn').style.display = 'none';
  document.getElementById('orgEditBadge').style.display = 'none';
  _orgPendingChanges = {};
  loadOrgChart(); // DB에서 다시 로드 (변경사항 버림)
}

async function _orgSaveAll() {
  const ids = Object.keys(_orgPendingChanges);
  if (ids.length === 0) return;
  const BASE = SupabaseClient.SUPABASE_URL;
  const KEY  = SupabaseClient.SUPABASE_ANON_KEY;
  const HDR  = { apikey:KEY, Authorization:`Bearer ${KEY}`, 'Content-Type':'application/json', Prefer:'return=minimal' };
  for (const id of ids) {
    const payload = { ...(_orgPendingChanges[id]), updated_at: new Date().toISOString() };
    await fetch(`${BASE}/rest/v1/org_members?id=eq.${encodeURIComponent(id)}`, { method:'PATCH', headers:HDR, body:JSON.stringify(payload) });
  }
  _orgPendingChanges = {};
}

async function _orgAddMember(groupKey) {
  const BASE = SupabaseClient.SUPABASE_URL, KEY = SupabaseClient.SUPABASE_ANON_KEY;
  const HDR  = { apikey:KEY, Authorization:`Bearer ${KEY}`, 'Content-Type':'application/json', Prefer:'return=representation' };
  const groupMembers = _orgData.filter(m => m.group_key === groupKey);
  const maxOrder = groupMembers.length > 0 ? Math.max(...groupMembers.map(m => m.sort_order)) + 1 : 0;
  const newId = `${groupKey}-${Date.now()}`;
  const body = { id:newId, name:'이름', role:'', group_key:groupKey, sort_order:maxOrder, job_desc:'' };
  const r = await fetch(`${BASE}/rest/v1/org_members`, { method:'POST', headers:HDR, body:JSON.stringify(body) });
  const created = await r.json();
  _orgData.push(Array.isArray(created) ? created[0] : body);
  _renderOrgChart();
}

async function _orgDeleteMember(id) {
  if (!confirm('해당 인원을 삭제하시겠습니까?')) return;
  const BASE = SupabaseClient.SUPABASE_URL, KEY = SupabaseClient.SUPABASE_ANON_KEY;
  const HDR  = { apikey:KEY, Authorization:`Bearer ${KEY}` };
  await fetch(`${BASE}/rest/v1/org_members?id=eq.${encodeURIComponent(id)}`, { method:'DELETE', headers:HDR });
  _orgData = _orgData.filter(m => m.id !== id);
  delete _orgPendingChanges[id];
  _renderOrgChart();
}

// ── 드래그앤드롭 ──
function _orgDragStart(e, id) {
  _orgDragId = id;
  e.dataTransfer.effectAllowed = 'move';
}
function _orgDragOver(e, groupKey) {
  e.preventDefault();
  const card = e.target.closest('[id^="org-card-"]');
  document.querySelectorAll('.org-drag-over').forEach(el => { el.style.borderColor='var(--border)'; el.classList.remove('org-drag-over'); });
  if (card && card.id !== `org-card-${_orgDragId}`) {
    card.style.borderColor = '#4a9eff';
    card.classList.add('org-drag-over');
  }
}
async function _orgDrop(e, groupKey) {
  e.preventDefault();
  document.querySelectorAll('.org-drag-over').forEach(el => { el.style.borderColor='var(--border)'; el.classList.remove('org-drag-over'); });
  if (!_orgDragId) return;
  const targetCard = e.target.closest('[id^="org-card-"]');
  const targetId = targetCard ? targetCard.id.replace('org-card-','') : null;
  if (!targetId || targetId === _orgDragId) { _orgDragId = null; return; }

  // 두 멤버의 sort_order 교환
  const dragged = _orgData.find(m => m.id === _orgDragId);
  const target  = _orgData.find(m => m.id === targetId);
  if (!dragged || !target) { _orgDragId = null; return; }

  const BASE = SupabaseClient.SUPABASE_URL, KEY = SupabaseClient.SUPABASE_ANON_KEY;
  const HDR  = { apikey:KEY, Authorization:`Bearer ${KEY}`, 'Content-Type':'application/json', Prefer:'return=minimal' };

  // 드래그 대상을 타겟 그룹으로 이동 + 순서 변경
  const newGroup = target.group_key;
  const tmpOrder = target.sort_order;
  if (dragged.group_key === newGroup) {
    // 같은 그룹: 순서 교환
    [dragged.sort_order, target.sort_order] = [tmpOrder, dragged.sort_order];
    await Promise.all([
      fetch(`${BASE}/rest/v1/org_members?id=eq.${dragged.id}`, { method:'PATCH', headers:HDR, body:JSON.stringify({sort_order:dragged.sort_order, group_key:dragged.group_key}) }),
      fetch(`${BASE}/rest/v1/org_members?id=eq.${target.id}`,  { method:'PATCH', headers:HDR, body:JSON.stringify({sort_order:target.sort_order}) })
    ]);
  } else {
    // 다른 그룹으로 이동
    const groupMembers = _orgData.filter(m => m.group_key === newGroup && m.id !== dragged.id).sort((a,b)=>a.sort_order-b.sort_order);
    const idx = groupMembers.findIndex(m => m.id === targetId);
    dragged.group_key = newGroup;
    dragged.sort_order = idx >= 0 ? groupMembers[idx].sort_order - 0.5 : tmpOrder;
    // 새 그룹 sort_order 재정렬
    const newGroupAll = [...groupMembers.slice(0,idx<0?groupMembers.length:idx), dragged, ...groupMembers.slice(idx<0?groupMembers.length:idx)]
      .map((m,i) => ({ ...m, sort_order:i }));
    newGroupAll.forEach(m => { const d = _orgData.find(x=>x.id===m.id); if(d) d.sort_order=m.sort_order; if(d) d.group_key=m.group_key; });
    await Promise.all(newGroupAll.map(m =>
      fetch(`${BASE}/rest/v1/org_members?id=eq.${m.id}`, { method:'PATCH', headers:HDR, body:JSON.stringify({sort_order:m.sort_order, group_key:m.group_key}) })
    ));
  }
  _orgDragId = null;
  _renderOrgChart();
}

// ── 팝업 ──
function _orgOpenPopup(id) {
  if (!id) return;
  const m = _orgData.find(x => x.id === id);
  if (!m) return;
  _orgPopupId = id;
  const g = ORG_GROUPS.find(g => g.key === m.group_key) || { emoji:'👤', label:'', color:'#4a9eff' };
  const isLeader = m.group_key === 'leader';
  document.getElementById('popupAvatar').textContent = isLeader ? '🏅' : g.emoji;
  document.getElementById('popupAvatar').style.background = isLeader ? 'rgba(0,87,184,0.2)' : `${g.color}22`;
  document.getElementById('popupName').textContent = `${m.name}${m.role ? ' ' + m.role : ''}`;
  document.getElementById('popupMeta').textContent = isLeader ? '품질관리팀 총괄' : g.label;
  document.getElementById('popupJobDesc').value = m.job_detail || '';
  document.getElementById('orgPopupOverlay').style.display = 'block';
  document.getElementById('orgPopup').style.display = 'block';
  setTimeout(() => document.getElementById('popupJobDesc').focus(), 50);
}
function _orgClosePopup() {
  document.getElementById('orgPopupOverlay').style.display = 'none';
  document.getElementById('orgPopup').style.display = 'none';
  _orgPopupId = null;
}
// ── OKR 수동 편집 (localStorage) ──────────────────────────────────────────
const _OKR_KEY = 'sidiz_okr_v1';
function _okrData() { try { return JSON.parse(localStorage.getItem(_OKR_KEY)||'{}'); } catch { return {}; } }
function _okrSave(d) { localStorage.setItem(_OKR_KEY, JSON.stringify(d)); }

function setOkrKr(year, o, k, field, value) {
  const d = _okrData();
  if (!d[year]) d[year] = {};
  if (!d[year][o]) d[year][o] = {};
  if (!d[year][o][k]) d[year][o][k] = {};
  d[year][o][k][field] = value;
  _okrSave(d);
  _okrApplyKr(year, o, k, d[year][o][k]);
  _okrCalcObj(year, o);
  _okrCalcSummary(year);
}

function _okrApplyKr(year, o, k, kd) {
  const el = document.querySelector(`.okr-kr[data-year="${year}"][data-obj="${o}"][data-kr="${k}"]`);
  if (!el) return;
  const pct = kd.progress !== undefined ? +kd.progress : null;
  const status = kd.status || null;
  if (pct !== null) {
    const bar = el.querySelector('.okr-kr-progress-fill');
    const slider = el.querySelector('.okr-progress-slider');
    const num = el.querySelector('.okr-pct-input');
    if (bar) bar.style.width = pct + '%';
    if (slider) slider.value = pct;
    if (num) num.value = pct;
  }
  if (status) {
    const tag = el.querySelector('.okr-kr-result-tag');
    const sel = el.querySelector('.okr-status-sel');
    if (tag) {
      tag.className = 'okr-kr-result-tag ' + (status==='달성'?'done':status==='미달'?'miss':'progress');
      tag.textContent = status;
    }
    if (sel) sel.value = status;
    const bar = el.querySelector('.okr-kr-progress-fill');
    if (bar) bar.style.background = status==='달성'?'var(--accent-emerald)':status==='미달'?'var(--accent-rose)':'var(--gradient-brand)';
  }
  if (kd.note !== undefined) {
    const ta = el.querySelector('.okr-note-area');
    if (ta) ta.value = kd.note;
  }
}

function _okrCalcObj(year, o) {
  const d = _okrData();
  const krs = document.querySelectorAll(`.okr-kr[data-year="${year}"][data-obj="${o}"]`);
  let sum = 0, cnt = 0;
  krs.forEach(el => {
    const k = el.dataset.kr;
    const pct = (d[year]?.[o]?.[k]?.progress !== undefined)
      ? +d[year][o][k].progress
      : +(el.querySelector('.okr-progress-slider')?.value || 0);
    sum += pct; cnt++;
  });
  if (!cnt) return;
  const avg = Math.round(sum / cnt);
  const objEl = document.querySelector(`.okr-objective[data-year="${year}"][data-obj="${o}"]`);
  if (objEl) {
    const bar = objEl.querySelector(':scope > .okr-obj-header .okr-progress-fill');
    const txt = objEl.querySelector(':scope > .okr-obj-header .okr-progress-text');
    if (bar) bar.style.width = avg + '%';
    if (txt) txt.textContent = avg + '%';
  }
}

function _okrCalcSummary(year) {
  const d = _okrData();
  const krEls = document.querySelectorAll(`.okr-kr[data-year="${year}"]`);
  let sum = 0, total = krEls.length, done = 0;
  krEls.forEach(el => {
    const o = el.dataset.obj, k = el.dataset.kr;
    const kd = d[year]?.[o]?.[k] || {};
    const pct = kd.progress !== undefined ? +kd.progress : +(el.querySelector('.okr-progress-slider')?.value || 0);
    sum += pct;
    const tag = el.querySelector('.okr-kr-result-tag');
    const htmlStatus = tag ? (tag.classList.contains('done')?'달성':tag.classList.contains('miss')?'미달':'진행중') : '진행중';
    if ((kd.status || htmlStatus) === '달성') done++;
  });
  const sec = document.getElementById('okr-' + year);
  if (!sec) return;
  const cards = sec.querySelectorAll('.okr-summary-card .okr-summary-value');
  if (cards.length >= 4) {
    cards[2].textContent = total > 0 ? Math.round(sum / total) + '%' : '-';
    cards[3].textContent = done + '/' + total;
  }
}

function initOkrProgress() {
  const d = _okrData();
  ['2025','2026'].forEach(year => {
    _applyOkrStructure(year);
    document.querySelectorAll(`.okr-kr[data-year="${year}"]`).forEach(el => {
      const o = el.dataset.obj, k = el.dataset.kr;
      const kd = d[year]?.[o]?.[k];
      if (kd) _okrApplyKr(year, o, k, kd);
    });
    const objs = new Set([...document.querySelectorAll(`.okr-kr[data-year="${year}"]`)].map(e => e.dataset.obj));
    objs.forEach(o => _okrCalcObj(year, o));
    _okrCalcSummary(year);
  });
  _enhanceOkrUI();
}

document.addEventListener('DOMContentLoaded', () => setTimeout(initOkrProgress, 100));

// ── OKR 구조 변경 적용 (삭제/추가/텍스트 편집) ─────────────────────────────
function _applyOkrStructure(year) {
  const d = _okrData(); const yd = d[year] || {};
  // 텍스트 편집 적용
  Object.entries(yd._text || {}).forEach(([key, val]) => {
    if (key.includes('_')) {
      const [o, k] = key.split('_');
      const el = document.querySelector(`.okr-kr[data-year="${year}"][data-obj="${o}"][data-kr="${k}"]`);
      if (el && val.plan != null) { const p = el.querySelector('.okr-kr-plan'); if (p) p.textContent = val.plan; }
    } else {
      const el = document.querySelector(`.okr-objective[data-year="${year}"][data-obj="${key}"]`);
      if (el) {
        if (val.title != null) { const t = el.querySelector('.okr-obj-title'); if (t) t.textContent = val.title; }
        if (val.sub != null) { const s = el.querySelector('.okr-obj-sub'); if (s) s.textContent = val.sub; }
      }
    }
  });
  // 삭제 적용
  (yd._del_objs || []).forEach(o => document.querySelector(`.okr-objective[data-year="${year}"][data-obj="${o}"]`)?.remove());
  Object.entries(yd._del_krs || {}).forEach(([o, arr]) =>
    arr.forEach(k => document.querySelector(`.okr-kr[data-year="${year}"][data-obj="${o}"][data-kr="${k}"]`)?.remove()));
  // 새 Objective 추가
  (yd._new_objs || []).forEach(obj => {
    if (!document.querySelector(`.okr-objective[data-year="${year}"][data-obj="${obj.id}"]`))
      _insertObjEl(year, obj);
  });
  // 새 KR 추가
  Object.entries(yd._new_krs || {}).forEach(([o, krs]) => {
    const body = document.querySelector(`.okr-objective[data-year="${year}"][data-obj="${o}"] .okr-obj-body`);
    if (!body) return;
    krs.forEach(kr => {
      if (!document.querySelector(`.okr-kr[data-year="${year}"][data-obj="${o}"][data-kr="${kr.id}"]`))
        _insertKrEl(body, year, o, kr);
    });
  });
}

// ── OKR UI 강화 (편집/삭제 버튼, 성과 테이블, 링크 섹션, 추가 버튼) ────────
function _enhanceOkrUI() {
  document.querySelectorAll('.okr-kr').forEach(el => _enhanceSingleKr(el));
  document.querySelectorAll('.okr-objective').forEach(el => _enhanceSingleObj(el));
  document.querySelectorAll('.okr-year-content').forEach(sec => {
    const year = sec.id.replace('okr-', '');
    if (!year || isNaN(+year) || sec.querySelector('.okr-add-obj-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'okr-add-obj-btn';
    btn.textContent = '+ Objective 추가';
    btn.onclick = () => _openObjModal(year, null);
    sec.appendChild(btn);
  });
}

function _enhanceSingleKr(el) {
  const year = el.dataset.year, o = el.dataset.obj, k = el.dataset.kr;
  if (!year || !o || !k) return;
  // 편집/삭제 버튼
  const header = el.querySelector('.okr-kr-header');
  if (header && !header.querySelector('.okr-ctrl-wrap')) {
    const ctrl = document.createElement('div');
    ctrl.className = 'okr-ctrl-wrap';
    ctrl.innerHTML = `<button class="okr-ctrl-btn" title="편집" onclick="event.stopPropagation();_openKrModal('${year}','${o}','${k}')">✏️</button><button class="okr-ctrl-btn del" title="삭제" onclick="event.stopPropagation();_deleteKr('${year}','${o}','${k}')">🗑️</button>`;
    header.querySelector('.okr-kr-arrow').before(ctrl);
  }
  // 성과 내용 테이블로 교체
  const editSec = el.querySelector('.okr-edit-section');
  if (!editSec || editSec.querySelector('.okr-note-tbl-wrap')) return;
  const noteLbl = editSec.querySelector('.okr-note-lbl');
  const noteArea = editSec.querySelector('.okr-note-area');
  if (!noteLbl || !noteArea) return;
  const d = _okrData(); const notes = d[year]?.[o]?.[k]?.notes || {};
  const tmp = document.createElement('div');
  tmp.innerHTML = `
    <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.8px;margin-top:4px;margin-bottom:6px">📌 성과 내용</div>
    <div class="okr-note-tbl-wrap">
      <table class="okr-note-tbl">
        <thead><tr>
          <th class="okr-note-th">✅ 효과</th>
          <th class="okr-note-th">👍 잘한점</th>
          <th class="okr-note-th">💡 아쉬운점</th>
        </tr></thead>
        <tbody><tr>
          <td class="okr-note-td"><div class="okr-note-cell" contenteditable="true" data-ph="효과를 입력하세요" oninput="setOkrNote('${year}','${o}','${k}','효과',this.innerText)" onclick="event.stopPropagation()"></div></td>
          <td class="okr-note-td"><div class="okr-note-cell" contenteditable="true" data-ph="잘한점을 입력하세요" oninput="setOkrNote('${year}','${o}','${k}','잘한점',this.innerText)" onclick="event.stopPropagation()"></div></td>
          <td class="okr-note-td"><div class="okr-note-cell" contenteditable="true" data-ph="아쉬운점을 입력하세요" oninput="setOkrNote('${year}','${o}','${k}','아쉬운점',this.innerText)" onclick="event.stopPropagation()"></div></td>
        </tr></tbody>
      </table>
    </div>
    <div class="okr-links-section">
      <div class="okr-links-hdr">
        <span class="okr-links-lbl">🔗 첨부 링크 / 파일</span>
        <button class="okr-add-link-btn" onclick="event.stopPropagation();_openLinkModal('${year}','${o}','${k}')">+ 추가</button>
      </div>
      <div class="okr-links-list" id="okr-links-${year}-${o}-${k}"></div>
    </div>
    <div class="okr-note-tbl-wrap" style="margin-top:8px">
      <table class="okr-note-tbl">
        <thead><tr><th class="okr-note-th">📝 진행상황</th></tr></thead>
        <tbody><tr>
          <td class="okr-note-td"><div class="okr-note-cell" contenteditable="true" data-ph="진행상황을 입력하세요" oninput="setOkrNote('${year}','${o}','${k}','진행상황',this.innerText)" onclick="event.stopPropagation()"></div></td>
        </tr></tbody>
      </table>
    </div>`;
  // 순서대로 참조 뽑기 (DOM 이동 전)
  const lblEl = tmp.children[0];
  const tblEl = tmp.children[1];
  const lnkEl = tmp.children[2];
  const progEl = tmp.children[3];
  noteLbl.replaceWith(lblEl);
  noteArea.replaceWith(tblEl, lnkEl, progEl);
  // 저장된 노트 값 복원
  const cells = el.querySelectorAll('.okr-note-cell');
  const cols = ['효과','잘한점','아쉬운점','진행상황'];
  cells.forEach((c, i) => { if (notes[cols[i]]) c.textContent = notes[cols[i]]; });
  _renderLinks(year, o, k);
}

function _enhanceSingleObj(el) {
  const year = el.dataset.year, o = el.dataset.obj;
  if (!year || !o) return;
  const header = el.querySelector(':scope > .okr-obj-header');
  if (header && !header.querySelector('.okr-ctrl-wrap')) {
    const ctrl = document.createElement('div');
    ctrl.className = 'okr-ctrl-wrap';
    ctrl.style.marginLeft = '6px';
    ctrl.innerHTML = `<button class="okr-ctrl-btn" title="편집" onclick="event.stopPropagation();_openObjModal('${year}','${o}')">✏️</button><button class="okr-ctrl-btn del" title="삭제" onclick="event.stopPropagation();_deleteObj('${year}','${o}')">🗑️</button>`;
    header.appendChild(ctrl);
  }
  const body = el.querySelector('.okr-obj-body');
  if (body && !body.querySelector('.okr-add-kr-btn')) {
    const btn = document.createElement('button');
    btn.className = 'okr-add-kr-btn';
    btn.textContent = '+ KR 추가';
    btn.onclick = e => { e.stopPropagation(); _openKrModal(year, o, null); };
    body.appendChild(btn);
  }
}

// ── 성과 노트 저장 ────────────────────────────────────────────────────────
function setOkrNote(year, o, k, col, value) {
  const d = _okrData();
  if (!d[year]) d[year] = {};
  if (!d[year][o]) d[year][o] = {};
  if (!d[year][o][k]) d[year][o][k] = {};
  if (!d[year][o][k].notes) d[year][o][k].notes = {};
  d[year][o][k].notes[col] = value;
  _okrSave(d);
}

// ── 링크/파일 ─────────────────────────────────────────────────────────────
function _renderLinks(year, o, k) {
  const el = document.getElementById(`okr-links-${year}-${o}-${k}`);
  if (!el) return;
  const d = _okrData(); const links = d[year]?.[o]?.[k]?.links || [];
  el.innerHTML = links.map((lk, i) => `
    <div class="okr-link-item">
      <span style="font-size:13px">${lk.type==='file'?'📎':'🔗'}</span>
      <a class="okr-link-a" href="${_escAttr(lk.url)}" target="_blank" rel="noopener">${_escHtml(lk.label||lk.url)}</a>
      <button class="okr-link-del" onclick="event.stopPropagation();_removeLink('${year}','${o}','${k}',${i})" title="삭제">✕</button>
    </div>`).join('');
}

function _removeLink(year, o, k, idx) {
  const d = _okrData();
  const links = d[year]?.[o]?.[k]?.links;
  if (links) { links.splice(idx, 1); _okrSave(d); _renderLinks(year, o, k); }
}

// ── 모달 공통 ─────────────────────────────────────────────────────────────
let _modalCallback = null;
function _closeOkrModal() { document.getElementById('okrModalBg').classList.remove('on'); _modalCallback = null; }
function _okrModalConfirm() { if (_modalCallback) _modalCallback(); }

// ── 링크/파일 모달 ────────────────────────────────────────────────────────
function _openLinkModal(year, o, k) {
  document.getElementById('okrModalTitle').textContent = '링크 / 파일 첨부';
  document.getElementById('okrModalBody').innerHTML = `
    <div class="okr-modal-tabs">
      <button class="okr-modal-tab on" id="tabLink" onclick="_switchTab('link')">🔗 URL 링크</button>
      <button class="okr-modal-tab" id="tabFile" onclick="_switchTab('file')">📎 파일 업로드</button>
    </div>
    <div class="okr-modal-pane on" id="paneLink">
      <div class="okr-modal-row"><div class="okr-modal-lbl">URL</div><input class="okr-modal-inp" id="mlUrl" placeholder="https://..." onclick="event.stopPropagation()"></div>
      <div class="okr-modal-row"><div class="okr-modal-lbl">표시 이름 (생략 시 URL 사용)</div><input class="okr-modal-inp" id="mlLabel" placeholder="링크 이름" onclick="event.stopPropagation()"></div>
    </div>
    <div class="okr-modal-pane" id="paneFile">
      <div class="okr-modal-row"><div class="okr-modal-lbl">파일 선택</div><input type="file" class="okr-modal-inp" id="mlFile" onclick="event.stopPropagation()"></div>
      <div class="okr-modal-file-hint">※ 파일은 브라우저 로컬에 저장됩니다 (최대 2MB). 이미지·PDF·문서 파일 권장.</div>
    </div>`;
  _modalCallback = () => {
    const isLink = document.getElementById('paneLink').classList.contains('on');
    if (isLink) {
      const url = document.getElementById('mlUrl').value.trim();
      if (!url) { alert('URL을 입력해 주세요.'); return; }
      const label = document.getElementById('mlLabel').value.trim() || url;
      _saveLink(year, o, k, { url, label, type: 'link' });
    } else {
      const fileEl = document.getElementById('mlFile');
      if (!fileEl.files.length) { alert('파일을 선택해 주세요.'); return; }
      const file = fileEl.files[0];
      if (file.size > 2 * 1024 * 1024) { alert('파일 크기가 2MB를 초과합니다. URL 링크 방식을 사용해 주세요.'); return; }
      const reader = new FileReader();
      reader.onload = e => {
        _saveLink(year, o, k, { url: e.target.result, label: file.name, type: 'file' });
        _closeOkrModal();
      };
      reader.readAsDataURL(file);
      return; // async, modal closed in reader.onload
    }
    _closeOkrModal();
  };
  document.getElementById('okrModalBg').classList.add('on');
}

function _switchTab(tab) {
  ['Link','File'].forEach(t => {
    document.getElementById('tab'+t)?.classList.toggle('on', t.toLowerCase()===tab);
    document.getElementById('pane'+t)?.classList.toggle('on', t.toLowerCase()===tab);
  });
}

function _saveLink(year, o, k, lk) {
  const d = _okrData();
  if (!d[year]) d[year] = {};
  if (!d[year][o]) d[year][o] = {};
  if (!d[year][o][k]) d[year][o][k] = {};
  if (!d[year][o][k].links) d[year][o][k].links = [];
  d[year][o][k].links.push(lk);
  _okrSave(d);
  _renderLinks(year, o, k);
}

// ── Objective 추가/편집 모달 ──────────────────────────────────────────────
function _openObjModal(year, o) {
  const isEdit = o !== null;
  const d = _okrData(); const yd = d[year] || {};
  let curTitle = '', curSub = '';
  if (isEdit) {
    const txt = yd._text?.[o] || {};
    const el = document.querySelector(`.okr-objective[data-year="${year}"][data-obj="${o}"]`);
    curTitle = txt.title ?? (el?.querySelector('.okr-obj-title')?.textContent || '');
    curSub = txt.sub ?? (el?.querySelector('.okr-obj-sub')?.textContent || '');
  }
  document.getElementById('okrModalTitle').textContent = isEdit ? 'Objective 편집' : 'Objective 추가';
  document.getElementById('okrModalBody').innerHTML = `
    <div class="okr-modal-row"><div class="okr-modal-lbl">목표 (Objective)</div><input class="okr-modal-inp" id="moTitle" value="${_escAttr(curTitle)}" placeholder="목표를 입력하세요" onclick="event.stopPropagation()"></div>
    <div class="okr-modal-row"><div class="okr-modal-lbl">부제목 (선택)</div><input class="okr-modal-inp" id="moSub" value="${_escAttr(curSub)}" placeholder="부제목을 입력하세요" onclick="event.stopPropagation()"></div>`;
  _modalCallback = () => {
    const title = document.getElementById('moTitle').value.trim();
    const sub = document.getElementById('moSub').value.trim();
    if (!title) { alert('목표를 입력해 주세요.'); return; }
    if (isEdit) {
      _saveObjText(year, o, title, sub);
    } else {
      _createNewObj(year, title, sub);
    }
    _closeOkrModal();
  };
  document.getElementById('okrModalBg').classList.add('on');
  setTimeout(() => document.getElementById('moTitle')?.focus(), 50);
}

function _saveObjText(year, o, title, sub) {
  const d = _okrData();
  if (!d[year]) d[year] = {};
  if (!d[year]._text) d[year]._text = {};
  d[year]._text[o] = { title, sub };
  _okrSave(d);
  const el = document.querySelector(`.okr-objective[data-year="${year}"][data-obj="${o}"]`);
  if (el) {
    const t = el.querySelector('.okr-obj-title'); if (t) t.textContent = title;
    const s = el.querySelector('.okr-obj-sub'); if (s) s.textContent = sub;
  }
}

function _createNewObj(year, title, sub) {
  const d = _okrData();
  if (!d[year]) d[year] = {};
  if (!d[year]._new_objs) d[year]._new_objs = [];
  const existing = document.querySelectorAll(`.okr-objective[data-year="${year}"]`).length;
  const id = 'n' + (Date.now());
  const objData = { id, title, sub, n: existing + 1 };
  d[year]._new_objs.push(objData);
  _okrSave(d);
  const sec = document.getElementById('okr-' + year);
  const addBtn = sec?.querySelector('.okr-add-obj-btn');
  const newEl = _insertObjEl(year, objData);
  if (newEl) { _enhanceSingleObj(newEl); }
}

function _insertObjEl(year, obj) {
  const sec = document.getElementById('okr-' + year);
  if (!sec) return null;
  const badges = ['o1','o2','o3','o4','o5','o1'];
  const n = obj.n || (document.querySelectorAll(`.okr-objective[data-year="${year}"]`).length + 1);
  const badge = badges[Math.min(n-1, 4)];
  const div = document.createElement('div');
  div.className = 'okr-objective';
  div.dataset.year = year; div.dataset.obj = obj.id;
  div.setAttribute('onclick', "event.stopPropagation();this.classList.toggle('open')");
  div.innerHTML = `
    <div class="okr-obj-header">
      <div class="okr-obj-left">
        <div class="okr-obj-badge ${badge}">O${n}</div>
        <div><div class="okr-obj-title">${_escHtml(obj.title)}</div><div class="okr-obj-sub">${_escHtml(obj.sub||'')}</div></div>
      </div>
      <div class="okr-progress-mini">
        <div class="okr-progress-bar"><div class="okr-progress-fill" style="width:0%;background:var(--gradient-brand)"></div></div>
        <div class="okr-progress-text" style="color:var(--sidiz-blue-bright)">0%</div>
        <span class="okr-obj-arrow">▼</span>
      </div>
    </div>
    <div class="okr-obj-body"></div>`;
  const addBtn = sec.querySelector('.okr-add-obj-btn');
  if (addBtn) addBtn.before(div); else sec.appendChild(div);
  return div;
}

// ── KR 추가/편집 모달 ─────────────────────────────────────────────────────
function _openKrModal(year, o, k) {
  const isEdit = k !== null;
  const d = _okrData(); const yd = d[year] || {};
  let curPlan = '';
  if (isEdit) {
    const txt = yd._text?.[`${o}_${k}`] || {};
    const el = document.querySelector(`.okr-kr[data-year="${year}"][data-obj="${o}"][data-kr="${k}"]`);
    curPlan = txt.plan ?? (el?.querySelector('.okr-kr-plan')?.textContent || '');
  }
  document.getElementById('okrModalTitle').textContent = isEdit ? 'Key Result 편집' : 'Key Result 추가';
  document.getElementById('okrModalBody').innerHTML = `
    <div class="okr-modal-row"><div class="okr-modal-lbl">Key Result 내용</div><input class="okr-modal-inp" id="mkPlan" value="${_escAttr(curPlan)}" placeholder="KR 내용을 입력하세요" onclick="event.stopPropagation()"></div>`;
  _modalCallback = () => {
    const plan = document.getElementById('mkPlan').value.trim();
    if (!plan) { alert('KR 내용을 입력해 주세요.'); return; }
    if (isEdit) {
      _saveKrText(year, o, k, plan);
    } else {
      _createNewKr(year, o, plan);
    }
    _closeOkrModal();
  };
  document.getElementById('okrModalBg').classList.add('on');
  setTimeout(() => document.getElementById('mkPlan')?.focus(), 50);
}

function _saveKrText(year, o, k, plan) {
  const d = _okrData();
  if (!d[year]) d[year] = {};
  if (!d[year]._text) d[year]._text = {};
  d[year]._text[`${o}_${k}`] = { plan };
  _okrSave(d);
  const el = document.querySelector(`.okr-kr[data-year="${year}"][data-obj="${o}"][data-kr="${k}"]`);
  const p = el?.querySelector('.okr-kr-plan'); if (p) p.textContent = plan;
}

function _createNewKr(year, o, plan) {
  const d = _okrData();
  if (!d[year]) d[year] = {};
  if (!d[year]._new_krs) d[year]._new_krs = {};
  if (!d[year]._new_krs[o]) d[year]._new_krs[o] = [];
  const id = 'n' + Date.now();
  const krData = { id, plan };
  d[year]._new_krs[o].push(krData);
  _okrSave(d);
  const body = document.querySelector(`.okr-objective[data-year="${year}"][data-obj="${o}"] .okr-obj-body`);
  if (body) {
    const newEl = _insertKrEl(body, year, o, krData);
    if (newEl) _enhanceSingleKr(newEl);
  }
}

function _insertKrEl(body, year, o, kr) {
  const n = body.querySelectorAll('.okr-kr').length + 1;
  const div = document.createElement('div');
  div.className = 'okr-kr';
  div.dataset.year = year; div.dataset.obj = o; div.dataset.kr = kr.id;
  div.setAttribute('onclick', "event.stopPropagation();this.classList.toggle('open')");
  div.innerHTML = `
    <div class="okr-kr-header">
      <div class="okr-kr-badge">KR${n}</div>
      <div><div class="okr-kr-plan">${_escHtml(kr.plan)}</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px"><span class="okr-kr-result-tag progress">진행중</span></div></div>
      <div class="okr-kr-progress"><div class="okr-kr-progress-bar"><div class="okr-kr-progress-fill" style="width:0%;background:var(--gradient-brand)"></div></div></div>
      <div class="okr-kr-arrow">▼</div>
    </div>
    <div class="okr-kr-detail">
      <div class="okr-edit-section">
        <div class="okr-edit-row">
          <span class="okr-edit-lbl">진행률</span>
          <input type="range" class="okr-progress-slider" min="0" max="100" value="0" oninput="this.nextElementSibling.value=this.value;setOkrKr('${year}','${o}','${kr.id}','progress',+this.value)" onclick="event.stopPropagation()">
          <input type="number" class="okr-pct-input" min="0" max="100" value="0" oninput="this.previousElementSibling.value=this.value;setOkrKr('${year}','${o}','${kr.id}','progress',+this.value)" onclick="event.stopPropagation()">
          <span style="font-size:12px;color:var(--text-muted)">%</span>
          <select class="okr-status-sel" onchange="setOkrKr('${year}','${o}','${kr.id}','status',this.value)" onclick="event.stopPropagation()">
            <option value="진행중" selected>진행중</option><option value="달성">달성</option><option value="미달">미달</option>
          </select>
        </div>
        <div class="okr-note-lbl">📌 성과 내용</div>
        <textarea class="okr-note-area" placeholder="성과 내용을 입력해 주세요." onclick="event.stopPropagation()"></textarea>
      </div>
    </div>`;
  const addBtn = body.querySelector('.okr-add-kr-btn');
  if (addBtn) addBtn.before(div); else body.appendChild(div);
  return div;
}

// ── 삭제 ──────────────────────────────────────────────────────────────────
function _deleteObj(year, o) {
  if (!confirm('이 Objective와 모든 KR을 삭제할까요?')) return;
  const d = _okrData();
  if (!d[year]) d[year] = {};
  if (!d[year]._del_objs) d[year]._del_objs = [];
  if (!d[year]._del_objs.includes(o)) d[year]._del_objs.push(o);
  // new_objs에 있으면 거기서도 제거
  if (d[year]._new_objs) d[year]._new_objs = d[year]._new_objs.filter(x => x.id !== o);
  _okrSave(d);
  document.querySelector(`.okr-objective[data-year="${year}"][data-obj="${o}"]`)?.remove();
  _okrCalcSummary(year);
}

function _deleteKr(year, o, k) {
  if (!confirm('이 Key Result를 삭제할까요?')) return;
  const d = _okrData();
  if (!d[year]) d[year] = {};
  if (!d[year]._del_krs) d[year]._del_krs = {};
  if (!d[year]._del_krs[o]) d[year]._del_krs[o] = [];
  if (!d[year]._del_krs[o].includes(k)) d[year]._del_krs[o].push(k);
  if (d[year]._new_krs?.[o]) d[year]._new_krs[o] = d[year]._new_krs[o].filter(x => x.id !== k);
  _okrSave(d);
  document.querySelector(`.okr-kr[data-year="${year}"][data-obj="${o}"][data-kr="${k}"]`)?.remove();
  _okrCalcObj(year, o);
  _okrCalcSummary(year);
}

// ── 유틸 ──────────────────────────────────────────────────────────────────
function _escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _escAttr(s) { return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// ── 로그인 / 비밀번호 인증 ────────────────────────────────────────────────
async function _sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// 포털 접속 비밀번호 해시 (SHA-256)
const _PW_HASH = '3667a42cf6ad2274b5f59f903394225d088a5f6b67870b73b1f140da62dbfdc3';

async function _loginSubmit() {
  const pw    = document.getElementById('loginPwInput').value;
  const errEl = document.getElementById('loginErr');
  errEl.textContent = '';

  if (!pw) { _loginShake(); errEl.textContent = '비밀번호를 입력해 주세요.'; return; }

  const hash = await _sha256(pw);
  if (hash === _PW_HASH) {
    _loginSuccess();
  } else {
    _loginShake();
    errEl.textContent = '비밀번호가 올바르지 않습니다.';
    document.getElementById('loginPwInput').value = '';
    document.getElementById('loginPwInput').focus();
  }
}

function _loginSuccess() {
  sessionStorage.setItem('sidiz_auth', '1');
  const ov = document.getElementById('loginOverlay');
  ov.style.transition = 'opacity 0.35s';
  ov.style.opacity = '0';
  setTimeout(() => ov.remove(), 380);
}

function _loginShake() {
  const inp = document.getElementById('loginPwInput');
  inp.classList.remove('shake');
  void inp.offsetWidth; // reflow
  inp.classList.add('shake');
}

function _togglePwVis(id, eye) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
  eye.textContent = el.type === 'password' ? '👁' : '🙈';
}

// 비밀번호 변경: 콘솔에서 _getHash('새비밀번호') 실행 → 출력된 해시를 _PW_HASH 에 교체
async function _getHash(pw) {
  const hash = await _sha256(pw);
  console.log('🔑 새 비밀번호 해시:', hash);
  console.log('→ index.html 의 _PW_HASH 값을 위 해시로 교체 후 재배포하세요.');
  return hash;
}

async function _orgSaveJobDesc() {
  if (!_orgPopupId) return;
  const text = document.getElementById('popupJobDesc').value;
  const BASE = SupabaseClient.SUPABASE_URL, KEY = SupabaseClient.SUPABASE_ANON_KEY;
  const HDR  = { apikey:KEY, Authorization:`Bearer ${KEY}`, 'Content-Type':'application/json', Prefer:'return=minimal' };
  await fetch(`${BASE}/rest/v1/org_members?id=eq.${encodeURIComponent(_orgPopupId)}`, {
    method:'PATCH', headers:HDR, body:JSON.stringify({ job_detail:text, updated_at:new Date().toISOString() })
  });
  const m = _orgData.find(x => x.id === _orgPopupId);
  if (m) m.job_detail = text;
  _orgClosePopup();
  // 카드 화면은 변경하지 않음 (세부내용은 팝업에서만 확인)
}
