-- migration_v6_kpi_notes.sql
-- KPI 월별 종합 분석 메모 테이블

CREATE TABLE IF NOT EXISTS kpi_analysis_notes (
  id         SERIAL PRIMARY KEY,
  year_month TEXT NOT NULL,           -- e.g. '2026-03'
  note_type  TEXT NOT NULL DEFAULT 'claim',  -- 'claim' | 'cost'
  content    TEXT NOT NULL DEFAULT '',
  author     TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year_month, note_type)
);

CREATE INDEX IF NOT EXISTS idx_kan_year_month ON kpi_analysis_notes(year_month);
CREATE INDEX IF NOT EXISTS idx_kan_note_type  ON kpi_analysis_notes(note_type);
