# -*- coding: utf-8 -*-
"""HWPX → HwpxDocument 디코드."""

from __future__ import annotations

import re
from pathlib import Path
from typing import List, Optional, Union

from .models import HwpxDocument, Paragraph
from .package import HwpxPackage, find_section_xmls
from .questions import questions_from_paragraphs
from .xmlutil import paragraph_texts

PLACEHOLDER_RE = re.compile(r"\{\{[^}]+\}\}")


def decode_hwpx(path: Union[str, Path]) -> HwpxDocument:
    pkg = HwpxPackage(Path(path))
    paragraphs: List[Paragraph] = []
    placeholders: List[str] = []
    section_names: List[str] = []

    with pkg.unpacked() as root:
        sections = find_section_xmls(root)
        if not sections:
            raise FileNotFoundError(f"Contents/section*.xml 없음: {path}")
        for sec in sections:
            section_names.append(sec.name)
            raw = sec.read_bytes()
            placeholders.extend(PLACEHOLDER_RE.findall(raw.decode("utf-8", errors="replace")))
            for i, text in enumerate(paragraph_texts(raw)):
                paragraphs.append(Paragraph(text=text, section=sec.name, index=i))

    plain = "\n".join(p.text for p in paragraphs)
    uniq_ph = sorted(set(placeholders))
    questions = questions_from_paragraphs([p.text for p in paragraphs])
    if uniq_ph and not any(q.choices for q in questions):
        kind = "template"
    elif questions:
        kind = "exam"
    else:
        kind = "unknown"

    return HwpxDocument(
        source=str(Path(path).resolve()),
        sections=section_names,
        paragraphs=paragraphs,
        placeholders=uniq_ph,
        questions=questions,
        plain_text=plain,
        member_count=len(pkg.namelist()),
        kind_guess=kind,
    )


def extract_plain_text(path: Union[str, Path]) -> str:
    return decode_hwpx(path).plain_text
