-- ============================================================
-- SIDIZ 품질관리 포털 — Supabase 추가 테이블 생성 SQL
-- Supabase Dashboard → SQL Editor 에서 실행
-- ============================================================

-- ─── 1. 접수일 기준 클레임 테이블 ───
-- 기존 claims 테이블(회수일)과 별도로, 접수일 기준 데이터 저장
CREATE TABLE IF NOT EXISTS claims_receipt (
  id            BIGSERIAL PRIMARY KEY,
  receipt_id    TEXT,            -- 접수번호 (예: P202602130023-1)
  receipt_date  DATE NOT NULL,   -- 접수일 (ERP 기준)
  category      TEXT,            -- 유형 (작동성, 소음, 파손, 유격, 수평, 외관 등)
  judgement_type TEXT,           -- 판정유형 (제조, 설계, 서비스, 고객불만, 사양재검토)
  defect_type   TEXT,            -- 하자유형 (파손, 기능, 소음 등)
  item          TEXT,            -- 제품군 (T50, T25, T80, 4000G 등)
  model         TEXT,            -- 상세 모델명
  country       TEXT DEFAULT '국내',  -- 국내 / 베트남
  brand         TEXT DEFAULT '시디즈',
  cost          NUMERIC DEFAULT 0,    -- 비용
  claim_detail  TEXT,            -- 요구내역 (클레임 상세)
  inspection_result TEXT,        -- 판정결과
  main_category TEXT,            -- 대분류
  sub_category  TEXT,            -- 소분류
  defective_part TEXT,           -- 불량부위
  lot           TEXT,            -- LOT 번호
  code          TEXT,            -- 코드
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_claims_receipt_date ON claims_receipt(receipt_date);
CREATE INDEX IF NOT EXISTS idx_claims_receipt_item ON claims_receipt(item);
CREATE INDEX IF NOT EXISTS idx_claims_receipt_category ON claims_receipt(category);
CREATE INDEX IF NOT EXISTS idx_claims_receipt_country ON claims_receipt(country);

-- RLS 활성화 (anon 읽기 허용)
ALTER TABLE claims_receipt ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claims_receipt_anon_read" ON claims_receipt
  FOR SELECT TO anon USING (true);
CREATE POLICY "claims_receipt_anon_insert" ON claims_receipt
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "claims_receipt_anon_update" ON claims_receipt
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "claims_receipt_anon_delete" ON claims_receipt
  FOR DELETE TO anon USING (true);

-- ─── 2. 월별 매출량 테이블 (불량지수 계산용) ───
CREATE TABLE IF NOT EXISTS sales_monthly (
  id            BIGSERIAL PRIMARY KEY,
  year_month    TEXT NOT NULL,       -- '2025-01', '2025-02' 등
  country       TEXT NOT NULL,       -- '국내' / '베트남'
  sales_count   INTEGER NOT NULL,    -- 매출건수
  sales_amount  NUMERIC DEFAULT 0,   -- 매출액 (원)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year_month, country)        -- 월+국가 중복 방지
);

-- RLS 활성화
ALTER TABLE sales_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_monthly_anon_read" ON sales_monthly
  FOR SELECT TO anon USING (true);
CREATE POLICY "sales_monthly_anon_insert" ON sales_monthly
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "sales_monthly_anon_update" ON sales_monthly
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "sales_monthly_anon_delete" ON sales_monthly
  FOR DELETE TO anon USING (true);

-- ─── 3. 접수일 기준 일별 집계 뷰 ───
CREATE OR REPLACE VIEW v_claims_receipt_daily AS
SELECT 
  receipt_date,
  category,
  COUNT(*) as cnt,
  SUM(cost) as total_cost
FROM claims_receipt
GROUP BY receipt_date, category
ORDER BY receipt_date DESC;

-- ─── 4. 접수일 기준 월별 집계 뷰 ───
CREATE OR REPLACE VIEW v_claims_receipt_monthly AS
SELECT 
  TO_CHAR(receipt_date, 'YYYY-MM') as year_month,
  country,
  judgement_type,
  COUNT(*) as cnt,
  SUM(cost) as total_cost
FROM claims_receipt
GROUP BY TO_CHAR(receipt_date, 'YYYY-MM'), country, judgement_type
ORDER BY year_month DESC;

-- ─── 5. KPI 뷰 — 월별 불량건수 + 매출량 + 불량지수 자동 계산 ───
CREATE OR REPLACE VIEW v_kpi_monthly AS
SELECT 
  cr.year_month,
  cr.country,
  cr.claim_count,
  COALESCE(sm.sales_count, 0) as sales_count,
  COALESCE(sm.sales_amount, 0) as sales_amount,
  CASE 
    WHEN COALESCE(sm.sales_count, 0) > 0 
    THEN ROUND((cr.claim_count::NUMERIC / sm.sales_count) * 100, 2)
    ELSE 0 
  END as defect_index_pct
FROM (
  SELECT 
    TO_CHAR(receipt_date, 'YYYY-MM') as year_month,
    country,
    COUNT(*) as claim_count
  FROM claims_receipt
  GROUP BY TO_CHAR(receipt_date, 'YYYY-MM'), country
) cr
LEFT JOIN sales_monthly sm 
  ON cr.year_month = sm.year_month AND cr.country = sm.country
ORDER BY cr.year_month DESC, cr.country;

-- ─── 6. 판정유형별 월별 집계 뷰 ───
CREATE OR REPLACE VIEW v_judgement_monthly AS
SELECT 
  TO_CHAR(receipt_date, 'YYYY-MM') as year_month,
  country,
  judgement_type,
  COUNT(*) as cnt
FROM claims_receipt
GROUP BY TO_CHAR(receipt_date, 'YYYY-MM'), country, judgement_type
ORDER BY year_month DESC;

-- ============================================================
-- 확인용 쿼리 (실행 후 삭제 가능)
-- ============================================================
-- SELECT * FROM claims_receipt LIMIT 5;
-- SELECT * FROM sales_monthly LIMIT 5;
-- SELECT * FROM v_kpi_monthly LIMIT 10;
