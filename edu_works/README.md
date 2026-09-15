# EDU_WORKS — 윤리와사상 시험 도구

고등학교 「윤리와사상」 시험 업무용 CLI와 로컬 웹 UI입니다.
이 폴더는 **GitHub 저장소 `tools-site`의 `edu_works/`** 에 있습니다.
Cursor Project store의 `/cursor/stores/.../docs/exam-tools*` 경로는 클라우드 에이전트 VM 전용이며, Windows PC에는 존재하지 않습니다.

## 구성

| 폴더 | 설명 |
|------|------|
| `exam-tools/` | Python CLI 5종 |
| `exam-tools-web/` | FastAPI 로컬 웹 UI (형제 `exam-tools`를 import) |

## Windows PowerShell 7 (웹 UI)

UTF-8 기준으로 실행하세요. PowerShell에서는 `&&` 대신 `;` 를 씁니다.

```powershell
cd path\to\edu_works\exam-tools-web
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8765
```

브라우저: [http://127.0.0.1:8765/](http://127.0.0.1:8765/)  
헬스: [http://127.0.0.1:8765/health](http://127.0.0.1:8765/health)

또는 상위 폴더에서 헬퍼:

```powershell
cd path\to\edu_works
.\run-web.ps1
```

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
```

자세한 옵션은 각 폴더의 `README.md`를 보세요.
