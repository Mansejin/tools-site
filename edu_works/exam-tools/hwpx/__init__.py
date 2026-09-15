# -*- coding: utf-8 -*-
"""HWPX 디코드/인코드 백엔드.

개발단에서 시험지 형식을 고정하고, 웹은 이 API만 쓴다.
"""

from __future__ import annotations

from .decode import decode_hwpx, extract_plain_text
from .encode import (
    encode_document,
    encode_plain_paragraphs,
    encode_questions_json,
    fill_template_hwpx,
    fill_unpacked_dir,
    mapping_from_questions,
)
from .models import Choice, FormatProfile, HwpxDocument, Paragraph, Question
from .package import HwpxPackage, pack_directory

__all__ = [
    "Choice",
    "FormatProfile",
    "HwpxDocument",
    "HwpxPackage",
    "Paragraph",
    "Question",
    "decode_hwpx",
    "encode_document",
    "encode_plain_paragraphs",
    "encode_questions_json",
    "extract_plain_text",
    "fill_template_hwpx",
    "fill_unpacked_dir",
    "mapping_from_questions",
    "pack_directory",
]
