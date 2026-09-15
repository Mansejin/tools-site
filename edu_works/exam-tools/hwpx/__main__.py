# -*- coding: utf-8 -*-
"""CLI: python -m hwpx decode|encode|fill|make-fixture"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .decode import decode_hwpx
from .encode import (
    encode_document,
    encode_plain_paragraphs,
    encode_questions_json,
    fill_template_hwpx,
    mapping_from_questions,
)
from .models import HwpxDocument


def cmd_decode(args: argparse.Namespace) -> int:
    doc = decode_hwpx(args.path)
    payload = doc.to_dict()
    if args.output:
        args.output.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"디코드 저장: {args.output.resolve()}")
        print(
            f"  kind={doc.kind_guess} questions={len(doc.questions)} "
            f"placeholders={len(doc.placeholders)} chars={len(doc.plain_text)}"
        )
    else:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


def cmd_fill(args: argparse.Namespace) -> int:
    data = json.loads(args.data.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise SystemExit("data JSON은 객체(dict)여야 합니다.")
    mapping = {str(k): "" if v is None else str(v) for k, v in data.items()}
    out = fill_template_hwpx(args.template, mapping, args.output, strict=args.strict)
    print(f"인코드 저장: {out.resolve()}")
    return 0


def cmd_encode(args: argparse.Namespace) -> int:
    out = encode_questions_json(
        args.questions,
        args.template,
        args.output,
        strict=args.strict,
    )
    print(f"인코드 저장: {out.resolve()}")
    return 0


def cmd_roundtrip(args: argparse.Namespace) -> int:
    doc = decode_hwpx(args.path)
    ir_path = args.ir or Path(str(args.path) + ".ir.json")
    ir_path.write_text(
        json.dumps(doc.to_dict(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    if args.template:
        out = encode_document(doc, args.template, args.output, strict=args.strict)
        print(f"IR: {ir_path.resolve()}")
        print(f"재인코드: {out.resolve()}")
    else:
        # 템플릿 없으면 평문 문단으로 최소 HWPX
        paras = [p.text for p in doc.paragraphs] or doc.plain_text.splitlines()
        out = encode_plain_paragraphs(paras, args.output)
        print(f"IR: {ir_path.resolve()}")
        print(f"최소 HWPX: {out.resolve()}")
    return 0


def cmd_make_fixture(args: argparse.Namespace) -> int:
    """개발용 템플릿+완성 시험지 fixture 생성."""
    out_dir = args.output
    out_dir.mkdir(parents=True, exist_ok=True)
    template_paras = [
        "{{문제1}}",
        "① {{선지1_1}}",
        "② {{선지1_2}}",
        "③ {{선지1_3}}",
        "④ {{선지1_4}}",
        "⑤ {{선지1_5}}",
        "{{문제2}}",
        "① {{선지2_1}}",
        "② {{선지2_2}}",
        "③ {{선지2_3}}",
        "④ {{선지2_4}}",
        "⑤ {{선지2_5}}",
    ]
    template = out_dir / "template.hwpx"
    encode_plain_paragraphs(template_paras, template)

    exam_paras = [
        "1. 표준 기압에서 물의 끓는점은?",
        "① 0도",
        "② 50도",
        "③ 100도",
        "④ 200도",
        "⑤ 알 수 없다",
        "2. 광합성에 필요한 것은?",
        "① 이산화탄소와 물",
        "② 질소만",
        "③ 산소만",
        "④ 헬륨",
        "⑤ 없음",
    ]
    exam = out_dir / "sample_exam.hwpx"
    encode_plain_paragraphs(exam_paras, exam)

    doc = decode_hwpx(exam)
    filled = out_dir / "filled_from_ir.hwpx"
    encode_document(doc, template, filled, strict=False)
    (out_dir / "sample_exam.ir.json").write_text(
        json.dumps(doc.to_dict(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"fixture: {out_dir.resolve()}")
    print(f"  template={template.name} exam={exam.name} filled={filled.name}")
    print(f"  questions={len(doc.questions)} mapping_keys={len(mapping_from_questions(doc.questions))}")
    return 0


def cmd_make_yunsa_sample(args: argparse.Namespace) -> int:
    from .build_exam import PAGE_PROFILES, write_question_hwpx
    from .figures import render_venn_gap_eul

    out_dir = args.output
    out_dir.mkdir(parents=True, exist_ok=True)
    fig = out_dir / "yunsa_venn.png"
    hwpx = out_dir / "yunsa_sample_q1.hwpx"
    render_venn_gap_eul(fig)
    stem = (
        "그림은 근대 서양 사상가 갑, 을의 입장을 그림으로 나타낸 것이다. "
        "이에 대한 설명으로 옳은 것은? [3점]"
    )
    preface = [
        "갑: 행위의 도덕성은 결과의 유용성이 아니라 선의지와 의무에 따른 행위에서 성립한다.",
        "을: 행위의 옳고 그름은 그 행위가 산출하는 쾌락과 고통의 양에 의해 결정된다.",
    ]
    choices = [
        "A에는 ‘정언명령’, C에는 ‘최대 다수의 최대 행복’이 들어간다.",
        "A에는 ‘쾌락의 양적 계산’, C에는 ‘선의지’가 들어간다.",
        "B에는 ‘결과를 도덕의 유일한 기준으로 삼는다’가 들어간다.",
        "C에는 ‘인간을 목적 그 자체로 대우하라’가 들어간다.",
        "A와 C에는 모두 ‘의무에 따르는 행위만이 도덕적 가치를 지닌다’가 들어간다.",
    ]
    write_question_hwpx(
        hwpx,
        stem=stem,
        choices=choices,
        image_path=fig,
        preface_lines=preface,
        page_profile=args.page_profile,
    )
    print(f"HWPX: {hwpx.resolve()}")
    print(f"PNG:  {fig.resolve()}")
    print(f"page: {args.page_profile} — {PAGE_PROFILES[args.page_profile]['label']}")
    print("정답: ① (갑=칸트, 을=공리주의)")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="python -m hwpx", description="HWPX 디코드/인코드 백엔드")
    sub = p.add_subparsers(dest="cmd", required=True)

    d = sub.add_parser("decode", help="HWPX → JSON IR")
    d.add_argument("path", type=Path)
    d.add_argument("-o", "--output", type=Path)
    d.set_defaults(func=cmd_decode)

    f = sub.add_parser("fill", help="템플릿 + placeholder 맵 → HWPX")
    f.add_argument("--template", type=Path, required=True)
    f.add_argument("--data", type=Path, required=True, help="placeholder→값 JSON")
    f.add_argument("-o", "--output", type=Path, required=True)
    f.add_argument("--strict", action="store_true")
    f.set_defaults(func=cmd_fill)

    e = sub.add_parser("encode", help="문항 IR/맵 JSON + 템플릿 → HWPX")
    e.add_argument("--questions", type=Path, required=True)
    e.add_argument("--template", type=Path, required=True)
    e.add_argument("-o", "--output", type=Path, required=True)
    e.add_argument("--strict", action="store_true")
    e.set_defaults(func=cmd_encode)

    r = sub.add_parser("roundtrip", help="디코드 후 재인코드")
    r.add_argument("path", type=Path)
    r.add_argument("-o", "--output", type=Path, required=True)
    r.add_argument("--template", type=Path, default=None)
    r.add_argument("--ir", type=Path, default=None)
    r.add_argument("--strict", action="store_true")
    r.set_defaults(func=cmd_roundtrip)

    m = sub.add_parser("make-fixture", help="개발용 template/exam fixture 생성")
    m.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent / "fixtures",
    )
    m.set_defaults(func=cmd_make_fixture)

    y = sub.add_parser("make-yunsa-sample", help="윤사 벤다이어그램 샘플 1문항 HWPX")
    y.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "output",
    )
    y.add_argument(
        "--page-profile",
        choices=["a3_2col", "a4_2col"],
        default="a3_2col",
        help="용지/단 프로필 (기본: A3 가로 2단)",
    )
    y.set_defaults(func=cmd_make_yunsa_sample)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
