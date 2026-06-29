const SB_URL = 'https://cyxnbwczcvjeaqmrdzcb.supabase.co';
const SB_KEY = 'sb_publishable_i2Cw7SPjRn1BDa5XS-2NyA_qHNRC8Y5';

// 2026년 정기 리머 측정 — 40건
// 각 기종별 월 5회 측정 (1월·2월)
const data = [
  // ===== 4000G (기준: 5.5 ~ 6.0 mm) =====
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'4000G', value:5.83, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'4000G', value:5.81, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'4000G', value:5.86, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'4000G', value:5.79, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'4000G', value:5.88, note:null },

  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'4000G', value:5.93, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'4000G', value:5.80, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'4000G', value:5.85, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'4000G', value:5.89, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'4000G', value:5.76, note:null },

  // ===== CH4800 (기준: 2.2 ~ 3.3 mm) =====
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'CH4800', value:2.84, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'CH4800', value:2.93, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'CH4800', value:2.85, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'CH4800', value:2.87, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'CH4800', value:2.92, note:null },

  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'CH4800', value:2.90, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'CH4800', value:2.89, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'CH4800', value:2.96, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'CH4800', value:2.88, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'CH4800', value:2.84, note:null },

  // ===== ITO-TILT (기준: 4.7 ~ 5.3 mm) =====
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'ITO-TILT', value:5.08, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'ITO-TILT', value:5.02, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'ITO-TILT', value:5.06, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'ITO-TILT', value:5.05, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'ITO-TILT', value:5.06, note:null },

  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'ITO-TILT', value:5.11, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'ITO-TILT', value:5.09, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'ITO-TILT', value:5.15, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'ITO-TILT', value:5.07, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'ITO-TILT', value:5.13, note:null },

  // ===== S-TILT (기준: 4.5 ~ 5.0 mm) =====
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'S-TILT', value:4.63, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'S-TILT', value:4.85, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'S-TILT', value:4.81, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'S-TILT', value:4.88, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'S-TILT', value:4.77, note:null },

  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'S-TILT', value:4.69, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'S-TILT', value:4.67, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'S-TILT', value:4.83, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'S-TILT', value:4.77, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'S-TILT', value:4.67, note:null },
];

async function run() {
  const res = await fetch(SB_URL + '/rest/v1/incoming_reamers', {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(data)
  });
  const text = await res.text();
  console.log('HTTP Status:', res.status);
  if (res.status >= 400) {
    console.log('Error:', text);
  } else {
    console.log('Success! ' + data.length + '건 입력 완료');
  }
}
run().catch(console.error);
