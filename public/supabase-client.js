// supabase-client.js — Supabase 연동 모듈 v3
// claims (회수일), claims_receipt (접수일), sales_monthly (매출량), failure_costs (실패비용), KPI 뷰

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

// ─── failure_costs (실패비용) ───
async function fetchFailureCosts(year) {
  return supabaseFetch('failure_costs', `select=*&year_month=gte.${year}-01&year_month=lte.${year}-12&order=year_month`);
}

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

// ─── 증상 사전 (symptom_dictionary) ───
async function fetchSymptomDict() {
  return supabaseFetch('symptom_dictionary', 'select=raw_pattern,normalized,category,usage_count&order=usage_count.desc&limit=2000');
}
async function upsertSymptomPattern(raw_pattern, normalized, category, created_by = 'admin') {
  const url = `${SUPABASE_URL}/rest/v1/symptom_dictionary`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...supabaseHeaders, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ raw_pattern, normalized, category, created_by, updated_at: new Date().toISOString() })
  });
  if (!res.ok) throw new Error(`upsert dict ${res.status}`);
}
async function incrementPatternUsage(raw_pattern) {
  // usage_count++ via RPC or read-then-update
  const rows = await supabaseFetch('symptom_dictionary', `select=id,usage_count&raw_pattern=eq.${encodeURIComponent(raw_pattern)}&limit=1`);
  if (rows.length === 0) return;
  const { id, usage_count } = rows[0];
  const url = `${SUPABASE_URL}/rest/v1/symptom_dictionary?id=eq.${id}`;
  await fetch(url, { method: 'PATCH', headers: { ...supabaseHeaders, 'Prefer': 'return=minimal' }, body: JSON.stringify({ usage_count: (usage_count || 1) + 1, updated_at: new Date().toISOString() }) });
}
async function deleteSymptomPattern(id) {
  const url = `${SUPABASE_URL}/rest/v1/symptom_dictionary?id=eq.${id}`;
  const res = await fetch(url, { method: 'DELETE', headers: supabaseHeaders });
  if (!res.ok) throw new Error(`delete dict ${res.status}`);
}

// ─── 미분류 대기 (symptom_pending) ───
async function fetchPendingSymptoms(status = 'pending') {
  return supabaseFetch('symptom_pending', `select=*&status=eq.${status}&order=created_at.desc&limit=500`);
}
async function insertPendingSymptoms(rows) {
  if (!rows || rows.length === 0) return;
  const url = `${SUPABASE_URL}/rest/v1/symptom_pending`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...supabaseHeaders, 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(rows)
  });
  if (!res.ok) throw new Error(`insert pending ${res.status}: ${await res.text()}`);
}
async function approvePendingSymptom(id, approved_normalized, approved_category) {
  const url = `${SUPABASE_URL}/rest/v1/symptom_pending?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...supabaseHeaders, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ status: 'approved', approved_normalized, approved_category, reviewed_at: new Date().toISOString(), reviewed_by: 'admin' })
  });
  if (!res.ok) throw new Error(`approve pending ${res.status}`);
}
async function rejectPendingSymptom(id) {
  const url = `${SUPABASE_URL}/rest/v1/symptom_pending?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...supabaseHeaders, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: 'admin' })
  });
  if (!res.ok) throw new Error(`reject pending ${res.status}`);
}
async function updateClaimsNormalized(receipt_id, defect_normalized, defect_category) {
  const url = `${SUPABASE_URL}/rest/v1/claims_receipt?receipt_id=eq.${encodeURIComponent(receipt_id)}&defect_normalized=is.null`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...supabaseHeaders, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ defect_normalized, defect_category })
  });
  if (!res.ok) throw new Error(`update claims normalized ${res.status}`);
}
async function countPending() { return supabaseCount('symptom_pending?status=eq.pending'); }
async function fetchReceiptByCategory(category, from, to) {
  let params = `select=*&defect_category=eq.${encodeURIComponent(category)}&order=receipt_date.desc&limit=500`;
  if (from) params += `&receipt_date=gte.${from}`;
  if (to)   params += `&receipt_date=lte.${to}`;
  return supabaseFetch('claims_receipt', params);
}
async function fetchReceiptByNormalized(normalized, from, to) {
  let params = `select=*&defect_normalized=ilike.*${encodeURIComponent(normalized)}*&order=receipt_date.desc&limit=500`;
  if (from) params += `&receipt_date=gte.${from}`;
  if (to)   params += `&receipt_date=lte.${to}`;
  return supabaseFetch('claims_receipt', params);
}

// Export
window.SupabaseClient = {
  SUPABASE_URL, SUPABASE_ANON_KEY,
  supabaseFetch, supabaseCount,
  // 회수일
  fetchClaims,
  // 접수일
  fetchReceiptClaims, fetchReceiptByDateRange, fetchReceiptByDefect,
  fetchReceiptByCategory, fetchReceiptByNormalized,
  // 매출량
  fetchSalesMonthly,
  // 실패비용
  fetchFailureCosts,
  // KPI 뷰
  fetchKpiMonthly, fetchJudgementMonthly, fetchReceiptMonthly,
  // 집계
  aggregateByCategory, aggregateByItem, aggregateByDefectType,
  // 증상 사전
  fetchSymptomDict, upsertSymptomPattern, incrementPatternUsage, deleteSymptomPattern,
  // 미분류 대기
  fetchPendingSymptoms, insertPendingSymptoms, approvePendingSymptom, rejectPendingSymptom,
  updateClaimsNormalized, countPending,
};
