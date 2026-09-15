# -*- coding: utf-8 -*-
"""윤사 시험 그림 유형 렌더러 (프로그램 생성 — API 없이도 재현).

표준 템플릿:
  - venn_gap_eul: 갑/을 <보기> 박스 + 벤다이어그램 (A·B·C)
  - flowchart_gap_eul: 갑/을 탐구 순서도 (간단판)
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Literal, Optional, Sequence, Tuple

from PIL import Image, ImageChops, ImageDraw, ImageFont

FigureKind = Literal["venn_gap_eul", "flowchart_gap_eul"]

LINE_GAP = 6
PARA_GAP = 14
BOX_PAD_X = 28
BOX_PAD_Y = 26
TITLE_GAP = 6  # 제목을 테두리 위에 올릴 때는 거의 쓰이지 않음


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


def _ellipse_mask(size: Tuple[int, int], bbox: Tuple[int, int, int, int]) -> Image.Image:
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).ellipse(bbox, fill=255)
    return m


def _hatch_mask(
    size: Tuple[int, int],
    region: Image.Image,
    *,
    style: Literal["diag_a", "diag_c", "cross"],
    step: int = 10,
) -> Image.Image:
    w, h = size
    lines = Image.new("L", size, 0)
    d = ImageDraw.Draw(lines)
    if style in {"diag_a", "cross"}:
        for i in range(-h, w + h, step):
            d.line([(i, 0), (i + h, h)], fill=255, width=1)
    if style in {"diag_c", "cross"}:
        for i in range(-h, w + h, step):
            d.line([(i, h), (i + h, 0)], fill=255, width=1)
    return ImageChops.multiply(lines, region)


def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_w: int) -> List[str]:
    lines: List[str] = []
    cur = ""
    for ch in text:
        trial = cur + ch
        bbox = draw.textbbox((0, 0), trial, font=font)
        if bbox[2] - bbox[0] <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = ch
    if cur:
        lines.append(cur)
    return lines or [""]


def _text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> Tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def _line_height(font: ImageFont.ImageFont, draw: Optional[ImageDraw.ImageDraw] = None) -> int:
    """글리프 잉크 높이. 여유를 더하면 박스 하단에 빈 공간이 생긴다."""
    probe = draw
    if probe is None:
        probe = ImageDraw.Draw(Image.new("RGB", (8, 8), "white"))
    try:
        bbox = probe.textbbox((0, 0), "한글갑을", font=font)
        return max(bbox[3] - bbox[1], int(getattr(font, "size", 26) * 0.9))
    except Exception:
        return int(getattr(font, "size", 26) * 1.05)


def _wrap_paras(
    draw: ImageDraw.ImageDraw,
    lines: Sequence[str],
    font: ImageFont.ImageFont,
    max_w: int,
) -> List[List[str]]:
    return [_wrap_text(draw, raw, font, max_w) for raw in lines]


def _body_height(
    paras: Sequence[Sequence[str]],
    font: ImageFont.ImageFont,
    draw: Optional[ImageDraw.ImageDraw] = None,
) -> int:
    lh = _line_height(font, draw)
    total = 0
    for i, para in enumerate(paras):
        total += lh * len(para)
        if len(para) > 1:
            total += LINE_GAP * (len(para) - 1)
        if i < len(paras) - 1:
            total += PARA_GAP
    return total


def _draw_dialogue_box(
    draw: ImageDraw.ImageDraw,
    *,
    x0: int,
    y0: int,
    x1: int,
    lines: Sequence[str],
    font: ImageFont.ImageFont,
    title: str = "<보기>",
    title_font: Optional[ImageFont.ImageFont] = None,
) -> int:
    """타이트한 <보기> 박스. 제목은 상단 테두리 중앙, 본문은 박스 안 세로 중앙."""
    title_font = title_font or font
    max_w = x1 - x0 - BOX_PAD_X * 2
    paras = _wrap_paras(draw, lines, font, max_w)
    body_h = _body_height(paras, font, draw)
    lh = _line_height(font, draw)

    # 제목은 테두리에 걸치므로 박스 높이에는 본문+패딩만
    inner_h = BOX_PAD_Y + body_h + BOX_PAD_Y
    y1 = y0 + inner_h

    draw.rectangle((x0, y0, x1, y1), outline="black", width=2)

    # 제목: 상단 테두리 중앙 (흰 배경으로 선 끊고 올림 — 내신 시험지 관례)
    cx = (x0 + x1) // 2
    tb = draw.textbbox((0, 0), title, font=title_font)
    tw = tb[2] - tb[0]
    th = tb[3] - tb[1]
    pad_x, pad_y = 12, 3
    draw.rectangle(
        (
            cx - tw // 2 - pad_x,
            y0 - th // 2 - pad_y,
            cx + tw // 2 + pad_x,
            y0 + th // 2 + pad_y,
        ),
        fill="white",
    )
    draw.text(
        (cx - (tb[0] + tb[2]) / 2, y0 - (tb[1] + tb[3]) / 2),
        title,
        fill="black",
        font=title_font,
    )

    # 본문: 박스 안 세로 중앙 (textbbox 상단 오프셋 보정으로 하단 허공 제거)
    content_top = y0 + BOX_PAD_Y
    content_h = inner_h - 2 * BOX_PAD_Y
    y = content_top + max(0, (content_h - body_h) // 2)
    for i, para in enumerate(paras):
        for j, wline in enumerate(para):
            bbox = draw.textbbox((0, 0), wline, font=font)
            draw.text(
                (x0 + BOX_PAD_X - bbox[0], y - bbox[1]),
                wline,
                fill="black",
                font=font,
            )
            y += lh
            if j < len(para) - 1:
                y += LINE_GAP
        if i < len(paras) - 1:
            y += PARA_GAP
    return y1


def _draw_halo_text(
    draw: ImageDraw.ImageDraw,
    cx: int,
    cy: int,
    text: str,
    font: ImageFont.ImageFont,
    *,
    pad: int = 12,
) -> None:
    """흰 원형 배경 위 중앙 정렬 글자 (해칭과 겹치지 않게)."""
    tw, th = _text_size(draw, text, font)
    rad = max(tw, th) // 2 + pad
    draw.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), fill="white", outline="white")
    # textbbox 상단 오프셋 보정 — cy에 시각적 중심
    bbox = draw.textbbox((0, 0), text, font=font)
    ox = (bbox[0] + bbox[2]) / 2
    oy = (bbox[1] + bbox[3]) / 2
    draw.text((cx - ox, cy - oy), text, fill="black", font=font)


def _render_venn_body(size: Tuple[int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGB", (w, h), "white")
    draw = ImageDraw.Draw(img)
    font = _font(26)
    font_sm = _font(22)
    font_name = _font(34)
    font_lab = _font(40)

    # 원 상단에 갑/을이 겹치도록 여유만 조금 둠
    r = 195
    c1 = (340, 300)
    c2 = (580, 300)
    bbox1 = (c1[0] - r, c1[1] - r, c1[0] + r, c1[1] + r)
    bbox2 = (c2[0] - r, c2[1] - r, c2[0] + r, c2[1] + r)

    m1 = _ellipse_mask(size, bbox1)
    m2 = _ellipse_mask(size, bbox2)
    region_a = ImageChops.subtract(m1, m2)
    region_c = ImageChops.subtract(m2, m1)
    region_b = ImageChops.multiply(m1, m2)

    black = Image.new("RGB", size, "black")
    for region, style in (
        (region_a, "diag_a"),
        (region_c, "diag_c"),
        (region_b, "cross"),
    ):
        hatch = _hatch_mask(size, region, style=style, step=12)
        img.paste(black, mask=hatch)

    draw.ellipse(bbox1, outline="black", width=3)
    draw.ellipse(bbox2, outline="black", width=3)

    label_a = (c1[0] - 115, c1[1])
    label_b = ((c1[0] + c2[0]) // 2, c1[1])
    label_c = (c2[0] + 115, c2[1])

    # 갑/을: 원 상단에 걸치되, 흰 사각을 원 안쪽까지 넉넉히 깔아 원선·해칭을 끊음
    for center, label in ((c1, "갑"), (c2, "을")):
        bbox = draw.textbbox((0, 0), label, font=font_name)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        cx, top = center[0], center[1] - r
        # 글자 하단이 원 안으로 들어가게 배치
        ly = top - th + 8
        lx = cx - tw // 2
        draw.rectangle(
            (lx - 14, ly - 8, lx + tw + 14, top + 28),
            fill="white",
        )
        draw.text((lx - bbox[0], ly - bbox[1]), label, fill="black", font=font_name)

    # A/B/C: 해칭을 뚫는 큰 흰 원 + 중앙 정렬
    _draw_halo_text(draw, label_a[0], label_a[1], "A", font_lab, pad=26)
    _draw_halo_text(draw, label_b[0], label_b[1], "B", font_lab, pad=26)
    _draw_halo_text(draw, label_c[0], label_c[1], "C", font_lab, pad=26)

    # 범례
    box = (860, 130, 1160, 330)
    draw.rectangle(box, outline="black", width=2)
    draw.text((960, 150), "<범례>", fill="black", font=font)
    draw.text((890, 200), "A: 갑만의 입장", fill="black", font=font_sm)
    draw.text((890, 240), "B: 갑·을 공통 입장", fill="black", font=font_sm)
    draw.text((890, 280), "C: 을만의 입장", fill="black", font=font_sm)
    return img


def render_venn_gap_eul(
    output: Path,
    *,
    size: Tuple[int, int] = (1200, 560),
    dialogue: Optional[Sequence[str]] = None,
    dialogue_title: str = "<보기>",
) -> Path:
    """갑/을 벤다이어그램 PNG. dialogue가 있으면 위쪽 <보기> 박스 포함."""
    venn = _render_venn_body(size)
    if not dialogue:
        canvas = venn
    else:
        probe = Image.new("RGB", (size[0], 40), "white")
        pdraw = ImageDraw.Draw(probe)
        font = _font(26)
        title_font = _font(24)
        max_w = size[0] - 60 - BOX_PAD_X * 2
        paras = _wrap_paras(pdraw, list(dialogue), font, max_w)
        body_h = _body_height(paras, font, pdraw)
        title_h = _text_size(pdraw, dialogue_title, title_font)[1]
        dial_h = BOX_PAD_Y + body_h + BOX_PAD_Y
        top_margin = max(8, title_h // 2 + 4)  # 테두리 위 제목 공간
        gap = 14
        canvas = Image.new("RGB", (size[0], top_margin + dial_h + gap + size[1]), "white")
        draw = ImageDraw.Draw(canvas)
        box_bottom = _draw_dialogue_box(
            draw,
            x0=30,
            y0=top_margin,
            x1=size[0] - 30,
            lines=list(dialogue),
            font=font,
            title=dialogue_title,
            title_font=title_font,
        )
        canvas.paste(venn, (0, box_bottom + gap))

    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, format="PNG")
    return output


def render_flowchart_gap_eul(
    output: Path,
    *,
    size: Tuple[int, int] = (900, 700),
) -> Path:
    w, h = size
    img = Image.new("RGB", (w, h), "white")
    draw = ImageDraw.Draw(img)
    font = _font(22)
    font_sm = _font(18)

    def box(xy, text, diamond=False):
        x0, y0, x1, y1 = xy
        if diamond:
            mx, my = (x0 + x1) // 2, (y0 + y1) // 2
            draw.polygon([(mx, y0), (x1, my), (mx, y1), (x0, my)], outline="black")
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
