# -*- coding: utf-8 -*-
"""마이일타 해설 HWPX 블록 분리: [답] … 단위."""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List

from .models import Choice, Question
from .questions import parse_choices

ANSWER_SPLIT_RE = re.compile(r"\[답\]\s*[①②③④⑤1-5]")
ANSWER_HEADER_RE = re.compile(
    r"^\[답\]\s*([①②③④⑤1-5])\s*(?:\[풀이\])?\s*(.*)$",
    re.DOTALL,
)
CIRCLED = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5}


@dataclass
class MyilitaBlock:
    answer: int | None
    title: str
    explanation: str
    question: Question | None
    raw: str


def _answer_to_int(token: str) -> int | None:
    token = token.strip()
    if token in CIRCLED:
        return CIRCLED[token]
    if token.isdigit():
        n = int(token)
        return n if 1 <= n <= 5 else None
    return None


def split_myilita_blocks(plain_text: str) -> List[str]:
    """평문을 [답] 헤더 기준으로 블록 분리."""
    matches = list(re.finditer(r"\[답\]", plain_text))
    if not matches:
        return [plain_text] if plain_text.strip() else []
    blocks: List[str] = []
    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(plain_text)
        chunk = plain_text[start:end].strip()
        if chunk:
            blocks.append(chunk)
    return blocks


def parse_myilita_block(raw: str, index: int) -> MyilitaBlock:
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    answer = None
    title = ""
    explanation_parts: List[str] = []
    stem_parts: List[str] = []
    choice_lines: List[str] = []
    mode = "head"  # head | expl | stem | choices

    for ln in lines:
        if mode == "head":
            m = ANSWER_HEADER_RE.match(ln) if ln.startswith("[답]") else None
            if ln.startswith("[답]"):
                # may be short "[답] ③" only
                short = re.match(r"^\[답\]\s*([①②③④⑤1-5])\s*$", ln)
                if short:
                    answer = _answer_to_int(short.group(1))
                    continue
                long = re.match(
                    r"^\[답\]\s*([①②③④⑤1-5])\s*(?:\[풀이\])?(.*)$",
                    ln,
                )
                if long:
                    answer = _answer_to_int(long.group(1))
                    rest = (long.group(2) or "").strip()
                    if rest:
                        explanation_parts.append(rest)
                    mode = "expl"
                continue
            if ln == "[풀이]":
                mode = "expl"
                continue
            if ln.startswith("[풀이]"):
                explanation_parts.append(ln.removeprefix("[풀이]").strip())
                mode = "expl"
                continue
            mode = "expl"

        if mode == "expl":
            if ln.startswith("[오답피하기]"):
                continue
            # 선지처럼 보이면 아직 해설의 오답피하기 선지일 수 있음
            # 문항 줄기로 넘어가는 힌트: "옳은 것은?" / "가장 적절한" / "[n점]"
            if re.search(r"(옳은 것은|가장 적절한|해당하는 것|\[[0-9]+점\])", ln):
                stem_parts.append(ln)
                mode = "stem"
                continue
            if re.match(r"^[①②③④⑤]\s+\S", ln) and stem_parts:
                choice_lines.append(ln)
                mode = "choices"
                continue
            # 제목 후보: 짧은 줄 + 앞에 번호
            if re.match(r"^\d{1,3}\s*[\.．、)]\s+\S", ln) and not title:
                title = re.sub(r"^\d{1,3}\s*[\.．、)]\s+", "", ln)
                explanation_parts.append(ln)
                continue
            explanation_parts.append(ln)
            continue

        if mode == "stem":
            if re.match(r"^[①②③④⑤]\s*", ln):
                choice_lines.append(ln)
                mode = "choices"
            else:
                stem_parts.append(ln)
            continue

        if mode == "choices":
            choice_lines.append(ln)

    stem = "\n".join(stem_parts).strip()
    choice_body = "\n".join(choice_lines)
    question = None
    if stem or choice_lines:
        _, choices = parse_choices(stem + "\n" + choice_body if stem else choice_body)
        # if stem empty, parse_choices may put all in stem — rebuild
        if not stem and choice_lines:
            stem, choices = parse_choices("\n".join(choice_lines))
            # actually choices-only body without stem text
            stem = ""
            choices = []
            for cl in choice_lines:
                cm = re.match(r"^([①②③④⑤])\s*(.*)$", cl)
                if cm:
                    choices.append(
                        Choice(number=CIRCLED[cm.group(1)], text=cm.group(2).strip())
                    )
                elif choices:
                    choices[-1].text = (choices[-1].text + " " + cl).strip()
        elif stem:
            stem2, choices = parse_choices(stem + ("\n" + choice_body if choice_body else ""))
            stem = stem2 or stem
        question = Question(
            number=index,
            stem=stem,
            choices=choices,
            raw=raw,
        )

    if not title:
        # explanation first non-meta line
        for part in explanation_parts:
            if part.startswith("정답") or part.startswith("출제의도"):
                continue
            if re.match(r"^\d{1,3}\s*[\.．、)]\s+", part):
                title = re.sub(r"^\d{1,3}\s*[\.．、)]\s+", "", part)
                break
            if len(part) < 80 and not part.startswith("①"):
                title = part
                break

    return MyilitaBlock(
        answer=answer,
        title=title,
        explanation="\n".join(explanation_parts).strip(),
        question=question,
        raw=raw,
    )


def questions_from_myilita(plain_text: str) -> List[Question]:
    blocks = split_myilita_blocks(plain_text)
    # Prefer blocks that look like "[답] X" only once each — skip giant merged first paras
    # by re-splitting on lines that are exactly [답] N
    refined: List[str] = []
    for block in blocks:
        # If block contains multiple standalone [답] N lines, split further
        parts = re.split(r"(?=^\[답\]\s*[①②③④⑤1-5]\s*$)", block, flags=re.MULTILINE)
        for p in parts:
            p = p.strip()
            if p:
                refined.append(p)
    out: List[Question] = []
    for i, raw in enumerate(refined, start=1):
        # skip ultra-short answer-only duplicates if no stem follows in same block
        b = parse_myilita_block(raw, i)
        if b.question and (b.question.stem or b.question.choices):
            if b.answer is not None:
                # stash answer in raw prefix for now
                b.question.raw = f"[답]{b.answer}\n" + b.question.raw
            out.append(b.question)
    return out
