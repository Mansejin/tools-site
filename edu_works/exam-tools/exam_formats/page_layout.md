# HWPX 용지 · 여백 · 단 설정

백엔드: **python-hwpx** (`pip install python-hwpx`). 로컬 패키지명은 `exam_hwpx` (충돌 회피).

## 코퍼스별 실측

### 마이일타 해설 (모의고사 해설지, 27종)

| 항목 | 값 |
|------|-----|
| 용지 | **A4** 210×297 mm |
| 단 | 2단 `NEWSPAPER` gap=1700 |
| 여백 | L/R 15mm, T 10mm, B 10mm |

### 내신판 학교 시험지 (2026 기말 · 배방고 기하 / 예당고 대수)

| 항목 | 값 |
|------|-----|
| 용지 | **JIS B4** 257×364 mm (`72852×103180` HWPUNIT) |
| 단 | **2단** `colCount=2` `sameGap=2268` |
| 여백 | L/R 18mm, T 12mm, B 15mm, header/footer 15mm |

> 학교 내신 시험지는 A3가 아니라 **B4·2단**인 경우가 많다 (내신판 변환본 기준).

## 생성 프로필 (`exam_hwpx.build_exam.PAGE_PROFILES`)

| 이름 | 용도 |
|------|------|
| `b4_2col` (기본) | 내신판 실측과 동일 |
| `a4_2col` | 마이일타 해설 |
| `a3_2col` | A3 가로 2단 |

```powershell
python -m exam_hwpx decode examdata/naesin/배방고_2026_2_1_기말_기하.hwpx -o out.json
python -m exam_hwpx make-yunsa-sample -o samples --page-profile b4_2col
```
