// OfficeBridge 릴레이 서버
// - 게이트웨이 프록시: 호스트명 첫 라벨로 서비스 판별 (groupware.localhost → "groupware")
// - 터널 매니저: 커넥터의 아웃바운드 WSS 연결(/tunnel)을 유지하고 HTTP 요청/응답을 중계
//
// F-1(터널링) 단계. 인증(F-2)/정책(F-3)은 handleGatewayRequest 앞단에 미들웨어로 끼울 예정.
const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.RELAY_PORT || 8080;
const CONNECTOR_TOKEN = process.env.CONNECTOR_TOKEN || 'dev-token';
const REQUEST_TIMEOUT_MS = 15000;

// ── 터널 상태 ──────────────────────────────────────────────
// serviceName → { ws, connectorId, connectedAt }
const tunnels = new Map();
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

// ── 게이트웨이 프록시 ──────────────────────────────────────
function handleGatewayRequest(req, res) {
  const host = (req.headers.host || '').split(':')[0];
  const service = host.split('.')[0];

  const tunnel = tunnels.get(service);
  if (!tunnel) {
    return sendError(res, 503, '연결할 수 없는 서비스입니다',
      `"${service}" 서비스의 커넥터가 현재 릴레이에 연결되어 있지 않습니다.`);
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
    tunnel.ws.send(
      JSON.stringify({
        type: 'request',
        id,
        service,
        method: req.method,
        path: req.url,
        headers,
        body: Buffer.concat(chunks).toString('base64'),
      })
    );
    console.log(`[gateway] ${req.method} ${service}${req.url} → 터널 전달 (${id.slice(0, 8)})`);
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
  let registered = [];
  console.log(`[tunnel] 커넥터 연결됨 (${connectorId})`);

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    if (msg.type === 'register') {
      registered = msg.services || [];
      for (const name of registered) {
        tunnels.set(name, { ws, connectorId, connectedAt: Date.now() });
      }
      console.log(`[tunnel] 서비스 등록 (${connectorId}): ${registered.join(', ')}`);
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
    for (const name of registered) {
      if (tunnels.get(name)?.ws === ws) tunnels.delete(name);
    }
    console.log(`[tunnel] 커넥터 연결 끊김 (${connectorId}) — 서비스 해제: ${registered.join(', ')}`);
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
