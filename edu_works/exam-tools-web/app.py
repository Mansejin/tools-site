#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""윤리와사상 시험 도구 — 로컬 웹 UI (FastAPI).

형제 폴더 exam-tools CLI 모듈을 import하여 5개 도구를 웹으로 제공합니다.
업로드는 tempfile만 사용하며 비밀값을 다루지 않습니다.
"""

from __future__ import annotations

import io
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Any, Optional

import pandas as pd
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# 형제 폴더 exam-tools 를 import 경로에 추가
WEB_DIR = Path(__file__).resolve().parent
TOOLS_DIR = WEB_DIR.parent / "exam-tools"
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

import analyze_thinker_keywords as thinker_mod  # noqa: E402
import extract_and_classify as extract_mod  # noqa: E402
import generate_omr_sheet as omr_mod  # noqa: E402
import hwpx_fill_template as hwpx_mod  # noqa: E402
import shuffle_ab_forms as shuffle_mod  # noqa: E402
from curriculum_keywords import THINKER_KEYWORDS  # noqa: E402

app = FastAPI(title="윤리와사상 시험 도구", docs_url=None, redoc_url=None)
app.mount("/static", StaticFiles(directory=str(WEB_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(WEB_DIR / "templates"))

TAB_META = {
    "extract": (
        "문항 추출·단원 분류",
        "텍스트를 붙여넣거나 .txt를 올리면 문항을 분리·단원 분류한 Excel을 내려받습니다.",
    ),
    "shuffle": (
        "A/B형 선지 셔플",
        "문항·선지1~5·정답이 있는 Excel을 올리면 A형(원본)·B형(셔플)을 ZIP으로 받습니다.",
    ),
    "omr": (
        "OMR 정답지",
        "문항번호·정답이 있는 Excel에서 OMR용 정답지를 만듭니다.",
    ),
    "hwpx": (
        "HWPX 템플릿 채우기",
        "언팩된 HWPX 폴더 ZIP과 치환 데이터(JSON/Excel)로 채워진 .hwpx를 만듭니다.",
    ),
    "thinker": (
        "사상가 키워드 분석",
        "지문을 붙여넣으면 사상가별 키워드 점수와 추정 사상가를 보여 줍니다.",
    ),
}

PASSAGE_DEMO = (
    "칸트는 도덕의 근거를 경향성이 아니라 선의지에 두었다. "
    "정언명령은 행위의 보편화 가능성과 인간을 목적 그 자체로 대우할 것을 요구하며, "
    "의무에 따른 자율적 행위만이 도덕적 가치를 지닌다고 보았다."
)


def _render(
    request: Request,
    tab: str,
    *,
    error: Optional[str] = None,
    thinker_result: Optional[dict[str, Any]] = None,
    demo_text: str = "",
    passage_demo: str = "",
) -> HTMLResponse:
    if tab not in TAB_META:
        tab = "extract"
    title, hint = TAB_META[tab]
    return templates.TemplateResponse(
        request,
        "index.html",
        {
            "tab": tab,
            "tool_title": title,
            "tool_hint": hint,
            "error": error,
            "thinker_result": thinker_result,
            "demo_text": demo_text,
            "passage_demo": passage_demo or (PASSAGE_DEMO if tab == "thinker" else ""),
        },
    )


async def _save_upload(upload: UploadFile, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    data = await upload.read()
    dest.write_bytes(data)
    return dest


def _xlsx_response(path: Path, download_name: str) -> StreamingResponse:
    data = path.read_bytes()
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{download_name}"',
        },
    )


def _file_response(path: Path, download_name: str, media_type: str) -> StreamingResponse:
    data = path.read_bytes()
    return StreamingResponse(
        io.BytesIO(data),
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{download_name}"',
        },
    )


@app.get("/", response_class=HTMLResponse)
async def home(request: Request, tab: str = "extract") -> HTMLResponse:
    demo = extract_mod.DEMO_TEXT.strip() if tab == "extract" else ""
    return _render(request, tab, demo_text=demo)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/extract")
async def api_extract(
    request: Request,
    text: str = Form(""),
    exam_label: str = Form("윤리와사상 2022 교육과정 2학년 2학기 중간고사"),
    threshold: int = Form(1),
    text_file: Optional[UploadFile] = File(None),
):
    try:
        raw = (text or "").strip()
        if text_file is not None and text_file.filename:
            raw = (await text_file.read()).decode("utf-8", errors="replace").strip()
        if not raw:
            return _render(
                request,
                "extract",
                error="문항 텍스트를 붙여넣거나 파일을 업로드하세요.",
                demo_text=extract_mod.DEMO_TEXT.strip(),
            )

        questions = extract_mod.split_questions(raw)
        if not questions:
            return _render(
                request,
                "extract",
                error="문항을 찾지 못했습니다. 번호 형식(예: 1. / 1))을 확인하세요.",
                demo_text=raw,
            )

        df = extract_mod.build_dataframe(questions, threshold, exam_label)
        with tempfile.TemporaryDirectory(prefix="exam_extract_") as tmp:
            out = Path(tmp) / "classified_questions.xlsx"
            df.to_excel(out, index=False, engine="openpyxl")
            return _xlsx_response(out, "classified_questions.xlsx")
    except Exception as exc:  # noqa: BLE001 — 교사 UI용 친절 오류
        return _render(
            request,
            "extract",
            error=f"처리 실패: {exc}",
            demo_text=text or extract_mod.DEMO_TEXT.strip(),
        )


@app.post("/api/shuffle")
async def api_shuffle(
    request: Request,
    exam_xlsx: UploadFile = File(...),
    seed: Optional[str] = Form(None),
):
    try:
        seed_val: Optional[int] = None
        if seed is not None and str(seed).strip() != "":
            seed_val = int(str(seed).strip())

        with tempfile.TemporaryDirectory(prefix="exam_shuffle_") as tmp:
            tmp_path = Path(tmp)
            src = tmp_path / (exam_xlsx.filename or "exam.xlsx")
            await _save_upload(exam_xlsx, src)
            df = pd.read_excel(src, engine="openpyxl")
            form_a, form_b = shuffle_mod.build_forms(df, seed=seed_val)

            out_a = tmp_path / "exam_form_A.xlsx"
            out_b = tmp_path / "exam_form_B.xlsx"
            form_a.to_excel(out_a, index=False, engine="openpyxl")
            form_b.to_excel(out_b, index=False, engine="openpyxl")

            zip_buf = io.BytesIO()
            with zipfile.ZipFile(zip_buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
                zf.write(out_a, "exam_form_A.xlsx")
                zf.write(out_b, "exam_form_B.xlsx")
            zip_buf.seek(0)
            return StreamingResponse(
                zip_buf,
                media_type="application/zip",
                headers={
                    "Content-Disposition": 'attachment; filename="exam_forms_AB.zip"',
                },
            )
    except Exception as exc:  # noqa: BLE001
        return _render(request, "shuffle", error=f"처리 실패: {exc}")


@app.post("/api/omr")
async def api_omr(
    request: Request,
    dataset: UploadFile = File(...),
    layout: str = Form("long"),
    one_hot: Optional[str] = Form(None),
):
    try:
        with tempfile.TemporaryDirectory(prefix="exam_omr_") as tmp:
            tmp_path = Path(tmp)
            src = tmp_path / (dataset.filename or "dataset.xlsx")
            await _save_upload(dataset, src)
            df = pd.read_excel(src, engine="openpyxl")

            if layout == "wide":
                out_df = omr_mod.build_omr_wide(df)
            else:
                out_df = omr_mod.build_omr_long(df, one_hot=bool(one_hot))

            out = tmp_path / "omr_answers.xlsx"
            out_df.to_excel(out, index=False, engine="openpyxl")
            return _xlsx_response(out, "omr_answers.xlsx")
    except Exception as exc:  # noqa: BLE001
        return _render(request, "omr", error=f"처리 실패: {exc}")


@app.post("/api/hwpx")
async def api_hwpx(
    request: Request,
    unpacked_zip: UploadFile = File(...),
    data_file: UploadFile = File(...),
    strict: Optional[str] = Form(None),
):
    try:
        with tempfile.TemporaryDirectory(prefix="exam_hwpx_") as tmp:
            tmp_path = Path(tmp)
            zip_path = tmp_path / (unpacked_zip.filename or "unpacked.zip")
            await _save_upload(unpacked_zip, zip_path)

            data_name = data_file.filename or "data.json"
            data_path = tmp_path / data_name
            await _save_upload(data_file, data_path)

            unpack_root = tmp_path / "unpacked"
            unpack_root.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(zip_path, "r") as zf:
                zf.extractall(unpack_root)

            # ZIP 루트에 Contents가 있거나, 한 단계 하위 폴더에 있을 수 있음
            if (unpack_root / "Contents").is_dir():
                unpacked_dir = unpack_root
            else:
                children = [p for p in unpack_root.iterdir() if p.is_dir()]
                if len(children) == 1 and (children[0] / "Contents").is_dir():
                    unpacked_dir = children[0]
                else:
                    # section0.xml 위치 기준으로 추정
                    matches = list(unpack_root.rglob("section0.xml"))
                    if not matches:
                        raise FileNotFoundError(
                            "ZIP 안에 Contents/section0.xml 이 없습니다."
                        )
                    unpacked_dir = matches[0].parents[1]

            out_hwpx = tmp_path / "filled_exam.hwpx"
            hwpx_mod.process(
                unpacked_dir=unpacked_dir,
                data_path=data_path,
                output_hwpx=out_hwpx,
                strict=bool(strict),
                inplace=False,
            )
            return _file_response(
                out_hwpx,
                "filled_exam.hwpx",
                "application/hwp+zip",
            )
    except Exception as exc:  # noqa: BLE001
        return _render(request, "hwpx", error=f"처리 실패: {exc}")


@app.post("/api/thinker", response_class=HTMLResponse)
async def api_thinker(
    request: Request,
    passage: str = Form(""),
    dict_json: Optional[UploadFile] = File(None),
):
    try:
        text = (passage or "").strip()
        if not text:
            return _render(
                request,
                "thinker",
                error="분석할 지문을 입력하세요.",
                passage_demo=PASSAGE_DEMO,
            )

        dictionary = dict(THINKER_KEYWORDS)
        if dict_json is not None and dict_json.filename:
            with tempfile.TemporaryDirectory(prefix="exam_thinker_") as tmp:
                path = Path(tmp) / (dict_json.filename or "dict.json")
                await _save_upload(dict_json, path)
                dictionary = thinker_mod.load_custom_dict(path)

        scored = thinker_mod.score_passage(text, dictionary)
        best, tied = thinker_mod.infer_thinker(scored)
        df = thinker_mod.to_dataframe(scored)
        # 상위 10명만 표시
        rows = df.head(10).to_dict(orient="records")
        return _render(
            request,
            "thinker",
            thinker_result={"inferred": best, "tied": tied, "rows": rows},
            passage_demo=text,
        )
    except Exception as exc:  # noqa: BLE001
        return _render(
            request,
            "thinker",
            error=f"처리 실패: {exc}",
            passage_demo=passage or PASSAGE_DEMO,
        )


@app.get("/favicon.ico")
async def favicon() -> RedirectResponse:
    return RedirectResponse(url="/")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8765, reload=False)
