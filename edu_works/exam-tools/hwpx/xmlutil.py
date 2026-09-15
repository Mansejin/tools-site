# -*- coding: utf-8 -*-
"""XML 헬퍼 — 네임스페이스 무시 localname."""

from __future__ import annotations

import re
from typing import Iterator, List
from xml.etree import ElementTree as ET


def local_name(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    if ":" in tag:
        return tag.split(":", 1)[-1]
    return tag


def iter_by_local(root: ET.Element, name: str) -> Iterator[ET.Element]:
    for el in root.iter():
        if local_name(el.tag) == name:
            yield el


def paragraph_texts(xml_bytes: bytes) -> List[str]:
    """section XML → 문단 문자열 목록."""
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        text = xml_bytes.decode("utf-8", errors="replace")
        plain = re.sub(r"<[^>]+>", "\n", text)
        return [ln.strip() for ln in plain.splitlines() if ln.strip()]

    paragraphs: List[str] = []
    for el in iter_by_local(root, "p"):
        chunks: List[str] = []
        for node in el.iter():
            if local_name(node.tag) == "t" and node.text:
                chunks.append(node.text)
        line = "".join(chunks).strip()
        if line:
            paragraphs.append(line)
    if paragraphs:
        return paragraphs

    chunks = []
    for node in root.iter():
        if node.text and node.text.strip():
            chunks.append(node.text.strip())
        if node.tail and node.tail.strip():
            chunks.append(node.tail.strip())
    return chunks


def xml_escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )
