// 인증 모듈 (F-2 임시 구현 + 세션 관리)
// 지금은 데모 계정 선택형 로그인. 추후 Google OAuth로 교체 시 이 파일의
// 로그인 화면/POST 처리만 OAuth 리다이렉트로 바꾸면 됨 (세션 구조는 그대로).
const crypto = require('crypto');
const { getUsers } = require('./policy');

// sessionId → { email, name, createdAt }
const sessions = new Map();

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function getSession(req) {
  const sid = parseCookies(req).ob_session;
  if (!sid) return null;
  const s = sessions.get(sid);
  return s ? { sid, ...s } : null;
}

// 서비스별 호스트(groupware.x, wiki.x)에서 세션을 공유하기 위해 부모 도메인에 쿠키 설정
// 예: groupware.10.52.249.249.sslip.io → Domain=.10.52.249.249.sslip.io
function cookieDomainAttr(host) {
  const h = (host || '').split(':')[0];
  const parts = h.split('.');
  return parts.length >= 2 ? `; Domain=.${parts.slice(1).join('.')}` : '';
}

function loginPage(next) {
  const users = getUsers();
  const buttons = Object.entries(users)
    .map(
      ([email, u]) => `
      <form method="POST" action="/_ob/login">
        <input type="hidden" name="email" value="${email}">
        <input type="hidden" name="next" value="${next}">
        <button type="submit"><strong>${u.name}</strong><span>${email}</span></button>
      </form>`
    )
    .join('');
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OfficeBridge 로그인</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,"Malgun Gothic",sans-serif;background:#111827;color:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{width:360px;padding:36px;background:#1f2937;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.4)}
  .logo{font-size:13px;letter-spacing:2px;color:#60a5fa;text-align:center;margin-bottom:6px}
  h1{font-size:18px;text-align:center;margin-bottom:4px}
  .sub{font-size:13px;color:#9ca3af;text-align:center;margin-bottom:24px}
  button{width:100%;display:flex;flex-direction:column;gap:2px;text-align:left;padding:12px 16px;margin-bottom:10px;background:#374151;color:#f9fafb;border:1px solid #4b5563;border-radius:10px;font-size:14px;cursor:pointer}
  button:hover{background:#4b5563}
  button span{font-size:12px;color:#9ca3af}
  .note{font-size:11px;color:#6b7280;text-align:center;margin-top:14px;line-height:1.5}
</style></head>
<body><div class="card">
  <div class="logo">🌉 OFFICEBRIDGE</div>
  <h1>사내 시스템 접속</h1>
  <div class="sub">본인 확인 후 인가된 시스템만 이용할 수 있습니다</div>
  ${buttons}
  <div class="note">데모 모드 — 실서비스에서는 회사 SSO(Google Workspace 등)로<br>본인 인증이 진행됩니다</div>
</div></body></html>`;
}

// /_ob/* 내부 경로 처리. 처리했으면 true 반환
function handleAuthRoutes(req, res) {
  const url = new URL(req.url, 'http://gateway');

  if (url.pathname === '/_ob/login' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(loginPage(url.searchParams.get('next') || '/'));
    return true;
  }

  if (url.pathname === '/_ob/login' && req.method === 'POST') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const form = new URLSearchParams(Buffer.concat(chunks).toString());
      const email = form.get('email');
      const next = form.get('next') || '/';
      const user = getUsers()[email];
      if (!user) {
        res.writeHead(302, { location: '/_ob/login' });
        return res.end();
      }
      const sid = crypto.randomUUID();
      sessions.set(sid, { email, name: user.name, createdAt: Date.now() });
      console.log(`[auth] 로그인: ${user.name} <${email}>`);
      res.writeHead(302, {
        'set-cookie': `ob_session=${sid}; Path=/; HttpOnly${cookieDomainAttr(req.headers.host)}`,
        location: next.startsWith('/') ? next : '/',
      });
      res.end();
    });
    return true;
  }

  if (url.pathname === '/_ob/logout') {
    const session = getSession(req);
    if (session) {
      sessions.delete(session.sid);
      console.log(`[auth] 로그아웃: ${session.email}`);
    }
    res.writeHead(302, {
      'set-cookie': `ob_session=; Path=/; Max-Age=0${cookieDomainAttr(req.headers.host)}`,
      location: '/_ob/login',
    });
    res.end();
    return true;
  }

  return false;
}

module.exports = { getSession, handleAuthRoutes, sessions };
