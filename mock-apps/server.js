// 데모용 고객사(AMD) 사내 시스템 목업 — 로그인 화면만 제공
//   8081 ERP (K-System Ace 풍)
//   8082 GitLab (JiranSoft GitLab 풍)
//   8083 그룹웨어 (Groupware Pro 풍)
//   8084 회계관리 (초기 미등록 — 대시보드 라이브 등록 시연용)
// 127.0.0.1에만 바인딩 — 외부에서 직접 접근 불가, 오직 커넥터를 통해서만 접근 가능해야 함
const http = require('http');

const DEMO_JS = `<script>document.querySelectorAll('form').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();alert('데모 화면입니다 — 사내 시스템 도달이 확인되었습니다.');});});</script>`;

// ── 8081 ERP: K-System Ace 풍 ─────────────────────────────
function erpPage() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>K-System Ace</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif;min-height:100vh;display:flex}
.left{width:46%;min-width:400px;background:#fff;display:flex;flex-direction:column;justify-content:center;padding:60px 70px;position:relative}
.logo{display:flex;align-items:center;gap:14px;margin-bottom:70px}
.logo .txt{font-size:34px;color:#1b4d3e;font-weight:700;letter-spacing:-1px}
.logo .txt i{font-style:italic;color:#3fa142;font-weight:800}
.inp{display:flex;align-items:center;gap:12px;border:2px solid #555;border-radius:32px;padding:15px 24px;margin-bottom:18px}
.inp svg{flex:none;opacity:.55}
.inp input{border:none;outline:none;font-size:15.5px;width:100%;color:#333}
.inp input::placeholder{color:#999}
.remember{display:flex;align-items:center;gap:8px;font-size:14px;color:#444;margin:2px 0 30px 6px}
.btn{width:100%;padding:17px;border:none;border-radius:32px;font-size:16px;letter-spacing:6px;font-weight:600;cursor:pointer;margin-bottom:14px}
.btn.green{background:#4caf6d;color:#fff}
.btn.green:hover{background:#3f9c5f}
.btn.gray{background:#595959;color:#fff;letter-spacing:0}
.foot{position:absolute;bottom:26px;left:70px;right:70px;display:flex;align-items:center;font-size:13px;color:#5a7d5a}
.foot .mid{margin-left:auto;color:#666}
.right{flex:1;background:linear-gradient(135deg,#fdfdfd 0%,#eceff1 55%,#e2e6e9 100%);position:relative;overflow:hidden}
.cube{position:absolute;background:#fff;border:1px solid #e3e7ea;box-shadow:0 6px 18px rgba(0,0,0,.05)}
.g{background:#67c05e;border:none}
.sales{position:absolute;right:70px;bottom:60px;font-size:44px;letter-spacing:8px;color:#c9ced3;font-weight:300}
.tag{position:absolute;top:90px;right:60px;font-size:14px;color:#b9bfc6}
@media(max-width:820px){.right{display:none}.left{width:100%}}
</style></head>
<body>
<div class="left">
  <div class="logo">
    <svg width="52" height="52" viewBox="0 0 52 52"><polygon points="6,10 30,4 22,26" fill="#1b4d3e"/><polygon points="30,4 46,14 22,26" fill="#3fa142"/><polygon points="6,10 22,26 10,42" fill="#7cb342"/><polygon points="22,26 46,14 34,44" fill="#c5e06a"/></svg>
    <span class="txt">K-System <i>Ace</i></span>
  </div>
  <form>
    <div class="inp">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="m2 7 10 6 10-6"/></svg>
      <input placeholder="아이디">
    </div>
    <div class="inp">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.8"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.4" fill="#555"/></svg>
      <input type="password" placeholder="비밀번호">
    </div>
    <label class="remember"><input type="checkbox"> 로그인 정보 기억하기</label>
    <button class="btn green">L O G I N</button>
    <button type="button" class="btn gray">비밀번호 재설정</button>
  </form>
  <div class="foot"><span>🌲 영림원소프트랩</span><span class="mid">🌐 한국어 ⌃ &nbsp;|&nbsp; 관리자 모드</span></div>
</div>
<div class="right">
  <div class="cube" style="width:120px;height:120px;top:40px;right:180px;transform:rotate(8deg)"></div>
  <div class="cube" style="width:80px;height:80px;top:150px;right:80px;transform:rotate(-6deg)"></div>
  <div class="cube" style="width:60px;height:60px;top:280px;right:260px;transform:rotate(14deg)"></div>
  <div class="cube" style="width:150px;height:150px;top:340px;right:60px;transform:rotate(-4deg);opacity:.7"></div>
  <div class="cube g" style="width:22px;height:22px;bottom:150px;right:340px;transform:rotate(20deg)"></div>
  <div class="cube g" style="width:14px;height:14px;bottom:90px;right:120px;transform:rotate(-12deg)"></div>
  <div class="tag">human resources</div>
  <div class="sales">SALES</div>
</div>
${DEMO_JS}
</body></html>`;
}

// ── 8082 GitLab: JiranSoft GitLab 풍 ──────────────────────
function gitlabPage() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>JiranSoft GitLab</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif;background:#fff;min-height:100vh;display:flex;align-items:flex-start;justify-content:center;padding-top:70px}
.box{width:440px}
.fox{text-align:center;margin-bottom:14px}
h1{font-size:22px;text-align:center;margin-bottom:30px;color:#28272d}
.tabs{display:flex;border-bottom:1px solid #dcdcde;margin-bottom:26px}
.tab{flex:1;text-align:center;padding:12px 0;font-size:15px;font-weight:600;color:#28272d;cursor:pointer}
.tab.on{color:#1f75cb;border-bottom:2px solid #1f75cb}
.tab.off{color:#535158;font-weight:400}
label{display:block;font-size:14.5px;font-weight:700;color:#28272d;margin:16px 0 8px}
.field{position:relative}
input[type=text],input[type=password]{width:100%;padding:11px 13px;border:1px solid #89888d;border-radius:6px;font-size:15px}
input:focus{outline:2px solid #1f75cb;border-color:#1f75cb}
.eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);opacity:.6}
.save{display:flex;align-items:center;gap:8px;font-size:14.5px;color:#28272d;margin:16px 0 20px}
button{width:100%;padding:12px;background:#1f75cb;color:#fff;border:none;border-radius:6px;font-size:15px;font-weight:600;cursor:pointer}
button:hover{background:#1a63ac}
</style></head>
<body>
<div class="box">
  <div class="fox">
    <svg width="70" height="66" viewBox="0 0 100 92">
      <polygon points="50,88 21,32 37,32" fill="#e24329"/>
      <polygon points="50,88 79,32 63,32" fill="#e24329"/>
      <polygon points="37,32 63,32 50,88" fill="#fc6d26"/>
      <polygon points="21,32 28,6 37,32" fill="#fca326"/>
      <polygon points="79,32 72,6 63,32" fill="#fca326"/>
      <polygon points="21,32 8,58 50,88" fill="#fc6d26" opacity=".85"/>
      <polygon points="79,32 92,58 50,88" fill="#fc6d26" opacity=".85"/>
    </svg>
  </div>
  <h1>JiranSoft GitLab</h1>
  <div class="tabs"><div class="tab on">Jiran AD</div><div class="tab off">표준</div></div>
  <form>
    <label>사용자명</label>
    <div class="field"><input type="text"></div>
    <label>패스워드</label>
    <div class="field"><input type="password">
      <svg class="eye" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
    </div>
    <label class="save" style="font-weight:400"><input type="checkbox"> 계정 정보 저장</label>
    <button>로그인</button>
  </form>
</div>
${DEMO_JS}
</body></html>`;
}

// ── 8083 그룹웨어: Groupware Pro 풍 ────────────────────────
function groupwarePage() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Groupware Pro</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif;background:#f4f5f7;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{width:560px;background:#fff;border-radius:18px;box-shadow:0 6px 24px rgba(0,0,0,.06);padding:64px 72px}
.logo{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:54px}
.gmark{width:58px;height:58px;background:#111;border-radius:14px;color:#fff;font-size:36px;font-weight:800;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif}
.lt{font-size:24px;font-weight:800;color:#111;line-height:1.15;letter-spacing:.5px}
label{display:block;font-size:16px;font-weight:600;color:#111;margin:20px 0 10px}
input{width:100%;padding:14px 16px;border:1px solid #d9dce1;border-radius:8px;font-size:15px}
input::placeholder{color:#b4b9c1}
input:focus{outline:none;border-color:#111}
.login{width:100%;margin-top:34px;padding:15px;background:#1c2434;color:#fff;border:none;border-radius:8px;font-size:15.5px;font-weight:600;cursor:pointer}
.login:hover{background:#111827}
.sso{width:100%;margin-top:14px;padding:13px;background:#fff;border:1.5px solid #6b7280;border-radius:8px;font-size:15px;font-weight:600;color:#111;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px}
.sso:hover{background:#f7f8f9}
.xmark{width:22px;height:22px;background:#1c2434;border-radius:5px;color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center}
.find{text-align:center;margin-top:40px;font-size:14.5px;color:#111}
.find a{font-weight:700;color:#111}
</style></head>
<body>
<div class="card">
  <div class="logo"><div class="gmark">G</div><div class="lt">GROUPWARE<br>PRO</div></div>
  <form>
    <label>Email</label>
    <input type="email" placeholder="Email 주소를 입력해주세요.">
    <label>비밀번호</label>
    <input type="password" placeholder="비밀번호를 입력해주세요.">
    <button class="login">로그인하기</button>
    <button type="button" class="sso">
      <svg width="19" height="19" viewBox="0 0 24 24"><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6z"/><path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.4 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.6 14.7a6.9 6.9 0 0 1 0-4.4v-3H1.8a11.5 11.5 0 0 0 0 10.4l3.8-3z"/><path fill="#EA4335" d="M12 4.6c1.7 0 3.2.6 4.4 1.7L19.6 3A11.5 11.5 0 0 0 1.8 7.3l3.8 3c.9-2.7 3.4-4.7 6.4-4.7z"/></svg>
      Google로 로그인하기
    </button>
    <button type="button" class="sso"><span class="xmark">X</span> Officenext로 로그인하기</button>
  </form>
  <div class="find">비밀번호를 잊으셨나요? <a href="#">비밀번호 찾기</a></div>
</div>
${DEMO_JS}
</body></html>`;
}

// ── 8084 회계관리 (미등록 — 라이브 등록 시연용) ─────────────
function acctPage() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>회계관리</title>
<style>*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif;background:#f3edff;min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{width:400px;background:#fff;border-radius:14px;box-shadow:0 8px 26px rgba(80,40,180,.12);padding:48px 44px;text-align:center}
h1{font-size:21px;color:#4c1d95;margin-bottom:6px}
.sub{font-size:13px;color:#8b7ab8;margin-bottom:30px}
input{width:100%;padding:12px 14px;border:1px solid #ddd3f5;border-radius:8px;font-size:14px;margin-bottom:12px}
input:focus{outline:none;border-color:#7c3aed}
button{width:100%;padding:13px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;margin-top:8px}
button:hover{background:#6d31d8}</style></head>
<body><div class="card">
  <h1>💰 AMD 회계관리</h1>
  <div class="sub">Accounting Management System</div>
  <form><input placeholder="사번"><input type="password" placeholder="비밀번호"><button>로그인</button></form>
</div>
${DEMO_JS}
</body></html>`;
}

const APPS = [
  { port: 8081, name: 'ERP (K-System Ace)', page: erpPage },
  { port: 8082, name: 'GitLab', page: gitlabPage },
  { port: 8083, name: '그룹웨어 (Groupware Pro)', page: groupwarePage },
  { port: 8084, name: '회계관리 (미등록·시연용)', page: acctPage },
];

for (const app of APPS) {
  http
    .createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(app.page());
    })
    .listen(app.port, '127.0.0.1', () => {
      console.log(`[mock] ${app.name} → http://127.0.0.1:${app.port} (내부망 전용)`);
    });
}
