# samples

| 파일 | 설명 |
|------|------|
| `yunsa_sample_q1.hwpx` | 윤리와사상 갑·을 벤다이어그램 1문항 (정답 ①) |
| `yunsa_venn.png` | q1 삽입 그림 |
| `yunsa_sample_set.hwpx` | 다유형 5문항 (벤·순서도·대화·표·ㄱㄴㄷ) |
| `figs/q1_venn.png` … `q5_blank.png` | 세트용 그림 |

```powershell
# 1문항
python -m exam_hwpx make-yunsa-sample -o samples

# 5문항 세트
python -m exam_hwpx make-yunsa-set -o samples
```
