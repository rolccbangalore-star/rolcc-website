(function () {
  var CONTENT_LABELS = ["article content", "sections"];
  var SITE_URL = "https://www.rolcc.in";

  function normalize(text) {
    return (text || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function isEditorRoute() {
    var hash = location.hash || "";
    return /\/entries\/|\/new$/.test(hash);
  }

  function isCollectionRoute() {
    var hash = location.hash || "";
    return hash.indexOf("/collections/") !== -1 && !isEditorRoute();
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

  function updateViewClass(root) {
    root.classList.remove("admin-view--login", "admin-view--collection", "admin-view--editor");

    if (root.querySelector('[class*="AuthenticationPage"], [class*="StyledAuthenticationPage"]')) {
      root.classList.add("admin-view--login");
      return;
    }
    if (isEditorRoute()) {
      root.classList.add("admin-view--editor");
      return;
    }
    if (isCollectionRoute()) {
      root.classList.add("admin-view--collection");
    }
  }

  function enhanceHeader(root) {
    root.querySelectorAll('[class*="AppHeader"] a, header[class*="AppBar"] a').forEach(function (link) {
      if (link.classList.contains("admin-back-to-site")) return;
      var href = link.getAttribute("href") || "";
      if (href.indexOf("rolcc.in") === -1 || href.indexOf("/admin") !== -1) return;
      link.textContent = "Back to Site";
      link.classList.add("admin-back-to-site");
      link.setAttribute("href", SITE_URL + "/");
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });

    root.querySelectorAll('[class*="AppHeader"] button, header[class*="AppBar"] button').forEach(function (btn) {
      if (/^New /i.test((btn.textContent || "").trim())) {
        btn.textContent = "Create Article";
        btn.classList.add("admin-create-article");
      }
    });

    root.querySelectorAll('[class*="CollectionTop"] button, [class*="CollectionHeader"] button, [class*="Toolbar"] button').forEach(function (btn) {
      var text = (btn.textContent || "").trim();
      if (/^New /i.test(text)) {
        btn.textContent = "Create Article";
        btn.classList.add("admin-create-article");
      }
    });

    var profile = root.querySelector('[class*="AppHeader"] [class*="Dropdown"], [class*="UserMenu"], [class*="Profile"]');
    if (profile) profile.classList.add("admin-user-menu");
  }

  function enhanceCollectionLayout(root) {
    if (!isCollectionRoute()) return;

    var head = root.querySelector('[class*="CollectionTop"], [class*="CollectionHeader"]');
    if (head) head.classList.add("admin-collection-head");

    var controls = root.querySelector('[class*="CollectionControls"], [class*="CollectionTop"] [class*="Controls"]');
    if (controls) controls.classList.add("admin-collection-toolbar");

    var sidebar = root.querySelector('[class*="SidebarContainer"], aside[class*="Sidebar"]');
    if (sidebar) sidebar.classList.add("admin-sidebar");
  }

  function tagEditorLayout(root) {
    if (!isEditorRoute()) return;

    var pane = root.querySelector(
      '[class*="EditorContainer"] [class*="ControlPane"], [class*="EditorContainer"] [class*="EditorControlPane"]'
    );
    if (!pane || pane.dataset.adminLayout === "done") return;

    var scroll = pane.querySelector('[class*="ScrollContainer"]') || pane;
    var controls = scroll.querySelectorAll(':scope > [class*="Control"]');
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

  function enhance(root) {
    if (!root) return;
    updateViewClass(root);
    enhanceHeader(root);
    enhanceCollectionLayout(root);
    tagEditorLayout(root);
  }

  function watch() {
    var root = document.getElementById("nc-root");
    if (!root) return;

    enhance(root);

    window.addEventListener("hashchange", function () {
      resetEditorLayout(root);
      enhance(root);
    });

    var observer = new MutationObserver(function () {
      enhance(root);
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watch);
  } else {
    watch();
  }
})();
