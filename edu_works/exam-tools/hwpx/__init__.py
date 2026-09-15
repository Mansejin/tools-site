# -*- coding: utf-8 -*-
"""HWPX 디코드/인코드 백엔드.

개발단에서 시험지 형식을 고정하고, 웹은 이 API만 쓴다.
"""

from __future__ import annotations

from .build_exam import write_question_hwpx
from .decode import decode_hwpx, extract_plain_text
from .encode import (
    encode_document,
    encode_plain_paragraphs,
    encode_questions_json,
    fill_template_hwpx,
    fill_unpacked_dir,
    mapping_from_questions,
)
from .figures import render_figure, render_flowchart_gap_eul, render_venn_gap_eul
from .models import Choice, FormatProfile, HwpxDocument, Paragraph, Question
from .package import HwpxPackage, pack_directory
from .vision_analyze import (
    analyze_image_gemini,
    analyze_image_openai,
    extract_bindata_images,
    load_gemini_api_key,
)

__all__ = [
    "Choice",
    "FormatProfile",
    "HwpxDocument",
    "HwpxPackage",
    "Paragraph",
    "Question",
    "analyze_image_gemini",
    "analyze_image_openai",
    "decode_hwpx",
    "encode_document",
    "encode_plain_paragraphs",
    "encode_questions_json",
    "extract_bindata_images",
    "extract_plain_text",
    "fill_template_hwpx",
    "fill_unpacked_dir",
    "load_gemini_api_key",
    "mapping_from_questions",
    "pack_directory",
    "render_figure",
    "render_flowchart_gap_eul",
    "render_venn_gap_eul",
    "write_question_hwpx",
]
