# exam_formats — 시험지 형식 카탈로그 (관리자용)

사용자는 구조 분석을 하지 않습니다.  
개발단에서 `examdata/` 샘플을 디코드하고, 여기서 **지원 형식**을 고정합니다.

| 파일 | 의미 |
|------|------|
| `hwpx_v1.json` | 일반 HWPX 디코드/인코드 기본 형식 |
| `myilita_해설_v1.json` | 마이일타 2026-09 해설지 코퍼스 형식 |
| `corpus/` | 코퍼스 분석 요약 (MD/JSON) |

```powershell
cd path\to\edu_works\exam-tools
python -m hwpx make-fixture
python -m hwpx decode hwpx\fixtures\sample_exam.hwpx -o tmp.ir.json
python -m hwpx encode --questions tmp.ir.json --template hwpx\fixtures\template.hwpx -o tmp.filled.hwpx
python analyze_exam_structure.py examdata --write-format
```
