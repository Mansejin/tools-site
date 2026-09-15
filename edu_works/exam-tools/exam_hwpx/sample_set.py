# -*- coding: utf-8 -*-
"""윤사 다유형 샘플 세트 (벤·순서도·대화·표·ㄱㄴㄷ)."""

from __future__ import annotations

from pathlib import Path
from typing import List

from .build_exam import QuestionSpec, write_questions_hwpx
from .figures import (
    render_blank_bogi,
    render_dialogue_gap_eul,
    render_flowchart_gap_eul,
    render_table_gap_eul,
    render_venn_gap_eul,
)


def build_yunsa_sample_set(
    out_dir: Path,
    *,
    page_profile: str = "b4_2col",
) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    figs = out_dir / "figs"
    figs.mkdir(parents=True, exist_ok=True)

    venn = figs / "q1_venn.png"
    render_venn_gap_eul(
        venn,
        dialogue=[
            "갑: 행위의 도덕성은 결과의 유용성이 아니라 선의지와 의무에 따른 행위에서 성립한다.",
            "을: 행위의 옳고 그름은 그 행위가 산출하는 쾌락과 고통의 양에 의해 결정된다.",
        ],
    )

    flow = figs / "q2_flowchart.png"
    render_flowchart_gap_eul(flow)

    dial = figs / "q3_dialogue.png"
    render_dialogue_gap_eul(
        dial,
        lines=[
            "갑: 도덕 법칙은 보편화 가능해야 하며, 행위의 동기가 의무이어야 한다.",
            "을: 최대 다수의 최대 행복을 가져오는 행위가 옳은 행위이다.",
        ],
    )

    table = figs / "q4_table.png"
    render_table_gap_eul(table)

    blank = figs / "q5_blank.png"
    render_blank_bogi(
        blank,
        items=[
            "ㄱ. 도덕적 행위는 의무 의식에서 비롯되어야 한다.",
            "ㄴ. 쾌락의 질적 차이를 인정할 수 있다.",
            "ㄷ. 인간을 수단으로만 대우해서는 안 된다.",
        ],
    )

    questions: List[QuestionSpec] = [
        {
            "number": 1,
            "stem": (
                "그림은 근대 서양 사상가 갑, 을의 입장을 그림으로 나타낸 것이다. "
                "이에 대한 설명으로 옳은 것은? [3점]"
            ),
            "choices": [
                "A에는 ‘정언명령’, C에는 ‘최대 다수의 최대 행복’이 들어간다.",
                "A에는 ‘쾌락의 양적 계산’, C에는 ‘선의지’가 들어간다.",
                "B에는 ‘결과를 도덕의 유일한 기준으로 삼는다’가 들어간다.",
                "C에는 ‘인간을 목적 그 자체로 대우하라’가 들어간다.",
                "A와 C에는 모두 ‘의무에 따르는 행위만이 도덕적 가치를 지닌다’가 들어간다.",
            ],
            "image_path": str(venn),
            "image_width_mm": 102.0,
        },
        {
            "number": 2,
            "stem": (
                "그림은 어느 학생이 근대 서양 사상가 갑, 을의 입장을 정리한 것이다. "
                "이에 대한 설명으로 옳은 것은?"
            ),
            "choices": [
                "A에는 ‘의무에 따르는가?’가 들어간다.",
                "B에는 ‘결과가 유용한가?’가 들어간다.",
                "C에는 ‘정언명령에 따르는가?’가 들어간다.",
                "갑은 의무론, 을은 공리주의 입장이다.",
                "을은 행위의 동기를 도덕 판단의 유일한 기준으로 본다.",
            ],
            "image_path": str(flow),
            "image_width_mm": 95.0,
        },
        {
            "number": 3,
            "stem": "갑, 을의 가상 대화이다. 을의 입장에서 갑에게 제기할 비판으로 가장 적절한 것은?",
            "choices": [
                "동기의 선함만으로는 행위의 결과를 정당화할 수 없다.",
                "보편화 불가능한 준칙은 도덕 법칙이 될 수 없다.",
                "쾌락의 질을 무시하고 양만 계산해서는 안 된다.",
                "인간을 목적 그 자체로 대우해야 한다.",
                "의무 의식이 없는 행위는 도덕적 가치가 없다.",
            ],
            "image_path": str(dial),
            "image_width_mm": 100.0,
        },
        {
            "number": 4,
            "stem": "표는 근대 서양 사상가 갑, 을의 입장을 정리한 것이다. 이에 대한 설명으로 옳은 것은?",
            "choices": [
                "갑은 결과의 유용성을 도덕의 근거로 본다.",
                "을은 정언명령을 도덕 판단의 기준으로 본다.",
                "갑은 인간을 목적 그 자체로 대우할 것을 강조한다.",
                "을은 선의지만이 무조건적으로 선하다고 본다.",
                "갑과 을은 모두 의무 의식을 도덕의 유일한 동기로 본다.",
            ],
            "image_path": str(table),
            "image_width_mm": 100.0,
        },
        {
            "number": 5,
            "stem": (
                "칸트와 밀의 입장으로 옳은 것만을 <보기>에서 있는 대로 고른 것은?"
            ),
            "choices": [
                "ㄱ, ㄴ",
                "ㄱ, ㄷ",
                "ㄴ, ㄷ",
                "ㄱ, ㄴ, ㄷ",
                "ㄱ",
            ],
            "image_path": str(blank),
            "image_width_mm": 100.0,
        },
    ]

    hwpx = out_dir / "yunsa_sample_set.hwpx"
    write_questions_hwpx(hwpx, questions, page_profile=page_profile)
    return hwpx
