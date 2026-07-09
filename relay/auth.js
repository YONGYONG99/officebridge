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

function loginPage(next, errorMsg) {
  const users = getUsers();
  const accountChips = Object.entries(users)
    .map(
      ([email, u]) =>
        `<div class="chip" onclick="document.querySelector('[name=email]').value='${email}';document.querySelector('[name=password]').focus()">${u.name.split(' ')[0]}</div>`
    )
    .join('');
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OfficeBridge 로그인</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,"Malgun Gothic",sans-serif;background:#111827;color:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{width:360px;padding:36px;background:#1f2937;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.4)}
  .logo{font-size:13px;letter-spacing:2px;color:#60a5fa;text-align:center;margin-bottom:6px}
  h1{font-size:18px;text-align:center;margin-bottom:4px}
  .sub{font-size:13px;color:#9ca3af;text-align:center;margin-bottom:20px}
  label{display:block;font-size:12px;color:#9ca3af;margin:12px 0 6px}
  input{width:100%;padding:11px 14px;background:#111827;border:1px solid #4b5563;border-radius:10px;color:#f9fafb;font-size:14px}
  input:focus{outline:none;border-color:#60a5fa}
  .submit{width:100%;margin-top:20px;padding:12px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer}
  .submit:hover{background:#1d4ed8}
  .error{margin-top:14px;padding:10px;background:#7f1d1d40;border:1px solid #b91c1c;border-radius:8px;color:#fca5a5;font-size:13px;text-align:center}
  .chips{display:flex;gap:6px;justify-content:center;margin-top:18px}
  .chip{font-size:12px;padding:5px 10px;background:#374151;border-radius:14px;color:#d1d5db;cursor:pointer}
  .chip:hover{background:#4b5563}
  .note{font-size:11px;color:#6b7280;text-align:center;margin-top:12px;line-height:1.5}
</style></head>
<body><div class="card">
  <div class="logo">🌉 OFFICEBRIDGE</div>
  <h1>사내 시스템 접속</h1>
  <div class="sub">본인 확인 후 인가된 시스템만 이용할 수 있습니다</div>
  <form method="POST" action="/_ob/login">
    <input type="hidden" name="next" value="${next}">
    <label>회사 이메일</label>
    <input type="email" name="email" placeholder="name@demo.co.kr" required autofocus>
    <label>비밀번호</label>
    <input type="password" name="password" placeholder="••••••••" required>
    <button type="submit" class="submit">로그인</button>
  </form>
  ${errorMsg ? `<div class="error">${errorMsg}</div>` : ''}
  <div class="chips">${accountChips}</div>
  <div class="note">데모 계정 — 위 이름 클릭 시 이메일 자동 입력 (비밀번호: demo1234)<br>실서비스: 이메일 OTP·패스키 및 Google/MS 계정 연동(OIDC)</div>
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
      const email = (form.get('email') || '').trim().toLowerCase();
      const password = form.get('password') || '';
      const next = form.get('next') || '/';
      const user = getUsers()[email];
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      if (!user || user.passwordHash !== hash) {
        console.log(`[auth] ❌ 로그인 실패: ${email}`);
        res.writeHead(401, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(loginPage(next, '이메일 또는 비밀번호가 올바르지 않습니다.'));
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
