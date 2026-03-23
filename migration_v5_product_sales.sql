-- migration_v5: 제품별 매출량 테이블 생성
CREATE TABLE IF NOT EXISTS product_sales_monthly (
  id          SERIAL PRIMARY KEY,
  item        TEXT NOT NULL,           -- 제품구분 (T50, T80, GX 등)
  year_month  TEXT NOT NULL,           -- YYYY-MM
  country     TEXT NOT NULL DEFAULT '국내',  -- 국내 / 베트남
  sales_count INTEGER NOT NULL DEFAULT 0,   -- 매출수량 합계
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item, year_month, country)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_psm_item        ON product_sales_monthly(item);
CREATE INDEX IF NOT EXISTS idx_psm_year_month  ON product_sales_monthly(year_month);
CREATE INDEX IF NOT EXISTS idx_psm_country     ON product_sales_monthly(country);
