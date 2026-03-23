-- ============================================================
-- migration_v2_composite_key.sql
-- claims_receipt: 복합키 (receipt_id + seq_no) 전환
-- symptom_pending: seq_no 컬럼 추가
-- ============================================================
-- 실행 위치: Supabase Dashboard > SQL Editor
-- ※ 기존 데이터는 유지됩니다 (seq_no 기본값 1 로 설정)

-- 1. claims_receipt 신규 컬럼 추가
ALTER TABLE claims_receipt
  ADD COLUMN IF NOT EXISTS seq_no           INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS product_code_raw TEXT,
  ADD COLUMN IF NOT EXISTS processing_date  DATE;

-- 2. 기존 receipt_id 단독 UNIQUE 제약 삭제
ALTER TABLE claims_receipt
  DROP CONSTRAINT IF EXISTS claims_receipt_receipt_id_key;

-- 3. 복합 UNIQUE 제약 추가 (receipt_id + seq_no)
ALTER TABLE claims_receipt
  ADD CONSTRAINT claims_receipt_receipt_id_seq_no_key
  UNIQUE (receipt_id, seq_no);

-- 4. symptom_pending seq_no 컬럼 추가
ALTER TABLE symptom_pending
  ADD COLUMN IF NOT EXISTS seq_no INTEGER NOT NULL DEFAULT 1;

-- 5. 인덱스 추가 (조회 성능)
CREATE INDEX IF NOT EXISTS idx_receipt_date     ON claims_receipt(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipt_product  ON claims_receipt(product_code_raw);
CREATE INDEX IF NOT EXISTS idx_receipt_category ON claims_receipt(defect_category);

-- 완료 확인
SELECT
  (SELECT COUNT(*) FROM claims_receipt)     AS claims_receipt_rows,
  (SELECT COUNT(*) FROM symptom_pending)    AS symptom_pending_rows,
  (SELECT COUNT(*) FROM symptom_dictionary) AS symptom_dict_rows;
