# 윤리와사상 시험 도구 모음 (Python)

2022 교육과정 「윤리와사상」 고등학교 시험 업무용 CLI 스크립트입니다.
단원·사상가 키워드는 `curriculum_keywords.py`에서 일괄 편집합니다.
로컬 웹 UI: [../exam-tools-web/](../exam-tools-web/) (`uvicorn app:app --host 127.0.0.1 --port 8765`).
웹 UI 기본 탭은 **0. 구조 분석** — 옛 시험 `.hwpx`를 올리면 구조를 읽고 다음 탭을 안내합니다.

Windows에서 전체 안내: [../README.md](../README.md)

## 환경

```powershell
cd path\to\edu_works\exam-tools
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

```bash
cd edu_works/exam-tools
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Python 3.10+ / UTF-8 기준입니다.

## 스크립트

### 0. `analyze_exam_structure.py` — 과거 시험 구조 분석

예전에 낸 중간고사 **`.hwpx`(권장)** / `.txt` / `.xlsx` / `.zip` 을 넣어 문항 수·선지 표기·Excel 열 매핑·플레이스홀더를 파악하고, 다음에 쓸 도구를 추천합니다.

```bash
python analyze_exam_structure.py past_midterm.hwpx
python analyze_exam_structure.py exam_bank.xlsx --json-out structure.json
```

### 0-1. `hwpx_text.py` — HWPX 본문 추출

`.hwpx`에서 평문만 뽑습니다. 추출·분류 파이프라인의 기반입니다.

```bash
python hwpx_text.py past_midterm.hwpx -o past_midterm.txt
```

### 1. `extract_and_classify.py` — 문항 추출·단원 분류

HWPX·텍스트·URL·데모 문항을 읽어 문항을 분리하고, 키워드로 단원을 분류해 `.xlsx`로 저장합니다.

```bash
python extract_and_classify.py --hwpx past_midterm.hwpx -o classified.xlsx
python extract_and_classify.py --demo -o classified.xlsx
python extract_and_classify.py --text-file past_exam.txt -o classified.xlsx
```

### 2. `shuffle_ab_forms.py` — A/B형 선지 셔플

`문항`, `선지1`~`선지5`, `정답`(1~5) 컬럼이 있는 Excel을 읽어 A형(원본)·B형(선지 셔플·정답 재매핑)을 만듭니다.

```bash
python shuffle_ab_forms.py -i sample_exam.xlsx --out-a form_A.xlsx --out-b form_B.xlsx --seed 42
```

### 3. `generate_omr_sheet.py` — OMR 정답지

문항번호·정답만 추출해 OMR용 Excel을 생성합니다. `--one-hot`으로 선택1~5 원-핫 열을 추가할 수 있습니다.

```bash
python generate_omr_sheet.py -i form_A.xlsx -o omr.xlsx --one-hot
python generate_omr_sheet.py -i form_A.xlsx -o omr_wide.xlsx --layout wide
```

### 4. `hwpx_fill_template.py` — HWPX 템플릿 치환

언팩된 HWPX의 `Contents/section0.xml`에서 `{{문제1}}`, `{{선지1}}` 등 플레이스홀더를 JSON/Excel 데이터로 바꾼 뒤 `.hwpx`로 재압축합니다.

```bash
python hwpx_fill_template.py --unpacked ./unpacked_hwpx --data fill_data.json -o filled.hwpx
python hwpx_fill_template.py --unpacked ./unpacked_hwpx --data fill_data.xlsx -o filled.hwpx --strict
```

### 5. `analyze_thinker_keywords.py` — 사상가 키워드 분석

지문을 사상가 키워드 사전과 대조해 빈도·정규화 점수를 내고 추정 사상가를 출력합니다.

```bash
python analyze_thinker_keywords.py --text "칸트의 정언명령과 선의지…" -o thinker.xlsx
python analyze_thinker_keywords.py --text-file passage.txt --dict-json custom_thinkers.json --json-out result.json
```

## 공유 모듈

| 파일 | 역할 |
|------|------|
| `curriculum_keywords.py` | 단원↔키워드, 사상가↔키워드 사전 |
| `requirements.txt` | pandas, openpyxl |

## 도움말

각 스크립트는 `--help`를 제공합니다.

```bash
python extract_and_classify.py --help
```
