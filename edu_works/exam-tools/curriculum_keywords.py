# -*- coding: utf-8 -*-
"""호환 심: 윤리와사상 팩을 기본 과목으로 쓰지 않는다.

옛 import 경로를 깨지 않기 위한 래퍼다. 새 코드는 subject_packs.loader 를 쓴다.
"""

from __future__ import annotations

from typing import Dict, List

from subject_packs.loader import (
    DEFAULT_UNIT_MATCH_THRESHOLD,
    TOPIC_SCORE_TIE_MARGIN,
    load_builtin_pack,
)

_PACK = load_builtin_pack("ethics_and_thought")

UNIT_KEYWORDS: Dict[str, List[str]] = _PACK.units
THINKER_KEYWORDS: Dict[str, List[str]] = _PACK.topics
TOPIC_KEYWORDS: Dict[str, List[str]] = _PACK.topics
THINKER_SCORE_TIE_MARGIN: float = TOPIC_SCORE_TIE_MARGIN


def invert_unit_keywords() -> Dict[str, str]:
    return _PACK.invert_units()


def all_unit_names() -> List[str]:
    return list(UNIT_KEYWORDS.keys())


def all_thinker_names() -> List[str]:
    return list(THINKER_KEYWORDS.keys())
