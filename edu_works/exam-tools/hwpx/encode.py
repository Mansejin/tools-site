# -*- coding: utf-8 -*-
"""HwpxDocument / 치환 맵 → HWPX 인코드."""

from __future__ import annotations

import json
import re
import tempfile
from pathlib import Path
from typing import Dict, List, Mapping, Optional, Sequence, Union

from .models import HwpxDocument, Question
from .package import HwpxPackage, copy_unpacked, find_section0, pack_directory
from .xmlutil import xml_escape

PLACEHOLDER_RE = re.compile(r"\{\{\s*([^\{\}]+?)\s*\}\}")


def apply_replacements(xml_text: str, mapping: Mapping[str, str], *, strict: bool) -> str:
    missing: List[str] = []

    def repl(match: re.Match[str]) -> str:
        key = match.group(1).strip()
        if key in mapping:
            return xml_escape(mapping[key])
        missing.append(key)
        return match.group(0)

    out = PLACEHOLDER_RE.sub(repl, xml_text)
    if strict and missing:
        raise KeyError(f"미치환 플레이스홀더: {', '.join(sorted(set(missing)))}")
    return out


def mapping_from_questions(questions: Sequence[Question]) -> Dict[str, str]:
    """표준 자리표시 {{문제N}}, {{선지N_M}} 맵."""
    mapping: Dict[str, str] = {}
    for q in questions:
        stem = q.stem.strip()
        numbered = stem
        if not re.match(rf"^(?:문항\s*)?{q.number}\s*[.)．、]", stem):
            numbered = f"{q.number}. {stem}"
        mapping[f"문제{q.number}"] = numbered
        mapping[f"문항{q.number}"] = numbered
        mapping[f"줄기{q.number}"] = stem
        for c in q.choices:
            mapping[f"선지{q.number}_{c.number}"] = c.text
            mapping[f"선지{q.number}-{c.number}"] = c.text
    return mapping


def fill_template_hwpx(
    template: Union[str, Path],
    mapping: Mapping[str, str],
    output: Union[str, Path],
    *,
    strict: bool = False,
) -> Path:
    """템플릿 .hwpx 의 section0.xml 플레이스홀더를 채운 뒤 저장."""
    pkg = HwpxPackage(Path(template))
    out = Path(output)
    with tempfile.TemporaryDirectory(prefix="hwpx_enc_") as tmp:
        work = Path(tmp) / "pkg"
        pkg.unpack_to(work)
        section = find_section0(work)
        filled = apply_replacements(
            section.read_text(encoding="utf-8"),
            mapping,
            strict=strict,
        )
        section.write_text(filled, encoding="utf-8")
        return pack_directory(work, out)


def fill_unpacked_dir(
    unpacked_dir: Path,
    mapping: Mapping[str, str],
    output: Path,
    *,
    strict: bool = False,
) -> Path:
    with tempfile.TemporaryDirectory(prefix="hwpx_enc_") as tmp:
        work = Path(tmp) / "pkg"
        copy_unpacked(unpacked_dir, work)
        section = find_section0(work)
        filled = apply_replacements(
            section.read_text(encoding="utf-8"),
            mapping,
            strict=strict,
        )
        section.write_text(filled, encoding="utf-8")
        return pack_directory(work, output)


def encode_document(
    doc: HwpxDocument,
    template: Union[str, Path],
    output: Union[str, Path],
    *,
    strict: bool = False,
) -> Path:
    """디코드 IR(문항) → 템플릿 플레이스홀더 채우기."""
    mapping = mapping_from_questions(doc.questions)
    if not mapping and doc.plain_text:
        mapping = {"본문": doc.plain_text}
    return fill_template_hwpx(template, mapping, output, strict=strict)


def encode_questions_json(
    questions_json: Union[str, Path],
    template: Union[str, Path],
    output: Union[str, Path],
    *,
    strict: bool = False,
) -> Path:
    data = json.loads(Path(questions_json).read_text(encoding="utf-8"))
    if isinstance(data, dict) and "questions" in data:
        doc = HwpxDocument.from_dict(data)
    elif isinstance(data, list):
        doc = HwpxDocument.from_dict({"questions": data})
    elif isinstance(data, dict):
        # 이미 placeholder 맵
        return fill_template_hwpx(template, {str(k): str(v) for k, v in data.items()}, output, strict=strict)
    else:
        raise ValueError("questions JSON 형식을 알 수 없습니다.")
    return encode_document(doc, template, output, strict=strict)


def build_minimal_section_xml(paragraphs: Sequence[str]) -> str:
    """테스트·폴백용 최소 section XML."""
    ns = "http://www.hancom.co.kr/hwpml/2011/paragraph"
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<sec xmlns:hp="{ns}">',
    ]
    for text in paragraphs:
        esc = xml_escape(text)
        parts.append(f"  <hp:p><hp:t>{esc}</hp:t></hp:p>")
    parts.append("</sec>")
    return "\n".join(parts) + "\n"


def encode_plain_paragraphs(
    paragraphs: Sequence[str],
    output: Union[str, Path],
) -> Path:
    """문단 목록만으로 최소 .hwpx 생성 (개발/테스트용)."""
    out = Path(output)
    with tempfile.TemporaryDirectory(prefix="hwpx_min_") as tmp:
        root = Path(tmp) / "pkg"
        contents = root / "Contents"
        contents.mkdir(parents=True)
        (contents / "section0.xml").write_text(
            build_minimal_section_xml(paragraphs),
            encoding="utf-8",
        )
        (root / "mimetype").write_text(
            "application/hwp+zip",
            encoding="utf-8",
        )
        return pack_directory(root, out)
