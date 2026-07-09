// 감사 로그 (F-5)
// - 메모리 링버퍼: 최근 1,000건 (대시보드 조회용)
// - 파일 영속화: relay/audit.log에 JSONL 추가 (증적 보존)
// - 구독: F-6 대시보드의 실시간 스트림(SSE)이 subscribe()로 연결
const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, 'audit.log');
const MAX_MEMORY = 1000;

const events = [];
const listeners = new Set();
let seq = 0;

// ev: { type, decision, email, name, service, path, method, ip, reason, riskScore }
// type: LOGIN | LOGOUT | ACCESS | SYSTEM
// decision: ALLOW | DENY | OK | FAIL
function record(ev) {
  const e = { id: ++seq, ts: new Date().toISOString(), ...ev };
  events.push(e);
  if (events.length > MAX_MEMORY) events.shift();
  fs.appendFile(LOG_PATH, JSON.stringify(e) + '\n', () => {});
  for (const fn of listeners) {
    try {
      fn(e);
    } catch {}
  }
  const who = e.email || '-';
  console.log(`[audit] ${e.type}/${e.decision} ${who} ${e.service || ''}${e.path || ''} ${e.reason || ''}`);
  return e;
}

function recent(n = 200, type) {
  const src = type ? events.filter((e) => e.type === type) : events;
  return src.slice(-n);
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? fwd.split(',')[0].trim() : req.socket.remoteAddress) || '-';
}

module.exports = { record, recent, subscribe, clientIp };
