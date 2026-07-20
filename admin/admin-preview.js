(function () {
  var VIEWPORTS = {
    mobile: { label: "Mobile", width: 375 },
    tablet: { label: "Tablet", width: 768 },
    desktop: { label: "Desktop", width: 1200 },
  };

  var modal = null;
  var lastFocused = null;
  var currentViewport = "desktop";
  var bound = false;

  function $(id) {
    return document.getElementById(id);
  }

  function isEditorRoute() {
    return /\/entries\/|\/new$/.test(location.hash || "");
  }

  function getPreviewData() {
    var data = window.AdminImport && window.AdminImport.readDraftData ? window.AdminImport.readDraftData() : {};
    if (!data || typeof data !== "object") data = {};

    var titleInput = $("admin-editor-title-input");
    if (titleInput && titleInput.value.trim()) {
      data = Object.assign({}, data, { title: titleInput.value.trim() });
    }

    return data;
  }

  function getCollectionId() {
    if (window.AdminComposer && window.AdminComposer.getActiveCollection) {
      return window.AdminComposer.getActiveCollection() || window.AdminComposer.getPreferredCollection();
    }
    var match = (location.hash || "").match(/\/collections\/([^/?]+)/);
    return match ? match[1] : "articles";
  }

  function buildPreviewHtml() {
    if (!window.ArticleRender || !window.ArticleRender.buildArticlePreview) {
      return "<!DOCTYPE html><html><body><p>Preview renderer failed to load.</p></body></html>";
    }
    return window.ArticleRender.buildArticlePreview(getPreviewData(), getCollectionId());
  }

  function getFocusableElements(container) {
    if (!container) return [];
    return Array.prototype.slice
      .call(
        container.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      )
      .filter(function (el) {
        return !el.hidden && el.offsetParent !== null;
      });
  }

  function trapFocus(event) {
    if (!modal || modal.hidden || event.key !== "Tab") return;
    var panel = modal.querySelector(".admin-preview-modal__panel");
    var focusable = getFocusableElements(panel);
    if (!focusable.length) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onKeydown(event) {
    if (!modal || modal.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closePreview();
      return;
    }
    trapFocus(event);
  }

  function ensureModal() {
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "admin-preview-modal";
    modal.className = "admin-preview-modal";
    modal.hidden = true;
    modal.innerHTML =
      '<div class="admin-preview-modal__backdrop" data-preview-close></div>' +
      '<div class="admin-preview-modal__panel" role="dialog" aria-modal="true" aria-labelledby="admin-preview-title">' +
      '<header class="admin-preview-modal__header">' +
      '<div class="admin-preview-modal__heading">' +
      '<h2 id="admin-preview-title" class="admin-preview-modal__title">Article preview</h2>' +
      '<p class="admin-preview-modal__hint">Shows your current draft. Save to publish changes.</p>' +
      "</div>" +
      '<div class="admin-preview-modal__toolbar">' +
      '<div class="admin-preview-viewports" role="tablist" aria-label="Preview viewport">' +
      '<button type="button" class="admin-preview-viewport" data-viewport="mobile" role="tab" aria-selected="false">Mobile</button>' +
      '<button type="button" class="admin-preview-viewport" data-viewport="tablet" role="tab" aria-selected="false">Tablet</button>' +
      '<button type="button" class="admin-preview-viewport" data-viewport="desktop" role="tab" aria-selected="true">Desktop</button>' +
      "</div>" +
      '<button type="button" class="btn-outline admin-preview-modal__refresh" id="admin-preview-refresh">Refresh</button>' +
      '<button type="button" class="admin-preview-modal__close" aria-label="Close preview">×</button>' +
      "</div>" +
      "</header>" +
      '<div class="admin-preview-modal__stage">' +
      '<div class="admin-preview-modal__frame-wrap" data-preview-frame-wrap>' +
      '<iframe class="admin-preview-modal__frame" title="Article preview" sandbox="allow-scripts allow-same-origin"></iframe>' +
      "</div>" +
      "</div>" +
      "</div>";

    document.body.appendChild(modal);

    modal.querySelectorAll("[data-preview-close]").forEach(function (el) {
      el.addEventListener("click", closePreview);
    });
    modal.querySelector(".admin-preview-modal__close").addEventListener("click", closePreview);

    modal.querySelectorAll(".admin-preview-viewport").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setViewport(btn.dataset.viewport);
      });
    });

    $("admin-preview-refresh").addEventListener("click", refreshPreview);

    document.addEventListener("keydown", onKeydown);

    return modal;
  }

  function setViewport(name) {
    if (!VIEWPORTS[name]) return;
    currentViewport = name;

    var wrap = modal.querySelector("[data-preview-frame-wrap]");
    var iframe = modal.querySelector(".admin-preview-modal__frame");
    if (!wrap || !iframe) return;

    var width = VIEWPORTS[name].width;
    wrap.dataset.viewport = name;
    wrap.style.width = name === "desktop" ? "100%" : width + "px";
    iframe.style.width = "100%";

    modal.querySelectorAll(".admin-preview-viewport").forEach(function (btn) {
      var active = btn.dataset.viewport === name;
      btn.classList.toggle("admin-preview-viewport--active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function refreshPreview() {
    if (!modal || modal.hidden) return;
    var iframe = modal.querySelector(".admin-preview-modal__frame");
    if (!iframe) return;
    iframe.srcdoc = buildPreviewHtml();
  }

  function openPreview() {
    if (!isEditorRoute()) return;
    if (!window.AdminImport || !window.AdminImport.readDraftData) return;

    ensureModal();
    lastFocused = document.activeElement;
    currentViewport = "desktop";

    refreshPreview();
    setViewport("desktop");

    modal.hidden = false;
    document.body.classList.add("admin-preview-modal-open");

    var closeBtn = modal.querySelector(".admin-preview-modal__close");
    if (closeBtn) closeBtn.focus();
  }

  function closePreview() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("admin-preview-modal-open");
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
    lastFocused = null;
  }

  function syncPreviewButton() {
    var btn = $("admin-preview-btn");
    if (!btn) return;
    btn.hidden = !isEditorRoute();
  }

  function bindPreviewUi() {
    if (bound) return;
    bound = true;

    var btn = $("admin-preview-btn");
    if (btn) {
      btn.addEventListener("click", openPreview);
    }

    window.addEventListener("hashchange", syncPreviewButton);
    syncPreviewButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindPreviewUi);
  } else {
    bindPreviewUi();
  }

  window.AdminPreview = {
    open: openPreview,
    close: closePreview,
    refresh: refreshPreview,
  };
})();
