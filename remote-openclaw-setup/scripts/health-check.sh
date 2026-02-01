#!/bin/bash
# =============================================================================
# OpenClaw 원격 연결 상태 점검 스크립트
# 이 PC에서 실행하여 원격 OpenClaw 연결 상태를 확인
# =============================================================================

set -euo pipefail

GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"
REMOTE_USER="${OPENCLAW_REMOTE_USER:-}"
REMOTE_HOST="${OPENCLAW_REMOTE_HOST:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "  ${RED}[FAIL]${NC} $1"; }
warn() { echo -e "  ${YELLOW}[WARN]${NC} $1"; }
info() { echo -e "  ${BLUE}[INFO]${NC} $1"; }

echo "============================================="
echo "  OpenClaw 원격 연결 상태 점검"
echo "============================================="
echo ""

# .env 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
    info ".env 파일 로드됨"
fi

ERRORS=0

# 1. SSH 터널 확인
echo "[1/6] SSH 터널 확인"
if ss -tlnp 2>/dev/null | grep -q ":${GATEWAY_PORT}" || \
   lsof -i ":${GATEWAY_PORT}" &>/dev/null 2>&1; then
    pass "로컬 포트 $GATEWAY_PORT 활성"
else
    fail "로컬 포트 $GATEWAY_PORT 비활성 - SSH 터널이 필요합니다"
    ERRORS=$((ERRORS + 1))
fi

# 2. Gateway HTTP 응답 확인
echo "[2/6] Gateway HTTP 응답"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${GATEWAY_PORT}/" 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" != "000" ]; then
    pass "Gateway HTTP 응답: $HTTP_STATUS"
else
    fail "Gateway HTTP 응답 없음"
    ERRORS=$((ERRORS + 1))
fi

# 3. Gateway WebSocket 연결 확인
echo "[3/6] Gateway WebSocket"
if command -v wscat &>/dev/null; then
    if timeout 5 wscat -c "ws://127.0.0.1:${GATEWAY_PORT}" --execute 'ping' &>/dev/null; then
        pass "WebSocket 연결 성공"
    else
        warn "WebSocket 연결 실패 (토큰이 필요할 수 있음)"
    fi
else
    info "wscat 미설치 - WebSocket 테스트 스킵 (npm install -g wscat)"
fi

# 4. 원격 SSH 연결 확인
echo "[4/6] 원격 SSH 연결"
if [ -n "$REMOTE_HOST" ] && [ -n "$REMOTE_USER" ]; then
    if ssh -o ConnectTimeout=5 -o BatchMode=yes "${REMOTE_USER}@${REMOTE_HOST}" "echo ok" &>/dev/null; then
        pass "SSH 연결 성공: ${REMOTE_USER}@${REMOTE_HOST}"
    else
        fail "SSH 연결 실패: ${REMOTE_USER}@${REMOTE_HOST}"
        ERRORS=$((ERRORS + 1))
    fi
else
    warn "REMOTE_HOST/REMOTE_USER 미설정 - SSH 테스트 스킵"
fi

# 5. 원격 OpenClaw 프로세스 확인
echo "[5/6] 원격 OpenClaw 프로세스"
if [ -n "$REMOTE_HOST" ] && [ -n "$REMOTE_USER" ]; then
    REMOTE_GW=$(ssh -o ConnectTimeout=5 -o BatchMode=yes "${REMOTE_USER}@${REMOTE_HOST}" \
        "pgrep -f 'openclaw.*gateway' > /dev/null 2>&1 && echo 'running' || echo 'stopped'" 2>/dev/null || echo "error")
    if [ "$REMOTE_GW" = "running" ]; then
        pass "원격 OpenClaw Gateway 실행 중"
    elif [ "$REMOTE_GW" = "stopped" ]; then
        fail "원격 OpenClaw Gateway 중지됨"
        ERRORS=$((ERRORS + 1))
    else
        fail "원격 서버 연결 불가"
        ERRORS=$((ERRORS + 1))
    fi
else
    warn "원격 서버 정보 미설정 - 스킵"
fi

# 6. OpenClaw CLI 확인
echo "[6/6] 로컬 OpenClaw CLI"
if command -v openclaw &>/dev/null; then
    pass "OpenClaw CLI 설치됨: $(openclaw --version 2>/dev/null || echo 'unknown')"
else
    warn "로컬에 OpenClaw CLI 미설치 (선택사항)"
fi

# 결과 요약
echo ""
echo "============================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "  ${GREEN}모든 점검 통과!${NC}"
    echo ""
    echo "  Control UI: http://127.0.0.1:${GATEWAY_PORT}"
    echo "  WebSocket:  ws://127.0.0.1:${GATEWAY_PORT}"
else
    echo -e "  ${RED}${ERRORS}개 항목 실패${NC}"
    echo ""
    echo "  문제 해결:"
    echo "  1. SSH 터널 확인: ssh -fN -L ${GATEWAY_PORT}:127.0.0.1:${GATEWAY_PORT} user@host"
    echo "  2. 원격 Gateway 확인: ssh user@host 'openclaw gateway health'"
    echo "  3. 상세 문서: remote-openclaw-setup/README.md"
fi
echo "============================================="
