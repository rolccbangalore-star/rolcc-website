(function () {
  var CONTENT_LABELS = ["article content", "sections"];

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
