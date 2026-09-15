# HWPX 용지 · 여백 · 단 설정

## 코퍼스(마이일타 해설 27종) 실측

| 항목 | 값 |
|------|-----|
| 용지 | **A4** 210×297 mm (`width=59528` `height=84188` HWPUNIT) |
| 단 | **2단** `colPr type=NEWSPAPER colCount=2 sameGap=1700` |
| 좌/우 여백 | 15 mm |
| 위/아래 여백 | 10 mm |
| 머리/바닥글 | 15 mm |

> 해설지 코퍼스는 A4·2단이다. 학교 **시험지**는 보통 **A3 가로·2단**.

## 생성 프로필 (`hwpx.build_exam.PAGE_PROFILES`)

| 이름 | 용도 |
|------|------|
| `a3_2col` (기본) | A3 가로 420×297 · 2단 · 여백은 코퍼스와 동일(mm) |
| `a4_2col` | 마이일타 해설과 동일 |

샘플 재생성:

```powershell
python -m hwpx make-yunsa-sample -o samples --page-profile a3_2col
```
