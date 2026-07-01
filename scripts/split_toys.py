#!/usr/bin/env python3
"""Split toys monolith into separate excuse / hair / poker pages."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
MONO = ROOT / "toys" / "_monolith.html"


def between(text: str, start: str, end: str) -> str:
    i = text.index(start)
    j = text.index(end, i)
    return text[i:j]


def main() -> None:
    mono = MONO.read_text(encoding="utf-8")
    script = re.search(r"<script>\s*\(function \(\) \{(.*)\}\)\(\);\s*</script>", mono, re.S).group(1)

    css = re.search(r"<style>(.*?)</style>", mono, re.S).group(1)
    for pat in (r"\s*\.app-nav[^}]*\{[^}]*\}", r"\s*\.app-nav-btn[^}]*\{[^}]*\}", r"\s*\.panel[^}]*\{[^}]*\}"):
        css = re.sub(pat, "", css)
    css_path = ROOT / "toys" / "css" / "toys.css"
    css_path.parent.mkdir(parents=True, exist_ok=True)
    css_path.write_text(css.strip() + "\n", encoding="utf-8")

    common = between(script, "    function bindTap(el, handler) {", "    function selectSituation(tab) {")
    common += between(script, "    function copyToClipboard(text) {", "    function copyExcuse() {")
    common += """    function getShareUrl() {
      if (location.protocol === 'file:') return '';
      return location.origin + location.pathname;
    }

"""

    excuse = between(script, "    const situations = {", "    function bindTap(el, handler) {")
    excuse += between(script, "    function selectSituation(tab) {", "    function copyToClipboard(text) {")
    excuse += between(script, "    function copyExcuse() {", "    // ── 탈모 확률 계산기 ──")
    excuse += """
    const params = new URLSearchParams(location.search);
    const shared = params.get('e');
    if (shared) {
      try {
        currentExcuse = decodeURIComponent(shared);
        excuseBox.textContent = currentExcuse;
        excuseBox.classList.add('has-excuse');
        copyBtn.style.display = 'block';
      } catch {}
    }
"""

    hair = between(script, "    // ── 탈모 확률 계산기 ──", "    // ── 콜 할까 말까? ──")
    hair = hair.replace(
        "location.origin + location.pathname + '?app=hair'",
        "location.origin + location.pathname",
    )
    hair = hair.replace("      if (currentApp !== 'hair') return;\n", "")
    hair = re.sub(
        r"\n    if \(params\.get\('admin'\) === 'hair'.*?\n    \}\n\n    let emojiTaps",
        "\n\n    let emojiTaps",
        hair,
        flags=re.S,
    )
    hair += """
    const params = new URLSearchParams(location.search);
    if (params.get('admin') === 'hair' || sessionStorage.getItem(HAIR_ADMIN_KEY)) {
      showHairAdmin();
    }

    document.getElementById('headerEmoji').addEventListener('click', () => {
      emojiTaps++;
      clearTimeout(emojiTapTimer);
      emojiTapTimer = setTimeout(() => { emojiTaps = 0; }, 2000);
      if (emojiTaps >= 5) {
        emojiTaps = 0;
        showHairAdmin();
        showToast('🔒 관리 패널 열림');
      }
    });
"""

    poker = between(script, "    // ── 콜 할까 말까? ──", "    // URL에 핑계가 있으면")
    poker = poker.replace(
        "location.origin + location.pathname + '?app=poker'",
        "location.origin + location.pathname",
    )
    poker = poker.replace("if (currentApp === 'poker') startPokerTimer();", "startPokerTimer();")
    poker = re.sub(r"\n    onAppSwitch = \(from, to\) => \{.*?\};\n", "\n", poker, flags=re.S)
    poker += "\n    resetPoker();\n"

    wrap = lambda body: f"(function () {{\n'use strict';\n{common}\n{body}\n}})();\n"

    js_dir = ROOT / "toys" / "js"
    js_dir.mkdir(parents=True, exist_ok=True)
    (js_dir / "excuse.js").write_text(wrap(excuse), encoding="utf-8")
    (js_dir / "hair.js").write_text(wrap(hair), encoding="utf-8")
    (js_dir / "poker.js").write_text(wrap(poker), encoding="utf-8")

    apps = {
        "excuse": ("panelExcuse", "지각 핑계 생성기 🏃‍♂️ · 장난감", "지각 핑계 생성기 🏃‍♂️",
                   "오늘 지각했어? 클릭 한 번으로 그럴듯한 핑계를 만들어드려요!",
                   "🏃‍♂️💨", "지각 핑계 생성기", "오늘도 늦었어? 괜찮아, 핑계는 내가 만들어줄게",
                   "※ 본 서비스는 핑계의 진실성을 보장하지 않습니다 😇",
                   "지각하지 않는 것이 최고의 핑계입니다", "excuse.js"),
        "hair": ("panelHair", "탈모 확률 계산기 🧑‍🦲 · 장난감", "탈모 확률 계산기 🧑‍🦲",
                 "과학적 알고리즘으로 정밀 분석합니다 (진짜임)",
                 "🧑‍🦲📉", "탈모 확률 계산기", "과학적 알고리즘으로 정밀 분석합니다 (진짜임)",
                 "※ 본 서비스는 탈모 예측의 정확성을 보장하지 않습니다",
                 "머리 숱 많은 것이 최고의 해법입니다", "hair.js"),
        "poker": ("panelPoker", "콜 할까 말까? 🃏 · 장난감", "콜 할까 말까? 🃏",
                  "홀덤 톡방 전용 의사결정 도우미 (책임 안 짐)",
                  "🃏🤔", "콜 할까 말까?", "홀덤 톡방 전용 의사결정 도우미 (책임 안 짐)",
                  "※ 본 서비스는 패배에 대한 책임을 지지 않습니다",
                  "폴드가 최고의 핸드일 때가 있습니다", "poker.js"),
    }

    for slug, (panel_id, title, og, desc, emoji, heading, subtitle, f1, f2, js_file) in apps.items():
        panel_re = rf'<main class="card panel[^"]*" id="{panel_id}">(.*?)</main>'
        panel = re.search(panel_re, mono, re.S).group(0)
        panel = re.sub(r'class="card panel[^"]*"', 'class="card"', panel)
        base = f"https://mansejin.com/toys/{slug}/"
        html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta property="og:url" content="{base}">
  <meta property="og:title" content="{og}">
  <meta property="og:description" content="{desc}">
  <link rel="canonical" href="{base}">
  <link rel="stylesheet" href="../css/toys.css">
</head>
<body>
  <div class="file-warning" id="fileWarning">
    ⚠️ 파일로 열면 일부 기능이 안 될 수 있어요.<br>
    <strong>사파리·크롬</strong>에서 열거나, 웹에 올린 링크로 접속하세요.
  </div>
  <div class="site-top no-capture">
    <a class="site-top-link" href="../">← 장난감</a>
    <a class="site-top-link" href="../../">도구함</a>
  </div>
  <div id="shareZone" class="share-zone">
    <header id="appHeader">
      <div class="emoji-hero" id="headerEmoji">{emoji}</div>
      <h1 id="headerTitle">{heading}</h1>
      <p class="subtitle" id="headerSubtitle">{subtitle}</p>
    </header>
    {panel}
    <footer id="appFooter">
      <p id="footerLine1">{f1}</p>
      <p id="footerLine2">{f2}</p>
    </footer>
  </div>
  <div class="toast" id="toast"></div>
  <script src="../js/{js_file}"></script>
  <script>if (location.protocol === 'file:') document.getElementById('fileWarning').classList.add('show');</script>
</body>
</html>
"""
        (ROOT / "toys" / slug / "index.html").write_text(html, encoding="utf-8")

    (ROOT / "toys" / "js" / "common.js").unlink(missing_ok=True)
    print("OK")


if __name__ == "__main__":
    main()
