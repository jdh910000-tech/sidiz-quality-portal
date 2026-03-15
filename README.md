# SIDIZ 품질관리 포털 v2.0

> Vercel + Supabase 연동 · 접수일 기준 클레임 + 매출량 데이터 관리

---

## 📐 전체 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (정적 호스팅)                    │
│                                                          │
│  index.html ─── 품질관리 포털 메인                        │
│  upload.html ── 엑셀 업로드 페이지                        │
│  supabase-client.js ── API 클라이언트                     │
└────────────────────┬────────────────────────────────────┘
                     │ REST API 호출
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase (PostgreSQL)                    │
│                                                          │
│  [기존] claims ─────── 회수일 기준 (331건+)               │
│  [기존] v_claims_daily  회수일 일별 집계 뷰               │
│                                                          │
│  [신규] claims_receipt ── 접수일 기준 클레임               │
│  [신규] sales_monthly ─── 월별 매출량 (불량지수 계산용)    │
│                                                          │
│  [신규 뷰] v_claims_receipt_daily ── 접수일 일별 집계     │
│  [신규 뷰] v_claims_receipt_monthly ─ 접수일 월별 집계    │
│  [신규 뷰] v_kpi_monthly ──────────── KPI 자동 계산      │
│  [신규 뷰] v_judgement_monthly ────── 판정유형별 월별     │
└─────────────────────────────────────────────────────────┘
```

### 데이터 흐름

```
ERP (접수일 기준)           ERP (매출 데이터)
      │                          │
      ▼                          ▼
  엑셀 다운로드              엑셀 다운로드
      │                          │
      ▼                          ▼
  upload.html               upload.html
  (드래그 & 드롭)            (드래그 & 드롭)
      │                          │
      ▼                          ▼
  claims_receipt 테이블      sales_monthly 테이블
      │                          │
      └──────────┬───────────────┘
                 ▼
         v_kpi_monthly 뷰
     (클레임건수 / 매출건수 × 100)
              = 불량지수(%)
```

---

## 📁 프로젝트 파일 구조

```
sidiz-portal/
├── public/
│   ├── index.html            ← 메인 포털 (모든 섹션)
│   ├── upload.html           ← 엑셀 업로드 페이지
│   └── supabase-client.js    ← Supabase REST API 모듈
├── sql/
│   └── 01_create_tables.sql  ← Supabase 테이블 생성 SQL
├── 접수일_클레임_템플릿.xlsx    ← 업로드용 엑셀 샘플
├── 매출량_템플릿.xlsx           ← 업로드용 엑셀 샘플
├── vercel.json
├── package.json
├── .gitignore
└── README.md
```

---

## 🚀 실행 순서 (반드시 이 순서대로)

### STEP 1: Supabase 테이블 생성

1. **Supabase Dashboard** 접속: https://supabase.com/dashboard
2. 프로젝트 선택 → 왼쪽 메뉴 **SQL Editor** 클릭
3. `sql/01_create_tables.sql` 파일 내용을 **전체 복사**하여 붙여넣기
4. **Run** 클릭
5. 결과 확인:
   - `claims_receipt` 테이블 생성됨
   - `sales_monthly` 테이블 생성됨
   - `v_claims_receipt_daily`, `v_claims_receipt_monthly`, `v_kpi_monthly`, `v_judgement_monthly` 뷰 생성됨
6. 왼쪽 메뉴 **Table Editor** → 테이블 목록에서 확인

### STEP 2: GitHub 저장소 생성 & Push

```bash
# sidiz-portal 폴더에서 실행
cd sidiz-portal

git init
git add .
git commit -m "SIDIZ 품질관리 포털 v2.0 — Supabase 접수일/매출량 연동"
git branch -M main

# GitHub에서 새 저장소 생성 (https://github.com/new)
# 저장소명: sidiz-quality-portal (Private 권장)
git remote add origin https://github.com/YOUR_USERNAME/sidiz-quality-portal.git
git push -u origin main
```

### STEP 3: Vercel 배포

1. https://vercel.com 접속 → GitHub 로그인
2. **"Add New… → Project"** 클릭
3. `sidiz-quality-portal` 저장소 Import
4. 설정:
   - **Framework Preset**: `Other`
   - **Root Directory**: `.` (기본값)
   - **Output Directory**: `public`
5. **"Deploy"** 클릭
6. 배포 완료 → URL 부여됨 (예: `sidiz-quality-portal.vercel.app`)

### STEP 4: 접수일 클레임 데이터 업로드

1. 배포된 포털 접속
2. 메인 홈 우측 상단 **📤 데이터 업로드** 클릭 → `upload.html`
3. **접수일 기준 클레임 데이터** 섹션:
   - ERP에서 접수일 기준으로 다운받은 엑셀 파일 드래그 & 드롭
   - (또는 첨부된 `접수일_클레임_템플릿.xlsx`를 참고하여 작성)
   - 미리보기 확인 후 **"Supabase에 업로드"** 클릭
4. 모드 선택:
   - **추가**: 기존 데이터 유지 + 새 데이터 추가
   - **교체**: 기존 전체 삭제 후 새 데이터로 교체

### STEP 5: 매출량 데이터 업로드

1. 같은 `upload.html` 페이지 하단
2. **월별 매출량 데이터** 섹션:
   - 첨부된 `매출량_템플릿.xlsx`에 실제 매출건수 입력
   - (기존 KPI 테이블에 있던 매출건수 데이터가 이미 샘플로 입력되어 있음)
   - 드래그 & 드롭 → **"Supabase에 업로드 (Upsert)"** 클릭
   - Upsert: 같은 월+국가 데이터가 있으면 자동 업데이트

### STEP 6: 포털에서 확인

1. 메인 포털로 돌아가기
2. **고객클레임 → 클레임 현황(접수일)** 탭 클릭
3. 날짜 선택 후 **조회** → Supabase `claims_receipt` 실시간 조회
4. 카테고리 클릭 → 제품별 드릴다운 → **접수건 조회** 클릭
5. 헤더 우측에 **● LIVE (회수331·접수N·매출N)** 표시 확인

---

## 📊 Supabase 테이블 상세

### claims_receipt (접수일 기준 클레임)

| 컬럼 | 타입 | 설명 | 필수 |
|------|------|------|:----:|
| receipt_id | TEXT | 접수번호 | |
| receipt_date | DATE | 접수일 | ✅ |
| item | TEXT | 제품군 (T50, T25 등) | ✅ |
| category | TEXT | 유형 (작동성, 소음 등) | ✅ |
| judgement_type | TEXT | 판정유형 (제조, 설계 등) | |
| defect_type | TEXT | 하자유형 | |
| model | TEXT | 모델명 | |
| country | TEXT | 국내/베트남 | |
| cost | NUMERIC | 비용 | |
| claim_detail | TEXT | 요구내역 | |
| inspection_result | TEXT | 판정결과 | |
| main_category | TEXT | 대분류 | |
| sub_category | TEXT | 소분류 | |
| defective_part | TEXT | 불량부위 | |
| lot | TEXT | LOT | |
| code | TEXT | 코드 | |
| brand | TEXT | 브랜드 | |

### sales_monthly (월별 매출량)

| 컬럼 | 타입 | 설명 | 필수 |
|------|------|------|:----:|
| year_month | TEXT | 연월 (YYYY-MM) | ✅ |
| country | TEXT | 국내/베트남 | ✅ |
| sales_count | INTEGER | 매출건수 | ✅ |
| sales_amount | NUMERIC | 매출액 (원) | |

### v_kpi_monthly (자동 계산 뷰)

| 컬럼 | 설명 |
|------|------|
| year_month | 연월 |
| country | 국가 |
| claim_count | 클레임 건수 (claims_receipt에서 자동 집계) |
| sales_count | 매출건수 (sales_monthly에서 조인) |
| defect_index_pct | **불량지수 (%) = claim_count / sales_count × 100** |

---

## 🔄 일상 운영 가이드

### 매일/매주 할 일
1. ERP에서 접수일 기준 클레임 데이터 엑셀 다운로드
2. `upload.html` → **추가 모드**로 업로드
3. 포털에서 접수일 탭 조회 확인

### 매월 초 할 일
1. 전월 매출량 데이터 확정
2. `매출량_템플릿.xlsx`에 입력 → 업로드 (Upsert)
3. KPI 현황에서 불량지수 자동 계산 확인

### 데이터 교체 (월초 정리 시)
1. `upload.html` → **교체 모드** 선택
2. 전체 정리된 엑셀 파일 업로드
3. 기존 데이터 삭제 후 새 데이터로 대체됨

---

## 📌 기존 대시보드와의 관계

| 구분 | 데이터 기준 | 소스 |
|------|-----------|------|
| 일 클레임 현황 | 회수일 | iframe (claim-dashboard-xodr.vercel.app) |
| 월 클레임 현황 | 회수일 | iframe (claim-dashboard-xodr.vercel.app) |
| 제품별 클레임 | 회수일 | 정적 데이터 (기존 유지) |
| **클레임 현황(접수일)** | **접수일** | **Supabase claims_receipt (신규)** |
| **KPI 불량지수** | **접수일+매출량** | **Supabase v_kpi_monthly (신규)** |
| 시디즈 시험소 | - | iframe (Google Apps Script) |

---

## 🔧 로컬 테스트

```bash
cd sidiz-portal
npx serve public -l 3000
# → http://localhost:3000
# → http://localhost:3000/upload.html
```
