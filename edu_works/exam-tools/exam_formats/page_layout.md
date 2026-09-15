# HWPX 용지 · 여백 · 단 설정

백엔드: **python-hwpx**. 적용 API: `exam_hwpx.page_layout.apply_page_profile`.

## 기본: `b4_2col` (내신판 학교 시험지 실측)

| 항목 | 값 |
|------|-----|
| 용지 | **JIS B4** 257×364 mm |
| 단 | **2단** NEWSPAPER · gap 2268 |
| 여백 | L/R 18mm · T 12mm · B 15mm · header/footer 15mm |

배방고·예당고 2026 기말 HWPX와 동일.

## 프로필

| 이름 | 용도 |
|------|------|
| `b4_2col` **(기본)** | 학교 중간/기말 |
| `a4_2col` | 마이일타 해설 |
| `a3_2col` | A3 가로 2단 |

```powershell
python -m exam_hwpx make-yunsa-sample -o samples --page-profile b4_2col
```

코드에서:

```python
from hwpx import HwpxDocument
from exam_hwpx.page_layout import apply_page_profile

doc = HwpxDocument.new()
apply_page_profile(doc, "b4_2col")  # 용지+여백+2단
```
