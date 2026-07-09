# OfficeBridge

**클라이언트리스 ZTNA 게이트웨이** — VPN 없이, 브라우저만으로, 인가된 사내 시스템에만 접근하게 하는 제로트러스트 게이트웨이. 데모 고객사: **AMD**.

> 상세 기획: [PRD.md](./PRD.md)

## 구조

```
relay/       릴레이 서버 (우리 IDC 역할) — 게이트웨이 프록시 + 인증 + 정책엔진(부서/개인)
             + 터널 매니저 + 감사 로그 + 임직원 포털 + 관리자 콘솔
connector/   커넥터 에이전트 (고객사 설치) — 릴레이로 아웃바운드 WSS 터널, 무설정 실행
mock-apps/   데모용 고객사 사내 시스템 — ERP / GitLab / 그룹웨어 (+미등록 회계관리)
start.sh     전체 재시작 + 자가진단 스크립트
```

## 현재 구현 상태

- ✅ **F-1 터널링** — 아웃바운드 WSS 터널(인바운드 개방 0), 자동 재연결, 라우팅 목적지는 릴레이가 매 요청에 지시(커넥터 무설정)
- ✅ **F-2 인증** — 이메일+비밀번호(SHA-256), 세션 쿠키 서브도메인 공유(SSO), 로그인 화면 브랜드 디자인
- ✅ **F-3 정책 엔진** — **조직도(부서) 정책 + 개인 추가 권한** (권한 = 부서 ∪ 개인), 즉시 반영
- ✅ **F-5 감사 로그** — 전 이벤트 구조화 기록(audit.log) + 실시간 구독(SSE) + 타입 필터 API
- ✅ **F-6 관리자 콘솔** — 사이드바 + 서브 URL: 대시보드 / 사내시스템 등록 / 정책 접근관리 / 활성세션·계정통제 / 시스템 접속로그(허용·차단 필터) / 관리자 로그
- ✅ **F-7 목업 사내 시스템** — ERP·GitLab·그룹웨어 로그인 화면 (127.0.0.1 전용 바인딩)
- ✅ **임직원 포털** — 대표 진입점, 전체 시스템 표시 + 권한 없는 앱 🔒 잠금
- ⬜ **F-4 AI 위험도 평가** (Claude API) · **발표자료**

## 데모 계정 (비밀번호 전부 `demo1234`)

부서 정책 기본값 기준 (관리자 콘솔에서 실시간 변경 가능):

| 계정 | 부서 | ERP | GitLab | 그룹웨어 |
|---|---|---|---|---|
| 김영업 kim.sales@demo.co.kr | 영업팀 | ✅ | ❌ | ✅ |
| 이개발 lee.dev@demo.co.kr | 개발팀 | ❌ | ✅ | ✅ |
| 박인사 park.hr@demo.co.kr | 인사팀 | ✅ | ❌ | ✅ |

관리자 콘솔 토큰: `admin-token` · 커넥터 토큰: `dev-token`

## 개발서버 실행

사내망 정책상 **443만 인바운드 허용** — 릴레이는 443으로 띄운다 (start.sh 기본값).

```bash
cd /data/hackertone-amd && git pull && ./start.sh
```

start.sh가 기존 프로세스 정리 → 목업/릴레이/커넥터 재시작 → 자가진단까지 수행한다.
**git pull 후에는 반드시 ./start.sh** (재시작 없이는 옛 코드가 계속 돈다).

### URL 모음 (개발서버 10.52.249.249)

**임직원 (시크릿 창 권장):**

| 용도 | URL |
|---|---|
| ⭐ 포털 (대표 진입점) | `http://portal.10.52.249.249.sslip.io:443` |
| ERP 직접 접속 | `http://erp.10.52.249.249.sslip.io:443` |
| GitLab 직접 접속 | `http://gitlab.10.52.249.249.sslip.io:443` |
| 그룹웨어 직접 접속 | `http://groupware.10.52.249.249.sslip.io:443` |
| 로그아웃 | 아무 주소 뒤 `/_ob/logout` |

**관리자 콘솔** (`admin-token`):

| 메뉴 | URL |
|---|---|
| 대시보드 | `http://portal.10.52.249.249.sslip.io:443/_ob/admin` |
| 정책 설정 › 사내시스템 등록 | `…/_ob/admin/policy/apps` |
| 정책 설정 › 정책 접근관리 (부서/개인) | `…/_ob/admin/policy/access` |
| 정책 설정 › 활성세션 · 계정통제 | `…/_ob/admin/policy/sessions` |
| 로그 조회 › 시스템 접속로그 (허용/차단 필터) | `…/_ob/admin/logs/system` |
| 로그 조회 › 관리자 로그 | `…/_ob/admin/logs/admin` |

**안 열려야 정상 (보안 검증):**

- `http://10.52.249.249:8081~8084` → ❌ 타임아웃 (사내 시스템 직접 접근 차단)
- `http://10.52.249.249:443` (IP 직접) → 로그인 화면만, 로그인해도 403

### 라이브 등록 시연

목업 4호 **회계관리(:8084)는 초기 미등록** 상태. [사내시스템 등록]에서
라벨 `acct`, 이름 `회계관리`, 주소 `http://127.0.0.1:8084` 입력 → 포털에 즉시 타일 생성
→ [정책 접근관리]에서 권한 부여 → 접속. *"시스템 온보딩 1분"* 시연용.

## 정책/데이터 파일

- `relay/policy.default.json` — **git 추적.** 초기 정책(회사·시스템·부서·계정). 스키마 버전 `_v` 올리면 서버에서 자동 재생성
- `relay/policy.json` — **서버 로컬 전용(gitignore).** 관리자 콘솔이 실시간 수정. 초기화: `rm relay/policy.json && ./start.sh`
- `relay/audit.log` — 감사 로그 영속 파일 (JSONL, gitignore)

## 로컬 개발 실행

요구사항: Node.js 18+ (개발은 22 기준)

```bash
git clone https://github.com/jiransoft/jiran-hackertone-amd.git && cd jiran-hackertone-amd
(cd relay && npm install) && (cd connector && npm install)
RELAY_PORT=18080 ./start.sh    # 443은 로컬에서 권한 필요하므로 다른 포트 사용
curl -H "Host: erp.localhost" http://localhost:18080/   # 302(로그인 유도)면 정상
```

### 환경변수 (기본값으로도 동작)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `RELAY_PORT` | `443` (start.sh) / `8080` (직접 실행) | 릴레이 수신 포트 |
| `RELAY_URL` | `ws://localhost:<포트>/tunnel` | 커넥터가 접속할 릴레이 주소 |
| `CONNECTOR_TOKEN` | `dev-token` | 커넥터 등록 토큰 (릴레이·커넥터 동일 값) |
| `ADMIN_TOKEN` | `admin-token` | 관리자 콘솔 토큰 |
| `ANTHROPIC_API_KEY` | — | F-4(AI 위험도 평가)에서 사용 예정 |

## 팀

- 지란지교소프트 해커톤 2026 (24h) · 팀 AMD
