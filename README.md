# tools-site

만세진 잔잔바리 도구 모음 페이지. GitHub Pages + `tools.mansejin.com` 서브도메인.

- 라이브: https://tools.mansejin.com
- 핑계 사이트: https://pinggye.mansejin.com

## 도구 추가 방법

`data/tools.json`에 항목을 추가하고 push하면 됩니다. 한·영 텍스트는 같은 파일에 넣습니다.

```json
{
  "id": "my-tool",
  "name": "my-tool",
  "tagline": {
    "ko": "한 줄 요약",
    "en": "One-line summary"
  },
  "description": {
    "ko": "설명",
    "en": "Description"
  },
  "tags": {
    "ko": ["Windows", "유틸"],
    "en": ["Windows", "Utility"]
  },
  "github": "https://github.com/Mansejin/my-tool",
  "install": "git clone ...",
  "shortcut": "Ctrl+Shift+V",
  "platform": "Windows 10/11",
  "status": "stable"
}
```

## 언어

| 페이지 | URL |
|--------|-----|
| 한국어 | https://tools.mansejin.com |
| English | https://tools.mansejin.com/en/ |

## 로컬 미리보기

### 방법 1 — `index.html` 더블클릭 (빠른 확인)

`js/fallback-tools.js`에 박아 둔 **더미 데이터**로 바로 보입니다.  
노란 배너가 뜨면 더미 모드입니다. `preview-dummy` 카드는 미리보기 전용입니다.

### 방법 2 — `preview.bat` (json 실제 반영)

```powershell
.\preview.bat
```

브라우저에서 `data/tools.json`을 그대로 불러옵니다. 수정 후 **새로고침**하면 반영됩니다.

### 방법 3 — 수동 서버

```powershell
cd tools-site
py -3 -m http.server 8080
```

http://localhost:8080

> `tools.json`을 바꿨을 때 더미도 맞추려면 `js/fallback-tools.js`의 `FALLBACK_TOOLS`도 같이 수정하세요.

## GitHub Pages 배포

1. GitHub에 이 저장소 push
2. **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: `main` / `/ (root)`
3. **Custom domain**에 `tools.mansejin.com` 입력 후 Save
4. **Enforce HTTPS** 체크

저장소 루트의 `CNAME` 파일에 이미 `tools.mansejin.com`이 들어 있습니다.

## DNS 연결 (mansejin.com)

`pinggye.mansejin.com`을 연결했던 것과 **같은 방식**입니다.

도메인 관리 패널(가비아, Cloudflare, Namecheap 등)에서:

| 타입 | 이름 | 값 |
|------|------|-----|
| CNAME | `tools` | `Mansejin.github.io` |

- `pinggye` → `Mansejin.github.io` (기존 핑계 사이트)
- `tools` → `Mansejin.github.io` (이 사이트)

둘 다 같은 GitHub Pages 엔드포인트를 가리키지만, 각 저장소의 `CNAME` 파일로 구분됩니다.

DNS 반영까지 보통 5~30분, 최대 24시간 걸릴 수 있습니다.

## 확인

```powershell
nslookup tools.mansejin.com
```

`Mansejin.github.io`로 응답하면 정상입니다.

## 라이선스

MIT
