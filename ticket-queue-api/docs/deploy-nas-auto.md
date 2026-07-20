# ticket-queue-api NAS 자동 배포

개념·흐름은 works-site와 같습니다:  
https://github.com/Mansejin/works-site/blob/main/docs/nas-auto-deploy-explained.md

`git push`만 하면 NAS가 `ticket-queue-api/`를 pull하고, **API 코드가 바뀐 경우에만** `docker compose up -d --build` 합니다.  
(프론트 `/ticket-queue/`만 바뀐 push는 GitHub Pages만 갱신되고 NAS는 스킵)

| 방식 | 속도 | 난이도 |
|------|------|--------|
| **A. DSM 작업 스케줄러** | 최대 10분 | 쉬움 (추천) |
| **B. GitHub Actions + Tailscale** | 1~3분 | 보통 (works-site / sgb Secrets 재사용) |

---

## 사전 준비 (한 번)

NAS에 **tools-site 전체** git clone:

```bash
cd /volume1/docker
# 기존 폴더만 복사본이 있으면 백업 후 제거
mv ticket-queue-api ticket-queue-api.bak 2>/dev/null || true

git clone https://github.com/Mansejin/tools-site.git tools-site
cd tools-site/ticket-queue-api
cp .env.example .env
# .env 편집 — TOKEN_SECRET, CORS_ORIGIN, TICKET_QUEUE_HOST_PORT=8790
# (8787은 saenggibu-gateway가 사용 중)
docker compose up -d --build
```

`.env` 권장:

```env
TICKET_QUEUE_HOST_PORT=8790
TQ_DEPLOY_BRANCH=main
TQ_DOCKER_SUDO=1
TOKEN_SECRET=…랜덤값…
CORS_ORIGIN=https://mansejin.com
```

헬스: `http://127.0.0.1:8790/health` → `{"ok":true,"redis":true}`

---

## A. DSM 작업 스케줄러 (가장 확실)

### 1. 스크립트 복사

```bash
curl -fsSL https://raw.githubusercontent.com/Mansejin/tools-site/main/ticket-queue-api/scripts/nas-dsm-task.sh \
  -o /volume1/docker/tools-site/ticket-queue-api/scripts/nas-dsm-task.sh
chmod +x /volume1/docker/tools-site/ticket-queue-api/scripts/nas-dsm-task.sh
```

### 2. DSM → 작업 스케줄러

| 항목 | 값 |
|------|-----|
| 이름 | `ticket-queue-api-auto-pull` |
| 사용자 | **root** |
| 일정 | 10분마다 (또는 5분) |
| 명령 | `sh /volume1/docker/tools-site/ticket-queue-api/scripts/nas-dsm-task.sh` |

### 3. 이후

```
ticket-queue-api/ 수정 → git push → (최대 10분) → NAS 반영
```

로그:

- `/volume1/docker/tools-site/ticket-queue-api/logs/scheduled-pull.log`
- `/volume1/docker/tools-site/ticket-queue-api/logs/deploy.log`

---

## B. GitHub Actions + Tailscale (push 후 1~3분)

works-site / sgb에 쓰는 Secrets를 **tools-site 저장소에 그대로** 넣으면 됩니다.

| Secret | 값 |
|--------|-----|
| `TAILSCALE_AUTHKEY` | Tailscale ephemeral/reusable key |
| `NAS_SSH_HOST` | NAS Tailscale IP (`100.x.x.x`) |
| `NAS_SSH_USER` | SSH 사용자 |
| `NAS_SSH_KEY` | SSH private key 전체 |
| `NAS_REPO_PATH` | `/volume1/docker/tools-site` |

`ticket-queue-api/**` 경로가 바뀐 `main` push에만 실행됩니다.

수동: Actions → **Deploy ticket-queue-api to NAS** → Run workflow

---

## 수동 배포 (긴급)

NAS SSH:

```bash
cd /volume1/docker/tools-site
sh ticket-queue-api/scripts/nas-docker-update.sh
```

강제 재빌드:

```bash
sh ticket-queue-api/scripts/nas-docker-update.sh --full-build
```

---

## 접속 URL

| 경로 | URL |
|------|-----|
| LAN | `http://192.168.0.230:8790` |
| Tailscale | `http://ohola-server:8790` |
| 공인(KR, 포트포워드 시) | `http://ohola.synology.me:8790` |
| 프론트 연결 | `https://mansejin.com/ticket-queue/?api=http://ohola.synology.me:8790` |

---

## 문제 해결

| 증상 | 해결 |
|------|------|
| `no .git in ...` | `git clone`으로 **tools-site 전체** 받기 (ticket-queue-api 폴더만 복사 X) |
| `cannot access docker daemon` | DSM 작업 사용자 **root**, 또는 `.env`에 `TQ_DOCKER_SUDO=1` |
| port already allocated 8787 | `TICKET_QUEUE_HOST_PORT=8790` (saenggibu와 충돌) |
| push 했는데 API 안 바뀜 | `deploy.log` 확인, `ticket-queue-api/` 경로 포함 여부 |

---

## 관련 파일

- `ticket-queue-api/scripts/nas-docker-update.sh` — pull + 조건부 docker rebuild
- `ticket-queue-api/scripts/nas-dsm-task.sh` — DSM 스케줄러용
- `.github/workflows/deploy-ticket-queue-nas.yml` — Actions (Tailscale + SSH)
- [`nas-ssh-via-tailscale.md`](./nas-ssh-via-tailscale.md) — Cloud Agent에서 NAS SSH 접속 방법 (userspace Tailscale + SOCKS5)
