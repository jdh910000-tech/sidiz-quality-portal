// api/confluence-update.js — Vercel 서버리스 함수 (CommonJS)
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN, CONFLUENCE_PAGE_ID } = process.env;
  const missing = [
    !CONFLUENCE_BASE_URL  && 'CONFLUENCE_BASE_URL',
    !CONFLUENCE_EMAIL     && 'CONFLUENCE_EMAIL',
    !CONFLUENCE_API_TOKEN && 'CONFLUENCE_API_TOKEN',
    !CONFLUENCE_PAGE_ID   && 'CONFLUENCE_PAGE_ID'
  ].filter(Boolean);
  if (missing.length > 0) return res.status(500).json({ error: '환경변수 미설정', missing });

  const auth = 'Basic ' + Buffer.from(`${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}`).toString('base64');

  let pageInfo;
  try {
    const r = await fetch(`${CONFLUENCE_BASE_URL}/wiki/rest/api/content/${CONFLUENCE_PAGE_ID}?expand=version,title`,
      { headers: { Authorization: auth, Accept: 'application/json' } });
    if (!r.ok) return res.status(502).json({ error: `페이지 조회 실패 (${r.status})`, detail: await r.text() });
    pageInfo = await r.json();
  } catch(e) { return res.status(502).json({ error: 'Confluence 연결 실패', detail: e.message }); }

  const { reportMonth, claimRows, analysisNote, failureCostRows, updatedAt } = req.body || {};

  try {
    const putRes = await fetch(`${CONFLUENCE_BASE_URL}/wiki/rest/api/content/${CONFLUENCE_PAGE_ID}`, {
      method: 'PUT',
      headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        version: { number: pageInfo.version.number + 1 },
        title: pageInfo.title, type: 'page',
        body: { storage: { value: buildStorage({ reportMonth, claimRows, analysisNote, failureCostRows, updatedAt }), representation: 'storage' } }
      })
    });
    if (!putRes.ok) return res.status(502).json({ error: `업데이트 실패 (${putRes.status})`, detail: await putRes.text() });
    const updated = await putRes.json();
    return res.status(200).json({
      success: true,
      message: `Confluence 페이지 업데이트 완료 (v${pageInfo.version.number + 1})`,
      pageUrl: `${CONFLUENCE_BASE_URL}/wiki${updated._links?.webui || ''}`
    });
  } catch(e) { return res.status(502).json({ error: '업데이트 중 오류', detail: e.message }); }
};

function buildStorage({ reportMonth, claimRows, analysisNote, failureCostRows, updatedAt }) {
  const now = updatedAt || new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const month = reportMonth || '-';
  const claimTr = (claimRows||[]).map(r=>`<tr><td><strong>${e(r.label)}</strong></td><td style="text-align:center">${e(r.prev)}</td><td style="text-align:center">${e(r.cur)}</td><td style="text-align:center">${e(r.change)}</td></tr>`).join('');
  const costTr  = (failureCostRows||[]).map(r=>`<tr><td>${e(r.label)}</td><td style="text-align:right">${e(r.prev)}</td><td style="text-align:right">${e(r.cur)}</td><td style="text-align:right">${e(r.change)}</td></tr>`).join('');
  const noteHtml = (analysisNote||'').split('\n').map(l=>`<p>${e(l)||'&nbsp;'}</p>`).join('');
  return `<ac:structured-macro ac:name="info" ac:schema-version="1"><ac:rich-text-body><p>📊 <strong>SIDIZ 품질관리 포털</strong> 자동 동기화 | 기준월: <strong>${e(month)}</strong> | 업데이트: ${e(now)}</p></ac:rich-text-body></ac:structured-macro>
<h2>📋 고객클레임 KPI 현황 (${e(month)})</h2>
<p><em>집계 기준: 시디즈 브랜드 · 제조/설계/서비스/사양재검토/고객불만</em></p>
<table><tbody><tr><th>구분</th><th style="text-align:center">전월</th><th style="text-align:center">당월</th><th style="text-align:center">증감</th></tr>${claimTr||'<tr><td colspan="4">데이터 없음</td></tr>'}</tbody></table>
${costTr?`<h2>💰 실패비용 현황 (${e(month)})</h2><table><tbody><tr><th>구분</th><th style="text-align:right">전월</th><th style="text-align:right">당월</th><th style="text-align:right">증감</th></tr>${costTr}</tbody></table>`:''}
<h2>📝 월별 종합 분석</h2><ac:structured-macro ac:name="panel" ac:schema-version="1"><ac:parameter ac:name="title">분석 내용</ac:parameter><ac:rich-text-body>${noteHtml||'<p>작성된 내용이 없습니다.</p>'}</ac:rich-text-body></ac:structured-macro>
<p style="color:#888;font-size:0.85em">※ SIDIZ 품질관리 포털에서 자동 생성된 페이지입니다.</p>`;
}
function e(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
