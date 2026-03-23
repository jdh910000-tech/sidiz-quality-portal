// api/confluence-update.js
// Vercel 서버리스 함수 — Confluence REST API 프록시
// 환경변수 (Vercel Dashboard > Settings > Environment Variables):
//   CONFLUENCE_BASE_URL   예) https://yourcompany.atlassian.net
//   CONFLUENCE_EMAIL      예) user@company.com
//   CONFLUENCE_API_TOKEN  예) ATATT3x...  (atlassian.com에서 발급)
//   CONFLUENCE_PAGE_ID    예) 123456789

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    CONFLUENCE_BASE_URL,
    CONFLUENCE_EMAIL,
    CONFLUENCE_API_TOKEN,
    CONFLUENCE_PAGE_ID
  } = process.env;

  // 환경변수 검사
  if (!CONFLUENCE_BASE_URL || !CONFLUENCE_EMAIL || !CONFLUENCE_API_TOKEN || !CONFLUENCE_PAGE_ID) {
    return res.status(500).json({
      error: 'Confluence 환경변수가 설정되지 않았습니다.',
      missing: [
        !CONFLUENCE_BASE_URL && 'CONFLUENCE_BASE_URL',
        !CONFLUENCE_EMAIL    && 'CONFLUENCE_EMAIL',
        !CONFLUENCE_API_TOKEN && 'CONFLUENCE_API_TOKEN',
        !CONFLUENCE_PAGE_ID  && 'CONFLUENCE_PAGE_ID'
      ].filter(Boolean)
    });
  }

  const authHeader = 'Basic ' + Buffer.from(`${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}`).toString('base64');
  const pageApiUrl = `${CONFLUENCE_BASE_URL}/wiki/rest/api/content/${CONFLUENCE_PAGE_ID}?expand=version,title`;

  // ① 현재 페이지 버전 조회
  let pageInfo;
  try {
    const getRes = await fetch(pageApiUrl, {
      headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
    });
    if (!getRes.ok) {
      const txt = await getRes.text();
      return res.status(502).json({ error: `Confluence 페이지 조회 실패 (${getRes.status})`, detail: txt });
    }
    pageInfo = await getRes.json();
  } catch (e) {
    return res.status(502).json({ error: 'Confluence 연결 실패', detail: e.message });
  }

  const currentVersion = pageInfo.version.number;
  const pageTitle     = pageInfo.title;

  // ② 요청 바디에서 KPI 데이터 받기
  const { reportMonth, claimRows, analysisNote, failureCostRows, updatedAt } = req.body || {};

  // ③ Confluence Storage Format 생성
  const storageValue = buildStorage({ reportMonth, claimRows, analysisNote, failureCostRows, updatedAt });

  // ④ 페이지 업데이트
  try {
    const putRes = await fetch(`${CONFLUENCE_BASE_URL}/wiki/rest/api/content/${CONFLUENCE_PAGE_ID}`, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type':  'application/json',
        'Accept':        'application/json'
      },
      body: JSON.stringify({
        version: { number: currentVersion + 1 },
        title:   pageTitle,
        type:    'page',
        body: {
          storage: {
            value:          storageValue,
            representation: 'storage'
          }
        }
      })
    });

    if (!putRes.ok) {
      const txt = await putRes.text();
      return res.status(502).json({ error: `Confluence 업데이트 실패 (${putRes.status})`, detail: txt });
    }

    const updated = await putRes.json();
    return res.status(200).json({
      success: true,
      message: `✅ Confluence 페이지 업데이트 완료 (v${currentVersion + 1})`,
      pageUrl: `${CONFLUENCE_BASE_URL}/wiki${updated._links?.webui || ''}`
    });
  } catch (e) {
    return res.status(502).json({ error: 'Confluence 업데이트 중 오류', detail: e.message });
  }
}

// ─── Confluence Storage Format 빌더 ──────────────────────────────────────────
function buildStorage({ reportMonth, claimRows, analysisNote, failureCostRows, updatedAt }) {
  const now = updatedAt || new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const month = reportMonth || '-';

  // 클레임 현황 테이블
  const claimTableRows = (claimRows || []).map(r => `
    <tr>
      <td><strong>${esc(r.label)}</strong></td>
      <td style="text-align:center;">${esc(r.prev)}</td>
      <td style="text-align:center;">${esc(r.cur)}</td>
      <td style="text-align:center;color:${r.changeColor || '#333'}">${esc(r.change)}</td>
    </tr>`).join('');

  // 실패비용 테이블
  const costTableRows = (failureCostRows || []).map(r => `
    <tr>
      <td>${esc(r.label)}</td>
      <td style="text-align:right;">${esc(r.prev)}</td>
      <td style="text-align:right;">${esc(r.cur)}</td>
      <td style="text-align:right;">${esc(r.change)}</td>
    </tr>`).join('');

  // 분석 노트 — 줄바꿈 처리
  const noteHtml = (analysisNote || '')
    .split('\n')
    .map(l => `<p>${esc(l) || '&nbsp;'}</p>`)
    .join('');

  return `
<ac:structured-macro ac:name="info" ac:schema-version="1">
  <ac:rich-text-body>
    <p>📊 <strong>SIDIZ 품질관리 포털</strong> 자동 동기화 &nbsp;|&nbsp; 기준월: <strong>${esc(month)}</strong> &nbsp;|&nbsp; 업데이트: ${esc(now)}</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>📋 고객클레임 KPI 현황 (${esc(month)})</h2>
<p><em>집계 기준: 시디즈 브랜드 · 제조/설계/서비스/사양재검토/고객불만 판정유형</em></p>

<table>
  <colgroup>
    <col style="width:220px"/>
    <col style="width:120px"/>
    <col style="width:120px"/>
    <col style="width:120px"/>
  </colgroup>
  <tbody>
    <tr>
      <th style="background:#1a2744;color:#fff;">구분</th>
      <th style="background:#1a2744;color:#fff;text-align:center;">전월</th>
      <th style="background:#1a2744;color:#fff;text-align:center;">당월(${esc(month)})</th>
      <th style="background:#1a2744;color:#fff;text-align:center;">증감</th>
    </tr>
    ${claimTableRows || '<tr><td colspan="4">데이터 없음</td></tr>'}
  </tbody>
</table>

${costTableRows ? `
<h2>💰 실패비용 현황 (${esc(month)})</h2>
<table>
  <colgroup>
    <col style="width:220px"/>
    <col style="width:120px"/>
    <col style="width:120px"/>
    <col style="width:120px"/>
  </colgroup>
  <tbody>
    <tr>
      <th style="background:#1a2744;color:#fff;">구분</th>
      <th style="background:#1a2744;color:#fff;text-align:right;">전월</th>
      <th style="background:#1a2744;color:#fff;text-align:right;">당월</th>
      <th style="background:#1a2744;color:#fff;text-align:right;">증감</th>
    </tr>
    ${costTableRows}
  </tbody>
</table>` : ''}

<h2>📝 월별 종합 분석 메모</h2>
<ac:structured-macro ac:name="panel" ac:schema-version="1">
  <ac:parameter ac:name="title">분석 내용</ac:parameter>
  <ac:rich-text-body>
    ${noteHtml || '<p>작성된 내용이 없습니다.</p>'}
  </ac:rich-text-body>
</ac:structured-macro>

<p style="color:#888;font-size:0.85em;">※ 본 페이지는 SIDIZ 품질관리 포털에서 자동 생성되었습니다. 직접 수정 시 다음 동기화 시 덮어써질 수 있습니다.</p>
`;
}

// HTML 특수문자 이스케이프
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
