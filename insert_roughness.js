const SB_URL = 'https://cyxnbwczcvjeaqmrdzcb.supabase.co';
const SB_KEY = 'sb_publishable_i2Cw7SPjRn1BDa5XS-2NyA_qHNRC8Y5';

// 2026년 정기 조도 측정 — 40건
// 각 기종별 월 5회 측정 (1월·2월)  기준: Ra ≤ 1.0 μm
const data = [
  // ===== 4000G =====
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'4000G', value:0.531, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'4000G', value:0.563, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'4000G', value:0.536, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'4000G', value:0.564, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'4000G', value:0.574, note:null },

  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'4000G', value:0.536, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'4000G', value:0.594, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'4000G', value:0.559, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'4000G', value:0.576, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'4000G', value:0.561, note:null },

  // ===== CH4800 =====
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'CH4800', value:0.269, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'CH4800', value:0.279, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'CH4800', value:0.285, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'CH4800', value:0.274, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'CH4800', value:0.290, note:null },

  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'CH4800', value:0.264, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'CH4800', value:0.323, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'CH4800', value:0.277, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'CH4800', value:0.285, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'CH4800', value:0.316, note:null },

  // ===== ITO-TILT =====
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'ITO-TILT', value:0.202, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'ITO-TILT', value:0.204, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'ITO-TILT', value:0.213, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'ITO-TILT', value:0.226, note:null },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'ITO-TILT', value:0.219, note:null },

  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'ITO-TILT', value:0.224, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'ITO-TILT', value:0.235, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'ITO-TILT', value:0.220, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'ITO-TILT', value:0.231, note:null },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'ITO-TILT', value:0.223, note:null },

  // ===== S-TILT (⚠️ 기준 1.0 μm 초과 — NG 상태) =====
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'S-TILT', value:1.502, note:'기준 초과' },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'S-TILT', value:1.466, note:'기준 초과' },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'S-TILT', value:1.506, note:'기준 초과' },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'S-TILT', value:1.517, note:'기준 초과' },
  { measure_date:'2026-01-15', supplier:'시디즈', product_code:'S-TILT', value:1.579, note:'기준 초과' },

  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'S-TILT', value:1.556, note:'기준 초과' },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'S-TILT', value:1.589, note:'기준 초과' },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'S-TILT', value:1.466, note:'기준 초과' },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'S-TILT', value:1.553, note:'기준 초과' },
  { measure_date:'2026-02-14', supplier:'시디즈', product_code:'S-TILT', value:1.528, note:'기준 초과' },
];

async function run() {
  const res = await fetch(SB_URL + '/rest/v1/incoming_roughness', {
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
