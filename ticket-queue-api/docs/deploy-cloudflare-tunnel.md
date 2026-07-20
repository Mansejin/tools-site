# ticket-queue-api Cloudflare Tunnel (HTTPS)

works-api / sgb와 같은 패턴으로, 포트포워드 없이 **HTTPS 공개 API**를 엽니다.

목표 URL: `https://ticket-queue-api.mansejin.com`  
→ GitHub Pages(`https://mansejin.com/ticket-queue/`)에서 mixed content 없이 호출 가능

---

## 1. Cloudflare Zero Trust에서 터널 만들기

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → **Networks** → **Tunnels** → **Create a tunnel**
2. Connector: **Cloudflared**
3. 이름 예: `ticket-queue-api-nas`
4. **Public Hostname** 추가:

| 항목 | 값 |
|------|-----|
| Subdomain | `ticket-queue-api` |
| Domain | `mansejin.com` |
| Type | HTTP |
| URL | `http://api:8787` |

> Compose 서비스명이 `api`이고 컨테이너 포트가 `8787`입니다. 호스트 포트 `8790`이 아닙니다.

5. Install 화면에 나오는 **Tunnel token** (`eyJ…`) 복사

DNS는 보통 터널이 `ticket-queue-api` CNAME → `xxxx.cfargotunnel.com` (Proxied) 로 자동 생성합니다.  
가비아/외부 DNS를 쓰면 같은 CNAME을 수동으로 넣습니다.

---

## 2. NAS `.env`에 토큰

```bash
# /volume1/docker/tools-site/ticket-queue-api/.env
CLOUDFLARE_TUNNEL_TOKEN=eyJ...   # 깃에 커밋 금지
CORS_ORIGIN=https://mansejin.com,http://localhost:8080,http://127.0.0.1:8080
```

---

## 3. 터널 포함 compose 기동

```bash
cd /volume1/docker/tools-site/ticket-queue-api
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d --build
docker ps | grep ticket-queue
curl -sS https://ticket-queue-api.mansejin.com/health
# {"ok":true,"redis":true}
```

자동 배포 스크립트(`nas-docker-update.sh`)는 기본적으로 `docker-compose.yml`만 올립니다.  
터널을 켠 뒤에는 NAS에서 위 오버레이 명령을 한 번 쓰거나, `.env`에 플래그를 두고 스크립트를 확장하면 됩니다.

---

## 4. 프론트 연결

`ticket-queue/config.json`:

```json
{
  "apiBase": "https://ticket-queue-api.mansejin.com",
  "eventId": "demo"
}
```

또는 URL: `https://mansejin.com/ticket-queue/?api=https://ticket-queue-api.mansejin.com`

---

## 5. 기존 saenggibu 터널 재사용?

가능은 하지만 **권장하지 않습니다.**  
토큰/호스트명은 터널 단위로 Cloudflare 대시보드에서 관리됩니다.  
ticket-queue용 터널(또는 같은 터널에 Public Hostname만 추가)을 대시보드에서 만들고, 여기 Compose의 `TUNNEL_TOKEN`만 맞추는 편이 안전합니다.

같은 터널에 hostname만 추가하는 경우:

1. Zero Trust → 해당 Tunnel → Public Hostname에 `ticket-queue-api` → `http://HOST:8790` (호스트 네트워크)  
   또는 ticket-queue 컨테이너를 그 터널과 **같은 Docker network**에 붙인 뒤 `http://ticket-queue-api:8787`
2. 이 저장소의 `docker-compose.cloudflare.yml`은 생략 가능

---

## 관련 파일

- `docker-compose.cloudflare.yml`
- `docs/deploy-nas-auto.md`
- `ticket-queue/config.json`
