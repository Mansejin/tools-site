# -*- coding: utf-8 -*-
"""문항(+선택 그림) → HWPX 패키지 생성.

한글에서 텍스트가 보이려면 최소 header가 아니라
코퍼스(마이일타) HWPX의 header/masterpage를 골격으로 써야 한다.
"""

from __future__ import annotations

import re
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import List, Optional, Sequence

from .package import pack_directory
from .xmlutil import xml_escape

TOOLS_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SKELETON = TOOLS_ROOT / "examdata" / "마이일타_윤리와사상_고3_2026년9월.hwpx"


def _find_skeleton() -> Optional[Path]:
    if DEFAULT_SKELETON.is_file():
        return DEFAULT_SKELETON
    examdata = TOOLS_ROOT / "examdata"
    if not examdata.is_dir():
        return None
    for p in sorted(examdata.glob("*.hwpx")):
        return p
    return None


def _lineseg(text: str, vertpos: int = 0) -> str:
    """간단 linesegarray — 한글 렌더에 필요."""
    # 대략 문자당 1 segment 위치; 한 줄로 충분하면 단일 lineseg
    n = max(len(text), 1)
    return (
        "<hp:linesegarray>"
        f'<hp:lineseg textpos="0" vertpos="{vertpos}" vertsize="1000" '
        'textheight="1000" baseline="850" spacing="600" horzpos="0" '
        f'horzsize="{min(48000, 800 * n)}" flags="393216"/>'
        "</hp:linesegarray>"
    )


def _text_para(text: str, pid: int, *, vertpos: int = 0) -> str:
    return (
        f'<hp:p id="{pid}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" '
        f'columnBreak="0" merged="0"><hp:run charPrIDRef="0">'
        f"<hp:t>{xml_escape(text)}</hp:t></hp:run>"
        f"{_lineseg(text, vertpos)}</hp:p>"
    )


def _pic_para(image_id: str, pid: int, width_px: int = 900, height_px: int = 520) -> str:
    # 코퍼스와 유사한 HWPUNIT 스케일
    org_w = 48000
    org_h = int(org_w * height_px / max(width_px, 1))
    w = 22000
    h = int(w * height_px / max(width_px, 1))
    return (
        f'<hp:p id="{pid}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" '
        f'columnBreak="0" merged="0"><hp:run charPrIDRef="0">'
        f'<hp:pic id="{pid}" zOrder="0" numberingType="PICTURE" '
        'textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" '
        'dropcapstyle="None" href="" groupLevel="0" '
        f'instid="{pid}" reverse="0">'
        '<hp:offset x="0" y="0"/>'
        f'<hp:orgSz width="{org_w}" height="{org_h}"/>'
        f'<hp:curSz width="{w}" height="{h}"/>'
        '<hp:flip horizontal="0" vertical="0"/>'
        f'<hp:rotationInfo angle="0" centerX="{w // 2}" centerY="{h // 2}" rotateimage="1"/>'
        "<hp:renderingInfo>"
        '<hc:transMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/>'
        f'<hc:scaMatrix e1="{w / org_w:.6f}" e2="0" e3="0" e4="0" e5="{h / org_h:.6f}" e6="0"/>'
        '<hc:rotMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/>'
        "</hp:renderingInfo>"
        f'<hc:img binaryItemIDRef="{image_id}" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/>'
        "<hp:imgRect>"
        f'<hc:pt0 x="0" y="0"/><hc:pt1 x="{org_w}" y="0"/>'
        f'<hc:pt2 x="{org_w}" y="{org_h}"/><hc:pt3 x="0" y="{org_h}"/>'
        "</hp:imgRect>"
        f'<hp:imgClip left="0" right="{org_w}" top="0" bottom="{org_h}"/>'
        '<hp:inMargin left="0" right="0" top="0" bottom="0"/>'
        f'<hp:imgDim dimwidth="{org_w}" dimheight="{org_h}"/>'
        "<hp:effects/>"
        f'<hp:sz width="{w}" widthRelTo="ABSOLUTE" height="{h}" heightRelTo="ABSOLUTE" protect="0"/>'
        '<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" '
        'holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" '
        'horzAlign="LEFT" vertOffset="0" horzOffset="0"/>'
        '<hp:outMargin left="0" right="0" top="0" bottom="0"/>'
        "</hp:pic><hp:t/></hp:run>"
        f'<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="{h}" '
        f'textheight="{h}" baseline="{int(h * 0.85)}" spacing="540" horzpos="0" '
        f'horzsize="{w}" flags="393216"/></hp:linesegarray></hp:p>'
    )


def _extract_secpr(section_xml: str) -> str:
    """첫 문단의 secPr 블록을 그대로 재사용."""
    m = re.search(r"<hp:secPr\b.*?</hp:secPr>", section_xml, flags=re.DOTALL)
    if not m:
        return ""
    return m.group(0)


def _build_section(
    paragraphs: Sequence[str],
    *,
    image_id: Optional[str],
    image_after_para_index: int,
    secpr: str,
    image_size: tuple[int, int] = (1100, 620),
) -> str:
    ns_hp = "http://www.hancom.co.kr/hwpml/2011/paragraph"
    ns_hc = "http://www.hancom.co.kr/hwpml/2011/core"
    ns_hs = "http://www.hancom.co.kr/hwpml/2011/section"
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<hs:sec xmlns:hp="{ns_hp}" xmlns:hc="{ns_hc}" xmlns:hs="{ns_hs}">',
    ]
    pid = 0
    vert = 0
    for i, text in enumerate(paragraphs):
        if i == 0 and secpr:
            # 섹션 속성은 첫 run에 넣음
            parts.append(
                f'<hp:p id="{pid}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" '
                f'columnBreak="0" merged="0"><hp:run charPrIDRef="0">'
                f"{secpr}<hp:t>{xml_escape(text)}</hp:t></hp:run>"
                f"{_lineseg(text, vert)}</hp:p>"
            )
        else:
            parts.append(_text_para(text, pid, vertpos=vert))
        pid += 1
        vert += 1400
        if image_id and i == image_after_para_index:
            parts.append(_pic_para(image_id, pid, image_size[0], image_size[1]))
            pid += 1
            vert += 9000
    parts.append("</hs:sec>")
    return "\n".join(parts) + "\n"


def _rewrite_content_hpf(hpf: str, image_name: str, media: str) -> str:
    """기존 BinData item을 제거하고 새 이미지 1개만 등록."""
    stem = Path(image_name).stem
    # 기존 BinData 항목 제거
    hpf = re.sub(
        r'\s*<opf:item\b[^>]*href="BinData/[^"]*"[^>]*/>',
        "",
        hpf,
    )
    item = (
        f'<opf:item id="{stem}" href="BinData/{image_name}" '
        f'media-type="{media}" isEmbeded="1"/>'
    )
    if "<opf:manifest>" in hpf:
        hpf = hpf.replace("<opf:manifest>", f"<opf:manifest>\n{item}", 1)
    return hpf


def write_question_hwpx(
    output: Path,
    *,
    stem: str,
    choices: Sequence[str],
    image_path: Optional[Path] = None,
    preface_lines: Optional[Sequence[str]] = None,
    skeleton: Optional[Path] = None,
) -> Path:
    """객관식 1문항 HWPX. 가능하면 코퍼스 HWPX를 골격으로 사용."""
    paras: List[str] = []
    if preface_lines:
        paras.extend(preface_lines)
    paras.append(stem)
    stem_index = len(paras) - 1
    for i, c in enumerate(choices, start=1):
        mark = "①②③④⑤"[i - 1] if i <= 5 else f"{i})"
        text = c if c.startswith(("①", "②", "③", "④", "⑤")) else f"{mark} {c}"
        paras.append(text)

    skel = Path(skeleton) if skeleton else _find_skeleton()
    if skel is None or not skel.is_file():
        raise FileNotFoundError(
            "HWPX 골격(코퍼스)이 없습니다. examdata/*.hwpx 를 두거나 skeleton= 로 지정하세요."
        )

    image_size = (1100, 620)
    if image_path is not None:
        from PIL import Image

        with Image.open(image_path) as im:
            image_size = im.size

    with tempfile.TemporaryDirectory(prefix="hwpx_q_") as tmp:
        root = Path(tmp) / "pkg"
        with zipfile.ZipFile(skel, "r") as zf:
            zf.extractall(root)

        # BinData 비우고 새 이미지만
        bindata = root / "BinData"
        if bindata.is_dir():
            shutil.rmtree(bindata)
        bindata.mkdir(parents=True)

        image_id = None
        image_name = None
        if image_path is not None:
            image_path = Path(image_path)
            ext = image_path.suffix.lower()
            image_name = "image1.png" if ext == ".png" else "image1.jpg"
            image_id = "image1"
            media = "image/png" if image_name.endswith(".png") else "image/jpeg"
            (bindata / image_name).write_bytes(image_path.read_bytes())
            hpf_path = root / "Contents" / "content.hpf"
            hpf_path.write_text(
                _rewrite_content_hpf(hpf_path.read_text(encoding="utf-8"), image_name, media),
                encoding="utf-8",
            )

        section_path = root / "Contents" / "section0.xml"
        old_section = section_path.read_text(encoding="utf-8")
        secpr = _extract_secpr(old_section)
        section_path.write_text(
            _build_section(
                paras,
                image_id=image_id,
                image_after_para_index=stem_index,
                secpr=secpr,
                image_size=image_size,
            ),
            encoding="utf-8",
        )

        # Preview 텍스트
        prv = root / "Preview" / "PrvText.txt"
        if prv.parent.is_dir():
            prv.write_text("\n".join(paras)[:500], encoding="utf-8")

        return pack_directory(root, Path(output))
