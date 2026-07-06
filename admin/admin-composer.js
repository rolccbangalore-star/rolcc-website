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
    return root && root.querySelector("button") && root.textContent.indexOf("Login with GitHub") !== -1;
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
    return root.querySelector('aside input[type="search"], aside input[type="text"], header input[type="search"], header input[type="text"]');
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

    var searchSlot = $("admin-search-slot");
    var searchInput = getDecapSearchInput(root);
    if (searchSlot && searchInput && searchInput.parentElement !== searchSlot) {
      searchInput.classList.add("admin-search__input");
      searchInput.setAttribute("placeholder", "Title, author, or passage…");
      searchInput.setAttribute("aria-label", "Search for an article");
      searchSlot.appendChild(searchInput);
    }

    var profileSlot = $("admin-profile-slot");
    var headerImg = root.querySelector("header img");
    var profile =
      root.querySelector("header .admin-user-menu") ||
      root.querySelector("header button[aria-haspopup='true']") ||
      (headerImg && headerImg.closest("button")) ||
      (headerImg && headerImg.closest("div"));

    if (profileSlot && profile && profile.parentElement !== profileSlot) {
      profile.classList.add("admin-user-menu");
      profileSlot.appendChild(profile);
    }

    applyDecapLayoutFixes(root);
  }

  function applyDecapLayoutFixes(root) {
    var shell = root.querySelector(":scope > div > div");
    if (shell) shell.classList.add("admin-decap-shell");

    root.querySelectorAll("main").forEach(function (main) {
      main.classList.add("admin-main");
    });

    var node = root.querySelector("main");
    while (node && node !== root) {
      if (node.tagName === "DIV") node.classList.add("admin-content-wrap");
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

  function findCreateButton(main) {
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

    var topBlock = null;
    Array.prototype.forEach.call(main.children, function (child) {
      if (child.tagName === "DIV" && child.querySelector("h1") && !topBlock) topBlock = child;
    });
    if (!topBlock) return;

    var controls = findControls(main);
    var createBtn = findCreateButton(topBlock) || findCreateButton(main);

    if (createBtn) {
      createBtn.textContent = "Create Article";
      createBtn.classList.add("admin-create-article", "btn-primary");
    }

    topBlock.classList.add("admin-collection-head");
    if (controls) controls.classList.add("admin-collection-toolbar");

    if (!main.querySelector(".admin-collection-header")) {
      var headerWrap = document.createElement("div");
      headerWrap.className = "admin-collection-header";
      main.insertBefore(headerWrap, topBlock);
      headerWrap.appendChild(topBlock);
      if (controls) headerWrap.appendChild(controls);
    } else if (controls) {
      var existing = main.querySelector(".admin-collection-header");
      if (controls.parentElement !== existing) existing.appendChild(controls);
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

  function buildCardExtras(data, collection) {
    if (!data) return null;

    var typeLabel = COLLECTION_LABELS[collection] || collection;
    var tags = document.createElement("div");
    tags.className = "admin-card-tags";
    tags.innerHTML =
      '<span class="article-tag article-tag--sm">' +
      escapeHtml(typeLabel) +
      '</span><span class="article-tag article-tag--sm article-tag--muted">' +
      escapeHtml(data.category || "General") +
      "</span>" +
      (data.passage || data.scripture
        ? '<span class="article-tag article-tag--sm article-tag--muted">' + escapeHtml(data.passage || data.scripture) + "</span>"
        : "") +
      (data.publish === false ? '<span class="article-tag article-tag--sm admin-card-tag--draft">Draft</span>' : "");

    var meta = document.createElement("p");
    meta.className = "admin-card-meta";
    meta.textContent = [data.author || "ROLCC", formatDate(data.date)].filter(Boolean).join(" · ");

    var extras = document.createElement("div");
    extras.className = "admin-card-extras";
    extras.appendChild(tags);

    var desc = data.summary || data.description;
    if (desc) {
      var description = document.createElement("p");
      description.className = "admin-card-desc";
      description.textContent = desc;
      extras.appendChild(description);
    }

    extras.appendChild(meta);
    return extras;
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

      var body = link.children[0];
      var image = link.children[1];
      if (body) body.classList.add("admin-card-body");
      if (image) image.classList.add("admin-card-image");

      var headings = body ? body.querySelectorAll("h2") : [];
      if (headings.length > 1) headings[0].hidden = true;
      if (headings.length) headings[headings.length - 1].classList.add("admin-card-title");

      if (link.dataset.adminCard === "done") return;

      fetchEntry(parsed.collection, parsed.slug).then(function (data) {
        if (!data || !body || link.dataset.adminCard === "done") return;
        var titleEl = body.querySelector(".admin-card-title");
        if (titleEl && data.title) titleEl.textContent = data.title;
        var existing = body.querySelector(".admin-card-extras");
        if (existing) existing.remove();
        var extras = buildCardExtras(data, parsed.collection);
        if (extras) body.appendChild(extras);
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
