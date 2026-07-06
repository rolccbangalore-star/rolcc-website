(function () {
  var CONTENT_LABELS = ["article content", "sections"];
  var COLLECTION_LABELS = {
    "everyday-faith": "Sermon Summary",
    "back-to-bible": "Back to the Bible",
  };
  var entryCache = Object.create(null);
  var cardManifest = null;
  var cardManifestPromise = null;
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
      tabs = getHeaderTabs(root);
      if (tabs.media) tabs.media.click();
      else location.hash = "#/media";
      scheduleEnhance(root, enhance);
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
    bindShellTooltips();
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
    if (!isMediaRoute()) return;

    if (root.querySelector(".ReactModal__Overlay--after-open")) return;

    var tabs = getHeaderTabs(root);
    if (tabs.media) {
      tabs.media.click();
      return;
    }

    if (getHash().indexOf("/media") === -1) {
      location.hash = "#/media";
    }
  }

  function mountMediaInline(root) {
    var main = ensureMainWorkspace(root);
    if (!main) return false;

    var overlay = root.querySelector(".ReactModal__Overlay");
    if (!overlay) return false;

    overlay.classList.add("admin-media-overlay");
    var content = overlay.querySelector(".ReactModal__Content");
    if (content) content.classList.add("admin-media-panel");

    var header = main.querySelector(".admin-media-header");
    if (!header) {
      header = document.createElement("div");
      header.className = "admin-collection-header admin-media-header";
      var head = document.createElement("div");
      head.className = "admin-collection-head admin-media-head";
      var h1 = document.createElement("h1");
      h1.textContent = "Media";
      head.appendChild(h1);
      header.appendChild(head);
      main.insertBefore(header, main.firstChild);
    }

    if (overlay.parentElement !== main) {
      safeAppend(main, overlay);
    } else if (header.nextElementSibling !== overlay) {
      main.insertBefore(overlay, header.nextElementSibling);
    }

    return true;
  }

  function enhanceMediaView(root) {
    if (!isMediaRoute()) {
      root.querySelectorAll(".admin-media-header").forEach(function (el) {
        el.remove();
      });
      root.querySelectorAll(".admin-media-overlay").forEach(function (overlay) {
        overlay.classList.remove("admin-media-overlay");
        var content = overlay.querySelector(".admin-media-panel");
        if (content) content.classList.remove("admin-media-panel");
      });
      return;
    }

    ensureMediaLibraryOpen(root);

    if (!mountMediaInline(root)) {
      window.setTimeout(function () {
        ensureMediaLibraryOpen(root);
        mountMediaInline(root);
      }, 150);
    }
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
    tagEditorLayout(root);
  }

  function watch() {
    var root = $("nc-root");
    if (!root) return;

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
      resetEditorLayout(root);
      resetCollectionLayout(root);
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
})();
