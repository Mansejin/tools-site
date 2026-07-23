# 오프닝 드릴 (chess-app)

체닷 500→1000용 오프닝 레퍼토리 드릴. 이론이 끝나면 Stockfish(또는 폴백 연습봇)과 이어칩니다.

## 개발

```powershell
cd chess-app
npm install
npm run openings   # Lichess ECO 데이터 갱신
npm run dev        # http://localhost:5190/toys/chess/
```

## 빌드 (toys에 배포 산출물)

```powershell
npm run build
```

결과는 `toys/chess/` 로 출력됩니다. GitHub Pages에 push하면 `/toys/chess/` 로 서빙됩니다.

## 구성

| 역할 | 기술 |
|------|------|
| 보드 | `react-chessboard` |
| 룰 | `chess.js` |
| 엔진 | Stockfish WASM (CDN lite) + 폴백 minimax |
| 오프닝 | [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (CC0) |

추천 레퍼토리: 이탈리안 / 런던 / 스칸디 / 카로칸 / QGD
