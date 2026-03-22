-- migration_v4_uploaded_at.sql
-- 업로드일(uploaded_at) 컬럼 추가 — 올린일자 기준 조회 지원
-- Supabase Dashboard > SQL Editor 에서 실행하세요.

-- 1. 컬럼 추가
ALTER TABLE claims_receipt
ADD COLUMN IF NOT EXISTS uploaded_at DATE DEFAULT CURRENT_DATE;

-- 2. 기존 데이터: created_at 기준으로 채움
UPDATE claims_receipt
SET uploaded_at = DATE(created_at)
WHERE uploaded_at IS NULL;

-- 3. 인덱스
CREATE INDEX IF NOT EXISTS idx_claims_receipt_uploaded_at
ON claims_receipt(uploaded_at);
