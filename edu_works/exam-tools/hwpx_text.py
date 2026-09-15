#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""HWPX(.hwpx = ZIP)에서 본문 텍스트를 추출한다.

한글 XML은 문단(hp:p) 안의 텍스트 런(hp:t)에 글자가 갈라져 있다.
문단 단위로 이어 붙여 문항 번호 분리에 쓰기 좋은 평문을 만든다.
"""

from __future__ import annotations

import re
import tempfile
import zipfile
from pathlib import Path
from typing import Iterable, List, Optional
from xml.etree import ElementTree as ET

# hp:t / hh:t 등 네임스페이스 무시하고 localname == t
_T_LOCAL = "t"
_P_LOCAL = "p"


def _local(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    if ":" in tag:
        return tag.split(":", 1)[-1]
    return tag


def paragraph_texts_from_xml(xml_bytes: bytes) -> List[str]:
    """section*.xml 바이트 → 문단 문자열 목록."""
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        # 태그 제거 폴백
        text = xml_bytes.decode("utf-8", errors="replace")
        plain = re.sub(r"<[^>]+>", "\n", text)
        return [ln.strip() for ln in plain.splitlines() if ln.strip()]

    paragraphs: List[str] = []
    for el in root.iter():
        if _local(el.tag) != _P_LOCAL:
            continue
        chunks: List[str] = []
        for node in el.iter():
            if _local(node.tag) == _T_LOCAL and node.text:
                chunks.append(node.text)
        line = "".join(chunks).strip()
        if line:
            paragraphs.append(line)
    if paragraphs:
        return paragraphs

    # p/t 구조가 없으면 모든 텍스트 노드
    chunks = []
    for node in root.iter():
        if node.text and node.text.strip():
            chunks.append(node.text.strip())
        if node.tail and node.tail.strip():
            chunks.append(node.tail.strip())
    return chunks


def extract_text_from_section_files(section_paths: Iterable[Path]) -> str:
    lines: List[str] = []
    for path in sorted(section_paths):
        lines.extend(paragraph_texts_from_xml(path.read_bytes()))
    return "\n".join(lines)


def find_section_xmls(root: Path) -> List[Path]:
    return sorted(root.rglob("section*.xml"))


def extract_text_from_unpacked(unpacked_dir: Path) -> str:
    sections = find_section_xmls(unpacked_dir)
    if not sections:
        raise FileNotFoundError(
            f"Contents/section*.xml 을 찾지 못했습니다: {unpacked_dir}"
        )
    return extract_text_from_section_files(sections)


def extract_text_from_hwpx(path: Path) -> str:
    """`.hwpx` 또는 section XML이 든 `.zip`에서 평문 추출."""
    suffix = path.suffix.lower()
    if suffix not in {".hwpx", ".zip"}:
        raise ValueError(f"HWPX/ZIP만 지원합니다: {path.suffix}")

    with tempfile.TemporaryDirectory(prefix="hwpx_text_") as tmp:
        root = Path(tmp) / "root"
        root.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(path, "r") as zf:
            zf.extractall(root)
        return extract_text_from_unpacked(root)


def load_exam_text(path: Path) -> str:
    """시험 파일 → 평문. .hwpx/.zip/.txt/.md 지원."""
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
    import argparse

    p = argparse.ArgumentParser(description="HWPX에서 본문 텍스트 추출")
    p.add_argument("path", type=Path, help=".hwpx 또는 .zip 경로")
    p.add_argument(
        "-o",
        "--output",
        type=Path,
        help="텍스트 저장 경로(없으면 stdout)",
    )
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
