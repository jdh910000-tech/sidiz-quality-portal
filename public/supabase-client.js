// supabase-client.js — Supabase 연동 모듈 v2
// claims (회수일), claims_receipt (접수일), sales_monthly (매출량), KPI 뷰

const SUPABASE_URL = 'https://cyxnbwczcvjeaqmrdzcb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i2Cw7SPjRn1BDa5XS-2NyA_qHNRC8Y5';

const supabaseHeaders = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function supabaseFetch(endpoint, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}${params ? '?' + params : ''}`;
  const res = await fetch(url, { headers: supabaseHeaders });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${res.statusText}`);
  return res.json();
}

async function supabaseCount(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count`, {
    headers: { ...supabaseHeaders, 'Prefer': 'count=exact' }
  });
  if (!res.ok) return 0;
  return parseInt(res.headers.get('content-range')?.split('/')[1] || '0');
}

// ─── claims (회수일 기준, 기존) ───
async function fetchClaims(params) { return supabaseFetch('claims', params || 'select=*&order=claim_date.desc&limit=5000'); }

// ─── claims_receipt (접수일 기준, 신규) ───
async function fetchReceiptClaims(params) { return supabaseFetch('claims_receipt', params || 'select=*&order=receipt_date.desc&limit=5000'); }

async function fetchReceiptByDateRange(from, to) {
  return supabaseFetch('claims_receipt', `select=*&receipt_date=gte.${from}&receipt_date=lte.${to}&order=receipt_date.desc&limit=5000`);
}

async function fetchReceiptByDefect(item, defectType) {
  return supabaseFetch('claims_receipt', `select=*&item=ilike.*${encodeURIComponent(item)}*&defect_type=ilike.*${encodeURIComponent(defectType)}*&order=receipt_date.desc&limit=500`);
}

// ─── sales_monthly (매출량) ───
async function fetchSalesMonthly() { return supabaseFetch('sales_monthly', 'select=*&order=year_month.desc'); }

// ─── KPI 뷰 (claims_receipt + sales_monthly 자동 조인) ───
async function fetchKpiMonthly() { return supabaseFetch('v_kpi_monthly', 'select=*'); }

// ─── 월별 판정유형별 집계 뷰 ───
async function fetchJudgementMonthly() { return supabaseFetch('v_judgement_monthly', 'select=*'); }

// ─── 접수일 월별 집계 뷰 ───
async function fetchReceiptMonthly() { return supabaseFetch('v_claims_receipt_monthly', 'select=*'); }

// ─── 집계 헬퍼 ───
function aggregateByCategory(claims) {
  const cats = {};
  claims.forEach(c => { const cat = c.category || '기타'; cats[cat] = (cats[cat] || 0) + 1; });
  return cats;
}

function aggregateByItem(claims) {
  const items = {};
  claims.forEach(c => { const item = c.item || '기타'; if (!items[item]) items[item] = []; items[item].push(c); });
  return items;
}

function aggregateByDefectType(claims) {
  const defects = {};
  claims.forEach(c => { const dt = c.defect_type || c.claim_detail || '기타'; defects[dt] = (defects[dt] || 0) + 1; });
  return Object.entries(defects).sort((a, b) => b[1] - a[1]);
}

// Export
window.SupabaseClient = {
  SUPABASE_URL, SUPABASE_ANON_KEY,
  supabaseFetch, supabaseCount,
  // 회수일
  fetchClaims,
  // 접수일
  fetchReceiptClaims, fetchReceiptByDateRange, fetchReceiptByDefect,
  // 매출량
  fetchSalesMonthly,
  // KPI 뷰
  fetchKpiMonthly, fetchJudgementMonthly, fetchReceiptMonthly,
  // 집계
  aggregateByCategory, aggregateByItem, aggregateByDefectType,
};
