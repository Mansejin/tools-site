# 시험 작성 도구 — 로컬 웹 UI

기존 CLI(`../exam-tools/`)를 FastAPI로 감싼 교사용 로컬 웹 앱입니다.
기본 입력은 **한글 `.hwpx`** 입니다. 과목을 가리지 않습니다.
시험지 **형식 파악(구조 분석)은 관리자 CLI** 가 담당하고, 사용자 탭에는 없습니다.

Windows 전체 안내: [../README.md](../README.md) · 헬퍼: [../run-web.ps1](../run-web.ps1)

## 환경

Python 3.10+ / UTF-8

```powershell
cd path\to\edu_works\exam-tools-web
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

형제 폴더 `exam-tools/` 가 같은 `edu_works/` 아래에 있어야 합니다(스크립트를 import).

## 실행

```powershell
cd path\to\edu_works
.\run-web.ps1
```

브라우저: `http://127.0.0.1:8765/` · 헬스: `/health`

탭: `?tab=extract|shuffle|omr|hwpx|keywords`  
관리자 구조 분석(숨김): `?tab=structure`

## 도구

| 탭 | 기능 | 결과 |
|----|------|------|
| 1. 문항 추출·분류 | `.hwpx` / 텍스트 (±과목 팩 JSON) | `classified_questions.xlsx` |
| 2. A/B형 셔플 | 시험 .xlsx | `exam_forms_AB.zip` |
| 3. OMR 정답지 | 문항번호·정답 .xlsx | `omr_answers.xlsx` |
| 4. HWPX 채우기 | 언팩 .zip + json/xlsx | `filled_exam.hwpx` |
| 5. 키워드 매칭 | 지문 + 주제 사전 JSON | 결과 표 + 추정 주제 |

예시 과목 팩: `/packs/ethics_and_thought.json`

## CLI 원본

[exam-tools/README.md](../exam-tools/README.md)
