# -*- coding: utf-8 -*-
"""문항(+선택 그림) → 최소 완결 HWPX 패키지 생성."""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional, Sequence

from .package import pack_directory
from .xmlutil import xml_escape

MIN_HEADER = """<?xml version="1.0" encoding="UTF-8"?>
<hh:head xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" version="1.5" secCnt="1">
  <hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>
  <hh:refList>
    <hh:fontfaces itemCnt="1">
      <hh:fontface lang="HANGUL" fontCnt="1"><hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"/></hh:fontface>
    </hh:fontfaces>
    <hh:borderFills itemCnt="1">
      <hh:borderFill id="1" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:leftBorder type="NONE" width="0.1 mm" color="#000000"/>
        <hh:rightBorder type="NONE" width="0.1 mm" color="#000000"/>
        <hh:topBorder type="NONE" width="0.1 mm" color="#000000"/>
        <hh:bottomBorder type="NONE" width="0.1 mm" color="#000000"/>
      </hh:borderFill>
    </hh:borderFills>
    <hh:charProperties itemCnt="1">
      <hh:charPr id="0" height="1000" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1"/>
    </hh:charProperties>
    <hh:paraProperties itemCnt="1">
      <hh:paraPr id="0" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0"/>
    </hh:paraProperties>
    <hh:styles itemCnt="1">
      <hh:style id="0" type="PARA" name="바탕글" engName="Normal" paraPrIDRef="0" charPrIDRef="0"/>
    </hh:styles>
  </hh:refList>
</hh:head>
"""

MIN_MASTER = """<?xml version="1.0" encoding="UTF-8"?>
<masterPage xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" version="1.1"/>
"""

CONTAINER_XML = """<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/>
  </rootfiles>
</container>
"""

VERSION_XML = """<?xml version="1.0" encoding="UTF-8"?>
<ha:HWPMLSchema xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" version="1.1"/>
"""

SETTINGS_XML = """<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"/>
"""


def _para(text: str, pid: int) -> str:
    return (
        f'<hp:p id="{pid}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" '
        f'columnBreak="0" merged="0"><hp:run charPrIDRef="0">'
        f"<hp:t>{xml_escape(text)}</hp:t></hp:run></hp:p>"
    )


def _pic_para(image_id: str, pid: int, width_px: int = 900, height_px: int = 520) -> str:
    # HWPUNIT rough: ~1px ≈ 50~80; use stable absolute sizes like corpus
    w = 22000
    h = int(w * height_px / max(width_px, 1))
    org_w, org_h = 76800, int(76800 * height_px / max(width_px, 1))
    return f"""<hp:p id="{pid}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0"><hp:pic id="{pid}" zOrder="0" numberingType="PICTURE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" href="" groupLevel="0" instid="{pid}" reverse="0"><hp:offset x="0" y="0"/><hp:orgSz width="{org_w}" height="{org_h}"/><hp:curSz width="{w}" height="{h}"/><hp:flip horizontal="0" vertical="0"/><hp:rotationInfo angle="0" centerX="{w // 2}" centerY="{h // 2}" rotateimage="1"/><hp:renderingInfo><hc:transMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/><hc:scaMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/><hc:rotMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/></hp:renderingInfo><hc:img binaryItemIDRef="{image_id}" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/><hp:imgRect><hc:pt0 x="0" y="0"/><hc:pt1 x="{org_w}" y="0"/><hc:pt2 x="{org_w}" y="{org_h}"/><hc:pt3 x="0" y="{org_h}"/></hp:imgRect><hp:imgClip left="0" right="{org_w}" top="0" bottom="{org_h}"/><hp:inMargin left="0" right="0" top="0" bottom="0"/><hp:imgDim dimwidth="{org_w}" dimheight="{org_h}"/><hp:effects/><hp:sz width="{w}" widthRelTo="ABSOLUTE" height="{h}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/></hp:pic></hp:run></hp:p>"""


def build_section_xml(
    paragraphs: Sequence[str],
    *,
    image_id: Optional[str] = None,
    image_after_para_index: int = 0,
) -> str:
    ns_hp = "http://www.hancom.co.kr/hwpml/2011/paragraph"
    ns_hc = "http://www.hancom.co.kr/hwpml/2011/core"
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<hs:sec xmlns:hp="{ns_hp}" xmlns:hc="{ns_hc}" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section">',
    ]
    pid = 1
    for i, text in enumerate(paragraphs):
        parts.append(_para(text, pid))
        pid += 1
        if image_id and i == image_after_para_index:
            parts.append(_pic_para(image_id, pid))
            pid += 1
    parts.append("</hs:sec>")
    return "\n".join(parts) + "\n"


def build_content_hpf(image_name: Optional[str] = None, media: str = "image/png") -> str:
    items = [
        '<opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>',
        '<opf:item id="masterpage0" href="Contents/masterpage0.xml" media-type="application/xml"/>',
        '<opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>',
        '<opf:item id="settings" href="settings.xml" media-type="application/xml"/>',
    ]
    if image_name:
        stem = Path(image_name).stem
        items.insert(
            2,
            f'<opf:item id="{stem}" href="BinData/{image_name}" media-type="{media}" isEmbeded="1"/>',
        )
    manifest = "\n".join(items)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<opf:package xmlns:opf="http://www.idpf.org/2007/opf/" version="" unique-identifier="" id="">
  <opf:metadata>
    <opf:title>exam-tools</opf:title>
    <opf:language>ko</opf:language>
  </opf:metadata>
  <opf:manifest>
{manifest}
  </opf:manifest>
  <opf:spine>
    <opf:itemref idref="header" linear="yes"/>
    <opf:itemref idref="section0" linear="yes"/>
  </opf:spine>
</opf:package>
"""


def write_question_hwpx(
    output: Path,
    *,
    stem: str,
    choices: Sequence[str],
    image_path: Optional[Path] = None,
    preface_lines: Optional[Sequence[str]] = None,
) -> Path:
    """객관식 1문항 HWPX 저장. image_path 있으면 BinData로 삽입."""
    import tempfile

    paras: List[str] = []
    if preface_lines:
        paras.extend(preface_lines)
    paras.append(stem)
    # image inserted after stem (index of stem in paras before choices)
    stem_index = len(paras) - 1
    for i, c in enumerate(choices, start=1):
        mark = "①②③④⑤"[i - 1] if i <= 5 else f"{i})"
        text = c if c.startswith(("①", "②", "③", "④", "⑤")) else f"{mark} {c}"
        paras.append(text)

    with tempfile.TemporaryDirectory(prefix="hwpx_q_") as tmp:
        root = Path(tmp) / "pkg"
        (root / "Contents").mkdir(parents=True)
        (root / "META-INF").mkdir(parents=True)
        (root / "BinData").mkdir(parents=True)
        (root / "Preview").mkdir(parents=True)

        image_id = None
        image_name = None
        if image_path is not None:
            image_path = Path(image_path)
            image_name = "image1.png" if image_path.suffix.lower() == ".png" else "image1.jpg"
            image_id = Path(image_name).stem
            (root / "BinData" / image_name).write_bytes(image_path.read_bytes())

        (root / "mimetype").write_text("application/hwp+zip", encoding="utf-8", newline="")
        (root / "version.xml").write_text(VERSION_XML, encoding="utf-8")
        (root / "settings.xml").write_text(SETTINGS_XML, encoding="utf-8")
        (root / "META-INF" / "container.xml").write_text(CONTAINER_XML, encoding="utf-8")
        (root / "Contents" / "header.xml").write_text(MIN_HEADER, encoding="utf-8")
        (root / "Contents" / "masterpage0.xml").write_text(MIN_MASTER, encoding="utf-8")
        (root / "Contents" / "content.hpf").write_text(
            build_content_hpf(image_name),
            encoding="utf-8",
        )
        (root / "Contents" / "section0.xml").write_text(
            build_section_xml(
                paras,
                image_id=image_id,
                image_after_para_index=stem_index,
            ),
            encoding="utf-8",
        )
        (root / "Preview" / "PrvText.txt").write_text(stem[:200], encoding="utf-8")
        return pack_directory(root, Path(output))
