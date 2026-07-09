// 관리자 콘솔 (F-6) — 좌측 메뉴 + 서브 URL 구조
//   /_ob/admin/dashboard        대시보드 (현황 타일 + 실시간 로그)
//   /_ob/admin/policy/apps      정책 설정 > 사내시스템 등록
//   /_ob/admin/policy/access    정책 설정 > 정책 접근관리 (부서/개인)
//   /_ob/admin/policy/sessions  정책 설정 > 활성세션 · 계정통제
//   /_ob/admin/logs/system      로그 조회 > 시스템 접속로그 (허용/차단 필터)
//   /_ob/admin/logs/admin       로그 조회 > 관리자 로그

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

// ── 메뉴 정의 ─────────────────────────────────────────────
const MENU = [
  { type: 'item', page: '/dashboard', label: '대시보드' },
  { type: 'sec', label: '정책 설정' },
  { type: 'item', page: '/policy/apps', label: '사내시스템 등록' },
  { type: 'item', page: '/policy/access', label: '정책 접근관리' },
  { type: 'item', page: '/policy/sessions', label: '활성세션 · 계정통제' },
  { type: 'sec', label: '로그 조회' },
  { type: 'item', page: '/logs/system', label: '시스템 접속로그' },
  { type: 'item', page: '/logs/admin', label: '관리자 로그' },
];

function menuHtml(page) {
  return MENU.map((m) =>
    m.type === 'sec'
      ? `<div class="m-sec">${m.label}</div>`
      : `<a href="/_ob/admin${m.page}" class="${m.page === page ? 'on' : ''}">${m.label}</a>`
  ).join('');
}

// ── 공통 셸 (헤더 + 사이드바 + 콘텐츠) ─────────────────────
function shell(company, page, title, content, script, useSSE) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OfficeBridge 관제 — ${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif;background:#eef1f6;color:#14224e;min-height:100vh}
header{display:flex;align-items:center;gap:12px;padding:13px 22px;background:#fff;border-bottom:1px solid #dfe5ef}
.logo{font-size:18px;color:#14224e;letter-spacing:-.3px}
.logo b{font-weight:800}
.logo b i{font-style:normal;color:#9aa3b5}
.hd{font-size:13px;color:#3d4a63;font-weight:600}
header .live{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:12px;color:#8a93a6}
.dot{width:8px;height:8px;border-radius:50%;background:#c3cad9}
.dot.on{background:#1e8e5a}
.corp{display:flex;flex-direction:column;gap:3px;margin-left:18px}
.corp .r{display:flex;align-items:center;gap:7px;font-size:13px}
.corp .r svg{flex:none}
.corp .r b{font-weight:700;color:#14224e}
.corp .r span{color:#3d4a63}
.layout{display:flex;align-items:stretch}
aside{width:212px;flex:none;background:#fff;border-right:1px solid #dfe5ef;padding:16px 0;min-height:calc(100vh - 55px)}
.m-title{font-size:11px;color:#a8b0c2;padding:2px 20px 10px;letter-spacing:1px}
.m-sec{font-size:11.5px;font-weight:700;color:#3d4a63;padding:16px 20px 6px;margin-top:8px;border-top:1px solid #eef1f6}
aside a{display:block;padding:9px 20px;font-size:13.5px;color:#3d4a63;text-decoration:none;border-left:3px solid transparent}
aside a:hover{background:#f5f7fb}
aside a.on{color:#14224e;font-weight:700;border-left-color:#14224e;background:#f0f3fa}
.content{flex:1;padding:22px;max-width:1080px;min-width:0}
h1.page{font-size:19px;margin-bottom:16px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}
.tile{background:#fff;border:1px solid #dfe5ef;border-radius:10px;padding:14px 18px}
.tile .k{font-size:12px;color:#8a93a6;margin-bottom:6px}
.tile .v{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;color:#14224e}
.tile .v.green{color:#1e8e5a}.tile .v.red{color:#c0392b}.tile .v.amber{color:#b7791f}
.card{background:#fff;border:1px solid #dfe5ef;border-radius:10px;overflow:hidden}
.card+.card{margin-top:12px}
.card h2{font-size:13px;color:#3d4a63;padding:12px 16px;border-bottom:1px solid #eef1f6;font-weight:700}
.empty{padding:18px;font-size:12px;color:#a8b0c2;text-align:center}
.hint{font-size:11px;color:#a8b0c2;padding:6px 16px 10px}
#log{max-height:620px;overflow-y:auto}
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
.b-admin{background:#f3ecfd;color:#6d3fd6;border:1px solid #ddc9f5}
.b-etc{background:#f1f4f9;color:#8a93a6;border:1px solid #dfe5ef}
tr.fresh{animation:flash 1.2s ease-out}
@keyframes flash{from{background:#dbe6fb}to{background:transparent}}
.filters{display:flex;gap:7px;margin-bottom:12px;flex-wrap:wrap}
.f{font-size:12.5px;padding:6px 15px;border-radius:16px;border:1px solid #d6dbe6;background:#fff;color:#3d4a63;cursor:pointer}
.f:hover{background:#f5f7fb}
.f.on{background:#14224e;border-color:#14224e;color:#fff;font-weight:600}
.sess{padding:8px}
.sess-item{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:8px}
.sess-item:hover{background:#f5f7fb}
.sess-item .who{flex:1;min-width:0}
.sess-item .who b{font-size:13px;display:block}
.sess-item .who span{font-size:11px;color:#8a93a6;display:block;overflow:hidden;text-overflow:ellipsis}
.sess-item button{font-size:11px;padding:5px 9px;border-radius:7px;border:1px solid #d6dbe6;background:#fff;color:#3d4a63;cursor:pointer;white-space:nowrap}
.sess-item button:hover{border-color:#c0392b;color:#c0392b}
.sess-item button.unblock:hover{border-color:#1e8e5a;color:#1e8e5a}
.blocked-tag{font-size:10px;color:#c0392b;border:1px solid #f5c1c1;background:#fdecec;border-radius:6px;padding:1px 6px}
.pol{padding:10px}
.pol-user{padding:9px 10px}
.pol-user b{font-size:13px;display:block;margin-bottom:7px}
.pol-user b small{font-weight:400;color:#8a93a6}
.pol-chips{display:flex;flex-wrap:wrap;gap:6px}
.pol-chip{font-size:11.5px;padding:4px 11px;border-radius:14px;cursor:pointer;border:1px solid #d6dbe6;color:#a8b0c2;background:#fff;user-select:none}
.pol-chip.on{border-color:#8fd3b2;color:#1e8e5a;background:#e9f7f0}
.pol-chip.inh{border-color:#c5d4f5;color:#2b4fd8;background:#e9effc;cursor:default}
.pol-chip:not(.inh):hover{filter:brightness(.96)}
.apps{padding:8px}
.app-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px}
.app-item:hover{background:#f5f7fb}
.app-item .ic{font-size:18px}
.app-item .info{flex:1;min-width:0}
.app-item .info b{font-size:13px;display:block}
.app-item .info span{font-size:11px;color:#8a93a6;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.app-item button{font-size:11px;padding:5px 9px;border-radius:7px;border:1px solid #d6dbe6;background:#fff;color:#3d4a63;cursor:pointer}
.app-item button:hover{border-color:#c0392b;color:#c0392b}
.app-form{padding:12px 14px;border-top:1px solid #eef1f6;display:grid;grid-template-columns:1fr 1fr;gap:7px}
.app-form input{padding:9px 10px;background:#fff;border:1px solid #d6dbe6;border-radius:8px;color:#14224e;font-size:12.5px}
.app-form input:focus{outline:none;border-color:#14224e}
.app-form .full{grid-column:1/-1}
.app-form button{grid-column:1/-1;padding:10px;background:#14224e;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
.app-form button:hover{background:#1d2f66}
.app-err{grid-column:1/-1;font-size:11px;color:#c0392b;display:none}
.narrow{max-width:640px}
</style></head>
<body>
<header><span class="logo">Office<b>BR<i>I</i>DGE</b></span><span class="hd">관제 콘솔</span>
<span class="live"${useSSE ? '' : ' style="visibility:hidden"'}><span class="dot" id="dot"></span><span id="live-label">연결 중…</span></span>
<div class="corp">
  <div class="r">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2b4fd8" stroke-width="2" stroke-linecap="round"><path d="M3 21h18"/><path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16"/><path d="M15 9h4a1 1 0 0 1 1 1v11"/><path d="M8 8h2M8 12h2M8 16h2"/></svg>
    <b>${company}</b>
  </div>
  <div class="r">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2b4fd8" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>
    <span>관리자</span>
  </div>
</div></header>
<div class="layout">
  <aside><div class="m-title">서비스 메뉴</div>${menuHtml(page)}</aside>
  <div class="content">
    <h1 class="page">${title}</h1>
    ${content}
  </div>
</div>
<script>
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function badge(e) {
  if (e.type === 'ACCESS' && e.decision === 'ALLOW') return '<span class="badge b-allow">허용</span>';
  if (e.type === 'ACCESS' && e.decision === 'DENY')  return '<span class="badge b-deny">차단</span>';
  if (e.type === 'LOGIN' && e.decision === 'OK')     return '<span class="badge b-login">로그인</span>';
  if (e.type === 'LOGIN' && e.decision === 'FAIL')   return '<span class="badge b-fail">로그인 실패</span>';
  if (e.type === 'LOGOUT')                           return '<span class="badge b-etc">로그아웃</span>';
  if (e.type === 'ADMIN')                            return '<span class="badge b-admin">관리자 조치</span>';
  if (e.type === 'SYSTEM')                           return '<span class="badge b-fail">시스템</span>';
  return '<span class="badge b-etc">' + esc(e.type) + '</span>';
}
function hhmmss(ts){ var t=new Date(ts); return ('0'+t.getHours()).slice(-2)+':'+('0'+t.getMinutes()).slice(-2)+':'+('0'+t.getSeconds()).slice(-2); }
function logRow(e, fresh) {
  var tr = document.createElement('tr');
  if (fresh) tr.className = 'fresh';
  tr.innerHTML = '<td class="t">'+hhmmss(e.ts)+'</td><td>'+badge(e)+'</td>'
    + '<td class="who"><b>'+esc(e.name||'-')+'</b><span>'+esc(e.email||'')+'</span></td>'
    + '<td>'+esc(e.service||'')+esc(e.path||'')+'</td>'
    + '<td class="t">'+esc(e.ip||'')+'</td>'
    + '<td class="reason">'+esc(e.reason||'')+'</td>';
  return tr;
}
${script}
</script>
</body></html>`;
}

// ── 페이지: 대시보드 ───────────────────────────────────────
function dashboardPage() {
  const content = `
  <div class="tiles">
    <div class="tile"><div class="k">활성 세션</div><div class="v" id="t-sess">0</div></div>
    <div class="tile"><div class="k">접근 허용</div><div class="v green" id="t-allow">0</div></div>
    <div class="tile"><div class="k">접근 차단</div><div class="v red" id="t-deny">0</div></div>
    <div class="tile"><div class="k">로그인 실패</div><div class="v amber" id="t-fail">0</div></div>
  </div>
  <div class="card"><h2>실시간 감사 로그</h2><div id="log"><table><tbody id="rows"></tbody></table></div></div>`;
  const script = `
var counts = { allow:0, deny:0, fail:0 };
function tally(e,n){ if(e.type==='ACCESS'&&e.decision==='ALLOW')counts.allow+=n; if(e.type==='ACCESS'&&e.decision==='DENY')counts.deny+=n; if(e.type==='LOGIN'&&e.decision==='FAIL')counts.fail+=n; }
function renderTiles(){ document.getElementById('t-allow').textContent=counts.allow; document.getElementById('t-deny').textContent=counts.deny; document.getElementById('t-fail').textContent=counts.fail; }
fetch('/_ob/api/logs?n=200').then(function(r){return r.json();}).then(function(list){
  var rows=document.getElementById('rows');
  list.forEach(function(e){ tally(e,1); rows.insertBefore(logRow(e,false), rows.firstChild); });
  renderTiles();
});
var es = new EventSource('/_ob/api/stream');
es.onopen=function(){ document.getElementById('dot').className='dot on'; document.getElementById('live-label').textContent='실시간 연결됨'; };
es.onerror=function(){ document.getElementById('dot').className='dot'; document.getElementById('live-label').textContent='재연결 중…'; };
es.onmessage=function(m){
  var e=JSON.parse(m.data); tally(e,1); renderTiles();
  var rows=document.getElementById('rows');
  rows.insertBefore(logRow(e,true), rows.firstChild);
  while(rows.children.length>400) rows.removeChild(rows.lastChild);
};
function loadSess(){ fetch('/_ob/api/sessions').then(function(r){return r.json();}).then(function(d){ document.getElementById('t-sess').textContent=d.sessions.length; }); }
loadSess(); setInterval(loadSess, 3000);`;
  return { title: '대시보드', content, script, sse: true };
}

// ── 페이지: 사내시스템 등록 ────────────────────────────────
function appsPage() {
  const content = `
  <div class="card narrow">
    <h2>등록된 사내 시스템</h2>
    <div class="apps" id="apps"><div class="empty">불러오는 중…</div></div>
    <form class="app-form" onsubmit="return addApp(event)">
      <input id="a-label" placeholder="라벨 (영문: acct)" required pattern="[a-z0-9-]{2,20}">
      <input id="a-title" placeholder="이름 (회계관리)" required>
      <input id="a-url" class="full" placeholder="원본 내부 주소 (http://127.0.0.1:8084)" required>
      <div class="app-err" id="a-err"></div>
      <button>+ 시스템 등록 (포털에 즉시 반영)</button>
    </form>
  </div>
  <div class="hint">등록 즉시 임직원 포털에 표시되며, 접근 권한은 [정책 접근관리]에서 부여합니다. 삭제 시 모든 부서·개인 권한도 함께 회수됩니다.</div>`;
  const script = `
function loadApps(){
  fetch('/_ob/api/apps').then(function(r){return r.json();}).then(function(apps){
    var html='';
    Object.keys(apps).forEach(function(label){
      var a=apps[label];
      html+='<div class="app-item"><span class="ic">'+esc(a.icon||'🗂️')+'</span>'
        +'<div class="info"><b>'+esc(a.title)+' <span style="display:inline;color:#8a93a6;font-weight:400">('+esc(label)+')</span></b>'
        +'<span>'+esc(a.url||'')+'</span></div>'
        +'<button onclick="delApp(\\''+esc(label)+'\\')">삭제</button></div>';
    });
    document.getElementById('apps').innerHTML = html || '<div class="empty">등록된 시스템 없음</div>';
  });
}
function addApp(ev){
  ev.preventDefault();
  var err=document.getElementById('a-err'); err.style.display='none';
  fetch('/_ob/api/apps',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({label:document.getElementById('a-label').value,title:document.getElementById('a-title').value,url:document.getElementById('a-url').value})})
    .then(function(r){return r.json();}).then(function(d){
      if(!d.ok){ err.textContent=d.error||'등록 실패'; err.style.display='block'; return; }
      document.getElementById('a-label').value=''; document.getElementById('a-title').value=''; document.getElementById('a-url').value='';
      loadApps();
    });
  return false;
}
function delApp(label){
  if(!confirm('"'+label+'" 시스템을 삭제할까요? 모든 부서·개인 접근 권한도 함께 회수됩니다.')) return;
  fetch('/_ob/api/apps/delete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({label:label})}).then(loadApps);
}
loadApps();`;
  return { title: '정책 설정 › 사내시스템 등록', content, script, sse: false };
}

// ── 페이지: 정책 접근관리 (조직도 기반) ─────────────────────
function accessPage() {
  const content = `
  <div class="card narrow">
    <h2>조직(부서) 정책</h2>
    <div class="pol" id="dept-pol"><div class="empty">불러오는 중…</div></div>
    <div class="hint">부서에 권한을 부여하면 소속 임직원 전원에게 적용됩니다. 칩 클릭 = 부여/회수, 즉시 반영.</div>
  </div>
  <div class="card narrow">
    <h2>개인 추가 권한</h2>
    <div class="pol" id="user-pol"><div class="empty">불러오는 중…</div></div>
    <div class="hint">부서 정책 외에 개인에게 추가로 부여하는 권한입니다. 파란 칩 = 부서 정책으로 이미 부여됨(부서에서 관리), 초록 칩 = 개인 부여.</div>
  </div>`;
  const script = `
function loadPolicy(){
  fetch('/_ob/api/policy').then(function(r){return r.json();}).then(function(d){
    var html='';
    Object.keys(d.depts).forEach(function(k){
      var dept=d.depts[k];
      var members=Object.keys(d.users).filter(function(em){return d.users[em].dept===k;}).length;
      html+='<div class="pol-user"><b>'+esc(dept.name)+' <small>· 인원 '+members+'명</small></b><div class="pol-chips">';
      d.services.forEach(function(app){
        var on=dept.apps.indexOf(app)>=0;
        html+='<span class="pol-chip'+(on?' on':'')+'" onclick="setDept(\\''+esc(k)+'\\',\\''+esc(app)+'\\','+(!on)+')">'+(on?'✓ ':'')+esc(app)+'</span>';
      });
      html+='</div></div>';
    });
    document.getElementById('dept-pol').innerHTML = html || '<div class="empty">부서 없음</div>';

    var uhtml='';
    Object.keys(d.users).forEach(function(email){
      var u=d.users[email];
      var dept=d.depts[u.dept]||{name:'-',apps:[]};
      uhtml+='<div class="pol-user"><b>'+esc(u.name)+' <small>· '+esc(dept.name)+' · '+esc(email)+'</small></b><div class="pol-chips">';
      d.services.forEach(function(app){
        var inherited=dept.apps.indexOf(app)>=0;
        var personal=u.apps.indexOf(app)>=0;
        if(inherited){
          uhtml+='<span class="pol-chip inh" title="부서 정책으로 부여됨 — 부서 정책에서 관리">'+esc(app)+' · 부서</span>';
        } else {
          uhtml+='<span class="pol-chip'+(personal?' on':'')+'" onclick="setUser(\\''+esc(email)+'\\',\\''+esc(app)+'\\','+(!personal)+')">'+(personal?'✓ ':'')+esc(app)+'</span>';
        }
      });
      uhtml+='</div></div>';
    });
    document.getElementById('user-pol').innerHTML = uhtml || '<div class="empty">사용자 없음</div>';
  });
}
function setDept(dept, app, allow){
  fetch('/_ob/api/dept-policy',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({dept:dept,app:app,allow:allow})}).then(loadPolicy);
}
function setUser(email, app, allow){
  fetch('/_ob/api/policy',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email,app:app,allow:allow})}).then(loadPolicy);
}
loadPolicy();
setInterval(loadPolicy, 5000);`;
  return { title: '정책 설정 › 정책 접근관리', content, script, sse: false };
}

// ── 페이지: 활성세션 · 계정통제 ─────────────────────────────
function sessionsPage() {
  const content = `
  <div class="card narrow">
    <h2>활성 세션 · 계정 통제</h2>
    <div class="sess" id="sess"><div class="empty">불러오는 중…</div></div>
    <div class="hint">[세션 종료] = 즉시 로그아웃 (재로그인은 가능) · [계정 차단] = 전 세션 폐기 + 재로그인 거부</div>
  </div>`;
  const script = `
function fmtDur(ms){ var m=Math.floor(ms/60000); return m<1?'방금':(m<60? m+'분':Math.floor(m/60)+'시간 '+(m%60)+'분'); }
function loadSessions(){
  fetch('/_ob/api/sessions').then(function(r){return r.json();}).then(function(d){
    var box=document.getElementById('sess');
    if(!d.sessions.length && !d.blocked.length){ box.innerHTML='<div class="empty">활성 세션 없음</div>'; return; }
    var html='';
    d.sessions.forEach(function(s){
      html+='<div class="sess-item"><div class="who"><b>'+esc(s.name)+'</b><span>'+esc(s.email)+' · '+fmtDur(Date.now()-s.createdAt)+' 전 로그인</span></div>'
        +'<button onclick="kill(\\''+s.sid+'\\')">세션 종료</button>'
        +'<button onclick="block(\\''+esc(s.email)+'\\',true)">계정 차단</button></div>';
    });
    d.blocked.forEach(function(email){
      html+='<div class="sess-item"><div class="who"><b>'+esc(email)+'</b><span class="blocked-tag">로그인 차단됨</span></div>'
        +'<button class="unblock" onclick="block(\\''+esc(email)+'\\',false)">차단 해제</button></div>';
    });
    box.innerHTML=html;
  });
}
function kill(sid){ fetch('/_ob/api/kill',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sid:sid})}).then(loadSessions); }
function block(email,on){ fetch('/_ob/api/block',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email,block:on})}).then(loadSessions); }
loadSessions();
setInterval(loadSessions, 3000);`;
  return { title: '정책 설정 › 활성세션 · 계정통제', content, script, sse: false };
}

// ── 페이지: 시스템 접속로그 (허용/차단 필터) ─────────────────
function systemLogsPage() {
  const content = `
  <div class="filters">
    <button class="f on" data-f="all" onclick="setFilter('all',this)">전체</button>
    <button class="f" data-f="allow" onclick="setFilter('allow',this)">허용</button>
    <button class="f" data-f="deny" onclick="setFilter('deny',this)">차단</button>
    <button class="f" data-f="login" onclick="setFilter('login',this)">로그인</button>
    <button class="f" data-f="fail" onclick="setFilter('fail',this)">로그인 실패</button>
    <button class="f" data-f="system" onclick="setFilter('system',this)">시스템</button>
  </div>
  <div class="card"><h2>시스템 접속로그 <span id="cnt" style="font-weight:400;color:#8a93a6"></span></h2>
  <div id="log"><table><tbody id="rows"></tbody></table></div></div>`;
  const script = `
var all=[]; var cur='all';
var FILTERS={
  all: function(e){ return e.type!=='ADMIN'; },
  allow: function(e){ return e.type==='ACCESS'&&e.decision==='ALLOW'; },
  deny: function(e){ return e.type==='ACCESS'&&e.decision==='DENY'; },
  login: function(e){ return e.type==='LOGIN'&&e.decision==='OK'; },
  fail: function(e){ return e.type==='LOGIN'&&e.decision==='FAIL'; },
  system: function(e){ return e.type==='SYSTEM'; }
};
function render(){
  var rows=document.getElementById('rows'); rows.innerHTML='';
  var list=all.filter(FILTERS[cur]);
  document.getElementById('cnt').textContent='· '+list.length+'건';
  list.slice(-400).forEach(function(e){ rows.insertBefore(logRow(e,false), rows.firstChild); });
}
function setFilter(f, btn){
  cur=f;
  document.querySelectorAll('.f').forEach(function(b){ b.className='f'; });
  btn.className='f on';
  render();
}
fetch('/_ob/api/logs?n=500').then(function(r){return r.json();}).then(function(list){ all=list; render(); });
var es=new EventSource('/_ob/api/stream');
es.onopen=function(){ document.getElementById('dot').className='dot on'; document.getElementById('live-label').textContent='실시간 연결됨'; };
es.onerror=function(){ document.getElementById('dot').className='dot'; document.getElementById('live-label').textContent='재연결 중…'; };
es.onmessage=function(m){
  var e=JSON.parse(m.data); all.push(e);
  if(FILTERS[cur](e)){
    var rows=document.getElementById('rows');
    rows.insertBefore(logRow(e,true), rows.firstChild);
    document.getElementById('cnt').textContent='· '+all.filter(FILTERS[cur]).length+'건';
  }
};`;
  return { title: '로그 조회 › 시스템 접속로그', content, script, sse: true };
}

// ── 페이지: 관리자 로그 ────────────────────────────────────
function adminLogsPage() {
  const content = `
  <div class="card"><h2>관리자 조치 이력 <span id="cnt" style="font-weight:400;color:#8a93a6"></span></h2>
  <div id="log"><table><tbody id="rows"></tbody></table></div></div>
  <div class="hint">정책 변경(부서/개인/시스템 등록·삭제), 세션 강제 종료, 계정 차단·해제 등 관리자의 모든 조치가 기록됩니다.</div>`;
  const script = `
var total=0;
function addRow(e, fresh){
  var rows=document.getElementById('rows');
  var tr=document.createElement('tr');
  if(fresh) tr.className='fresh';
  tr.innerHTML='<td class="t">'+hhmmss(e.ts)+'</td><td><span class="badge b-admin">관리자 조치</span></td>'
    +'<td class="who"><b>'+esc(e.email||e.service||'-')+'</b></td>'
    +'<td class="reason">'+esc(e.reason||'')+'</td>'
    +'<td class="t">'+esc(e.ip||'')+'</td>';
  rows.insertBefore(tr, rows.firstChild);
  total++;
  document.getElementById('cnt').textContent='· '+total+'건';
}
fetch('/_ob/api/logs?type=ADMIN&n=300').then(function(r){return r.json();}).then(function(list){ list.forEach(function(e){ addRow(e,false); }); });
var es=new EventSource('/_ob/api/stream');
es.onopen=function(){ document.getElementById('dot').className='dot on'; document.getElementById('live-label').textContent='실시간 연결됨'; };
es.onerror=function(){ document.getElementById('dot').className='dot'; document.getElementById('live-label').textContent='재연결 중…'; };
es.onmessage=function(m){ var e=JSON.parse(m.data); if(e.type==='ADMIN') addRow(e,true); };`;
  return { title: '로그 조회 › 관리자 로그', content, script, sse: true };
}

// ── 라우팅 ────────────────────────────────────────────────
const PAGES = {
  '/dashboard': dashboardPage,
  '/policy/apps': appsPage,
  '/policy/access': accessPage,
  '/policy/sessions': sessionsPage,
  '/logs/system': systemLogsPage,
  '/logs/admin': adminLogsPage,
};

function adminPage(company, page) {
  const builder = PAGES[page];
  if (!builder) return null; // 서버가 /dashboard로 리다이렉트
  const { title, content, script, sse } = builder();
  return shell(company, page, title, content, script, sse);
}

module.exports = { adminPage, tokenPromptPage };
