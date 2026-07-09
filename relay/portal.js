// 앱 포털 (SaaS 대표 진입점)
// portal.<도메인> 접속 → 로그인 → 회사의 전체 사내 시스템을 타일로 표시.
// 권한 없는 앱은 🔒 잠금 표시 — 클릭해도 게이트웨이가 403으로 차단한다.

// host: "portal.10.52.249.249.sslip.io:443" → 앱 링크는 첫 라벨만 교체
function appUrl(host, app) {
  const parts = (host || '').split('.');
  parts[0] = app;
  return `//${parts.join('.')}/`;
}

function portalPage(session, allowedApps, meta, host) {
  const tiles = Object.entries(meta)
    .map(([app, m]) => {
      const allowed = allowedApps.includes(app);
      return `<a class="tile${allowed ? '' : ' locked'}" href="${appUrl(host, app)}">
        <div class="icon">${m.icon}</div>
        <div class="t">${m.title}${allowed ? '' : ' <span class="lock">🔒 권한 없음</span>'}</div>
        <div class="d">${m.desc}</div>
      </a>`;
    })
    .join('');

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OfficeBridge 포털</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,"Malgun Gothic",sans-serif;background:#111827;color:#f9fafb;min-height:100vh}
header{display:flex;align-items:center;gap:10px;padding:16px 24px;border-bottom:1px solid #1f2937}
header .logo{font-size:14px;letter-spacing:2px;color:#60a5fa;font-weight:700}
header .me{margin-left:auto;font-size:13px;color:#9ca3af}
header a{color:#60a5fa;font-size:13px;text-decoration:none;margin-left:14px}
main{max-width:820px;margin:0 auto;padding:48px 20px}
h1{font-size:22px;margin-bottom:6px}
.sub{font-size:14px;color:#9ca3af;margin-bottom:32px}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.tile{display:block;background:#1f2937;border:1px solid #374151;border-radius:14px;padding:22px 20px;text-decoration:none;color:#f9fafb;transition:transform .08s,border-color .08s}
.tile:hover{transform:translateY(-2px);border-color:#60a5fa}
.tile .icon{font-size:30px;margin-bottom:12px}
.tile .t{font-size:16px;font-weight:600;margin-bottom:4px}
.tile .d{font-size:12.5px;color:#9ca3af;line-height:1.5}
.tile.locked{opacity:.55}
.tile.locked:hover{border-color:#f87171;opacity:.75}
.lock{font-size:11px;color:#f87171;border:1px solid #f8717166;border-radius:8px;padding:1px 7px;font-weight:500;vertical-align:2px}
.note{margin-top:36px;font-size:12px;color:#6b7280;line-height:1.7}
.empty{background:#1f2937;border-radius:14px;padding:36px;text-align:center;color:#9ca3af;font-size:14px}
</style></head>
<body>
<header><span>🌉</span><span class="logo">OFFICEBRIDGE</span>
<span class="me">${session.name}</span><a href="/_ob/logout">로그아웃</a></header>
<main>
  <h1>사내 시스템</h1>
  <div class="sub">🔒 표시된 시스템은 ${session.name}님께 접근 권한이 없습니다. 필요 시 관리자에게 권한을 요청하세요.</div>
  ${tiles || '<div class="empty">등록된 사내 시스템이 없습니다.</div>'}
  <div class="note">🔒 모든 접속은 OfficeBridge 제로트러스트 게이트웨이를 통해 검증·기록됩니다.<br>
  VPN 연결 없이 안전하게 사내 시스템을 이용하세요.</div>
</main>
</body></html>`;
}

module.exports = { portalPage };
