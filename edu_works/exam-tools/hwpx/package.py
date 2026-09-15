# -*- coding: utf-8 -*-
"""HWPX = ZIP 패키지 open / unpack / pack."""

from __future__ import annotations

import shutil
import tempfile
import zipfile
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, List, Optional


class HwpxPackage:
    """.hwpx / .zip 패키지를 열고 멤버·section 을 다룬다."""

    def __init__(self, path: Path) -> None:
        self.path = Path(path)
        if self.path.suffix.lower() not in {".hwpx", ".zip"}:
            raise ValueError(f"HWPX/ZIP만 지원: {self.path.suffix}")
        if not self.path.is_file():
            raise FileNotFoundError(self.path)

    def namelist(self) -> List[str]:
        with zipfile.ZipFile(self.path, "r") as zf:
            return zf.namelist()

    def read_bytes(self, member: str) -> bytes:
        with zipfile.ZipFile(self.path, "r") as zf:
            return zf.read(member)

    def section_members(self) -> List[str]:
        names = [
            n
            for n in self.namelist()
            if n.replace("\\", "/").rsplit("/", 1)[-1].startswith("section")
            and n.lower().endswith(".xml")
        ]
        return sorted(names)

    def unpack_to(self, dest: Path) -> Path:
        dest.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(self.path, "r") as zf:
            zf.extractall(dest)
        return dest

    @contextmanager
    def unpacked(self) -> Iterator[Path]:
        with tempfile.TemporaryDirectory(prefix="hwpx_pkg_") as tmp:
            root = Path(tmp) / "root"
            self.unpack_to(root)
            yield root


def find_section_xmls(root: Path) -> List[Path]:
    return sorted(root.rglob("section*.xml"))


def find_section0(root: Path) -> Path:
    candidate = root / "Contents" / "section0.xml"
    if candidate.is_file():
        return candidate
    matches = list(root.rglob("section0.xml"))
    if not matches:
        raise FileNotFoundError(f"section0.xml 없음: {root}")
    return matches[0]


def pack_directory(source_dir: Path, output_hwpx: Path) -> Path:
    """언팩 폴더 → .hwpx (ZIP)."""
    output_hwpx = Path(output_hwpx)
    output_hwpx.parent.mkdir(parents=True, exist_ok=True)
    if output_hwpx.exists():
        output_hwpx.unlink()
    with zipfile.ZipFile(output_hwpx, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(source_dir.rglob("*")):
            if path.is_file():
                arcname = path.relative_to(source_dir).as_posix()
                zf.write(path, arcname)
    return output_hwpx


def copy_unpacked(src: Path, dest: Path) -> Path:
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(src, dest)
    return dest
