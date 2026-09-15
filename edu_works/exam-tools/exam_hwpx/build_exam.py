# -*- coding: utf-8 -*-
"""문항(+선택 그림) → HWPX 패키지 생성 (python-hwpx).

기본 레이아웃: 내신판 실측 JIS B4 · 2단 (`page_layout.b4_2col`).
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional, Sequence

from hwpx import HwpxDocument

from .page_layout import (
    DEFAULT_PAGE_PROFILE,
    PAGE_PROFILES,
    apply_page_profile,
    get_profile,
)

# 하위 호환 re-export
__all__ = [
    "DEFAULT_PAGE_PROFILE",
    "PAGE_PROFILES",
    "apply_page_profile",
    "get_profile",
    "write_question_hwpx",
]


def write_question_hwpx(
    output: Path,
    *,
    stem: str,
    choices: Sequence[str],
    image_path: Optional[Path] = None,
    preface_lines: Optional[Sequence[str]] = None,
    page_profile: str = DEFAULT_PAGE_PROFILE,
    skeleton: Optional[Path] = None,  # unused; kept for call-site compat
) -> Path:
    """객관식 1문항 HWPX. 용지/단은 page_profile 적용."""
    _ = skeleton  # 골격은 python-hwpx 빈 문서 + 프로필로 대체
    get_profile(page_profile)  # validate early

    paras: List[str] = []
    if preface_lines:
        paras.extend(preface_lines)
    paras.append(stem)
    stem_index = len(paras) - 1
    for i, c in enumerate(choices, start=1):
        mark = "①②③④⑤"[i - 1] if i <= 5 else f"{i})"
        text = c if c.startswith(("①", "②", "③", "④", "⑤")) else f"{mark} {c}"
        paras.append(text)

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
                # 단 폭에 맞게 ~80mm 정도
                doc.add_picture(data, fmt, width_mm=80.0)

        doc.save_to_path(str(out))
    finally:
        doc.close()
    return out
