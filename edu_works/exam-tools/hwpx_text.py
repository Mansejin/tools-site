#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""HWPX(.hwpx = ZIP)에서 본문 텍스트를 추출한다.

구현은 hwpx 백엔드(decode)에 위임한다.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable, List, Optional

from exam_hwpx.decode import extract_plain_text
from exam_hwpx.package import find_section_xmls
from exam_hwpx.xmlutil import paragraph_texts


def paragraph_texts_from_xml(xml_bytes: bytes) -> List[str]:
    return paragraph_texts(xml_bytes)


def extract_text_from_section_files(section_paths: Iterable[Path]) -> str:
    lines: List[str] = []
    for path in sorted(section_paths):
        lines.extend(paragraph_texts(path.read_bytes()))
    return "\n".join(lines)


def extract_text_from_unpacked(unpacked_dir: Path) -> str:
    sections = find_section_xmls(unpacked_dir)
    if not sections:
        raise FileNotFoundError(
            f"Contents/section*.xml 을 찾지 못했습니다: {unpacked_dir}"
        )
    return extract_text_from_section_files(sections)


def extract_text_from_hwpx(path: Path) -> str:
    return extract_plain_text(path)


def load_exam_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".hwpx", ".zip"}:
        return extract_text_from_hwpx(path)
    if suffix in {".txt", ".md", ".csv", ""}:
        return path.read_text(encoding="utf-8", errors="replace")
    raise ValueError(
        f"지원하지 않는 형식: {suffix or '(없음)'} "
        "( .hwpx / .zip / .txt )"
    )


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="HWPX에서 본문 텍스트 추출")
    p.add_argument("path", type=Path, help=".hwpx 또는 .zip 경로")
    p.add_argument("-o", "--output", type=Path, help="텍스트 저장 경로")
    args = p.parse_args(argv)
    text = extract_text_from_hwpx(args.path)
    if args.output:
        args.output.write_text(text, encoding="utf-8")
        print(f"저장: {args.output.resolve()} ({len(text)}자)")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
