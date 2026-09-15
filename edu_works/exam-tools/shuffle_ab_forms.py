#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""문항 Excel을 읽어 A형(원본)·B형(선지 셔플) 두 파일을 생성한다.

필수 컬럼(이름 동의어 허용):
  문항(또는 문제/question), 선지1~5(또는 선택지1~5 / choice1~5),
  정답(또는 answer) — 1~5 정수
"""

from __future__ import annotations

import argparse
import random
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

import pandas as pd

QUESTION_ALIASES = ("문항", "문제", "question", "문항내용")
ANSWER_ALIASES = ("정답", "answer", "답", "정답번호")
CHOICE_ALIASES = (
    tuple(f"선지{i}" for i in range(1, 6)),
    tuple(f"선택지{i}" for i in range(1, 6)),
    tuple(f"choice{i}" for i in range(1, 6)),
    tuple(str(i) for i in range(1, 6)),
)


def _find_column(columns: Sequence[str], aliases: Sequence[str]) -> str:
    lower_map = {str(c).strip().lower(): c for c in columns}
    for alias in aliases:
        key = alias.lower()
        if key in lower_map:
            return lower_map[key]
    raise KeyError(f"필수 컬럼을 찾지 못함: {aliases}")


def resolve_columns(df: pd.DataFrame) -> Tuple[str, List[str], str]:
    cols = list(df.columns)
    q_col = _find_column(cols, QUESTION_ALIASES)
    a_col = _find_column(cols, ANSWER_ALIASES)
    choice_cols: Optional[List[str]] = None
    for alias_set in CHOICE_ALIASES:
        try:
            choice_cols = [_find_column(cols, (alias,)) for alias in alias_set]
            break
        except KeyError:
            continue
    if choice_cols is None:
        raise KeyError("선지1~5(또는 동의어) 컬럼이 필요합니다.")
    return q_col, choice_cols, a_col


def normalize_answer(value: object) -> int:
    if pd.isna(value):
        raise ValueError("정답이 비어 있습니다.")
    text = str(value).strip()
    # ①②③④⑤ / 1~5 / (1) 등
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


def shuffle_row(
    choices: List[str],
    answer: int,
    rng: random.Random,
) -> Tuple[List[str], int]:
    """선지를 셔플하고 정답 번호를 재매핑."""
    indexed = list(enumerate(choices, start=1))
    rng.shuffle(indexed)
    new_choices = [text for _, text in indexed]
    # 원래 answer 위치에 있던 선지가 새 몇 번인지
    old_text = choices[answer - 1]
    new_answer = new_choices.index(old_text) + 1
    return new_choices, new_answer


def build_forms(
    df: pd.DataFrame,
    seed: Optional[int] = None,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    q_col, choice_cols, a_col = resolve_columns(df)
    rng = random.Random(seed)

    a_rows: List[Dict[str, object]] = []
    b_rows: List[Dict[str, object]] = []

    for idx, row in df.iterrows():
        question = row[q_col]
        choices = ["" if pd.isna(row[c]) else str(row[c]) for c in choice_cols]
        answer = normalize_answer(row[a_col])

        base = {
            "문항번호": row["문항번호"] if "문항번호" in df.columns else idx + 1,
            "문항": question,
            "선지1": choices[0],
            "선지2": choices[1],
            "선지3": choices[2],
            "선지4": choices[3],
            "선지5": choices[4],
            "정답": answer,
            "형식": "A",
        }
        a_rows.append(base)

        shuffled, new_ans = shuffle_row(choices, answer, rng)
        b_rows.append(
            {
                "문항번호": base["문항번호"],
                "문항": question,
                "선지1": shuffled[0],
                "선지2": shuffled[1],
                "선지3": shuffled[2],
                "선지4": shuffled[3],
                "선지5": shuffled[4],
                "정답": new_ans,
                "형식": "B",
                "원정답": answer,
            }
        )

    return pd.DataFrame(a_rows), pd.DataFrame(b_rows)


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="문항 Excel의 선지를 셔플해 A형(원본)·B형(셔플) Excel을 생성합니다.",
    )
    p.add_argument(
        "-i",
        "--input",
        type=Path,
        required=True,
        help="입력 Excel (.xlsx) — 문항, 선지1~5, 정답 컬럼 필요",
    )
    p.add_argument(
        "--out-a",
        type=Path,
        default=Path("exam_form_A.xlsx"),
        help="A형 출력 경로 (기본: exam_form_A.xlsx)",
    )
    p.add_argument(
        "--out-b",
        type=Path,
        default=Path("exam_form_B.xlsx"),
        help="B형 출력 경로 (기본: exam_form_B.xlsx)",
    )
    p.add_argument(
        "--seed",
        type=int,
        default=None,
        help="난수 시드(재현용). 생략 시 매 실행마다 다른 B형",
    )
    return p.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    df = pd.read_excel(args.input, engine="openpyxl")
    form_a, form_b = build_forms(df, seed=args.seed)

    args.out_a.parent.mkdir(parents=True, exist_ok=True)
    args.out_b.parent.mkdir(parents=True, exist_ok=True)
    form_a.to_excel(args.out_a, index=False, engine="openpyxl")
    form_b.to_excel(args.out_b, index=False, engine="openpyxl")
    print(f"A형 저장: {args.out_a.resolve()} ({len(form_a)}문항)")
    print(f"B형 저장: {args.out_b.resolve()} ({len(form_b)}문항)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
