(function () {
  var stored = localStorage.getItem("mansejin-theme");
  var dark =
    stored === "dark" ||
    (stored !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
})();
