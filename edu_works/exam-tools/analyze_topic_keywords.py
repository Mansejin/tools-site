#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""지문을 주제 키워드 사전과 대조해 빈도·점수를 산출하고 주제를 추정한다.

내장 과목 사전은 쓰지 않는다. --dict-json 또는 --pack 이 필요하다.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pandas as pd

from subject_packs.loader import TOPIC_SCORE_TIE_MARGIN, load_pack_path


def load_custom_dict(path: Path) -> Dict[str, List[str]]:
    pack = load_pack_path(path)
    if pack.topics:
        return dict(pack.topics)
    if pack.units:
        return dict(pack.units)
    raise ValueError("팩 JSON에 topics 또는 units 키워드가 없습니다.")


def score_passage(
    text: str,
    dictionary: Dict[str, List[str]],
    min_keyword_len: int = 2,
) -> List[Tuple[str, int, Dict[str, int], float]]:
    """주제별 (이름, 총빈도, 키워드별빈도, 정규화점수) 목록."""
    results = []
    for topic, keywords in dictionary.items():
        usable = [kw for kw in keywords if len(kw) >= min_keyword_len]
        usable_sorted = sorted(usable, key=len, reverse=True)
        freq: Dict[str, int] = {}
        total = 0
        weighted = 0.0
        for kw in usable_sorted:
            count = text.count(kw)
            if count:
                freq[kw] = count
                total += count
                weighted += count * len(kw)
        denom = sum(len(kw) for kw in usable) or 1
        norm = weighted / denom
        results.append((topic, total, freq, norm))
    results.sort(key=lambda x: (x[3], x[1]), reverse=True)
    return results


def infer_topic(
    scored: List[Tuple[str, int, Dict[str, int], float]],
    tie_margin: float = TOPIC_SCORE_TIE_MARGIN,
) -> Tuple[Optional[str], List[str]]:
    if not scored or scored[0][1] == 0:
        return None, []
    best_name, _, _, best_norm = scored[0]
    tied = [
        name
        for name, total, _, norm in scored
        if total > 0 and abs(norm - best_norm) <= tie_margin
    ]
    return best_name, tied


# 옛 이름
infer_thinker = infer_topic


def to_dataframe(
    scored: List[Tuple[str, int, Dict[str, int], float]],
) -> pd.DataFrame:
    rows = []
    for rank, (name, total, freq, norm) in enumerate(scored, start=1):
        rows.append(
            {
                "순위": rank,
                "주제": name,
                "총빈도": total,
                "정규화점수": round(norm, 4),
                "매칭키워드": ", ".join(f"{k}×{v}" for k, v in freq.items()),
            }
        )
    return pd.DataFrame(rows)


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="지문을 주제 키워드 사전과 대조해 빈도와 추정 주제를 산출합니다.",
    )
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--text", type=str, help="분석할 지문 문자열")
    src.add_argument("--text-file", type=Path, help="지문 UTF-8 텍스트 파일")
    p.add_argument(
        "--dict-json",
        "--pack",
        dest="dict_json",
        type=Path,
        required=True,
        help="주제→키워드 JSON (또는 units/topics 팩)",
    )
    p.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="결과 Excel 경로 (생략 시 콘솔만 출력)",
    )
    p.add_argument(
        "--top",
        type=int,
        default=5,
        help="콘솔에 표시할 상위 N개 (기본: 5)",
    )
    p.add_argument(
        "--json-out",
        type=Path,
        default=None,
        help="추론 요약을 JSON으로 저장",
    )
    return p.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    if args.text is not None:
        text = args.text
    else:
        text = args.text_file.read_text(encoding="utf-8")

    dictionary = load_custom_dict(args.dict_json)
    scored = score_passage(text, dictionary)
    best, tied = infer_topic(scored)
    df = to_dataframe(scored)

    print("=== 키워드 매칭 ===")
    if best is None:
        print("매칭된 키워드가 없습니다.")
    else:
        print(f"추정 주제: {best}")
        if len(tied) > 1:
            print(f"동점/근접: {', '.join(tied)}")
    print()
    print(df.head(args.top).to_string(index=False))

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        df.to_excel(args.output, index=False, engine="openpyxl")
        print(f"\nExcel 저장: {args.output.resolve()}")

    if args.json_out:
        payload = {
            "inferred": best,
            "tied": tied,
            "ranking": df.to_dict(orient="records"),
        }
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"JSON 저장: {args.json_out.resolve()}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
