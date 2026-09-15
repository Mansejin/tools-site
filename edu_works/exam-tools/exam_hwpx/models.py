# -*- coding: utf-8 -*-
"""HWPX 중간 표현(IR) 모델."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class Paragraph:
    text: str
    section: str = "section0.xml"
    index: int = 0


@dataclass
class Choice:
    number: int
    text: str


@dataclass
class Question:
    number: int
    stem: str
    choices: List[Choice] = field(default_factory=list)
    raw: str = ""


@dataclass
class HwpxDocument:
    """디코드된 HWPX 문서."""

    source: str = ""
    sections: List[str] = field(default_factory=list)
    paragraphs: List[Paragraph] = field(default_factory=list)
    placeholders: List[str] = field(default_factory=list)
    questions: List[Question] = field(default_factory=list)
    plain_text: str = ""
    member_count: int = 0
    kind_guess: str = ""  # template | exam | unknown
    meta: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "kind_guess": self.kind_guess,
            "member_count": self.member_count,
            "sections": list(self.sections),
            "placeholders": list(self.placeholders),
            "plain_text": self.plain_text,
            "paragraphs": [asdict(p) for p in self.paragraphs],
            "questions": [
                {
                    "number": q.number,
                    "stem": q.stem,
                    "choices": [asdict(c) for c in q.choices],
                    "raw": q.raw,
                }
                for q in self.questions
            ],
            "meta": dict(self.meta),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "HwpxDocument":
        paragraphs = [
            Paragraph(**p) for p in data.get("paragraphs") or []
        ]
        questions: List[Question] = []
        for q in data.get("questions") or []:
            choices = [Choice(**c) for c in q.get("choices") or []]
            questions.append(
                Question(
                    number=int(q["number"]),
                    stem=str(q.get("stem") or ""),
                    choices=choices,
                    raw=str(q.get("raw") or ""),
                )
            )
        return cls(
            source=str(data.get("source") or ""),
            sections=list(data.get("sections") or []),
            paragraphs=paragraphs,
            placeholders=list(data.get("placeholders") or []),
            questions=questions,
            plain_text=str(data.get("plain_text") or ""),
            member_count=int(data.get("member_count") or 0),
            kind_guess=str(data.get("kind_guess") or ""),
            meta=dict(data.get("meta") or {}),
        )


@dataclass
class FormatProfile:
    """관리자가 고정하는 HWPX 형식 요약."""

    id: str
    label: str
    choice_markers: str = "circled"  # circled | numeric
    question_numbering: str = "1."
    placeholder_scheme: str = "{{문제N}} / {{선지N_M}}"
    notes: str = ""
    sample_files: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
