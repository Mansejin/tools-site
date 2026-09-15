# -*- coding: utf-8 -*-
"""HWPX → IR. 백엔드: python-hwpx (PyPI)."""

from __future__ import annotations

import re
from pathlib import Path
from typing import List, Union

from hwpx import HwpxDocument

from .models import HwpxDocument as ExamHwpxDocument, Paragraph
from .questions import questions_from_paragraphs

PLACEHOLDER_RE = re.compile(r"\{\{[^}]+\}\}")


def extract_plain_text(path: Union[str, Path]) -> str:
    """HWPX 본문 평문 (수식·그림 자리는 공백일 수 있음)."""
    doc = HwpxDocument.open(path)
    try:
        if hasattr(doc, "text") and hasattr(doc.text, "plain"):
            return doc.text.plain()
        return doc.export_text()
    finally:
        doc.close()


def decode_hwpx(path: Union[str, Path]) -> ExamHwpxDocument:
    """python-hwpx로 열고 시험도구 IR로 변환."""
    path = Path(path)
    raw = HwpxDocument.open(path)
    try:
        plain = (
            raw.text.plain()
            if hasattr(raw, "text") and hasattr(raw.text, "plain")
            else raw.export_text()
        )
        paragraphs: List[Paragraph] = []
        for i, p in enumerate(raw.paragraphs):
            text = (getattr(p, "text", None) or "").strip()
            if not text:
                continue
            paragraphs.append(Paragraph(text=text, section="section0.xml", index=i))

        placeholders = sorted(set(PLACEHOLDER_RE.findall(plain)))
        questions = questions_from_paragraphs([p.text for p in paragraphs])
        if placeholders and not any(q.choices for q in questions):
            kind = "template"
        elif questions:
            kind = "exam"
        else:
            kind = "unknown"

        page = {}
        if raw.sections:
            props = raw.sections[0].properties
            ps = props.page_size
            pm = props.page_margins
            page = {
                "width": ps.width,
                "height": ps.height,
                "orientation": ps.orientation,
                "margins": {
                    "left": pm.left,
                    "right": pm.right,
                    "top": pm.top,
                    "bottom": pm.bottom,
                    "header": pm.header,
                    "footer": pm.footer,
                    "gutter": pm.gutter,
                },
            }

        return ExamHwpxDocument(
            source=str(path.resolve()),
            kind_guess=kind,
            member_count=len(list(raw.package.part_names())),
            sections=list(raw.package.section_paths()),
            placeholders=placeholders,
            plain_text=plain,
            paragraphs=paragraphs,
            questions=questions,
            meta={"backend": "python-hwpx", "page": page},
        )
    finally:
        raw.close()
