# -*- coding: utf-8 -*-
"""CLI shim — prefer: python -m exam_hwpx make-yunsa-set"""

from exam_hwpx.sample_set import build_yunsa_sample_set
from pathlib import Path

if __name__ == "__main__":
    print(build_yunsa_sample_set(Path(__file__).resolve().parents[1] / "samples"))
