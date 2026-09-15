#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""전체 시험 데이터셋에서 문항번호·정답만 추출해 OMR용 Excel을 만든다.

기본 레이아웃(OMR 표준형):
  - 행: 문항 번호
  - 열: 정답 (또는 ①~⑤ 원-핫 표기)

`--layout wide` 시 한 행에 모든 문항 정답을 나열한다.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import List, Optional, Sequence

import pandas as pd

NUMBER_ALIASES = ("문항번호", "번호", "문항", "no", "number", "item")
ANSWER_ALIASES = ("정답", "answer", "답", "정답번호")
CIRCLED = {1: "①", 2: "②", 3: "③", 4: "④", 5: "⑤"}


def _find_column(columns: Sequence[str], aliases: Sequence[str]) -> str:
    lower_map = {str(c).strip().lower(): c for c in columns}
    for alias in aliases:
        if alias.lower() in lower_map:
            return lower_map[alias.lower()]
    raise KeyError(f"컬럼을 찾지 못함: {aliases}")


def normalize_answer(value: object) -> int:
    if pd.isna(value):
        raise ValueError("정답이 비어 있습니다.")
    text = str(value).strip()
    circled = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5}
    if text in circled:
        return circled[text]
    digits = "".join(ch for ch in text if ch.isdigit())
    if not digits:
        raise ValueError(f"정답 해석 실패: {value!r}")
    num = int(digits)
    if num < 1 or num > 5:
        raise ValueError(f"정답은 1~5여야 합니다: {value!r}")
    return num


def build_omr_long(df: pd.DataFrame, one_hot: bool) -> pd.DataFrame:
    num_col = _find_column(df.columns, NUMBER_ALIASES)
    ans_col = _find_column(df.columns, ANSWER_ALIASES)

    rows: List[dict] = []
    for _, row in df.iterrows():
        num = int(row[num_col]) if not pd.isna(row[num_col]) else None
        ans = normalize_answer(row[ans_col])
        record = {
            "문항번호": num,
            "정답": ans,
            "정답표시": CIRCLED[ans],
        }
        if one_hot:
            for i in range(1, 6):
                record[f"선택{i}"] = 1 if i == ans else 0
        rows.append(record)
    out = pd.DataFrame(rows)
    return out.sort_values("문항번호").reset_index(drop=True)


def build_omr_wide(df: pd.DataFrame) -> pd.DataFrame:
    long_df = build_omr_long(df, one_hot=False)
    wide = {
        f"문항{int(r['문항번호'])}": int(r["정답"])
        for _, r in long_df.iterrows()
    }
    return pd.DataFrame([wide])


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="시험 Excel에서 문항번호·정답만 추출해 OMR용 Excel을 생성합니다.",
    )
    p.add_argument(
        "-i",
        "--input",
        type=Path,
        required=True,
        help="입력 Excel (.xlsx) — 문항번호, 정답 컬럼 필요",
    )
    p.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("omr_answers.xlsx"),
        help="출력 Excel 경로 (기본: omr_answers.xlsx)",
    )
    p.add_argument(
        "--layout",
        choices=("long", "wide"),
        default="long",
        help="long=행:문항번호 / wide=한 행에 전 문항 (기본: long)",
    )
    p.add_argument(
        "--one-hot",
        action="store_true",
        help="long 레이아웃에서 선택1~5 원-핫 열 추가",
    )
    return p.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    df = pd.read_excel(args.input, engine="openpyxl")

    if args.layout == "wide":
        out = build_omr_wide(df)
    else:
        out = build_omr_long(df, one_hot=args.one_hot)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    out.to_excel(args.output, index=False, engine="openpyxl")
    print(f"OMR 저장: {args.output.resolve()} (행 {len(out)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
