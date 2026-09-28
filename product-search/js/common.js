(function () {
  "use strict";

  var CONFIG = window.PRODUCT_SEARCH_CONFIG || {};
  var KEYS = {
    endpoint: "ps-endpoint",
    viewKey: "ps-view-key",
    cache: "ps-results-cache",
    password: "ps-admin-password",
  };

  function read(key) {
    try {
      return localStorage.getItem(key) || "";
    } catch (_) {
      return "";
    }
  }

  function write(key, value) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch (_) {}
  }

  function endpoint() {
    return read(KEYS.endpoint) || CONFIG.endpoint || "";
  }

  function isEndpoint(url) {
    return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(String(url || "").trim());
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(url) {
    return /^https:\/\//.test(String(url || "")) ? String(url) : "#";
  }

  function getJson(params) {
    var url = endpoint();
    var query = Object.keys(params)
      .filter(function (k) { return params[k]; })
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); })
      .join("&");
    return fetch(url + (query ? "?" + query : "")).then(parse);
  }

  function postJson(body) {
    return fetch(endpoint(), {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    }).then(parse);
  }

  function parse(response) {
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.json().then(function (data) {
      if (!data || !data.ok) {
        var err = new Error((data && data.error) || "알 수 없는 오류");
        err.unauthorized = err.message === "Unauthorized";
        throw err;
      }
      return data;
    }, function () {
      throw new Error("응답을 읽지 못했어요. 웹 앱 배포 액세스가 '모든 사용자'인지 확인하세요.");
    });
  }

  function formatDate(value) {
    if (!value) return "";
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    var pad = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function timeAgo(value) {
    var d = new Date(value);
    if (!value || isNaN(d.getTime())) return "";
    var minutes = Math.round((Date.now() - d.getTime()) / 60000);
    if (minutes < 1) return "방금";
    if (minutes < 60) return minutes + "분 전";
    var hours = Math.round(minutes / 60);
    if (hours < 24) return hours + "시간 전";
    var days = Math.round(hours / 24);
    return days < 30 ? days + "일 전" : "";
  }

  var toastTimer;
  function toast(message) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2400);
  }

  window.PS = {
    KEYS: KEYS,
    read: read,
    write: write,
    endpoint: endpoint,
    configEndpoint: CONFIG.endpoint || "",
    isEndpoint: isEndpoint,
    escapeHtml: escapeHtml,
    safeUrl: safeUrl,
    getJson: getJson,
    postJson: postJson,
    formatDate: formatDate,
    timeAgo: timeAgo,
    toast: toast,
  };
})();
