# EDU_WORKS — 시험 작성 도구

고등학교 중간고사·기말고사 업무용 CLI와 로컬 웹 UI입니다. **과목을 가리지 않습니다.**
기본 입력은 **한글 `.hwpx`** (문항 추출). 구형 `.hwp`는 HWPX로 저장해 주세요.
시험지 **형식은 관리자가 `examdata` + `exam_formats` 로 미리 정리**합니다. 사용자는 구조 분석을 하지 않습니다.
이 폴더는 **GitHub 저장소 `tools-site`의 `edu_works/`** 에 있습니다.

## 지금 / 다음

| 지금 | 다음 |
|------|------|
| HWPX·텍스트에서 문항 분리, 선택 과목 팩으로 단원 분류 | 시험지 수집 → 문항 DB |
| 관리자가 HWPX 디코드/인코드 백엔드 + exam_formats 고정 | 교육과정·교과서 진도 범위 |
| A/B 셔플, OMR, HWPX 템플릿 채우기 | AI가 범위 안 raw 문항 생성 → 웹 검토 → HWPX |
| 주제 사전 JSON 키워드 매칭 | |

## 구성

| 폴더 | 설명 |
|------|------|
| `exam-tools/` | Python CLI |
| `exam-tools-web/` | FastAPI 로컬 웹 UI (형제 `exam-tools`를 import) |
| `exam-tools/examdata/` | 관리자용 시험지 샘플 (git 제외) |
| `exam-tools/exam_formats/` | 파악해 둔 형식 프로필 |

## Windows PowerShell 7 (웹 UI)

UTF-8 기준으로 실행하세요. PowerShell에서는 `&&` 대신 `;` 를 씁니다.

```powershell
cd path\to\edu_works
.\run-web.ps1
```

브라우저: [http://127.0.0.1:8765/](http://127.0.0.1:8765/)  
헬스: [http://127.0.0.1:8765/health](http://127.0.0.1:8765/health)

`run-web.ps1`은 `exam-tools-web\.venv`가 없으면 만들고, 의존성을 설치한 뒤 uvicorn을 띄웁니다.

### 실행 정책 오류가 나면

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 저장소에서 받는 방법

```powershell
git clone https://github.com/mansejin/tools-site.git
cd tools-site\edu_works
```

## CLI만 쓸 때

```powershell
cd path\to\edu_works\exam-tools
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python extract_and_classify.py --demo -o classified.xlsx
python extract_and_classify.py --demo --pack subject_packs\ethics_and_thought.json -o classified.xlsx
```

자세한 옵션은 각 폴더의 `README.md`를 보세요.
