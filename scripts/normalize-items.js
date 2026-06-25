// normalize-items.js — claims & claims_receipt 테이블 item 값 정규화
// 엑셀 "제품구분 rev1" 시트 기준, 2026-06-25
// 실행: node scripts/normalize-items.js

const https = require('https');

const SUPABASE_HOST = 'cyxnbwczcvjeaqmrdzcb.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_i2Cw7SPjRn1BDa5XS-2NyA_qHNRC8Y5';

// 순서 주의: 체인 충돌 방지
//   T60→에가 를 T61→T60 보다 먼저 처리해야 T61 레코드가 에가로 바뀌지 않음
//   아이블→아이블(높이조절형) 를 T501FE→아이블 보다 먼저 처리해야 T501FE가 아이블(높이조절형)으로 바뀌지 않음
const MAPPINGS = [
  // ── 체인 안전 순서 (먼저 처리) ──
  ['T60',               '에가'],
  ['아이블',            '아이블(높이조절형)'],

  // ── T5x 계열 ──
  ['T61',               'T60'],
  ['T52',               'T50AIR'],
  ['T52(좌판커버)',      'T50AIR'],
  ['T51',               'T50AIR'],
  ['T53',               'T50AIR'],
  ['T501FE',            '아이블'],
  ['T503',              '아이블(높이조절형)'],
  ['T50헤드',           'T50'],
  ['T50 조절팔걸이',    'T50'],
  ['T62',               'T60AIR'],
  ['T603',              '에가'],

  // ── GC 계열 ──
  ['GC1',               'GC PRO'],
  ['G10',               'GC PRO'],
  ['GC PRO_쿨링시트_LED','GC PRO'],

  // ── 링고 계열 ──
  ['S51',               '링고2세대'],
  ['링고2',             '링고2세대'],
  ['링고2 발받침',       '링고2세대'],
  ['링고1 발받침',       '링고'],
  ['S50',               '링고'],
  ['링고 등,좌판',       '링고'],
  ['링고 등판',          '링고'],

  // ── 모델명→제품명 변환 ──
  ['T25',               '리니에'],
  ['N10',               '플릿'],
  ['S40',               '트레보'],
  ['M071',              '마네(인조가죽)'],
  ['T402',              'T40'],
  ['M803',              '버튼'],
  ['M801',              '버튼(LEGS형)'],
  ['M02',               '마네(플라스틱)'],
  ['PILLO',             '필로'],
  ['T300',              'T30'],

  // ── 기타 ──
  ['아띠 의자',         '아띠'],
  ['캐스터',            '이지리페어'],
  ['2단 발받침',        '스테포'],
  ['휴대의자',          '올리'],
  ['암패드',            'T55'],
  ['T20 팔걸이',        'T20'],
  ['패브릭 스프레이',   '[부품]'],

  // ── v2 추가 (2026-06-25 — claims 테이블 누락분) ──
  ['T50light',          'T50LIGHT'],   // 대소문자 차이
  ['T501fe',            '아이블'],     // 대소문자 차이
  ['E40',               '셀리오스'],
  ['M17',               '바스툴'],
  ['HCH0018',           '비비'],
  ['T302',              'T30'],
  ['CH4200',            'ITIS3'],
  ['M08',               '스푼'],
  ['알렉스',            'T20'],
  ['HCH0009',           '콘'],
  ['HCH0014',           '세타'],
  ['E50',               '베스토'],
  ['HCH2000',           '아띠'],
  ['E60',               '프로나드'],
  ['T403',              'T40'],
];

const TABLES = ['claims', 'claims_receipt'];

function patch(table, oldVal, newVal) {
  return new Promise((resolve, reject) => {
    const body    = JSON.stringify({ item: newVal });
    const path    = `/rest/v1/${table}?item=eq.${encodeURIComponent(oldVal)}`;
    const options = {
      hostname: SUPABASE_HOST,
      path,
      method:  'PATCH',
      headers: {
        'apikey':         SUPABASE_KEY,
        'Authorization':  `Bearer ${SUPABASE_KEY}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Prefer':         'return=minimal',
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 204 || res.statusCode === 200) resolve(res.statusCode);
        else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  let ok = 0, skip = 0, err = 0;
  for (const [oldVal, newVal] of MAPPINGS) {
    for (const table of TABLES) {
      try {
        await patch(table, oldVal, newVal);
        process.stdout.write(`✓ [${table}] "${oldVal}" → "${newVal}"\n`);
        ok++;
      } catch(e) {
        if (e.message.includes('HTTP 404')) {
          skip++;
        } else {
          process.stderr.write(`✗ [${table}] "${oldVal}" → "${newVal}": ${e.message}\n`);
          err++;
        }
      }
    }
  }
  console.log(`\n완료: 성공 ${ok}, 건너뜀 ${skip}, 오류 ${err}`);
}

main();
