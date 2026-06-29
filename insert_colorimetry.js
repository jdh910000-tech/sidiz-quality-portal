const SB_URL = 'https://cyxnbwczcvjeaqmrdzcb.supabase.co';
const SB_KEY = 'sb_publishable_i2Cw7SPjRn1BDa5XS-2NyA_qHNRC8Y5';

const data = [
  { measure_date:'2026-03-03', supplier:'일라', color_code:'5G1',   lot:'26 LOT 101', quantity_yd:670,  delta_e_master:0.86, delta_e_prev:0.99, note:null },
  { measure_date:'2026-03-03', supplier:'일라', color_code:'5G1',   lot:'26 LOT 102', quantity_yd:670,  delta_e_master:0.79, delta_e_prev:0.89, note:null },
  { measure_date:'2026-03-03', supplier:'일라', color_code:'5G1C',  lot:'26 LOT 105', quantity_yd:670,  delta_e_master:0.39, delta_e_prev:0.71, note:null },
  { measure_date:'2026-03-03', supplier:'일라', color_code:'447B',  lot:'26 LOT 101', quantity_yd:950,  delta_e_master:0.41, delta_e_prev:0.55, note:null },
  { measure_date:'2026-03-03', supplier:'일라', color_code:'441B',  lot:'26 LOT 102', quantity_yd:950,  delta_e_master:0.49, delta_e_prev:0.62, note:null },
  { measure_date:'2026-03-03', supplier:'일라', color_code:'443B',  lot:'26 LOT 101', quantity_yd:950,  delta_e_master:0.44, delta_e_prev:0.57, note:null },
  { measure_date:'2026-03-03', supplier:'일라', color_code:'441P',  lot:'26 LOT 103', quantity_yd:950,  delta_e_master:0.77, delta_e_prev:0.74, note:null },
  { measure_date:'2026-03-04', supplier:'일라', color_code:'831B',  lot:'26 LOT 1',   quantity_yd:650,  delta_e_master:0.40, delta_e_prev:0.60, note:null },
  { measure_date:'2026-03-04', supplier:'일라', color_code:'831B',  lot:'26 LOT 6',   quantity_yd:650,  delta_e_master:0.25, delta_e_prev:0.37, note:null },
  { measure_date:'2026-03-04', supplier:'일라', color_code:'451A',  lot:'26 LOT 16',  quantity_yd:670,  delta_e_master:0.55, delta_e_prev:0.26, note:null },
  { measure_date:'2026-03-04', supplier:'일라', color_code:'376',   lot:'26 LOT 6',   quantity_yd:650,  delta_e_master:0.75, delta_e_prev:0.49, note:null },
  { measure_date:'2026-03-04', supplier:'일라', color_code:'456',   lot:'26 LOT 12',  quantity_yd:670,  delta_e_master:0.67, delta_e_prev:0.66, note:null },
  { measure_date:'2026-03-04', supplier:'일라', color_code:'456',   lot:'26 LOT 14',  quantity_yd:670,  delta_e_master:0.65, delta_e_prev:0.77, note:null },
  { measure_date:'2026-03-04', supplier:'일라', color_code:'456',   lot:'26 LOT 15',  quantity_yd:670,  delta_e_master:0.77, delta_e_prev:0.86, note:null },
  { measure_date:'2026-03-04', supplier:'일라', color_code:'456',   lot:'26 LOT 18',  quantity_yd:670,  delta_e_master:0.63, delta_e_prev:0.87, note:null },
  { measure_date:'2026-02-04', supplier:'일라', color_code:'456',   lot:'26 LOT 100', quantity_yd:650,  delta_e_master:0.33, delta_e_prev:0.38, note:null },
  { measure_date:'2026-02-04', supplier:'일라', color_code:'831B',  lot:'26 LOT 101', quantity_yd:650,  delta_e_master:0.31, delta_e_prev:0.85, note:null },
  { measure_date:'2026-02-04', supplier:'일라', color_code:'831B',  lot:'26 LOT 102', quantity_yd:650,  delta_e_master:0.37, delta_e_prev:0.43, note:null },
  { measure_date:'2026-02-04', supplier:'일라', color_code:'831B',  lot:'25 LOT 121', quantity_yd:670,  delta_e_master:0.66, delta_e_prev:0.69, note:null },
  { measure_date:'2026-02-04', supplier:'일라', color_code:'5G1C',  lot:'26 LOT 100', quantity_yd:670,  delta_e_master:0.25, delta_e_prev:0.48, note:null },
  { measure_date:'2026-02-04', supplier:'일라', color_code:'5G1C',  lot:'26 LOT 101', quantity_yd:670,  delta_e_master:0.33, delta_e_prev:0.57, note:null },
  { measure_date:'2026-02-10', supplier:'일라', color_code:'456',   lot:'26 LOT 5',   quantity_yd:670,  delta_e_master:0.50, delta_e_prev:0.54, note:null },
  { measure_date:'2026-02-10', supplier:'일라', color_code:'451A',  lot:'26 LOT 9',   quantity_yd:670,  delta_e_master:0.55, delta_e_prev:0.85, note:null },
  { measure_date:'2026-02-10', supplier:'일라', color_code:'5G6A',  lot:'26 LOT 101', quantity_yd:670,  delta_e_master:0.41, delta_e_prev:0.59, note:null },
  { measure_date:'2026-02-10', supplier:'일라', color_code:'5G6A',  lot:'26 LOT 102', quantity_yd:670,  delta_e_master:0.33, delta_e_prev:0.55, note:null },
  { measure_date:'2026-02-24', supplier:'일라', color_code:'5G1C',  lot:'26 LOT 102', quantity_yd:670,  delta_e_master:0.54, delta_e_prev:0.80, note:null },
  { measure_date:'2026-02-24', supplier:'일라', color_code:'5G1',   lot:'26 LOT 100', quantity_yd:670,  delta_e_master:0.57, delta_e_prev:0.81, note:null },
  { measure_date:'2026-02-24', supplier:'일라', color_code:'441B',  lot:'26 LOT 101', quantity_yd:950,  delta_e_master:0.40, delta_e_prev:0.75, note:null },
  { measure_date:'2026-02-24', supplier:'일라', color_code:'456',   lot:'26 LOT 17',  quantity_yd:670,  delta_e_master:0.50, delta_e_prev:0.56, note:null },
  { measure_date:'2026-02-24', supplier:'일라', color_code:'443B',  lot:'26 LOT 100', quantity_yd:950,  delta_e_master:0.65, delta_e_prev:0.53, note:null },
  { measure_date:'2026-02-24', supplier:'일라', color_code:'447B',  lot:'26 LOT 100', quantity_yd:950,  delta_e_master:1.39, delta_e_prev:1.17, note:'기준 초과' },
  { measure_date:'2026-02-24', supplier:'일라', color_code:'561',   lot:'26 LOT 102', quantity_yd:1200, delta_e_master:0.61, delta_e_prev:0.77, note:null },
  { measure_date:'2026-02-24', supplier:'일라', color_code:'561',   lot:'26 LOT 103', quantity_yd:1200, delta_e_master:0.61, delta_e_prev:0.89, note:null },
  { measure_date:'2026-01-07', supplier:'일라', color_code:'831B',  lot:'25 LOT 11',  quantity_yd:650,  delta_e_master:0.26, delta_e_prev:0.51, note:null },
  { measure_date:'2026-01-07', supplier:'일라', color_code:'831B',  lot:'25 LOT 12',  quantity_yd:650,  delta_e_master:0.30, delta_e_prev:0.34, note:null },
  { measure_date:'2026-01-07', supplier:'일라', color_code:'371',   lot:'25 LOT 129', quantity_yd:650,  delta_e_master:0.58, delta_e_prev:0.79, note:null },
  { measure_date:'2026-01-07', supplier:'일라', color_code:'371',   lot:'25 LOT 130', quantity_yd:650,  delta_e_master:0.78, delta_e_prev:0.86, note:null },
  { measure_date:'2026-01-07', supplier:'일라', color_code:'371',   lot:'25 LOT 131', quantity_yd:650,  delta_e_master:0.42, delta_e_prev:0.86, note:null },
  { measure_date:'2026-01-07', supplier:'일라', color_code:'441B',  lot:'25 LOT 114', quantity_yd:950,  delta_e_master:0.43, delta_e_prev:0.61, note:null },
  { measure_date:'2026-01-07', supplier:'일라', color_code:'451A',  lot:'25 LOT 27',  quantity_yd:650,  delta_e_master:0.24, delta_e_prev:0.34, note:null },
  { measure_date:'2026-01-07', supplier:'일라', color_code:'457B',  lot:null,         quantity_yd:650,  delta_e_master:0.47, delta_e_prev:0.82, note:null },
  { measure_date:'2026-01-08', supplier:'일라', color_code:'376',   lot:'25 LOT 12',  quantity_yd:650,  delta_e_master:0.48, delta_e_prev:0.59, note:null },
  { measure_date:'2026-01-08', supplier:'일라', color_code:'376',   lot:'25 LOT 13',  quantity_yd:650,  delta_e_master:0.40, delta_e_prev:0.49, note:null },
  { measure_date:'2025-12-14', supplier:'일라', color_code:'831B',  lot:'25 LOT 103', quantity_yd:650,  delta_e_master:0.83, delta_e_prev:0.97, note:null },
  { measure_date:'2026-01-15', supplier:'일라', color_code:'451A',  lot:'26 LOT 1',   quantity_yd:650,  delta_e_master:0.25, delta_e_prev:0.72, note:null },
  { measure_date:'2026-01-15', supplier:'일라', color_code:'451A',  lot:'25 LOT 2',   quantity_yd:650,  delta_e_master:0.44, delta_e_prev:0.66, note:null },
  { measure_date:'2026-01-15', supplier:'일라', color_code:'2H2',   lot:'26 LOT 2',   quantity_yd:650,  delta_e_master:0.68, delta_e_prev:0.73, note:null },
  { measure_date:'2026-01-15', supplier:'일라', color_code:'831B',  lot:'26 LOT 1',   quantity_yd:650,  delta_e_master:0.31, delta_e_prev:0.41, note:null },
  { measure_date:'2026-01-15', supplier:'일라', color_code:'441D',  lot:'26 LOT 100', quantity_yd:950,  delta_e_master:0.16, delta_e_prev:0.07, note:null },
  { measure_date:'2026-01-20', supplier:'일라', color_code:'443D',  lot:'26 LOT 100', quantity_yd:950,  delta_e_master:0.47, delta_e_prev:0.85, note:null },
  { measure_date:'2026-01-20', supplier:'일라', color_code:'454A',  lot:'26 LOT 1',   quantity_yd:670,  delta_e_master:0.62, delta_e_prev:0.85, note:null },
  { measure_date:'2026-01-20', supplier:'일라', color_code:'561',   lot:'25 LOT 107', quantity_yd:1200, delta_e_master:0.50, delta_e_prev:0.54, note:null },
  { measure_date:'2026-01-20', supplier:'일라', color_code:'561',   lot:'26 LOT 100', quantity_yd:1200, delta_e_master:0.70, delta_e_prev:0.75, note:null },
  { measure_date:'2026-01-20', supplier:'일라', color_code:'561',   lot:'26 LOT 101', quantity_yd:1200, delta_e_master:0.80, delta_e_prev:0.82, note:null },
  { measure_date:'2026-01-27', supplier:'일라', color_code:'831B',  lot:'26 LOT 100', quantity_yd:650,  delta_e_master:0.90, delta_e_prev:0.93, note:null },
  { measure_date:'2026-01-27', supplier:'일라', color_code:'451A',  lot:'26 LOT 6',   quantity_yd:670,  delta_e_master:0.42, delta_e_prev:0.48, note:null },
  { measure_date:'2026-01-27', supplier:'일라', color_code:'451A',  lot:'26 LOT 7',   quantity_yd:670,  delta_e_master:0.51, delta_e_prev:0.65, note:null },
  { measure_date:'2026-01-27', supplier:'일라', color_code:'451A',  lot:'26 LOT 8',   quantity_yd:670,  delta_e_master:0.63, delta_e_prev:0.58, note:null },
  { measure_date:'2026-01-30', supplier:'일라', color_code:'443D',  lot:'26 LOT 100', quantity_yd:950,  delta_e_master:0.81, delta_e_prev:0.95, note:null },
  { measure_date:'2026-01-30', supplier:'일라', color_code:'441A',  lot:'26 LOT 100', quantity_yd:950,  delta_e_master:0.14, delta_e_prev:0.15, note:null },
  { measure_date:'2026-01-30', supplier:'일라', color_code:'441P',  lot:'26 LOT 101', quantity_yd:950,  delta_e_master:0.52, delta_e_prev:0.58, note:null },
  { measure_date:'2026-01-30', supplier:'일라', color_code:'441D',  lot:'26 LOT 101', quantity_yd:950,  delta_e_master:0.56, delta_e_prev:0.64, note:null },
  { measure_date:'2026-01-30', supplier:'일라', color_code:'444D',  lot:'26 LOT 100', quantity_yd:950,  delta_e_master:0.86, delta_e_prev:0.89, note:null },
  { measure_date:'2026-01-30', supplier:'일라', color_code:'449PN', lot:'26 LOT 100', quantity_yd:950,  delta_e_master:0.52, delta_e_prev:0.63, note:null }
];

async function run() {
  const res = await fetch(SB_URL + '/rest/v1/incoming_colorimetry', {
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
