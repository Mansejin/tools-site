# -*- coding: utf-8 -*-
"""윤사 시험 그림 유형 렌더러 (프로그램 생성 — API 없이도 재현).

표준 템플릿:
  - venn_gap_eul: 갑/을 벤다이어그램 (A·B·C)
  - flowchart_gap_eul: 갑/을 탐구 순서도 (간단판)
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal, Tuple

from PIL import Image, ImageDraw, ImageFont

FigureKind = Literal["venn_gap_eul", "flowchart_gap_eul"]


def _font(size: int) -> ImageFont.ImageFont:
    candidates = [
        r"C:\Windows\Fonts\malgun.ttf",
        r"C:\Windows\Fonts\malgunbd.ttf",
        r"C:\Windows\Fonts\NanumGothic.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]
    for path in candidates:
        if Path(path).is_file():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def render_venn_gap_eul(
    output: Path,
    *,
    size: Tuple[int, int] = (1100, 620),
) -> Path:
    """갑/을 벤다이어그램 PNG."""
    w, h = size
    img = Image.new("RGB", (w, h), "white")
    draw = ImageDraw.Draw(img)
    font = _font(28)
    font_sm = _font(22)
    font_lg = _font(36)

    # circles
    r = 210
    c1 = (340, 310)
    c2 = (560, 310)
    bbox1 = (c1[0] - r, c1[1] - r, c1[0] + r, c1[1] + r)
    bbox2 = (c2[0] - r, c2[1] - r, c2[0] + r, c2[1] + r)
    draw.ellipse(bbox1, outline="black", width=3)
    draw.ellipse(bbox2, outline="black", width=3)

    # hatch A (left only) — diagonal lines clipped roughly by drawing short segments
    for i in range(-r, r, 14):
        x0 = c1[0] - r + 20
        y0 = c1[1] + i
        x1 = c1[0] - 40
        y1 = y0 + (x1 - x0)
        draw.line([(x0, y0), (x1, y1)], fill="#444444", width=1)
    # hatch C
    for i in range(-r, r, 14):
        x0 = c2[0] + 40
        y0 = c2[1] + i
        x1 = c2[0] + r - 20
        y1 = y0 + (x1 - x0)
        draw.line([(x0, y0), (x1, y1)], fill="#444444", width=1)
    # cross hatch B (center)
    for i in range(-90, 90, 12):
        draw.line([(450 + i, 240), (450 + i + 80, 320)], fill="#666666", width=1)
        draw.line([(450 + i, 320), (450 + i + 80, 240)], fill="#666666", width=1)

    draw.text((c1[0] - 20, 70), "갑", fill="black", font=font_lg)
    draw.text((c2[0] - 20, 70), "을", fill="black", font=font_lg)
    draw.text((250, 300), "A", fill="black", font=font_lg)
    draw.text((435, 300), "B", fill="black", font=font_lg)
    draw.text((620, 300), "C", fill="black", font=font_lg)

    # legend box
    box = (780, 120, 1060, 320)
    draw.rectangle(box, outline="black", width=2)
    draw.text((860, 140), "<범례>", fill="black", font=font)
    draw.text((800, 190), "A: 갑만의 입장", fill="black", font=font_sm)
    draw.text((800, 230), "B: 갑·을 공통 입장", fill="black", font=font_sm)
    draw.text((800, 270), "C: 을만의 입장", fill="black", font=font_sm)

    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    img.save(output, format="PNG")
    return output


def render_flowchart_gap_eul(
    output: Path,
    *,
    size: Tuple[int, int] = (900, 700),
) -> Path:
    """갑/을 탐구 순서도 간단판."""
    w, h = size
    img = Image.new("RGB", (w, h), "white")
    draw = ImageDraw.Draw(img)
    font = _font(22)
    font_sm = _font(18)

    def box(xy, text, diamond=False):
        x0, y0, x1, y1 = xy
        if diamond:
            mx, my = (x0 + x1) // 2, (y0 + y1) // 2
            draw.polygon(
                [(mx, y0), (x1, my), (mx, y1), (x0, my)],
                outline="black",
            )
        else:
            draw.rectangle(xy, outline="black", width=2)
        draw.text((x0 + 16, (y0 + y1) // 2 - 12), text, fill="black", font=font_sm)

    box((280, 40, 620, 110), "사상가 갑, 을의 입장을 탐구한다.")
    draw.line([(450, 110), (450, 160)], fill="black", width=2)
    box((360, 160, 540, 250), "A", diamond=True)
    draw.line([(450, 250), (450, 300)], fill="black", width=2)
    draw.text((460, 260), "예", fill="black", font=font_sm)
    box((360, 300, 540, 390), "B", diamond=True)
    draw.line([(450, 390), (450, 450)], fill="black", width=2)
    box((330, 450, 570, 520), "갑의 입장")

    draw.line([(540, 205), (700, 205), (700, 345)], fill="black", width=2)
    draw.text((620, 180), "아니요", fill="black", font=font_sm)
    box((610, 345, 790, 435), "C", diamond=True)
    draw.line([(700, 435), (700, 490)], fill="black", width=2)
    box((580, 490, 820, 560), "을의 입장")

    draw.rectangle((40, 40, 250, 200), outline="black", width=2)
    draw.text((70, 55), "<범례>", fill="black", font=font)
    draw.text((55, 100), "□ 출발 조건", fill="black", font=font_sm)
    draw.text((55, 130), "◇ 판단 내용", fill="black", font=font_sm)
    draw.text((55, 160), "→ 판단 방향", fill="black", font=font_sm)

    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    img.save(output, format="PNG")
    return output


def render_figure(kind: FigureKind, output: Path) -> Path:
    if kind == "venn_gap_eul":
        return render_venn_gap_eul(output)
    if kind == "flowchart_gap_eul":
        return render_flowchart_gap_eul(output)
    raise ValueError(f"unknown figure kind: {kind}")
