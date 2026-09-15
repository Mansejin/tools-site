#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""언팩된 HWPX의 Contents/section0.xml 플레이스홀더를 치환한 뒤 .hwpx로 재압축한다.

플레이스홀더 예:
  {{문제1}}, {{선지1}}, {{문제2}}, {{선지2_1}} …
데이터는 JSON(dict) 또는 Excel(키/값 두 열)로 공급한다.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Dict, Mapping, Optional

import pandas as pd

PLACEHOLDER_RE = re.compile(r"\{\{\s*([^\{\}]+?)\s*\}\}")


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
        # {{이름}} 형태로 저장된 경우 정규화
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


def apply_replacements(xml_text: str, mapping: Mapping[str, str], strict: bool) -> str:
    missing = []

    def repl(match: re.Match[str]) -> str:
        key = match.group(1).strip()
        if key in mapping:
            # XML 특수문자 최소 이스케이프
            return _xml_escape(mapping[key])
        missing.append(key)
        return match.group(0)

    out = PLACEHOLDER_RE.sub(repl, xml_text)
    if strict and missing:
        uniq = sorted(set(missing))
        raise KeyError(f"치환되지 않은 플레이스홀더: {', '.join(uniq)}")
    return out


def _xml_escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def find_section_xml(unpacked_dir: Path) -> Path:
    candidate = unpacked_dir / "Contents" / "section0.xml"
    if candidate.is_file():
        return candidate
    # 일부 템플릿은 Contents 대소문자/경로가 다를 수 있음
    matches = list(unpacked_dir.rglob("section0.xml"))
    if not matches:
        raise FileNotFoundError(
            f"section0.xml을 찾지 못했습니다: {unpacked_dir}"
        )
    return matches[0]


def zip_hwpx(source_dir: Path, output_hwpx: Path) -> None:
    output_hwpx.parent.mkdir(parents=True, exist_ok=True)
    if output_hwpx.exists():
        output_hwpx.unlink()
    with zipfile.ZipFile(output_hwpx, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(source_dir.rglob("*")):
            if path.is_file():
                arcname = path.relative_to(source_dir).as_posix()
                zf.write(path, arcname)


def process(
    unpacked_dir: Path,
    data_path: Path,
    output_hwpx: Path,
    strict: bool,
    inplace: bool,
) -> Path:
    mapping = load_replacements(data_path)
    section = find_section_xml(unpacked_dir)
    original = section.read_text(encoding="utf-8")
    filled = apply_replacements(original, mapping, strict=strict)

    if inplace:
        section.write_text(filled, encoding="utf-8")
        work_dir = unpacked_dir
        zip_hwpx(work_dir, output_hwpx)
        return output_hwpx

    with tempfile.TemporaryDirectory(prefix="hwpx_fill_") as tmp:
        tmp_path = Path(tmp)
        shutil.copytree(unpacked_dir, tmp_path / "pkg", dirs_exist_ok=True)
        work = tmp_path / "pkg"
        target = find_section_xml(work)
        target.write_text(filled, encoding="utf-8")
        zip_hwpx(work, output_hwpx)
    return output_hwpx


def parse_args(argv: Optional[list] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description=(
            "언팩된 HWPX의 section0.xml 플레이스홀더({{문제1}} 등)를 "
            "데이터로 치환한 뒤 .hwpx로 재압축합니다."
        ),
    )
    p.add_argument(
        "--unpacked",
        type=Path,
        required=True,
        help="언팩된 HWPX 디렉터리 (Contents/section0.xml 포함)",
    )
    p.add_argument(
        "--data",
        type=Path,
        required=True,
        help="치환 데이터 JSON 또는 Excel (키→값)",
    )
    p.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("filled_exam.hwpx"),
        help="출력 .hwpx 경로 (기본: filled_exam.hwpx)",
    )
    p.add_argument(
        "--strict",
        action="store_true",
        help="미치환 플레이스홀더가 있으면 오류로 중단",
    )
    p.add_argument(
        "--inplace",
        action="store_true",
        help="언팩 디렉터리의 section0.xml을 직접 수정 후 압축",
    )
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
