(function () {
  const lang = document.documentElement.lang.startsWith("en") ? "en" : "ko";
  const dataPath = document.body.dataset.tools || "data/tools.json";

  const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
  const MAX_FILES = 3;
  const ALLOWED_EXT = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".txt", ".log", ".json"];

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
      attachment: "첨부 파일 (선택)",
      attachmentHint: "스크린샷·로그 · 최대 3개 · 합계 5MB · png/jpg/webp/gif/txt/log/json",
      chooseFiles: "파일 선택",
      removeFile: "제거",
      submit: "전송",
      cancel: "취소",
      sending: "보내는 중…",
      success: "접수되었습니다. 확인 후 답변드릴게요.",
      error: "전송에 실패했습니다. 잠시 후 다시 시도해주세요.",
      required: "내용을 입력해주세요",
      fileType: "허용되지 않는 파일 형식입니다",
      fileTooLarge: "첨부 파일 합계는 5MB 이하여야 합니다",
      fileTooMany: "첨부 파일은 최대 3개까지 가능합니다",
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
      attachment: "Attachments (optional)",
      attachmentHint: "Screenshots, logs · up to 3 files · 5MB total · png/jpg/webp/gif/txt/log/json",
      chooseFiles: "Choose files",
      removeFile: "Remove",
      submit: "Send",
      cancel: "Cancel",
      sending: "Sending…",
      success: "Received. We'll get back to you soon.",
      error: "Could not send. Please try again later.",
      required: "Please enter a description",
      fileType: "File type not allowed",
      fileTooLarge: "Total attachment size must be 5MB or less",
      fileTooMany: "You can attach up to 3 files",
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

  const FORM_ENDPOINT = "https://formsubmit.co/sae3648@gmail.com";
  const AJAX_ENDPOINT = "https://formsubmit.co/ajax/sae3648@gmail.com";

  let tools = [];
  let modalEl;
  let formEl;
  let productEl;
  let categoryEl;
  let submitBtn;
  let fileInputEl;
  let fileListEl;
  let selectedFiles = [];
  let submittingNative = false;

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
        <form id="bugForm" class="bug-form" enctype="multipart/form-data">
          <label class="bug-field">
            <span>${escapeHtml(t.category)}</span>
            <select id="bugCategory" required>
              <option value="site">${escapeHtml(t.catSite)}</option>
              <option value="tool">${escapeHtml(t.catTool)}</option>
              <option value="toy">${escapeHtml(t.catToy)}</option>
            </select>
          </label>
          <label class="bug-field">
            <span id="bugProductLabel">${escapeHtml(t.product)}</span>
            <select id="bugProduct" required></select>
          </label>
          <label class="bug-field">
            <span>${escapeHtml(t.message)}</span>
            <textarea name="message" rows="4" required placeholder="${escapeHtml(t.messagePlaceholder)}"></textarea>
          </label>
          <div class="bug-field">
            <span>${escapeHtml(t.attachment)}</span>
            <p class="bug-field-hint">${escapeHtml(t.attachmentHint)}</p>
            <input type="file" id="bugFileInput" class="bug-file-input" multiple accept=".png,.jpg,.jpeg,.webp,.gif,.txt,.log,.json,image/png,image/jpeg,image/webp,image/gif,text/plain,application/json">
            <button type="button" class="btn btn-secondary bug-file-btn" id="bugChooseFiles">${escapeHtml(t.chooseFiles)}</button>
            <ul class="bug-file-list" id="bugFileList" hidden></ul>
          </div>
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
    fileInputEl = modalEl.querySelector("#bugFileInput");
    fileListEl = modalEl.querySelector("#bugFileList");

    categoryEl.addEventListener("change", updateProductOptions);
    formEl.addEventListener("submit", handleSubmit);
    modalEl.querySelector("#bugChooseFiles").addEventListener("click", () => fileInputEl.click());
    fileInputEl.addEventListener("change", handleFilePick);

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

  function fileExtension(name) {
    const dot = name.lastIndexOf(".");
    return dot >= 0 ? name.slice(dot).toLowerCase() : "";
  }

  function isAllowedFile(file) {
    return ALLOWED_EXT.includes(fileExtension(file.name));
  }

  function totalFileBytes(files) {
    return files.reduce((sum, file) => sum + file.size, 0);
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function renderFileList() {
    if (!selectedFiles.length) {
      fileListEl.hidden = true;
      fileListEl.innerHTML = "";
      return;
    }

    fileListEl.hidden = false;
    fileListEl.innerHTML = selectedFiles
      .map(
        (file, index) =>
          `<li class="bug-file-item">
            <span class="bug-file-name">${escapeHtml(file.name)}</span>
            <span class="bug-file-size">${escapeHtml(formatFileSize(file.size))}</span>
            <button type="button" class="bug-file-remove" data-index="${index}">${escapeHtml(t.removeFile)}</button>
          </li>`
      )
      .join("");

    fileListEl.querySelectorAll(".bug-file-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedFiles.splice(Number(btn.dataset.index), 1);
        renderFileList();
      });
    });
  }

  function resetFiles() {
    selectedFiles = [];
    if (fileInputEl) fileInputEl.value = "";
    renderFileList();
  }

  function handleFilePick() {
    const picked = [...fileInputEl.files];
    fileInputEl.value = "";

    if (!picked.length) return;

    const merged = [...selectedFiles];
    for (const file of picked) {
      if (!isAllowedFile(file)) {
        showToast(t.fileType);
        return;
      }
      merged.push(file);
    }

    if (merged.length > MAX_FILES) {
      showToast(t.fileTooMany);
      return;
    }

    if (totalFileBytes(merged) > MAX_TOTAL_BYTES) {
      showToast(t.fileTooLarge);
      return;
    }

    selectedFiles = merged;
    renderFileList();
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
    resetFiles();
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

  function ensureHidden(name, value) {
    let el = formEl.querySelector(`input[type="hidden"][data-bug-hidden="${name}"]`);
    if (!el) {
      el = document.createElement("input");
      el.type = "hidden";
      el.dataset.bugHidden = name;
      el.name = name;
      formEl.appendChild(el);
    }
    el.value = value;
    return el;
  }

  function clearDynamicFileInputs() {
    formEl.querySelectorAll("[data-bug-file-input]").forEach((el) => el.remove());
  }

  function syncFilesToForm() {
    clearDynamicFileInputs();
    for (const file of selectedFiles) {
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.createElement("input");
      input.type = "file";
      input.name = "attachment";
      input.dataset.bugFileInput = "1";
      input.hidden = true;
      input.files = dt.files;
      formEl.appendChild(input);
    }
  }

  function prepareHiddenFields(subject, category, product, replyEmail) {
    ensureHidden("_subject", subject);
    ensureHidden("_captcha", "false");
    ensureHidden("_template", "table");
    ensureHidden("category", categoryLabel(category));
    ensureHidden("product", productLabel(product));
    ensureHidden("page", location.href);
    ensureHidden("language", lang);
    const replyHidden = formEl.querySelector('[data-bug-hidden="_replyto"]');
    if (replyEmail) {
      ensureHidden("_replyto", replyEmail);
    } else if (replyHidden) {
      replyHidden.remove();
    }
  }

  function resetFormTransport() {
    formEl.removeAttribute("action");
    formEl.removeAttribute("target");
    clearDynamicFileInputs();
  }

  function getSubmitFrame() {
    let iframe = document.getElementById("bugSubmitFrame");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "bugSubmitFrame";
      iframe.name = "bugSubmitFrame";
      iframe.className = "bug-submit-frame";
      iframe.title = "";
      iframe.hidden = true;
      document.body.appendChild(iframe);
    }
    return iframe;
  }

  function submitViaFormPost() {
    return new Promise((resolve, reject) => {
      const iframe = getSubmitFrame();
      const timeout = setTimeout(() => {
        iframe.onload = null;
        reject(new Error("timeout"));
      }, 45000);

      iframe.onload = () => {
        clearTimeout(timeout);
        iframe.onload = null;
        resolve();
      };

      formEl.action = FORM_ENDPOINT;
      formEl.method = "POST";
      formEl.target = "bugSubmitFrame";
      formEl.submit();
    });
  }

  async function submitViaAjax(subject, category, product, message, replyEmail) {
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

    const response = await fetch(AJAX_ENDPOINT, {
      method: "POST",
      body,
      headers: { Accept: "application/json" },
    });
    const result = await response.json();
    const ok =
      response.ok &&
      result &&
      (result.success === true || result.success === "true");
    if (!ok) throw new Error("submit failed");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingNative) return;

    const message = formEl.message.value.trim();
    if (!message) {
      showToast(t.required);
      return;
    }

    if (selectedFiles.length > MAX_FILES) {
      showToast(t.fileTooMany);
      return;
    }

    if (totalFileBytes(selectedFiles) > MAX_TOTAL_BYTES) {
      showToast(t.fileTooLarge);
      return;
    }

    const category = categoryEl.value;
    const product = productEl.value;
    const replyEmail = formEl.reply_email.value.trim();
    const subject = `[mansejin] ${categoryLabel(category)} — ${productLabel(product)}`;

    submitBtn.disabled = true;
    submitBtn.textContent = t.sending;

    try {
      if (selectedFiles.length > 0) {
        submittingNative = true;
        prepareHiddenFields(subject, category, product, replyEmail);
        syncFilesToForm();
        await submitViaFormPost();
      } else {
        await submitViaAjax(subject, category, product, message, replyEmail);
      }
      showToast(t.success);
      closeModal();
    } catch {
      showToast(t.error);
    } finally {
      resetFormTransport();
      submittingNative = false;
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
