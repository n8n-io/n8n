# Remote OpenClaw Setup Guide

이 PC에서 원격 Ubuntu PC에 설치된 OpenClaw를 제어하기 위한 설정 가이드.

## 아키텍처 개요

```
[이 PC (클라이언트)]                    [원격 Ubuntu PC (서버)]
 ├─ SSH 터널 (포트 18789)  ──────────▶  ├─ OpenClaw Gateway (ws://127.0.0.1:18789)
 ├─ 브라우저 (Control UI)               ├─ OpenClaw Agent Runtime
 ├─ n8n (워크플로우 자동화)              ├─ 채널 연동 (WhatsApp/Telegram 등)
 └─ CLI 클라이언트                       └─ 도구 실행 (파일, 브라우저, 터미널)
```

## 전제 조건

### 원격 Ubuntu PC (OpenClaw 서버)
- Ubuntu 22.04/24.04 LTS
- Node.js >= 22
- OpenClaw 설치 완료 (`npm install -g openclaw@latest`)
- SSH 서버 활성화 (`sudo apt install openssh-server`)
- OpenClaw Gateway 실행 중

### 이 PC (클라이언트)
- SSH 클라이언트 설치
- 브라우저 (Control UI 접속용)
- n8n (워크플로우 자동화 연동 시)

---

## 방법 1: SSH 터널 (권장 - 가장 안전)

### 1단계: 원격 PC에서 OpenClaw Gateway 실행

```bash
# 원격 Ubuntu PC에서 실행
openclaw gateway --port 18789 --verbose
```

또는 데몬으로 실행:
```bash
openclaw onboard --install-daemon
# systemd 서비스로 자동 시작됨
```

### 2단계: 이 PC에서 SSH 터널 생성

```bash
# 기본 SSH 터널
ssh -N -L 18789:127.0.0.1:18789 사용자명@원격PC_IP

# 백그라운드에서 실행
ssh -fN -L 18789:127.0.0.1:18789 사용자명@원격PC_IP

# SSH 키 인증 사용 (비밀번호 입력 불필요)
ssh -fN -i ~/.ssh/id_rsa -L 18789:127.0.0.1:18789 사용자명@원격PC_IP
```

### 3단계: Control UI 접속

브라우저에서 열기:
```
http://127.0.0.1:18789/?token=YOUR-GENERATED-TOKEN
```

### 4단계: CLI로 원격 제어

```bash
# 원격 Gateway 상태 확인
openclaw gateway status --url ws://127.0.0.1:18789

# 원격 Gateway에 메시지 전송
openclaw gateway send --url ws://127.0.0.1:18789 --message "작업 수행해줘"

# 에이전트 실행
openclaw agent --message "파일 정리해줘" --thinking high
```

---

## 방법 2: Tailscale VPN (편리한 설정)

### 양쪽 PC에 Tailscale 설치

```bash
# Ubuntu (원격 PC)
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# 이 PC (클라이언트)
# https://tailscale.com/download 에서 설치
tailscale up
```

### Gateway를 Tailnet에 바인딩

```bash
# 원격 Ubuntu PC에서
openclaw gateway --bind tailnet --token YOUR_GATEWAY_TOKEN --port 18789
```

### Tailscale Serve 설정 (HTTPS)

`~/.openclaw/openclaw.json` 에서:
```json
{
  "gateway": {
    "bind": "loopback",
    "port": 18789,
    "tailscale": {
      "mode": "serve",
      "resetOnExit": true
    }
  }
}
```

### 접속

```
https://원격PC호스트명.tail-xxxxx.ts.net:18789
```

---

## 방법 3: LAN 바인딩 (같은 네트워크)

같은 로컬 네트워크에 있을 경우:

```bash
# 원격 Ubuntu PC에서 (주의: 반드시 토큰 사용)
openclaw gateway --bind lan --port 18789 --token YOUR_SECURE_TOKEN
```

접속:
```
http://원격PC_IP:18789/?token=YOUR_SECURE_TOKEN
```

> ⚠️ LAN 바인딩은 SSH 터널이나 Tailscale보다 보안이 약함. 반드시 토큰 인증 필수.

---

## 원격 PC의 OpenClaw 설정 파일

### `~/.openclaw/openclaw.json` (원격 Ubuntu PC)

```json
{
  "agent": {
    "model": "anthropic/claude-opus-4-5"
  },
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace",
      "sandbox": {
        "mode": "non-main"
      }
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
```

---

## n8n 워크플로우 연동

n8n에서 OpenClaw를 제어하려면:

### 1. OpenClaw n8n 스킬 설치 (원격 PC)

```bash
# 원격 Ubuntu PC에서
openclaw skills install n8n
openclaw skills install n8n-workflow-automation
```

### 2. n8n HTTP Request 노드로 Gateway API 호출

SSH 터널이 열린 상태에서 n8n의 HTTP Request 노드:

- **Method**: POST
- **URL**: `http://127.0.0.1:18789/api/sessions/send`
- **Headers**: `Authorization: Bearer YOUR_GATEWAY_TOKEN`
- **Body**:
```json
{
  "message": "작업 내용"
}
```

### 3. WebSocket 연동

n8n의 WebSocket 노드를 사용해 실시간 통신:
- **URL**: `ws://127.0.0.1:18789`
- Gateway 프로토콜 메서드:
  - `sessions_list` — 활성 세션 목록
  - `sessions_history` — 대화 로그
  - `sessions_send` — 메시지 전송
  - `node.invoke` — 원격 장치 작업 실행

---

## SSH 키 설정 (비밀번호 없이 접속)

```bash
# 이 PC에서 SSH 키 생성 (이미 있으면 스킵)
ssh-keygen -t ed25519 -C "openclaw-remote"

# 원격 PC에 공개키 복사
ssh-copy-id 사용자명@원격PC_IP

# 테스트
ssh 사용자명@원격PC_IP "openclaw gateway health"
```

---

## 자동 SSH 터널 유지 (autossh)

```bash
# autossh 설치
sudo apt install autossh  # 또는 brew install autossh

# 자동 재연결되는 SSH 터널
autossh -M 0 -fN -o "ServerAliveInterval 30" -o "ServerAliveCountMax 3" \
  -L 18789:127.0.0.1:18789 사용자명@원격PC_IP
```

### systemd 서비스로 등록 (Linux 클라이언트)

`/etc/systemd/system/openclaw-tunnel.service`:
```ini
[Unit]
Description=OpenClaw SSH Tunnel
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=YOUR_USERNAME
ExecStart=/usr/bin/autossh -M 0 -N -o "ServerAliveInterval 30" -o "ServerAliveCountMax 3" -L 18789:127.0.0.1:18789 사용자명@원격PC_IP
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable openclaw-tunnel
sudo systemctl start openclaw-tunnel
```

---

## 트러블슈팅

| 문제 | 해결 방법 |
|------|-----------|
| `Connection refused` | 원격 PC에서 Gateway 실행 중인지 확인: `openclaw gateway health` |
| `pairing required (1008)` | 터널 접속 시 페어링 필요 — `openclaw pairing approve` 실행 |
| SSH 터널 끊김 | `autossh` 사용 또는 `ServerAliveInterval` 설정 |
| 포트 충돌 | `lsof -i :18789`로 확인, 포트 변경 또는 충돌 프로세스 종료 |
| 토큰 인증 실패 | `~/.openclaw/openclaw.json`의 토큰 확인 |
| Gateway 느림 | `openclaw doctor` 실행하여 설정 점검 |

---

## 보안 권장사항

1. **Gateway를 절대 공개 인터넷에 노출하지 말 것** — Shodan에서 노출된 Gateway가 발견됨
2. **SSH 터널 또는 Tailscale 사용** — loopback 바인딩 유지
3. **비-loopback 바인딩 시 반드시 토큰/비밀번호 인증 설정**
4. **SSH 키 인증 사용** — 비밀번호 인증 비활성화 권장
5. **`openclaw doctor` 정기 실행** — 위험한 설정 탐지

## 참고 자료

- [OpenClaw 공식 문서](https://docs.openclaw.ai/)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [원격 접속 가이드](https://docs.openclaw.ai/gateway/remote)
- [OpenClaw 시작하기](https://docs.openclaw.ai/start/getting-started)
- [Awesome OpenClaw Skills (n8n 포함)](https://github.com/VoltAgent/awesome-openclaw-skills)
