# Upbit Strategy Toolkit — KRW-BTC 백테스트

업비트 공식 [upbit-strategy-toolkit](https://github.com/upbit-official/upbit-strategy-toolkit)으로
전략 JSON 작성·백테스트만 수행합니다. (실주문/라이브 매매 없음)

## 구성

```text
upbit-backtest/
|-- strategies/          # 전략 JSON
|-- reports/             # 백테스트 CSV 리포트
`-- cache/upbit/         # 캔들 캐시 (gitignore)
```

Cursor 스킬은 프로젝트 루트 `.agents/skills/` (setup / create-strategy / backtest)에 설치되어 있습니다.

## 전략

| slug | 파일 | 시장 | TF |
|------|------|------|-----|
| sma-5-20-golden-cross | `strategies/sma-5-20-golden-cross.json` | KRW-BTC | 1d |

- **가설**: SMA(5)가 SMA(20)을 상향 돌파하면 단기 상승 추세가 이어지는 경향이 있다.
- **매수**: SMA5 cross_above SMA20
- **매도**: SMA5 cross_below SMA20
- **손절/익절**: -5% / +15%

## 재실행

```bash
# uv 필요: curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
WRAPPER=.agents/skills/backtest/scripts/upbit-strategy-toolkit.sh

bash "$WRAPPER" strategy validate upbit-backtest/strategies/sma-5-20-golden-cross.json
bash "$WRAPPER" backtest run upbit-backtest/strategies/sma-5-20-golden-cross.json \
  --start 2025-07-26 --end 2026-07-26
```

`config set data-dir`이 `/workspace/upbit-backtest`로 설정되어 있을 수 있습니다.
환경이 다르면 `UPBIT_TOOLKIT_DATA_DIR`로 덮어쓰거나 cwd에서 실행하세요.
