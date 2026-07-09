// 관리자 대시보드 (F-6)
// 단일 HTML — 실시간 감사 로그(SSE) + 활성 세션 + 즉시 차단.
// 접근: /_ob/admin?token=<ADMIN_TOKEN> (최초 1회, 이후 쿠키)

function tokenPromptPage() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OfficeBridge 관제</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif;background:#eef1f6;color:#14224e;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{width:340px;padding:36px;background:#fff;border:1px solid #dfe5ef;border-radius:14px;box-shadow:0 10px 30px rgba(20,34,78,.1)}
.logo{font-size:20px;text-align:center;margin-bottom:4px}
.logo b{font-weight:800}
.logo b i{font-style:normal;color:#9aa3b5}
.sub{font-size:12.5px;color:#8a93a6;text-align:center;margin-bottom:20px}
input{width:100%;padding:12px 14px;background:#fff;border:1px solid #d6dbe6;border-radius:8px;color:#14224e;font-size:14px;margin-bottom:12px}
input:focus{outline:none;border-color:#14224e}
button{width:100%;padding:12px;background:#14224e;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer}
button:hover{background:#1d2f66}</style></head>
<body><div class="card"><div class="logo">Office<b>BR<i>I</i>DGE</b></div><div class="sub">관제 대시보드 — 관리자 인증</div>
<form method="GET" action="/_ob/admin"><input type="password" name="token" placeholder="관리자 토큰" autofocus><button>접속</button></form>
</div></body></html>`;
}

function adminPage(company) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OfficeBridge 관제 대시보드</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif;background:#eef1f6;color:#14224e;min-height:100vh}
header{display:flex;align-items:center;gap:12px;padding:14px 22px;background:#fff;border-bottom:1px solid #dfe5ef}
.logo{font-size:18px;color:#14224e;letter-spacing:-.3px}
.logo b{font-weight:800}
.logo b i{font-style:normal;color:#9aa3b5}
.hd{font-size:13px;color:#3d4a63;font-weight:600}
.co{font-size:12px;font-weight:700;padding:3px 11px;background:#eef1f6;border:1px solid #dfe5ef;border-radius:8px;letter-spacing:1px}
header .live{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:12px;color:#8a93a6}
.dot{width:8px;height:8px;border-radius:50%;background:#c3cad9}
.dot.on{background:#1e8e5a}
main{max-width:1200px;margin:20px auto;padding:0 16px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}
.tile{background:#fff;border:1px solid #dfe5ef;border-radius:10px;padding:14px 18px}
.tile .k{font-size:12px;color:#8a93a6;margin-bottom:6px}
.tile .v{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;color:#14224e}
.tile .v.green{color:#1e8e5a}.tile .v.red{color:#c0392b}.tile .v.amber{color:#b7791f}
.grid{display:grid;grid-template-columns:340px 1fr;gap:12px;align-items:start}
@media(max-width:900px){.grid{grid-template-columns:1fr}}
.left-col{display:flex;flex-direction:column;gap:12px}
.card{background:#fff;border:1px solid #dfe5ef;border-radius:10px;overflow:hidden}
.card h2{font-size:13px;color:#3d4a63;padding:12px 16px;border-bottom:1px solid #eef1f6;font-weight:700}
.sess{padding:8px}
.sess-item{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:8px}
.sess-item:hover{background:#f5f7fb}
.sess-item .who{flex:1;min-width:0}
.sess-item .who b{font-size:13px;display:block}
.sess-item .who span{font-size:11px;color:#8a93a6;display:block;overflow:hidden;text-overflow:ellipsis}
.sess-item button{font-size:11px;padding:5px 9px;border-radius:7px;border:1px solid #d6dbe6;background:#fff;color:#3d4a63;cursor:pointer;white-space:nowrap}
.sess-item button:hover{border-color:#c0392b;color:#c0392b}
.sess-item button.unblock:hover{border-color:#1e8e5a;color:#1e8e5a}
.empty{padding:18px;font-size:12px;color:#a8b0c2;text-align:center}
.blocked-tag{font-size:10px;color:#c0392b;border:1px solid #f5c1c1;background:#fdecec;border-radius:6px;padding:1px 6px}
.pol{padding:10px}
.pol-user{padding:8px 10px}
.pol-user b{font-size:13px;display:block;margin-bottom:6px}
.pol-chips{display:flex;flex-wrap:wrap;gap:6px}
.pol-chip{font-size:11.5px;padding:4px 11px;border-radius:14px;cursor:pointer;border:1px solid #d6dbe6;color:#a8b0c2;background:#fff;user-select:none}
.pol-chip.on{border-color:#8fd3b2;color:#1e8e5a;background:#e9f7f0}
.pol-chip:hover{filter:brightness(.96)}
.pol-hint{font-size:10.5px;color:#a8b0c2;padding:4px 10px 6px}
.apps{padding:8px}
.app-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px}
.app-item:hover{background:#f5f7fb}
.app-item .ic{font-size:18px}
.app-item .info{flex:1;min-width:0}
.app-item .info b{font-size:13px;display:block}
.app-item .info span{font-size:11px;color:#8a93a6;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.app-item button{font-size:11px;padding:5px 9px;border-radius:7px;border:1px solid #d6dbe6;background:#fff;color:#3d4a63;cursor:pointer}
.app-item button:hover{border-color:#c0392b;color:#c0392b}
.app-form{padding:10px 12px;border-top:1px solid #eef1f6;display:grid;grid-template-columns:1fr 1fr;gap:7px}
.app-form input{padding:8px 10px;background:#fff;border:1px solid #d6dbe6;border-radius:8px;color:#14224e;font-size:12px}
.app-form input:focus{outline:none;border-color:#14224e}
.app-form .full{grid-column:1/-1}
.app-form button{grid-column:1/-1;padding:9px;background:#14224e;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
.app-form button:hover{background:#1d2f66}
.app-err{grid-column:1/-1;font-size:11px;color:#c0392b;display:none}
#log{max-height:640px;overflow-y:auto}
table{width:100%;border-collapse:collapse;font-size:12.5px}
td{padding:7px 10px;border-bottom:1px solid #f1f4f9;vertical-align:top}
td.t{color:#8a93a6;white-space:nowrap;font-variant-numeric:tabular-nums}
td.who b{display:block}td.who span{color:#8a93a6;font-size:11px}
td.reason{color:#8a93a6}
.badge{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:9px;white-space:nowrap}
.b-allow{background:#e9f7f0;color:#1e8e5a;border:1px solid #bfe6d2}
.b-deny{background:#fdecec;color:#c0392b;border:1px solid #f5c1c1}
.b-login{background:#e9effc;color:#2b4fd8;border:1px solid #c5d4f5}
.b-fail{background:#fdf3e2;color:#b7791f;border:1px solid #f0dcb2}
.b-etc{background:#f1f4f9;color:#8a93a6;border:1px solid #dfe5ef}
tr.fresh{animation:flash 1.2s ease-out}
@keyframes flash{from{background:#dbe6fb}to{background:transparent}}
</style></head>
<body>
<header><span class="logo">Office<b>BR<i>I</i>DGE</b></span><span class="hd">관제 대시보드</span><span class="co">${company}</span>
<span class="live"><span class="dot" id="dot"></span><span id="live-label">연결 중…</span></span></header>
<main>
  <div class="tiles">
    <div class="tile"><div class="k">활성 세션</div><div class="v" id="t-sess">0</div></div>
    <div class="tile"><div class="k">접근 허용</div><div class="v green" id="t-allow">0</div></div>
    <div class="tile"><div class="k">접근 차단</div><div class="v red" id="t-deny">0</div></div>
    <div class="tile"><div class="k">로그인 실패</div><div class="v amber" id="t-fail">0</div></div>
  </div>
  <div class="grid">
    <div class="left-col">
      <div class="card">
        <h2>활성 세션 · 계정 통제</h2>
        <div class="sess" id="sess"><div class="empty">불러오는 중…</div></div>
      </div>
      <div class="card">
        <h2>접근 정책 관리</h2>
        <div class="pol" id="pol"><div class="empty">불러오는 중…</div></div>
        <div class="pol-hint">칩 클릭 = 권한 부여/회수 · 즉시 반영 (재로그인 불필요)</div>
      </div>
      <div class="card">
        <h2>사내 시스템 등록</h2>
        <div class="apps" id="apps"><div class="empty">불러오는 중…</div></div>
        <form class="app-form" onsubmit="return addApp(event)">
          <input id="a-label" placeholder="라벨 (영문: acct)" required pattern="[a-z0-9-]{2,20}">
          <input id="a-title" placeholder="이름 (회계관리)" required>
          <input id="a-url" class="full" placeholder="원본 내부 주소 (http://127.0.0.1:8084)" required>
          <div class="app-err" id="a-err"></div>
          <button>+ 시스템 등록 (포털에 즉시 반영)</button>
        </form>
      </div>
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

// 접근 정책 관리
function loadPolicy() {
  fetch('/_ob/api/policy').then(function(r){return r.json();}).then(function(d){
    var html = '';
    Object.keys(d.users).forEach(function(email){
      var u = d.users[email];
      html += '<div class="pol-user"><b>'+esc(u.name)+' <span style="color:#6b7280;font-weight:400">'+esc(email)+'</span></b><div class="pol-chips">';
      d.services.forEach(function(app){
        var on = u.apps.indexOf(app) >= 0;
        html += '<span class="pol-chip'+(on?' on':'')+'" onclick="setPolicy(\\''+esc(email)+'\\',\\''+esc(app)+'\\','+(!on)+')">'
          + (on?'✓ ':'')+esc(app)+'</span>';
      });
      html += '</div></div>';
    });
    document.getElementById('pol').innerHTML = html || '<div class="empty">사용자 없음</div>';
  });
}
function setPolicy(email, app, allow) {
  fetch('/_ob/api/policy', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email,app:app,allow:allow})}).then(loadPolicy);
}
loadPolicy();
setInterval(loadPolicy, 5000);

// 사내 시스템 등록/삭제
function loadApps() {
  fetch('/_ob/api/apps').then(function(r){return r.json();}).then(function(apps){
    var html = '';
    Object.keys(apps).forEach(function(label){
      var a = apps[label];
      html += '<div class="app-item"><span class="ic">'+esc(a.icon||'🗂️')+'</span>'
        + '<div class="info"><b>'+esc(a.title)+' <span style="display:inline;color:#6b7280;font-weight:400">('+esc(label)+')</span></b>'
        + '<span>'+esc(a.url||'')+'</span></div>'
        + '<button onclick="delApp(\\''+esc(label)+'\\')">삭제</button></div>';
    });
    document.getElementById('apps').innerHTML = html || '<div class="empty">등록된 시스템 없음</div>';
  });
}
function addApp(ev) {
  ev.preventDefault();
  var err = document.getElementById('a-err');
  err.style.display = 'none';
  fetch('/_ob/api/apps', {method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({label:document.getElementById('a-label').value, title:document.getElementById('a-title').value, url:document.getElementById('a-url').value})})
    .then(function(r){return r.json();}).then(function(d){
      if (!d.ok) { err.textContent = d.error || '등록 실패'; err.style.display = 'block'; return; }
      document.getElementById('a-label').value=''; document.getElementById('a-title').value=''; document.getElementById('a-url').value='';
      loadApps(); loadPolicy();
    });
  return false;
}
function delApp(label) {
  if (!confirm('"'+label+'" 시스템을 삭제할까요? 모든 사용자의 접근 권한도 함께 제거됩니다.')) return;
  fetch('/_ob/api/apps/delete', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({label:label})})
    .then(function(){ loadApps(); loadPolicy(); });
}
loadApps();
setInterval(loadApps, 5000);
</script>
</body></html>`;
}

module.exports = { adminPage, tokenPromptPage };
