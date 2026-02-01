#!/bin/bash
# =============================================================================
# OpenClaw 원격 SSH 터널 설정 스크립트
# 이 PC에서 실행하여 원격 Ubuntu PC의 OpenClaw Gateway에 연결
# =============================================================================

set -euo pipefail

# ── 설정 변수 (환경에 맞게 수정) ──
REMOTE_USER="${OPENCLAW_REMOTE_USER:-}"
REMOTE_HOST="${OPENCLAW_REMOTE_HOST:-}"
REMOTE_PORT="${OPENCLAW_REMOTE_SSH_PORT:-22}"
GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"
SSH_KEY="${OPENCLAW_SSH_KEY:-$HOME/.ssh/id_ed25519}"

# ── 색상 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
print_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
print_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── 사용자 입력 ──
prompt_config() {
    if [ -z "$REMOTE_USER" ]; then
        read -rp "원격 Ubuntu PC 사용자명: " REMOTE_USER
    fi
    if [ -z "$REMOTE_HOST" ]; then
        read -rp "원격 Ubuntu PC IP 주소 또는 호스트명: " REMOTE_HOST
    fi
    echo ""
    print_info "설정 정보:"
    echo "  원격 사용자: $REMOTE_USER"
    echo "  원격 호스트: $REMOTE_HOST"
    echo "  SSH 포트:    $REMOTE_PORT"
    echo "  Gateway 포트: $GATEWAY_PORT"
    echo "  SSH 키:      $SSH_KEY"
    echo ""
}

# ── SSH 키 확인/생성 ──
ensure_ssh_key() {
    if [ ! -f "$SSH_KEY" ]; then
        print_warn "SSH 키가 없습니다. 새로 생성합니다."
        ssh-keygen -t ed25519 -C "openclaw-remote" -f "$SSH_KEY" -N ""
        print_ok "SSH 키 생성 완료: $SSH_KEY"
    else
        print_ok "SSH 키 확인: $SSH_KEY"
    fi
}

# ── SSH 키 원격 PC에 복사 ──
copy_ssh_key() {
    print_info "원격 PC에 SSH 공개키를 복사합니다..."
    ssh-copy-id -i "${SSH_KEY}.pub" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" 2>/dev/null && {
        print_ok "SSH 키 복사 완료"
    } || {
        print_warn "SSH 키 복사 실패 또는 이미 등록됨. 계속 진행합니다."
    }
}

# ── 원격 OpenClaw 상태 확인 ──
check_remote_openclaw() {
    print_info "원격 PC의 OpenClaw 상태를 확인합니다..."

    # OpenClaw 설치 확인
    if ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" "command -v openclaw" &>/dev/null; then
        print_ok "OpenClaw 설치 확인됨"
    else
        print_error "원격 PC에 OpenClaw가 설치되어 있지 않습니다."
        print_info "원격 PC에서 다음 명령을 실행하세요:"
        echo "  npm install -g openclaw@latest"
        echo "  openclaw onboard --install-daemon"
        return 1
    fi

    # Gateway 실행 확인
    if ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" "ss -tlnp | grep -q $GATEWAY_PORT" 2>/dev/null; then
        print_ok "Gateway가 포트 $GATEWAY_PORT 에서 실행 중"
    else
        print_warn "Gateway가 실행 중이 아닙니다."
        print_info "원격 PC에서 Gateway를 시작합니다..."
        ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" \
            "nohup openclaw gateway --port $GATEWAY_PORT --verbose > ~/.openclaw/gateway.log 2>&1 &"
        sleep 3
        if ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" "ss -tlnp | grep -q $GATEWAY_PORT" 2>/dev/null; then
            print_ok "Gateway 시작 완료"
        else
            print_error "Gateway 시작 실패. 원격 PC에서 직접 확인하세요."
            return 1
        fi
    fi
}

# ── 기존 터널 종료 ──
kill_existing_tunnel() {
    local pids
    pids=$(pgrep -f "ssh.*-L.*${GATEWAY_PORT}:127.0.0.1:${GATEWAY_PORT}" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        print_warn "기존 SSH 터널 발견. 종료합니다. (PID: $pids)"
        echo "$pids" | xargs kill 2>/dev/null || true
        sleep 1
    fi
}

# ── SSH 터널 생성 ──
create_tunnel() {
    kill_existing_tunnel

    print_info "SSH 터널을 생성합니다 (포트 $GATEWAY_PORT)..."
    ssh -fN \
        -i "$SSH_KEY" \
        -p "$REMOTE_PORT" \
        -o "ServerAliveInterval=30" \
        -o "ServerAliveCountMax=3" \
        -o "ExitOnForwardFailure=yes" \
        -L "${GATEWAY_PORT}:127.0.0.1:${GATEWAY_PORT}" \
        "${REMOTE_USER}@${REMOTE_HOST}"

    sleep 2

    # 터널 확인
    if ss -tlnp 2>/dev/null | grep -q ":${GATEWAY_PORT}" || \
       lsof -i ":${GATEWAY_PORT}" &>/dev/null; then
        print_ok "SSH 터널 생성 완료!"
        echo ""
        print_info "OpenClaw Control UI 접속:"
        echo "  http://127.0.0.1:${GATEWAY_PORT}/?token=YOUR_TOKEN"
        echo ""
        print_info "CLI로 상태 확인:"
        echo "  openclaw gateway status --url ws://127.0.0.1:${GATEWAY_PORT}"
    else
        print_error "SSH 터널 생성 실패"
        return 1
    fi
}

# ── autossh 설치 확인 ──
setup_autossh() {
    if command -v autossh &>/dev/null; then
        print_ok "autossh 설치 확인됨"
    else
        print_info "autossh를 설치합니다 (자동 재연결 지원)..."
        if command -v apt &>/dev/null; then
            sudo apt install -y autossh
        elif command -v brew &>/dev/null; then
            brew install autossh
        else
            print_warn "autossh를 수동으로 설치하세요."
            return 1
        fi
    fi

    kill_existing_tunnel

    print_info "autossh로 안정적인 SSH 터널을 생성합니다..."
    autossh -M 0 -fN \
        -i "$SSH_KEY" \
        -p "$REMOTE_PORT" \
        -o "ServerAliveInterval=30" \
        -o "ServerAliveCountMax=3" \
        -o "ExitOnForwardFailure=yes" \
        -L "${GATEWAY_PORT}:127.0.0.1:${GATEWAY_PORT}" \
        "${REMOTE_USER}@${REMOTE_HOST}"

    print_ok "autossh 터널 생성 완료 (자동 재연결 활성)"
}

# ── 메인 ──
main() {
    echo "============================================="
    echo "  OpenClaw 원격 SSH 터널 설정"
    echo "============================================="
    echo ""

    prompt_config
    ensure_ssh_key

    read -rp "원격 PC에 SSH 키를 복사하시겠습니까? (y/N): " copy_key
    if [[ "$copy_key" =~ ^[Yy]$ ]]; then
        copy_ssh_key
    fi

    check_remote_openclaw

    echo ""
    echo "터널 모드를 선택하세요:"
    echo "  1) 기본 SSH 터널 (단순)"
    echo "  2) autossh 터널 (자동 재연결, 권장)"
    read -rp "선택 (1/2): " tunnel_mode

    case "$tunnel_mode" in
        2) setup_autossh ;;
        *) create_tunnel ;;
    esac

    echo ""
    print_ok "설정 완료!"
    echo ""
    echo "유용한 명령어:"
    echo "  # 터널 상태 확인"
    echo "  ss -tlnp | grep $GATEWAY_PORT"
    echo ""
    echo "  # 터널 종료"
    echo "  pkill -f 'ssh.*-L.*${GATEWAY_PORT}:127.0.0.1:${GATEWAY_PORT}'"
    echo ""
    echo "  # 원격 OpenClaw 로그 확인"
    echo "  ssh ${REMOTE_USER}@${REMOTE_HOST} 'tail -f ~/.openclaw/gateway.log'"
}

main "$@"
