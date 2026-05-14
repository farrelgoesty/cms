document.addEventListener("DOMContentLoaded", () => {
  const root = document.documentElement;
  const csrfToken = window.CMS_CSRF_TOKEN || "";
  const mediaLimitMb = Number(window.CMS_MEDIA_LIMIT_MB) || 5;
  const mediaLimitBytes = mediaLimitMb * 1024 * 1024;
  const youtubeDefaultLabel = window.CMS_YOUTUBE_DEFAULT_LABEL || "Video Pendukung";
  const slugifyText = (value) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const escapeSelectorValue = (value) => String(value ?? "").replace(/["\\]/g, "\\$&");
  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  };
  const swalDefaultTitleMap = {
    success: "Berhasil!",
    warning: "Perhatian!",
    error: "Gagal!",
    info: "Informasi!"
  };
  const swalQueue = (() => {
    let chain = Promise.resolve();
    return (task) => {
      chain = chain.then(task).catch(() => {});
      return chain;
    };
  })();
  const pendingNoticeKey = "cms.pendingNotices";
  const draftStoragePrefix = "cms.formDraft";
  const pendingDraftClearKey = "cms.formDraft.pendingClear";
  const getSwal = () => (window.Swal && typeof window.Swal.fire === "function" ? window.Swal : null);
  const fireSwal = (options = {}) => {
    const swal = getSwal();
    const payload = {
      confirmButtonText: "Tutup",
      buttonsStyling: false,
      reverseButtons: true,
      allowOutsideClick: true,
      allowEscapeKey: true,
      customClass: {
        popup: "rounded-[1.5rem] border border-[color:var(--wp-border)] bg-[color:var(--wp-surface)] text-left shadow-[0_24px_72px_rgba(15,23,42,0.18)]",
        title: "text-xl font-semibold tracking-tight text-slate-950 dark:text-white",
        htmlContainer: "text-sm leading-6 text-slate-600 dark:text-slate-300",
        confirmButton: "wp-btn wp-btn-primary",
        cancelButton: "wp-btn wp-btn-secondary"
      },
      ...options
    };

    if (swal) {
      return swal.fire(payload);
    }

    const fallbackTitle = String(payload.title || payload.text || "").trim();
    if (fallbackTitle) {
      window.alert(fallbackTitle);
    }

    return Promise.resolve({ isConfirmed: true, isDismissed: false });
  };
  const showSwalNotice = (message, type = "info", title = "") => {
    const text = String(message ?? "").trim();
    if (!text) {
      return Promise.resolve();
    }

    const resolvedType = swalDefaultTitleMap[type] ? type : "info";
    return swalQueue(() =>
      fireSwal({
        title: String(title ?? "").trim() || swalDefaultTitleMap[resolvedType],
        text,
        icon: resolvedType,
        confirmButtonColor: resolvedType === "error" ? "#dc2626" : resolvedType === "warning" ? "#d97706" : "#2271b1",
        cancelButtonColor: "#64748b",
        showCancelButton: false,
        showConfirmButton: true
      })
    );
  };
  const isCrudForm = (form) => form instanceof HTMLFormElement && form.hasAttribute("data-crud-form");
  const readPendingNotices = () => {
    try {
      const raw = sessionStorage.getItem(pendingNoticeKey);
      if (!raw) {
        return [];
      }

      sessionStorage.removeItem(pendingNoticeKey);
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const queueNotice = (message, type = "info") => {
    const entry = {
      message: String(message ?? "").trim(),
      type: swalDefaultTitleMap[type] ? type : "info"
    };

    if (!entry.message) {
      return;
    }

    try {
      const current = readPendingNotices();
      current.push(entry);
      sessionStorage.setItem(pendingNoticeKey, JSON.stringify(current));
    } catch {
      void showSwalNotice(entry.message, entry.type);
    }
  };
  root.classList.remove("dark");
  root.style.colorScheme = "light";
  const getFormDraftKey = (form) => {
    if (!(form instanceof HTMLFormElement)) {
      return "";
    }

    let actionPath = window.location.pathname;
    try {
      const action = form.getAttribute("action") || window.location.href;
      actionPath = new URL(action, window.location.href).pathname;
    } catch {}

    return `${draftStoragePrefix}:${window.location.pathname}:${actionPath}`;
  };
  const readFormDraft = (form) => {
    const key = getFormDraftKey(form);
    if (!key) {
      return null;
    }

    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  };
  const writeFormDraft = (form, payload) => {
    const key = getFormDraftKey(form);
    if (!key) {
      return;
    }

    try {
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {}
  };
  const collectFormDraft = (form) => {
    const inputs = Array.from(form.elements);
    const values = {};
    const checks = {};

    inputs.forEach((element) => {
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
        return;
      }

      const name = String(element.name || "").trim();
      if (!name || element.disabled) {
        return;
      }

      if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
        if (!checks[name]) {
          checks[name] = [];
        }
        if (element.checked) {
          checks[name].push(element.value);
        }
        return;
      }

      if (element instanceof HTMLSelectElement && element.multiple) {
        values[name] = Array.from(element.selectedOptions).map((option) => option.value);
        return;
      }

      values[name] = element.value;
    });

    return {
      values,
      checks,
      savedAt: Date.now()
    };
  };
  const restoreFormDraft = (form) => {
    const draft = readFormDraft(form);
    if (!draft) {
      return;
    }

    const values = draft.values && typeof draft.values === "object" ? draft.values : {};
    const checks = draft.checks && typeof draft.checks === "object" ? draft.checks : {};

    Object.entries(values).forEach(([name, value]) => {
      const controls = Array.from(form.querySelectorAll(`[name="${escapeSelectorValue(name)}"]`));
      controls.forEach((control) => {
        if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement)) {
          return;
        }

        if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
          return;
        }

        if (control instanceof HTMLSelectElement && control.multiple && Array.isArray(value)) {
          Array.from(control.options).forEach((option) => {
            option.selected = value.includes(option.value);
          });
          return;
        }

        const current = String(control.value ?? "").trim();
        if (!current) {
          control.value = String(value ?? "");
        }
      });
    });

    Object.entries(checks).forEach(([name, checkedValues]) => {
      const valuesList = Array.isArray(checkedValues) ? checkedValues.map((item) => String(item)) : [];
      const controls = Array.from(form.querySelectorAll(`input[name="${escapeSelectorValue(name)}"]`));
      controls.forEach((control) => {
        if (!(control instanceof HTMLInputElement)) {
          return;
        }

        if (control.type !== "checkbox" && control.type !== "radio") {
          return;
        }

        control.checked = valuesList.includes(control.value);
      });
    });

    const contentField = form.querySelector("#content");
    if (contentField instanceof HTMLTextAreaElement && typeof window.tinymce?.get === "function") {
      const editor = window.tinymce.get("content");
      if (editor && typeof editor.setContent === "function") {
        editor.setContent(contentField.value);
      }
    }
  };
  const bindFormDraftPersistence = () => {
    document.querySelectorAll("form[data-crud-form]").forEach((form) => {
      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      restoreFormDraft(form);

      const saveDraft = () => {
        const key = getFormDraftKey(form);
        if (key) {
          sessionStorage.setItem(pendingDraftClearKey, key);
        }
        writeFormDraft(form, collectFormDraft(form));
      };
      form.addEventListener("input", saveDraft);
      form.addEventListener("change", saveDraft);
      form.addEventListener("submit", saveDraft, true);
    });

    const contentField = document.getElementById("content");
    if (contentField instanceof HTMLTextAreaElement) {
      const form = contentField.closest("form[data-crud-form]");
      if (form instanceof HTMLFormElement) {
        const saveDraft = () => writeFormDraft(form, collectFormDraft(form));
        window.addEventListener("cms:content-draft-change", saveDraft);
      }
    }

    const pendingDraftKey = sessionStorage.getItem(pendingDraftClearKey) || "";
    if (pendingDraftKey) {
      const hasSuccessNotice = Array.isArray(window.CMS_INITIAL_NOTICES)
        && window.CMS_INITIAL_NOTICES.some((item) => String(item?.type || "").toLowerCase() === "success");
      const hasFormErrors = Boolean(document.querySelector("[data-form-errors]"));

      if (hasSuccessNotice) {
        const keysToRemove = [];
        for (let index = 0; index < sessionStorage.length; index += 1) {
          const key = sessionStorage.key(index);
          if (key && key.startsWith(draftStoragePrefix)) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach((key) => sessionStorage.removeItem(key));
        sessionStorage.removeItem(pendingDraftClearKey);
      } else if (hasFormErrors) {
        sessionStorage.removeItem(pendingDraftClearKey);
      }
    }
  };
  const initialNotices = Array.isArray(window.CMS_INITIAL_NOTICES) ? window.CMS_INITIAL_NOTICES : [];
  const pendingNotices = readPendingNotices();
  const allNotices = [...pendingNotices, ...initialNotices];
  if (allNotices.length) {
    void (async () => {
      for (const item of allNotices) {
        if (item && typeof item.message === "string") {
          await showSwalNotice(item.message, item.type || "info");
        }
      }
    })();

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("notice");
      url.searchParams.delete("noticeType");
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    } catch {}
  }
  window.CMS_NOTIFY = {
    success: (message, title = "") => showSwalNotice(message, "success", title),
    warning: (message, title = "") => showSwalNotice(message, "warning", title),
    error: (message, title = "") => showSwalNotice(message, "error", title),
    info: (message, title = "") => showSwalNotice(message, "info", title),
    queue: queueNotice
  };
  const resolveActionLabel = (form, submitter) => {
    const submitLabel = (() => {
      if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
        const value = String(submitter.value ?? submitter.textContent ?? "").trim();
        if (value) {
          return value;
        }
      }

      return "";
    })();

    if (submitLabel) {
      return submitLabel;
    }

    const action = typeof form.getAttribute("action") === "string" ? form.getAttribute("action") : "";
    if (!action) {
      return "aksi";
    }

    try {
      const pathname = new URL(action, window.location.href).pathname;
      const friendly = pathname
        .replace(/^\/admin\/?/, "")
        .replace(/\/+/g, " ")
        .replace(/[-_]+/g, " ")
        .replace(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi, "")
        .replace(/\b[0-9a-f]{12,}\b/gi, "")
        .trim();
      return friendly || "aksi";
    } catch {
      return "aksi";
    }
  };
  const getActionPath = (form) => {
    if (!(form instanceof HTMLFormElement)) {
      return "";
    }

    const action = typeof form.getAttribute("action") === "string" ? form.getAttribute("action") : "";
    if (!action) {
      return "";
    }

    try {
      return new URL(action, window.location.href).pathname.toLowerCase();
    } catch {
      return action.toLowerCase();
    }
  };
  const readConfirmOverrides = (element) => {
    if (!(element instanceof HTMLElement)) {
      return {};
    }

    const title = String(element.getAttribute("data-confirm-title") || "").trim();
    const message = String(element.getAttribute("data-confirm-message") || "").trim();
    const proceedLabel = String(element.getAttribute("data-confirm-proceed") || "").trim();
    const destructive = String(element.getAttribute("data-confirm-destructive") || "").toLowerCase();

    return {
      title,
      message,
      proceedLabel,
      destructive: destructive === "true" || destructive === "1"
    };
  };
  const resolveEntityLabel = ({ form = null, linkLabel = "", linkHref = "" } = {}) => {
    const path = getActionPath(form) || (() => {
      if (!linkHref) {
        return "";
      }

      try {
        return new URL(linkHref, window.location.href).pathname.toLowerCase();
      } catch {
        return String(linkHref).toLowerCase();
      }
    })();

    const normalizedPath = path.replace(/^\/admin\/?/, "");
    const normalizedLabel = String(linkLabel || (form instanceof HTMLFormElement ? resolveActionLabel(form, null) : "")).toLowerCase();

    if (normalizedPath.startsWith("posts")) {
      return "post ini";
    }

    if (normalizedPath.startsWith("categories")) {
      return "kategori ini";
    }

    if (normalizedPath.startsWith("comments")) {
      return "komentar ini";
    }

    if (normalizedPath.startsWith("media")) {
      return "file ini";
    }

    if (/post/.test(normalizedLabel)) {
      return "post ini";
    }

    if (/kategori|category/.test(normalizedLabel)) {
      return "kategori ini";
    }

    if (/komentar|comment/.test(normalizedLabel)) {
      return "komentar ini";
    }

    if (/media|file|unggah|upload/.test(normalizedLabel)) {
      return "file ini";
    }

    return "item ini";
  };
  const resolveConfirmCopy = ({ form = null, submitter = null, linkLabel = "", linkHref = "", sourceElement = null } = {}) => {
    const label = String(linkLabel || (form instanceof HTMLFormElement ? resolveActionLabel(form, submitter) : "aksi")).trim();
    const path = getActionPath(form);
    const actionRaw = String(form instanceof HTMLFormElement ? form.getAttribute("action") || "" : "").toLowerCase();
    const normalizedLabel = label.toLowerCase();
    const isDelete = /delete|hapus|remove/.test(normalizedLabel) || /delete|hapus|remove/.test(path);
    const isPublish = /publish|terbit/.test(normalizedLabel) || /publish|terbit/.test(path);
    const isDraft = /draft|arsip/.test(normalizedLabel) || /draft|arsip/.test(path);
    const isApprove = /approve|setujui/.test(normalizedLabel) || /approve|setujui/.test(path);
    const isReject = /reject|spam|tolak/.test(normalizedLabel) || /reject|spam|tolak/.test(path);
    const isUpload = /upload|unggah/.test(normalizedLabel) || /upload|unggah/.test(path);
    const isPostForm = path.startsWith("/admin/posts");
    const isEditPost = isPostForm && /_method=put/.test(actionRaw);
    const isCreatePost = isPostForm && !isEditPost && !isDelete && !isPublish && !isDraft;
    const isEditLike = /edit|update|perbarui/.test(normalizedLabel) || /_method=put/.test(actionRaw);
    const isSaveLike = /save|simpan|update|perbarui|add|tambah|buat|create/.test(normalizedLabel);
    const entity = resolveEntityLabel({ form, linkLabel: label, linkHref });
    const overrides = readConfirmOverrides(sourceElement);

    const applyOverrides = (copy) => ({
      title: overrides.title || copy.title,
      message: overrides.message || copy.message,
      proceedLabel: overrides.proceedLabel || copy.proceedLabel,
      destructive: typeof overrides.destructive === "boolean" ? overrides.destructive : copy.destructive
    });

    if (linkHref && isDelete) {
      return applyOverrides({
        title: "Konfirmasi penghapusan",
        message: `Apakah Anda yakin untuk menghapus ${entity}?`,
        proceedLabel: `Ya, hapus ${entity}`,
        destructive: true
      });
    }

    if (isEditPost) {
      return applyOverrides({
        title: "Konfirmasi edit",
        message: "Apakah Anda yakin untuk mengedit post ini?",
        proceedLabel: "Ya, edit post ini",
        destructive: false
      });
    }

    if (isCreatePost) {
      return applyOverrides({
        title: "Konfirmasi simpan",
        message: "Apakah Anda yakin untuk membuat post ini?",
        proceedLabel: "Ya, buat post ini",
        destructive: false
      });
    }

    if (isPublish) {
      return applyOverrides({
        title: "Konfirmasi publikasi",
        message: entity === "post ini" ? "Apakah Anda yakin untuk mempublikasikan post ini?" : `Apakah Anda yakin untuk mempublikasikan ${entity}?`,
        proceedLabel: entity === "post ini" ? "Ya, publikasikan post ini" : `Ya, publikasikan ${entity}`,
        destructive: false
      });
    }

    if (isDraft) {
      return applyOverrides({
        title: "Konfirmasi draft",
        message: entity === "post ini" ? "Apakah Anda yakin untuk mengubah post ini menjadi draft?" : `Apakah Anda yakin untuk mengubah ${entity} menjadi draft?`,
        proceedLabel: entity === "post ini" ? "Ya, ubah post ini ke draft" : `Ya, ubah ${entity} ke draft`,
        destructive: false
      });
    }

    if (isApprove) {
      return applyOverrides({
        title: "Konfirmasi persetujuan",
        message: `Apakah Anda yakin untuk menyetujui ${entity}?`,
        proceedLabel: `Ya, setujui ${entity}`,
        destructive: false
      });
    }

    if (isReject) {
      return applyOverrides({
        title: "Konfirmasi penolakan",
        message: `Apakah Anda yakin untuk menolak ${entity}?`,
        proceedLabel: `Ya, tolak ${entity}`,
        destructive: true
      });
    }

    if (isUpload) {
      return applyOverrides({
        title: "Konfirmasi unggah",
        message: `Apakah Anda yakin untuk mengunggah ${entity}?`,
        proceedLabel: `Ya, unggah ${entity}`,
        destructive: false
      });
    }

    if (isDelete || /hapus|delete|remove/.test(normalizedLabel)) {
      return applyOverrides({
        title: "Konfirmasi penghapusan",
        message: `Apakah Anda yakin untuk menghapus ${entity}?`,
        proceedLabel: `Ya, hapus ${entity}`,
        destructive: true
      });
    }

    if (isEditLike || isSaveLike) {
      return applyOverrides(
        isEditLike
          ? {
              title: "Konfirmasi edit",
              message: `Apakah Anda yakin untuk mengedit ${entity}?`,
              proceedLabel: `Ya, edit ${entity}`,
              destructive: false
            }
          : {
              title: "Konfirmasi simpan",
              message: `Apakah Anda yakin untuk menyimpan ${entity}?`,
              proceedLabel: `Ya, simpan ${entity}`,
              destructive: false
            }
      );
    }

    return applyOverrides({
      title: "Konfirmasi aksi",
      message: `Apakah Anda yakin untuk melanjutkan ${entity}?`,
      proceedLabel: "Ya, lanjutkan",
      destructive: false
    });
  };
  const openConfirmDialog = async ({ form = null, submitter = null, linkHref = "", linkLabel = "", sourceElement = null } = {}) => {
    if (!(form instanceof HTMLFormElement) && !linkHref) {
      return;
    }

    const actionLabel = linkLabel || (form instanceof HTMLFormElement ? resolveActionLabel(form, submitter) : "aksi");
    const copy = resolveConfirmCopy({ form, submitter, linkLabel: actionLabel, linkHref, sourceElement });
    const result = await fireSwal({
      title: copy.title,
      text: copy.message,
      icon: copy.destructive ? "warning" : "question",
      showCancelButton: true,
      confirmButtonText: copy.proceedLabel,
      cancelButtonText: "Batal",
      confirmButtonColor: copy.destructive ? "#dc2626" : "#2271b1",
      cancelButtonColor: "#64748b",
      allowOutsideClick: false,
      allowEscapeKey: true,
      focusCancel: true
    });

    if (!result.isConfirmed) {
      return;
    }

    if (!(form instanceof HTMLFormElement)) {
      if (linkHref) {
        window.location.href = linkHref;
      }
      return;
    }

    form.dataset.crudConfirmed = "true";
    const submitButton = submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement ? submitter : null;
    try {
      if (typeof form.requestSubmit === "function") {
        if (submitButton && submitButton.isConnected && submitButton.form === form) {
          form.requestSubmit(submitButton);
        } else {
          form.requestSubmit();
        }
      } else {
        form.submit();
      }
    } catch {
      form.submit();
    }
  };
  const parseYoutubeUrl = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const url = new URL(trimmed);
      const host = url.hostname.replace(/^www\./i, "").toLowerCase();
      let videoId = "";

      if (host === "youtu.be") {
        videoId = url.pathname.split("/").filter(Boolean)[0] || "";
      } else if (host.endsWith("youtube.com")) {
        if (url.pathname === "/watch") {
          videoId = url.searchParams.get("v") || "";
        } else {
          const match = url.pathname.match(/^\/(embed|shorts|live|v)\/([^/]+)/);
          videoId = match?.[2] || "";
        }
      }

      if (!videoId) {
        return null;
      }

      return {
        videoId,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`
      };
    } catch {
      return null;
    }
  };
  const mediaMimeGroups = {
    image: new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]),
    video: new Set(["video/mp4", "video/webm", "video/quicktime"]),
    document: new Set(["application/pdf"])
  };
  const mediaExtGroups = {
    image: new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]),
    video: new Set([".mp4", ".webm", ".mov"]),
    document: new Set([".pdf"])
  };
  const getFileKind = (file) => {
    const mime = file.type || "";
    const ext = file.name.includes(".") ? `.${file.name.split(".").pop().toLowerCase()}` : "";

    if (mediaMimeGroups.image.has(mime) && mediaExtGroups.image.has(ext)) {
      return "image";
    }

    if (mediaMimeGroups.video.has(mime) && mediaExtGroups.video.has(ext)) {
      return "video";
    }

    if (mediaMimeGroups.document.has(mime) && mediaExtGroups.document.has(ext)) {
      return "document";
    }

    return "other";
  };

  const validateMediaFile = (file, { imageOnly = false } = {}) => {
    if (!(file instanceof File)) {
      throw new Error("File tidak valid.");
    }

    if (file.size > mediaLimitBytes) {
      throw new Error(`Ukuran file maksimal ${mediaLimitMb} MB.`);
    }

    const kind = getFileKind(file);
    if (imageOnly && kind !== "image") {
      throw new Error("Hanya file gambar yang diperbolehkan untuk featured image.");
    }

    if (!imageOnly && kind === "other") {
      throw new Error("Format file tidak didukung. Gunakan image, video, atau PDF yang valid.");
    }

    return kind;
  };

  const normalizeLinkUrl = (value) => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) {
      return "";
    }

    if (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(trimmed)) {
      return trimmed;
    }

    if (/\s/.test(trimmed)) {
      return "";
    }

    return `https://${trimmed}`;
  };

  const promptForImageLinkUrl = (fileName = "gambar") => {
    const value = window.prompt(
      `Masukkan URL tujuan untuk ${fileName}. Kosongkan jika gambar tidak perlu link.`,
      ""
    );

    if (value === null) {
      return null;
    }

    const normalized = normalizeLinkUrl(value);
    return normalized || null;
  };

  const buildMediaInsertHtml = (media) => {
    const filePath = media.filePath || media.location || "";
    const previewUrl = media.previewUrl || filePath;
    const fileName = media.fileName || "file";
    const altText = media.altText || fileName;
    const kind = media.kind || getFileKind({ type: media.mimeType || "", name: fileName });
    const linkUrl = normalizeLinkUrl(media.linkUrl || "");

    if (kind === "image") {
      const imageHtml = `<img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(altText)}" loading="lazy" decoding="async" />`;
      return linkUrl
        ? `<figure class="media-figure"><a href="${escapeHtml(linkUrl)}" rel="noopener noreferrer">${imageHtml}</a></figure>`
        : `<figure class="media-figure">${imageHtml}</figure>`;
    }

    if (kind === "video") {
      return `<figure class="media-figure"><video controls playsinline preload="metadata" src="${escapeHtml(filePath)}" title="${escapeHtml(fileName)}"></video><figcaption>${escapeHtml(fileName)}</figcaption></figure>`;
    }

    if (kind === "document") {
      return `<p><a href="${escapeHtml(filePath)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fileName)}</a></p>`;
    }

    return `<p><a href="${escapeHtml(filePath)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fileName)}</a></p>`;
  };

  const setTextareaValue = (value) => {
    const textarea = document.getElementById("content");
    if (textarea instanceof HTMLTextAreaElement) {
      const current = textarea.value.trim();
      textarea.value = current ? `${textarea.value}\n${value}` : value;
    }
  };

  const insertIntoContent = (html) => {
    const editor = window.tinymce?.get("content");
    if (editor) {
      editor.focus();
      editor.insertContent(html);
      return;
    }

    setTextareaValue(html);
  };

  const uploadMediaFile = async (file, { imageOnly = false } = {}) => {
    validateMediaFile(file, { imageOnly });

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/admin/media/upload", {
      method: "POST",
      body: formData,
      headers: {
        "x-csrf-token": csrfToken
      },
      credentials: "same-origin"
    });

    if (!response.ok) {
      const raw = await response.text();
      let message = raw || "Upload failed";
      try {
        const parsed = JSON.parse(raw);
        message = parsed.error || message;
      } catch {}
      throw new Error(message);
    }

    const result = await response.json();
    if (!result?.location) {
      throw new Error("Invalid upload response");
    }

    return result;
  };

  const createLocalPreviewMarkup = (file, objectUrl) => {
    const kind = getFileKind(file);
    if (kind === "image") {
      return `
        <div class="space-y-3">
          <img src="${escapeHtml(objectUrl)}" alt="${escapeHtml(file.name)}" class="max-h-64 w-full rounded-2xl object-cover" />
          <div class="text-xs text-slate-500">${escapeHtml(file.name)} · ${formatBytes(file.size)}</div>
        </div>
      `;
    }

    if (kind === "video") {
      return `
        <div class="space-y-3">
          <video class="max-h-64 w-full rounded-2xl bg-black" src="${escapeHtml(objectUrl)}" controls preload="metadata"></video>
          <div class="text-xs text-slate-500">${escapeHtml(file.name)} · ${formatBytes(file.size)}</div>
        </div>
      `;
    }

    if (kind === "document") {
      return `
        <div class="flex items-center gap-4 rounded-2xl border border-[color:var(--wp-border)] bg-[color:var(--wp-surface)] p-4">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200">
            <svg aria-hidden="true" class="h-7 w-7" viewBox="0 0 24 24" fill="none">
              <path d="M7 3.5h7l5 5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" />
              <path d="M14 3.5V9h5" stroke="currentColor" stroke-width="1.6" />
              <path d="M8.5 13h7M8.5 16h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </div>
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold text-slate-900 dark:text-white">${escapeHtml(file.name)}</div>
            <div class="text-xs text-slate-500">${formatBytes(file.size)}</div>
            <div class="mt-2 text-xs text-slate-500">PDF preview tersedia sebagai link insert.</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="flex items-center gap-4 rounded-2xl border border-[color:var(--wp-border)] bg-[color:var(--wp-surface)] p-4">
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          <svg aria-hidden="true" class="h-7 w-7" viewBox="0 0 24 24" fill="none">
            <path d="M7 3.5h7l5 5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" />
            <path d="M14 3.5V9h5" stroke="currentColor" stroke-width="1.6" />
          </svg>
        </div>
        <div class="min-w-0">
          <div class="truncate text-sm font-semibold text-slate-900 dark:text-white">${escapeHtml(file.name)}</div>
          <div class="text-xs text-slate-500">${formatBytes(file.size)}</div>
        </div>
      </div>
    `;
  };

  const createUploadPreviewMarkup = (file, objectUrl) => {
    return `
      <div class="space-y-3">
        ${createLocalPreviewMarkup(file, objectUrl)}
        <div class="text-xs text-slate-500">Preview lokal aktif. File akan divalidasi sebelum upload.</div>
      </div>
    `;
  };

  const setImageFieldPreview = (field, url, previewSelector, placeholderSelector) => {
    const preview = field.querySelector(previewSelector);
    const placeholder = field.querySelector(placeholderSelector);

    if (preview instanceof HTMLImageElement) {
      if (url) {
        preview.src = url;
        preview.classList.remove("hidden");
      } else {
        preview.removeAttribute("src");
        preview.classList.add("hidden");
      }
    }

    if (placeholder instanceof HTMLElement) {
      placeholder.classList.toggle("hidden", Boolean(url));
    }
  };

  const setupImageField = ({
    fieldSelector,
    fileInputSelector,
    inputSelector,
    pickSelector,
    removeSelector,
    dropzoneSelector,
    previewSelector,
    placeholderSelector,
    successMessage
  }) => {
    document.querySelectorAll(fieldSelector).forEach((field) => {
      const input = field.querySelector(inputSelector);
      const fileInput = field.querySelector(fileInputSelector);
      const pickButton = field.querySelector(pickSelector);
      const removeButton = field.querySelector(removeSelector);
      const dropzone = field.querySelector(dropzoneSelector);

      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      const updatePreview = (value) => {
        setImageFieldPreview(field, value, previewSelector, placeholderSelector);
      };

      const triggerUpload = async (file) => {
        if (!(file instanceof File)) {
          return;
        }

        validateMediaFile(file, { imageOnly: true });

        const localPreviewUrl = URL.createObjectURL(file);
        updatePreview(localPreviewUrl);

        try {
          const result = await uploadMediaFile(file, { imageOnly: true });
          input.value = result.location;
          updatePreview(result.preview || result.location);
          window.CMS_NOTIFY?.success(successMessage);
        } catch (error) {
          input.value = input.value || "";
          updatePreview(input.value.trim());
          const message = error instanceof Error ? error.message : "Image upload failed";
          window.CMS_NOTIFY?.error(message);
        } finally {
          URL.revokeObjectURL(localPreviewUrl);
        }
      };

      updatePreview(input.value.trim());
      input.addEventListener("input", () => updatePreview(input.value.trim()));

      pickButton?.addEventListener("click", () => {
        if (fileInput instanceof HTMLInputElement) {
          fileInput.click();
        }
      });

      removeButton?.addEventListener("click", () => {
        input.value = "";
        if (fileInput instanceof HTMLInputElement) {
          fileInput.value = "";
        }
        updatePreview("");
      });

      const handleFileSelection = async (file) => {
        await triggerUpload(file);
        if (fileInput instanceof HTMLInputElement) {
          fileInput.value = "";
        }
      };

      fileInput?.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        if (!file) {
          return;
        }

        await handleFileSelection(file);
      });

      const stopDrag = (event) => {
        event.preventDefault();
        event.stopPropagation();
      };

      dropzone?.addEventListener("dragenter", stopDrag);
      dropzone?.addEventListener("dragover", stopDrag);
      dropzone?.addEventListener("dragleave", stopDrag);
      dropzone?.addEventListener("drop", async (event) => {
        stopDrag(event);
        const file = event.dataTransfer?.files?.[0];
        if (!file) {
          return;
        }

        await handleFileSelection(file);
      });
    });
  };

  document.querySelectorAll("[data-media-upload-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const fileInput = form.querySelector("[data-media-upload-input]");
      if (!(fileInput instanceof HTMLInputElement) || !fileInput.files?.[0]) {
        window.CMS_NOTIFY?.warning("Pilih file terlebih dahulu.");
        return;
      }

      try {
        await uploadMediaFile(fileInput.files[0]);
        window.CMS_NOTIFY?.queue("Media berhasil diupload.", "success");
        window.location.reload();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        window.CMS_NOTIFY?.error(message);
      }
    });
  });

  setupImageField({
    fieldSelector: "[data-featured-image-field]",
    inputSelector: "[data-featured-image-input]",
    fileInputSelector: "[data-featured-image-file]",
    pickSelector: "[data-featured-image-pick]",
    removeSelector: "[data-featured-image-remove]",
    dropzoneSelector: "[data-featured-image-dropzone]",
    previewSelector: "[data-featured-image-preview]",
    placeholderSelector: "[data-featured-image-placeholder]",
    successMessage: "Featured image berhasil diupload."
  });

  setupImageField({
    fieldSelector: "[data-banner-image-field]",
    inputSelector: "[data-banner-image-input]",
    fileInputSelector: "[data-banner-image-file]",
    pickSelector: "[data-banner-image-pick]",
    removeSelector: "[data-banner-image-remove]",
    dropzoneSelector: "[data-banner-image-dropzone]",
    previewSelector: "[data-banner-image-preview]",
    placeholderSelector: "[data-banner-image-placeholder]",
    successMessage: "Banner berhasil diupload."
  });

  document.querySelectorAll("[data-content-media-field]").forEach((field) => {
    const fileInput = field.querySelector("[data-content-media-file]");
    const dropzone = field.querySelector("[data-content-media-dropzone]");
    const previewWrap = field.querySelector("[data-content-media-preview-wrap]");
    const preview = field.querySelector("[data-content-media-preview]");
    const placeholder = field.querySelector("[data-content-media-placeholder]");
    const uploadButton = document.querySelector("[data-content-media-pick]");

    if (!(fileInput instanceof HTMLInputElement)) {
      return;
    }

    const clearPreview = () => {
      if (preview instanceof HTMLElement) {
        preview.innerHTML = "";
      }
      if (previewWrap instanceof HTMLElement) {
        previewWrap.classList.add("hidden");
      }
      if (placeholder instanceof HTMLElement) {
        placeholder.classList.remove("hidden");
      }
    };

    const showPreview = (file, objectUrl) => {
      if (!(preview instanceof HTMLElement) || !(previewWrap instanceof HTMLElement)) {
        return;
      }

      preview.innerHTML = createUploadPreviewMarkup(file, objectUrl);
      previewWrap.classList.remove("hidden");
      if (placeholder instanceof HTMLElement) {
        placeholder.classList.add("hidden");
      }
    };

    const insertUploadedMedia = (result, file) => {
      const media = result.media || result;
      const kind = media.kind || getFileKind(file);
      const payload = {
        ...media,
        kind,
        fileName: media.fileName || file.name,
        altText: media.altText || file.name
      };
      insertIntoContent(buildMediaInsertHtml(payload));
    };

    const handleSelection = async (file) => {
      if (!(file instanceof File)) {
        return;
      }

      const kind = validateMediaFile(file, { imageOnly: false });
      const localPreviewUrl = URL.createObjectURL(file);
      showPreview(file, localPreviewUrl);

      try {
        const result = await uploadMediaFile(file);
        if (kind === "image") {
          const media = result.media || result;
          const linkUrl = promptForImageLinkUrl(file.name);
          const payload = {
            ...media,
            kind,
            fileName: media.fileName || file.name,
            altText: media.altText || file.name,
            ...(linkUrl ? { linkUrl } : {})
          };
          insertIntoContent(buildMediaInsertHtml(payload));
        } else {
          insertUploadedMedia(result, file);
        }
        clearPreview();
        window.CMS_NOTIFY?.success("Media berhasil dimasukkan ke editor.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Media upload failed";
        window.CMS_NOTIFY?.error(message);
      } finally {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };

    uploadButton?.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) {
        return;
      }

      await handleSelection(file);
      fileInput.value = "";
    });

    const stopDrag = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    dropzone?.addEventListener("dragenter", stopDrag);
    dropzone?.addEventListener("dragover", stopDrag);
    dropzone?.addEventListener("dragleave", stopDrag);
    dropzone?.addEventListener("drop", async (event) => {
      stopDrag(event);
      const file = event.dataTransfer?.files?.[0];
      if (!file) {
        return;
      }

      await handleSelection(file);
      fileInput.value = "";
    });
  });

  document.querySelectorAll("form").forEach((form) => {
    const source = form.querySelector("[data-slug-source]");
    const target = form.querySelector("[data-slug-target]");

    if (!(source instanceof HTMLInputElement) || !(target instanceof HTMLInputElement)) {
      return;
    }

    source.addEventListener("input", () => {
      if (!target.value.trim()) {
        target.value = slugifyText(source.value);
      }
    });
  });

  document.querySelectorAll("[data-youtube-field]").forEach((field) => {
    const input = field.querySelector("[data-youtube-url-input]");
    const preset = field.querySelector("[data-youtube-label-preset]");
    const labelInput = field.querySelector("[data-youtube-label-input]");
    const previewThumb = field.querySelector("[data-youtube-preview-thumb]");
    const previewEmpty = field.querySelector("[data-youtube-preview-empty]");
    const previewText = field.querySelector("[data-youtube-preview-text]");
    const previewLink = field.querySelector("[data-youtube-preview-link]");

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const updatePreview = (value) => {
      const preview = parseYoutubeUrl(value);
      if (preview) {
        if (previewThumb instanceof HTMLImageElement) {
          previewThumb.src = preview.thumbnailUrl;
          previewThumb.classList.remove("hidden");
        }
        if (previewEmpty instanceof HTMLElement) {
          previewEmpty.classList.add("hidden");
        }
        if (previewText instanceof HTMLElement) {
          previewText.textContent = preview.watchUrl;
        }
        if (previewLink instanceof HTMLAnchorElement) {
          previewLink.href = preview.embedUrl;
          previewLink.classList.remove("hidden");
        }
        return;
      }

      if (previewThumb instanceof HTMLImageElement) {
        previewThumb.removeAttribute("src");
        previewThumb.classList.add("hidden");
      }
      if (previewEmpty instanceof HTMLElement) {
        previewEmpty.classList.remove("hidden");
      }
      if (previewText instanceof HTMLElement) {
        previewText.textContent = "Tempel URL YouTube untuk menampilkan preview.";
      }
      if (previewLink instanceof HTMLAnchorElement) {
        previewLink.href = "#";
        previewLink.classList.add("hidden");
      }
    };

    const syncLabelPreset = () => {
      if (!(preset instanceof HTMLSelectElement) || !(labelInput instanceof HTMLInputElement)) {
        return;
      }

      const currentValue = labelInput.value.trim();
      if (!currentValue) {
        preset.value = "AUTO";
        return;
      }

      const match = Array.from(preset.options).find((option) => option.value === currentValue);
      preset.value = match ? currentValue : "CUSTOM";
    };

    if (preset instanceof HTMLSelectElement && labelInput instanceof HTMLInputElement) {
      preset.addEventListener("change", () => {
        const selectedValue = preset.value;
        if (selectedValue === "AUTO") {
          labelInput.value = youtubeDefaultLabel;
          return;
        }

        if (selectedValue === "CUSTOM") {
          if (!labelInput.value.trim()) {
            labelInput.value = youtubeDefaultLabel;
          }
          return;
        }

        labelInput.value = selectedValue;
      });

      labelInput.addEventListener("input", syncLabelPreset);
      syncLabelPreset();
    }

    updatePreview(input.value);
    input.addEventListener("input", () => updatePreview(input.value));
  });

  const setupTaxonomyModal = () => {
    const modal = document.querySelector("[data-taxonomy-modal]");
    const modalTitle = modal?.querySelector("[data-taxonomy-modal-title]");
    const modalDescription = modal?.querySelector("[data-taxonomy-modal-description]");
    const modalHelp = modal?.querySelector("[data-taxonomy-modal-help]");
    const modalKind = modal?.querySelector("[data-taxonomy-modal-kind]");
    const modalMode = modal?.querySelector("[data-taxonomy-modal-mode]");
    const modalId = modal?.querySelector("[data-taxonomy-modal-id]");
    const modalInput = modal?.querySelector("[data-taxonomy-modal-input]");
    const modalForm = modal?.querySelector("[data-taxonomy-modal-form]");
    const modalSubmit = modal?.querySelector("[data-taxonomy-modal-submit]");
    const modalErrors = modal?.querySelector("[data-taxonomy-modal-errors]");
    const closeButtons = modal ? modal.querySelectorAll("[data-taxonomy-modal-close]") : [];

    if (!(modal instanceof HTMLElement) || !(modalForm instanceof HTMLFormElement)) {
      return;
    }

    const isAdminPage = Boolean(document.querySelector("[data-taxonomy-admin]"));
    const isPostForm = Boolean(document.querySelector("[data-post-form-root]"));
    const taxonomyRoutes = {
      category: "/admin/categories",
      tag: "/admin/tags"
    };

    const getLabel = (kind) => (kind === "tag" ? "Tag" : "Kategori");
    const getRoute = (kind) => taxonomyRoutes[kind] || taxonomyRoutes.category;
    const getCountSelector = (kind) => `[data-taxonomy-count="${escapeSelectorValue(kind)}"]`;

    const clearModalErrors = () => {
      if (modalErrors instanceof HTMLElement) {
        modalErrors.innerHTML = "";
        modalErrors.classList.add("hidden");
      }
    };

    const setModalErrors = (messages = []) => {
      if (!(modalErrors instanceof HTMLElement)) {
        return;
      }

      const items = Array.isArray(messages) ? messages.map((item) => String(item || "").trim()).filter(Boolean) : [];
      if (!items.length) {
        modalErrors.innerHTML = "";
        modalErrors.classList.add("hidden");
        return;
      }

      modalErrors.classList.remove("hidden");
      modalErrors.innerHTML = items.map((item) => `<div>${escapeHtml(item)}</div>`).join("");
    };

    const setModalCopy = (kind, mode = "create") => {
      const label = getLabel(kind);
      const isEdit = mode === "edit";
      if (modalTitle instanceof HTMLElement) {
        modalTitle.textContent = isEdit ? `Edit ${label}` : `Tambah ${label}`;
      }
      if (modalDescription instanceof HTMLElement) {
        modalDescription.textContent = isEdit
          ? `Ubah nama ${label.toLowerCase()} lalu simpan perubahan.`
          : `Masukkan ${label.toLowerCase()} baru lalu simpan untuk menambahkannya ke daftar.`;
      }
      if (modalSubmit instanceof HTMLButtonElement) {
        modalSubmit.textContent = isEdit ? "Simpan Perubahan" : `Simpan ${label}`;
      }
      if (modalKind instanceof HTMLInputElement) {
        modalKind.value = kind;
      }
      if (modalMode instanceof HTMLInputElement) {
        modalMode.value = mode;
      }
      if (modalId instanceof HTMLInputElement) {
        modalId.value = "";
      }
      if (modalHelp instanceof HTMLElement) {
        modalHelp.textContent = isEdit
          ? `Nama akan diperbarui langsung di daftar setelah disimpan.`
          : `Pisahkan beberapa item dengan koma saat menambah data baru.`;
      }
    };

    const close = () => {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("overflow-hidden");
      clearModalErrors();
    };

    const open = (kind = "category", mode = "create", item = {}) => {
      const safeKind = kind === "tag" ? "tag" : "category";
      const safeMode = mode === "edit" ? "edit" : "create";
      setModalCopy(safeKind, safeMode);
      if (modalInput instanceof HTMLTextAreaElement) {
        modalInput.value = String(item.name || "");
        modalInput.placeholder = safeMode === "edit"
          ? `Ubah nama ${getLabel(safeKind).toLowerCase()}`
          : safeKind === "tag"
            ? "Productivity, Design, News"
            : "Technology, Lifestyle, Travel";
      }
      if (modalId instanceof HTMLInputElement) {
        modalId.value = String(item.id || "");
      }
      clearModalErrors();
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("overflow-hidden");
      window.setTimeout(() => {
        if (modalInput instanceof HTMLTextAreaElement) {
          modalInput.focus();
        }
      }, 50);
    };

    const appendPostFormTaxonomyItem = (kind, item) => {
      const list = document.querySelector(`[data-taxonomy-list="${escapeSelectorValue(kind)}"]`);
      const emptyState = document.querySelector(`[data-taxonomy-empty="${escapeSelectorValue(kind)}"]`);
      const count = document.querySelector(`[data-taxonomy-count="${escapeSelectorValue(kind)}"]`);
      const checkboxName = kind === "category" ? "categoryIds" : "tagIds";

      if (!(list instanceof HTMLElement) || !item || typeof item !== "object") {
        return;
      }

      const id = String(item.id || "").trim();
      const name = String(item.name || "").trim();
      if (!id || !name) {
        return;
      }

      const existing = document.querySelector(`input[name="${checkboxName}"][value="${escapeSelectorValue(id)}"]`);
      if (existing instanceof HTMLInputElement) {
        existing.checked = true;
        return;
      }

      if (emptyState instanceof HTMLElement) {
        emptyState.remove();
      }

      const card = document.createElement("div");
      card.className = "taxonomy-item group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[color:var(--wp-surface-2)] px-4 py-3 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800";
      card.dataset.taxonomyItem = "true";
      card.dataset.taxonomyKind = kind;
      card.dataset.taxonomyId = id;
      card.dataset.taxonomyName = name;
      card.innerHTML = `
        <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="${checkboxName}"
            value="${escapeHtml(id)}"
            class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
            checked
          />
          <span class="truncate font-medium text-slate-900 dark:text-slate-900" data-taxonomy-item-name>${escapeHtml(name)}</span>
        </label>
        <div class="flex shrink-0 items-center gap-1">
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            data-taxonomy-edit
            data-taxonomy-kind="${escapeHtml(kind)}"
            data-taxonomy-id="${escapeHtml(id)}"
            data-taxonomy-name="${escapeHtml(name)}"
            title="Edit"
          >
            <i class="fas fa-pen-to-square text-xs"></i>
          </button>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 shadow-sm ring-1 ring-red-100 transition hover:bg-red-100"
            data-taxonomy-delete
            data-taxonomy-kind="${escapeHtml(kind)}"
            data-taxonomy-id="${escapeHtml(id)}"
            data-taxonomy-name="${escapeHtml(name)}"
            title="Hapus"
          >
            <i class="fas fa-trash text-xs"></i>
          </button>
        </div>
      `;

      list.appendChild(card);

      if (count instanceof HTMLElement) {
        const currentCount = Number.parseInt(count.textContent || "0", 10);
        count.textContent = String(Number.isFinite(currentCount) ? currentCount + 1 : 1);
      }
    };

    const removePostFormTaxonomyItem = (kind, id) => {
      const selector = `[data-taxonomy-item][data-taxonomy-kind="${escapeSelectorValue(kind)}"][data-taxonomy-id="${escapeSelectorValue(id)}"]`;
      const item = document.querySelector(selector);
      if (item instanceof HTMLElement) {
        item.remove();
      }

      const list = document.querySelector(`[data-taxonomy-list="${escapeSelectorValue(kind)}"]`);
      const emptyState = document.querySelector(`[data-taxonomy-empty="${escapeSelectorValue(kind)}"]`);
      const count = document.querySelector(getCountSelector(kind));

      if (list instanceof HTMLElement && !list.querySelector("[data-taxonomy-item]") && emptyState instanceof HTMLElement) {
        emptyState.classList.remove("hidden");
        if (!emptyState.parentElement) {
          list.appendChild(emptyState);
        }
      }

      if (count instanceof HTMLElement) {
        const currentCount = Number.parseInt(count.textContent || "0", 10);
        count.textContent = String(Math.max(0, Number.isFinite(currentCount) ? currentCount - 1 : 0));
      }
    };

    const updatePostFormTaxonomyItem = (kind, item) => {
      const selector = `[data-taxonomy-item][data-taxonomy-kind="${escapeSelectorValue(kind)}"][data-taxonomy-id="${escapeSelectorValue(item.id)}"]`;
      const node = document.querySelector(selector);
      if (!(node instanceof HTMLElement)) {
        return;
      }

      node.dataset.taxonomyName = item.name;
      const nameNode = node.querySelector("[data-taxonomy-item-name]");
      if (nameNode instanceof HTMLElement) {
        nameNode.textContent = item.name;
      }

      const editButton = node.querySelector("[data-taxonomy-edit]");
      if (editButton instanceof HTMLElement) {
        editButton.setAttribute("data-taxonomy-name", item.name);
      }

      const deleteButton = node.querySelector("[data-taxonomy-delete]");
      if (deleteButton instanceof HTMLElement) {
        deleteButton.setAttribute("data-taxonomy-name", item.name);
      }
    };

    const performRequest = async ({ kind, method, id = "", name = "" }) => {
      const route = getRoute(kind);
      const url = id ? `${route}/${encodeURIComponent(id)}` : route;
      const response = await fetch(url, {
        method,
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-csrf-token": csrfToken
        },
        body: method === "DELETE" ? undefined : JSON.stringify({ name })
      });

      const rawText = await response.text();
      let payload = null;
      try {
        payload = rawText ? JSON.parse(rawText) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const errors = payload?.errors ? Object.values(payload.errors).flat() : [];
        const message = String(payload?.error || rawText || "Gagal menyimpan taxonomy").trim();
        const error = new Error(message || "Gagal menyimpan taxonomy");
        error.details = Array.isArray(errors) ? errors : [];
        throw error;
      }

      return payload;
    };

    const submitCreate = async (kind, text) => {
      const names = Array.from(new Set(String(text || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)));

      if (!names.length) {
        throw new Error(`Masukkan nama ${getLabel(kind).toLowerCase()} terlebih dahulu.`);
      }

      const items = [];
      for (const name of names) {
        const result = await performRequest({ kind, method: "POST", name });
        if (result?.item) {
          items.push(result.item);
        }
      }
      return items;
    };

    const submitEdit = async (kind, id, text) => {
      const name = String(text || "").trim();
      if (!name) {
        throw new Error(`Nama ${getLabel(kind).toLowerCase()} tidak boleh kosong.`);
      }

      const result = await performRequest({ kind, method: "PUT", id, name });
      return result?.item || null;
    };

    const submitDelete = async (kind, id) => {
      return performRequest({ kind, method: "DELETE", id });
    };

    const refreshAfterAdminMutation = (kind, message) => {
      window.CMS_NOTIFY?.queue(message, "success");
      window.location.reload();
    };

    const handleModalOpen = (button) => {
      const kind = button.getAttribute("data-taxonomy-modal-open") || "category";
      open(kind, "create", {});
    };

    const handleEditClick = (button) => {
      const kind = button.getAttribute("data-taxonomy-kind") || "category";
      const id = button.getAttribute("data-taxonomy-id") || "";
      const name = button.getAttribute("data-taxonomy-name") || "";
      open(kind, "edit", { id, name });
    };

    const handleDeleteClick = async (button) => {
      const kind = button.getAttribute("data-taxonomy-kind") || "category";
      const id = button.getAttribute("data-taxonomy-id") || "";
      const name = button.getAttribute("data-taxonomy-name") || getLabel(kind);
      const label = getLabel(kind).toLowerCase();
      const confirm = await fireSwal({
        title: "Konfirmasi penghapusan",
        text: `Apakah Anda yakin untuk menghapus ${label} "${name}"?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: `Ya, hapus ${getLabel(kind)}`,
        cancelButtonText: "Batal",
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#64748b"
      });

      if (!confirm.isConfirmed) {
        return;
      }

      try {
        const result = await submitDelete(kind, id);
        close();

        if (isPostForm) {
          removePostFormTaxonomyItem(kind, id);
          window.CMS_NOTIFY?.success(`${getLabel(kind)} berhasil dihapus.`);
          return;
        }

        refreshAfterAdminMutation(kind, `${getLabel(kind)} berhasil dihapus.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : `Gagal menghapus ${label}.`;
        window.CMS_NOTIFY?.error(message);
      }
    };

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const openButton = target.closest("[data-taxonomy-modal-open]");
      if (openButton instanceof HTMLElement) {
        handleModalOpen(openButton);
        return;
      }

      const editButton = target.closest("[data-taxonomy-edit]");
      if (editButton instanceof HTMLElement) {
        handleEditClick(editButton);
        return;
      }

      const deleteButton = target.closest("[data-taxonomy-delete]");
      if (deleteButton instanceof HTMLElement) {
        void handleDeleteClick(deleteButton);
        return;
      }
    });

    closeButtons.forEach((button) => {
      button.addEventListener("click", close);
    });

    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        close();
      }
    });

    modal.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.matches("[data-taxonomy-modal-close]")) {
        close();
      }
    });

    modalForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearModalErrors();

      const kind = modalKind instanceof HTMLInputElement ? (modalKind.value === "tag" ? "tag" : "category") : "category";
      const mode = modalMode instanceof HTMLInputElement ? (modalMode.value === "edit" ? "edit" : "create") : "create";
      const id = modalId instanceof HTMLInputElement ? modalId.value.trim() : "";
      const text = modalInput instanceof HTMLTextAreaElement ? modalInput.value : "";

      if (modalSubmit instanceof HTMLButtonElement) {
        modalSubmit.disabled = true;
        modalSubmit.textContent = "Menyimpan...";
      }

      try {
        if (mode === "edit") {
          const item = await submitEdit(kind, id, text);
          close();

          if (isPostForm && item) {
            updatePostFormTaxonomyItem(kind, item);
            window.CMS_NOTIFY?.success(`${getLabel(kind)} berhasil diperbarui.`);
            return;
          }

          refreshAfterAdminMutation(kind, `${getLabel(kind)} berhasil diperbarui.`);
          return;
        }

        const items = await submitCreate(kind, text);
        close();

        if (isPostForm) {
          items.forEach((item) => appendPostFormTaxonomyItem(kind, item));
          window.CMS_NOTIFY?.success(`${getLabel(kind)} berhasil ditambahkan.`);
          return;
        }

        refreshAfterAdminMutation(kind, `${getLabel(kind)} berhasil ditambahkan.`);
      } catch (error) {
        const details = Array.isArray(error?.details) ? error.details : [];
        if (details.length) {
          setModalErrors(details);
        }
        const message = error instanceof Error ? error.message : `Gagal menyimpan ${getLabel(kind).toLowerCase()}.`;
        window.CMS_NOTIFY?.error(message);
      } finally {
        if (modalSubmit instanceof HTMLButtonElement) {
          modalSubmit.disabled = false;
          const currentMode = modalMode instanceof HTMLInputElement && modalMode.value === "edit" ? "edit" : "create";
          modalSubmit.textContent = currentMode === "edit" ? "Simpan Perubahan" : `Simpan ${getLabel(kind)}`;
        }
      }
    });
  };

  setupTaxonomyModal();
  bindFormDraftPersistence();

  const setupFaqBuilder = () => {
    const createFaqItem = (question = "", answer = "") => ({
      question: String(question ?? ""),
      answer: String(answer ?? "")
    });

    document.querySelectorAll("[data-faq-builder]").forEach((builder) => {
      const store = builder.querySelector("[data-faq-store]");
      const list = builder.querySelector("[data-faq-list]");
      const addButtons = Array.from(builder.querySelectorAll("[data-faq-add]"));

      if (!(store instanceof HTMLTextAreaElement) || !(list instanceof HTMLElement)) {
        return;
      }

      const maxItems = 8;
      const emptyStateClass = "rounded-2xl border border-dashed border-[color:var(--wp-border)] bg-[color:var(--wp-surface-2)] px-4 py-5 text-sm text-slate-500";

      const serialize = () => {
        const items = Array.from(list.querySelectorAll("[data-faq-item]"))
          .map((item) => {
            if (!(item instanceof HTMLElement)) {
              return null;
            }

            const questionInput = item.querySelector("[data-faq-question]");
            const answerInput = item.querySelector("[data-faq-answer]");
            const question = questionInput instanceof HTMLInputElement ? questionInput.value.trim() : "";
            const answer = answerInput instanceof HTMLTextAreaElement ? answerInput.value.trim() : "";
            if (!question || !answer) {
              return null;
            }

            return createFaqItem(question, answer);
          })
          .filter(Boolean);

        store.value = JSON.stringify(items);
        addButtons.forEach((button) => {
          if (button instanceof HTMLButtonElement) {
            button.disabled = items.length >= maxItems;
          }
        });
      };

      const updateEmptyState = () => {
        const hasItems = Boolean(list.querySelector("[data-faq-item]"));
        if (!hasItems) {
          list.innerHTML = `<div class="${emptyStateClass}" data-faq-empty>Belum ada FAQ. Klik "Tambah FAQ" untuk membuat pertanyaan pertama.</div>`;
        } else {
          list.querySelector("[data-faq-empty]")?.remove();
        }
      };

      const renderItem = (item, index) => {
        const wrapper = document.createElement("div");
        wrapper.className = "rounded-2xl border border-[color:var(--wp-border)] bg-[color:var(--wp-surface)] p-4 shadow-soft";
        wrapper.setAttribute("data-faq-item", "true");
        wrapper.innerHTML = `
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">FAQ ${index + 1}</div>
              <p class="mt-1 text-sm text-slate-500">Pertanyaan dan jawaban ini akan ikut ke schema FAQ.</p>
            </div>
            <button type="button" class="wp-btn wp-btn-ghost text-xs" data-faq-remove>Hapus</button>
          </div>
          <div class="grid gap-4">
            <div>
              <label class="label" data-faq-question-label>Question</label>
              <input class="input" name="faqQuestion" maxlength="180" placeholder="Contoh: Apa manfaat topik ini?" data-faq-question />
            </div>
            <div>
              <label class="label" data-faq-answer-label>Answer</label>
              <textarea class="input min-h-28" name="faqAnswer" maxlength="1500" placeholder="Tulis jawaban lengkap di sini..." data-faq-answer></textarea>
            </div>
          </div>
        `;

        const questionInput = wrapper.querySelector("[data-faq-question]");
        const answerInput = wrapper.querySelector("[data-faq-answer]");
        const removeButton = wrapper.querySelector("[data-faq-remove]");

        if (questionInput instanceof HTMLInputElement) {
          questionInput.value = item.question;
          questionInput.addEventListener("input", serialize);
        }

        if (answerInput instanceof HTMLTextAreaElement) {
          answerInput.value = item.answer;
          answerInput.addEventListener("input", serialize);
        }

        removeButton?.addEventListener("click", () => {
          wrapper.remove();
          updateEmptyState();
          serialize();
          renumber();
        });

        return wrapper;
      };

      const renumber = () => {
        Array.from(list.querySelectorAll("[data-faq-item]")).forEach((item, index) => {
          const label = item.querySelector("[data-faq-question-label]");
          if (label instanceof HTMLElement) {
            label.textContent = `Question ${index + 1}`;
          }

          const answerLabel = item.querySelector("[data-faq-answer-label]");
          if (answerLabel instanceof HTMLElement) {
            answerLabel.textContent = `Answer ${index + 1}`;
          }

          const title = item.querySelector(".text-xs.font-semibold.uppercase");
          if (title instanceof HTMLElement) {
            title.textContent = `FAQ ${index + 1}`;
          }
        });
      };

      const addItem = (item = createFaqItem()) => {
        const count = list.querySelectorAll("[data-faq-item]").length;
        if (count >= maxItems) {
          window.CMS_NOTIFY?.warning(`Maksimal ${maxItems} FAQ per post.`);
          return;
        }

        list.querySelector("[data-faq-empty]")?.remove();
        const element = renderItem(item, count);
        list.appendChild(element);
        renumber();
        serialize();
      };

      const parseStoredItems = () => {
        try {
          const raw = store.value.trim();
          if (!raw) {
            return [];
          }

          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) {
            return [];
          }

          return parsed
            .map((item) => {
              if (!item || typeof item !== "object") {
                return null;
              }

              const question = typeof item.question === "string" ? item.question : "";
              const answer = typeof item.answer === "string" ? item.answer : "";
              if (!question.trim() || !answer.trim()) {
                return null;
              }

              return createFaqItem(question, answer);
            })
            .filter(Boolean);
        } catch {
          return [];
        }
      };

      const initialItems = parseStoredItems();
      list.innerHTML = "";
      if (initialItems.length) {
        initialItems.forEach((item, index) => {
          list.appendChild(renderItem(item, index));
        });
      }

      updateEmptyState();
      renumber();
      serialize();

      addButtons.forEach((button) => {
        button.addEventListener("click", () => {
          addItem();
          updateEmptyState();
        });
      });
    });
  };

  setupFaqBuilder();

  const setupBannerBuilder = () => {
    document.querySelectorAll("[data-banner-builder]").forEach((builder) => {
      const store = builder.querySelector("[data-banner-store]");
      const list = builder.querySelector("[data-banner-list]");
      const template = builder.querySelector("[data-banner-template]");
      const addButtons = Array.from(builder.querySelectorAll("[data-banner-add]"));

      if (!(store instanceof HTMLTextAreaElement) || !(list instanceof HTMLElement) || !(template instanceof HTMLTemplateElement)) {
        return;
      }

      const maxItems = 10;
      const emptyStateClass = "rounded-2xl border border-dashed border-[color:var(--wp-border)] bg-[color:var(--wp-surface-2)] px-4 py-5 text-sm text-slate-500";

      const createBannerItem = (item = {}) => {
        const fragment = template.content.cloneNode(true);
        const element = fragment.firstElementChild;
        if (!(element instanceof HTMLElement)) {
          return null;
        }

        element.dataset.bannerItemId = `banner-${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const imageInput = element.querySelector("[data-banner-image-input]");
        const urlInput = element.querySelector("[data-banner-url-input]");
        const positionInput = element.querySelector("[data-banner-position-input]");

        if (imageInput instanceof HTMLInputElement) {
          imageInput.value = typeof item.image === "string" ? item.image : "";
        }

        if (urlInput instanceof HTMLInputElement) {
          urlInput.value = typeof item.url === "string" ? item.url : "";
        }

        if (positionInput instanceof HTMLSelectElement) {
          positionInput.value = item.position === "LEFT" || item.position === "RIGHT" ? item.position : "TOP";
        }

        setImageFieldPreview(element, imageInput instanceof HTMLInputElement ? imageInput.value.trim() : "", "[data-banner-preview]", "[data-banner-placeholder]");
        return element;
      };

      const parseStoredItems = () => {
        try {
          const raw = store.value.trim();
          if (!raw) {
            return [];
          }

          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) {
            return [];
          }

          return parsed
            .map((item) => {
              if (!item || typeof item !== "object") {
                return null;
              }

              const image = typeof item.image === "string" ? item.image.trim() : "";
              if (!image) {
                return null;
              }

              const url = typeof item.url === "string" ? item.url.trim() : "";
              const position = item.position === "LEFT" || item.position === "RIGHT" ? item.position : "TOP";
              return {
                image,
                ...(url ? { url } : {}),
                position
              };
            })
            .filter(Boolean);
        } catch {
          return [];
        }
      };

      const updateEmptyState = () => {
        const hasItems = Boolean(list.querySelector("[data-banner-item]"));
        if (!hasItems) {
          list.innerHTML = `<div class="${emptyStateClass}" data-banner-empty>Belum ada banner. Klik "Tambah banner" untuk membuat banner pertama.</div>`;
        } else {
          list.querySelector("[data-banner-empty]")?.remove();
        }
      };

      const renumber = () => {
        Array.from(list.querySelectorAll("[data-banner-item]")).forEach((item, index) => {
          const title = item.querySelector("[data-banner-item-title]");
          if (title instanceof HTMLElement) {
            title.textContent = `Banner ${index + 1}`;
          }
        });
      };

      const serialize = () => {
        const items = Array.from(list.querySelectorAll("[data-banner-item]"))
          .map((item) => {
            if (!(item instanceof HTMLElement)) {
              return null;
            }

            const imageInput = item.querySelector("[data-banner-image-input]");
            const urlInput = item.querySelector("[data-banner-url-input]");
            const positionInput = item.querySelector("[data-banner-position-input]");
            const image = imageInput instanceof HTMLInputElement ? imageInput.value.trim() : "";
            const url = urlInput instanceof HTMLInputElement ? urlInput.value.trim() : "";
            const position = positionInput instanceof HTMLSelectElement && (positionInput.value === "LEFT" || positionInput.value === "RIGHT") ? positionInput.value : "TOP";

            if (!image) {
              return null;
            }

            return {
              image,
              ...(url ? { url } : {}),
              position
            };
          })
          .filter(Boolean);

        store.value = JSON.stringify(items);
        addButtons.forEach((button) => {
          if (button instanceof HTMLButtonElement) {
            button.disabled = items.length >= maxItems;
          }
        });

        updateEmptyState();
        renumber();
      };

      const addItem = (item = {}) => {
        const count = list.querySelectorAll("[data-banner-item]").length;
        if (count >= maxItems) {
          window.CMS_NOTIFY?.warning(`Maksimal ${maxItems} banner per post.`);
          return;
        }

        list.querySelector("[data-banner-empty]")?.remove();
        const element = createBannerItem(item);
        if (!(element instanceof HTMLElement)) {
          return;
        }

        list.appendChild(element);
        serialize();
      };

      const handleBannerPreview = (item) => {
        if (!(item instanceof HTMLElement)) {
          return;
        }

        const imageInput = item.querySelector("[data-banner-image-input]");
        const image = imageInput instanceof HTMLInputElement ? imageInput.value.trim() : "";
        setImageFieldPreview(item, image, "[data-banner-preview]", "[data-banner-placeholder]");
      };

      const initialItems = parseStoredItems();
      list.innerHTML = "";
      if (initialItems.length) {
        initialItems.forEach((item) => addItem(item));
      } else {
        updateEmptyState();
      }

      serialize();

      list.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        const removeButton = target.closest("[data-banner-remove]");
        if (removeButton instanceof HTMLElement) {
          const item = removeButton.closest("[data-banner-item]");
          item?.remove();
          serialize();
          return;
        }

        const mediaButton = target.closest("[data-banner-media-picker-open]");
        if (mediaButton instanceof HTMLElement) {
          const item = mediaButton.closest("[data-banner-item]");
          const itemId = item instanceof HTMLElement ? String(item.dataset.bannerItemId || "") : "";
          window.CMS_MEDIA_PICKER?.open("banner-item", itemId);
        }
      });

      list.addEventListener("input", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        if (target.matches("[data-banner-image-input], [data-banner-url-input]")) {
          const item = target.closest("[data-banner-item]");
          handleBannerPreview(item instanceof HTMLElement ? item : null);
          serialize();
        }
      });

      list.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        if (target.matches("[data-banner-position-input]")) {
          serialize();
        }
      });

      const handleBannerFileSelection = async (item, fileInput, file) => {
        if (!(item instanceof HTMLElement) || !(fileInput instanceof HTMLInputElement) || !(file instanceof File)) {
          return;
        }

        let localPreviewUrl = "";
        try {
          validateMediaFile(file, { imageOnly: true });
          localPreviewUrl = URL.createObjectURL(file);
          setImageFieldPreview(item, localPreviewUrl, "[data-banner-preview]", "[data-banner-placeholder]");

          const result = await uploadMediaFile(file, { imageOnly: true });
          const imageInput = item.querySelector("[data-banner-image-input]");
          if (imageInput instanceof HTMLInputElement) {
            imageInput.value = result.location;
          }
          setImageFieldPreview(item, result.preview || result.location, "[data-banner-preview]", "[data-banner-placeholder]");
          serialize();
          window.CMS_NOTIFY?.success("Banner berhasil diupload.");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Image upload failed";
          window.CMS_NOTIFY?.error(message);
        } finally {
          if (localPreviewUrl) {
            URL.revokeObjectURL(localPreviewUrl);
          }
          fileInput.value = "";
        }
      };

      list.addEventListener("change", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || !target.matches("[data-banner-file]")) {
          return;
        }

        const file = target.files?.[0];
        const item = target.closest("[data-banner-item]");
        if (!file || !(item instanceof HTMLElement)) {
          return;
        }

        await handleBannerFileSelection(item, target, file);
      });

      const stopDrag = (event) => {
        event.preventDefault();
        event.stopPropagation();
      };

      list.addEventListener("dragenter", stopDrag);
      list.addEventListener("dragover", stopDrag);
      list.addEventListener("dragleave", stopDrag);
      list.addEventListener("drop", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        const dropzone = target.closest("[data-banner-dropzone]");
        if (!(dropzone instanceof HTMLElement)) {
          return;
        }

        stopDrag(event);
        const file = event.dataTransfer?.files?.[0];
        if (!file) {
          return;
        }

        const fileInput = dropzone.querySelector("[data-banner-file]");
        const item = dropzone.closest("[data-banner-item]");
        if (!(fileInput instanceof HTMLInputElement) || !(item instanceof HTMLElement)) {
          return;
        }

        await handleBannerFileSelection(item, fileInput, file);
      });

      addButtons.forEach((button) => {
        button.addEventListener("click", () => {
          addItem();
        });
      });

      updateEmptyState();
      renumber();
    });
  };

  setupBannerBuilder();

  const setupMediaPicker = () => {
    const modal = document.querySelector("[data-media-picker-modal]");
    const list = modal?.querySelector("[data-media-picker-list]");
    const summary = modal?.querySelector("[data-media-picker-summary]");
    const search = modal?.querySelector("[data-media-picker-search]");
    const type = modal?.querySelector("[data-media-picker-type]");
    const refresh = modal?.querySelector("[data-media-picker-refresh]");
    const loadMore = modal?.querySelector("[data-media-picker-loadmore]");
    const closeButtons = modal ? modal.querySelectorAll("[data-media-picker-close]") : [];

    if (!(modal instanceof HTMLElement) || !(list instanceof HTMLElement)) {
      return;
    }

    const state = {
      page: 1,
      total: 0,
      hasMore: false,
      loading: false,
      requestId: 0,
      query: "",
      type: "all",
      target: "content",
      bannerItemId: "",
      items: [],
      controller: null
    };

    const setStatus = (message) => {
      if (summary instanceof HTMLElement) {
        summary.textContent = message;
      }
    };

    const close = () => {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("overflow-hidden");
    };

    const setPickedImageField = (fieldSelector, inputSelector, previewSelector, placeholderSelector, value, previewUrl = value) => {
      const field = document.querySelector(fieldSelector);
      const input = field?.querySelector(inputSelector);
      if (input instanceof HTMLInputElement) {
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (field instanceof HTMLElement) {
        setImageFieldPreview(field, previewUrl, previewSelector, placeholderSelector);
      }
    };

    const open = (target = "content", bannerItemId = "") => {
      state.target = target;
      state.bannerItemId = bannerItemId;
      state.page = 1;
      state.items = [];
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("overflow-hidden");
      load(true);
      if (search instanceof HTMLInputElement) {
        window.setTimeout(() => search.focus(), 50);
      }
    };

    const insertMedia = (item) => {
      if (state.target === "thumbnail" && item.kind === "image") {
        setPickedImageField("[data-featured-image-field]", "[data-featured-image-input]", "[data-featured-image-preview]", "[data-featured-image-placeholder]", item.filePath, item.previewUrl || item.filePath);
        window.CMS_NOTIFY?.success("Media dipilih sebagai featured image.");
        close();
        return;
      }

      if (state.target === "banner" && item.kind === "image") {
        setPickedImageField("[data-banner-image-field]", "[data-banner-image-input]", "[data-banner-image-preview]", "[data-banner-image-placeholder]", item.filePath, item.previewUrl || item.filePath);
        window.CMS_NOTIFY?.success("Media dipilih sebagai banner image.");
        close();
        return;
      }

      if (state.target === "banner-item" && item.kind === "image" && state.bannerItemId) {
        const fieldSelector = `[data-banner-item-id="${escapeSelectorValue(state.bannerItemId)}"]`;
        setPickedImageField(fieldSelector, "[data-banner-image-input]", "[data-banner-preview]", "[data-banner-placeholder]", item.filePath, item.previewUrl || item.filePath);
        window.CMS_NOTIFY?.success("Media dipilih sebagai banner image.");
        close();
        return;
      }

      if (state.target === "banner-item") {
        window.CMS_NOTIFY?.warning("Banner harus berupa gambar.");
        return;
      }

      if (state.target === "banner") {
        window.CMS_NOTIFY?.warning("Banner harus berupa gambar.");
        return;
      }

      insertIntoContent(buildMediaInsertHtml(item));
      window.CMS_NOTIFY?.success("Media berhasil dimasukkan ke konten.");
      close();
    };

    const renderCard = (item) => {
      const previewUrl = item.previewUrl || item.filePath;
      const kind = item.kind || "other";
      const isBannerTarget = state.target === "banner" && kind === "image";
      const badgeClass = kind === "image"
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-100"
        : kind === "video"
          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-100"
          : kind === "document"
            ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-100"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200";
      const title = escapeHtml(item.fileName || "Media");
      const fileSize = formatBytes(Number(item.fileSize) || 0);
      const dateLabel = new Date(item.createdAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      const mediaId = escapeHtml(item.id);
      const thumbnailAction = state.target === "thumbnail" && kind === "image"
        ? `<button type="button" class="wp-btn wp-btn-primary flex-1" data-media-action="thumbnail" data-media-id="${mediaId}">Set as Thumbnail</button>`
        : isBannerTarget
          ? `<button type="button" class="wp-btn wp-btn-primary flex-1" data-media-action="banner" data-media-id="${mediaId}">Set as Banner</button>`
          : "";
      const insertActionLabel = state.target === "banner" ? "Set as Banner" : "Insert into Content";
      const insertAction = state.target === "banner"
        ? ""
        : `<button type="button" class="wp-btn wp-btn-primary flex-1" data-media-action="insert" data-media-id="${mediaId}">${insertActionLabel}</button>`;
      const linkedImageAction = kind === "image" && state.target !== "banner"
        ? `<button type="button" class="wp-btn wp-btn-secondary flex-1" data-media-action="insert-linked" data-media-id="${mediaId}">Link Gambar</button>`
        : "";

      return `
        <article class="overflow-hidden rounded-[1.35rem] border border-[color:var(--wp-border)] bg-[color:var(--wp-surface)] shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.1)]" data-media-item-id="${escapeHtml(item.id)}">
          <div class="aspect-video bg-[color:var(--wp-surface-2)]">
            ${
              kind === "image"
                ? `<img src="${escapeHtml(previewUrl)}" alt="${title}" class="h-full w-full object-cover" loading="lazy" />`
                : kind === "video"
                  ? `<video class="h-full w-full object-cover" src="${escapeHtml(previewUrl)}" controls preload="metadata"></video>`
                  : kind === "document"
                    ? `<div class="flex h-full w-full items-center justify-center p-6 text-center"><div><div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${kind === "document" ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200" : ""}"><svg aria-hidden="true" class="h-8 w-8" viewBox="0 0 24 24" fill="none"><path d="M7 3.5h7l5 5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" /><path d="M14 3.5V9h5" stroke="currentColor" stroke-width="1.6" /><path d="M8.5 13h7M8.5 16h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg></div><p class="mt-3 text-sm font-semibold">PDF Document</p><p class="mt-1 text-xs text-slate-500">Ready to insert</p></div></div>`
                    : `<div class="flex h-full w-full items-center justify-center p-6 text-center"><div><div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><svg aria-hidden="true" class="h-8 w-8" viewBox="0 0 24 24" fill="none"><path d="M7 3.5h7l5 5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" /><path d="M14 3.5V9h5" stroke="currentColor" stroke-width="1.6" /></svg></div><p class="mt-3 text-sm font-semibold">File</p><p class="mt-1 text-xs text-slate-500">${escapeHtml(item.mimeType || "unknown")}</p></div></div>`
            }
          </div>
          <div class="space-y-3 p-4">
            <div>
              <p class="truncate text-sm font-semibold text-slate-950 dark:text-white">${title}</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <span class="wp-badge ${badgeClass}">${escapeHtml(item.kindLabel || kind)}</span>
                ${item.width && item.height ? `<span class="wp-badge">${item.width}x${item.height}</span>` : ""}
                <span class="wp-badge">${escapeHtml(fileSize)}</span>
              </div>
            </div>
            <p class="text-xs text-slate-500">${escapeHtml(dateLabel)}</p>
            <p class="truncate text-xs text-slate-500">${escapeHtml(item.filePath)}</p>
            <div class="flex flex-wrap gap-2">
              ${insertAction}
              ${linkedImageAction}
              ${thumbnailAction}
              <a class="wp-btn wp-btn-secondary" href="${escapeHtml(item.filePath)}" target="_blank" rel="noopener noreferrer">Open</a>
            </div>
          </div>
        </article>
      `;
    };

    const renderItems = (items, append = false) => {
      const html = items.map((item) => renderCard(item)).join("");
      if (append) {
        list.insertAdjacentHTML("beforeend", html);
      } else {
        list.innerHTML = html || `
          <div class="col-span-full rounded-2xl border border-dashed border-[color:var(--wp-border)] bg-[color:var(--wp-surface-2)] p-6 text-sm text-slate-500">
            Tidak ada media yang cocok.
          </div>
        `;
      }

      if (loadMore instanceof HTMLButtonElement) {
        loadMore.classList.toggle("hidden", !state.hasMore);
        loadMore.disabled = state.loading;
      }

      setStatus(`Menampilkan ${state.items.length} dari ${state.total} item`);
    };

    const load = async (reset = false) => {
      if (state.controller instanceof AbortController) {
        state.controller.abort();
      }

      const requestId = state.requestId + 1;
      state.requestId = requestId;
      const controller = new AbortController();
      state.controller = controller;
      state.loading = true;
      if (refresh instanceof HTMLButtonElement) {
        refresh.disabled = true;
      }

      if (reset) {
        state.page = 1;
        state.items = [];
        list.innerHTML = `
          <div class="col-span-full rounded-2xl border border-dashed border-[color:var(--wp-border)] bg-[color:var(--wp-surface-2)] p-6 text-sm text-slate-500">
            Memuat media...
          </div>
        `;
      }

      const params = new URLSearchParams({
        page: String(state.page),
        limit: "12",
        q: state.query,
        type: state.type
      });

      try {
        const response = await fetch(`/admin/media/api?${params.toString()}`, {
          credentials: "same-origin",
          signal: controller.signal,
          headers: {
            "x-csrf-token": csrfToken
          }
        });

        if (!response.ok) {
          throw new Error("Gagal memuat media");
        }

        const data = await response.json();
        const items = Array.isArray(data.items) ? data.items : [];
        if (requestId !== state.requestId) {
          return;
        }
        state.total = Number(data.total) || 0;
        state.hasMore = Boolean(data.hasMore);
        state.items = reset ? items : [...state.items, ...items];
        renderItems(items, !reset);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (requestId !== state.requestId) {
          return;
        }

        const message = error instanceof Error ? error.message : "Gagal memuat media";
        setStatus(message);
        window.CMS_NOTIFY?.error(message);
        list.innerHTML = `
          <div class="col-span-full rounded-2xl border border-dashed border-[color:var(--wp-border)] bg-[color:var(--wp-surface-2)] p-6 text-sm text-slate-500">
            ${escapeHtml(message)}
          </div>
        `;
      } finally {
        if (requestId !== state.requestId) {
          return;
        }

        state.loading = false;
        state.controller = null;
        if (refresh instanceof HTMLButtonElement) {
          refresh.disabled = false;
        }
        if (loadMore instanceof HTMLButtonElement) {
          loadMore.disabled = false;
        }
      }
    };

    list.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button = target.closest("[data-media-action]");
      if (!(button instanceof HTMLElement)) {
        return;
      }

      try {
        const mediaId = button.getAttribute("data-media-id") || "";
        const media = state.items.find((item) => item.id === mediaId);
        if (!media) {
          throw new Error("Media not found");
        }
        if (button.getAttribute("data-media-action") === "thumbnail" && media.kind === "image") {
          insertMedia(media);
          return;
        }

        if (button.getAttribute("data-media-action") === "banner" && media.kind === "image") {
          insertMedia(media);
          return;
        }

        if (button.getAttribute("data-media-action") === "insert-linked" && media.kind === "image") {
          const linkUrl = promptForImageLinkUrl(media.fileName || "gambar");
          if (!linkUrl) {
            return;
          }

          insertIntoContent(buildMediaInsertHtml({ ...media, linkUrl }));
          window.CMS_NOTIFY?.success("Gambar berhasil dimasukkan sebagai link.");
          return;
        }

        if (button.getAttribute("data-media-action") === "insert") {
          insertMedia(media);
        }
      } catch {
        window.CMS_NOTIFY?.error("Media tidak dapat diproses.");
      }
    });

    search?.addEventListener("input", () => {
      state.query = search instanceof HTMLInputElement ? search.value.trim() : "";
      load(true);
    });

    type?.addEventListener("change", () => {
      state.type = type instanceof HTMLSelectElement ? type.value : "all";
      load(true);
    });

    refresh?.addEventListener("click", () => load(true));
    loadMore?.addEventListener("click", () => {
      if (!state.hasMore) {
        return;
      }
      state.page += 1;
      load(false);
    });

    closeButtons.forEach((button) => {
      button.addEventListener("click", close);
    });

    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        close();
      }
    });

    modal.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (target.matches("[data-media-picker-close]")) {
        close();
      }
    });

    window.CMS_MEDIA_PICKER = {
      open
    };
  };

  setupMediaPicker();

  document.querySelectorAll("[data-media-picker-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-media-picker-open") || "content";
      const bannerItemId = button.getAttribute("data-banner-item-id") || "";
      window.CMS_MEDIA_PICKER?.open(target, bannerItemId);
    });
  });

  document.querySelectorAll("[data-content-media-pick]").forEach((button) => {
    button.addEventListener("click", () => {
      const fileInput = document.querySelector("[data-content-media-file]");
      if (fileInput instanceof HTMLInputElement) {
        fileInput.click();
      }
    });
  });

  document.addEventListener(
    "submit",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLFormElement) || !isCrudForm(target)) {
        return;
      }

      if (target.dataset.crudConfirmed === "true") {
        target.dataset.crudConfirmed = "false";
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      openConfirmDialog({ form: target, submitter: event.submitter, sourceElement: target });
    },
    true
  );

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const link = target.closest("[data-confirm-link]");
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    openConfirmDialog({
      linkHref: link.href,
      linkLabel: String(link.getAttribute("data-confirm-label") || link.textContent || "aksi").trim(),
      sourceElement: link
    });
  }, true);
});
