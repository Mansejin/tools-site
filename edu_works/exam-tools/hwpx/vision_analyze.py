# -*- coding: utf-8 -*-
"""그림 문항 분석: BinData 추출 + Gemini Vision (gemini-3.8-flash).

키: GEMINI_API_KEY (또는 GOOGLE_API_KEY).
로드 순서: 환경변수 → exam-tools/.env → dddit-premiere-plugin/.env
"""

from __future__ import annotations

import base64
import json
import os
import re
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional

DEFAULT_MODEL = "gemini-3.8-flash"

# 로컬 키 파일 (gitignore). 프리미어 플러그인 .env도 폴백으로 사용.
_ENV_CANDIDATES = [
    Path(__file__).resolve().parents[1] / ".env",
    Path(r"C:\Users\Ohola\Projects\dddit-premiere-plugin\.env"),
]

VISION_SYSTEM = """당신은 고등학교 시험지 그림 분석기다.
이미지를 보고 JSON만 출력한다. 추측은 confidence로 표시한다.
스키마:
{
  "figure_type": "venn|flowchart|dialogue|table|graph|map|other",
  "labels": ["..."],
  "regions": [{"id":"A","meaning":"..."}],
  "ocr_text": ["줄 단위 텍스트"],
  "question_role": "지문그림|보기그림|선지그림",
  "reproduce_recipe": {
    "template": "venn_gap_eul|flowchart_gap_eul|custom",
    "params": {}
  },
  "confidence": 0.0
}
"""


def load_gemini_api_key() -> str:
    """환경변수 우선, 없으면 후보 .env에서 GEMINI_API_KEY 로드."""
    for env_path in _ENV_CANDIDATES:
        if not env_path.is_file():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            s = line.strip()
            if not s or s.startswith("#") or "=" not in s:
                continue
            k, _, v = s.partition("=")
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k in ("GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENAI_API_KEY") and v:
                os.environ.setdefault(k, v)

    return (
        os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
        or os.environ.get("GOOGLE_GENAI_API_KEY")
        or ""
    ).strip()


def extract_bindata_images(hwpx_path: Path, out_dir: Path) -> List[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    saved: List[Path] = []
    with zipfile.ZipFile(hwpx_path, "r") as zf:
        for name in zf.namelist():
            if not name.startswith("BinData/"):
                continue
            if not name.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".bmp")):
                continue
            dest = out_dir / Path(name).name
            dest.write_bytes(zf.read(name))
            saved.append(dest)
    return sorted(saved)


def list_pic_refs(hwpx_path: Path) -> List[str]:
    with zipfile.ZipFile(hwpx_path, "r") as zf:
        xml = zf.read("Contents/section0.xml").decode("utf-8", errors="replace")
    return re.findall(r'binaryItemIDRef="([^"]+)"', xml)


def image_to_data_url(path: Path) -> str:
    suffix = path.suffix.lower().lstrip(".")
    mime = "jpeg" if suffix in {"jpg", "jpeg"} else suffix
    b64 = base64.standard_b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/{mime};base64,{b64}"


def _mime_for(path: Path) -> str:
    suf = path.suffix.lower()
    if suf in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if suf == ".gif":
        return "image/gif"
    if suf == ".webp":
        return "image/webp"
    return "image/png"


def _parse_json_loose(text: str) -> Optional[Dict[str, Any]]:
    raw = (text or "").strip()
    if not raw:
        return None
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:].strip()
    try:
        obj = json.loads(raw)
        return obj if isinstance(obj, dict) else None
    except json.JSONDecodeError:
        start, end = raw.find("{"), raw.rfind("}")
        if start >= 0 and end > start:
            try:
                obj = json.loads(raw[start : end + 1])
                return obj if isinstance(obj, dict) else None
            except json.JSONDecodeError:
                return None
    return None


def analyze_image_gemini(
    image_path: Path,
    *,
    model: str = DEFAULT_MODEL,
    extra: str = "",
) -> Dict[str, Any]:
    """Gemini Vision으로 시험 그림 분석. 기본 모델: gemini-3.8-flash."""
    image_path = Path(image_path)
    key = load_gemini_api_key()
    if not key:
        return {
            "ok": False,
            "error": "GEMINI_API_KEY 없음",
            "hint": "exam-tools/.env 또는 dddit-premiere-plugin/.env 에 키를 두세요",
            "model": model,
        }

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        return {
            "ok": False,
            "error": "google-genai 패키지 없음. pip install google-genai",
            "model": model,
        }

    prompt = VISION_SYSTEM + "\n\n이 시험 그림을 스키마대로 분석하라. " + extra
    client = genai.Client(api_key=key)
    parts = [
        types.Part.from_bytes(
            data=image_path.read_bytes(),
            mime_type=_mime_for(image_path),
        ),
        prompt,
    ]
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        max_output_tokens=1024,
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )

    last_err = ""
    for attempt in range(1, 4):
        try:
            resp = client.models.generate_content(
                model=model,
                contents=parts,
                config=config,
            )
            text = getattr(resp, "text", None) or ""
            parsed = _parse_json_loose(text)
            if parsed is None:
                return {
                    "ok": False,
                    "error": "JSON 파싱 실패",
                    "raw_text": text,
                    "model": model,
                    "attempts": attempt,
                }
            return {
                "ok": True,
                "result": parsed,
                "model": model,
                "raw_text": text,
                "attempts": attempt,
            }
        except Exception as exc:  # noqa: BLE001
            last_err = str(exc)
            # 503 / 일시적 부하만 재시도
            if attempt < 3 and any(x in last_err for x in ("503", "UNAVAILABLE", "high demand")):
                import time

                time.sleep(2 * attempt)
                continue
            return {"ok": False, "error": last_err, "model": model, "attempts": attempt}
    return {"ok": False, "error": last_err, "model": model}


# 하위 호환 별칭
def analyze_image_openai(image_path: Path) -> Dict[str, Any]:
    """Deprecated: Gemini로 위임."""
    return analyze_image_gemini(image_path)
