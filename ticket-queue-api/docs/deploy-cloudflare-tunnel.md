# ticket-queue-api Cloudflare Tunnel (HTTPS)

목표: `https://ticket-queue-api.mansejin.com`  
→ Pages(`https://mansejin.com/ticket-queue/`)에서 mixed content 없이 호출

대시보드에서 토큰을 복사·붙여넣기 할 필요 없이, **API 토큰 한 번만** 넣으면 스크립트가 터널·DNS·NAS `.env`까지 처리합니다.

---

## 추천: API로 한 번에 프로비저닝

### 1) Cloudflare API 토큰 (1회)

https://dash.cloudflare.com/profile/api-tokens → **Create Token**

| 범위 | 권한 |
|------|------|
| Account → Cloudflare Tunnel | Edit |
| Zone → DNS | Edit |

Zone 리소스는 `mansejin.com`으로 제한해도 됩니다.

### 2) 시크릿 / 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `CLOUDFLARE_API_TOKEN` | ✅ | 위 API 토큰 |
| `CLOUDFLARE_ACCOUNT_ID` | 계정 여러 개면 | 대시보드 URL의 account id |
| `CLOUDFLARE_ZONE_ID` | 선택 | 없으면 `mansejin.com`으로 조회 |
| `CF_HOSTNAME` | 선택 | 기본 `ticket-queue-api.mansejin.com` |
| `CF_TUNNEL_NAME` | 선택 | 기본 `ticket-queue-api-nas` |
| `CF_ORIGIN_SERVICE` | 선택 | 기본 `http://api:8787` (compose 서비스명) |

Cursor Secrets 또는 NAS 셸 export에 넣으면 됩니다. **터널 런타임 토큰(`eyJ…`)은 커밋하지 마세요** — 스크립트가 NAS `.env`에만 씁니다.

### 3) 실행

**NAS에서 (가장 단순):**

```bash
export CLOUDFLARE_API_TOKEN=...
# 선택: export CLOUDFLARE_ACCOUNT_ID=...
cd /volume1/docker/tools-site
sh ticket-queue-api/scripts/apply-cloudflare-tunnel-nas.sh
```

이 스크립트가 하는 일:

1. Cloudflare에 터널 생성(또는 이름 재사용)
2. Ingress: `ticket-queue-api.mansejin.com` → `http://api:8787`
3. DNS CNAME (Proxied) 생성/갱신
4. NAS `.env`에 `CLOUDFLARE_TUNNEL_TOKEN=` 기록
5. `docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d`

**로컬 / Cloud Agent에서 토큰만 받기:**

```bash
export CLOUDFLARE_API_TOKEN=...
node ticket-queue-api/scripts/provision-cloudflare-tunnel.mjs --write-env /tmp/tq.env
# 또는
node ticket-queue-api/scripts/provision-cloudflare-tunnel.mjs --print-token
```

확인:

```bash
curl -sS https://ticket-queue-api.mansejin.com/health
# {"ok":true,"redis":true}
```

이후 `nas-docker-update.sh`는 `.env`에 `CLOUDFLARE_TUNNEL_TOKEN`이 있으면 오버레이 compose까지 같이 올립니다.

---

## 수동 (대시보드) — 참고용

스크립트 없이 할 때:

1. Zero Trust → Tunnels → Create (`ticket-queue-api-nas`)
2. Public Hostname: `ticket-queue-api` / `mansejin.com` → `http://api:8787`
3. Install 화면의 token을 NAS `.env`의 `CLOUDFLARE_TUNNEL_TOKEN`에 넣기
4. `docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d`

---

## 프론트

`ticket-queue/config.json` 기본값:

```json
{
  "apiBase": "https://ticket-queue-api.mansejin.com",
  "eventId": "demo"
}
```

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `scripts/provision-cloudflare-tunnel.mjs` | CF API: tunnel + DNS + token |
| `scripts/apply-cloudflare-tunnel-nas.sh` | 위 + NAS `.env` + compose up |
| `docker-compose.cloudflare.yml` | `cloudflared` 컨테이너 |
| `scripts/nas-docker-update.sh` | 토큰 있으면 오버레이 포함 rebuild |
