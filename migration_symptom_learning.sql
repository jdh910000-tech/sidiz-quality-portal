-- SIDIZ Quality Portal — Symptom Learning System Migration
-- 실행 위치: Supabase Dashboard > SQL Editor
-- 한 번만 실행하면 됩니다.

-- ─── 1. 증상 사전 테이블 ───
CREATE TABLE IF NOT EXISTS symptom_dictionary (
  id           BIGSERIAL PRIMARY KEY,
  raw_pattern  TEXT NOT NULL,
  normalized   TEXT NOT NULL,
  category     TEXT NOT NULL,
  usage_count  INTEGER DEFAULT 1,
  created_by   TEXT DEFAULT 'auto',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_symptom_dict_pattern
  ON symptom_dictionary(raw_pattern);

-- ─── 2. 미분류 대기 테이블 ───
CREATE TABLE IF NOT EXISTS symptom_pending (
  id                   BIGSERIAL PRIMARY KEY,
  receipt_id           TEXT,
  item                 TEXT,
  raw_symptom          TEXT NOT NULL,
  normalized_candidate TEXT,
  suggested_normalized TEXT,
  suggested_category   TEXT,
  status               TEXT DEFAULT 'pending',
  approved_normalized  TEXT,
  approved_category    TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at          TIMESTAMPTZ,
  reviewed_by          TEXT
);
CREATE INDEX IF NOT EXISTS idx_pending_status  ON symptom_pending(status);
CREATE INDEX IF NOT EXISTS idx_pending_receipt ON symptom_pending(receipt_id);

-- ─── 3. claims_receipt 컬럼 추가 ───
ALTER TABLE claims_receipt
  ADD COLUMN IF NOT EXISTS defect_normalized TEXT,
  ADD COLUMN IF NOT EXISTS defect_category   TEXT,
  ADD COLUMN IF NOT EXISTS raw_symptom       TEXT;

-- ─── 4. RLS 정책 (anon key 접근 허용) ───
ALTER TABLE symptom_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_pending    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_symptom_dict"    ON symptom_dictionary;
DROP POLICY IF EXISTS "allow_all_symptom_pending" ON symptom_pending;

CREATE POLICY "allow_all_symptom_dict"
  ON symptom_dictionary FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_symptom_pending"
  ON symptom_pending FOR ALL USING (true) WITH CHECK (true);

-- ─── 5. 초기 증상 사전 데이터 (베이스라인 57개 패턴) ───
INSERT INTO symptom_dictionary (raw_pattern, normalized, category, created_by) VALUES
  ('팔걸이 내려감',         '팔걸이 내려감',           '작동성', 'auto'),
  ('손잡이 내려감',         '팔걸이 내려감',           '작동성', 'auto'),
  ('팔걸이 내려옴',         '팔걸이 내려감',           '작동성', 'auto'),
  ('팔걸이 유격',           '팔걸이 유격',             '유격',   'auto'),
  ('팔걸이 흔들림',         '팔걸이 유격',             '유격',   'auto'),
  ('손잡이 흔들림',         '팔걸이 유격',             '유격',   'auto'),
  ('팔걸이 각도조절',       '팔걸이 각도조절 불가',    '작동성', 'auto'),
  ('팔걸이 높이조절',       '팔걸이 높이조절 불가',    '작동성', 'auto'),
  ('헤드레스트 체결안됨',   '헤드레스트 체결불가',     '체결',   'auto'),
  ('헤드레스트 볼트 헛돔',  '헤드레스트 체결불가',     '체결',   'auto'),
  ('헤드레스트 나사 헛돔',  '헤드레스트 체결불가',     '체결',   'auto'),
  ('헤드레스트 고정안됨',   '헤드레스트 체결불가',     '체결',   'auto'),
  ('헤드레스트 조립안됨',   '헤드레스트 체결불가',     '체결',   'auto'),
  ('헤드레스트 꺾임',       '헤드레스트 각도조절 불가','작동성', 'auto'),
  ('헤드레스트 각도조절',   '헤드레스트 각도조절 불가','작동성', 'auto'),
  ('헤드레스트 어댑터',     '헤드레스트 체결불가',     '체결',   'auto'),
  ('등판 파손',             '등판 파손',               '파손',   'auto'),
  ('등판 사출',             '등판 외관불량',           '외관',   'auto'),
  ('등판 조립안됨',         '등판 체결불가',           '체결',   'auto'),
  ('등판 체결안됨',         '등판 체결불가',           '체결',   'auto'),
  ('등판 소음',             '등판 소음',               '소음',   'auto'),
  ('등좌판 체결안됨',       '등좌판 체결불가',         '체결',   'auto'),
  ('등좌판 체결불가',       '등좌판 체결불가',         '체결',   'auto'),
  ('좌판 수평',             '좌판 수평불량',           '수평',   'auto'),
  ('좌판 기울',             '좌판 수평불량',           '수평',   'auto'),
  ('좌판 쏠림',             '좌판 수평불량',           '수평',   'auto'),
  ('좌판 꺼짐',             '좌판 수평불량',           '수평',   'auto'),
  ('좌판 소음',             '좌판 소음',               '소음',   'auto'),
  ('좌판 유격',             '좌판 유격',               '유격',   'auto'),
  ('수평 불일치',           '수평불량',                '수평',   'auto'),
  ('수평 문제',             '수평불량',                '수평',   'auto'),
  ('흔들림',                '흔들림(유격)',             '유격',   'auto'),
  ('꺼떡거림',              '흔들림(유격)',             '유격',   'auto'),
  ('유격',                  '유격',                    '유격',   'auto'),
  ('중심봉 내려감',         '높이조절 불가(중심봉)',   '작동성', 'auto'),
  ('높이조절 안됨',         '높이조절 불가',           '작동성', 'auto'),
  ('높이 내려감',           '높이조절 불가',           '작동성', 'auto'),
  ('소음',                  '소음',                    '소음',   'auto'),
  ('삐걱',                  '소음',                    '소음',   'auto'),
  ('소리남',                '소음',                    '소음',   'auto'),
  ('틸팅 안됨',             '틸팅 불가',               '작동성', 'auto'),
  ('틸팅 레버',             '틸팅 레버 불량',          '작동성', 'auto'),
  ('틸팅 고장',             '틸팅 불가',               '작동성', 'auto'),
  ('럼버 흘러내림',         '럼버 작동불량',           '작동성', 'auto'),
  ('럼버 조절',             '럼버 조절불가',           '작동성', 'auto'),
  ('파손',                  '파손',                    '파손',   'auto'),
  ('크랙',                  '파손',                    '파손',   'auto'),
  ('깨짐',                  '파손',                    '파손',   'auto'),
  ('부러짐',                '파손',                    '파손',   'auto'),
  ('사출 불량',             '외관불량(사출)',           '외관',   'auto'),
  ('외관 불만',             '외관불량',                '외관',   'auto'),
  ('스크래치',              '외관불량(스크래치)',       '외관',   'auto'),
  ('보강대 조립',           '보강대 체결불가',         '체결',   'auto'),
  ('나사 헛돔',             '체결불가(나사)',           '체결',   'auto'),
  ('볼트 헛돔',             '체결불가(볼트)',           '체결',   'auto'),
  ('조립안됨',              '체결불가',                '체결',   'auto'),
  ('체결안됨',              '체결불가',                '체결',   'auto')
ON CONFLICT (raw_pattern) DO NOTHING;

-- ─── 완료 확인 ───
SELECT 'symptom_dictionary' AS table_name, COUNT(*) AS rows FROM symptom_dictionary
UNION ALL
SELECT 'symptom_pending',                          COUNT(*) FROM symptom_pending;
