# ticket-queue-api

명절 예매식 **선착순 대기열 백엔드** (1차 목표: 동시 대기 ~1,000명).

GitHub Pages 프론트(`/ticket-queue/`)와 따로 둡니다. Redis + Node API.

## 구조

1. `POST /join` `{ clientId }` → Redis ZSET 대기열 (같은 clientId면 재입장, 줄 유지)
2. `GET /status` → `ZRANK`/`ZCARD`로 순번, 서버가 `pollTtlSec` 내려줌
3. 스케줄러(1초) → `ZPOPMIN` N명 → Active (TTL)
4. `POST /book` → Lua 좌석 원자 차감 + **SQLite 영속 저장**
5. `GET /bookings` → 저장된 예매 목록

## 빠른 시작

```bash
# Redis (로컬)
redis-server --daemonize yes

cd ticket-queue-api
cp .env.example .env
npm install
npm start
```

다른 터미널:

```bash
npm run smoke
USERS=1000 npm run loadtest
```

Docker:

```bash
docker compose up --build
```

NAS 자동 배포(works-site와 동일 패턴): [`docs/deploy-nas-auto.md`](docs/deploy-nas-auto.md)

## API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 |
| GET | `/v1/events/:eventId/stats` | 대기/입장/좌석 요약 |
| POST | `/v1/events/:eventId/join` | 대기열 입장 |
| GET | `/v1/events/:eventId/status?userId=&token=` | 순번/상태 폴링 |
| POST | `/v1/events/:eventId/book` | `{ userId, token, seats }` 예매 |
| POST | `/v1/events/:eventId/admin/reset` | 테스트용 초기화 |

## 기본 설정 (1천 명용)

| 환경변수 | 기본 | 의미 |
|----------|------|------|
| `SEATS_TOTAL` | 200 | 잔여 좌석 |
| `ADMIT_PER_SEC` | 40 | 초당 Active 입장 수 |
| `ACTIVE_TTL_SEC` | 180 | 입장 후 예매 제한(초) |
| `MAX_QUEUE` | 5000 | 대기+Active 상한 |
| `TOKEN_SECRET` | (필수 변경) | 토큰 HMAC 비밀키 |

## 프론트 연결

도구함 시뮬 페이지에서:

`https://mansejin.com/ticket-queue/?api=http://127.0.0.1:8787`

로컬 CORS는 기본 `*` 입니다. 배포 시 `CORS_ORIGIN`을 프론트 도메인으로 잠그세요.

## 다음에 키울 때

- Redis 단일 인스턴스 → 클러스터 / 이벤트별 키 분리
- API 수평 확장 (스케줄러는 리더 1대만)
- 예매 성공 후 MQ → DB
- 결제/좌석 지정은 별도 저트래픽 구간
