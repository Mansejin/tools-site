#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""언팩된 HWPX 플레이스홀더를 치환한 뒤 .hwpx로 재압축한다.

구현은 hwpx.encode 백엔드에 위임한다.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Mapping, Optional

import pandas as pd

from hwpx.encode import apply_replacements, fill_unpacked_dir
from hwpx.package import find_section0, pack_directory


def load_replacements_json(path: Path) -> Dict[str, str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("JSON 루트는 객체(dict)여야 합니다.")
    return {str(k): "" if v is None else str(v) for k, v in data.items()}


def load_replacements_excel(path: Path) -> Dict[str, str]:
    df = pd.read_excel(path, engine="openpyxl")
    cols = {str(c).strip().lower(): c for c in df.columns}
    key_col = cols.get("key") or cols.get("키") or cols.get("placeholder") or list(df.columns)[0]
    val_col = cols.get("value") or cols.get("값") or cols.get("내용") or list(df.columns)[1]
    result: Dict[str, str] = {}
    for _, row in df.iterrows():
        key = str(row[key_col]).strip()
        key = key.removeprefix("{{").removesuffix("}}").strip()
        val = "" if pd.isna(row[val_col]) else str(row[val_col])
        result[key] = val
    return result


def load_replacements(path: Path) -> Dict[str, str]:
    suffix = path.suffix.lower()
    if suffix == ".json":
        return load_replacements_json(path)
    if suffix in {".xlsx", ".xls"}:
        return load_replacements_excel(path)
    raise ValueError(f"지원하지 않는 데이터 형식: {suffix}")


def find_section_xml(unpacked_dir: Path) -> Path:
    return find_section0(unpacked_dir)


def zip_hwpx(source_dir: Path, output_hwpx: Path) -> None:
    pack_directory(source_dir, output_hwpx)


def process(
    unpacked_dir: Path,
    data_path: Path,
    output_hwpx: Path,
    strict: bool,
    inplace: bool,
) -> Path:
    mapping = load_replacements(data_path)
    if inplace:
        section = find_section0(unpacked_dir)
        filled = apply_replacements(
            section.read_text(encoding="utf-8"),
            mapping,
            strict=strict,
        )
        section.write_text(filled, encoding="utf-8")
        return pack_directory(unpacked_dir, output_hwpx)
    return fill_unpacked_dir(unpacked_dir, mapping, output_hwpx, strict=strict)


def parse_args(argv: Optional[list] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description=(
            "언팩된 HWPX의 section0.xml 플레이스홀더({{문제1}} 등)를 "
            "데이터로 치환한 뒤 .hwpx로 재압축합니다."
        ),
    )
    p.add_argument("--unpacked", type=Path, required=True)
    p.add_argument("--data", type=Path, required=True)
    p.add_argument("-o", "--output", type=Path, default=Path("filled_exam.hwpx"))
    p.add_argument("--strict", action="store_true")
    p.add_argument("--inplace", action="store_true")
    return p.parse_args(argv)


def main(argv: Optional[list] = None) -> int:
    args = parse_args(argv)
    if not args.unpacked.is_dir():
        raise SystemExit(f"언팩 디렉터리가 없습니다: {args.unpacked}")
    out = process(
        unpacked_dir=args.unpacked,
        data_path=args.data,
        output_hwpx=args.output,
        strict=args.strict,
        inplace=args.inplace,
    )
    print(f"HWPX 저장: {out.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
