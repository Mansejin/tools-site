# -*- coding: utf-8 -*-
"""평문/문단에서 문항·선지 분리."""

from __future__ import annotations

import re
from typing import List, Sequence, Tuple

from .models import Choice, Question

QUESTION_SPLIT_RE = re.compile(
    r"(?:^|\n)\s*(?:문항\s*)?(\d{1,3})\s*[.)．、]\s*",
    re.MULTILINE,
)
CIRCLED = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5}
CHOICE_LINE_RE = re.compile(
    r"^\s*(?:([①②③④⑤])|([1-5])\s*[.)］\)]|\(([1-5])\))\s*(.*)\s*$"
)


def split_raw_questions(raw: str) -> List[Tuple[int, str]]:
    matches = list(QUESTION_SPLIT_RE.finditer(raw))
    if not matches:
        body = raw.strip()
        return [(1, body)] if body else []
    results: List[Tuple[int, str]] = []
    for i, m in enumerate(matches):
        num = int(m.group(1))
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(raw)
        body = raw[start:end].strip()
        if body:
            results.append((num, body))
    return results


def parse_choices(body: str) -> Tuple[str, List[Choice]]:
    """문항 본문 → (줄기, 선지목록)."""
    lines = [ln for ln in body.splitlines()]
    stem_parts: List[str] = []
    choices: List[Choice] = []
    seen_choice = False
    for ln in lines:
        m = CHOICE_LINE_RE.match(ln)
        if m:
            seen_choice = True
            if m.group(1):
                num = CIRCLED[m.group(1)]
            elif m.group(2):
                num = int(m.group(2))
            else:
                num = int(m.group(3))
            text = (m.group(4) or "").strip()
            choices.append(Choice(number=num, text=text))
        elif not seen_choice:
            stem_parts.append(ln)
        else:
            # 선지 다음 줄은 직전 선지 이어붙임
            if choices:
                choices[-1].text = (choices[-1].text + " " + ln.strip()).strip()
    stem = "\n".join(stem_parts).strip()
    return stem, choices


def questions_from_text(raw: str) -> List[Question]:
    out: List[Question] = []
    for num, body in split_raw_questions(raw):
        stem, choices = parse_choices(body)
        out.append(Question(number=num, stem=stem or body, choices=choices, raw=body))
    return out


def questions_from_paragraphs(paragraphs: Sequence[str]) -> List[Question]:
    return questions_from_text("\n".join(paragraphs))
