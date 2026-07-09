// 인증 모듈 (F-2 임시 구현 + 세션 관리)
// 지금은 데모 계정 선택형 로그인. 추후 Google OAuth로 교체 시 이 파일의
// 로그인 화면/POST 처리만 OAuth 리다이렉트로 바꾸면 됨 (세션 구조는 그대로).
const crypto = require('crypto');
const { getUsers, getCompany } = require('./policy');
const audit = require('./audit');

// sessionId → { email, name, createdAt }
const sessions = new Map();
// 관리자가 차단한 계정 (로그인 자체 거부)
const blocked = new Set();

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
  const company = getCompany().name;
  const users = getUsers();
  const accountChips = Object.entries(users)
    .map(([email, u]) => `<button type="button" class="chip" onclick="fill('${email}')">${u.name.split(' ')[0]}</button>`)
    .join('');
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OfficeBridge 로그인</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif;background:#eef1f6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.wrap{width:100%;max-width:980px}
.logo{font-size:27px;color:#14224e;margin-bottom:16px;letter-spacing:-.5px}
.logo b{font-weight:800}
.logo b i{font-style:normal;color:#9aa3b5}
.panel{display:grid;grid-template-columns:1fr 1fr;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(20,34,78,.13);min-height:540px}
.left{padding:56px 52px}
.left h1{font-size:21px;color:#14224e;display:flex;align-items:center;gap:10px}
.co{font-size:12px;font-weight:700;color:#14224e;background:#eef1f6;border:1px solid #dfe5ef;border-radius:8px;padding:3px 10px;letter-spacing:1px}
label{display:block;font-size:13.5px;color:#3d4a63;margin:26px 0 8px}
input{width:100%;padding:13px 14px;border:1px solid #d6dbe6;border-radius:8px;font-size:14.5px;color:#14224e;background:#fff}
input::placeholder{color:#a8b0c2}
input:focus{outline:none;border-color:#14224e}
.find{text-align:right;margin-top:12px}
.find a{font-size:13px;color:#3d4a63}
.submit{width:100%;margin-top:22px;padding:14px;background:#14224e;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer}
.submit:hover{background:#1d2f66}
.error{margin-top:14px;padding:10px 12px;background:#fdecec;border:1px solid #f5b5b5;border-radius:8px;color:#c0392b;font-size:13px;text-align:center}
.demo{margin-top:30px;font-size:12px;color:#8a93a6;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.chip{font-size:12px;padding:4px 11px;background:#f1f4f9;border:1px solid #dfe5ef;border-radius:12px;color:#3d4a63;cursor:pointer}
.chip:hover{background:#e4e9f2}
.right{position:relative;background:linear-gradient(160deg,#16255c 0%,#0d1738 100%);color:#fff;padding:56px 48px;overflow:hidden}
.right h2{font-size:22px;line-height:1.5;margin-bottom:16px}
.right p{font-size:14.5px;color:#c2cae3;line-height:1.9}
.tile{position:absolute;width:86px;height:86px;border-radius:22px;display:flex;align-items:center;justify-content:center;font-size:42px;box-shadow:0 14px 30px rgba(0,0,0,.35)}
.t1{background:linear-gradient(135deg,#4f7cf7,#2b4fd8);right:150px;bottom:200px;transform:rotate(-9deg)}
.t2{background:linear-gradient(135deg,#8b5cf6,#5b3fd6);right:280px;bottom:120px;transform:rotate(11deg)}
.t3{background:linear-gradient(135deg,#38bdf8,#2b6fe0);right:70px;bottom:90px;transform:rotate(-16deg)}
.wm{position:absolute;right:16px;bottom:-14px;font-size:104px;font-weight:800;letter-spacing:4px;color:rgba(255,255,255,.055);user-select:none}
.copy{margin-top:18px;font-size:12.5px;color:#9aa3b5}
@media(max-width:880px){.panel{grid-template-columns:1fr}.right{display:none}.wrap{max-width:440px}.left{padding:40px 32px}}
</style></head>
<body><div class="wrap">
  <div class="logo">Office<b>BR<i>I</i>DGE</b></div>
  <div class="panel">
    <div class="left">
      <h1>로그인 <span class="co">${company}</span></h1>
      <form method="POST" action="/_ob/login">
        <input type="hidden" name="next" value="${next}">
        <label>ID</label>
        <input type="email" name="email" placeholder="name@demo.co.kr" required autofocus>
        <label>비밀번호</label>
        <input type="password" name="password" placeholder="••••••••••" required>
        <div class="find"><a href="#" onclick="alert('데모 환경에서는 지원하지 않습니다.');return false">비밀번호 찾기</a></div>
        ${errorMsg ? `<div class="error">${errorMsg}</div>` : ''}
        <button type="submit" class="submit">로그인</button>
      </form>
      <div class="demo">데모 계정 ${accountChips} <span>· 비밀번호 demo1234</span></div>
    </div>
    <div class="right">
      <h2>연결은 자유롭게,<br>보안은 엄격하게</h2>
      <p>VPN 없이 브라우저 하나로 만나는 사내 시스템.<br>
      모든 접속은 오피스브릿지가 검증하고 기록합니다.<br>
      어디서 일하든, 회사와 안전하게 이어지세요.</p>
      <div class="tile t1">🌉</div>
      <div class="tile t2">🛡️</div>
      <div class="tile t3">🔑</div>
      <div class="wm">BRIDGE</div>
    </div>
  </div>
  <div class="copy">Copyright 2026 © JIRANSOFT All rights reserved.</div>
</div>
<script>function fill(e){document.querySelector('[name=email]').value=e;document.querySelector('[name=password]').focus();}</script>
</body></html>`;
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
      if (blocked.has(email)) {
        audit.record({
          type: 'LOGIN', decision: 'FAIL',
          email, ip: audit.clientIp(req), reason: '관리자에 의해 차단된 계정',
        });
        res.writeHead(401, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(loginPage(next, '차단된 계정입니다. 관리자에게 문의하세요.'));
      }
      const user = getUsers()[email];
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      if (!user || user.passwordHash !== hash) {
        audit.record({
          type: 'LOGIN', decision: 'FAIL',
          email, ip: audit.clientIp(req),
          reason: user ? '비밀번호 불일치' : '존재하지 않는 계정',
        });
        res.writeHead(401, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(loginPage(next, '이메일 또는 비밀번호가 올바르지 않습니다.'));
      }
      const sid = crypto.randomUUID();
      sessions.set(sid, { email, name: user.name, createdAt: Date.now() });
      audit.record({
        type: 'LOGIN', decision: 'OK',
        email, name: user.name, ip: audit.clientIp(req), reason: '비밀번호 인증 성공',
      });
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
      audit.record({
        type: 'LOGOUT', decision: 'OK',
        email: session.email, name: session.name, ip: audit.clientIp(req),
      });
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

module.exports = { getSession, handleAuthRoutes, sessions, blocked };
