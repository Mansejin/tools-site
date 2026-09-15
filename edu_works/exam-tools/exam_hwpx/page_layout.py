# -*- coding: utf-8 -*-
"""시험지 용지·여백·단 프로필 (내신판 학교 시험지 실측 기준)."""

from __future__ import annotations

from typing import Any, Dict, Mapping

# HWPUNIT: 7200 = 1 inch
def mm_to_hwpunit(v: float) -> int:
    return int(round(v * 7200 / 25.4))


def hwpunit_to_mm(v: int) -> float:
    return round(v * 25.4 / 7200, 1)


# 내신판(배방고·예당고 2026 기말) 실측 → 시험지 기본
# 마이일타 해설은 A4·2단 (별도 프로필)
PAGE_PROFILES: Dict[str, Dict[str, Any]] = {
    "b4_2col": {
        "label": "JIS B4 · 2단 (내신판 학교 시험지)",
        "orientation": "WIDELY",
        "width": 72852,  # 257 mm
        "height": 103180,  # 364 mm
        "margin": {
            "header": 4251,  # 15 mm
            "footer": 4251,
            "gutter": 0,
            "left": 5102,  # 18 mm
            "right": 5102,
            "top": 3401,  # 12 mm
            "bottom": 4251,  # 15 mm
        },
        "col_count": 2,
        "col_gap": 2268,
        "col_type": "NEWSPAPER",
        "col_layout": "LEFT",
        "col_separator": "SOLID",
        "col_separator_width": "0.12 mm",
        "col_separator_color": "#000000",
    },
    "a4_2col": {
        "label": "A4 · 2단 (마이일타 해설)",
        "orientation": "WIDELY",
        "width": mm_to_hwpunit(210),
        "height": mm_to_hwpunit(297),
        "margin": {
            "header": mm_to_hwpunit(15),
            "footer": mm_to_hwpunit(15),
            "gutter": 0,
            "left": mm_to_hwpunit(15),
            "right": mm_to_hwpunit(15),
            "top": mm_to_hwpunit(10),
            "bottom": mm_to_hwpunit(10),
        },
        "col_count": 2,
        "col_gap": 1700,
        "col_type": "NEWSPAPER",
        "col_layout": "LEFT",
        "col_separator": "SOLID",
        "col_separator_width": "0.12 mm",
        "col_separator_color": "#000000",
    },
    "a3_2col": {
        "label": "A3 가로 · 2단",
        "orientation": "WIDELY",
        "width": mm_to_hwpunit(420),
        "height": mm_to_hwpunit(297),
        "margin": {
            "header": mm_to_hwpunit(15),
            "footer": mm_to_hwpunit(15),
            "gutter": 0,
            "left": mm_to_hwpunit(15),
            "right": mm_to_hwpunit(15),
            "top": mm_to_hwpunit(10),
            "bottom": mm_to_hwpunit(10),
        },
        "col_count": 2,
        "col_gap": 1700,
        "col_type": "NEWSPAPER",
        "col_layout": "LEFT",
        "col_separator": "SOLID",
        "col_separator_width": "0.12 mm",
        "col_separator_color": "#000000",
    },
}

DEFAULT_PAGE_PROFILE = "b4_2col"


def get_profile(name: str) -> Mapping[str, Any]:
    if name not in PAGE_PROFILES:
        raise KeyError(f"unknown page profile: {name}. choose from {list(PAGE_PROFILES)}")
    return PAGE_PROFILES[name]


def apply_page_profile(doc: Any, profile_name: str = DEFAULT_PAGE_PROFILE) -> Dict[str, Any]:
    """python-hwpx HwpxDocument 에 용지·여백·2단을 적용.

    Returns:
        적용된 프로필 요약(mm 포함).
    """
    prof = get_profile(profile_name)
    m = prof["margin"]

    doc.set_page_size(
        width=int(prof["width"]),
        height=int(prof["height"]),
        orientation=str(prof["orientation"]),
        gutter_type="LEFT_ONLY",
    )
    doc.set_page_margins(
        left=int(m["left"]),
        right=int(m["right"]),
        top=int(m["top"]),
        bottom=int(m["bottom"]),
        header=int(m["header"]),
        footer=int(m["footer"]),
        gutter=int(m["gutter"]),
    )
    doc.set_columns(
        int(prof["col_count"]),
        col_type=str(prof["col_type"]),
        layout=str(prof["col_layout"]),
        same_size=True,
        same_gap=int(prof["col_gap"]),
        separator_type=str(prof["col_separator"]),
        separator_width=str(prof["col_separator_width"]),
        separator_color=str(prof["col_separator_color"]),
    )

    return {
        "profile": profile_name,
        "label": prof["label"],
        "width_mm": hwpunit_to_mm(int(prof["width"])),
        "height_mm": hwpunit_to_mm(int(prof["height"])),
        "col_count": prof["col_count"],
        "col_gap": prof["col_gap"],
        "margins_mm": {k: hwpunit_to_mm(int(v)) for k, v in m.items()},
    }
