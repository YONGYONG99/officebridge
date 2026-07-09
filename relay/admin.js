// 관리자 대시보드 (F-6)
// 단일 HTML — 실시간 감사 로그(SSE) + 활성 세션 + 즉시 차단.
// 접근: /_ob/admin?token=<ADMIN_TOKEN> (최초 1회, 이후 쿠키)

function tokenPromptPage() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OfficeBridge 관제</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,"Malgun Gothic",sans-serif;background:#111827;color:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{width:340px;padding:36px;background:#1f2937;border-radius:16px}
.logo{font-size:13px;letter-spacing:2px;color:#60a5fa;text-align:center;margin-bottom:18px}
input{width:100%;padding:11px 14px;background:#111827;border:1px solid #4b5563;border-radius:10px;color:#f9fafb;font-size:14px;margin-bottom:12px}
button{width:100%;padding:12px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer}</style></head>
<body><div class="card"><div class="logo">🌉 OFFICEBRIDGE 관제</div>
<form method="GET" action="/_ob/admin"><input type="password" name="token" placeholder="관리자 토큰" autofocus><button>접속</button></form>
</div></body></html>`;
}

function adminPage() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OfficeBridge 관제 대시보드</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,"Malgun Gothic",sans-serif;background:#111827;color:#f9fafb;min-height:100vh}
header{display:flex;align-items:center;gap:10px;padding:14px 22px;background:#1f2937;border-bottom:1px solid #374151}
header .logo{font-size:14px;letter-spacing:2px;color:#60a5fa;font-weight:700}
header .live{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:12px;color:#9ca3af}
.dot{width:8px;height:8px;border-radius:50%;background:#4b5563}
.dot.on{background:#34d399}
main{max-width:1200px;margin:20px auto;padding:0 16px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}
.tile{background:#1f2937;border-radius:12px;padding:16px 18px}
.tile .k{font-size:12px;color:#9ca3af;margin-bottom:6px}
.tile .v{font-size:28px;font-weight:700;font-variant-numeric:tabular-nums}
.tile .v.green{color:#34d399}.tile .v.red{color:#f87171}.tile .v.amber{color:#fbbf24}
.grid{display:grid;grid-template-columns:340px 1fr;gap:12px;align-items:start}
@media(max-width:900px){.grid{grid-template-columns:1fr}}
.card{background:#1f2937;border-radius:12px;overflow:hidden}
.card h2{font-size:13px;color:#9ca3af;padding:12px 16px;border-bottom:1px solid #374151;font-weight:600}
.sess{padding:8px}
.sess-item{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:8px}
.sess-item:hover{background:#374151}
.sess-item .who{flex:1;min-width:0}
.sess-item .who b{font-size:13px;display:block}
.sess-item .who span{font-size:11px;color:#9ca3af;display:block;overflow:hidden;text-overflow:ellipsis}
.sess-item button{font-size:11px;padding:5px 9px;border-radius:7px;border:1px solid #4b5563;background:#111827;color:#f9fafb;cursor:pointer;white-space:nowrap}
.sess-item button:hover{border-color:#f87171;color:#f87171}
.sess-item button.unblock:hover{border-color:#34d399;color:#34d399}
.empty{padding:18px;font-size:12px;color:#6b7280;text-align:center}
.blocked-tag{font-size:10px;color:#f87171;border:1px solid #f87171;border-radius:6px;padding:1px 6px}
#log{max-height:640px;overflow-y:auto}
table{width:100%;border-collapse:collapse;font-size:12.5px}
td{padding:7px 10px;border-bottom:1px solid #27303f;vertical-align:top}
td.t{color:#9ca3af;white-space:nowrap;font-variant-numeric:tabular-nums}
td.who b{display:block}td.who span{color:#9ca3af;font-size:11px}
td.reason{color:#9ca3af}
.badge{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:9px;white-space:nowrap}
.b-allow{background:#34d39922;color:#34d399;border:1px solid #34d39955}
.b-deny{background:#f8717122;color:#f87171;border:1px solid #f8717155}
.b-login{background:#60a5fa22;color:#60a5fa;border:1px solid #60a5fa55}
.b-fail{background:#fbbf2422;color:#fbbf24;border:1px solid #fbbf2455}
.b-etc{background:#9ca3af22;color:#9ca3af;border:1px solid #9ca3af55}
tr.fresh{animation:flash 1.2s ease-out}
@keyframes flash{from{background:#2563eb33}to{background:transparent}}
</style></head>
<body>
<header><span>🌉</span><span class="logo">OFFICEBRIDGE 관제 대시보드</span>
<span class="live"><span class="dot" id="dot"></span><span id="live-label">연결 중…</span></span></header>
<main>
  <div class="tiles">
    <div class="tile"><div class="k">활성 세션</div><div class="v" id="t-sess">0</div></div>
    <div class="tile"><div class="k">접근 허용</div><div class="v green" id="t-allow">0</div></div>
    <div class="tile"><div class="k">접근 차단</div><div class="v red" id="t-deny">0</div></div>
    <div class="tile"><div class="k">로그인 실패</div><div class="v amber" id="t-fail">0</div></div>
  </div>
  <div class="grid">
    <div class="card">
      <h2>활성 세션 · 계정 통제</h2>
      <div class="sess" id="sess"><div class="empty">불러오는 중…</div></div>
    </div>
    <div class="card">
      <h2>실시간 감사 로그</h2>
      <div id="log"><table><tbody id="rows"></tbody></table></div>
    </div>
  </div>
</main>
<script>
var counts = { allow: 0, deny: 0, fail: 0 };

function badge(e) {
  if (e.type === 'ACCESS' && e.decision === 'ALLOW') return '<span class="badge b-allow">허용</span>';
  if (e.type === 'ACCESS' && e.decision === 'DENY')  return '<span class="badge b-deny">차단</span>';
  if (e.type === 'LOGIN' && e.decision === 'OK')     return '<span class="badge b-login">로그인</span>';
  if (e.type === 'LOGIN' && e.decision === 'FAIL')   return '<span class="badge b-fail">로그인 실패</span>';
  if (e.type === 'ADMIN')                            return '<span class="badge b-deny">관리자 조치</span>';
  if (e.type === 'SYSTEM')                           return '<span class="badge b-fail">시스템</span>';
  return '<span class="badge b-etc">' + e.type + '</span>';
}
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function tally(e, n) {
  if (e.type === 'ACCESS' && e.decision === 'ALLOW') counts.allow += n;
  if (e.type === 'ACCESS' && e.decision === 'DENY')  counts.deny  += n;
  if (e.type === 'LOGIN' && e.decision === 'FAIL')   counts.fail  += n;
}
function renderTiles() {
  document.getElementById('t-allow').textContent = counts.allow;
  document.getElementById('t-deny').textContent  = counts.deny;
  document.getElementById('t-fail').textContent  = counts.fail;
}
function row(e, fresh) {
  var tr = document.createElement('tr');
  if (fresh) tr.className = 'fresh';
  var t = new Date(e.ts);
  var hh = ('0'+t.getHours()).slice(-2)+':'+('0'+t.getMinutes()).slice(-2)+':'+('0'+t.getSeconds()).slice(-2);
  tr.innerHTML = '<td class="t">'+hh+'</td><td>'+badge(e)+'</td>'
    + '<td class="who"><b>'+esc(e.name||'-')+'</b><span>'+esc(e.email||'')+'</span></td>'
    + '<td>'+esc(e.service||'')+esc(e.path||'')+'</td>'
    + '<td class="t">'+esc(e.ip||'')+'</td>'
    + '<td class="reason">'+esc(e.reason||'')+'</td>';
  return tr;
}
function prepend(e) {
  tally(e, 1); renderTiles();
  var rows = document.getElementById('rows');
  rows.insertBefore(row(e, true), rows.firstChild);
  while (rows.children.length > 400) rows.removeChild(rows.lastChild);
}

// 초기 로그
fetch('/_ob/api/logs?n=200').then(function(r){return r.json();}).then(function(list){
  var rows = document.getElementById('rows');
  list.forEach(function(e){ tally(e, 1); rows.insertBefore(row(e, false), rows.firstChild); });
  renderTiles();
});

// 실시간 스트림 (SSE)
var es = new EventSource('/_ob/api/stream');
es.onopen = function(){ document.getElementById('dot').className='dot on'; document.getElementById('live-label').textContent='실시간 연결됨'; };
es.onerror = function(){ document.getElementById('dot').className='dot'; document.getElementById('live-label').textContent='재연결 중…'; };
es.onmessage = function(m){ prepend(JSON.parse(m.data)); };

// 활성 세션
function fmtDur(ms){ var m=Math.floor(ms/60000); return m<1?'방금':(m<60? m+'분':Math.floor(m/60)+'시간 '+(m%60)+'분'); }
function loadSessions() {
  fetch('/_ob/api/sessions').then(function(r){return r.json();}).then(function(d){
    document.getElementById('t-sess').textContent = d.sessions.length;
    var box = document.getElementById('sess');
    if (!d.sessions.length && !d.blocked.length) { box.innerHTML = '<div class="empty">활성 세션 없음</div>'; return; }
    var html = '';
    d.sessions.forEach(function(s){
      html += '<div class="sess-item"><div class="who"><b>'+esc(s.name)+'</b><span>'+esc(s.email)+' · '+fmtDur(Date.now()-s.createdAt)+' 전 로그인</span></div>'
        + '<button onclick="kill(\\''+s.sid+'\\')">세션 종료</button>'
        + '<button onclick="block(\\''+esc(s.email)+'\\',true)">계정 차단</button></div>';
    });
    d.blocked.forEach(function(email){
      html += '<div class="sess-item"><div class="who"><b>'+esc(email)+'</b><span class="blocked-tag">로그인 차단됨</span></div>'
        + '<button class="unblock" onclick="block(\\''+esc(email)+'\\',false)">차단 해제</button></div>';
    });
    box.innerHTML = html;
  });
}
function kill(sid) {
  fetch('/_ob/api/kill', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sid:sid})}).then(loadSessions);
}
function block(email, on) {
  fetch('/_ob/api/block', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email,block:on})}).then(loadSessions);
}
loadSessions();
setInterval(loadSessions, 3000);
</script>
</body></html>`;
}

module.exports = { adminPage, tokenPromptPage };
