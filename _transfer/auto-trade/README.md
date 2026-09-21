# auto-trade

업비트 자동매매 봇 (Docker / VPS 24시 가동)

## 역할 분리

| 영역 | 도구 |
|------|------|
| 전략·백테스트 | [upbit-strategy-toolkit](https://github.com/upbit-official/upbit-strategy-toolkit) |
| 실전 자동매매 | 이 레포 (Docker on Oracle Cloud) |

## 현재 인프라

- VPS: Oracle Cloud Always Free (`VM.Standard.E2.1.Micro`, Osaka)
- OS: Ubuntu 24.04
- 런타임: Docker + Compose
- 업비트 API: 자산조회 / 주문조회 / 주문하기 (출금 권한 OFF)

## 디렉터리

```text
strategies/   # toolkit에서 검증한 전략 JSON
bot/          # 자동매매 런타임 (페이퍼 → 실주문)
reports/      # 백테스트/실행 리포트 (gitignore)
```

## 보안

- API 키는 `.env`에만 보관 (커밋 금지)
- Secret Key를 채팅/이슈에 올리지 말 것
- 업비트 허용 IP = VPS 공인 IP (+ 필요 시 집 IP)

## 다음 단계

1. Docker 설치 확인 (`docker ps`)
2. 봇 스켈레톤 + `docker compose`
3. 페이퍼 모드 가동
4. 소액 실주문
