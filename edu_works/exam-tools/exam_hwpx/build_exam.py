# -*- coding: utf-8 -*-
"""문항(+선택 그림) → HWPX 패키지 생성 (python-hwpx).

기본 레이아웃: 내신판 실측 JIS B4 · 2단 (`page_layout.b4_2col`).
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import List, Optional, Sequence

from hwpx import HwpxDocument

from .page_layout import (
    DEFAULT_PAGE_PROFILE,
    PAGE_PROFILES,
    apply_page_profile,
    get_profile,
)

__all__ = [
    "DEFAULT_PAGE_PROFILE",
    "PAGE_PROFILES",
    "apply_page_profile",
    "get_profile",
    "write_question_hwpx",
]

CIRCLED = "①②③④⑤"
# B4 2단 한 칸 ≈ 106mm — 그림은 거의 단 폭
DEFAULT_IMAGE_WIDTH_MM = 100.0


def _numbered_stem(stem: str, number: int) -> str:
    text = stem.strip()
    if re.match(r"^(?:문항\s*)?\d{1,3}\s*[.)．、]", text):
        return text
    return f"{number}. {text}"


def _choice_line(index: int, text: str) -> str:
    """①~⑤ 선지 — 앞공백·중복 원문자 정규화 (모두 동일 패턴)."""
    body = text.strip()
    for ch in CIRCLED:
        if body.startswith(ch):
            body = body[len(ch) :].lstrip(" .)．、\t")
            break
    mark = CIRCLED[index - 1] if 1 <= index <= 5 else f"{index})"
    # 일반 공백 1칸으로 통일 (전각/탭 금지)
    return f"{mark} {body}"


def write_question_hwpx(
    output: Path,
    *,
    stem: str,
    choices: Sequence[str],
    image_path: Optional[Path] = None,
    preface_lines: Optional[Sequence[str]] = None,
    page_profile: str = DEFAULT_PAGE_PROFILE,
    skeleton: Optional[Path] = None,
    number: int = 1,
    image_width_mm: float = DEFAULT_IMAGE_WIDTH_MM,
) -> Path:
    """객관식 1문항 HWPX. 용지/단은 page_profile 적용.

    preface_lines: 본문 위 평문(대화 박스는 그림에 넣는 것을 권장).
    """
    _ = skeleton
    get_profile(page_profile)

    paras: List[str] = []
    if preface_lines:
        paras.extend(line.strip() for line in preface_lines if line.strip())
    paras.append(_numbered_stem(stem, number))
    stem_index = len(paras) - 1
    for i, c in enumerate(choices, start=1):
        paras.append(_choice_line(i, c))

    out = Path(output)
    out.parent.mkdir(parents=True, exist_ok=True)

    doc = HwpxDocument.new()
    try:
        apply_page_profile(doc, page_profile)

        for i, text in enumerate(paras):
            doc.add_paragraph(text)
            if image_path is not None and i == stem_index:
                img = Path(image_path)
                data = img.read_bytes()
                fmt = img.suffix.lower().lstrip(".") or "png"
                if fmt == "jpeg":
                    fmt = "jpg"
                doc.add_picture(data, fmt, width_mm=float(image_width_mm))

        doc.save_to_path(str(out))
    finally:
        doc.close()
    return out
