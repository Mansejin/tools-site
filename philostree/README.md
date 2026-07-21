# PhilosTree

철학적 사유를 문명(Civilization) 기술 트리처럼 차분하게 정리하는 웹앱.

## 좌표 모델

- **좌→우 (깊이)**: 전제 → 핵심 → 결론
- **상하 (방향)**: 주제·관점 분기
- **중앙 근접 (중요도)**: 핵심 가치일수록 Y축 중앙에 배치

## 개발

```bash
cd philostree
npm install
npm run dev
```

브라우저에서 http://localhost:5180 접속

## 빌드

```bash
npm run build
npm run preview
```

## 기능 (MVP)

- 3축 레이아웃 (depth / direction / importance)
- 노드 CRUD + 카테고리/태그/본문 편집
- Inbox 빠른 캡처 → 배치
- Calm mode (선택 노드 주변만 강조)
- IndexedDB 자동 저장
- JSON import/export
- 자유의지 탐구 샘플 맵
