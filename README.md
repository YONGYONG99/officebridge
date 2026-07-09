# OfficeBridge

**클라이언트리스 ZTNA 게이트웨이** — VPN 없이, 브라우저만으로, 인가된 사내 시스템에만 접근하게 하는 제로트러스트 게이트웨이. AI 정책 엔진이 모든 접속의 위험도를 실시간 평가한다.

> 상세 기획: [PRD.md](./PRD.md)

## 구조

```
relay/       릴레이 서버 — 게이트웨이 프록시 + 인증 + 정책엔진 + 터널 매니저 + 대시보드 API
connector/   커넥터 에이전트 — 고객사 사내망에서 릴레이로 아웃바운드 WSS 터널
dashboard/   관리자 대시보드 — 실시간 접속 로그, 세션 즉시 차단
mock-apps/   데모용 사내 시스템 목업 — 그룹웨어 / 위키 / 인사DB
```

## 현재 구현 상태

- ✅ **F-1 터널링** — 릴레이↔커넥터 아웃바운드 WSS 터널, 자동 재연결 (실환경 검증)
- ✅ **F-2 인증** — 이메일+비밀번호 로그인(SHA-256), 세션 쿠키 서브도메인 공유(SSO)
- ✅ **F-3 정적 정책** — `relay/policy.json` 사용자↔앱 매핑, 403 차단, 수정 시 1초 내 자동 반영
- ✅ **F-5 감사 로그** — 전 이벤트 구조화 기록(audit.log) + 조회 API `/_ob/api/logs?token=admin-token`
- ✅ **F-7 목업 사내 시스템** — 그룹웨어/위키/인사DB (127.0.0.1 전용)
- ⬜ F-4 AI 위험도 평가 · F-6 관리자 대시보드 · 발표자료

### 데모 계정 (비밀번호 전부 `demo1234`)

| 계정 | 그룹웨어 | 위키 | 인사DB |
|---|---|---|---|
| 김영업 kim.sales@demo.co.kr | ✅ | ✅ | ❌ |
| 이개발 lee.dev@demo.co.kr | ✅ | ✅ | ❌ |
| 박인사 park.hr@demo.co.kr | ✅ | ✅ | ✅ |

## 개발서버 실행

사내망 정책상 **443만 인바운드 허용** — 릴레이는 443으로 띄운다 (start.sh 기본값).

```bash
cd /data/hackertone-amd && git pull && ./start.sh
```

start.sh가 기존 프로세스 정리 → 목업/릴레이/커넥터 재시작 → 자가진단(✅ 4항목)까지 수행한다.
**git pull 후에는 반드시 ./start.sh** (재시작 없이는 옛 코드가 계속 돈다).

- 사용자 접속: `http://groupware.10.52.249.249.sslip.io:443` (wiki / hrdb 동일 패턴)
- 감사 로그 실시간: `tail -f /data/hackertone-amd/relay/audit.log`
- 감사 로그 API: `curl "http://localhost:443/_ob/api/logs?token=admin-token"`

## 로컬 개발 실행

요구사항: Node.js 18+ (개발은 22 기준)

```bash
git clone https://github.com/jiransoft/jiran-hackertone-amd.git
cd jiran-hackertone-amd
(cd relay && npm install)
(cd connector && npm install)
```

터미널 3개로 각각 실행 (순서 상관없음 — 커넥터는 자동 재연결됨):

```bash
# 터미널 1 — 목업 사내 시스템 (127.0.0.1:8081~8083, 외부 직접 접근 불가)
node mock-apps/server.js

# 터미널 2 — 릴레이 서버 (기본 8080)
node relay/server.js

# 터미널 3 — 커넥터 (릴레이로 아웃바운드 터널)
node connector/index.js
```

### 동작 확인

서버 안에서:

```bash
curl -H "Host: groupware.localhost" http://localhost:8080/   # 그룹웨어 HTML이 나오면 터널 성공
curl -H "Host: wiki.localhost"      http://localhost:8080/
curl -H "Host: nothing.localhost"   http://localhost:8080/   # 503 (미등록 서비스) 정상
```

다른 PC 브라우저에서 (사내망, 개발서버 IP가 예: 10.1.2.3):

```
http://groupware.10.1.2.3.sslip.io:8080
http://wiki.10.1.2.3.sslip.io:8080
http://hrdb.10.1.2.3.sslip.io:8080
```

> `sslip.io`는 도메인에 박힌 IP로 그대로 풀어주는 무료 공개 DNS. 서비스 구분이 호스트명 첫 라벨(groupware/wiki/hrdb) 기준이라 IP 직접 입력으론 접근 불가.
> 사내망에서 외부 DNS(sslip.io)가 막혀 있으면 각 PC hosts 파일에 `10.1.2.3 groupware.local wiki.local hrdb.local` 추가로 대체.

### 환경변수 (기본값으로도 동작)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `RELAY_PORT` | `8080` | 릴레이 수신 포트 |
| `RELAY_URL` | `ws://localhost:8080/tunnel` | 커넥터가 접속할 릴레이 주소 (릴레이와 커넥터가 다른 서버면 변경) |
| `CONNECTOR_TOKEN` | `dev-token` | 커넥터 등록 토큰 (릴레이·커넥터 동일 값) |

```bash
cp .env.example .env   # 이후 OAuth/Claude 키 채울 때 사용 (팀 메신저에서 공유)
```

## 팀

- 지란지교소프트 해커톤 2026 (24h)
