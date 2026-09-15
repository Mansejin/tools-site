#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""기출/문항 텍스트를 추출하고, 선택 과목 팩이 있으면 단원 분류해 Excel로 저장한다.

입력:
  - --hwpx: 한글 HWPX(.hwpx) 시험지(권장)
  - --text-file: 로컬 텍스트(기출·문항 묶음)
  - --url: HTTP(S)로 문항 텍스트를 가져올 주소(선택)
  - --pack: 단원 키워드 JSON (없으면 문항 분리만, 분류단원=미분류)
  - 없으면 stdin 또는 --demo 샘플 사용

출력 컬럼: 문항번호, 문항, 분류단원, 매칭키워드, 점수
"""

from __future__ import annotations

import argparse
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Iterable, List, Mapping, Optional, Tuple

import pandas as pd

from hwpx_text import extract_text_from_hwpx, load_exam_text
from subject_packs.loader import (
    DEFAULT_UNIT_MATCH_THRESHOLD,
    SubjectPack,
    empty_pack,
    load_pack_path,
)

QUESTION_SPLIT_RE = re.compile(
    r"(?:^|\n)\s*(?:문항\s*)?(\d{1,3})\s*[.)．、]\s*",
    re.MULTILINE,
)

DEFAULT_TARGET_LABEL = "2학년 2학기 중간고사"

DEMO_TEXT = """
1. 다음 설명으로 옳은 것은?
표준 기압에서 순수한 물의 끓는점은 섭씨 100도이다.

① 끓는점은 압력과 무관하다.
② 어는점은 항상 100도이다.
③ 표준 기압에서 끓는점은 100도이다.
④ 물은 기체가 될 수 없다.
⑤ 모든 액체의 끓는점은 같다.

2. 광합성에 대한 설명으로 옳은 것은?
녹색 식물은 빛에너지를 이용해 양분을 합성한다.

① 산소와 포도당만 있으면 충분하다.
② 이산화탄소와 물이 필요하다.
③ 질소 고정이 광합성의 본질이다.
④ 빛 없이도 같은 속도로 일어난다.
⑤ 동물 세포에서만 일어난다.

3. 다음 중 일차방정식의 해로 옳은 것은?
2x + 4 = 10

① x = 2
② x = 3
③ x = 4
④ x = 5
⑤ x = 6

4. 한반도의 계절풍에 대한 설명으로 옳은 것은?
여름에는 바다에서 육지로, 겨울에는 육지에서 바다로 바람이 분다.

① 여름 계절풍은 한랭 건조하다.
② 겨울 계절풍은 고온 다습하다.
③ 여름에는 남동·남서 계열 바람이 우세하다.
④ 계절풍은 조석과 같은 현상이다.
⑤ 한반도에는 계절풍이 없다.
"""


def fetch_url(url: str, timeout: float = 30.0) -> str:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "edu-works-exam-tools/1.0"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="replace")


def read_text_file(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def split_questions(raw: str) -> List[Tuple[int, str]]:
    """번호가 붙은 문항 블록으로 분리. 번호가 없으면 전체를 1번으로 처리."""
    matches = list(QUESTION_SPLIT_RE.finditer(raw))
    if not matches:
        body = raw.strip()
        return [(1, body)] if body else []

    results: List[Tuple[int, str]] = []
    for i, m in enumerate(matches):
        num = int(m.group(1))
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(raw)
        body = raw[start:end].strip()
        if body:
            results.append((num, body))
    return results


def classify_text(
    text: str,
    threshold: int = DEFAULT_UNIT_MATCH_THRESHOLD,
    min_keyword_len: int = 2,
    unit_keywords: Optional[Mapping[str, List[str]]] = None,
) -> Tuple[str, List[str], int]:
    """단원명, 매칭된 키워드 목록, 가중 점수 반환.

    unit_keywords 가 비면 분류하지 않고 미분류를 반환한다.
    점수는 출현횟수 × 키워드 길이(짧은 오탐 완화).
    """
    mapping: Mapping[str, List[str]] = unit_keywords or {}
    if not mapping:
        return "미분류", [], 0

    best_unit = "미분류"
    best_score = 0
    best_hits: List[str] = []

    for unit, keywords in mapping.items():
        hits: List[str] = []
        score = 0
        for kw in keywords:
            if len(kw) < min_keyword_len:
                continue
            count = text.count(kw)
            if count > 0:
                hits.append(kw)
                score += count * len(kw)
        if score > best_score:
            best_score = score
            best_unit = unit
            best_hits = hits

    if best_score < threshold:
        return "미분류", [], best_score
    return best_unit, best_hits, best_score


def build_dataframe(
    questions: Iterable[Tuple[int, str]],
    threshold: int,
    exam_label: str,
    unit_keywords: Optional[Mapping[str, List[str]]] = None,
) -> pd.DataFrame:
    rows = []
    for num, body in questions:
        unit, hits, score = classify_text(
            body,
            threshold=threshold,
            unit_keywords=unit_keywords,
        )
        rows.append(
            {
                "시험": exam_label,
                "문항번호": num,
                "문항": body,
                "분류단원": unit,
                "매칭키워드": ", ".join(hits),
                "점수": score,
            }
        )
    return pd.DataFrame(rows)


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description=(
            "기출/문항 텍스트를 추출하고, 선택 과목 팩이 있으면 단원 분류하여 Excel(.xlsx)로 저장합니다."
        ),
    )
    src = p.add_mutually_exclusive_group()
    src.add_argument(
        "--hwpx",
        type=Path,
        help="한글 HWPX(.hwpx) 시험지 경로(권장)",
    )
    src.add_argument(
        "--text-file",
        type=Path,
        help="로컬 UTF-8 텍스트 파일 경로",
    )
    src.add_argument(
        "--url",
        type=str,
        help="문항 텍스트를 가져올 HTTP(S) URL",
    )
    src.add_argument(
        "--demo",
        action="store_true",
        help="내장 데모 문항으로 실행",
    )
    p.add_argument(
        "--pack",
        type=Path,
        default=None,
        help="과목 단원 키워드 JSON (없으면 문항 분리만)",
    )
    p.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("classified_questions.xlsx"),
        help="출력 Excel 경로 (기본: classified_questions.xlsx)",
    )
    p.add_argument(
        "--exam-label",
        default=DEFAULT_TARGET_LABEL,
        help=f"시험 라벨 (기본: {DEFAULT_TARGET_LABEL})",
    )
    p.add_argument(
        "--threshold",
        type=int,
        default=DEFAULT_UNIT_MATCH_THRESHOLD,
        help="단원 분류 최소 키워드 점수 (기본: 1)",
    )
    return p.parse_args(argv)


def load_source(args: argparse.Namespace) -> str:
    if args.demo:
        return DEMO_TEXT
    if getattr(args, "hwpx", None) is not None:
        return extract_text_from_hwpx(args.hwpx)
    if args.text_file is not None:
        return load_exam_text(args.text_file)
    if args.url:
        try:
            return fetch_url(args.url)
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            raise SystemExit(f"URL 가져오기 실패: {exc}") from exc
    if not sys.stdin.isatty():
        return sys.stdin.read()
    raise SystemExit(
        "입력이 없습니다. --hwpx, --text-file, --url, --demo 중 하나를 지정하거나 stdin으로 전달하세요."
    )


def resolve_pack(pack_path: Optional[Path]) -> SubjectPack:
    if pack_path is None:
        return empty_pack()
    return load_pack_path(pack_path)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    raw = load_source(args)
    questions = split_questions(raw)
    if not questions:
        raise SystemExit("문항을 찾지 못했습니다. 번호 형식(예: 1. / 1))을 확인하세요.")

    pack = resolve_pack(args.pack)
    df = build_dataframe(
        questions,
        args.threshold,
        args.exam_label,
        unit_keywords=pack.units,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    df.to_excel(args.output, index=False, engine="openpyxl")
    extra = f", 팩={pack.label or pack.name}" if pack.units else ", 팩 없음(분리만)"
    print(f"저장 완료: {args.output.resolve()} ({len(df)}문항{extra})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
