#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""과거 중간고사 파일(.txt/.xlsx/.hwpx/.zip)의 구조를 자동 분석한다.

무엇을 찾나:
  - 문항 번호·개수, 선지 표기(①~⑤ / 1)~5) 등)
  - Excel 컬럼이 A/B 셔플·OMR에 맞는지
  - HWPX 플레이스홀더·본문 문항 흔적
  - 다음에 쓸 탭 추천
"""

from __future__ import annotations

import argparse
import json
import re
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

import pandas as pd

from extract_and_classify import split_questions
from hwpx_text import extract_text_from_hwpx, find_section_xmls

EXAMDATA_DIR = Path(__file__).resolve().parent / "examdata"
EXAMDATA_SUFFIXES = {".hwpx", ".zip", ".txt", ".xlsx", ".xlsm", ".csv", ".md"}
EXAM_FORMATS_DIR = Path(__file__).resolve().parent / "exam_formats"

CIRCLED_CHOICE_RE = re.compile(r"[①②③④⑤]")
NUMERIC_CHOICE_RE = re.compile(
    r"(?:^|\n)\s*(?:[1-5]\s*[.)］\)]|\([1-5]\))\s+\S",
    re.MULTILINE,
)
ANSWER_KEY_RE = re.compile(
    r"(?:정답|답안)\s*[:：]?\s*(?:\d+\s*[.:=\-]?\s*[①②③④⑤1-5])",
    re.IGNORECASE,
)
PLACEHOLDER_RE = re.compile(r"\{\{[^}]+\}\}")

QUESTION_ALIASES = ("문항", "문제", "question", "문항내용", "문항텍스트")
ANSWER_ALIASES = ("정답", "answer", "답", "정답번호")
NUMBER_ALIASES = ("문항번호", "번호", "no", "num", "question_no", "qno")
CHOICE_ALIAS_SETS = (
    tuple(f"선지{i}" for i in range(1, 6)),
    tuple(f"선택지{i}" for i in range(1, 6)),
    tuple(f"choice{i}" for i in range(1, 6)),
)


def _norm_col(name: object) -> str:
    return str(name).strip().lower()


def _find_alias(columns: Sequence[str], aliases: Sequence[str]) -> Optional[str]:
    lower_map = {_norm_col(c): c for c in columns}
    for alias in aliases:
        if alias.lower() in lower_map:
            return lower_map[alias.lower()]
    return None


def _find_choice_cols(columns: Sequence[str]) -> Optional[List[str]]:
    for alias_set in CHOICE_ALIAS_SETS:
        found = [_find_alias(columns, (a,)) for a in alias_set]
        if all(found):
            return [c for c in found if c is not None]
    # 숫자 헤더 1~5
    digit_cols = []
    lower_map = {_norm_col(c): c for c in columns}
    for i in range(1, 6):
        if str(i) in lower_map:
            digit_cols.append(lower_map[str(i)])
        else:
            digit_cols = []
            break
    return digit_cols or None


def _choice_style(text: str) -> str:
    circled = len(CIRCLED_CHOICE_RE.findall(text))
    numeric = len(NUMERIC_CHOICE_RE.findall(text))
    if circled >= 3 and circled >= numeric:
        return "원문자(①~⑤)"
    if numeric >= 3:
        return "숫자(1)~5) 등)"
    if circled or numeric:
        return "일부만 감지"
    return "선지 표기 약함"


def analyze_text(raw: str, *, filename: str = "(text)") -> Dict[str, Any]:
    questions = split_questions(raw)
    nums = [n for n, _ in questions]
    style = _choice_style(raw)
    has_answer_block = bool(ANSWER_KEY_RE.search(raw))

    findings = [
        {"label": "파일 종류", "value": "텍스트"},
        {"label": "문항 수", "value": str(len(questions))},
        {
            "label": "문항 번호",
            "value": (
                f"{min(nums)}~{max(nums)}"
                if nums
                else "없음 (번호 패턴 미검출)"
            ),
        },
        {"label": "선지 스타일", "value": style},
        {
            "label": "정답 키 흔적",
            "value": "있음" if has_answer_block else "없음(본문에 정답 표가 없을 수 있음)",
        },
    ]

    next_steps: List[Dict[str, str]] = []
    if questions:
        next_steps.append(
            {
                "tab": "extract",
                "label": "1. 문항 추출·분류",
                "reason": "텍스트를 그대로 넣으면 문항 Excel을 만들 수 있습니다. 과목 팩 JSON을 붙이면 단원도 분류합니다.",
            }
        )
    else:
        next_steps.append(
            {
                "tab": "extract",
                "label": "1. 문항 추출·분류",
                "reason": "번호 형식(1. / 1))을 맞춘 뒤 다시 올려 보세요.",
            }
        )

    preview = []
    for num, body in questions[:3]:
        preview.append({"문항번호": num, "미리보기": body[:120].replace("\n", " ")})

    return {
        "filename": filename,
        "kind": "text",
        "summary": (
            f"문항 {len(questions)}개 감지 · 선지 {style}"
            if questions
            else "문항 번호를 찾지 못했습니다."
        ),
        "findings": findings,
        "units": [],
        "preview": preview,
        "fit": {
            "extract": {"ok": bool(questions), "note": "텍스트 문항 분리"},
            "shuffle": {
                "ok": False,
                "note": "선지·정답 열이 있는 Excel이 필요합니다.",
            },
            "omr": {"ok": False, "note": "문항번호·정답 Excel이 필요합니다."},
            "hwpx": {"ok": False, "note": "해당 없음"},
        },
        "next_steps": next_steps,
    }


def analyze_xlsx(path: Path) -> Dict[str, Any]:
    df = pd.read_excel(path, engine="openpyxl")
    cols = [str(c) for c in df.columns]
    q_col = _find_alias(cols, QUESTION_ALIASES)
    a_col = _find_alias(cols, ANSWER_ALIASES)
    n_col = _find_alias(cols, NUMBER_ALIASES)
    choice_cols = _find_choice_cols(cols)

    row_count = int(len(df))
    non_empty_q = int(df[q_col].notna().sum()) if q_col else 0

    shuffle_ok = bool(q_col and a_col and choice_cols)
    omr_ok = bool(a_col and (n_col or q_col))

    findings = [
        {"label": "파일 종류", "value": "Excel (.xlsx)"},
        {"label": "행 수", "value": str(row_count)},
        {"label": "열", "value": ", ".join(cols) if cols else "(없음)"},
        {"label": "문항 열", "value": q_col or "미검출"},
        {"label": "선지1~5", "value": ", ".join(choice_cols) if choice_cols else "미검출"},
        {"label": "정답 열", "value": a_col or "미검출"},
        {"label": "문항번호 열", "value": n_col or "미검출(행 순서로 대체 가능)"},
    ]

    next_steps: List[Dict[str, str]] = []
    if shuffle_ok:
        next_steps.append(
            {
                "tab": "shuffle",
                "label": "2. A/B형 셔플",
                "reason": "문항·선지1~5·정답이 갖춰져 있어 바로 A/B형 ZIP을 만들 수 있습니다.",
            }
        )
    if omr_ok:
        next_steps.append(
            {
                "tab": "omr",
                "label": "3. OMR 정답지",
                "reason": "정답 열이 있어 OMR용 Excel을 만들 수 있습니다.",
            }
        )
    if not next_steps:
        missing = []
        if not q_col:
            missing.append("문항")
        if not choice_cols:
            missing.append("선지1~5")
        if not a_col:
            missing.append("정답")
        next_steps.append(
            {
                "tab": "shuffle",
                "label": "2. A/B형 셔플",
                "reason": f"부족한 열: {', '.join(missing) or '형식 불명'}. 열 이름만 맞춰도 됩니다.",
            }
        )

    # 텍스트가 한 셀에 몰린 경우도 안내
    if q_col and non_empty_q == 1:
        sample = str(df[q_col].dropna().iloc[0])
        if len(split_questions(sample)) >= 2:
            next_steps.insert(
                0,
                {
                    "tab": "extract",
                    "label": "1. 문항 추출·분류",
                    "reason": "한 칸에 여러 문항이 들어 있습니다. 텍스트로 복사해 추출 탭에 넣으세요.",
                },
            )

    preview_cols = [c for c in [n_col, q_col, a_col] if c][:3]
    if choice_cols:
        preview_cols = list(dict.fromkeys(preview_cols + choice_cols[:2]))
    if not preview_cols:
        preview_cols = cols[:4]
    preview_df = df[preview_cols].head(3) if preview_cols else df.head(3)
    preview = []
    for _, row in preview_df.iterrows():
        preview.append(
            {
                str(k): (str(v)[:80] if pd.notna(v) else "")
                for k, v in row.items()
            }
        )

    summary_bits = [f"행 {row_count}"]
    if shuffle_ok:
        summary_bits.append("A/B 셔플 가능")
    elif omr_ok:
        summary_bits.append("OMR 가능")
    else:
        summary_bits.append("열 매핑 부족")

    return {
        "filename": path.name,
        "kind": "xlsx",
        "summary": " · ".join(summary_bits),
        "findings": findings,
        "units": [],
        "preview": preview,
        "fit": {
            "extract": {
                "ok": False,
                "note": "텍스트 붙여넣기용 (Excel은 보통 셔플/OMR)",
            },
            "shuffle": {
                "ok": shuffle_ok,
                "note": "문항+선지1~5+정답" if shuffle_ok else "필수 열 부족",
            },
            "omr": {
                "ok": omr_ok,
                "note": "문항번호(또는 행)+정답" if omr_ok else "정답 열 필요",
            },
            "hwpx": {"ok": False, "note": "해당 없음"},
        },
        "next_steps": next_steps,
    }


def analyze_hwpx_like(path: Path) -> Dict[str, Any]:
    """ .hwpx 또는 Contents가 든 ZIP을 열어 본문·플레이스홀더를 본다. """
    try:
        joined = extract_text_from_hwpx(path)
    except (zipfile.BadZipFile, FileNotFoundError, ValueError) as exc:
        return {
            "filename": path.name,
            "kind": "hwpx",
            "summary": f"HWPX를 읽지 못했습니다: {exc}",
            "findings": [
                {"label": "파일 종류", "value": "HWPX/ZIP"},
                {"label": "오류", "value": str(exc)},
            ],
            "units": [],
            "preview": [],
            "fit": {
                "hwpx": {"ok": False, "note": "읽기 실패"},
                "extract": {"ok": False, "note": ""},
                "shuffle": {"ok": False, "note": ""},
                "omr": {"ok": False, "note": ""},
            },
            "next_steps": [
                {
                    "tab": "structure",
                    "label": "0. 구조 분석",
                    "reason": "다른 .hwpx로 다시 올려 보세요. (구형 .hwp는 .hwpx로 저장)",
                }
            ],
        }

    with tempfile_extract(path) as root:
        sections = find_section_xmls(root)
        section_count = len(sections)
        raw_xml = "\n".join(
            p.read_text(encoding="utf-8", errors="replace") for p in sections
        )
        placeholders = sorted(set(PLACEHOLDER_RE.findall(raw_xml)))

    questions = split_questions(joined)
    style = _choice_style(joined)

    findings = [
        {"label": "파일 종류", "value": "HWPX"},
        {"label": "section 파일", "value": str(section_count)},
        {"label": "추출 글자 수", "value": str(len(joined))},
        {
            "label": "플레이스홀더",
            "value": ", ".join(placeholders[:20]) or "없음(완성 시험지로 보임)",
        },
        {"label": "본문 문항 수(추정)", "value": str(len(questions))},
        {"label": "선지 스타일", "value": style},
    ]

    next_steps: List[Dict[str, str]] = []
    if questions:
        next_steps.append(
            {
                "tab": "extract",
                "label": "1. 문항 추출·분류",
                "reason": "같은 .hwpx를 추출 탭에 올리면 문항 Excel을 받습니다. 과목 팩을 붙이면 단원도 분류합니다.",
            }
        )
    if placeholders:
        next_steps.append(
            {
                "tab": "hwpx",
                "label": "4. HWPX 채우기",
                "reason": f"{{{{…}}}} 자리 {len(placeholders)}개가 있어 치환 데이터로 채울 수 있습니다.",
            }
        )
    if not next_steps:
        next_steps.append(
            {
                "tab": "extract",
                "label": "1. 문항 추출·분류",
                "reason": "문항 번호(1. / 1))가 약합니다. 본문을 확인한 뒤 다시 시도하세요.",
            }
        )

    preview = []
    for num, body in questions[:3]:
        preview.append(
            {"문항번호": num, "미리보기": body[:120].replace("\n", " ")}
        )
    if placeholders and not preview:
        preview = [{"플레이스홀더": p} for p in placeholders[:8]]

    return {
        "filename": path.name,
        "kind": "hwpx",
        "summary": (
            f"HWPX · 문항 추정 {len(questions)} · "
            f"자리표시 {len(placeholders)} · {len(joined)}자"
        ),
        "findings": findings,
        "units": [],
        "preview": preview,
        "fit": {
            "hwpx": {
                "ok": bool(placeholders),
                "note": "플레이스홀더 치환" if placeholders else "완성본일 수 있음",
            },
            "extract": {
                "ok": bool(questions),
                "note": "HWPX→문항 추출·분류 가능" if questions else "문항 약함",
            },
            "shuffle": {"ok": False, "note": "Excel 필요"},
            "omr": {"ok": False, "note": "Excel 필요"},
        },
        "next_steps": next_steps,
    }


class tempfile_extract:
    """ZIP/HWPX를 임시 폴더에 풀고 종료 시 삭제."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self._tmp = None
        self.root: Optional[Path] = None

    def __enter__(self) -> Path:
        import tempfile

        self._tmp = tempfile.TemporaryDirectory(prefix="exam_struct_")
        root = Path(self._tmp.name) / "root"
        root.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(self.path, "r") as zf:
            zf.extractall(root)
        self.root = root
        return root

    def __exit__(self, *args: object) -> None:
        if self._tmp is not None:
            self._tmp.cleanup()


def analyze_path(path: Path) -> Dict[str, Any]:
    suffix = path.suffix.lower()
    # HWPX 우선
    if suffix in {".hwpx", ".zip"}:
        try:
            return analyze_hwpx_like(path)
        except zipfile.BadZipFile:
            return {
                "filename": path.name,
                "kind": "unknown",
                "summary": "ZIP/HWPX로 열 수 없습니다.",
                "findings": [{"label": "오류", "value": "손상되었거나 HWPX/ZIP이 아닙니다."}],
                "units": [],
                "preview": [],
                "fit": {},
                "next_steps": [],
            }
    if suffix in {".xlsx", ".xlsm"}:
        return analyze_xlsx(path)
    if suffix in {".txt", ".md", ".csv"}:
        raw = path.read_text(encoding="utf-8", errors="replace")
        result = analyze_text(raw, filename=path.name)
        lines = raw.splitlines()
        if suffix == ".csv" and lines and "," in lines[0]:
            result["findings"].append(
                {
                    "label": "참고",
                    "value": "CSV입니다. Excel로 저장(.xlsx)하면 열 매핑이 더 정확합니다.",
                }
            )
        return result
    if suffix == ".hwp":
        return {
            "filename": path.name,
            "kind": "hwp",
            "summary": "구형 .hwp는 직접 읽지 않습니다. .hwpx로 저장해 주세요.",
            "findings": [
                {
                    "label": "안내",
                    "value": "한글에서 [다른 이름으로 저장] → HWPX 형식을 선택하세요.",
                }
            ],
            "units": [],
            "preview": [],
            "fit": {},
            "next_steps": [
                {
                    "tab": "structure",
                    "label": "0. 구조 분석",
                    "reason": ".hwpx로 저장한 뒤 다시 올리세요.",
                }
            ],
        }
    try:
        raw = path.read_text(encoding="utf-8", errors="replace")
        if raw.strip():
            return analyze_text(raw, filename=path.name)
    except OSError:
        pass
    return {
        "filename": path.name,
        "kind": "unknown",
        "summary": f"지원하지 않는 형식: {suffix or '(없음)'}",
        "findings": [
            {
                "label": "지원 형식",
                "value": ".hwpx(권장) / .zip / .txt / .xlsx",
            }
        ],
        "units": [],
        "preview": [],
        "fit": {},
        "next_steps": [],
    }


def list_examdata_files(root: Optional[Path] = None) -> List[Path]:
    folder = root or EXAMDATA_DIR
    if not folder.is_dir():
        return []
    files = [
        p
        for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in EXAMDATA_SUFFIXES
    ]
    return sorted(files, key=lambda p: p.name.lower())


def analyze_paths(paths: Sequence[Path]) -> List[Dict[str, Any]]:
    return [analyze_path(p) for p in paths]


def to_format_profile(result: Dict[str, Any]) -> Dict[str, Any]:
    """관리자가 다듬을 형식 프로필 JSON."""
    findings = {
        item["label"]: item["value"]
        for item in result.get("findings", [])
        if isinstance(item, dict) and "label" in item
    }
    return {
        "source_file": result.get("filename"),
        "kind": result.get("kind"),
        "summary": result.get("summary"),
        "findings": findings,
        "fit": result.get("fit") or {},
        "notes": "",
    }


def write_format_profile(result: Dict[str, Any], out_dir: Optional[Path] = None) -> Path:
    folder = out_dir or EXAM_FORMATS_DIR
    folder.mkdir(parents=True, exist_ok=True)
    stem = Path(str(result.get("filename") or "exam")).stem
    path = folder / f"{stem}.json"
    path.write_text(
        json.dumps(to_format_profile(result), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return path


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description=(
            "관리자용: examdata 시험지 구조를 분석하고 exam_formats 프로필을 만듭니다. "
            "사용자 웹 UI에서는 쓰지 않습니다."
        ),
    )
    p.add_argument(
        "path",
        nargs="?",
        type=Path,
        default=EXAMDATA_DIR,
        help="파일 또는 폴더 (기본: examdata/)",
    )
    p.add_argument(
        "--json-out",
        type=Path,
        help="전체 분석 JSON 저장 경로",
    )
    p.add_argument(
        "--write-format",
        action="store_true",
        help="exam_formats/<파일명>.json 프로필 저장",
    )
    return p.parse_args(argv)


def _print_one(result: Dict[str, Any]) -> None:
    print(result["summary"])
    for item in result.get("findings", []):
        print(f"  - {item['label']}: {item['value']}")
    if result.get("next_steps"):
        print("다음 추천:")
        for step in result["next_steps"]:
            print(f"  → [{step['label']}] {step['reason']}")


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    target = args.path
    if target.is_dir():
        files = list_examdata_files(target)
        if not files:
            raise SystemExit(f"분석할 파일이 없습니다: {target}")
        results = analyze_paths(files)
        for result in results:
            print(f"## {result.get('filename', '')}")
            _print_one(result)
            if args.write_format:
                out = write_format_profile(result)
                print(f"  형식 프로필: {out}")
            print()
        payload: Any = results
    elif target.is_file():
        result = analyze_path(target)
        _print_one(result)
        if args.write_format:
            out = write_format_profile(result)
            print(f"형식 프로필: {out}")
        payload = result
    else:
        raise SystemExit(f"파일이 없습니다: {target}")

    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"JSON 저장: {args.json_out.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
