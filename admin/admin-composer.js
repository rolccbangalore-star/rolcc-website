(function () {
  var CONTENT_LABELS = ["article content", "sections"];
  var COLLECTION_LABELS = {
    "everyday-faith": "Everyday Faith",
    "back-to-bible": "Back to the Bible",
  };
  var entryCache = Object.create(null);
  var enhanceTimer = null;

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
    if (root.querySelector('[class*="AuthenticationPage"], [class*="StyledAuthenticationPage"]')) return true;
    var loginBtn = root.querySelector('button[class*="LoginButton"]');
    if (loginBtn && normalize(loginBtn.textContent).indexOf("github") !== -1) return true;
    return false;
  }

  function getControlLabel(control) {
    var label = control.querySelector("label");
    return normalize(label ? label.textContent : "");
  }

  function isContentField(label) {
    return CONTENT_LABELS.some(function (name) {
      return label === name || label.indexOf(name) === 0;
    });
  }

  function formatDate(iso) {
    if (!iso) return "";
    var parts = iso.split("-");
    if (parts.length !== 3) return iso;
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[parseInt(parts[1], 10) - 1] + " " + parseInt(parts[2], 10) + ", " + parts[0];
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function scheduleEnhance(root, fn) {
    if (enhanceTimer) window.clearTimeout(enhanceTimer);
    enhanceTimer = window.setTimeout(function () {
      fn(root);
    }, 60);
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
      });
      return;
    }

    searchInput.addEventListener("input", function () {
      var q = normalize(searchInput.value);
      var main = root.querySelector("main");
      if (!main) return;
      main.querySelectorAll("ul li").forEach(function (card) {
        card.hidden = !!(q && normalize(card.textContent).indexOf(q) === -1);
      });
    });
  }

  function closeAllDropdowns() {
    document.querySelectorAll(".admin-dropdown.is-open").forEach(function (el) {
      el.classList.remove("is-open");
    });
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

  function wireViewSwitcher(root) {
    var switcher = $("admin-view-switcher");
    if (!switcher) return;

    var tabs = getHeaderTabs(root);
    var label = switcher.querySelector(".admin-view-switcher__label");
    if (label) label.textContent = isMediaRoute() ? "Media" : "Contents";

    switcher.querySelector('[data-view="contents"]').onclick = function () {
      if (tabs.contents) tabs.contents.click();
      else location.hash = "#/collections/everyday-faith";
      closeAllDropdowns();
      if (label) label.textContent = "Contents";
    };

    switcher.querySelector('[data-view="media"]').onclick = function () {
      if (tabs.media) tabs.media.click();
      else location.hash = "#/media";
      closeAllDropdowns();
      if (label) label.textContent = "Media";
    };
  }

  function markActiveNavLinks() {
    var collection = getActiveCollection();
    document.querySelectorAll(".admin-sidebar-link[data-collection]").forEach(function (link) {
      link.classList.toggle("admin-sidebar-link--active", link.getAttribute("data-collection") === collection);
    });
  }

  function mountCustomShell(root) {
    var topbar = $("admin-topbar");
    var sidebar = $("admin-sidebar");
    var body = document.body;

    if (isLoginView(root)) {
      body.classList.remove("admin-page--authed");
      if (topbar) topbar.hidden = true;
      if (sidebar) sidebar.hidden = true;
      return;
    }

    body.classList.add("admin-page--authed");
    if (topbar) topbar.hidden = false;
    if (sidebar) sidebar.hidden = false;

    bindShellDropdowns();
    wireViewSwitcher(root);
    markActiveNavLinks();
    mountSearch(root);
    mountProfileButton(root);

    applyDecapLayoutFixes(root);
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
      if (!btn.getAttribute("aria-label")) btn.setAttribute("aria-label", "Log out");
      btn.innerHTML = LOGOUT_ICON;
    }
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
    body.classList.remove("admin-page--media");

    if (isLoginView(root)) {
      root.classList.add("admin-view--login");
      return;
    }
    if (isEditorRoute()) root.classList.add("admin-view--editor");
    if (isMediaRoute()) {
      root.classList.add("admin-view--media");
      body.classList.add("admin-page--media");
    }
    if (isCollectionRoute()) root.classList.add("admin-view--collection");
  }

  var CREATE_ICON =
    '<svg class="admin-create-article__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  var LOGOUT_ICON =
    '<svg class="admin-logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>';
  var PLACEHOLDER_THUMB =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="m21 17-5.5-5.5a1.5 1.5 0 0 0-2.12 0L8 17"/></svg>';

  function styleCreateButton(createBtn) {
    if (!createBtn) return;
    createBtn.classList.add("admin-create-article", "btn-primary");
    if (createBtn.dataset.adminCreateStyled !== "true") {
      createBtn.dataset.adminCreateStyled = "true";
      createBtn.innerHTML = CREATE_ICON + "Create Article";
    }
  }

  function mountCreateButton(root) {
    var createSlot = $("admin-create-slot");
    if (!createSlot) return;

    var main = root.querySelector("main");
    var createBtn = null;
    if (main) {
      createBtn = findCreateButton(main.querySelector(".admin-collection-head") || main) || findCreateButton(main);
    }

    if (createBtn) {
      styleCreateButton(createBtn);
      if (createBtn.parentElement !== createSlot) {
        createSlot.appendChild(createBtn);
      }
      createSlot.hidden = false;
      return;
    }

    createSlot.hidden = !isCollectionRoute();
  }

  function findCreateButton(main) {
    if (!main) return null;
    return main.querySelector('a[href*="/new"]') || main.querySelector("a[href*='new']");
  }

  function findControls(main) {
    var selects = main.querySelectorAll("select");
    for (var i = 0; i < selects.length; i++) {
      var wrap = selects[i].closest("div");
      if (wrap && main.contains(wrap)) return wrap;
    }
    return null;
  }

  function restructureCollectionHeader(root) {
    if (!isCollectionRoute()) return;

    var main = root.querySelector("main");
    if (!main) return;

    var h1 = main.querySelector("h1");
    if (!h1) return;

    var topBlock = h1.parentElement;
    while (topBlock && topBlock.parentElement !== main && topBlock !== main) {
      if (topBlock.parentElement && topBlock.parentElement.tagName === "DIV" && topBlock.parentElement.parentElement === main) {
        topBlock = topBlock.parentElement;
        break;
      }
      topBlock = topBlock.parentElement;
    }
    if (!topBlock || topBlock === main) topBlock = h1.parentElement;

    var controls = findControls(main);
    topBlock.classList.add("admin-collection-head");

    Array.prototype.forEach.call(topBlock.querySelectorAll("p"), function (node) {
      node.hidden = true;
    });

    if (controls) {
      controls.classList.add("admin-collection-toolbar");
      styleViewToggleButtons(controls);
      if (controls.parentElement !== topBlock) {
        topBlock.appendChild(controls);
      }
    }

    mountCreateButton(root);

    var headerWrap = main.querySelector(".admin-collection-header");
    if (!headerWrap) {
      headerWrap = document.createElement("div");
      headerWrap.className = "admin-collection-header";
      main.insertBefore(headerWrap, topBlock);
    }
    if (topBlock.parentElement !== headerWrap) {
      headerWrap.appendChild(topBlock);
    }
    if (headerWrap !== main.firstElementChild) {
      main.insertBefore(headerWrap, main.firstElementChild);
    }

    var staleRow = main.querySelector(".admin-collection-toolbar-row");
    if (staleRow) staleRow.remove();
  }

  function styleViewToggleButtons(toolbar) {
    var viewButtons = [];

    Array.prototype.forEach.call(toolbar.querySelectorAll("button"), function (btn) {
      if (btn.closest(".admin-view-toggle")) {
        viewButtons.push(btn);
        return;
      }
      var label = normalize(btn.getAttribute("aria-label") || btn.textContent || "");
      var isGrid = label.indexOf("grid") !== -1;
      var isList = label.indexOf("list") !== -1;
      if (!isGrid && !isList) return;

      btn.classList.add("admin-view-btn", isGrid ? "admin-view-btn--grid" : "admin-view-btn--list");
      btn.innerHTML = isGrid
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>';
      viewButtons.push(btn);
    });

    if (viewButtons.length) {
      var toggle = toolbar.querySelector(".admin-view-toggle");
      if (!toggle) {
        toggle = document.createElement("div");
        toggle.className = "admin-view-toggle";
        viewButtons[0].parentElement.insertBefore(toggle, viewButtons[0]);
      }
      viewButtons.forEach(function (btn) {
        if (btn.parentElement !== toggle) toggle.appendChild(btn);
      });
    }

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
      if (!sortWrap.querySelector(".admin-sort-label")) {
        var sortLabel = document.createElement("span");
        sortLabel.className = "admin-sort-label";
        sortLabel.textContent = "Sort by";
        sortWrap.insertBefore(sortLabel, select);
      }
    }
  }

  function parseEntryPath(href) {
    var match = normalizePath(href).match(/\/collections\/([^/]+)\/entries\/([^/?#]+)/);
    return match ? { collection: match[1], slug: match[2] } : null;
  }

  function fetchEntry(collection, slug) {
    var key = collection + "/" + slug;
    if (entryCache[key]) return entryCache[key];
    entryCache[key] = fetch("/data/articles/" + encodeURIComponent(collection) + "/" + encodeURIComponent(slug) + ".json")
      .then(function (res) {
        if (!res.ok) throw new Error("missing");
        return res.json();
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
    var date = formatDate(data.date);
    return escapeHtml(author) + (date ? " · " + escapeHtml(date) : "");
  }

  function renderCard(link, data, collection, imageEl) {
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

  function enhanceGridCards(root) {
    if (!isCollectionRoute()) return;

    var main = root.querySelector("main");
    if (!main) return;

    main.querySelectorAll("ul li").forEach(function (card) {
      card.classList.add("admin-grid-card");
      var link = card.querySelector("a");
      if (!link) return;

      var parsed = parseEntryPath(link.getAttribute("href") || "");
      if (!parsed) return;

      var imageEl = link.querySelector(".admin-card-image") || link.children[1];
      if (imageEl) imageEl.classList.add("admin-card-image");

      if (link.dataset.adminCard === "done") return;

      fetchEntry(parsed.collection, parsed.slug).then(function (data) {
        if (link.dataset.adminCard === "done") return;
        renderCard(link, data || { title: link.textContent.trim() }, parsed.collection, imageEl);
        link.dataset.adminCard = "done";
      });
    });
  }

  function tagEditorLayout(root) {
    if (!isEditorRoute()) return;

    var main = root.querySelector("main");
    if (!main) return;

    var pane =
      (main.querySelector("form") && main.querySelector("form").parentElement) ||
      main.querySelector(":scope > div > div") ||
      main.querySelector(":scope > div");
    if (!pane || pane.dataset.adminLayout === "done") return;

    var scroll = pane.querySelector(":scope > div") || pane;
    var controls = scroll.querySelectorAll(":scope > div");
    if (!controls.length) controls = pane.children;

    var tagged = false;
    Array.prototype.forEach.call(controls, function (control) {
      if (!control.querySelector("label")) return;
      if (isContentField(getControlLabel(control))) {
        control.classList.add("admin-field--content");
        tagged = true;
      } else {
        control.classList.add("admin-field--meta");
      }
    });

    if (tagged) {
      pane.classList.add("admin-editor-split");
      pane.dataset.adminLayout = "done";
    }
  }

  function resetEditorLayout(root) {
    root.querySelectorAll("[data-admin-layout]").forEach(function (el) {
      delete el.dataset.adminLayout;
      el.classList.remove("admin-editor-split");
    });
    root.querySelectorAll(".admin-field--meta, .admin-field--content").forEach(function (el) {
      el.classList.remove("admin-field--meta", "admin-field--content");
    });
  }

  function resetCollectionLayout(root) {
    root.querySelectorAll("[data-admin-card]").forEach(function (el) {
      delete el.dataset.adminCard;
    });
    entryCache = Object.create(null);
  }

  function enhance(root) {
    if (!root) return;
    updateViewClass(root);
    mountCustomShell(root);
    restructureCollectionHeader(root);
    mountCreateButton(root);
    enhanceGridCards(root);
    tagEditorLayout(root);
  }

  function watch() {
    var root = $("nc-root");
    if (!root) return;

    document.addEventListener("click", closeAllDropdowns);
    enhance(root);

    window.addEventListener("hashchange", function () {
      resetEditorLayout(root);
      resetCollectionLayout(root);
      scheduleEnhance(root, enhance);
    });

    new MutationObserver(function () {
      scheduleEnhance(root, enhance);
    }).observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watch);
  } else {
    watch();
  }
})();
