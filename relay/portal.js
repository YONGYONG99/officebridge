// 앱 포털 (SaaS 대표 진입점)
// portal.<도메인> 접속 → 로그인 → 회사의 전체 사내 시스템을 목록으로 표시.
// 권한 없는 앱은 🔒 잠금 표시 — 클릭해도 게이트웨이가 403으로 차단한다.

// host: "portal.10.52.249.249.sslip.io:443" → 앱 링크는 첫 라벨만 교체
function appUrl(host, app) {
  const parts = (host || '').split('.');
  parts[0] = app;
  return `//${parts.join('.')}/`;
}

function portalPage(session, allowedApps, meta, host, company) {
  const rows = Object.entries(meta)
    .map(([app, m]) => {
      const allowed = allowedApps.includes(app);
      return `<a class="row${allowed ? '' : ' locked'}" href="${appUrl(host, app)}">
        <div class="info">
          <div class="t">${m.title}${allowed ? '' : ' <span class="lock">🔒 권한 없음</span>'}</div>
          <div class="d">${m.desc}</div>
        </div>
        <span class="go">${allowed ? '접속 →' : ''}</span>
      </a>`;
    })
    .join('');

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OfficeBridge 포털</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif;background:#eef1f6;color:#14224e;min-height:100vh}
header{display:flex;align-items:center;gap:12px;padding:15px 24px;background:#fff;border-bottom:1px solid #dfe5ef}
.logo{font-size:19px;color:#14224e;letter-spacing:-.3px}
.logo b{font-weight:800}
.logo b i{font-style:normal;color:#9aa3b5}
.corp{margin-left:auto;display:flex;flex-direction:column;gap:3px}
.corp .r{display:flex;align-items:center;gap:7px;font-size:13px}
.corp .r svg{flex:none}
.corp .r b{font-weight:700;color:#14224e}
.corp .r span{color:#3d4a63}
header a.out{color:#14224e;font-size:13px;text-decoration:none;margin-left:18px;font-weight:600;align-self:center}
main{max-width:680px;margin:0 auto;padding:44px 20px}
h1{font-size:20px;margin-bottom:6px}
.sub{font-size:13.5px;color:#8a93a6;margin-bottom:26px}
.row{display:flex;align-items:center;background:#fff;border:1px solid #dfe5ef;border-radius:10px;padding:14px 18px;margin-bottom:10px;text-decoration:none;color:inherit;transition:border-color .1s}
.row:hover{border-color:#14224e}
.row .t{font-size:15px;font-weight:600}
.row .d{font-size:12.5px;color:#8a93a6;margin-top:3px}
.row .go{margin-left:auto;font-size:13px;color:#3d4a63;white-space:nowrap}
.row.locked{opacity:.6}
.row.locked:hover{border-color:#c0392b}
.lock{font-size:11px;color:#c0392b;border:1px solid #f5c1c1;background:#fdecec;border-radius:8px;padding:1px 7px;font-weight:500;vertical-align:2px;margin-left:6px}
.note{margin-top:32px;font-size:12px;color:#a8b0c2;line-height:1.7}
.empty{background:#fff;border:1px solid #dfe5ef;border-radius:10px;padding:36px;text-align:center;color:#8a93a6;font-size:14px}
</style></head>
<body>
<header><span class="logo">Office<b>BR<i>I</i>DGE</b></span>
<div class="corp">
  <div class="r">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2b4fd8" stroke-width="2" stroke-linecap="round"><path d="M3 21h18"/><path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16"/><path d="M15 9h4a1 1 0 0 1 1 1v11"/><path d="M8 8h2M8 12h2M8 16h2"/></svg>
    <b>${company}</b>
  </div>
  <div class="r">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2b4fd8" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>
    <span>${session.name}</span>
  </div>
</div>
<a class="out" href="/_ob/logout">로그아웃</a></header>
<main>
  <h1>사내 시스템</h1>
  <div class="sub">🔒 표시된 시스템은 ${session.name}님께 접근 권한이 없습니다. 필요 시 관리자에게 권한을 요청하세요.</div>
  ${rows || '<div class="empty">등록된 사내 시스템이 없습니다.</div>'}
  <div class="note">모든 접속은 OfficeBridge 제로트러스트 게이트웨이를 통해 검증·기록됩니다.<br>
  VPN 연결 없이 안전하게 사내 시스템을 이용하세요.</div>
</main>
</body></html>`;
}

module.exports = { portalPage };
