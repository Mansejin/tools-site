# 예매 대기열 (ticket-queue) — 작업 인수인계

Cursor Cloud Agent 세션 핸드오프용.  
SSH/Tailscale 시크릿이 주입된 **새 에이전트**에서 이 문서를 기준으로 이어서 작업하면 됩니다.

관련 문서:
- [NAS 자동 배포](../ticket-queue-api/docs/deploy-nas-auto.md)
- [Cloud Agent → NAS SSH (Tailscale)](../ticket-queue-api/docs/nas-ssh-via-tailscale.md)
- [Cloudflare Tunnel](../ticket-queue-api/docs/deploy-cloudflare-tunnel.md)
- works-site 개념: https://github.com/Mansejin/works-site/blob/main/docs/nas-auto-deploy-explained.md

---

## 1. 무엇을 만들었나

KTX/SRT식 **선착순 예매 대기열**:

| 구분 | 경로 | 역할 |
|------|------|------|
| 프론트 (GitHub Pages) | `/ticket-queue/` | API 클라이언트 UI |
| 백엔드 (NAS Docker) | `ticket-queue-api/` | Redis ZSET 대기열 + SQLite 예매 저장 |
| 도구함 등록 | `data/tools.json` | `ticket-queue-api` 카드 + 열기 |

**시뮬레이터는 삭제됨.** 도구함에는 실제 API 클라이언트만 있음.

라이브:
- 프론트: https://mansejin.com/ticket-queue/
- API (HTTPS Tunnel): https://ticket-queue-api.mansejin.com
- `ticket-queue/config.json` → `https://ticket-queue-api.mansejin.com`

---

## 2. 아키텍처 (유튜버 스크립트 → 구현)

영상에서 말한 3단계:

1. **대기열** — Redis ZSET (`score=시간+seq`, `member=userId`)
2. **입장** — 스케줄러 1초마다 `ZPOPMIN` → Active (TTL)
3. **예매** — Lua로 좌석 원자 차감 → SQLite 영속 저장

추가로 들어간 것:
- HMAC `token` (요청 위조 완화)
- `clientId` 멱등 join (새로고침/연타해도 같은 줄)
- 서버가 `pollTtlSec` 내려줌 + 클라이언트 **지터**
- 스케줄러 **Redis 락** (API 여러 대여도 입장 1리더)
- `GET /bookings` + 프론트에 최근 예매 목록
- Cloudflare Tunnel HTTPS (`ticket-queue-api.mansejin.com`)

아직 없는 것 (실무 다음 단계):
- MQ → RDB (지금은 SQLite)
- 로그인 연동
- 관리자 UI (좌석수 조정 / 리셋)
- 본격 모니터링/알림

---

## 3. API 엔드포인트

Base: `https://ticket-queue-api.mansejin.com` (컨테이너 내부는 `8787`, NAS 호스트 포트 **8790** — saenggibu가 8787 사용)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | `{ ok, redis }` |
| GET | `/v1/events/:eventId/stats` | 대기/Active/좌석/영속건수 |
| GET | `/v1/events/:eventId/bookings?limit=` | SQLite 예매 목록 |
| POST | `/v1/events/:eventId/join` | body `{ clientId }` — 멱등 |
| GET | `/v1/events/:eventId/status?userId=&token=` | 순번/phase |
| POST | `/v1/events/:eventId/book` | `{ userId, token, seats }` |
| POST | `/v1/events/:eventId/admin/reset` | 테스트 초기화 (prod는 시크릿 헤더) |

로컬 검증:
```bash
cd ticket-queue-api
npm run smoke
USERS=1000 npm run loadtest
```

---

## 4. 배포 방식 (이미 세팅됨)

```
git push origin main
        ↓
   ┌────┴────┐
프론트         API
GitHub Pages   Synology NAS (Docker)
mansejin.com   ohola-server :8790
               + cloudflared → ticket-queue-api.mansejin.com
```

- `ticket-queue-api/**` 변경 시에만 NAS docker rebuild
- 비밀값은 **NAS `ticket-queue-api/.env`만** (깃에 커밋 금지)
- Tunnel 자격증명: NAS `ticket-queue-api/cloudflared/{config.yml,credentials.json}` (깃 커밋 금지)
- DSM 스케줄러 및/또는 Actions + Tailscale (`deploy-ticket-queue-nas.yml`)

접속 URL:

| 경로 | URL |
|------|-----|
| 공인 HTTPS (Tunnel) | `https://ticket-queue-api.mansejin.com` |
| LAN | `http://192.168.0.230:8790` |
| Tailscale MagicDNS | `http://ohola-server:8790` |
| 공인(포트포워드, 해외 차단될 수 있음) | `http://ohola.synology.me:8790` |
| 프론트 | https://mansejin.com/ticket-queue/ |

---

## 5. 참고 / 남은 운영 이슈

### 5-1. 집/해외에서 공인 HTTP
- `ohola.synology.me:8790` → Cloud/해외에서 `Connection reset` 가능 (NAS 방화벽 KR/TW 위주)
- **해결됨:** Pages → API 는 Tunnel HTTPS (`ticket-queue-api.mansejin.com`) 사용

### 5-2. Cloudflare Tunnel — **라이브**
- 터널 이름: `ticket-queue-api-nas`
- 호스트: `ticket-queue-api.mansejin.com`
- NAS compose: `docker-compose.yml` + `docker-compose.cloudflare-login.yml`
- Synology ACL 때문에 cloudflared는 `user: "0:0"` 로 실행
- 재프로비저닝: `login-and-apply-cloudflare-via-ssh.sh` (브라우저 Authorize 1회)

### 5-3. Actions 배포
- 워크플로 YAML 수정 머지 완료
- GitHub Secrets (`NAS_SSH_*`, `TAILSCALE_AUTHKEY`)가 저장소에 있어야 Actions 경로가 동작

---

## 6. 진행 상태

### A. Tailscale SSH로 NAS 확인 — **완료**
- health `{"ok":true,"redis":true}`
- 컨테이너 `ticket-queue-api` / `ticket-queue-redis` Up
- DSM 스케줄러 `ticket-queue-api-auto-pull` (id=22, 10분) enabled

### B. Cloudflare Tunnel — **완료 (라이브)**
- 공개 health: `https://ticket-queue-api.mansejin.com/health` → `{"ok":true,"redis":true}`
- 컨테이너 `ticket-queue-tunnel` Up
- `config.json` 기본값 → `https://ticket-queue-api.mansejin.com`

### C. 기능 이어서 (다음)
- 관리자: 좌석수 조정 / 리셋 UI
- 로그인 연동
- 모니터링(대기 인원·에러)

---

## 7. 주요 파일

```
ticket-queue/                 # Pages 클라이언트
  index.html
  ticket-queue.js             # clientId, jitter, bookings UI
  config.json                 # apiBase 기본값 (HTTPS Tunnel)
ticket-queue-api/
  src/queueService.js         # join/status/book
  src/db.js                   # SQLite bookings
  src/scheduler.js            # Redis leader lock
  docker-compose.yml          # host 8790, data volume
  docker-compose.cloudflare-login.yml  # credentials-file tunnel (+ Synology user 0:0)
  docker-compose.cloudflare.yml        # TUNNEL_TOKEN 대안
  docs/deploy-nas-auto.md
  docs/nas-ssh-via-tailscale.md
  docs/deploy-cloudflare-tunnel.md
  scripts/nas-docker-update.sh
  scripts/nas-dsm-task.sh
  scripts/login-and-apply-cloudflare-via-ssh.sh
.github/workflows/deploy-ticket-queue-nas.yml
data/tools.json
```

---

## 8. 한 줄 상태

> **NAS health·스케줄러·자동배포·Cloudflare Tunnel HTTPS 모두 동작 중.**  
> **공개 API:** https://ticket-queue-api.mansejin.com/health  
> **다음 기능:** 관리자 UI / 로그인 / 모니터링

---

*작성: Cloud Agent 세션 핸드오프 · 저장소 Mansejin/tools-site*
