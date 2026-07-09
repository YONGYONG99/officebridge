#!/usr/bin/env bash
# OfficeBridge 전체 기동 스크립트 (개발서버용)
# 사용법: ./start.sh          → 전부 재시작 (릴레이 443)
#        RELAY_PORT=18080 ./start.sh  → 다른 포트로
cd "$(dirname "$0")"

RELAY_PORT="${RELAY_PORT:-443}"

echo "▶ 기존 프로세스 정리..."
pkill -f "relay/server.js" 2>/dev/null
pkill -f "connector/index.js" 2>/dev/null
pkill -f "mock-apps/server.js" 2>/dev/null
sleep 1

echo "▶ 목업 사내 시스템 시작 (8081~8083)..."
nohup node mock-apps/server.js > /tmp/mock.log 2>&1 &

echo "▶ 릴레이 서버 시작 (:${RELAY_PORT})..."
RELAY_PORT="$RELAY_PORT" nohup node relay/server.js > /tmp/relay.log 2>&1 &
sleep 1

echo "▶ 커넥터 시작 (→ ws://localhost:${RELAY_PORT}/tunnel)..."
RELAY_URL="ws://localhost:${RELAY_PORT}/tunnel" nohup node connector/index.js > /tmp/connector.log 2>&1 &
sleep 2

echo ""
echo "════════ 상태 확인 ════════"
RELAY_OK=$(grep -c "릴레이 서버 시작" /tmp/relay.log 2>/dev/null)
TUNNEL_OK=$(grep -c "터널 수립 완료" /tmp/connector.log 2>/dev/null)
MOCK_OK=$(grep -c "내부망 전용" /tmp/mock.log 2>/dev/null)

[ "$MOCK_OK" -ge 1 ] && echo "✅ 목업 앱      : 정상 (${MOCK_OK}개)" || { echo "❌ 목업 앱 실패:"; tail -5 /tmp/mock.log; }
[ "$RELAY_OK" -ge 1 ] && echo "✅ 릴레이       : 정상 (:${RELAY_PORT})" || { echo "❌ 릴레이 실패:"; tail -5 /tmp/relay.log; }
[ "$TUNNEL_OK" -ge 1 ] && echo "✅ 커넥터 터널  : 정상" || { echo "❌ 커넥터 실패:"; tail -5 /tmp/connector.log; }

CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: groupware.localhost" "http://localhost:${RELAY_PORT}/" 2>/dev/null)
if [ "$CODE" = "302" ]; then
  echo "✅ E2E 확인     : 게이트웨이 응답 정상 (302 → 로그인 유도)"
else
  echo "⚠️  E2E 확인     : HTTP ${CODE} (302 기대) — 로그 확인 필요"
fi
echo ""
echo "로그: tail -f /tmp/relay.log /tmp/connector.log /tmp/mock.log"
