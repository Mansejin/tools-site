# ticket-queue-api Cloudflare Tunnel (HTTPS)

목표: `https://ticket-queue-api.mansejin.com`  
→ Pages에서 mixed content 없이 API 호출

---

## 추천: 브라우저 로그인 한 번 (API 토큰 불필요)

`cloudflared tunnel login`은 **Cloudflare 쪽 콜백**을 쓰므로, Cloud Agent처럼 localhost가 안 되는 환경에서도 Tailscale처럼 URL만 열어주면 됩니다.

### Cloud Agent에서

1. Tailscale SSH가 되는 상태 (기존 Secrets)
2. 실행:

```bash
sh ticket-queue-api/scripts/login-and-apply-cloudflare-via-ssh.sh
```

3. 터미널에 나온 `https://dash.cloudflare.com/argotunnel?...` 링크를 브라우저에서 열고 **mansejin.com 존** 선택
4. 스크립트가 터널 생성 → DNS → NAS에 credentials 복사 → compose up까지 진행

### NAS에서 직접

```bash
cd /volume1/docker/tools-site
sh ticket-queue-api/scripts/login-and-provision-cloudflare-tunnel.sh
```

확인:

```bash
curl -sS https://ticket-queue-api.mansejin.com/health
```

이후 `nas-docker-update.sh`는 `cloudflared/credentials.json`이 있으면 login 오버레이까지 같이 올립니다.

---

## 대안 A: API 토큰 자동화

대시보드에서 **API Token**(Tunnel Edit + DNS Edit)만 한 번 만들고:

```bash
export CLOUDFLARE_API_TOKEN=...
sh ticket-queue-api/scripts/apply-cloudflare-tunnel-nas.sh
```

→ `provision-cloudflare-tunnel.mjs`가 터널·DNS·`CLOUDFLARE_TUNNEL_TOKEN`을 기록 후 token 오버레이 compose.

Cursor Secrets에 `CLOUDFLARE_API_TOKEN`을 넣어 두면 다음 에이전트부터 로그인 없이 가능합니다.

---

## 대안 B: 완전 수동

1. Zero Trust → Tunnels → Create  
2. Hostname `ticket-queue-api.mansejin.com` → `http://api:8787`  
3. Install token → NAS `.env`의 `CLOUDFLARE_TUNNEL_TOKEN`  
4. `docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d`

---

## Compose 오버레이

| 파일 | 모드 |
|------|------|
| `docker-compose.cloudflare-login.yml` | `cloudflared login` credentials (추천) |
| `docker-compose.cloudflare.yml` | `TUNNEL_TOKEN` 원격 관리 터널 |

비밀 파일(`cloudflared/credentials.json`, `cert.pem`)은 git에 넣지 마세요. (`cloudflared/.gitignore` 처리됨)

---

## 관련 스크립트

| 스크립트 | 역할 |
|----------|------|
| `login-and-provision-cloudflare-tunnel.sh` | 브라우저 로그인 → tunnel/DNS → 로컬/NAS bundle |
| `login-and-apply-cloudflare-via-ssh.sh` | 위 + SCP/SSH로 NAS 반영 (Cloud Agent용) |
| `provision-cloudflare-tunnel.mjs` | API 토큰으로 tunnel/DNS/token |
| `apply-cloudflare-tunnel-nas.sh` | API 토큰 경로 NAS 적용 |
