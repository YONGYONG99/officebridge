// OfficeBridge 릴레이 서버
// - 게이트웨이 프록시: 호스트명 첫 라벨로 서비스 판별 (groupware.localhost → "groupware")
// - 터널 매니저: 커넥터의 아웃바운드 WSS 연결(/tunnel)을 유지하고 HTTP 요청/응답을 중계
//
// 요청 처리 순서: /_ob/* 내부 경로 → 인증(F-2) → 정책(F-3) → 터널 전달(F-1)
const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { getSession, handleAuthRoutes, sessions, blocked } = require('./auth');
const { getUsers, getAppMeta, isAllowed, setAccess, setApp, removeApp, deniedPage } = require('./policy');
const { portalPage } = require('./portal');
const audit = require('./audit');
const { adminPage, tokenPromptPage } = require('./admin');

const PORT = process.env.RELAY_PORT || 8080;
const CONNECTOR_TOKEN = process.env.CONNECTOR_TOKEN || 'dev-token';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-token';
const REQUEST_TIMEOUT_MS = 15000;

// ── 터널 상태 ──────────────────────────────────────────────
// 연결된 커넥터들 (단일 테넌트 MVP: 아무 커넥터나 사용)
// 앱→내부주소 매핑은 릴레이(policy.json의 apps[].url)가 관리하고,
// 매 요청에 목적지(target)를 실어 보낸다 → 대시보드 등록 즉시 반영, 커넥터 재시작 불필요
const connectors = new Set();
// requestId → { res, timer }  (터널 응답 대기 중인 사용자 요청)
const pending = new Map();

// ── 에러 화면 ──────────────────────────────────────────────
function errorPage(status, title, detail) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>OfficeBridge</title>
<style>body{font-family:-apple-system,"Malgun Gothic",sans-serif;background:#111827;color:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{text-align:center;max-width:420px;padding:40px}
.logo{font-size:14px;letter-spacing:2px;color:#60a5fa;margin-bottom:24px}
h1{font-size:48px;margin:0 0 8px}p{color:#9ca3af;font-size:15px;line-height:1.6}</style></head>
<body><div class="card"><div class="logo">🌉 OFFICEBRIDGE</div><h1>${status}</h1><p><strong>${title}</strong></p><p>${detail}</p></div></body></html>`;
}

function sendError(res, status, title, detail) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  res.end(errorPage(status, title, detail));
}

// ── 관리자 대시보드 + 관리 API (F-6) ───────────────────────
function isAdminReq(req, url) {
  if (url.searchParams.get('token') === ADMIN_TOKEN) return true;
  const cookies = req.headers.cookie || '';
  return cookies.split(';').some((c) => c.trim() === `ob_admin=${ADMIN_TOKEN}`);
}

function readJsonBody(req, cb) {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    try {
      cb(JSON.parse(Buffer.concat(chunks).toString() || '{}'));
    } catch {
      cb({});
    }
  });
}

// /_ob/admin, /_ob/api/* 처리. 처리했으면 true 반환
function handleAdminRoutes(req, res, url) {
  const p = url.pathname;
  if (p !== '/_ob/admin' && !p.startsWith('/_ob/api/')) return false;

  if (!isAdminReq(req, url)) {
    if (p === '/_ob/admin') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(tokenPromptPage());
    } else {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end('{"error":"unauthorized"}');
    }
    return true;
  }

  // 대시보드 페이지 (?token= 접속 시 쿠키 발급 → 이후 SSE/API는 쿠키로 인증)
  if (p === '/_ob/admin') {
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'set-cookie': `ob_admin=${ADMIN_TOKEN}; Path=/; HttpOnly`,
    });
    res.end(adminPage());
    return true;
  }

  // 감사 로그 조회
  if (p === '/_ob/api/logs') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(audit.recent(Number(url.searchParams.get('n')) || 200)));
    return true;
  }

  // 감사 로그 실시간 스트림 (SSE)
  if (p === '/_ob/api/stream') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    res.write('retry: 2000\n\n');
    const unsubscribe = audit.subscribe((e) => res.write(`data: ${JSON.stringify(e)}\n\n`));
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => {
      unsubscribe();
      clearInterval(heartbeat);
    });
    return true;
  }

  // 사내 시스템 목록 조회
  if (p === '/_ob/api/apps' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(getAppMeta()));
    return true;
  }

  // 사내 시스템 등록 (라벨 + 원본 내부 주소 → 포털·라우팅에 즉시 반영)
  if (p === '/_ob/api/apps' && req.method === 'POST') {
    readJsonBody(req, (body) => {
      const label = (body.label || '').trim().toLowerCase();
      const url = (body.url || '').trim();
      const valid =
        /^[a-z0-9-]{2,20}$/.test(label) &&
        !['portal', 'admin', 'www'].includes(label) &&
        /^https?:\/\/.+/.test(url);
      if (!valid) {
        res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ok: false, error: '라벨(영문 소문자·숫자·하이픈 2~20자, portal/admin 제외)과 URL(http://...)을 확인하세요.' }));
      }
      setApp(label, {
        title: (body.title || '').trim() || label,
        icon: (body.icon || '').trim() || '🗂️',
        desc: (body.desc || '').trim() || '',
        url,
      });
      audit.record({
        type: 'ADMIN', decision: 'OK', service: label,
        ip: audit.clientIp(req), reason: `관리자가 사내 시스템 등록 (${label} → ${url})`,
      });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
    });
    return true;
  }

  // 사내 시스템 삭제
  if (p === '/_ob/api/apps/delete' && req.method === 'POST') {
    readJsonBody(req, (body) => {
      const ok = removeApp((body.label || '').trim());
      if (ok)
        audit.record({
          type: 'ADMIN', decision: 'OK', service: body.label,
          ip: audit.clientIp(req), reason: `관리자가 사내 시스템 삭제 (${body.label})`,
        });
      res.writeHead(ok ? 200 : 400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok }));
    });
    return true;
  }

  // 접근 정책 조회 (사용자별 허용 앱 + 전체 서비스 목록)
  if (p === '/_ob/api/policy' && req.method === 'GET') {
    const users = {};
    for (const [email, u] of Object.entries(getUsers())) {
      users[email] = { name: u.name, apps: u.apps }; // passwordHash 노출 금지
    }
    const services = new Set(Object.keys(getAppMeta()));
    for (const u of Object.values(users)) u.apps.forEach((a) => services.add(a));
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ users, services: [...services].sort() }));
    return true;
  }

  // 접근 정책 변경 (권한 부여/회수 → policy.json 저장, 즉시 반영)
  if (p === '/_ob/api/policy' && req.method === 'POST') {
    readJsonBody(req, (body) => {
      const { email, app, allow } = body;
      const ok = setAccess(email, app, !!allow);
      if (ok)
        audit.record({
          type: 'ADMIN', decision: 'OK', email, service: app,
          ip: audit.clientIp(req),
          reason: `관리자가 접근 권한 ${allow ? '부여' : '회수'} (${app})`,
        });
      res.writeHead(ok ? 200 : 400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok }));
    });
    return true;
  }

  // 활성 세션 + 차단 계정 목록
  if (p === '/_ob/api/sessions') {
    const list = [...sessions.entries()].map(([sid, s]) => ({ sid, ...s }));
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ sessions: list, blocked: [...blocked] }));
    return true;
  }

  // 세션 즉시 종료
  if (p === '/_ob/api/kill' && req.method === 'POST') {
    readJsonBody(req, (body) => {
      const victim = sessions.get(body.sid);
      sessions.delete(body.sid);
      audit.record({
        type: 'ADMIN', decision: 'OK',
        email: victim?.email, name: victim?.name,
        ip: audit.clientIp(req), reason: '관리자가 세션을 강제 종료',
      });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
    });
    return true;
  }

  // 계정 차단/해제 (차단 시 해당 계정의 모든 세션 즉시 폐기 + 재로그인 거부)
  if (p === '/_ob/api/block' && req.method === 'POST') {
    readJsonBody(req, (body) => {
      const { email, block } = body;
      if (block) {
        blocked.add(email);
        let killed = 0;
        for (const [sid, s] of sessions) {
          if (s.email === email) {
            sessions.delete(sid);
            killed++;
          }
        }
        audit.record({
          type: 'ADMIN', decision: 'OK', email,
          ip: audit.clientIp(req), reason: `관리자가 계정 차단 (세션 ${killed}개 폐기)`,
        });
      } else {
        blocked.delete(email);
        audit.record({
          type: 'ADMIN', decision: 'OK', email,
          ip: audit.clientIp(req), reason: '관리자가 계정 차단 해제',
        });
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
    });
    return true;
  }

  return false;
}

// ── 게이트웨이 프록시 ──────────────────────────────────────
function handleGatewayRequest(req, res) {
  // 0) 게이트웨이 내부 경로 (로그인/로그아웃/관리자)
  if (req.url.startsWith('/_ob/')) {
    const url = new URL(req.url, 'http://gateway');
    if (handleAdminRoutes(req, res, url)) return;
    if (handleAuthRoutes(req, res)) return;
    return sendError(res, 404, '알 수 없는 경로', '요청한 페이지를 찾을 수 없습니다.');
  }

  const host = (req.headers.host || '').split(':')[0];
  const service = host.split('.')[0];
  const isNoise = req.url === '/favicon.ico'; // 감사 로그 오염 방지

  // 1) 인증 (F-2) — 미인증이면 로그인 화면으로
  const session = getSession(req);
  if (!session) {
    res.writeHead(302, { location: `/_ob/login?next=${encodeURIComponent(req.url)}` });
    return res.end();
  }

  // 1.5) 앱 포털 — 로그인한 사용자에게 허가된 앱만 타일로 노출 (SaaS 대표 진입점)
  if (service === 'portal') {
    const user = getUsers()[session.email];
    if (!isNoise)
      audit.record({
        type: 'ACCESS', decision: 'ALLOW',
        email: session.email, name: session.name,
        service: 'portal', path: req.url, method: req.method,
        ip: audit.clientIp(req), reason: '포털 접속',
      });
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(portalPage(session, user ? user.apps : [], getAppMeta(), req.headers.host));
  }

  // 2) 정책 판정 (F-3) — 허가되지 않은 앱은 차단
  if (!isAllowed(session.email, service)) {
    if (!isNoise)
      audit.record({
        type: 'ACCESS', decision: 'DENY',
        email: session.email, name: session.name,
        service, path: req.url, method: req.method,
        ip: audit.clientIp(req), reason: '접근 정책 없음',
      });
    res.writeHead(403, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(deniedPage(session, service));
  }
  if (!isNoise)
    audit.record({
      type: 'ACCESS', decision: 'ALLOW',
      email: session.email, name: session.name,
      service, path: req.url, method: req.method,
      ip: audit.clientIp(req), reason: '정적 정책 일치',
    });

  // 3) 터널 전달 (F-1) — 릴레이가 관리하는 매핑에서 내부 주소를 찾아 실어 보냄
  const app = getAppMeta()[service];
  if (!app || !app.url) {
    return sendError(res, 404, '등록되지 않은 서비스', '관리자 대시보드에서 사내 시스템을 먼저 등록하세요.');
  }
  const connector = connectors.values().next().value;
  if (!connector) {
    audit.record({
      type: 'SYSTEM', decision: 'FAIL',
      email: session.email, name: session.name,
      service, path: req.url, ip: audit.clientIp(req),
      reason: '커넥터 터널 미연결 (503)',
    });
    return sendError(res, 503, '연결할 수 없는 서비스입니다',
      '고객사 커넥터가 현재 릴레이에 연결되어 있지 않습니다.');
  }

  const id = crypto.randomUUID();
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const headers = { ...req.headers };
    delete headers.connection;

    const timer = setTimeout(() => {
      pending.delete(id);
      sendError(res, 504, '응답 시간 초과', '사내 시스템이 제한 시간 내에 응답하지 않았습니다.');
    }, REQUEST_TIMEOUT_MS);

    pending.set(id, { res, timer });
    connector.send(
      JSON.stringify({
        type: 'request',
        id,
        service,
        target: app.url,
        method: req.method,
        path: req.url,
        headers,
        body: Buffer.concat(chunks).toString('base64'),
      })
    );
    console.log(`[gateway] ${req.method} ${service}${req.url} → 터널 전달 (${app.url})`);
  });
}

// ── 터널 매니저 (커넥터 ↔ 릴레이) ─────────────────────────
const server = http.createServer(handleGatewayRequest);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://relay');
  if (url.pathname !== '/tunnel') return socket.destroy();
  if (url.searchParams.get('token') !== CONNECTOR_TOKEN) {
    console.log('[tunnel] 잘못된 토큰으로 연결 시도 → 거부');
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    return socket.destroy();
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

wss.on('connection', (ws) => {
  const connectorId = crypto.randomUUID().slice(0, 8);
  connectors.add(ws);
  console.log(`[tunnel] 커넥터 연결됨 (${connectorId}) — 활성 커넥터 ${connectors.size}개`);

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    if (msg.type === 'register') {
      console.log(`[tunnel] 커넥터 등록 확인 (${connectorId})`);
      return;
    }

    if (msg.type === 'response') {
      const waiting = pending.get(msg.id);
      if (!waiting) return; // 이미 타임아웃 처리됨
      pending.delete(msg.id);
      clearTimeout(waiting.timer);

      const headers = { ...msg.headers };
      // 커넥터의 fetch가 압축을 이미 해제했고, 길이도 재계산되므로 원본 전송 관련 헤더 제거
      delete headers['content-encoding'];
      delete headers['content-length'];
      delete headers['transfer-encoding'];
      delete headers.connection;

      const body = Buffer.from(msg.body || '', 'base64');
      waiting.res.writeHead(msg.status, headers);
      waiting.res.end(body);
    }
  });

  ws.on('close', () => {
    connectors.delete(ws);
    console.log(`[tunnel] 커넥터 연결 끊김 (${connectorId}) — 활성 커넥터 ${connectors.size}개`);
  });
});

// 터널 생존 확인 (죽은 연결 정리)
setInterval(() => {
  for (const client of wss.clients) client.ping();
}, 30000);

server.listen(PORT, () => {
  console.log(`
🌉 OfficeBridge 릴레이 서버 시작
   게이트웨이:  http://<서비스명>.localhost:${PORT}
   터널 접속점: ws://localhost:${PORT}/tunnel
`);
});
