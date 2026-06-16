-- migration_v5_admin_note.sql
-- 상세내용(admin_note) 컬럼 추가 — 클레임 현황 대시보드에서 자유 입력 메모용
-- Supabase Dashboard > SQL Editor 에서 실행하세요.

-- 1. 컬럼 추가
ALTER TABLE claims_receipt
ADD COLUMN IF NOT EXISTS admin_note TEXT DEFAULT NULL;

-- 2. 인덱스 (선택사항 — 메모 전문 검색 용도)
-- CREATE INDEX IF NOT EXISTS idx_claims_receipt_admin_note
-- ON claims_receipt USING gin(to_tsvector('simple', coalesce(admin_note, '')));
