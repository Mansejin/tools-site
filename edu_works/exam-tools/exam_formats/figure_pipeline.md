# 그림 문항 분석 · 재생성 파이프라인

마이일타 윤사 HWPX의 그림은 `BinData/imageN.(png|jpg)` + `section0.xml`의 `<hp:pic>`/`binaryItemIDRef`로 붙는다.

## 1) 오류 없이 분석하는 방법

```
HWPX
 └─ extract BinData 이미지
 └─ (선택) 주변 문단 텍스트
      ↓
 Vision API (GPT-4.1 / Claude 등)
      ↓
 figure JSON  (type, labels, regions, ocr, reproduce_recipe)
      ↓
 문항 IR과 결합 (줄기·선지·정답)
```

구현:
- `hwpx.vision_analyze.extract_bindata_images`
- `hwpx.vision_analyze.analyze_image_gemini` — 기본 모델 `gemini-3.8-flash`
- 키: `GEMINI_API_KEY` (`exam-tools/.env` 또는 `dddit-premiere-plugin/.env`)

프롬프트는 고정 스키마 JSON만 받게 해서 OCR 환각을 줄인다.  
표·벤다이어그램·순서도는 **템플릿 ID**로 분류한 뒤, 텍스트만 API로 채운다.

```powershell
# .env에 GEMINI_API_KEY 있으면 그대로
python -c "from hwpx.vision_analyze import analyze_image_gemini; import json; print(json.dumps(analyze_image_gemini(r'output/yunsa_venn.png'), ensure_ascii=False, indent=2))"
```

## 2) 같은 유형을 다시 제작하는 방법

| 우선순위 | 방법 | 언제 |
|----------|------|------|
| 1 | 프로그램 템플릿 (`hwpx.figures`) | 벤다이어그램·순서도 등 정형 |
| 2 | Vision이 준 `reproduce_recipe` → 템플릿 파라미터 | 표준형 변형 |
| 3 | 이미지 생성 API (DALL·E / Flux 등) | 지도·사진·비정형 |
| 4 | 한글에서 그린 뒤 BinData 교체 | 최종 교정 |

정형 그림은 API보다 **코드 렌더**가 오류가 적다 (윤사 갑/을 벤다이어그램·탐구 순서도).

```powershell
python -m hwpx make-yunsa-sample
# → output/yunsa_sample_q1.hwpx
```

## 3) HWPX에 넣는 법

`hwpx.build_exam.write_question_hwpx`:
1. PNG 생성 (`figures.render_venn_gap_eul`)
2. `BinData/image1.png` + `content.hpf` manifest
3. `section0.xml`에 줄기 다음 `<hp:pic binaryItemIDRef="image1">`
4. ①~⑤ 선지 문단

코퍼스에서 확인된 참조 방식과 동일하다.
