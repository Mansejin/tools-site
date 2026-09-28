(function () {
  "use strict";

  var API = "/product-search/api";
  var KEYS = {
    password: "ps-password",
    cache: "ps-data-cache",
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

  function getPassword() {
    try {
      return sessionStorage.getItem(KEYS.password) || read(KEYS.password);
    } catch (_) {
      return read(KEYS.password);
    }
  }

  function setPassword(value, remember) {
    try {
      sessionStorage.setItem(KEYS.password, value);
    } catch (_) {}
    write(KEYS.password, remember ? value : "");
  }

  function clearPassword() {
    try {
      sessionStorage.removeItem(KEYS.password);
    } catch (_) {}
    write(KEYS.password, "");
    write(KEYS.cache, "");
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
    return /^https?:\/\//.test(String(url || "")) ? String(url) : "#";
  }

  function api(method, path, body) {
    var options = {
      method: method,
      headers: { Authorization: "Bearer " + getPassword() },
    };
    if (body !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
    return fetch(API + path, options).then(function (response) {
      return response.json().then(
        function (data) {
          if (!data || !data.ok) {
            var err = new Error((data && data.error) || "HTTP " + response.status);
            err.unauthorized = response.status === 401;
            throw err;
          }
          return data;
        },
        function () {
          throw new Error("서버 응답을 읽지 못했어요 (HTTP " + response.status + ")");
        }
      );
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
    getPassword: getPassword,
    setPassword: setPassword,
    clearPassword: clearPassword,
    escapeHtml: escapeHtml,
    safeUrl: safeUrl,
    api: api,
    formatDate: formatDate,
    timeAgo: timeAgo,
    toast: toast,
  };
})();
