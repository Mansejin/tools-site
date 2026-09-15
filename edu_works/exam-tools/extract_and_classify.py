#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""기출/문항 텍스트를 추출하고 2022 교육과정 단원 키워드로 분류해 Excel로 저장한다.

입력:
  - --hwpx: 한글 HWPX(.hwpx) 시험지(권장)
  - --text-file: 로컬 텍스트(기출·문항 묶음)
  - --url: HTTP(S)로 문항 텍스트를 가져올 주소(선택)
  - 둘 다 없으면 stdin 또는 --demo 샘플 사용

출력 컬럼: 문항번호, 문항, 분류단원, 매칭키워드, 점수
"""

from __future__ import annotations

import argparse
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Iterable, List, Optional, Tuple

import pandas as pd

from curriculum_keywords import (
    DEFAULT_UNIT_MATCH_THRESHOLD,
    UNIT_KEYWORDS,
)
from hwpx_text import extract_text_from_hwpx, load_exam_text

QUESTION_SPLIT_RE = re.compile(
    r"(?:^|\n)\s*(?:문항\s*)?(\d{1,3})\s*[.)．、]\s*",
    re.MULTILINE,
)

DEFAULT_TARGET_LABEL = "윤리와사상 2022 교육과정 2학년 2학기 중간고사"

DEMO_TEXT = """
1. 다음 사상가의 주장으로 옳은 것은?
플라톤은 이데아의 세계를 참된 실재로 보았으며, 철인왕이 다스리는 이상국가를 추구하였다.

① 감각적 세계만이 참된 실재이다.
② 이데아는 가변적인 현상이다.
③ 선의 이데아가 최고의 이데아이다.
④ 덕은 오직 습관에서만 비롯된다.
⑤ 중용이 최고의 덕이다.

2. 칸트의 정언명령에 대한 설명으로 옳은 것은?
칸트는 선의지에 따른 의무의 이행을 강조하며, 행위의 보편화 가능성을 도덕의 기준으로 삼았다.

① 결과의 유용성이 도덕의 기준이다.
② 가언명령만이 도덕법칙이다.
③ 목적을 수단으로만 대우해야 한다.
④ 자율에 따른 의무 이행이 도덕적이다.
⑤ 쾌락의 양을 계산해야 한다.

3. 맹자의 성선설과 관련된 설명으로 옳은 것은?
맹자는 사단을 통해 인간의 본성이 선함을 주장하였고, 왕도정치를 지향하였다.

① 인간의 본성은 악하다.
② 예치로 본성을 교정해야 한다.
③ 측은지심은 인의 단서이다.
④ 화성기위가 핵심이다.
⑤ 무위자연이 이상이다.

4. 롤스의 정의론에 대한 설명으로 옳은 것은?
롤스는 무지의 베일 뒤에서 정의의 원칙에 합의한다고 보았으며, 차등의 원칙을 제시하였다.

① 최소국가만이 정당하다.
② 소유권의 절대성을 강조한다.
③ 원초적 입장에서 공정한 합의가 가능하다.
④ 소외의 극복을 최우선으로 한다.
⑤ 유토피아 건설이 국가의 목적이다.
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
) -> Tuple[str, List[str], int]:
    """단원명, 매칭된 키워드 목록, 가중 점수 반환.

    점수는 출현횟수 × 키워드 길이(짧은 오탐 완화).
    """
    best_unit = "미분류"
    best_score = 0
    best_hits: List[str] = []

    for unit, keywords in UNIT_KEYWORDS.items():
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
) -> pd.DataFrame:
    rows = []
    for num, body in questions:
        unit, hits, score = classify_text(body, threshold=threshold)
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
            "윤리와사상 기출/문항 텍스트를 추출·단원 분류하여 Excel(.xlsx)로 저장합니다."
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


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    raw = load_source(args)
    questions = split_questions(raw)
    if not questions:
        raise SystemExit("문항을 찾지 못했습니다. 번호 형식(예: 1. / 1))을 확인하세요.")

    df = build_dataframe(questions, args.threshold, args.exam_label)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    df.to_excel(args.output, index=False, engine="openpyxl")
    print(f"저장 완료: {args.output.resolve()} ({len(df)}문항)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
