#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""호환 별칭: analyze_topic_keywords.py 를 호출한다."""

from __future__ import annotations

from analyze_topic_keywords import (  # noqa: F401
    infer_thinker,
    infer_topic,
    load_custom_dict,
    main,
    score_passage,
    to_dataframe,
)

if __name__ == "__main__":
    raise SystemExit(main())
