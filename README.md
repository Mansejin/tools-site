# tools-site

만세진 잔잔바리 도구 모음 페이지. GitHub Pages + `mansejin.com` 루트 도메인.

- 라이브: https://mansejin.com
- 장난감(핑계 등): https://mansejin.com/toys/
- 구 주소 `tools.mansejin.com` → `mansejin.com` 으로 자동 이동

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
| 한국어 | https://mansejin.com |
| English | https://mansejin.com/en/ |

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
3. **Custom domain**에 `mansejin.com` 입력 후 Save
4. DNS 검사 통과 후 **Enforce HTTPS** 체크

저장소 루트 `CNAME` 파일: `mansejin.com`

## DNS 연결 (가비아)

**My가비아 → 도메인 → DNS 관리 → mansejin.com → DNS 설정**

GitHub Pages 오류(`NotServedByPagesError`)가 나면 대부분 **`www` 레코드 누락**입니다. 아래 표대로 맞추세요.

### 유지·추가할 레코드

| 타입 | 호스트(이름) | 값 | 비고 |
|------|-------------|-----|------|
| **A** | `@` (또는 비움) | `185.199.108.153` | 루트 도메인 — 4개 모두 필요 |
| **A** | `@` | `185.199.109.153` | ↑ |
| **A** | `@` | `185.199.110.153` | ↑ |
| **A** | `@` | `185.199.111.153` | ↑ |
| **CNAME** | `www` | `Mansejin.github.io` | **이것 추가하면 DNS 검사 통과** |
| **CNAME** | `tools` | `Mansejin.github.io` | 구 주소 리다이렉트용 (선택) |
| **CNAME** | `pinggye` | `Mansejin.github.io` | 구 핑계 주소 리다이렉트용 (선택) |

> 가비아 CNAME 값은 보통 `Mansejin.github.io` 처럼 **마지막 점(.) 없이** 입력합니다.

### 지울 것

- `www`에 잘못된 A 레코드가 있으면 **삭제** 후 위 CNAME으로 교체
- `@`에 GitHub IP 4개 외 다른 A 레코드가 있으면 **삭제**

저장 후 GitHub **Settings → Pages → Check again**. 반영까지 5~30분(최대 24시간).

## 확인

```powershell
Resolve-DnsName mansejin.com -Type A -Server 8.8.8.8
Resolve-DnsName www.mansejin.com -Type CNAME -Server 8.8.8.8
```

- `mansejin.com` → `185.199.108~111.153` 중 하나
- `www.mansejin.com` → `mansejin.github.io`

## 라이선스

MIT
