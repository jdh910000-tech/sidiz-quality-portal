"""
3월 ERP 파일을 upload-sales.html과 동일한 필터/매핑 로직으로 처리하여
엑셀(필터링 상세 + 집계) 2-sheet 파일로 출력.
"""
import re
import json
import pandas as pd
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

HTML = Path('public/upload-sales.html').read_text(encoding='utf-8')
MAP_BLOCK = re.search(r'const PRODUCT_CODE_MAP = \{([\s\S]*?)\n\};', HTML).group(1)

# JS object → Python dict 변환
pairs = re.findall(r'"([^"]+)"\s*:\s*"([^"]*)"', MAP_BLOCK)
PRODUCT_CODE_MAP = {k.upper(): v for k, v in pairs}
print(f'PRODUCT_CODE_MAP: {len(PRODUCT_CODE_MAP)}건')

# ─── 로우데이터 읽기 ───
SRC = r'C:/Users/FURSYS/Downloads/거래명세서발행내역(3월).xls'
df = pd.read_excel(SRC, engine='xlrd' if SRC.endswith('.xls') else 'openpyxl')
df.columns = [str(c).strip() for c in df.columns]
print(f'원본 행수: {len(df)}')
print(f'컬럼: {list(df.columns)}')

# 필요 컬럼 확인
def find_col(*names):
    for n in names:
        for c in df.columns:
            if c.strip() == n:
                return c
    return None

COL_BIZ   = find_col('일반사업소')
COL_BRAND = find_col('브랜드구분')
COL_PROD  = find_col('제품구분')
COL_QTY   = find_col('매출수량')
COL_CODE  = find_col('단품코드')
COL_DATE  = find_col('매출일자')
COL_ORDER = find_col('수주번호')
COL_LINE  = find_col('라인번호')
print(f'컬럼 매핑: biz={COL_BIZ}, brand={COL_BRAND}, prod={COL_PROD}, qty={COL_QTY}, code={COL_CODE}, date={COL_DATE}, order={COL_ORDER}, line={COL_LINE}')

# ─── 중복 제거 없음 (전체 행 사용) ───
dedup_removed = 0
print(f'전체 행 사용: {len(df)}행')

# ─── 필터 적용 & 집계 ───
rows_detail = []  # 각 행의 필터 결과 기록
group_map = {}

filter_stats = {
    '하자조치내수': 0,
    '알로소': 0,
    '소파/철제/외주상품': 0,
    '매출수량≤0': 0,
    '날짜파싱실패': 0,
}

for idx, r in df.iterrows():
    biz = str(r[COL_BIZ] or '').strip()
    brand = str(r[COL_BRAND] or '').strip()
    prod = str(r[COL_PROD] or '').strip()
    try:
        qty = float(r[COL_QTY])
    except (ValueError, TypeError):
        qty = 0

    reason = None
    if biz == '하자조치내수':
        reason = '하자조치내수'
    elif brand == '알로소':
        reason = '알로소'
    elif ('소파' in prod) or ('철제' in prod) or (prod == '외주상품'):
        reason = '소파/철제/외주상품'
    elif qty <= 0:
        reason = '매출수량≤0'

    # 날짜 파싱
    date_cell = r[COL_DATE]
    year_month = ''
    try:
        if pd.notna(date_cell):
            if isinstance(date_cell, (int, float)):
                # Excel serial date
                date = pd.to_datetime('1899-12-30') + pd.Timedelta(days=int(date_cell))
                year_month = date.strftime('%Y-%m')
            else:
                s = str(date_cell).strip()
                if re.match(r'^\d{8}$', s):
                    year_month = f'{s[:4]}-{s[4:6]}'
                else:
                    year_month = s[:7].replace('/', '-').replace('.', '-')
    except Exception:
        pass
    if not re.match(r'^\d{4}-\d{2}$', year_month):
        if reason is None:
            reason = '날짜파싱실패'

    # 코드 매핑
    code = str(r[COL_CODE] or '').strip().upper()
    mapped = PRODUCT_CODE_MAP.get(code)
    item = mapped or code or prod or '기타'
    country = '베트남' if prod == '베트남상품' else '국내'
    brand_val = brand or '시디즈'

    rows_detail.append({
        '수주번호': r[COL_ORDER],
        '라인번호': r[COL_LINE],
        '매출일자': r[COL_DATE],
        'year_month': year_month,
        '일반사업소': biz,
        '브랜드구분': brand_val,
        '제품구분': prod,
        '단품코드': code,
        '매출수량': qty,
        'item(매핑후)': item,
        'country': country,
        '매핑여부': '매핑' if mapped else ('미매핑' if code else '코드없음'),
        '필터결과': reason if reason else '통과',
    })

    if reason:
        filter_stats[reason] = filter_stats.get(reason, 0) + 1
        continue

    # 집계
    key = f'{item}||{year_month}||{country}||{brand_val}'
    if key not in group_map:
        group_map[key] = {
            'item': item,
            'year_month': year_month,
            'country': country,
            'brand': brand_val,
            'sales_count': 0,
            'mapped': bool(mapped),
        }
    group_map[key]['sales_count'] += 1

print()
print('=== 필터 통계 ===')
for k, v in filter_stats.items():
    print(f'  {k}: {v}')
passed = len(df) - sum(filter_stats.values())
print(f'  필터 통과: {passed}')
print(f'  집계 그룹수: {len(group_map)}')
total_count = sum(g['sales_count'] for g in group_map.values())
print(f'  총 매출건수: {total_count}')

# 브랜드별 합계
by_brand = {}
for g in group_map.values():
    by_brand[g['brand']] = by_brand.get(g['brand'], 0) + g['sales_count']
print()
print('=== 브랜드별 매출건수 ===')
for b, c in sorted(by_brand.items(), key=lambda x: -x[1]):
    print(f'  {b}: {c:,}')

# 국가별 합계
by_country = {}
for g in group_map.values():
    by_country[g['country']] = by_country.get(g['country'], 0) + g['sales_count']
print()
print('=== 국가별 매출건수 ===')
for c, cnt in by_country.items():
    print(f'  {c}: {cnt:,}')

# ─── 엑셀 출력 ───
OUT = Path(r'C:/Users/FURSYS/Downloads/3월_필터결과_검증.xlsx')
df_detail = pd.DataFrame(rows_detail)
df_group = pd.DataFrame(list(group_map.values())).sort_values(
    ['brand', 'country', 'item']
).reset_index(drop=True)

# 브랜드×국가 피벗
pivot = df_group.pivot_table(
    index=['brand', 'country'],
    values='sales_count',
    aggfunc='sum',
).reset_index()

# 필터 통계 요약
stat_rows = [
    ['원본 행수', len(df)],
    ['', ''],
    ['--- 필터 제외 ---', ''],
]
for k, v in filter_stats.items():
    stat_rows.append([f'  {k}', v])
stat_rows.append(['', ''])
stat_rows.append(['필터 통과', passed])
stat_rows.append(['총 매출건수(집계)', total_count])
stat_rows.append(['집계 그룹수', len(group_map)])
stat_rows.append(['', ''])
stat_rows.append(['--- 브랜드별 ---', ''])
for b, c in sorted(by_brand.items(), key=lambda x: -x[1]):
    stat_rows.append([b, c])
stat_rows.append(['', ''])
stat_rows.append(['--- 국가별 ---', ''])
for c, cnt in by_country.items():
    stat_rows.append([c, cnt])

df_stats = pd.DataFrame(stat_rows, columns=['항목', '값'])

with pd.ExcelWriter(OUT, engine='openpyxl') as w:
    df_stats.to_excel(w, sheet_name='1_요약', index=False)
    df_group.to_excel(w, sheet_name='2_집계(업로드예정)', index=False)
    pivot.to_excel(w, sheet_name='3_브랜드x국가_피벗', index=False)
    df_detail.to_excel(w, sheet_name='4_행별상세(필터이유)', index=False)

print()
print(f'엑셀 저장 완료: {OUT}')
