(function () {
  const lang = document.documentElement.lang.startsWith("en") ? "en" : "ko";
  const dataPath = document.body.dataset.tools || "data/tools.json";

  const UI = {
    ko: {
      title: "문의하기",
      subtitle: "버그·불편 사항을 알려주세요",
      category: "문의 유형",
      catSite: "사이트 오류",
      catTool: "도구 (Windows 등)",
      catToy: "장난감 (웹)",
      product: "어떤 항목인가요?",
      productSite: "전체 사이트",
      productOther: "기타 / 잘 모르겠음",
      message: "상세 내용",
      messagePlaceholder: "어떤 문제가 있었는지, 재현 방법 등을 적어주세요",
      email: "답장 받을 이메일 (선택)",
      submit: "전송",
      cancel: "취소",
      sending: "보내는 중…",
      success: "접수되었습니다. 확인 후 답변드릴게요.",
      error: "전송에 실패했습니다. 잠시 후 다시 시도해주세요.",
      required: "내용을 입력해주세요",
    },
    en: {
      title: "Contact support",
      subtitle: "Report a bug or issue",
      category: "Issue type",
      catSite: "Website issue",
      catTool: "Tool (Windows, etc.)",
      catToy: "Toy (web)",
      product: "Which item?",
      productSite: "Entire site",
      productOther: "Other / not sure",
      message: "Details",
      messagePlaceholder: "Describe the problem and how to reproduce it",
      email: "Your email for reply (optional)",
      submit: "Send",
      cancel: "Cancel",
      sending: "Sending…",
      success: "Received. We'll get back to you soon.",
      error: "Could not send. Please try again later.",
      required: "Please enter a description",
    },
  };

  const t = UI[lang];

  const TOYS = {
    ko: [
      { id: "excuse", label: "핑계 생성기" },
      { id: "hair", label: "머리 스타일" },
      { id: "poker", label: "포커" },
    ],
    en: [
      { id: "excuse", label: "Excuse generator" },
      { id: "hair", label: "Hair style" },
      { id: "poker", label: "Poker" },
    ],
  };

  let tools = [];
  let modalEl;
  let formEl;
  let productEl;
  let categoryEl;
  let submitBtn;

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function buildModal() {
    modalEl = document.createElement("div");
    modalEl.className = "bug-modal";
    modalEl.id = "bugModal";
    modalEl.hidden = true;
    modalEl.innerHTML = `
      <div class="bug-modal-backdrop" data-bug-close></div>
      <div class="bug-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="bugModalTitle">
        <button type="button" class="bug-modal-close" data-bug-close aria-label="${escapeHtml(t.cancel)}">×</button>
        <h2 id="bugModalTitle">${escapeHtml(t.title)}</h2>
        <p class="bug-modal-sub">${escapeHtml(t.subtitle)}</p>
        <form id="bugForm" class="bug-form">
          <label class="bug-field">
            <span>${escapeHtml(t.category)}</span>
            <select name="category" id="bugCategory" required>
              <option value="site">${escapeHtml(t.catSite)}</option>
              <option value="tool">${escapeHtml(t.catTool)}</option>
              <option value="toy">${escapeHtml(t.catToy)}</option>
            </select>
          </label>
          <label class="bug-field">
            <span id="bugProductLabel">${escapeHtml(t.product)}</span>
            <select name="product" id="bugProduct" required></select>
          </label>
          <label class="bug-field">
            <span>${escapeHtml(t.message)}</span>
            <textarea name="message" rows="4" required placeholder="${escapeHtml(t.messagePlaceholder)}"></textarea>
          </label>
          <label class="bug-field">
            <span>${escapeHtml(t.email)}</span>
            <input type="email" name="reply_email" autocomplete="email">
          </label>
          <div class="bug-form-actions">
            <button type="button" class="btn btn-secondary" data-bug-close>${escapeHtml(t.cancel)}</button>
            <button type="submit" class="btn btn-primary" id="bugSubmit">${escapeHtml(t.submit)}</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modalEl);

    formEl = modalEl.querySelector("#bugForm");
    productEl = modalEl.querySelector("#bugProduct");
    categoryEl = modalEl.querySelector("#bugCategory");
    submitBtn = modalEl.querySelector("#bugSubmit");

    categoryEl.addEventListener("change", updateProductOptions);
    formEl.addEventListener("submit", handleSubmit);

    modalEl.querySelectorAll("[data-bug-close]").forEach((el) => {
      el.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modalEl.hidden) closeModal();
    });
  }

  function productOptionsForCategory(category) {
    const other = { value: "other", label: t.productOther };

    if (category === "site") {
      return [{ value: "site", label: t.productSite }, other];
    }

    if (category === "tool") {
      const items = tools.map((tool) => ({
        value: tool.id || tool.name,
        label: tool.name,
      }));
      return items.length ? [...items, other] : [other];
    }

    return [...TOYS[lang], other];
  }

  function updateProductOptions() {
    const options = productOptionsForCategory(categoryEl.value);
    productEl.innerHTML = options
      .map((opt) => `<option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>`)
      .join("");
  }

  function openModal() {
    if (!modalEl) buildModal();
    updateProductOptions();
    formEl.reset();
    modalEl.hidden = false;
    document.body.classList.add("bug-modal-open");
    modalEl.querySelector("textarea").focus();
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.hidden = true;
    document.body.classList.remove("bug-modal-open");
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function categoryLabel(value) {
    if (value === "site") return t.catSite;
    if (value === "tool") return t.catTool;
    return t.catToy;
  }

  function productLabel(value) {
    const opt = productEl.selectedOptions[0];
    return opt ? opt.textContent : value;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const message = formEl.message.value.trim();
    if (!message) {
      showToast(t.required);
      return;
    }

    const category = categoryEl.value;
    const product = productEl.value;
    const replyEmail = formEl.reply_email.value.trim();
    const subject = `[mansejin] ${categoryLabel(category)} — ${productLabel(product)}`;

    const body = new FormData();
    body.append("_subject", subject);
    body.append("_captcha", "false");
    body.append("_template", "table");
    body.append("category", categoryLabel(category));
    body.append("product", productLabel(product));
    body.append("message", message);
    body.append("page", location.href);
    body.append("language", lang);
    if (replyEmail) body.append("_replyto", replyEmail);

    submitBtn.disabled = true;
    submitBtn.textContent = t.sending;

    try {
      const response = await fetch("https://formsubmit.co/ajax/sae3648@gmail.com", {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
      });
      const result = await response.json();
      if (!response.ok || result.success !== "true") throw new Error("submit failed");
      showToast(t.success);
      closeModal();
    } catch {
      showToast(t.error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = t.submit;
    }
  }

  async function loadTools() {
    try {
      const response = await fetch(dataPath);
      if (!response.ok) return;
      tools = await response.json();
    } catch {
      tools = typeof FALLBACK_TOOLS !== "undefined" ? [...FALLBACK_TOOLS] : [];
    }
  }

  document.querySelectorAll("[data-bug-report]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openModal();
    });
  });

  loadTools();
})();
