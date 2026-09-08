# siyan-upload-api

감시 폴더에 시안 영상이 들어오면 **피드백용 YouTube 채널**에 자동 업로드합니다.  
Synology NAS에서 Docker로 상시 가동 (`ticket-queue-api`와 같은 패턴).

## 동작

```
NAS 공유폴더 (시안)  →  파일 안정화 대기  →  YouTube 업로드(unlisted)  →  done/ 이동
                                              └ 실패 시 fail/
```

- 확장자: `.mp4 .mov .mkv .m4v .avi .webm` (설정 가능)
- 복사 중 파일은 크기 변화 없을 때까지 대기 (`STABLE_MS`)
- 이미 성공한 경로는 재업로드하지 않음
- 선택: 재생목록(`PLAYLIST_ID`)에 자동 추가

## API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 + YouTube 설정 여부 + 큐 |
| GET | `/v1/jobs` | 최근 작업 목록 |
| GET | `/v1/jobs/:id` | 작업 상세 |
| POST | `/v1/scan` | 감시 폴더 재스캔 (`x-admin-secret`) |
| POST | `/v1/upload` | `{ filePath }` 수동 큐 (`x-admin-secret`) |

## 1회 설정: YouTube OAuth

피드백 채널 Google 계정으로 진행합니다.

1. [Google Cloud Console](https://console.cloud.google.com/) 프로젝트 생성
2. **YouTube Data API v3** 사용 설정
3. OAuth 동의 화면 (External / 테스트 사용자에 본인 계정 추가)
4. 사용자 인증 정보 → **OAuth 클라이언트 ID** → 애플리케이션 유형 **데스크톱 앱**
5. Client ID / Secret 복사

로컬(브라우저 있는 PC):

```powershell
cd siyan-upload-api
npm install
# Google Cloud에서 받은 client_secret*.json 사용 (receipt-bot 프로젝트 OK)
npm run auth -- --credentials "$env:USERPROFILE\Downloads\client_secret....json"
# 또는 credentials/client_secret.json 에 복사 후: npm run auth
```

브라우저에서 **피드백 채널 계정**으로 로그인 → 터미널에 `YT_CLIENT_ID` / `YT_CLIENT_SECRET` / `YT_REFRESH_TOKEN` 출력 → NAS `.env`에 넣기.

> 테스트 모드면 7일 후 refresh token이 만료될 수 있습니다. 장기 운영은 OAuth 앱 게시(또는 테스트 사용자 유지 + 필요 시 재발급)를 권장합니다.

## NAS 배포

```bash
cd /volume1/docker/tools-site   # 기존 clone 기준
cd siyan-upload-api
cp .env.example .env
# .env 편집: OAuth 토큰, SIYAN_WATCH_HOST 등
mkdir -p /volume1/video/siyan /volume1/video/siyan-done /volume1/video/siyan-fail
docker compose up -d --build
```

헬스: `http://127.0.0.1:8800/health`

시안 영상을 `04. 콘텐츠/_시안_inbox/` 에 넣으면 업로드됩니다. 성공 시 `_시안_done/`, 실패 시 `_시안_fail/`.

## 로컬 개발

```bash
mkdir -p ./watch ./done ./fail ./data
WATCH_DIR=./watch DONE_DIR=./done FAIL_DIR=./fail DATA_DIR=./data npm run dev
```

## 환경변수 요약

| 변수 | 기본 | 의미 |
|------|------|------|
| `PRIVACY_STATUS` | `unlisted` | 피드백용 비공개 링크 |
| `TITLE_TEMPLATE` | `{name}` | 파일명(확장자 제외) |
| `STABLE_MS` | `8000` | 복사 완료 판정 |
| `PLAYLIST_ID` | (빈값) | 재생목록 추가 |
| `ADMIN_SECRET` | (빈값) | 있으면 scan/upload 보호 |

폴더 경로는 `docker-compose.yml`의 `SIYAN_WATCH_HOST` / `DONE` / `FAIL` 로 NAS 실제 공유 경로에 맞추면 됩니다.
