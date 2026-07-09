// 행위 기반 접근제어 룰셋 (F-4: Continuous Verification)
// 벤더(OfficeBridge)가 제공·관리하는 룰셋 — 고객사 관리자는 ON/OFF만 선택.
// 인증된 세션이라도 매 요청마다 재검증한다 ("로그인은 시작일 뿐").
const RULES = [
  {
    id: 'office-hours',
    title: '업무시간 외 접속 차단',
    desc: '허용 시간 외의 사내 시스템 접속을 차단합니다. 심야·새벽의 비정상 접속을 원천 차단합니다.',
    param: '허용 07:00 – 20:00',
    action: '차단',
    default: false,
  },
  {
    id: 'rate-limit',
    title: '과도한 요청 차단',
    desc: '짧은 시간에 비정상적으로 많은 요청을 보내는 세션을 차단합니다. 크롤링·자동화 도구·대량 유출 시도를 탐지합니다.',
    param: '10초 내 30회 초과',
    action: '차단',
    default: true,
  },
  {
    id: 'ip-pinning',
    title: '세션 IP 고정',
    desc: '로그인한 IP와 다른 IP에서 세션이 사용되면 즉시 세션을 종료합니다. 세션 쿠키 탈취(하이재킹) 공격을 무력화합니다.',
    param: '로그인 시점 IP 기준',
    action: '세션 종료',
    default: true,
  },
  {
    id: 'login-lockout',
    title: '로그인 연속 실패 잠금',
    desc: '비밀번호를 연속으로 틀리면 계정을 자동 잠급니다(무차별 대입 방지). 관리자가 [활성세션·계정통제]에서 해제할 때까지 로그인이 거부됩니다.',
    param: '10분 내 5회 실패',
    action: '계정 잠금',
    default: true,
  },
  {
    id: 'session-ttl',
    title: '세션 최대 수명 제한',
    desc: '로그인 후 일정 시간이 지나면 세션을 만료시키고 재인증을 요구합니다. 영구 세션으로 인한 위험을 제거합니다.',
    param: '8시간',
    action: '재인증',
    default: false,
  },
  {
    id: 'device-posture',
    title: '엔드포인트 보안 점수 기반 접근 제어',
    desc: '사용자 PC에 설치된 DLP(OfficeKeeper 등)가 산출한 보안 점수·취약점 점검 결과를 확인해, 기준 미달 단말의 접속을 차단합니다. 백신 미설치·미조치 취약점이 있는 기기의 사내 접근을 원천 차단합니다.',
    param: '보안 점수 80점 이상',
    action: '차단',
    default: false,
    uiOnly: true, // UI 노출만 — 서버 검증 미구현(엔드포인트 연동 예정)
  },
];

// ── 상태 추적 ─────────────────────────────────────────────
const requestLog = new Map(); // sid → [timestamps] (rate-limit)
const loginFails = new Map(); // email → [timestamps] (login-lockout)

const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 30;
const FAIL_WINDOW_MS = 10 * 60_000;
const FAIL_MAX = 5;
const SESSION_TTL_MS = 8 * 60 * 60_000;
const HOUR_FROM = 7;
const HOUR_TO = 20;

// 매 요청 검증. 위반 시 { id, title, detail, kill } 반환, 통과 시 null
function checkRequest(ctx, flags) {
  const { session, ip } = ctx;

  if (flags['ip-pinning'] && session.ip && ip && session.ip !== ip) {
    return {
      id: 'ip-pinning', title: '세션 IP 고정', kill: true,
      detail: `로그인 IP(${session.ip})와 다른 IP(${ip})에서 세션 사용 감지 — 세션 탈취 의심`,
    };
  }

  if (flags['session-ttl'] && Date.now() - session.createdAt > SESSION_TTL_MS) {
    return {
      id: 'session-ttl', title: '세션 최대 수명 제한', kill: true,
      detail: '세션 수명(8시간) 초과 — 재인증 필요',
    };
  }

  if (flags['office-hours']) {
    const h = new Date().getHours();
    if (h < HOUR_FROM || h >= HOUR_TO) {
      return {
        id: 'office-hours', title: '업무시간 외 접속 차단', kill: false,
        detail: `현재 시각(${String(h).padStart(2, '0')}시)은 허용 시간(07:00–20:00) 밖입니다`,
      };
    }
  }

  if (flags['rate-limit']) {
    const now = Date.now();
    const log = (requestLog.get(session.sid) || []).filter((t) => now - t < RATE_WINDOW_MS);
    log.push(now);
    requestLog.set(session.sid, log);
    if (log.length > RATE_MAX) {
      return {
        id: 'rate-limit', title: '과도한 요청 차단', kill: false,
        detail: `10초 내 ${log.length}회 요청 — 자동화 도구/대량 조회 의심`,
      };
    }
  }

  return null;
}

// 로그인 실패 기록. 잠금 기준 도달 시 true
function recordLoginFail(email) {
  const now = Date.now();
  const fails = (loginFails.get(email) || []).filter((t) => now - t < FAIL_WINDOW_MS);
  fails.push(now);
  loginFails.set(email, fails);
  return fails.length >= FAIL_MAX;
}

function clearLoginFails(email) {
  loginFails.delete(email);
}

module.exports = { RULES, checkRequest, recordLoginFail, clearLoginFails };
