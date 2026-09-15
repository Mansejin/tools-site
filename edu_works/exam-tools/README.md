# 시험 작성 도구 모음 (Python)

고등학교 중간고사·기말고사 업무용 CLI입니다. 과목을 가리지 않습니다.
단원·주제 키워드는 **선택 팩** `subject_packs/*.json` 입니다. 팩이 없으면 문항 분리만 합니다.
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

Python 3.10+ / UTF-8 기준입니다.

## 스크립트

### 0. `analyze_exam_structure.py` — 과거 시험 구조 분석

예전에 낸 중간·기말 **`.hwpx`(권장)** / `.txt` / `.xlsx` / `.zip` 을 넣어 문항 수·선지 표기·Excel 열 매핑·플레이스홀더를 파악하고, 다음에 쓸 도구를 추천합니다.

```bash
python analyze_exam_structure.py
python analyze_exam_structure.py past_midterm.hwpx
python analyze_exam_structure.py exam_bank.xlsx --json-out structure.json
```

인자 없이 실행하면 `examdata/` 폴더 전체를 분석합니다.

### 0-1. `hwpx_text.py` — HWPX 본문 추출

`.hwpx`에서 평문만 뽑습니다. 추출·분류 파이프라인의 기반입니다.

```bash
python hwpx_text.py past_midterm.hwpx -o past_midterm.txt
```

### 1. `extract_and_classify.py` — 문항 추출·단원 분류

HWPX·텍스트·URL·데모 문항을 읽어 문항을 분리합니다. `--pack` 이 있으면 단원도 분류합니다.

```bash
python extract_and_classify.py --hwpx past_midterm.hwpx -o classified.xlsx
python extract_and_classify.py --demo -o classified.xlsx
python extract_and_classify.py --demo --pack subject_packs/ethics_and_thought.json -o classified.xlsx
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

### 5. `analyze_topic_keywords.py` — 키워드 매칭

지문을 주제 키워드 사전과 대조해 빈도·정규화 점수를 내고 추정 주제를 출력합니다. **사전 JSON 필수.**

```bash
python analyze_topic_keywords.py --text "표준 기압에서 물의 끓는점…" --dict-json my_topics.json -o topics.xlsx
python analyze_topic_keywords.py --text-file passage.txt --pack subject_packs/ethics_and_thought.json --json-out result.json
```

`analyze_thinker_keywords.py` 는 같은 스크립트의 호환 별칭입니다.

## 공유 모듈

| 파일 | 역할 |
|------|------|
| `subject_packs/loader.py` | 과목 팩 JSON 로더 |
| `subject_packs/ethics_and_thought.json` | 윤리와사상 예시 팩 (기본값 아님) |
| `curriculum_keywords.py` | 옛 import 호환 심 |
| `requirements.txt` | pandas, openpyxl |

## 도움말

각 스크립트는 `--help`를 제공합니다.

```bash
python extract_and_classify.py --help
```
