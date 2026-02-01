#!/bin/bash
# =============================================================================
# OpenClaw 원격 서버(Ubuntu) 초기 설정 스크립트
# 원격 Ubuntu PC에서 실행하여 OpenClaw 서버 환경을 구성
# =============================================================================

set -euo pipefail

GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
print_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
print_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── 시스템 요구사항 확인 ──
check_system() {
    print_info "시스템 요구사항을 확인합니다..."

    # OS 확인
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        print_ok "OS: $PRETTY_NAME"
    fi

    # 메모리 확인
    local total_mem
    total_mem=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$total_mem" -ge 2048 ]; then
        print_ok "메모리: ${total_mem}MB (최소 2GB 충족)"
    else
        print_warn "메모리: ${total_mem}MB (2GB 이상 권장)"
    fi

    # 디스크 확인
    local free_disk
    free_disk=$(df -BG / | awk 'NR==2{print $4}' | tr -d 'G')
    if [ "$free_disk" -ge 10 ]; then
        print_ok "디스크 여유 공간: ${free_disk}GB"
    else
        print_warn "디스크 여유 공간: ${free_disk}GB (10GB 이상 권장)"
    fi
}

# ── SSH 서버 설정 ──
setup_ssh() {
    print_info "SSH 서버를 확인합니다..."

    if systemctl is-active --quiet sshd 2>/dev/null || systemctl is-active --quiet ssh 2>/dev/null; then
        print_ok "SSH 서버 실행 중"
    else
        print_info "SSH 서버를 설치하고 시작합니다..."
        sudo apt update
        sudo apt install -y openssh-server
        sudo systemctl enable ssh
        sudo systemctl start ssh
        print_ok "SSH 서버 설치 및 시작 완료"
    fi

    # SSH 보안 설정 권장
    print_info "SSH 보안 설정 권장사항:"
    echo "  /etc/ssh/sshd_config 에서:"
    echo "    PasswordAuthentication no    # 키 인증만 허용"
    echo "    PermitRootLogin no           # root 로그인 차단"
    echo "    MaxAuthTries 3               # 인증 시도 제한"
}

# ── Node.js 설치/확인 ──
setup_nodejs() {
    print_info "Node.js를 확인합니다..."

    if command -v node &>/dev/null; then
        local node_version
        node_version=$(node --version)
        local major_version
        major_version=$(echo "$node_version" | cut -d. -f1 | tr -d 'v')
        if [ "$major_version" -ge 22 ]; then
            print_ok "Node.js $node_version (요구사항 >= 22 충족)"
        else
            print_warn "Node.js $node_version 설치됨. >= 22 필요."
            install_nodejs
        fi
    else
        print_warn "Node.js가 설치되어 있지 않습니다."
        install_nodejs
    fi
}

install_nodejs() {
    print_info "Node.js 22를 설치합니다..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
    print_ok "Node.js $(node --version) 설치 완료"
}

# ── OpenClaw 설치/확인 ──
setup_openclaw() {
    print_info "OpenClaw를 확인합니다..."

    if command -v openclaw &>/dev/null; then
        local oc_version
        oc_version=$(openclaw --version 2>/dev/null || echo "unknown")
        print_ok "OpenClaw 설치됨: $oc_version"
    else
        print_info "OpenClaw를 설치합니다..."
        npm install -g openclaw@latest
        print_ok "OpenClaw 설치 완료"
    fi
}

# ── OpenClaw 설정 파일 생성 ──
configure_openclaw() {
    local config_dir="$HOME/.openclaw"
    local config_file="$config_dir/openclaw.json"

    mkdir -p "$config_dir"

    if [ -f "$config_file" ]; then
        print_ok "설정 파일 존재: $config_file"
        print_info "기존 설정을 유지합니다."
    else
        print_info "기본 설정 파일을 생성합니다..."
        cat > "$config_file" << 'CONF'
{
  "agent": {
    "model": "anthropic/claude-opus-4-5"
  },
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace"
    }
  },
  "gateway": {
    "bind": "loopback",
    "port": 18789,
    "auth": {
      "mode": "token"
    }
  }
}
CONF
        print_ok "설정 파일 생성: $config_file"
    fi

    # 작업 디렉터리 생성
    mkdir -p "$config_dir/workspace"
    print_ok "작업 디렉터리: $config_dir/workspace"
}

# ── 방화벽 설정 ──
setup_firewall() {
    print_info "방화벽을 확인합니다..."

    if command -v ufw &>/dev/null; then
        local ufw_status
        ufw_status=$(sudo ufw status 2>/dev/null | head -1)
        if echo "$ufw_status" | grep -q "active"; then
            print_ok "UFW 방화벽 활성"
            # SSH만 허용 (Gateway는 loopback이므로 별도 포트 오픈 불필요)
            sudo ufw allow ssh 2>/dev/null || true
            print_info "SSH 포트 허용됨. Gateway($GATEWAY_PORT)는 loopback이므로 별도 허용 불필요."
        else
            print_warn "UFW 방화벽 비활성. 활성화를 권장합니다:"
            echo "  sudo ufw enable"
            echo "  sudo ufw allow ssh"
        fi
    else
        print_info "UFW가 설치되어 있지 않습니다. 필요 시: sudo apt install ufw"
    fi
}

# ── Gateway 데몬 설정 ──
setup_gateway_daemon() {
    print_info "Gateway 데몬을 설정합니다..."

    read -rp "Gateway 데몬(systemd 서비스)을 설정하시겠습니까? (y/N): " setup_daemon
    if [[ "$setup_daemon" =~ ^[Yy]$ ]]; then
        openclaw onboard --install-daemon 2>/dev/null && {
            print_ok "Gateway 데몬 설정 완료"
        } || {
            print_warn "데몬 설정에 실패했습니다. 수동으로 설정하세요."
            print_info "수동 시작: openclaw gateway --port $GATEWAY_PORT --verbose"
        }
    else
        print_info "수동으로 Gateway를 시작하려면:"
        echo "  openclaw gateway --port $GATEWAY_PORT --verbose"
        echo ""
        echo "  # 백그라운드 실행:"
        echo "  nohup openclaw gateway --port $GATEWAY_PORT --verbose > ~/.openclaw/gateway.log 2>&1 &"
    fi
}

# ── 상태 진단 ──
run_diagnostics() {
    print_info "시스템 진단을 실행합니다..."

    # Gateway 포트 확인
    if ss -tlnp 2>/dev/null | grep -q ":${GATEWAY_PORT}"; then
        print_ok "Gateway가 포트 $GATEWAY_PORT 에서 실행 중"
    else
        print_warn "Gateway가 실행 중이 아닙니다"
    fi

    # OpenClaw doctor 실행
    if command -v openclaw &>/dev/null; then
        print_info "openclaw doctor 실행..."
        openclaw doctor 2>/dev/null || print_warn "doctor 명령 실행 실패"
    fi

    # 네트워크 정보
    print_info "네트워크 정보:"
    local ip_addr
    ip_addr=$(hostname -I 2>/dev/null | awk '{print $1}')
    echo "  IP 주소: $ip_addr"
    echo "  호스트명: $(hostname)"
    echo ""
    echo "  클라이언트 PC에서 SSH 터널 명령:"
    echo "  ssh -fN -L ${GATEWAY_PORT}:127.0.0.1:${GATEWAY_PORT} $(whoami)@${ip_addr}"
}

# ── 메인 ──
main() {
    echo "============================================="
    echo "  OpenClaw 원격 서버(Ubuntu) 초기 설정"
    echo "============================================="
    echo ""

    check_system
    echo ""
    setup_ssh
    echo ""
    setup_nodejs
    echo ""
    setup_openclaw
    echo ""
    configure_openclaw
    echo ""
    setup_firewall
    echo ""
    setup_gateway_daemon
    echo ""
    run_diagnostics

    echo ""
    echo "============================================="
    print_ok "서버 설정 완료!"
    echo "============================================="
    echo ""
    echo "다음 단계:"
    echo "  1. 클라이언트 PC에서 setup-ssh-tunnel.sh 실행"
    echo "  2. 브라우저에서 http://127.0.0.1:${GATEWAY_PORT} 접속"
    echo "  3. openclaw gateway status 로 상태 확인"
}

main "$@"
