#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""시험 작성 도구 — 로컬 웹 UI (FastAPI).

형제 폴더 exam-tools CLI 모듈을 import하여 도구를 웹으로 제공합니다.
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
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# 형제 폴더 exam-tools 를 import 경로에 추가
WEB_DIR = Path(__file__).resolve().parent
TOOLS_DIR = WEB_DIR.parent / "exam-tools"
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

import analyze_exam_structure as structure_mod  # noqa: E402
import analyze_topic_keywords as topic_mod  # noqa: E402
import extract_and_classify as extract_mod  # noqa: E402
import generate_omr_sheet as omr_mod  # noqa: E402
import hwpx_fill_template as hwpx_mod  # noqa: E402
import shuffle_ab_forms as shuffle_mod  # noqa: E402
from hwpx_text import extract_text_from_hwpx  # noqa: E402
from subject_packs.loader import load_pack_path  # noqa: E402

app = FastAPI(title="시험 작성 도구", docs_url=None, redoc_url=None)
app.mount("/static", StaticFiles(directory=str(WEB_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(WEB_DIR / "templates"))

TAB_META = {
    "extract": (
        "문항 추출·단원 분류",
        ".hwpx 시험지를 올리면 본문에서 문항을 뽑습니다. 과목 팩 JSON을 붙이면 단원도 분류합니다.",
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
    "keywords": (
        "키워드 매칭",
        "지문과 주제 사전 JSON을 넣으면 주제별 점수와 추정 주제를 보여 줍니다. 내장 과목 사전은 쓰지 않습니다.",
    ),
    # 관리자 전용 (?tab=structure). 사용자 탭에는 안 보임.
    "structure": (
        "구조 분석 (관리자)",
        "examdata 샘플로 형식을 파악할 때만 씁니다. 사용자 업무 흐름에는 넣지 않습니다.",
    ),
}


def _examdata_dir() -> Path:
    return TOOLS_DIR / "examdata"


def _examdata_listing() -> list[dict[str, Any]]:
    files = structure_mod.list_examdata_files(_examdata_dir())
    rows: list[dict[str, Any]] = []
    for path in files:
        if path.name.lower() == "readme.md":
            continue
        rows.append(
            {
                "name": path.name,
                "suffix": path.suffix.lower(),
                "size": path.stat().st_size,
            }
        )
    return rows


def _unique_examdata_path(filename: str) -> Path:
    """examdata에 저장할 경로. 같은 이름이 있으면 stem_2.ext …"""
    folder = _examdata_dir()
    folder.mkdir(parents=True, exist_ok=True)
    safe = Path(filename).name
    if not safe or safe in {".", ".."}:
        safe = "exam.bin"
    dest = folder / safe
    if not dest.exists():
        return dest
    stem = dest.stem
    suffix = dest.suffix
    n = 2
    while True:
        candidate = folder / f"{stem}_{n}{suffix}"
        if not candidate.exists():
            return candidate
        n += 1


def _safe_examdata_file(name: str) -> Path:
    folder = _examdata_dir().resolve()
    path = (folder / Path(name).name).resolve()
    if path.parent != folder:
        raise HTTPException(status_code=400, detail="잘못된 파일 이름입니다.")
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"examdata에 없습니다: {path.name}")
    return path


def _render(
    request: Request,
    tab: str,
    *,
    error: Optional[str] = None,
    keyword_result: Optional[dict[str, Any]] = None,
    structure_result: Optional[dict[str, Any]] = None,
    structure_batch: Optional[list[dict[str, Any]]] = None,
    demo_text: str = "",
    passage_demo: str = "",
) -> HTMLResponse:
    if tab == "thinker":
        tab = "keywords"
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
            "keyword_result": keyword_result,
            "structure_result": structure_result,
            "structure_batch": structure_batch or [],
            "examdata_files": _examdata_listing(),
            "demo_text": demo_text,
            "passage_demo": passage_demo,
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


@app.get("/packs/{name}.json")
async def download_pack(name: str) -> FileResponse:
    safe = Path(name).name
    path = TOOLS_DIR / "subject_packs" / f"{safe}.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"팩이 없습니다: {safe}")
    return FileResponse(
        path,
        media_type="application/json",
        filename=f"{safe}.json",
    )


@app.post("/api/structure", response_class=HTMLResponse)
async def api_structure(
    request: Request,
    exam_file: Optional[UploadFile] = File(None),
):
    try:
        if exam_file is None or not exam_file.filename:
            return _render(
                request,
                "structure",
                error="시험 파일을 선택해 업로드하세요.",
            )
        dest = _unique_examdata_path(exam_file.filename)
        await _save_upload(exam_file, dest)
        result = structure_mod.analyze_path(dest)
        result["findings"] = [
            {"label": "저장 위치", "value": f"examdata/{dest.name}"},
            *list(result.get("findings") or []),
        ]
        return _render(request, "structure", structure_result=result)
    except Exception as exc:  # noqa: BLE001
        return _render(request, "structure", error=f"분석 실패: {exc}")


@app.post("/api/structure-examdata", response_class=HTMLResponse)
async def api_structure_examdata(
    request: Request,
    filename: str = Form(""),
    all_files: Optional[str] = Form(None),
):
    try:
        folder = _examdata_dir()
        if all_files:
            files = structure_mod.list_examdata_files(folder)
            if not files:
                return _render(
                    request,
                    "structure",
                    error="examdata 폴더가 비어 있습니다. .hwpx를 넣어 주세요.",
                )
            batch = structure_mod.analyze_paths(files)
            return _render(request, "structure", structure_batch=batch)
        if not filename.strip():
            return _render(
                request,
                "structure",
                error="examdata 파일을 선택하세요.",
            )
        src = _safe_examdata_file(filename)
        result = structure_mod.analyze_path(src)
        return _render(request, "structure", structure_result=result)
    except HTTPException as exc:
        return _render(request, "structure", error=str(exc.detail))
    except Exception as exc:  # noqa: BLE001
        return _render(request, "structure", error=f"분석 실패: {exc}")


@app.post("/api/extract")
async def api_extract(
    request: Request,
    text: str = Form(""),
    exam_label: str = Form("2학년 2학기 중간고사"),
    threshold: int = Form(1),
    exam_file: Optional[UploadFile] = File(None),
    text_file: Optional[UploadFile] = File(None),
    pack_file: Optional[UploadFile] = File(None),
):
    try:
        raw = (text or "").strip()
        upload = None
        if exam_file is not None and exam_file.filename:
            upload = exam_file
        elif text_file is not None and text_file.filename:
            upload = text_file

        if upload is not None:
            name = upload.filename or "exam.bin"
            suffix = Path(name).suffix.lower()
            with tempfile.TemporaryDirectory(prefix="exam_extract_") as tmp:
                src = Path(tmp) / name
                await _save_upload(upload, src)
                if suffix in {".hwpx", ".zip"}:
                    raw = extract_text_from_hwpx(src).strip()
                else:
                    raw = src.read_text(encoding="utf-8", errors="replace").strip()

        if not raw:
            return _render(
                request,
                "extract",
                error="문항 텍스트를 붙여넣거나 .hwpx/.txt 파일을 업로드하세요.",
                demo_text=extract_mod.DEMO_TEXT.strip(),
            )

        pack_units = None
        if pack_file is not None and pack_file.filename:
            with tempfile.TemporaryDirectory(prefix="exam_pack_") as tmp:
                pack_path = Path(tmp) / (pack_file.filename or "pack.json")
                await _save_upload(pack_file, pack_path)
                pack_units = load_pack_path(pack_path).units

        questions = extract_mod.split_questions(raw)
        if not questions:
            return _render(
                request,
                "extract",
                error="문항을 찾지 못했습니다. 번호 형식(예: 1. / 1))을 확인하세요.",
                demo_text=raw[:2000],
            )

        df = extract_mod.build_dataframe(
            questions,
            threshold,
            exam_label,
            unit_keywords=pack_units,
        )
        with tempfile.TemporaryDirectory(prefix="exam_extract_out_") as tmp:
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


@app.post("/api/keywords", response_class=HTMLResponse)
async def api_keywords(
    request: Request,
    passage: str = Form(""),
    dict_json: Optional[UploadFile] = File(None),
):
    try:
        text = (passage or "").strip()
        if not text:
            return _render(
                request,
                "keywords",
                error="분석할 지문을 입력하세요.",
            )
        if dict_json is None or not dict_json.filename:
            return _render(
                request,
                "keywords",
                error="주제 사전 JSON을 업로드하세요. 내장 과목 사전은 쓰지 않습니다.",
                passage_demo=text,
            )

        with tempfile.TemporaryDirectory(prefix="exam_keywords_") as tmp:
            path = Path(tmp) / (dict_json.filename or "dict.json")
            await _save_upload(dict_json, path)
            dictionary = topic_mod.load_custom_dict(path)

        scored = topic_mod.score_passage(text, dictionary)
        best, tied = topic_mod.infer_topic(scored)
        df = topic_mod.to_dataframe(scored)
        rows = df.head(10).to_dict(orient="records")
        return _render(
            request,
            "keywords",
            keyword_result={"inferred": best, "tied": tied, "rows": rows},
            passage_demo=text,
        )
    except Exception as exc:  # noqa: BLE001
        return _render(
            request,
            "keywords",
            error=f"처리 실패: {exc}",
            passage_demo=passage,
        )


@app.post("/api/thinker", response_class=HTMLResponse)
async def api_thinker_alias(
    request: Request,
    passage: str = Form(""),
    dict_json: Optional[UploadFile] = File(None),
):
    return await api_keywords(request, passage=passage, dict_json=dict_json)


@app.get("/favicon.ico")
async def favicon() -> RedirectResponse:
    return RedirectResponse(url="/")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8765, reload=False)
