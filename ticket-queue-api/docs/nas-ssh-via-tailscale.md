# Cursor Cloud Agent → NAS SSH (Tailscale)

Cloud Agent(AWS VM)에서 Synology NAS(`ohola-server`)로 SSH 접속할 때 쓴 방법입니다.  
공인 IP/`ohola.synology.me`만으로는 방화벽(KR/TW 허용) 때문에 에이전트(미국)에서 SSH가 막히고, `SSH_HOST`가 **Tailscale CGNAT(`100.x`)** 이라 Tailscale 없이는 패킷이 안 갑니다.

---

## 한 줄 요약

```
Cloud Agent
  → Tailscale (userspace + SOCKS5 :1055)
  → NAS Tailscale IP (100.x) :22
  → sshpass + ProxyCommand
  → ohola@ohola-server
```

TUN 디바이스가 없는 Cloud VM이라 `tailscaled --tun=userspace-networking` + SOCKS5 프록시로 SSH를 우회합니다.

---

## 필요한 Cursor Secrets

| Secret | 예시 / 설명 |
|--------|-------------|
| `SSH_HOST` | NAS Tailscale IP (`100.x.x.x`) — `tailscale status`의 `ohola-server` |
| `SSH_USER` | DSM 계정 (예: `ohola`, administrators 권한) |
| `SSH_PASSWORD` | 해당 계정 비밀번호 (또는 `SSH_PRIVATE_KEY`로 대체 가능) |
| `TS_AUTHKEY` | (권장) Tailscale reusable/ephemeral auth key — 브라우저 로그인 없이 연결 |

추가 위치: [cursor.com/dashboard/cloud-agents](https://cursor.com/dashboard/cloud-agents) → **Secrets**  
시크릿은 **새 에이전트**를 띄워야 주입됩니다.

Tailscale auth key: [login.tailscale.com/admin/settings/keys](https://login.tailscale.com/admin/settings/keys)

---

## 왜 이 방식인가

| 시도 | 결과 |
|------|------|
| `ssh $SSH_USER@$SSH_HOST` (100.x 직접) | TCP는 열리는 척하지만 SSH 배너 없음 / `Connection reset` |
| `ohola.synology.me:22` | 공인 접속은 되나 비-KR 대역은 DSM 방화벽이 리셋 |
| 일반 `tailscale up` (TUN) | Cloud Agent에 `/dev/net/tun` 없음 |
| **userspace Tailscale + SOCKS5 ProxyCommand** | SSH 배너 `OpenSSH_8.2`, 로그인 성공 |

NAS 호스트명 예: `OHOLA-SERVER` / `synology_v1000_1621+`  
Docker: `/usr/local/bin/docker` (Container Manager). 일반 유저는 `sudo docker …` 필요할 수 있음.

---

## 접속 절차 (에이전트가 하는 일)

### 1) 도구 설치

```bash
sudo apt-get update -qq
sudo apt-get install -y -qq sshpass
# Tailscale
curl -fsSL https://tailscale.com/install.sh | sudo sh
pip3 install -q PySocks
```

### 2) Tailscale userspace + SOCKS5

```bash
sudo mkdir -p /var/run/tailscale /var/lib/tailscale

# 백그라운드로 데몬 기동 (systemd 없는 환경)
sudo tailscaled \
  --tun=userspace-networking \
  --state=/var/lib/tailscale/tailscaled.state \
  --socket=/var/run/tailscale/tailscaled.sock \
  --socks5-server=127.0.0.1:1055 \
  --outbound-http-proxy-listen=127.0.0.1:1055 \
  >>/tmp/tailscaled.log 2>&1 &

sleep 3

# 시크릿이 있으면 non-interactive
if [ -n "$TS_AUTHKEY" ]; then
  sudo tailscale up --authkey="$TS_AUTHKEY" --accept-routes --timeout=60s
else
  # 브라우저 로그인 URL이 출력됨 → 사람이 한 번 승인
  sudo timeout 20 tailscale up --timeout=15s || true
  sudo tailscale status   # "Log in at: https://login.tailscale.com/a/..."
fi

sudo tailscale status
# ohola-server 가 online 이어야 함
```

SOCKS 확인:

```bash
python3 -c 'import socket; s=socket.socket(); print(s.connect_ex(("127.0.0.1",1055))); s.close()'
# 0 이면 OK
```

### 3) SOCKS5용 ProxyCommand

```bash
cat > /tmp/socks5-proxy.py <<'PY'
#!/usr/bin/env python3
import sys, select, socks
host, port = sys.argv[1], int(sys.argv[2])
s = socks.socksocket()
s.set_proxy(socks.SOCKS5, "127.0.0.1", 1055)
s.settimeout(30)
s.connect((host, port))
try:
    while True:
        r, _, _ = select.select([s, sys.stdin], [], [])
        if s in r:
            data = s.recv(4096)
            if not data:
                break
            sys.stdout.buffer.write(data)
            sys.stdout.buffer.flush()
        if sys.stdin in r:
            data = sys.stdin.buffer.read1(4096) if hasattr(sys.stdin.buffer, "read1") else sys.stdin.buffer.read(4096)
            if not data:
                break
            s.sendall(data)
finally:
    s.close()
PY
chmod +x /tmp/socks5-proxy.py
```

배너 스모크 테스트:

```bash
python3 - <<'PY'
import os, socks
s = socks.socksocket()
s.set_proxy(socks.SOCKS5, "127.0.0.1", 1055)
s.settimeout(12)
s.connect((os.environ["SSH_HOST"], 22))
print(s.recv(120))  # b'SSH-2.0-OpenSSH_...'
s.close()
PY
```

### 4) SSH config + 접속

```bash
mkdir -p ~/.ssh
cat > ~/.ssh/config <<EOF
Host nas
  HostName ${SSH_HOST}
  User ${SSH_USER}
  StrictHostKeyChecking accept-new
  ProxyCommand python3 /tmp/socks5-proxy.py %h %p
  ConnectTimeout 20
EOF
chmod 600 ~/.ssh/config

export SSHPASS="$SSH_PASSWORD"
sshpass -e ssh nas 'echo OK; hostname; whoami'
```

키 인증을 쓰면 `sshpass` 대신:

```bash
# IdentityFile 을 config에 넣고
ssh nas 'hostname'
```

### 5) 원격에서 자주 쓰는 패턴

```bash
# 일회성 스크립트
export SSHPASS="$SSH_PASSWORD"
sshpass -e ssh nas 'bash -s' <<'REMOTE'
set -e
export PATH="/usr/local/bin:$PATH"
sudo -n docker ps || echo "$SSH_PASSWORD" | sudo -S docker ps
REMOTE

# 파일 전송 (tar over ssh)
tar -czf - -C ./ticket-queue-api . | sshpass -e ssh nas 'mkdir -p /volume1/docker/tools-site/ticket-queue-api && tar -xzf - -C /volume1/docker/tools-site/ticket-queue-api'
```

`sudo -n`이 안 되면 비밀번호를 stdin으로 넘깁니다. administrators 그룹이라도 `docker.sock`은 root:root인 경우가 많습니다.

---

## GitHub Actions와의 차이

자동 배포 워크플로(`.github/workflows/deploy-ticket-queue-nas.yml`)는 공식 액션을 씁니다.

```yaml
- uses: tailscale/github-action@v3
  with:
    authkey: ${{ secrets.TAILSCALE_AUTHKEY }}
- uses: appleboy/ssh-action@v1.2.0
  with:
    host: ${{ secrets.NAS_SSH_HOST }}
    username: ${{ secrets.NAS_SSH_USER }}
    key: ${{ secrets.NAS_SSH_KEY }}
```

Actions 러너에는 TUN이 있어서 userspace/SOCKS 우회가 필요 없습니다.  
**Cloud Agent 대화형 세션**만 이 문서의 userspace 방식이 필요합니다.

---

## 공인 도메인 참고

- DSM UI: `https://ohola.synology.me:5012/`
- API (포트포워드 시): `http://ohola.synology.me:8790/health`
- NAS 방화벽: 사설망 + **KR/TW** 허용 → 해외 Cloud IP는 DSM/8790이 `Connection reset` 될 수 있음
- 그래서 배포·SSH는 **Tailscale 경로**가 맞고, 브라우저(한국)는 공인 URL을 쓰면 됩니다

---

## 체크리스트 / 트러블슈팅

| 증상 | 조치 |
|------|------|
| `kex_exchange_identification: Connection reset` | Tailscale 미연결 또는 SOCKS 미사용 — `tailscale status`, `:1055` 확인 |
| `NeedsLogin` / Auth URL | `TS_AUTHKEY` 추가 후 새 에이전트, 또는 로그인 URL 브라우저 승인 |
| `ohola-server` offline | NAS Tailscale 앱/클라이언트 확인 |
| `permission denied ... docker.sock` | `sudo docker …` (`TQ_DOCKER_SUDO=1`) |
| `sshpass: command not found` | `apt-get install sshpass` |
| raw.githubusercontent.com 404 (머지 직후) | CDN 지연 — NAS에 이미 pull된 로컬 스크립트 실행 |

---

## 관련 문서

- [`deploy-nas-auto.md`](./deploy-nas-auto.md) — push → DSM/Actions → docker rebuild
- works-site 개념: https://github.com/Mansejin/works-site/blob/main/docs/nas-auto-deploy-explained.md

---

*실측 환경: Cursor Cloud Agent (no `/dev/net/tun`) → Tailscale userspace → Synology DS1621+ (`ohola-server`) SSH :22*
