// 데모용 사내 시스템 목업 3종 (그룹웨어/위키/인사DB)
// 127.0.0.1에만 바인딩 — 외부에서 직접 접근 불가, 오직 커넥터를 통해서만 접근 가능해야 함
const http = require('http');

const APPS = [
  {
    port: 8081,
    name: '그룹웨어',
    color: '#2563eb',
    icon: '🏢',
    body: `
      <h2>📋 결재 대기 문서</h2>
      <table>
        <tr><th>문서번호</th><th>제목</th><th>기안자</th><th>상태</th></tr>
        <tr><td>APP-2026-0712</td><td>7월 출장비 정산</td><td>김영업</td><td><span class="badge wait">대기</span></td></tr>
        <tr><td>APP-2026-0711</td><td>노트북 구매 품의</td><td>이개발</td><td><span class="badge wait">대기</span></td></tr>
        <tr><td>APP-2026-0709</td><td>상반기 성과 보고</td><td>박기획</td><td><span class="badge done">승인</span></td></tr>
      </table>
      <h2>📢 공지사항</h2>
      <ul>
        <li>[전사] 7월 전사 워크숍 일정 안내</li>
        <li>[보안] 사내 시스템 원격접속 방식 변경 안내 (OfficeBridge 도입)</li>
      </ul>`,
  },
  {
    port: 8082,
    name: '사내 위키',
    color: '#059669',
    icon: '📚',
    body: `
      <h2>최근 수정된 문서</h2>
      <ul>
        <li><a href="#">신입사원 온보딩 가이드</a> <small>— 10분 전</small></li>
        <li><a href="#">개발서버 접속 방법</a> <small>— 2시간 전</small></li>
        <li><a href="#">2026 하반기 제품 로드맵</a> <small>— 어제</small></li>
      </ul>
      <h2>자주 찾는 문서</h2>
      <ul>
        <li><a href="#">휴가 신청 절차</a></li>
        <li><a href="#">법인카드 사용 규정</a></li>
      </ul>`,
  },
  {
    // 데모용 "미등록" 시스템 — 대시보드에서 라이브로 등록하는 시연에 사용 (label 예: acct)
    port: 8084,
    name: '회계관리',
    color: '#7c3aed',
    icon: '💰',
    body: `
      <h2>📊 월별 지출 현황</h2>
      <table>
        <tr><th>월</th><th>지출 총액</th><th>결재 건수</th><th>상태</th></tr>
        <tr><td>2026-05</td><td>84,200,000원</td><td>127건</td><td><span class="badge done">마감</span></td></tr>
        <tr><td>2026-06</td><td>91,750,000원</td><td>143건</td><td><span class="badge done">마감</span></td></tr>
        <tr><td>2026-07</td><td>38,410,000원</td><td>61건</td><td><span class="badge wait">진행중</span></td></tr>
      </table>
      <p><small>* 데모용 가짜 데이터입니다. 이 시스템은 초기 상태에서 OfficeBridge에 미등록 — 대시보드 등록 시연용.</small></p>`,
  },
  {
    port: 8083,
    name: '인사DB',
    color: '#dc2626',
    icon: '🔒',
    body: `
      <h2>⚠️ 민감정보 시스템</h2>
      <p>임직원 급여·평가·개인정보를 담고 있는 시스템입니다.</p>
      <table>
        <tr><th>사번</th><th>이름</th><th>부서</th><th>연봉</th></tr>
        <tr><td>2019001</td><td>김**</td><td>영업팀</td><td>*,***만원</td></tr>
        <tr><td>2020014</td><td>이**</td><td>개발팀</td><td>*,***만원</td></tr>
      </table>
      <p><small>* 데모용 가짜 데이터입니다. 이 화면은 "권한 없는 접근 차단" 시나리오에서 보이면 안 되는 화면입니다.</small></p>`,
  },
];

function page(app) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${app.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif; background:#f3f4f6; color:#1f2937; }
  header { background:${app.color}; color:#fff; padding:16px 24px; display:flex; align-items:center; gap:10px; }
  header h1 { font-size:18px; font-weight:600; }
  header .tag { margin-left:auto; font-size:12px; opacity:.85; }
  main { max-width:760px; margin:24px auto; padding:0 16px; }
  h2 { font-size:15px; margin:20px 0 10px; }
  table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,.06); }
  th,td { padding:10px 12px; text-align:left; font-size:14px; border-bottom:1px solid #f0f0f0; }
  th { background:#fafafa; font-weight:600; font-size:13px; color:#6b7280; }
  ul { background:#fff; border-radius:8px; padding:12px 12px 12px 32px; box-shadow:0 1px 2px rgba(0,0,0,.06); }
  li { padding:6px 0; font-size:14px; }
  a { color:${app.color}; text-decoration:none; }
  small { color:#9ca3af; }
  .badge { font-size:12px; padding:2px 8px; border-radius:10px; }
  .badge.wait { background:#fef3c7; color:#b45309; }
  .badge.done { background:#d1fae5; color:#047857; }
  p { font-size:14px; margin:8px 0; }
</style>
</head>
<body>
<header><span>${app.icon}</span><h1>${app.name}</h1><span class="tag">사내망 전용 시스템 · :${app.port}</span></header>
<main>${app.body}</main>
</body>
</html>`;
}

for (const app of APPS) {
  http
    .createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(page(app));
    })
    .listen(app.port, '127.0.0.1', () => {
      console.log(`[mock] ${app.name} → http://127.0.0.1:${app.port} (내부망 전용)`);
    });
}
