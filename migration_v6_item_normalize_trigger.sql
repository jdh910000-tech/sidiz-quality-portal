-- migration_v6_item_normalize_trigger.sql
-- claims / claims_receipt 테이블에 item 값을 자동 정규화하는 트리거
-- Supabase Dashboard > SQL Editor 에서 실행하세요.
-- 새 데이터가 INSERT/UPDATE 될 때 자동으로 canonical name으로 변환됩니다.

-- 1. 정규화 함수 생성
CREATE OR REPLACE FUNCTION normalize_item_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.item := CASE NEW.item
    -- T5x 계열
    WHEN 'T61'                THEN 'T60'
    WHEN 'T52'                THEN 'T50AIR'
    WHEN 'T52(좌판커버)'      THEN 'T50AIR'
    WHEN 'T51'                THEN 'T50AIR'
    WHEN 'T53'                THEN 'T50AIR'
    WHEN 'T501FE'             THEN '아이블'
    WHEN 'T503'               THEN '아이블(높이조절형)'
    WHEN '아이블'             THEN '아이블(높이조절형)'
    WHEN 'T50헤드'            THEN 'T50'
    WHEN 'T50 조절팔걸이'     THEN 'T50'
    WHEN 'T62'                THEN 'T60AIR'
    WHEN 'T603'               THEN '에가'
    WHEN 'T60'                THEN '에가'
    -- GC 계열
    WHEN 'GC1'                THEN 'GC PRO'
    WHEN 'G10'                THEN 'GC PRO'
    WHEN 'GC PRO_쿨링시트_LED' THEN 'GC PRO'
    -- 링고 계열
    WHEN 'S51'                THEN '링고2세대'
    WHEN '링고2'              THEN '링고2세대'
    WHEN '링고2 발받침'        THEN '링고2세대'
    WHEN '링고1 발받침'        THEN '링고'
    WHEN 'S50'                THEN '링고'
    WHEN '링고 등,좌판'        THEN '링고'
    WHEN '링고 등판'           THEN '링고'
    -- 모델명 → 제품명
    WHEN 'T25'                THEN '리니에'
    WHEN 'N10'                THEN '플릿'
    WHEN 'S40'                THEN '트레보'
    WHEN 'M071'               THEN '마네(인조가죽)'
    WHEN 'T402'               THEN 'T40'
    WHEN 'M803'               THEN '버튼'
    WHEN 'M801'               THEN '버튼(LEGS형)'
    WHEN 'M02'                THEN '마네(플라스틱)'
    WHEN 'PILLO'              THEN '필로'
    WHEN 'T300'               THEN 'T30'
    -- 기타
    WHEN '아띠 의자'          THEN '아띠'
    WHEN '캐스터'             THEN '이지리페어'
    WHEN '2단 발받침'         THEN '스테포'
    WHEN '휴대의자'           THEN '올리'
    WHEN '암패드'             THEN 'T55'
    WHEN 'T20 팔걸이'         THEN 'T20'
    WHEN '패브릭 스프레이'    THEN '[부품]'
    ELSE NEW.item  -- 해당 없으면 그대로 유지
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. claims 테이블 트리거
DROP TRIGGER IF EXISTS trg_normalize_claims_item ON claims;
CREATE TRIGGER trg_normalize_claims_item
  BEFORE INSERT OR UPDATE OF item ON claims
  FOR EACH ROW EXECUTE FUNCTION normalize_item_name();

-- 3. claims_receipt 테이블 트리거
DROP TRIGGER IF EXISTS trg_normalize_claims_receipt_item ON claims_receipt;
CREATE TRIGGER trg_normalize_claims_receipt_item
  BEFORE INSERT OR UPDATE OF item ON claims_receipt
  FOR EACH ROW EXECUTE FUNCTION normalize_item_name();
