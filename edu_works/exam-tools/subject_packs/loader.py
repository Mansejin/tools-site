# -*- coding: utf-8 -*-
"""Load optional subject keyword packs from JSON.

A pack is never the app default. Extract/classify and keyword matching
work without one (split only / require an uploaded dict).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Mapping, Optional

KeywordMap = Dict[str, List[str]]

DEFAULT_UNIT_MATCH_THRESHOLD: int = 1
TOPIC_SCORE_TIE_MARGIN: float = 0.0


@dataclass(frozen=True)
class SubjectPack:
    name: str
    label: str
    units: KeywordMap = field(default_factory=dict)
    topics: KeywordMap = field(default_factory=dict)

    def invert_units(self) -> Dict[str, str]:
        inverted: Dict[str, str] = {}
        for unit, keywords in self.units.items():
            for kw in keywords:
                inverted.setdefault(kw, unit)
        return inverted


def packs_dir() -> Path:
    return Path(__file__).resolve().parent


def empty_pack() -> SubjectPack:
    return SubjectPack(name="", label="", units={}, topics={})


def _as_keyword_map(raw: object, field_name: str) -> KeywordMap:
    if raw is None:
        return {}
    if not isinstance(raw, dict):
        raise ValueError(f"{field_name} 은 객체여야 합니다.")
    result: KeywordMap = {}
    for key, keywords in raw.items():
        if not isinstance(keywords, list):
            raise ValueError(f"{field_name}.{key}: 키워드 목록(list)이 필요합니다.")
        result[str(key)] = [str(k) for k in keywords]
    return result


def load_pack_json(data: Mapping[str, object]) -> SubjectPack:
    """JSON 객체 → 팩. units / topics 둘 다 선택.

    단원만 있는 파일, 주제만 있는 파일, {주제: [키워드]} 평탄 사전도 허용.
    """
    if "units" in data or "topics" in data or "name" in data or "label" in data:
        name = str(data.get("name") or "")
        label = str(data.get("label") or name)
        units = _as_keyword_map(data.get("units"), "units")
        topics = _as_keyword_map(data.get("topics"), "topics")
        return SubjectPack(name=name, label=label, units=units, topics=topics)

    # 평탄 사전: {"주제": ["키워드", ...]} — 키워드 매칭용
    topics = _as_keyword_map(data, "topics")
    return SubjectPack(name="", label="", units={}, topics=topics)


def load_pack_path(path: Path) -> SubjectPack:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError("팩 JSON 루트는 객체여야 합니다.")
    pack = load_pack_json(raw)
    if not pack.name:
        return SubjectPack(
            name=path.stem,
            label=pack.label or path.stem,
            units=pack.units,
            topics=pack.topics,
        )
    return pack


def load_builtin_pack(stem: str) -> SubjectPack:
    path = packs_dir() / f"{stem}.json"
    if not path.is_file():
        raise FileNotFoundError(f"내장 팩이 없습니다: {path.name}")
    return load_pack_path(path)


def list_builtin_packs() -> List[SubjectPack]:
    found: List[SubjectPack] = []
    for path in sorted(packs_dir().glob("*.json")):
        found.append(load_pack_path(path))
    return found
