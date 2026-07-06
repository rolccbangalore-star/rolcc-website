(function () {
  var COLLECTION_LABELS = {
    "everyday-faith": "Sermon Summary",
    "back-to-bible": "Back to the Bible",
  };
  var entryCache = Object.create(null);
  var cardManifest = null;
  var cardManifestPromise = null;
  var mediaManifest = null;
  var mediaManifestPromise = null;
  var mediaPages = null;
  var mediaPagesPromise = null;
  var enhanceTimer = null;
  var editorState = {
    syncingTitle: false,
    dirty: false,
    snapshot: "",
    formBound: false,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function normalize(text) {
    return (text || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function getHash() {
    return location.hash || "";
  }

  function normalizePath(href) {
    return (href || "").replace(/^#/, "");
  }

  function isEditorRoute() {
    return /\/entries\/|\/new$/.test(getHash());
  }

  function isCollectionRoute() {
    return getHash().indexOf("/collections/") !== -1 && !isEditorRoute();
  }

  function isMediaRoute() {
    return getHash().indexOf("/media") !== -1;
  }

  function getActiveCollection() {
    var match = getHash().match(/\/collections\/([^/?]+)/);
    return match ? match[1] : "";
  }

  function isLoginView(root) {
    if (!root) return true;
    var loginBtn = root.querySelector('button[class*="LoginButton"]');
    if (!loginBtn || normalize(loginBtn.textContent).indexOf("github") === -1) return false;
    if (loginBtn.hidden) return false;
    var btnStyle = window.getComputedStyle(loginBtn);
    return btnStyle.display !== "none" && btnStyle.visibility !== "hidden";
  }

  function getMediaPane() {
    return document.getElementById("admin-media-pane");
  }

  function syncMediaPaneLayout(root) {
    var pane = getMediaPane();
    var ncRoot = root || $("nc-root");
    if (!pane || !ncRoot) return;

    var showPane = isMediaRoute() && !isLoginView(ncRoot);
    var uploadOpen = ncRoot.dataset.adminMediaUploadOpen === "true";
    pane.hidden = !showPane;
    ncRoot.classList.toggle("admin-workspace--media-background", showPane && !uploadOpen);
    ncRoot.classList.toggle("admin-workspace--media-upload", showPane && uploadOpen);
  }

  function cleanupLegacyEditorShell(root) {
    var shell = document.getElementById("admin-editor-split-shell");
    if (shell) shell.remove();
    document.body.classList.remove("admin-page--editor-split", "admin-page--editor-split-ready");
    if (!root) return;
    root.querySelectorAll(".admin-editor-grid-header, .admin-editor-columns").forEach(function (el) {
      el.remove();
    });
    root.querySelectorAll(".admin-field--meta, .admin-field--content").forEach(function (el) {
      el.classList.remove("admin-field--meta", "admin-field--content", "admin-field--title-synced");
      el.style.removeProperty("grid-column");
      el.style.removeProperty("order");
    });
    root.querySelectorAll(".admin-editor-grid-pass-through, .admin-editor-grid-pane, .admin-editor-mount").forEach(function (el) {
      el.classList.remove("admin-editor-grid-pass-through", "admin-editor-grid-pane", "admin-editor-mount");
      delete el.dataset.adminGridLayout;
      delete el.dataset.adminLayout;
    });
    root.querySelectorAll(".admin-editor-decap-hidden").forEach(function (el) {
      el.classList.remove("admin-editor-decap-hidden");
      el.removeAttribute("aria-hidden");
    });
    root.querySelectorAll("form.admin-editor-form, main.admin-editor-split-active").forEach(function (el) {
      el.classList.remove("admin-editor-form", "admin-editor-split-active");
    });
  }

  function formatDate(iso) {
    if (!iso) return "";
    var value = String(iso);
    if (value.indexOf("T") !== -1) value = value.split("T")[0];
    var parts = value.split("-");
    if (parts.length !== 3) return value;
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return parseInt(parts[2], 10) + " " + months[parseInt(parts[1], 10) - 1] + " " + parts[0];
  }

  function parseModifiedHeader(header) {
    if (!header) return "";
    var parsed = new Date(header);
    if (isNaN(parsed.getTime())) return "";
    return parsed.toISOString().split("T")[0];
  }

  function getDisplayDate(data) {
    if (!data || data.publish === false) return "";
    return formatDate(data.modified || data.date);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setTooltip(el, text) {
    if (!el || !text) return;
    el.setAttribute("title", text);
    el.setAttribute("aria-label", text);
    el.setAttribute("data-tooltip", text);
  }

  function loadCardManifest() {
    if (cardManifest) return Promise.resolve(cardManifest);
    if (cardManifestPromise) return cardManifestPromise;
    cardManifestPromise = fetch("/data/articles/composer-cards.json")
      .then(function (res) {
        if (!res.ok) throw new Error("missing manifest");
        return res.json();
      })
      .then(function (data) {
        cardManifest = data || {};
        return cardManifest;
      })
      .catch(function () {
        cardManifest = {};
        return cardManifest;
      });
    return cardManifestPromise;
  }

  function getManifestEntry(collection, slug) {
    if (!cardManifest || !cardManifest[collection]) return null;
    return cardManifest[collection][slug] || null;
  }

  function loadMediaManifest() {
    if (mediaManifest) return Promise.resolve(mediaManifest);
    if (mediaManifestPromise) return mediaManifestPromise;
    mediaManifestPromise = fetch("/data/media/manifest.json")
      .then(function (res) {
        if (!res.ok) throw new Error("missing media manifest");
        return res.json();
      })
      .then(function (data) {
        mediaManifest = Array.isArray(data) ? data : [];
        return mediaManifest;
      })
      .catch(function () {
        mediaManifest = [];
        return mediaManifest;
      });
    return mediaManifestPromise;
  }

  function loadMediaPages() {
    if (mediaPages) return Promise.resolve(mediaPages);
    if (mediaPagesPromise) return mediaPagesPromise;
    mediaPagesPromise = fetch("/data/media/pages.json")
      .then(function (res) {
        if (!res.ok) throw new Error("missing media pages");
        return res.json();
      })
      .then(function (data) {
        mediaPages = Array.isArray(data) ? data : [];
        return mediaPages;
      })
      .catch(function () {
        mediaPages = [{ id: "all", label: "All pages" }];
        return mediaPages;
      });
    return mediaPagesPromise;
  }

  function getMediaPageFilter(root) {
    root = root || getComposerRoot();
    return (root && root.dataset.adminMediaPage) || "all";
  }

  function setMediaPageFilter(root, pageId) {
    if (!root) return;
    root.dataset.adminMediaPage = pageId || "all";
  }

  function getMediaSourceFilter(root) {
    root = root || getComposerRoot();
    return (root && root.dataset.adminMediaSource) || "all";
  }

  function setMediaSourceFilter(root, sourceId) {
    if (!root) return;
    root.dataset.adminMediaSource = sourceId || "all";
  }

  function isMediaListView(root) {
    root = root || getComposerRoot();
    return root && root.dataset.adminMediaViewMode === "list";
  }

  function setMediaViewMode(root, mode) {
    if (!root) return;
    root.dataset.adminMediaViewMode = mode === "list" ? "list" : "grid";
  }

  function hideDecapMediaNotFound(root) {
    if (!isMediaRoute()) return;
    root.querySelectorAll("h1, h2, p, span").forEach(function (el) {
      if (el.closest(".admin-media-workspace")) return;
      if (el.children.length > 0) return;
      if (normalize(el.textContent) !== "not found") return;

      var hide = el;
      while (
        hide.parentElement &&
        hide.parentElement.tagName !== "MAIN" &&
        hide.parentElement !== root &&
        hide.parentElement.children.length === 1
      ) {
        hide = hide.parentElement;
      }
      if (
        hide &&
        !hide.classList.contains("admin-media-workspace") &&
        hide.tagName !== "MAIN" &&
        !hide.closest(".admin-media-workspace")
      ) {
        hide.classList.add("admin-decap-media-hidden");
      }
    });
  }

  function copyText(value) {
    if (!value) return Promise.resolve();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value);
    }
    return new Promise(function (resolve) {
      var input = document.createElement("textarea");
      input.value = value;
      input.setAttribute("readonly", "");
      input.style.position = "absolute";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      input.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        /* ignore */
      }
      document.body.removeChild(input);
      resolve();
    });
  }

  function preserveDecapMediaTab(root) {
    var tabs = getHeaderTabs(root);
    if (!tabs.media || tabs.media.dataset.adminPreserved === "true") return;
    tabs.media.dataset.adminPreserved = "true";
    tabs.media.classList.add("admin-decap-media-tab");
    tabs.media.setAttribute("aria-hidden", "true");
    tabs.media.setAttribute("tabindex", "-1");
    tabs.media.style.cssText =
      "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none;";
  }

  function scheduleEnhance(root, fn) {
    if (enhanceTimer) window.clearTimeout(enhanceTimer);
    enhanceTimer = window.setTimeout(function () {
      fn(root);
    }, 16);
  }

  function getHeaderTabs(root) {
    var tabs = { contents: null, media: null };
    root.querySelectorAll("header button, header [role='tab']").forEach(function (btn) {
      var text = normalize(btn.textContent);
      if (text === "contents") tabs.contents = btn;
      if (text === "media") tabs.media = btn;
    });
    return tabs;
  }

  function getDecapSearchInput(root) {
    var ours = $("admin-search-input");
    var candidates = root.querySelectorAll('input[type="search"], input[type="text"]');
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] !== ours) return candidates[i];
    }
    return null;
  }

  function mountSearch(root) {
    var searchInput = $("admin-search-input");
    if (!searchInput || searchInput.dataset.bound === "true") return;
    searchInput.dataset.bound = "true";
    searchInput.setAttribute("placeholder", "Search for an article");
    searchInput.setAttribute("aria-label", "Search for an article");

    var decapInput = getDecapSearchInput(root);
    if (decapInput) {
      decapInput.hidden = true;
      decapInput.setAttribute("tabindex", "-1");
      searchInput.addEventListener("input", function () {
        decapInput.value = searchInput.value;
        decapInput.dispatchEvent(new Event("input", { bubbles: true }));
        decapInput.dispatchEvent(new Event("change", { bubbles: true }));
        var container = root.querySelector(".admin-custom-entries");
        if (container) delete container.dataset.adminSignature;
        scheduleEnhance(root, enhance);
      });
      return;
    }

    searchInput.addEventListener("input", function () {
      var root = $("nc-root");
      var container = root && root.querySelector(".admin-custom-entries");
      if (container) delete container.dataset.adminSignature;
      if (root) scheduleEnhance(root, enhance);
    });
  }

  function dockComposerMenu(wrap) {
    if (!wrap) return;
    var menu = wrap._composerMenuEl || wrap.querySelector(".admin-composer-menu__menu");
    if (!menu || menu.dataset.floating !== "true") return;
    delete menu.dataset.floating;
    menu.classList.remove("admin-composer-menu__menu--floating");
    menu.style.position = "";
    menu.style.top = "";
    menu.style.right = "";
    menu.style.left = "";
    menu.style.zIndex = "";
    menu.style.display = "";
    wrap.appendChild(menu);
  }

  function floatComposerMenu(wrap, menu, trigger) {
    if (!wrap || !menu || !trigger) return;
    var rect = trigger.getBoundingClientRect();
    menu.dataset.floating = "true";
    menu.classList.add("admin-composer-menu__menu--floating");
    menu.style.position = "fixed";
    menu.style.top = Math.round(rect.bottom + 6) + "px";
    menu.style.right = Math.round(window.innerWidth - rect.right) + "px";
    menu.style.left = "auto";
    menu.style.zIndex = "10000";
    menu.style.display = "block";
    wrap._composerMenuEl = menu;
    document.body.appendChild(menu);
  }

  function syncComposerDropdownBodyClass() {
    document.body.classList.toggle(
      "admin-composer-dropdown-open",
      !!document.querySelector(".admin-composer-menu.is-open")
    );
  }

  function closeAllDropdowns() {
    document.querySelectorAll(".admin-composer-menu.is-open").forEach(function (wrap) {
      wrap.classList.remove("is-open");
      var trigger = wrap.querySelector(".admin-composer-menu__trigger");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      dockComposerMenu(wrap);
    });
    document.querySelectorAll(".admin-dropdown.is-open").forEach(function (el) {
      el.classList.remove("is-open");
      var createTrigger = el.querySelector(".admin-create-dropdown__trigger");
      if (createTrigger) createTrigger.setAttribute("aria-expanded", "false");
    });
    syncComposerDropdownBodyClass();
  }

  function bindShellDropdowns() {
    var switcher = $("admin-view-switcher");
    if (!switcher || switcher.dataset.bound === "true") return;
    switcher.dataset.bound = "true";

    var trigger = switcher.querySelector(".admin-view-switcher__trigger");
    var menu = switcher.querySelector(".admin-view-switcher__menu");

    trigger.addEventListener("click", function (event) {
      event.stopPropagation();
      var open = switcher.classList.contains("is-open");
      closeAllDropdowns();
      if (!open) switcher.classList.add("is-open");
    });

    menu.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  }

  function bindShellTooltips() {
    var switcher = $("admin-view-switcher");
    if (switcher) {
      var trigger = switcher.querySelector(".admin-view-switcher__trigger");
      setTooltip(trigger, "Switch view");
    }
  }

  function wireViewSwitcher(root) {
    var switcher = $("admin-view-switcher");
    if (!switcher) return;

    var tabs = getHeaderTabs(root);
    var label = switcher.querySelector(".admin-view-switcher__label");
    if (label) label.textContent = isMediaRoute() ? "Media" : "Contents";

    switcher.querySelector('[data-view="contents"]').onclick = function () {
      closeAllDropdowns();
      if (label) label.textContent = "Contents";
      tabs = getHeaderTabs(root);
      if (tabs.contents) tabs.contents.click();
      else location.hash = "#/collections/everyday-faith";
      scheduleEnhance(root, enhance);
    };

    switcher.querySelector('[data-view="media"]').onclick = function () {
      closeAllDropdowns();
      if (label) label.textContent = "Media";
      if (location.hash !== "#/media") location.hash = "#/media";
      tabs = getHeaderTabs(root);
      if (tabs.media) tabs.media.click();
      scheduleEnhance(root, enhance);
    };
  }

  function markActiveNavLinks() {
    var collection = getActiveCollection();
    document.querySelectorAll(".admin-sidebar-link[data-collection]").forEach(function (link) {
      link.classList.toggle("admin-sidebar-link--active", link.getAttribute("data-collection") === collection);
    });
    syncMediaSidebarPages();
  }

  function syncMediaSidebarPages() {
    var root = getComposerRoot();
    var pagesNav = document.getElementById("admin-media-pages-nav");
    var collectionsNav = document.querySelector(".admin-sidebar-nav--collections");
    var collectionsLabel = document.querySelector(".admin-sidebar-section-label--collections");
    var pagesLabel = document.querySelector(".admin-sidebar-section-label--pages");
    var onMedia = isMediaRoute() && root && !isLoginView(root);
    var pageId = getMediaPageFilter(root);

    if (collectionsNav) collectionsNav.hidden = onMedia;
    if (collectionsLabel) collectionsLabel.hidden = onMedia;
    if (pagesNav) pagesNav.hidden = !onMedia;
    if (pagesLabel) pagesLabel.hidden = !onMedia;

    if (!pagesNav || !onMedia) return;

    pagesNav.querySelectorAll(".admin-sidebar-link[data-media-page]").forEach(function (link) {
      link.classList.toggle("admin-sidebar-link--active", link.getAttribute("data-media-page") === pageId);
    });
  }

  function mountMediaSidebarPages(root) {
    var pagesNav = document.getElementById("admin-media-pages-nav");
    if (!pagesNav || pagesNav.dataset.bound === "true") return;

    loadMediaPages().then(function (pages) {
      pagesNav.dataset.bound = "true";
      pagesNav.textContent = "";
      pages
        .filter(function (page) {
          if (page.id === "all" || page.id === "unassigned") return true;
          if (page.label && page.label.indexOf("Article:") === 0) return false;
          if (page.label && (page.label.indexOf("/") !== -1 || /\.json$/i.test(page.label))) return false;
          return true;
        })
        .forEach(function (page) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "admin-sidebar-link admin-sidebar-link--page";
        btn.dataset.mediaPage = page.id;
        btn.innerHTML =
          '<svg class="admin-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>' +
          '<span class="admin-sidebar-link__text">' +
          escapeHtml(page.label) +
          "</span>";
        btn.addEventListener("click", function (event) {
          event.stopPropagation();
          setMediaPageFilter(root, page.id);
          var container = pagesNav.closest("aside");
          if (container) {
            container.querySelectorAll(".admin-sidebar-link--page").forEach(function (link) {
              link.classList.toggle("admin-sidebar-link--active", link === btn);
            });
          }
          renderMediaWorkspace(root);
        });
        pagesNav.appendChild(btn);
      });
      syncMediaSidebarPages();
    });
  }

  function mountCustomShell(root) {
    var topbar = $("admin-topbar");
    var sidebar = $("admin-sidebar");
    var body = document.body;
    var onEditor = isEditorRoute();

    if (isLoginView(root)) {
      body.classList.remove("admin-page--authed", "admin-page--editor");
      if (topbar) topbar.hidden = true;
      if (sidebar) sidebar.hidden = true;
      return;
    }

    body.classList.add("admin-page--authed");
    body.classList.toggle("admin-page--editor", onEditor);
    if (topbar) topbar.hidden = false;
    if (sidebar) sidebar.hidden = onEditor;

    bindShellDropdowns();
    bindShellTooltips();
    wireViewSwitcher(root);
    markActiveNavLinks();
    mountMediaSidebarPages(root);
    if (!onEditor) mountSearch(root);
    mountProfileButton(root);
    mountEditorTopbar(root);
    preserveDecapMediaTab(root);

    applyDecapLayoutFixes(root);
  }

  function findDecapTitleInput(root) {
    if (!root) return null;
    var main = root.querySelector("main");
    if (!main) return null;
    var controls = main.querySelectorAll("label");
    for (var i = 0; i < controls.length; i++) {
      var label = controls[i];
      if (normalize(label.textContent) !== "title") continue;
      var wrap = label.closest("div");
      if (!wrap) continue;
      var input = wrap.querySelector('input[type="text"], textarea');
      if (input) return input;
    }
    return null;
  }

  function setInputValue(input, value) {
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function getEditorTitleValue(root) {
    var decapTitle = findDecapTitleInput(root);
    return decapTitle ? decapTitle.value.trim() : "";
  }

  function syncTitleFromHeader(root) {
    var headerInput = $("admin-editor-title-input");
    var decapTitle = findDecapTitleInput(root);
    if (!headerInput || !decapTitle || editorState.syncingTitle) return;
    editorState.syncingTitle = true;
    setInputValue(decapTitle, headerInput.value);
    editorState.syncingTitle = false;
  }

  function syncTitleFromDecap(root) {
    var headerInput = $("admin-editor-title-input");
    var decapTitle = findDecapTitleInput(root);
    if (!headerInput || !decapTitle || editorState.syncingTitle) return;
    editorState.syncingTitle = true;
    headerInput.value = decapTitle.value;
    editorState.syncingTitle = false;
  }

  function updateEditorStatusLabel() {
    var status = $("admin-editor-status");
    if (!status) return;
    if (editorState.dirty) {
      status.textContent = "Unsaved changes";
      status.classList.add("admin-editor-status--dirty");
    } else {
      status.textContent = "";
      status.classList.remove("admin-editor-status--dirty");
    }
  }

  function captureEditorSnapshot(root) {
    var form = root && root.querySelector("main form");
    if (!form) return "";
    return new FormData(form).toString();
  }

  function mountEditorDirtyWatcher(root) {
    var form = root.querySelector("main form");
    if (!form || form.dataset.adminDirtyBound === "true") return;
    form.dataset.adminDirtyBound = "true";

    function refreshSnapshot() {
      editorState.snapshot = captureEditorSnapshot(root);
      editorState.dirty = false;
      updateEditorStatusLabel();
    }

    window.setTimeout(refreshSnapshot, 400);

    form.addEventListener(
      "input",
      function () {
        if (editorState.syncingTitle) return;
        var current = captureEditorSnapshot(root);
        editorState.dirty = current !== editorState.snapshot;
        updateEditorStatusLabel();
      },
      true
    );

    form.addEventListener(
      "change",
      function () {
        var current = captureEditorSnapshot(root);
        editorState.dirty = current !== editorState.snapshot;
        updateEditorStatusLabel();
      },
      true
    );

    form.addEventListener("click", function (event) {
      var btn = event.target.closest("button");
      if (!btn) return;
      var label = normalize(btn.textContent);
      if (label.indexOf("publish") !== -1 || label.indexOf("save") !== -1 || label.indexOf("saved") !== -1) {
        window.setTimeout(refreshSnapshot, 800);
      }
    });
  }

  function findDecapPublishButton(root) {
    if (!root) return null;
    var candidates = root.querySelectorAll("main button, main a.btn, main a[class*='Button']");
    for (var i = 0; i < candidates.length; i++) {
      var btn = candidates[i];
      var text = normalize(btn.textContent);
      if (text === "publish" || text === "publish now" || text === "save" || text.indexOf("publish") === 0) {
        return btn;
      }
    }
    return null;
  }

  function relocatePublishButton(root) {
    var slot = $("admin-publish-slot");
    if (!slot) return;
    var btn = findDecapPublishButton(root);
    if (!btn) {
      slot.hidden = true;
      return;
    }
    btn.classList.add("btn-primary");
    btn.classList.remove("btn-outline");
    if (btn.parentElement !== slot) slot.appendChild(btn);
    slot.hidden = false;
  }

  function hideDecapEditorChrome(root) {
    var main = root.querySelector("main");
    if (!main) return;

    main.querySelectorAll("button").forEach(function (btn) {
      var text = normalize(btn.textContent);
      if (text === "delete" || text === "delete entry") {
        btn.classList.add("admin-editor-controls-hidden");
      }
    });

    main.querySelectorAll("a").forEach(function (link) {
      var text = normalize(link.textContent);
      if (text.indexOf("back") === 0 && link.getAttribute("href") && link.getAttribute("href").indexOf("collections") !== -1) {
        link.classList.add("admin-editor-controls-hidden");
      }
    });
  }

  function mountEditorTopbar(root) {
    var onEditor = isEditorRoute() && !isLoginView(root);
    var searchWrap = $("admin-search-wrap");
    var titleBlock = $("admin-editor-title-block");
    var importBtn = $("admin-import-btn");
    var websiteLink = document.querySelector(".admin-website-link");

    if (searchWrap) searchWrap.hidden = onEditor;
    if (titleBlock) titleBlock.hidden = !onEditor;
    if (importBtn) importBtn.hidden = !onEditor;
    if (websiteLink) websiteLink.hidden = onEditor;

    if (!onEditor) return;

    var headerInput = $("admin-editor-title-input");
    if (headerInput && headerInput.dataset.bound !== "true") {
      headerInput.dataset.bound = "true";
      headerInput.addEventListener("input", function () {
        syncTitleFromHeader(root);
        editorState.dirty = true;
        updateEditorStatusLabel();
      });
    }

    syncTitleFromDecap(root);
    relocatePublishButton(root);
    mountEditorDirtyWatcher(root);
    hideDecapEditorChrome(root);
  }

  function mountEditorSubheader(root) {
    if (!isEditorRoute()) {
      var stale = root.querySelector(".admin-editor-subheader");
      if (stale) stale.remove();
      return;
    }

    var main = root.querySelector("main");
    if (!main) return;

    var collection = getActiveCollection();
    var sub = main.querySelector(".admin-editor-subheader");
    if (!sub) {
      sub = document.createElement("div");
      sub.className = "admin-editor-subheader";
      main.insertBefore(sub, main.firstChild);
    }

    var backHref = "#/collections/" + (collection || "everyday-faith");
    sub.innerHTML =
      '<a href="' +
      backHref +
      '" class="admin-editor-back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>Back</a>' +
      '<span class="admin-editor-type-badge">' +
      escapeHtml(COLLECTION_LABELS[collection] || "Article") +
      "</span>";
  }

  function mountEditorChrome(root) {
    if (!isEditorRoute() || isLoginView(root)) {
      var stale = root.querySelector(".admin-editor-subheader");
      if (stale) stale.remove();
      return;
    }
    mountEditorSubheader(root);
  }

  function mountProfileButton(root) {
    var profileSlot = $("admin-profile-slot");
    if (!profileSlot) return;

    var profile =
      root.querySelector("header .admin-user-menu") ||
      root.querySelector("header button[aria-haspopup='true']") ||
      root.querySelector("header button");

    if (profile && profile.parentElement !== profileSlot) {
      profile.classList.add("admin-user-menu");
      profileSlot.appendChild(profile);
    }

    var btn = profileSlot.querySelector("button");
    if (!btn) return;

    btn.classList.add("admin-logout-btn");
    if (btn.dataset.adminLogoutStyled !== "true") {
      btn.dataset.adminLogoutStyled = "true";
      btn.innerHTML = LOGOUT_ICON;
    }
    setTooltip(btn, "Log out");
  }

  function applyDecapLayoutFixes(root) {
    var shell = root.querySelector(":scope > div > div");
    if (shell) shell.classList.add("admin-decap-shell");

    root.querySelectorAll("main").forEach(function (main) {
      main.classList.add("admin-main");
    });

    var node = root.querySelector("main");
    while (node && node !== root) {
      if (node.tagName === "DIV") {
        node.classList.add("admin-content-wrap");
        node.style.maxWidth = "none";
        node.style.width = "100%";
      }
      node = node.parentElement;
    }
  }

  function updateViewClass(root) {
    var body = document.body;
    root.classList.remove("admin-view--login", "admin-view--collection", "admin-view--editor", "admin-view--media");
    body.classList.remove("admin-page--media", "admin-page--editor");

    if (isLoginView(root)) {
      root.classList.add("admin-view--login");
      return;
    }
    if (isEditorRoute()) {
      root.classList.add("admin-view--editor");
      body.classList.add("admin-page--editor");
    }
    if (isMediaRoute()) {
      root.classList.add("admin-view--media");
      body.classList.add("admin-page--media");
      cleanupLegacyEditorShell(root);
    }
    if (isCollectionRoute()) root.classList.add("admin-view--collection");
    syncMediaPaneLayout(root);
    syncMediaSidebarPages();
  }

  var CREATE_ICON =
    '<svg class="admin-create-article__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  var LOGOUT_ICON =
    '<svg class="admin-logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>';
  var PLACEHOLDER_THUMB =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="m21 17-5.5-5.5a1.5 1.5 0 0 0-2.12 0L8 17"/></svg>';

  function navigateToNewArticle(collection) {
    var target = "#/collections/" + collection + "/new";
    var ncRoot = getComposerRoot();
    var decapNew =
      ncRoot && ncRoot.querySelector('a[href*="/collections/' + collection + '/new"]');
    if (decapNew) {
      decapNew.click();
      return;
    }
    if (location.hash !== target) location.hash = target;
  }

  function mountCreateButton(root) {
    var createSlot = $("admin-create-slot");
    if (!createSlot) return;

    if (isLoginView(root)) {
      createSlot.hidden = true;
      return;
    }

    var wrap = createSlot.querySelector(".admin-create-dropdown");
    if (!wrap) {
      createSlot.textContent = "";
      wrap = document.createElement("div");
      wrap.className = "admin-create-dropdown admin-dropdown";

      var trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "admin-create-article btn-primary admin-create-dropdown__trigger";
      trigger.setAttribute("aria-haspopup", "true");
      trigger.setAttribute("aria-expanded", "false");
      trigger.innerHTML = CREATE_ICON + "Create Article";
      setTooltip(trigger, "Create Article");

      var menu = document.createElement("div");
      menu.className = "admin-create-dropdown__menu admin-dropdown__menu";
      menu.setAttribute("role", "menu");

      [
        { id: "everyday-faith", label: "Sermon Summary" },
        { id: "back-to-bible", label: "Back to the Bible" },
      ].forEach(function (opt) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "admin-create-dropdown__option";
        btn.dataset.collection = opt.id;
        btn.textContent = opt.label;
        btn.setAttribute("role", "menuitem");
        btn.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          wrap.classList.remove("is-open");
          trigger.setAttribute("aria-expanded", "false");
          closeAllDropdowns();
          navigateToNewArticle(opt.id);
        });
        menu.appendChild(btn);
      });

      trigger.addEventListener("click", function (event) {
        event.stopPropagation();
        var open = wrap.classList.contains("is-open");
        closeAllDropdowns();
        if (!open) {
          wrap.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
        }
      });

      menu.addEventListener("click", function (event) {
        event.stopPropagation();
      });

      wrap.appendChild(trigger);
      wrap.appendChild(menu);
      createSlot.appendChild(wrap);
    }

    createSlot.hidden = false;
  }

  function findCreateButton(main) {
    if (!main) return null;
    return main.querySelector('a[href*="/new"]') || main.querySelector("a[href*='new']");
  }

  function isIconOnlyButton(btn) {
    if (!btn || btn.tagName !== "BUTTON") return false;
    var text = normalize(btn.textContent);
    if (text.indexOf("sort by") !== -1) return false;
    return !!btn.querySelector("svg") || text.length === 0;
  }

  function isValidToolbar(node, main, h1, headerWrap) {
    if (!node || !main || !main.contains(node)) return false;
    if (node.classList.contains("admin-custom-entries")) return false;
    if (h1 && node.contains(h1)) return false;
    if (headerWrap && node.contains(headerWrap)) return false;
    return true;
  }

  function safeAppend(parent, child) {
    if (!parent || !child || parent === child) return;
    if (child.contains(parent)) return;
    if (parent.contains(child)) return;
    parent.appendChild(child);
  }

  function findControls(main) {
    if (!main) return null;

    var h1 = main.querySelector("h1");
    var headerWrap = main.querySelector(".admin-collection-header");
    var existing = main.querySelector(".admin-collection-toolbar");
    if (existing && isValidToolbar(existing, main, h1, headerWrap)) return existing;

    if (h1) {
      var topBlock = h1.closest("div");
      if (topBlock && topBlock.nextElementSibling && topBlock.nextElementSibling.querySelector("button")) {
        var sibling = topBlock.nextElementSibling;
        if (isValidToolbar(sibling, main, h1, headerWrap)) return sibling;
      }
    }

    var buttons = main.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      var label = normalize(buttons[i].textContent);
      if (label.indexOf("sort by") === -1) continue;
      var wrap = buttons[i].closest("div");
      if (isValidToolbar(wrap, main, h1, headerWrap)) return wrap;
    }

    var selects = main.querySelectorAll("select");
    for (var j = 0; j < selects.length; j++) {
      var selectWrap = selects[j].closest("div");
      if (isValidToolbar(selectWrap, main, h1, headerWrap)) return selectWrap;
    }

    return null;
  }

  function findViewStyleButtons(toolbar) {
    if (!toolbar) return null;

    var toggle = toolbar.querySelector(".admin-view-toggle");
    if (toggle) {
      var styled = toggle.querySelectorAll(".admin-view-btn");
      if (styled.length >= 2) {
        return { container: toggle, list: styled[0], grid: styled[1] };
      }
    }

    var divs = toolbar.querySelectorAll("div");
    for (var i = divs.length - 1; i >= 0; i--) {
      var div = divs[i];
      if (div.closest(".admin-view-toggle")) continue;
      var btns = div.querySelectorAll(":scope > button");
      if (btns.length !== 2) continue;
      if (isIconOnlyButton(btns[0]) && isIconOnlyButton(btns[1])) {
        return { container: div, list: btns[0], grid: btns[1] };
      }
    }

    return null;
  }

  function isDecapButtonActive(btn) {
    if (!btn) return false;
    if (btn.classList.contains("admin-view-btn--active")) return true;
    if (btn.getAttribute("aria-pressed") === "true") return true;
    var color = window.getComputedStyle(btn).color || "";
    return color.indexOf("179, 185, 196") === -1 && color.indexOf("b3b9c4") === -1;
  }

  function restructureCollectionHeader(root) {
    if (!isCollectionRoute()) return;

    var main = root.querySelector("main");
    if (!main) return;

    var h1 = main.querySelector("h1");
    if (!h1) return;

    try {
    var topBlock = h1.parentElement;
    while (topBlock && topBlock.parentElement !== main && topBlock !== main) {
      if (topBlock.parentElement && topBlock.parentElement.tagName === "DIV" && topBlock.parentElement.parentElement === main) {
        topBlock = topBlock.parentElement;
        break;
      }
      topBlock = topBlock.parentElement;
    }
    if (!topBlock || topBlock === main) topBlock = h1.parentElement;

    var headerWrap = main.querySelector(".admin-collection-header");
    var controls = findControls(main);
    topBlock.classList.add("admin-collection-head");

    Array.prototype.forEach.call(topBlock.querySelectorAll("p"), function (node) {
      node.hidden = true;
    });

    if (controls && !topBlock.querySelector(".admin-composer-toolbar")) {
      controls.classList.add("admin-collection-toolbar", "admin-decap-toolbar");
      controls.hidden = true;
      controls.remove();
      controls = null;
    }

    applyCollectionTitle(main, getActiveCollection());
    ensureComposerToolbar(topBlock, root);

    topBlock.querySelectorAll('a[href*="/new"]').forEach(function (link) {
      link.remove();
    });

    if (!headerWrap) {
      headerWrap = document.createElement("div");
      headerWrap.className = "admin-collection-header";
      main.insertBefore(headerWrap, topBlock);
    }
    safeAppend(headerWrap, topBlock);
    if (headerWrap !== main.firstElementChild) {
      main.insertBefore(headerWrap, main.firstElementChild);
    }

    var staleRow = main.querySelector(".admin-collection-toolbar-row");
    if (staleRow) staleRow.remove();
    } catch (err) {
      /* layout enhancement only — never block cards */
    }
  }

  function ensureSortWrapChrome(sortWrap, anchor, options) {
    options = options || {};
    if (options.showLabel !== false && !sortWrap.querySelector(".admin-sort-label")) {
      var sortLabel = document.createElement("span");
      sortLabel.className = "admin-sort-label";
      sortLabel.textContent = "Sort by";
      sortWrap.insertBefore(sortLabel, anchor || sortWrap.firstChild);
    }

    if (!sortWrap.querySelector(".admin-sort-chevron")) {
      var chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      chevron.setAttribute("class", "admin-sort-chevron");
      chevron.setAttribute("viewBox", "0 0 24 24");
      chevron.setAttribute("fill", "none");
      chevron.setAttribute("stroke", "currentColor");
      chevron.setAttribute("stroke-width", "1.75");
      chevron.setAttribute("aria-hidden", "true");
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "m6 9 6 6 6-6");
      chevron.appendChild(path);
      sortWrap.appendChild(chevron);
    }
  }

  function styleSortControl(toolbar) {
    var select = toolbar.querySelector("select");
    if (select) {
      if (!select.classList.contains("admin-sort-select")) {
        select.classList.add("admin-sort-select");
      }

      var sortWrap = toolbar.querySelector(".admin-sort-wrap");
      if (!sortWrap) {
        sortWrap = document.createElement("div");
        sortWrap.className = "admin-sort-wrap";
        select.parentElement.insertBefore(sortWrap, select);
        sortWrap.appendChild(select);
      }

      ensureSortWrapChrome(sortWrap, select);

      if (select.parentElement !== sortWrap) {
        sortWrap.appendChild(select);
      }

      var valueEl = sortWrap.querySelector(".admin-sort-value");
      if (!valueEl) {
        valueEl = document.createElement("span");
        valueEl.className = "admin-sort-value";
        var chevron = sortWrap.querySelector(".admin-sort-chevron");
        sortWrap.insertBefore(valueEl, chevron || select);
      }

      function updateSortValue() {
        var option = select.options[select.selectedIndex];
        valueEl.textContent = option ? option.textContent.trim() : "";
      }

      if (select.dataset.sortBound !== "true") {
        select.dataset.sortBound = "true";
        select.addEventListener("change", updateSortValue);
      }
      updateSortValue();
      return;
    }

    var sortBtn = null;
    Array.prototype.forEach.call(toolbar.querySelectorAll("button"), function (btn) {
      if (sortBtn) return;
      if (normalize(btn.textContent).indexOf("sort by") !== -1) sortBtn = btn;
    });
    if (!sortBtn) return;

    sortBtn.classList.add("admin-sort-trigger");

    var dropdownWrap = sortBtn.closest(".admin-sort-wrap");
    if (!dropdownWrap) {
      dropdownWrap = document.createElement("div");
      dropdownWrap.className = "admin-sort-wrap admin-sort-wrap--dropdown";
      sortBtn.parentElement.insertBefore(dropdownWrap, sortBtn);
      dropdownWrap.appendChild(sortBtn);
    }

    ensureSortWrapChrome(dropdownWrap, sortBtn, { showLabel: false });
  }

  function bindViewModeButtons(root) {
    root.querySelectorAll(".admin-view-btn").forEach(function (btn) {
      if (btn.dataset.viewBound === "true") return;
      btn.dataset.viewBound = "true";
      btn.addEventListener("click", function () {
        var listMode = btn.classList.contains("admin-view-btn--list");
        setViewMode(root, listMode ? "list" : "grid");
        window.setTimeout(function () {
          var main = root.querySelector("main");
          var toolbar = main && main.querySelector(".admin-collection-toolbar");
          var pair = findViewStyleButtons(toolbar || main);
          if (pair) {
            markViewButton(pair.list, "list");
            markViewButton(pair.grid, "grid");
            setViewMode(root, listMode ? "list" : "grid");
          }
          var container = root.querySelector(".admin-custom-entries");
          if (container) delete container.dataset.adminSignature;
          renderCustomCollectionCards(root);
        }, 100);
      });
    });
  }

  var LIST_VIEW_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>';
  var GRID_VIEW_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';
  var UPLOAD_ICON =
    '<svg class="admin-media-upload-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>';

  function markViewButton(btn, type) {
    btn.classList.add("admin-view-btn", type === "list" ? "admin-view-btn--list" : "admin-view-btn--grid");
    if (btn.dataset.adminViewStyled !== "true") {
      btn.dataset.adminViewStyled = "true";
      btn.innerHTML = type === "list" ? LIST_VIEW_ICON : GRID_VIEW_ICON;
    }
    setTooltip(btn, type === "list" ? "List view" : "Grid view");
    btn.classList.toggle("admin-view-btn--active", isDecapButtonActive(btn));
  }

  function styleViewToggleButtons(toolbar) {
    var pair = findViewStyleButtons(toolbar);
    if (pair) {
      markViewButton(pair.list, "list");
      markViewButton(pair.grid, "grid");

      var toggle = toolbar.querySelector(".admin-view-toggle");
      if (!toggle) {
        toggle = document.createElement("div");
        toggle.className = "admin-view-toggle";
        pair.container.parentElement.insertBefore(toggle, pair.container);
      }
      if (pair.list.parentElement !== toggle) toggle.appendChild(pair.list);
      if (pair.grid.parentElement !== toggle) toggle.appendChild(pair.grid);
      if (pair.container !== toggle && pair.container.parentElement && pair.container.childElementCount === 0) {
        pair.container.remove();
      }
    }

    styleSortControl(toolbar);
  }

  function parseEntryPath(href) {
    var match = normalizePath(href).match(/collections\/([^/]+)\/entries\/([^/?#]+)/i);
    if (match) return { collection: match[1], slug: decodeURIComponent(match[2]) };

    var entryMatch = String(href || "").match(/entries\/([^/?#]+)/i);
    var collection = getActiveCollection();
    if (entryMatch && collection) {
      return { collection: collection, slug: decodeURIComponent(entryMatch[1]) };
    }

    return null;
  }

  function slugFromTitle(title) {
    return normalize(title)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function parseEntryFromLink(link) {
    if (!link) return null;

    var href = link.getAttribute("href") || link.getAttribute("to") || link.href || "";
    var parsed = parseEntryPath(href);
    if (parsed) return parsed;

    var collection = getActiveCollection();
    if (!collection) return null;

    var heading = link.querySelector("h2, h3");
    var title = heading ? heading.textContent.trim() : link.textContent.trim();
    if (!title) return null;

    if (cardManifest && cardManifest[collection]) {
      var slugs = Object.keys(cardManifest[collection]);
      var normalizedTitle = normalize(title);
      for (var i = 0; i < slugs.length; i++) {
        var entry = cardManifest[collection][slugs[i]];
        if (normalize(entry.title) === normalizedTitle) {
          return { collection: collection, slug: slugs[i] };
        }
      }

      var guessedSlug = slugFromTitle(title);
      if (guessedSlug && cardManifest[collection][guessedSlug]) {
        return { collection: collection, slug: guessedSlug };
      }
    }

    if (href) {
      var slugMatch = href.match(/\/([^/?#]+)\/?$/);
      if (slugMatch) {
        return { collection: collection, slug: decodeURIComponent(slugMatch[1]) };
      }
    }

    return null;
  }

  function cardNeedsPaint(link, listView) {
    if (listView) return !link.classList.contains("admin-list-row__link");
    return !link.querySelector(".admin-card-body");
  }

  function detectDecapGridView(main) {
    var card = main && main.querySelector("ul li a");
    if (!card) return false;
    var blocks = card.querySelectorAll(":scope > div");
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].getBoundingClientRect().height >= 120) return true;
    }
    return false;
  }

  function fetchEntry(collection, slug) {
    var key = collection + "/" + slug;
    if (entryCache[key]) return entryCache[key];
    entryCache[key] = fetch("/data/articles/" + encodeURIComponent(collection) + "/" + encodeURIComponent(slug) + ".json")
      .then(function (res) {
        if (!res.ok) throw new Error("missing");
        var modified = parseModifiedHeader(res.headers.get("Last-Modified"));
        return res.json().then(function (data) {
          if (modified) data.modified = modified;
          return data;
        });
      })
      .catch(function () {
        return null;
      });
    return entryCache[key];
  }

  function getThumbUrl(data, imageEl) {
    if (data && data.thumbnail) return data.thumbnail;
    if (!imageEl) return "";
    var bg = window.getComputedStyle(imageEl).backgroundImage;
    if (!bg || bg === "none" || bg.indexOf("url") === -1) return "";
    var match = bg.match(/url\(["']?([^"')]+)["']?\)/);
    return match ? match[1] : "";
  }

  function buildMetaLine(data) {
    var author = data.author || "ROLCC";
    if (data.publish === false) {
      return escapeHtml(author) + ' · <span class="admin-card-meta__draft">Draft</span>';
    }
    var date = getDisplayDate(data);
    return escapeHtml(author) + (date ? " · " + escapeHtml(date) : "");
  }

  function buildFallbackCardData(link, collection, slug) {
    var manifest = getManifestEntry(collection, slug);
    if (manifest) return manifest;

    var heading = link.querySelector("h2, h3");
    return {
      title: heading ? heading.textContent.trim() : link.textContent.trim() || "Untitled article",
      author: collection === "back-to-bible" ? "ROLCC Fellowship Team" : "ROLCC Pastoral Team",
      category: collection === "back-to-bible" ? "Bible Study" : "General",
      publish: true,
      date: "",
      thumbnail: "",
    };
  }

  function isListView(root) {
    if (root.dataset.adminViewMode === "list") return true;
    if (root.dataset.adminViewMode === "grid") return false;

    var main = root.querySelector("main");
    var toolbar = main && main.querySelector(".admin-collection-toolbar");
    var pair = findViewStyleButtons(toolbar || main);
    if (pair) {
      var listActive = pair.list.classList.contains("admin-view-btn--active") || isDecapButtonActive(pair.list);
      var gridActive = pair.grid.classList.contains("admin-view-btn--active") || isDecapButtonActive(pair.grid);
      if (listActive) return true;
      if (gridActive) return false;
    }

    return false;
  }

  function syncCollectionViewMode(root) {
    if (isMediaRoute()) {
      root.classList.remove("admin-view--list", "admin-view--grid");
      return;
    }
    var list = isListView(root);
    root.classList.toggle("admin-view--list", list);
    root.classList.toggle("admin-view--grid", !list);
  }

  function setViewMode(root, mode) {
    root.dataset.adminViewMode = mode;
    syncCollectionViewMode(root);
    var main = root.querySelector("main");
    var toolbar = main && main.querySelector(".admin-collection-toolbar");
    var pair = findViewStyleButtons(toolbar || main);
    if (pair) {
      pair.list.classList.toggle("admin-view-btn--active", mode === "list");
      pair.grid.classList.toggle("admin-view-btn--active", mode === "grid");
    }
  }

  function ensureListHeader(main, show) {
    if (!show) {
      var existing = main.querySelector(".admin-list-header");
      if (existing) existing.hidden = true;
      return null;
    }
    return main.querySelector(".admin-list-header");
  }

  var LIST_SORTABLE_COLUMNS = [
    { field: "title", label: "Title", className: "admin-list-header__name" },
    { field: "author", label: "Author", className: "admin-list-header__author" },
    { field: "date", label: "Date", className: "admin-list-header__date" },
    { field: "status", label: "Status", className: "admin-list-header__status" },
  ];

  function sortIndicator(root, field) {
    if (getSortField(root) !== field) return "";
    return getSortDirection(root) === "asc" ? " \u2191" : " \u2193";
  }

  function columnLabel(field) {
    if (field === "title") return "Title";
    for (var i = 0; i < LIST_SORTABLE_COLUMNS.length; i++) {
      if (LIST_SORTABLE_COLUMNS[i].field === field) return LIST_SORTABLE_COLUMNS[i].label;
    }
    return field;
  }

  function buildListHeader(root) {
    var header = document.createElement("div");
    header.className = "admin-list-header";
    header.setAttribute("role", "row");

    var titleBtn = document.createElement("button");
    titleBtn.type = "button";
    titleBtn.className = "admin-list-header__cell admin-list-header__name admin-list-header__cell--sortable";
    titleBtn.dataset.sortField = "title";
    titleBtn.textContent = "Title" + sortIndicator(root, "title");
    titleBtn.setAttribute("aria-label", "Sort by title");
    header.appendChild(titleBtn);

    var collectionCell = document.createElement("span");
    collectionCell.className = "admin-list-header__cell admin-list-header__collection";
    collectionCell.textContent = "Collection";
    header.appendChild(collectionCell);

    LIST_SORTABLE_COLUMNS.slice(1).forEach(function (col) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "admin-list-header__cell " + col.className + " admin-list-header__cell--sortable";
      btn.dataset.sortField = col.field;
      btn.textContent = col.label + sortIndicator(root, col.field);
      btn.setAttribute("aria-label", "Sort by " + col.label.toLowerCase());
      header.appendChild(btn);
    });

    header.querySelectorAll("[data-sort-field]").forEach(function (btn) {
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        toggleColumnSort(root, btn.dataset.sortField);
      });
    });

    updateListHeaderState(root, header);
    return header;
  }

  function updateListHeaderState(root, header) {
    if (!header) return;
    var activeField = getSortField(root);
    header.querySelectorAll("[data-sort-field]").forEach(function (btn) {
      var field = btn.dataset.sortField;
      btn.textContent = columnLabel(field) + sortIndicator(root, field);
      btn.classList.toggle("admin-list-header__cell--active", field === activeField);
      btn.setAttribute(
        "aria-sort",
        field === activeField ? (getSortDirection(root) === "asc" ? "ascending" : "descending") : "none"
      );
    });
  }

  var LIST_DOC_ICON =
    '<svg class="admin-list-row__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg>';

  function renderListRow(link, data, collection) {
    var typeLabel = COLLECTION_LABELS[collection] || collection;
    var isDraft = data.publish === false;
    link.textContent = "";
    link.className = "admin-list-row__link";
    link.innerHTML =
      '<span class="admin-list-row__cell admin-list-row__name">' +
      LIST_DOC_ICON +
      '<span class="admin-list-row__title">' +
      escapeHtml(data.title || "Untitled article") +
      "</span></span>" +
      '<span class="admin-list-row__cell admin-list-row__collection">' +
      escapeHtml(typeLabel) +
      "</span>" +
      '<span class="admin-list-row__cell admin-list-row__author">' +
      escapeHtml(data.author || "ROLCC") +
      "</span>" +
      '<span class="admin-list-row__cell admin-list-row__date">' +
      escapeHtml(getDisplayDate(data) || "—") +
      "</span>" +
      '<span class="admin-list-row__cell admin-list-row__status' +
      (isDraft ? " admin-list-row__status--draft" : "") +
      '">' +
      (isDraft ? "Draft" : "Published") +
      "</span>";
  }

  function renderGridCard(link, data, collection, imageEl) {
    var typeLabel = COLLECTION_LABELS[collection] || collection;
    var thumbUrl = getThumbUrl(data, imageEl);

    var thumb = document.createElement("div");
    thumb.className = "admin-card-thumb" + (thumbUrl ? "" : " admin-card-thumb--placeholder");
    if (thumbUrl) {
      thumb.style.backgroundImage = 'url("' + String(thumbUrl).replace(/"/g, "") + '")';
    } else {
      thumb.innerHTML = PLACEHOLDER_THUMB;
    }

    var body = document.createElement("div");
    body.className = "admin-card-body";

    var collectionEl = document.createElement("p");
    collectionEl.className = "admin-card-collection";
    collectionEl.textContent = typeLabel;

    var titleEl = document.createElement("h2");
    titleEl.className = "admin-card-title";
    titleEl.textContent = data.title || "Untitled article";

    var metaEl = document.createElement("p");
    metaEl.className = "admin-card-meta";
    metaEl.innerHTML = buildMetaLine(data);

    var categoryWrap = document.createElement("div");
    categoryWrap.className = "admin-card-category";
    categoryWrap.innerHTML =
      '<span class="article-tag article-tag--sm article-tag--muted">' + escapeHtml(data.category || "General") + "</span>";

    body.appendChild(collectionEl);
    body.appendChild(titleEl);
    body.appendChild(metaEl);
    body.appendChild(categoryWrap);

    link.textContent = "";
    link.appendChild(thumb);
    link.appendChild(body);
  }

  function getSearchQuery() {
    var input = $("admin-search-input");
    return input ? normalize(input.value) : "";
  }

  function matchesSearch(data, collection, query) {
    if (!query) return true;
    var hay = normalize(
      [data.title, data.author, data.category, COLLECTION_LABELS[collection], data.publish === false ? "draft" : "published"].join(" ")
    );
    return hay.indexOf(query) !== -1;
  }

  var SORT_OPTIONS = [
    { key: "modified", label: "Updated On", icon: "clock" },
    { key: "title", label: "Title", icon: "title" },
    { key: "date", label: "Date", icon: "calendar" },
    { key: "author", label: "Author", icon: "user" },
    { key: "status", label: "Status", icon: "status" },
  ];

  var MENU_ICONS = {
    clock:
      '<svg class="admin-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    title:
      '<svg class="admin-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h6"/></svg>',
    calendar:
      '<svg class="admin-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
    user:
      '<svg class="admin-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
    draft:
      '<svg class="admin-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    all:
      '<svg class="admin-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    filter:
      '<svg class="admin-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M4 5h16l-6 7v6l-4 2v-8Z"/></svg>',
    sort:
      '<svg class="admin-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="m8 9 4-4 4 4"/><path d="m8 15 4 4 4-4"/></svg>',
    status:
      '<svg class="admin-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>',
    chevron:
      '<svg class="admin-menu-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  };

  function menuIcon(name) {
    return MENU_ICONS[name] || MENU_ICONS.all;
  }

  function getComposerRoot() {
    return $("nc-root");
  }

  function getSortField(root) {
    root = root || getComposerRoot();
    return (root && root.dataset.adminSortField) || "modified";
  }

  function getSortDirection(root) {
    root = root || getComposerRoot();
    return root && root.dataset.adminSortDir === "asc" ? "asc" : "desc";
  }

  function defaultSortDirection(field) {
    if (field === "title" || field === "author" || field === "status") return "asc";
    return "desc";
  }

  function setSortState(root, field, direction) {
    root = root || getComposerRoot();
    if (!root) return;
    root.dataset.adminSortField = field;
    root.dataset.adminSortDir = direction === "asc" ? "asc" : "desc";
    updateComposerMenus(root);
  }

  function toggleColumnSort(root, field) {
    root = root || getComposerRoot();
    if (!root || !field) return;
    var current = getSortField(root);
    var direction = getSortDirection(root);
    if (current === field) {
      setSortState(root, field, direction === "asc" ? "desc" : "asc");
    } else {
      setSortState(root, field, defaultSortDirection(field));
    }
    refreshCollectionCards(root);
  }

  function getFilterKey(root) {
    root = root || getComposerRoot();
    return (root && root.dataset.adminFilterKey) || "all";
  }

  function updateComposerMenus(root) {
    root = root || getComposerRoot();
    if (!root) return;
    root.querySelectorAll(".admin-composer-menu").forEach(function (menu) {
      if (menu.classList.contains("is-open")) {
        if (menu.updateTrigger) menu.updateTrigger();
        return;
      }
      if (menu.renderMenu) menu.renderMenu();
    });
  }

  function getFilterOptions(collection) {
    var options = [
      { key: "all", label: "All articles", icon: "all" },
      { key: "draft", label: "Draft", icon: "draft" },
    ];
    var entries = cardManifest && cardManifest[collection];
    if (!entries) return options;

    var authors = {};
    Object.keys(entries).forEach(function (slug) {
      var author = entries[slug].author || "ROLCC";
      authors[author] = true;
    });

    Object.keys(authors)
      .sort()
      .forEach(function (name) {
        options.push({ key: "author:" + name, label: name, icon: "user", group: "author" });
      });

    return options;
  }

  function findMenuOption(options, key) {
    for (var i = 0; i < options.length; i++) {
      if (options[i].key === key) return options[i];
    }
    return null;
  }

  function matchesFilter(data, filterKey) {
    if (!filterKey || filterKey === "all") return true;
    if (filterKey === "draft") return data.publish === false;
    if (filterKey.indexOf("author:") === 0) {
      return (data.author || "ROLCC") === filterKey.slice(7);
    }
    return true;
  }

  function createComposerMenu(root, config) {
    var wrap = document.createElement("div");
    wrap.className = "admin-composer-menu admin-dropdown " + (config.wrapClass || "");

    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "admin-composer-menu__trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    var triggerIcon = document.createElement("span");
    triggerIcon.className = "admin-composer-menu__trigger-icon";
    triggerIcon.innerHTML = menuIcon(config.triggerIcon);

    var triggerText = document.createElement("span");
    triggerText.className = "admin-composer-menu__trigger-text";

    if (config.prefixLabel) {
      var prefix = document.createElement("span");
      prefix.className = "admin-composer-menu__prefix";
      prefix.textContent = config.prefixLabel;
      triggerText.appendChild(prefix);
    }

    var valueEl = document.createElement("span");
    valueEl.className = "admin-composer-menu__value";
    triggerText.appendChild(valueEl);

    var chevron = document.createElement("span");
    chevron.className = "admin-composer-menu__chevron";
    chevron.innerHTML = MENU_ICONS.chevron;

    trigger.appendChild(triggerIcon);
    trigger.appendChild(triggerText);
    trigger.appendChild(chevron);

    var menu = document.createElement("div");
    menu.className = "admin-composer-menu__menu";
    menu.setAttribute("role", "listbox");

    wrap.appendChild(trigger);
    wrap.appendChild(menu);

    function updateTrigger() {
      var composerRoot = getComposerRoot();
      var options = config.getOptions();
      var current = config.getValue(composerRoot);
      var match = findMenuOption(options, current);
      valueEl.textContent = match ? match.label : config.fallbackLabel || "";
    }

    function renderOptions() {
      menu.textContent = "";
      var composerRoot = getComposerRoot();
      var options = config.getOptions();
      var current = config.getValue(composerRoot);
      var lastGroup = "";

      options.forEach(function (opt) {
        if (opt.group && opt.group !== lastGroup) {
          var heading = document.createElement("p");
          heading.className = "admin-composer-menu__heading";
          heading.textContent = opt.group === "author" ? "Author" : opt.group;
          menu.appendChild(heading);
          lastGroup = opt.group;
        }

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "admin-composer-menu__option";
        btn.setAttribute("role", "option");
        btn.dataset.value = opt.key;
        if (opt.key === current) {
          btn.classList.add("admin-composer-menu__option--active");
          btn.setAttribute("aria-selected", "true");
        }
        btn.innerHTML =
          '<span class="admin-composer-menu__option-icon">' +
          menuIcon(opt.icon) +
          '</span><span class="admin-composer-menu__option-label">' +
          escapeHtml(opt.label) +
          "</span>";

        btn.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          var composerRoot = getComposerRoot();
          if (!composerRoot) return;
          config.setValue(composerRoot, opt.key);
          updateTrigger();
          dockComposerMenu(wrap);
          wrap.classList.remove("is-open");
          trigger.setAttribute("aria-expanded", "false");
          syncComposerDropdownBodyClass();
          config.onChange(composerRoot);
        });
        menu.appendChild(btn);
      });
    }

    trigger.addEventListener("click", function (event) {
      event.stopPropagation();
      var open = wrap.classList.contains("is-open");
      closeAllDropdowns();
      if (!open) {
        renderOptions();
        updateTrigger();
        wrap.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
        floatComposerMenu(wrap, menu, trigger);
        syncComposerDropdownBodyClass();
      }
    });

    menu.addEventListener("click", function (event) {
      event.stopPropagation();
    });

    wrap.renderMenu = function () {
      renderOptions();
      updateTrigger();
    };
    wrap.updateTrigger = updateTrigger;

    updateTrigger();
    setTooltip(trigger, config.prefixLabel || config.fallbackLabel || "Menu");
    return wrap;
  }

  function sortManifestSlugs(entries, slugs, sortField, sortDir) {
    var field = sortField || "modified";
    var asc = sortDir === "asc";
    var multiplier = asc ? 1 : -1;

    return slugs.slice().sort(function (a, b) {
      var ea = entries[a];
      var eb = entries[b];
      var cmp = 0;

      if (field === "title") {
        cmp = normalize(ea.title).localeCompare(normalize(eb.title));
      } else if (field === "author") {
        cmp = normalize(ea.author || "ROLCC").localeCompare(normalize(eb.author || "ROLCC"));
        if (cmp === 0) cmp = normalize(ea.title).localeCompare(normalize(eb.title));
      } else if (field === "date") {
        var da = ea.publish === false ? "" : ea.date || "";
        var db = eb.publish === false ? "" : eb.date || "";
        cmp = da.localeCompare(db);
        if (cmp === 0) cmp = normalize(ea.title).localeCompare(normalize(eb.title));
      } else if (field === "status") {
        var sa = ea.publish === false ? 1 : 0;
        var sb = eb.publish === false ? 1 : 0;
        cmp = sa - sb;
        if (cmp === 0) cmp = normalize(ea.title).localeCompare(normalize(eb.title));
      } else {
        var ma = ea.modified || ea.date || "";
        var mb = eb.modified || eb.date || "";
        cmp = ma.localeCompare(mb);
        if (cmp === 0) cmp = normalize(ea.title).localeCompare(normalize(eb.title));
      }

      return cmp * multiplier;
    });
  }

  function refreshCollectionCards(root) {
    root = root || getComposerRoot();
    if (!root) return;
    var container = root.querySelector(".admin-custom-entries");
    if (container) delete container.dataset.adminSignature;
    renderCustomCollectionCards(root);
  }

  function bindComposerViewButtons(root, toolbar) {
    toolbar.querySelectorAll(".admin-view-btn").forEach(function (btn) {
      if (btn.dataset.composerViewBound === "true") return;
      btn.dataset.composerViewBound = "true";
      btn.addEventListener("click", function () {
        var listMode = btn.classList.contains("admin-view-btn--list");
        setViewMode(root, listMode ? "list" : "grid");
        toolbar.querySelectorAll(".admin-view-btn").forEach(function (peer) {
          var isList = peer.classList.contains("admin-view-btn--list");
          peer.classList.toggle("admin-view-btn--active", listMode ? isList : !isList);
        });
        refreshCollectionCards(root);
      });
    });
  }

  function ensureComposerToolbar(topBlock, root) {
    if (!topBlock) return null;

    var collection = getActiveCollection();
    var toolbar = topBlock.querySelector(".admin-composer-toolbar");

    if (!toolbar) {
      toolbar = document.createElement("div");
      toolbar.className = "admin-collection-toolbar admin-composer-toolbar";

      var viewToggle = document.createElement("div");
      viewToggle.className = "admin-view-toggle";

      var listBtn = document.createElement("button");
      listBtn.type = "button";
      listBtn.className = "admin-view-btn admin-view-btn--list";
      listBtn.innerHTML = LIST_VIEW_ICON;
      setTooltip(listBtn, "List view");

      var gridBtn = document.createElement("button");
      gridBtn.type = "button";
      gridBtn.className = "admin-view-btn admin-view-btn--grid";
      gridBtn.innerHTML = GRID_VIEW_ICON;
      setTooltip(gridBtn, "Grid view");

      viewToggle.appendChild(listBtn);
      viewToggle.appendChild(gridBtn);

      var sortMenu = createComposerMenu(root, {
        wrapClass: "admin-composer-menu--sort",
        triggerIcon: "sort",
        prefixLabel: "Sort by",
        fallbackLabel: "Updated On",
        getOptions: function () {
          return SORT_OPTIONS;
        },
        getValue: getSortField,
        setValue: function (r, key) {
          r.dataset.adminSortField = key;
          r.dataset.adminSortDir = defaultSortDirection(key);
        },
        onChange: function (r) {
          refreshCollectionCards(r);
        },
      });

      var filterMenu = createComposerMenu(root, {
        wrapClass: "admin-composer-menu--filter",
        triggerIcon: "filter",
        prefixLabel: "Filter",
        fallbackLabel: "All articles",
        getOptions: function () {
          return getFilterOptions(getActiveCollection());
        },
        getValue: getFilterKey,
        setValue: function (r, key) {
          r.dataset.adminFilterKey = key;
        },
        onChange: function (r) {
          refreshCollectionCards(r);
        },
      });

      toolbar.appendChild(filterMenu);
      toolbar.appendChild(sortMenu);
      toolbar.appendChild(viewToggle);
      topBlock.appendChild(toolbar);
    }

    var sortMenuEl = toolbar.querySelector(".admin-composer-menu--sort");
    if (sortMenuEl && !sortMenuEl.classList.contains("is-open") && sortMenuEl.updateTrigger) {
      sortMenuEl.updateTrigger();
    }

    var filterMenuEl = toolbar.querySelector(".admin-composer-menu--filter");
    if (filterMenuEl && !filterMenuEl.classList.contains("is-open")) {
      var filterSig = getActiveCollection();
      if (filterMenuEl.dataset.filterSig !== filterSig) {
        filterMenuEl.dataset.filterSig = filterSig;
        if (filterMenuEl.renderMenu) filterMenuEl.renderMenu();
      } else if (filterMenuEl.updateTrigger) {
        filterMenuEl.updateTrigger();
      }
    }

    var listMode = isListView(root);
    toolbar.querySelector(".admin-view-btn--list").classList.toggle("admin-view-btn--active", listMode);
    toolbar.querySelector(".admin-view-btn--grid").classList.toggle("admin-view-btn--active", !listMode);

    bindComposerViewButtons(root, toolbar);
    return toolbar;
  }

  function ensureToolbarInHeader(main) {
    var head = main.querySelector(".admin-collection-head");
    if (!head) return;

    var toolbar = main.querySelector(".admin-collection-toolbar");
    if (!toolbar) {
      toolbar = findControls(main);
      if (toolbar) toolbar.classList.add("admin-collection-toolbar");
    }

    if (toolbar) {
      styleViewToggleButtons(toolbar);
      safeAppend(head, toolbar);
      toolbar.hidden = false;
      toolbar.style.display = "inline-flex";
    }
  }

  function applyCollectionTitle(main, collection) {
    var h1 = main.querySelector("h1");
    if (!h1 || !collection) return;
    if (COLLECTION_LABELS[collection]) {
      h1.textContent = COLLECTION_LABELS[collection];
    }
  }

  function hideDecapEntryLists(main) {
    Array.prototype.forEach.call(main.children, function (child) {
      if (child.classList.contains("admin-collection-header")) return;
      if (child.classList.contains("admin-custom-entries")) return;
      child.classList.add("admin-decap-hidden");
      child.hidden = true;
    });

    main.querySelectorAll("ul").forEach(function (ul) {
      if (ul.classList.contains("admin-custom-grid") || ul.classList.contains("admin-custom-list")) return;
      ul.classList.add("admin-decap-entries");
      ul.hidden = true;
    });
  }

  function showDecapEntryLists(main) {
    Array.prototype.forEach.call(main.children, function (child) {
      if (!child.classList.contains("admin-decap-hidden")) return;
      child.hidden = false;
      child.classList.remove("admin-decap-hidden");
    });
    main.querySelectorAll(".admin-decap-entries").forEach(function (ul) {
      ul.hidden = false;
      ul.classList.remove("admin-decap-entries");
    });
  }

  function placeCustomEntries(main, container) {
    var header = main.querySelector(".admin-collection-header");
    if (!header) {
      if (container.parentElement !== main) main.appendChild(container);
      return;
    }
    if (container.parentElement !== main) {
      main.insertBefore(container, header.nextSibling);
    } else if (container.previousElementSibling !== header) {
      main.insertBefore(container, header.nextSibling);
    }
  }

  function removeCustomEntries(root) {
    var main = root && root.querySelector("main");
    if (!main) return;
    var container = main.querySelector(".admin-custom-entries");
    if (container) container.remove();
    showDecapEntryLists(main);
    var header = main.querySelector(".admin-list-header");
    if (header) header.remove();
  }

  function renderCustomCollectionCards(root) {
    if (!isCollectionRoute()) {
      removeCustomEntries(root);
      return;
    }

    var main = root.querySelector("main");
    if (!main) return;

    var collection = getActiveCollection();
    if (!collection) return;

    function run() {
      restructureCollectionHeader(root);

      if (!root.dataset.adminViewMode) {
        setViewMode(root, "grid");
      }

      var listView = isListView(root);
      syncCollectionViewMode(root);
      applyCollectionTitle(main, collection);

      var entries = cardManifest && cardManifest[collection];
      if (!entries) return;

      var query = getSearchQuery();
      var sortField = getSortField(root);
      var sortDir = getSortDirection(root);
      var slugs = sortManifestSlugs(entries, Object.keys(entries), sortField, sortDir);
      var filterKey = getFilterKey(root);
      var signature =
        collection +
        "|" +
        (listView ? "list" : "grid") +
        "|" +
        sortField +
        "|" +
        sortDir +
        "|" +
        filterKey +
        "|" +
        query +
        "|" +
        slugs.join(",");

      var container = main.querySelector(".admin-custom-entries");
      if (!container) {
        container = document.createElement("div");
        container.className = "admin-custom-entries";
      }
      placeCustomEntries(main, container);

      if (container.dataset.adminSignature !== signature) {
        container.dataset.adminSignature = signature;
        container.textContent = "";

        if (listView) {
          container.appendChild(buildListHeader(root));

          var list = document.createElement("ul");
          list.className = "admin-custom-list";
          slugs.forEach(function (slug) {
            var data = entries[slug];
            if (!matchesSearch(data, collection, query)) return;
            if (!matchesFilter(data, filterKey)) return;
            var li = document.createElement("li");
            li.className = "admin-list-item admin-grid-card";
            var link = document.createElement("a");
            link.href = "#/collections/" + collection + "/entries/" + encodeURIComponent(slug);
            renderListRow(link, data, collection);
            li.appendChild(link);
            list.appendChild(li);
          });
          container.appendChild(list);
        } else {
          var grid = document.createElement("ul");
          grid.className = "admin-custom-grid";
          slugs.forEach(function (slug) {
            var data = entries[slug];
            if (!matchesSearch(data, collection, query)) return;
            if (!matchesFilter(data, filterKey)) return;
            var li = document.createElement("li");
            li.className = "admin-grid-card";
            var link = document.createElement("a");
            link.href = "#/collections/" + collection + "/entries/" + encodeURIComponent(slug);
            renderGridCard(link, data, collection, null);
            li.appendChild(link);
            grid.appendChild(li);
          });
          container.appendChild(grid);
        }
      } else if (listView) {
        updateListHeaderState(root, container.querySelector(".admin-list-header"));
      }

      container.hidden = false;
      hideDecapEntryLists(main);
      var head = main.querySelector(".admin-collection-head");
      if (head) ensureComposerToolbar(head, root);
      bindViewModeButtons(root);
    }

    loadCardManifest().then(run);
    if (cardManifest) run();
  }

  function resetEditorState() {
    editorState.dirty = false;
    editorState.snapshot = "";
    editorState.formBound = false;
    editorState.syncingTitle = false;
    var form = document.querySelector("#nc-root main form");
    if (form) delete form.dataset.adminDirtyBound;
    var headerInput = $("admin-editor-title-input");
    if (headerInput) headerInput.value = "";
    updateEditorStatusLabel();
  }

  function resetCollectionLayout(root) {
    root = root || getComposerRoot();
    if (!root) return;
    delete root.dataset.adminViewMode;
    delete root.dataset.adminFilterKey;
    delete root.dataset.adminSortField;
    delete root.dataset.adminSortDir;
    var container = root.querySelector(".admin-custom-entries");
    if (container) delete container.dataset.adminSignature;
    entryCache = Object.create(null);
  }

  function ensureMainWorkspace(root) {
    var main = root.querySelector("main");
    if (main) return main;

    var shell = root.querySelector(".admin-decap-shell") || root.querySelector(":scope > div");
    if (!shell) return null;

    main = document.createElement("main");
    main.className = "admin-main";
    shell.appendChild(main);
    return main;
  }

  function ensureMediaLibraryOpen(root) {
    if (!isMediaRoute() && root.dataset.adminMediaUploadOpen !== "true") return;
    if (root.querySelector(".ReactModal__Overlay--after-open")) return;

    preserveDecapMediaTab(root);
    var tabs = getHeaderTabs(root);
    if (tabs.media) {
      tabs.media.click();
      return;
    }

    if (getHash().indexOf("/media") === -1) {
      location.hash = "#/media";
    }
  }

  function closeMediaUploadPanel(root) {
    if (!root) return;
    root.dataset.adminMediaUploadOpen = "";
    var closeBtn = root.querySelector(
      '.admin-media-panel button[aria-label*="Close"], .admin-media-panel button[aria-label*="close"], .admin-media-panel [class*="CloseButton"]'
    );
    if (closeBtn) closeBtn.click();
    var overlay = root.querySelector(".ReactModal__Overlay");
    if (overlay) {
      overlay.classList.remove("admin-media-overlay");
      var content = overlay.querySelector(".admin-media-panel");
      if (content) content.classList.remove("admin-media-panel");
    }
    var pane = getMediaPane();
    var workspace = pane && pane.querySelector(".admin-media-workspace");
    if (workspace) {
      var panel = workspace.querySelector(".admin-media-upload-panel");
      if (panel) panel.hidden = true;
    }
    syncMediaPaneLayout(root);
  }

  function mountMediaUploadPanel(root, workspace) {
    if (!workspace) return;
    var panel = workspace.querySelector(".admin-media-upload-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "admin-media-upload-panel";
      panel.innerHTML =
        '<div class="admin-media-upload-panel__head">' +
        '<p class="admin-media-upload-panel__title">Upload article image</p>' +
        '<button type="button" class="admin-media-upload-panel__close" aria-label="Close upload panel">Close</button>' +
        "</div>" +
        '<p class="admin-media-upload-panel__note">Files are saved to <code>assets/articles/</code>. New uploads appear in the library after publish.</p>' +
        '<div class="admin-media-upload-panel__slot"></div>';
      workspace.insertBefore(panel, workspace.querySelector(".admin-media-grid") || null);
      panel.querySelector(".admin-media-upload-panel__close").addEventListener("click", function () {
        closeMediaUploadPanel(root);
        renderMediaWorkspace(root);
      });
    }

    var open = root.dataset.adminMediaUploadOpen === "true";
    panel.hidden = !open;
    if (!open) return;

    ensureMediaLibraryOpen(root);
    var slot = panel.querySelector(".admin-media-upload-panel__slot");
    var overlay = root.querySelector(".ReactModal__Overlay");
    if (!overlay) {
      window.setTimeout(function () {
        ensureMediaLibraryOpen(root);
        mountMediaUploadPanel(root, workspace);
      }, 200);
      return;
    }

    overlay.classList.add("admin-media-overlay");
    var content = overlay.querySelector(".ReactModal__Content");
    if (content) content.classList.add("admin-media-panel");
    if (overlay.parentElement !== slot) {
      slot.appendChild(overlay);
    }
  }

  function filterMediaItems(items, pageId, pages) {
    if (!pageId || pageId === "all") return items;
    if (pageId === "unassigned") {
      return items.filter(function (item) {
        return !item.usageCount;
      });
    }
    var page = null;
    (pages || []).forEach(function (entry) {
      if (entry.id === pageId) page = entry;
    });
    if (!page) return items;
    return items.filter(function (item) {
      return item.usedOn && item.usedOn.indexOf(page.label) !== -1;
    });
  }

  function filterMediaBySource(items, sourceId) {
    if (!sourceId || sourceId === "all") return items;
    if (sourceId === "articles") {
      return items.filter(function (item) {
        return item.source === "articles";
      });
    }
    if (sourceId === "website") {
      return items.filter(function (item) {
        return item.source === "site";
      });
    }
    return items;
  }

  function mountMediaSourceFilters(root, container, sourceId) {
    var filters = document.createElement("div");
    filters.className = "admin-media-filters";
    filters.setAttribute("role", "group");
    filters.setAttribute("aria-label", "Filter by image type");

    [
      { id: "all", label: "All" },
      { id: "articles", label: "Articles" },
      { id: "website", label: "Website" },
    ].forEach(function (option) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "admin-media-filter";
      btn.dataset.mediaSource = option.id;
      btn.textContent = option.label;
      btn.classList.toggle("admin-media-filter--active", sourceId === option.id);
      btn.setAttribute("aria-pressed", sourceId === option.id ? "true" : "false");
      btn.addEventListener("click", function (event) {
        event.stopPropagation();
        setMediaSourceFilter(root, option.id);
        renderMediaWorkspace(root);
      });
      filters.appendChild(btn);
    });

    container.appendChild(filters);
  }

  function formatMediaDimensions(item) {
    if (item.width && item.height) return item.width + " × " + item.height;
    return "—";
  }

  function formatMediaUsageLabel(item) {
    var count = item.usageCount || 0;
    if (!count) return "Not used";
    return count === 1 ? "1×" : count + "×";
  }

  function buildMediaUsageMeta(item) {
    var count = item.usageCount || 0;
    if (!count) {
      return '<span class="admin-media-card__usage admin-media-card__usage--none">Not used</span>';
    }
    var title = item.usedOn && item.usedOn.length ? "Used on: " + item.usedOn.join(", ") : "Used " + count + " times on the site";
    var label = count === 1 ? "Used 1×" : "Used " + count + "×";
    return (
      '<span class="admin-media-card__usage" title="' +
      escapeHtml(title) +
      '">' +
      escapeHtml(label) +
      "</span>"
    );
  }

  function ensureMediaModal() {
    var modal = document.getElementById("admin-media-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "admin-media-modal";
    modal.className = "admin-media-modal";
    modal.hidden = true;
    modal.innerHTML =
      '<div class="admin-media-modal__backdrop" data-close="true"></div>' +
      '<div class="admin-media-modal__panel" role="dialog" aria-modal="true">' +
      '<button type="button" class="admin-media-modal__close" aria-label="Close">×</button>' +
      '<div class="admin-media-modal__content"></div>' +
      "</div>";
    document.body.appendChild(modal);
    modal.querySelector(".admin-media-modal__backdrop").addEventListener("click", closeMediaModal);
    modal.querySelector(".admin-media-modal__close").addEventListener("click", closeMediaModal);
    return modal;
  }

  function closeMediaModal() {
    var modal = document.getElementById("admin-media-modal");
    if (!modal) return;
    modal.hidden = true;
    modal.querySelector(".admin-media-modal__content").textContent = "";
    document.body.classList.remove("admin-media-modal-open");
  }

  function openMediaPreviewModal(item) {
    var modal = ensureMediaModal();
    var content = modal.querySelector(".admin-media-modal__content");
    var dims = formatMediaDimensions(item);
    var usage = item.usageCount || 0;
    content.innerHTML =
      '<h2 class="admin-media-modal__title">Preview</h2>' +
      '<div class="admin-media-modal__preview"><img src="' +
      escapeHtml(item.path) +
      '" alt="" /></div>' +
      '<p class="admin-media-modal__meta"><strong>' +
      escapeHtml(item.name) +
      "</strong></p>" +
      '<p class="admin-media-modal__meta">' +
      escapeHtml(item.path) +
      "</p>" +
      '<p class="admin-media-modal__meta">' +
      escapeHtml(dims) +
      (usage ? " · Used " + usage + "×" : " · Not used") +
      "</p>" +
      '<div class="admin-media-modal__actions">' +
      '<button type="button" class="btn-outline admin-media-modal__copy">Copy path</button>' +
      "</div>";
    content.querySelector(".admin-media-modal__copy").addEventListener("click", function () {
      copyText(item.path);
    });
    modal.hidden = false;
    document.body.classList.add("admin-media-modal-open");
  }

  function openMediaReplaceModal(item, root) {
    var modal = ensureMediaModal();
    var content = modal.querySelector(".admin-media-modal__content");
    content.innerHTML =
      '<h2 class="admin-media-modal__title">Replace image</h2>' +
      '<p class="admin-media-modal__meta">Current: <code>' +
      escapeHtml(item.path) +
      "</code> (" +
      escapeHtml(formatMediaDimensions(item)) +
      ")</p>" +
      '<div class="admin-media-replace-tabs" role="tablist">' +
      '<button type="button" class="admin-media-replace-tab admin-media-replace-tab--active" data-tab="upload">Upload file</button>' +
      '<button type="button" class="admin-media-replace-tab" data-tab="url">Link from web</button>' +
      "</div>" +
      '<div class="admin-media-replace-panel" data-panel="upload">' +
      '<p class="admin-media-modal__hint">Choose a new image file. Article images upload to <code>assets/articles/</code> via publish.</p>' +
      '<input type="file" accept="image/*" class="admin-media-replace-file" />' +
      '<div class="admin-media-replace-preview" hidden></div>' +
      '<button type="button" class="btn-primary admin-media-replace-upload-btn">Open uploader</button>' +
      "</div>" +
      '<div class="admin-media-replace-panel" data-panel="url" hidden>' +
      '<p class="admin-media-modal__hint">Paste a public image URL to preview and copy it for your content.</p>' +
      '<input type="url" class="admin-media-replace-url" placeholder="https://example.com/image.jpg" />' +
      '<div class="admin-media-replace-preview admin-media-replace-preview--url" hidden></div>' +
      '<button type="button" class="btn-outline admin-media-replace-copy-url" disabled>Copy URL</button>' +
      "</div>";
    var tabs = content.querySelectorAll(".admin-media-replace-tab");
    var panels = content.querySelectorAll(".admin-media-replace-panel");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) {
          t.classList.toggle("admin-media-replace-tab--active", t === tab);
        });
        panels.forEach(function (panel) {
          panel.hidden = panel.getAttribute("data-panel") !== tab.getAttribute("data-tab");
        });
      });
    });
    var fileInput = content.querySelector(".admin-media-replace-file");
    var filePreview = content.querySelector('[data-panel="upload"] .admin-media-replace-preview');
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) {
        filePreview.hidden = true;
        filePreview.textContent = "";
        return;
      }
      var url = URL.createObjectURL(file);
      filePreview.hidden = false;
      filePreview.innerHTML =
        '<img src="' + url + '" alt="" /><p>' + escapeHtml(file.name) + "</p>";
    });
    content.querySelector(".admin-media-replace-upload-btn").addEventListener("click", function () {
      closeMediaModal();
      root.dataset.adminMediaUploadOpen = "true";
      syncMediaPaneLayout(root);
      renderMediaWorkspace(root);
    });
    var urlInput = content.querySelector(".admin-media-replace-url");
    var urlPreview = content.querySelector(".admin-media-replace-preview--url");
    var copyUrlBtn = content.querySelector(".admin-media-replace-copy-url");
    urlInput.addEventListener("input", function () {
      var value = urlInput.value.trim();
      if (!value) {
        urlPreview.hidden = true;
        copyUrlBtn.disabled = true;
        return;
      }
      urlPreview.hidden = false;
      urlPreview.innerHTML = '<img src="' + escapeHtml(value) + '" alt="" />';
      copyUrlBtn.disabled = false;
    });
    copyUrlBtn.addEventListener("click", function () {
      copyText(urlInput.value.trim());
    });
    modal.hidden = false;
    document.body.classList.add("admin-media-modal-open");
  }

  function bindMediaCardActions(card, item, root) {
    card.querySelector('[data-action="preview"]').addEventListener("click", function (event) {
      event.stopPropagation();
      openMediaPreviewModal(item);
    });
    card.querySelector('[data-action="replace"]').addEventListener("click", function (event) {
      event.stopPropagation();
      openMediaReplaceModal(item, root);
    });
    var pathEl = card.querySelector(".admin-media-card__path, .admin-media-list-row__path");
    if (pathEl) {
      pathEl.addEventListener("click", function (event) {
        event.stopPropagation();
        copyText(item.path).then(function () {
          var copiedClass = card.classList.contains("admin-media-list-row")
            ? "admin-media-list-row--copied"
            : "admin-media-card--copied";
          card.classList.add(copiedClass);
          window.setTimeout(function () {
            card.classList.remove(copiedClass);
          }, 1200);
        });
      });
    }
  }

  function buildMediaCard(item, root) {
    var card = document.createElement("article");
    card.className = "admin-media-card";
    card.dataset.path = item.path;
    card.innerHTML =
      '<div class="admin-media-card__thumb">' +
      '<img src="' +
      escapeHtml(item.path) +
      '" alt="" loading="lazy" decoding="async" />' +
      '<div class="admin-media-card__actions">' +
      '<button type="button" class="admin-media-card__action" data-action="preview">Preview</button>' +
      '<button type="button" class="admin-media-card__action" data-action="replace">Replace</button>' +
      "</div>" +
      "</div>" +
      '<div class="admin-media-card__body">' +
      '<span class="admin-media-card__name">' +
      escapeHtml(item.name) +
      "</span>" +
      '<button type="button" class="admin-media-card__path">' +
      escapeHtml(item.path) +
      "</button>" +
      '<span class="admin-media-card__meta">' +
      '<span class="admin-media-card__dims">' +
      escapeHtml(formatMediaDimensions(item)) +
      "</span>" +
      buildMediaUsageMeta(item) +
      "</span>" +
      "</div>";
    bindMediaCardActions(card, item, root);
    return card;
  }

  function buildMediaListHeader() {
    var head = document.createElement("div");
    head.className = "admin-media-list-head";
    head.setAttribute("role", "row");
    head.innerHTML =
      '<span class="admin-media-list-head__thumb" aria-hidden="true"></span>' +
      '<span class="admin-media-list-head__name">Name</span>' +
      '<span class="admin-media-list-head__size">Size</span>' +
      '<span class="admin-media-list-head__usage">Times used</span>' +
      '<span class="admin-media-list-head__actions">Actions</span>';
    return head;
  }

  function buildMediaListRow(item, root) {
    var row = document.createElement("article");
    row.className = "admin-media-list-row";
    row.dataset.path = item.path;
    var usageTitle =
      item.usedOn && item.usedOn.length ? "Used on: " + item.usedOn.join(", ") : "";
    row.innerHTML =
      '<span class="admin-media-list-row__thumb">' +
      '<img src="' +
      escapeHtml(item.path) +
      '" alt="" loading="lazy" decoding="async" />' +
      "</span>" +
      '<div class="admin-media-list-row__name-col">' +
      '<span class="admin-media-list-row__name">' +
      escapeHtml(item.name) +
      "</span>" +
      '<button type="button" class="admin-media-list-row__path">' +
      escapeHtml(item.path) +
      "</button>" +
      "</div>" +
      '<span class="admin-media-list-row__dims">' +
      escapeHtml(formatMediaDimensions(item)) +
      "</span>" +
      '<span class="admin-media-list-row__usage' +
      (!item.usageCount ? " admin-media-list-row__usage--none" : "") +
      '"' +
      (usageTitle ? ' title="' + escapeHtml(usageTitle) + '"' : "") +
      ">" +
      escapeHtml(formatMediaUsageLabel(item)) +
      "</span>" +
      '<span class="admin-media-list-row__actions">' +
      '<button type="button" class="admin-media-card__action" data-action="preview">Preview</button>' +
      '<button type="button" class="admin-media-card__action" data-action="replace">Replace</button>' +
      "</span>";
    bindMediaCardActions(row, item, root);
    return row;
  }

  function removeMediaWorkspace(root) {
    if (!root) return;
    closeMediaUploadPanel(root);
    delete root.dataset.adminMediaUploadOpen;
    var pane = getMediaPane();
    if (pane) {
      var workspace = pane.querySelector(".admin-media-workspace");
      if (workspace) workspace.remove();
    }
    root.classList.remove("admin-workspace--media-background", "admin-workspace--media-upload");
    syncMediaPaneLayout(root);
    syncMediaSidebarPages();
  }

  function renderMediaWorkspace(root) {
    if (!isMediaRoute() || isLoginView(root)) {
      removeMediaWorkspace(root);
      return;
    }

    var pane = getMediaPane();
    if (!pane) return;
    syncMediaPaneLayout(root);

    function run() {
      preserveDecapMediaTab(root);

      if (!root.dataset.adminMediaViewMode) {
        setMediaViewMode(root, "grid");
      }

      var pageId = getMediaPageFilter(root);
      var sourceId = getMediaSourceFilter(root);
      var listView = isMediaListView(root);
      var manifestReady = Array.isArray(mediaManifest);
      var items = manifestReady ? mediaManifest : [];
      var pages = mediaPages || [];
      var filtered = filterMediaBySource(filterMediaItems(items, pageId, pages), sourceId);
      var signature =
        pageId +
        "|" +
        sourceId +
        "|" +
        (listView ? "list" : "grid") +
        "|" +
        (manifestReady ? filtered.length + "|" + items.length : "loading");

      var workspace = pane.querySelector(".admin-media-workspace");
      if (!workspace) {
        workspace = document.createElement("div");
        workspace.className = "admin-media-workspace";
      }

      if (workspace.dataset.adminSignature !== signature) {
        workspace.dataset.adminSignature = signature;
        workspace.textContent = "";

        var header = document.createElement("div");
        header.className = "admin-media-header";

        var head = document.createElement("div");
        head.className = "admin-media-head";

        var titleWrap = document.createElement("div");
        titleWrap.className = "admin-media-head__titles";
        var h1 = document.createElement("h1");
        h1.textContent = "Media";
        var subtitle = document.createElement("p");
        subtitle.className = "admin-media-head__subtitle";
        subtitle.textContent = "Browse site images and upload new ones for articles.";
        titleWrap.appendChild(h1);
        titleWrap.appendChild(subtitle);

        var actions = document.createElement("div");
        actions.className = "admin-media-head__actions";

        mountMediaSourceFilters(root, actions, sourceId);

        var viewToggle = document.createElement("div");
        viewToggle.className = "admin-media-view-toggle admin-view-toggle";
        viewToggle.setAttribute("role", "group");
        viewToggle.setAttribute("aria-label", "Media view");

        var listBtn = document.createElement("button");
        listBtn.type = "button";
        listBtn.className = "admin-view-btn admin-view-btn--list";
        listBtn.innerHTML = LIST_VIEW_ICON + '<span class="admin-media-view-label">List</span>';
        listBtn.setAttribute("aria-pressed", listView ? "true" : "false");
        listBtn.classList.toggle("admin-view-btn--active", listView);
        setTooltip(listBtn, "List view");
        listBtn.addEventListener("click", function (event) {
          event.stopPropagation();
          setMediaViewMode(root, "list");
          renderMediaWorkspace(root);
        });

        var gridBtn = document.createElement("button");
        gridBtn.type = "button";
        gridBtn.className = "admin-view-btn admin-view-btn--grid";
        gridBtn.innerHTML = GRID_VIEW_ICON + '<span class="admin-media-view-label">Grid</span>';
        gridBtn.setAttribute("aria-pressed", listView ? "false" : "true");
        gridBtn.classList.toggle("admin-view-btn--active", !listView);
        setTooltip(gridBtn, "Grid view");
        gridBtn.addEventListener("click", function (event) {
          event.stopPropagation();
          setMediaViewMode(root, "grid");
          renderMediaWorkspace(root);
        });

        viewToggle.appendChild(listBtn);
        viewToggle.appendChild(gridBtn);

        var uploadBtn = document.createElement("button");
        uploadBtn.type = "button";
        uploadBtn.className = "btn-primary admin-media-upload-btn";
        uploadBtn.innerHTML = UPLOAD_ICON + "Upload image";
        uploadBtn.addEventListener("click", function (event) {
          event.stopPropagation();
          root.dataset.adminMediaUploadOpen = "true";
          syncMediaPaneLayout(root);
          renderMediaWorkspace(root);
        });

        actions.appendChild(viewToggle);
        actions.appendChild(uploadBtn);
        head.appendChild(titleWrap);
        head.appendChild(actions);
        header.appendChild(head);
        workspace.appendChild(header);

        mountMediaUploadPanel(root, workspace);

        if (!manifestReady) {
          var loading = document.createElement("div");
          loading.className = "admin-media-empty admin-media-empty--loading";
          loading.innerHTML =
            "<p><strong>Loading image library…</strong></p>" +
            '<p class="admin-media-empty__hint">Fetching images from the site manifest.</p>';
          workspace.appendChild(loading);
        } else if (!filtered.length) {
          var empty = document.createElement("div");
          empty.className = "admin-media-empty";
          empty.innerHTML =
            "<p><strong>No images in this view.</strong></p>" +
            '<p class="admin-media-empty__hint">Try another filter or page in the sidebar, or upload a new image for your articles.</p>';
          workspace.appendChild(empty);
        } else if (listView) {
          var list = document.createElement("div");
          list.className = "admin-media-list";
          list.setAttribute("role", "table");
          list.appendChild(buildMediaListHeader());
          filtered.forEach(function (item) {
            list.appendChild(buildMediaListRow(item, root));
          });
          workspace.appendChild(list);
        } else {
          var grid = document.createElement("div");
          grid.className = "admin-media-grid";
          filtered.forEach(function (item) {
            grid.appendChild(buildMediaCard(item, root));
          });
          workspace.appendChild(grid);
        }
      } else {
        mountMediaUploadPanel(root, workspace);
      }

      pane.appendChild(workspace);
      syncMediaSidebarPages();
    }

    loadMediaPages().then(function () {
      run();
    });
    run();
    loadMediaManifest().then(run);
  }

  function enhanceMediaView(root) {
    renderMediaWorkspace(root);
  }

  function enhance(root) {
    if (!root) return;
    updateViewClass(root);
    mountCustomShell(root);
    restructureCollectionHeader(root);
    syncCollectionViewMode(root);
    mountCreateButton(root);
    renderCustomCollectionCards(root);
    enhanceMediaView(root);
    mountEditorChrome(root);
  }

  function watch() {
    var root = $("nc-root");
    if (!root) return;

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMediaModal();
    });
    document.addEventListener("click", function (event) {
      if (
        event.target.closest(
          ".admin-composer-menu__menu, .admin-composer-menu__trigger, .admin-composer-menu__option, #admin-view-switcher, .admin-create-dropdown"
        )
      ) {
        return;
      }
      closeAllDropdowns();
    });
    enhance(root);

    window.addEventListener("hashchange", function () {
      cleanupLegacyEditorShell(root);
      resetEditorState();
      resetCollectionLayout(root);
      closeMediaUploadPanel(root);
      delete root.dataset.adminMediaUploadOpen;
      closeAllDropdowns();
      scheduleEnhance(root, enhance);
    });

    window.addEventListener("resize", closeAllDropdowns);
    window.addEventListener(
      "scroll",
      function (event) {
        if (event.target && event.target.closest && event.target.closest(".admin-composer-menu__menu--floating")) {
          return;
        }
        closeAllDropdowns();
      },
      true
    );

    new MutationObserver(function () {
      scheduleEnhance(root, enhance);
    }).observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watch);
  } else {
    watch();
  }

  window.AdminComposer = {
    getRoot: getComposerRoot,
    getActiveCollection: getActiveCollection,
    findDecapTitleInput: findDecapTitleInput,
    setInputValue: setInputValue,
    syncTitleFromDecap: syncTitleFromDecap,
    resetEditorSnapshot: function (root) {
      root = root || getComposerRoot();
      editorState.snapshot = captureEditorSnapshot(root);
      editorState.dirty = false;
      updateEditorStatusLabel();
    },
  };
})();
