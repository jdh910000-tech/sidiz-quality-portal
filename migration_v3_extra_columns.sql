-- ============================================================
-- migration_v3_extra_columns.sql
-- claims_receipt: warranty_type 컬럼 추가
-- ============================================================
-- 실행 위치: Supabase Dashboard > SQL Editor

-- 1. warranty_type 컬럼 추가 (유무상 구분)
ALTER TABLE claims_receipt
  ADD COLUMN IF NOT EXISTS warranty_type TEXT;

-- 완료 확인
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'claims_receipt'
ORDER BY ordinal_position;
