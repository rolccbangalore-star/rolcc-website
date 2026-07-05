(function () {
  var CONTENT_LABELS = ["article content", "sections"];

  function normalize(text) {
    return (text || "").replace(/\s+/g, " ").trim().toLowerCase();
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

  function tagEditorLayout(root) {
    var pane = root.querySelector('[class*="ControlPane"], [class*="EditorControlPane"]');
    if (!pane || pane.dataset.adminLayout === "done") return;

    var scroll = pane.querySelector('[class*="ScrollContainer"]') || pane;
    var controls = scroll.querySelectorAll(':scope > [class*="Control"]');
    if (!controls.length) {
      controls = pane.children;
    }
    var tagged = false;

    Array.prototype.forEach.call(controls, function (control) {
      if (!control.querySelector("label")) return;
      var label = getControlLabel(control);
      if (isContentField(label)) {
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

  function enhanceCollectionGrid(root) {
    var main = root.querySelector('[class*="CollectionMain"], [class*="MainContainer"]');
    if (main) main.classList.add("admin-collection-main");
  }

  function enhance(root) {
    if (!root) return;
    tagEditorLayout(root);
    enhanceCollectionGrid(root);
  }

  function watch() {
    var root = document.getElementById("nc-root");
    if (!root) return;

    enhance(root);

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
