// OfficeBridge 커넥터 에이전트
// 고객사 사내망에서 실행. 릴레이로 아웃바운드 WSS 연결을 걸어 유지하고(방화벽 인바운드 개방 불필요),
// 터널로 내려온 HTTP 요청을 사내 시스템에 전달한 뒤 응답을 되돌려 보낸다.
const WebSocket = require('ws');
const services = require('./services.json');

const RELAY_URL = process.env.RELAY_URL || 'ws://localhost:8080/tunnel';
const TOKEN = process.env.CONNECTOR_TOKEN || 'dev-token';
const RECONNECT_MS = 3000;

// 사내 시스템으로 전달하면 안 되는 hop-by-hop 헤더
const STRIP_REQ_HEADERS = ['host', 'connection', 'upgrade', 'keep-alive', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding'];

async function handleRequest(ws, msg) {
  const base = services[msg.service];
  if (!base) {
    return sendResponse(ws, msg.id, 502, `등록되지 않은 서비스: ${msg.service}`);
  }

  const headers = { ...msg.headers };
  for (const h of STRIP_REQ_HEADERS) delete headers[h];

  try {
    const resp = await fetch(base + msg.path, {
      method: msg.method,
      headers,
      body: ['GET', 'HEAD'].includes(msg.method) ? undefined : Buffer.from(msg.body || '', 'base64'),
      redirect: 'manual', // 리다이렉트는 브라우저가 처리하도록 그대로 통과
    });

    const respHeaders = {};
    resp.headers.forEach((v, k) => (respHeaders[k] = v));
    const body = Buffer.from(await resp.arrayBuffer()).toString('base64');

    ws.send(JSON.stringify({ type: 'response', id: msg.id, status: resp.status, headers: respHeaders, body }));
    console.log(`[connector] ${msg.method} ${msg.service}${msg.path} → ${resp.status}`);
  } catch (err) {
    console.error(`[connector] 사내 시스템 요청 실패 (${msg.service}): ${err.message}`);
    sendResponse(ws, msg.id, 502, `사내 시스템에 연결할 수 없습니다 (${msg.service})`);
  }
}

function sendResponse(ws, id, status, text) {
  ws.send(
    JSON.stringify({
      type: 'response',
      id,
      status,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
      body: Buffer.from(text).toString('base64'),
    })
  );
}

function connect() {
  console.log(`[connector] 릴레이 연결 시도: ${RELAY_URL}`);
  const ws = new WebSocket(`${RELAY_URL}?token=${encodeURIComponent(TOKEN)}`);

  ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'register', services: Object.keys(services) }));
    console.log(`[connector] ✅ 터널 수립 완료 — 서비스: ${Object.keys(services).join(', ')}`);
    console.log('[connector]    (아웃바운드 연결이므로 방화벽 인바운드 개방 없음)');
  });

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    if (msg.type === 'request') handleRequest(ws, msg);
  });

  ws.on('close', () => {
    console.log(`[connector] 터널 끊김 — ${RECONNECT_MS / 1000}초 후 재연결`);
    setTimeout(connect, RECONNECT_MS);
  });

  ws.on('error', (err) => {
    console.error(`[connector] 연결 오류: ${err.message}`);
  });
}

connect();
