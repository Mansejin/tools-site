# -*- coding: utf-8 -*-
"""examdata/naesin 학교 시험지를 python-hwpx로 검증."""
from __future__ import annotations

import json
from pathlib import Path

from exam_hwpx.decode import decode_hwpx

ROOT = Path(__file__).resolve().parent
FILES = sorted((ROOT / "examdata" / "naesin").glob("*.hwpx"))
OUT = ROOT / "output" / "naesin_probe"


def mm(v: int) -> float:
    return round(v * 25.4 / 7200, 1)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for path in FILES:
        doc = decode_hwpx(path)
        page = (doc.meta or {}).get("page") or {}
        w, h = page.get("width"), page.get("height")
        row = {
            "file": path.name,
            "backend": (doc.meta or {}).get("backend"),
            "paragraphs": len(doc.paragraphs),
            "chars": len(doc.plain_text),
            "parts": doc.member_count,
            "page_mm": [mm(w), mm(h)] if w and h else None,
            "margins": (page.get("margins") or {}),
            "preview": doc.plain_text[:160].replace("\n", " | "),
        }
        rows.append(row)
        print(path.name)
        print(" ", row["page_mm"], "paras", row["paragraphs"], "chars", row["chars"])
        print(" ", row["preview"][:120])
    (OUT / "decode_summary.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
