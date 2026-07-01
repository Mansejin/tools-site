(function () {
  const STORAGE = "mansejin-theme";
  const btn = document.getElementById("themeToggle");
  const lang = document.documentElement.lang.startsWith("en") ? "en" : "ko";
  const labels = {
    ko: { light: "라이트 모드로 전환", dark: "다크 모드로 전환" },
    en: { light: "Switch to light mode", dark: "Switch to dark mode" },
  };
  const t = labels[lang];

  function isDark() {
    return document.documentElement.dataset.theme === "dark";
  }

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE, theme);
    syncButton();
  }

  function syncButton() {
    if (!btn) return;
    const dark = isDark();
    btn.setAttribute("aria-pressed", dark ? "true" : "false");
    btn.setAttribute("aria-label", dark ? t.light : t.dark);
    btn.textContent = dark ? "☀️" : "🌙";
  }

  if (btn) {
    btn.addEventListener("click", () => apply(isDark() ? "light" : "dark"));
    syncButton();
  }
})();
