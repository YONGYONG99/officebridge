// 정책 엔진 (F-3: 정적 룰)
// policy.json의 사용자↔앱 매핑으로 접근 허용 여부 판정.
// 추후 F-4(AI 위험도 평가)를 이 판정 뒤에 2차 관문으로 추가.
const fs = require('fs');
const path = require('path');

const POLICY_PATH = path.join(__dirname, 'policy.json');

let policy = { users: {} };
function loadPolicy() {
  policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf-8'));
  console.log(`[policy] 정책 로드: 사용자 ${Object.keys(policy.users).length}명`);
}
loadPolicy();
// 파일 수정 시 자동 반영 (데모 중 정책 즉시 변경 시연 가능)
fs.watchFile(POLICY_PATH, { interval: 1000 }, () => {
  try {
    loadPolicy();
  } catch (e) {
    console.error(`[policy] 정책 파일 파싱 실패: ${e.message}`);
  }
});

function getUsers() {
  return policy.users;
}

function isAllowed(email, service) {
  const user = policy.users[email];
  return !!user && user.apps.includes(service);
}

// 관리자 대시보드에서 권한 부여/회수 → policy.json에 즉시 저장
function setAccess(email, app, allow) {
  const user = policy.users[email];
  if (!user) return false;
  const has = user.apps.includes(app);
  if (allow && !has) user.apps.push(app);
  if (!allow && has) user.apps = user.apps.filter((a) => a !== app);
  fs.writeFileSync(POLICY_PATH, JSON.stringify(policy, null, 2));
  console.log(`[policy] 변경: ${email} ${app} → ${allow ? '허용' : '회수'}`);
  return true;
}

function deniedPage(session, service) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>OfficeBridge — 접근 거부</title>
<style>body{font-family:-apple-system,"Malgun Gothic",sans-serif;background:#111827;color:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{text-align:center;max-width:440px;padding:40px}
.logo{font-size:13px;letter-spacing:2px;color:#60a5fa;margin-bottom:24px}
.shield{font-size:56px;margin-bottom:12px}
h1{font-size:22px;margin:0 0 10px}
p{color:#9ca3af;font-size:14px;line-height:1.7}
.who{display:inline-block;margin-top:16px;padding:8px 14px;background:#1f2937;border-radius:8px;font-size:13px;color:#d1d5db}
a{color:#60a5fa;font-size:13px}</style></head>
<body><div class="card">
  <div class="logo">🌉 OFFICEBRIDGE</div>
  <div class="shield">🛡️</div>
  <h1>접근 권한이 없습니다</h1>
  <p><strong>"${service}"</strong> 시스템에 대한 접근 정책이 없어 요청이 차단되었습니다.<br>필요한 경우 관리자에게 권한을 요청하세요.</p>
  <div class="who">${session.name} · ${session.email}</div><br><br>
  <a href="/_ob/logout">다른 계정으로 로그인</a>
</div></body></html>`;
}

module.exports = { getUsers, isAllowed, setAccess, deniedPage };
