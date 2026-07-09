// 정책 엔진 (F-3: 정적 룰)
// policy.json의 사용자↔앱 매핑으로 접근 허용 여부 판정.
// 추후 F-4(AI 위험도 평가)를 이 판정 뒤에 2차 관문으로 추가.
const fs = require('fs');
const path = require('path');

const POLICY_PATH = path.join(__dirname, 'policy.json');
const DEFAULT_PATH = path.join(__dirname, 'policy.default.json');

// 런타임 정책 파일이 없거나 스키마 버전(_v)이 낮으면 기본 정책에서 (재)생성
// (policy.json은 대시보드가 수정하므로 git 추적 제외 — pull 충돌 방지)
{
  const defV = JSON.parse(fs.readFileSync(DEFAULT_PATH, 'utf-8'))._v || 0;
  let needCopy = !fs.existsSync(POLICY_PATH);
  if (!needCopy) {
    try {
      const curV = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf-8'))._v || 0;
      needCopy = curV < defV;
    } catch {
      needCopy = true;
    }
  }
  if (needCopy) {
    fs.copyFileSync(DEFAULT_PATH, POLICY_PATH);
    console.log('[policy] policy.default.json → policy.json 생성 (신규 또는 스키마 변경)');
  }
}

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

function getAppMeta() {
  return policy.apps || {};
}

// 테넌트(고객사) 정보 — 실제 제품에선 접속 도메인으로 테넌트 결정
function getCompany() {
  return policy.company || { name: '' };
}

function getDepts() {
  return policy.depts || {};
}

// 권한 = 부서 정책 ∪ 개인 추가 권한
function isAllowed(email, service) {
  const user = policy.users[email];
  if (!user) return false;
  if (user.apps.includes(service)) return true;
  const dept = (policy.depts || {})[user.dept];
  return !!dept && dept.apps.includes(service);
}

// 사용자에게 허용된 전체 앱 목록 (포털 표시용)
function allowedAppsOf(email) {
  const user = policy.users[email];
  if (!user) return [];
  const dept = (policy.depts || {})[user.dept];
  return [...new Set([...(dept ? dept.apps : []), ...user.apps])];
}

// 부서(조직) 단위 권한 부여/회수
function setDeptAccess(deptKey, app, allow) {
  const dept = (policy.depts || {})[deptKey];
  if (!dept) return false;
  const has = dept.apps.includes(app);
  if (allow && !has) dept.apps.push(app);
  if (!allow && has) dept.apps = dept.apps.filter((a) => a !== app);
  save();
  console.log(`[policy] 부서 정책 변경: ${deptKey} ${app} → ${allow ? '허용' : '회수'}`);
  return true;
}

function save() {
  fs.writeFileSync(POLICY_PATH, JSON.stringify(policy, null, 2));
}

// 관리자 대시보드에서 권한 부여/회수 → policy.json에 즉시 저장
function setAccess(email, app, allow) {
  const user = policy.users[email];
  if (!user) return false;
  const has = user.apps.includes(app);
  if (allow && !has) user.apps.push(app);
  if (!allow && has) user.apps = user.apps.filter((a) => a !== app);
  save();
  console.log(`[policy] 변경: ${email} ${app} → ${allow ? '허용' : '회수'}`);
  return true;
}

// 사내 시스템 등록/수정 (관리자 대시보드에서)
function setApp(label, meta) {
  policy.apps = policy.apps || {};
  policy.apps[label] = meta;
  save();
  console.log(`[policy] 시스템 등록: ${label} → ${meta.url}`);
}

// 사내 시스템 삭제 (전 사용자 권한에서도 제거)
function removeApp(label) {
  if (!policy.apps?.[label]) return false;
  delete policy.apps[label];
  for (const u of Object.values(policy.users)) {
    u.apps = u.apps.filter((a) => a !== label);
  }
  save();
  console.log(`[policy] 시스템 삭제: ${label}`);
  return true;
}

function deniedPage(session, service) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OfficeBridge — 접근 거부</title>
<style>*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif;background:#eef1f6;color:#14224e;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{text-align:center;max-width:460px;padding:44px 40px;background:#fff;border:1px solid #dfe5ef;border-radius:14px;box-shadow:0 10px 30px rgba(20,34,78,.1)}
.logo{font-size:19px;margin-bottom:22px}
.logo b{font-weight:800}
.logo b i{font-style:normal;color:#9aa3b5}
.shield{font-size:48px;margin-bottom:12px}
h1{font-size:20px;margin-bottom:10px}
p{color:#8a93a6;font-size:14px;line-height:1.7}
.who{display:inline-block;margin-top:16px;padding:8px 14px;background:#eef1f6;border:1px solid #dfe5ef;border-radius:8px;font-size:13px;color:#3d4a63}
a{display:inline-block;margin-top:18px;color:#14224e;font-size:13px;font-weight:600}</style></head>
<body><div class="card">
  <div class="logo">Office<b>BR<i>I</i>DGE</b></div>
  <div class="shield">🛡️</div>
  <h1>접근 권한이 없습니다</h1>
  <p><strong>"${service}"</strong> 시스템에 대한 접근 정책이 없어 요청이 차단되었습니다.<br>필요한 경우 관리자에게 권한을 요청하세요.</p>
  <div class="who">${session.name} · ${session.email}</div><br>
  <a href="/_ob/logout">다른 계정으로 로그인</a>
</div></body></html>`;
}

module.exports = {
  getUsers, getDepts, getAppMeta, getCompany,
  isAllowed, allowedAppsOf, setAccess, setDeptAccess, setApp, removeApp,
  deniedPage,
};
