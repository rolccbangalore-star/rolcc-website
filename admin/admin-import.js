(function () {
  var parseApi = typeof ArticleImportParse !== "undefined" ? ArticleImportParse : null;

  var LABEL_ALIASES = {
    scripture: ["scripture", "main scripture"],
  };

  function $(id) {
    return document.getElementById(id);
  }

  function normalize(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function normalizeLabel(text) {
    return normalize(text).replace(/\s*\(optional\)$/i, "").trim();
  }

  function isEditorRoute() {
    return /\/entries\/|\/new$/.test(location.hash || "");
  }

  function getRoot() {
    return window.AdminComposer && window.AdminComposer.getRoot ? window.AdminComposer.getRoot() : $("nc-root");
  }

  function getCollection() {
    if (window.AdminComposer && window.AdminComposer.getActiveCollection) {
      return window.AdminComposer.getActiveCollection();
    }
    var match = (location.hash || "").match(/\/collections\/([^/?]+)/);
    return match ? match[1] : "everyday-faith";
  }

  function setInputValue(input, value) {
    if (window.AdminComposer && window.AdminComposer.setInputValue) {
      window.AdminComposer.setInputValue(input, value);
      return;
    }
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function findFieldByLabel(root, labelText) {
    var target = normalizeLabel(labelText);
    var targets = LABEL_ALIASES[target] || [target];

    var labels = root.querySelectorAll("main label, main [class*='FieldLabel']");
    for (var i = 0; i < labels.length; i++) {
      var labelNorm = normalizeLabel(labels[i].textContent);
      for (var j = 0; j < targets.length; j++) {
        if (labelNorm === targets[j]) {
          return labels[i].closest("div");
        }
      }
    }
    return null;
  }

  function applyScalarField(root, labelText, value) {
    if (value === undefined || value === null || value === "") return false;
    var wrap = findFieldByLabel(root, labelText);
    if (!wrap) return false;

    var checkbox = wrap.querySelector('input[type="checkbox"]');
    if (checkbox && typeof value === "boolean") {
      if (checkbox.checked !== value) checkbox.click();
      return true;
    }

    var input =
      wrap.querySelector("textarea") ||
      wrap.querySelector('input[type="text"]') ||
      wrap.querySelector('input[type="number"]') ||
      wrap.querySelector("input:not([type='checkbox']):not([type='hidden'])");
    if (!input) return false;
    setInputValue(input, String(value));
    return true;
  }

  function clickButtonMatching(container, pattern) {
    if (!container) return null;
    var buttons = container.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      var text = normalize(buttons[i].textContent);
      if (text.indexOf(pattern) !== -1) return buttons[i];
    }
    return null;
  }

  function applySimpleList(root, fieldLabel, items, itemLabel) {
    if (!items || !items.length) return 0;
    var wrap = findFieldByLabel(root, fieldLabel);
    if (!wrap) return 0;

    var applied = 0;
    items.forEach(function (itemText) {
      var addBtn = clickButtonMatching(wrap, "add");
      if (!addBtn) addBtn = clickButtonMatching(wrap, fieldLabel.toLowerCase());
      if (!addBtn) return;
      addBtn.click();

      var inputs = wrap.querySelectorAll('input[type="text"], textarea');
      var last = inputs[inputs.length - 1];
      if (last) {
        setInputValue(last, typeof itemText === "string" ? itemText : String(itemText));
        applied += 1;
      }
    });
    return applied;
  }

  function applyBlocks(root, blocks) {
    if (!blocks || !blocks.length) return 0;
    var wrap = findFieldByLabel(root, "article content");
    if (!wrap) return 0;

    var applied = 0;
    blocks.forEach(function (block) {
      if (!block || !block.type) return;
      var addBtn = clickButtonMatching(wrap, "add article content") || clickButtonMatching(wrap, "add");
      if (!addBtn) return;
      addBtn.click();

      var typeLabel = block.type;
      if (typeLabel === "bulletList") typeLabel = "bullet list";
      if (typeLabel === "scriptureCallout") typeLabel = "scripture callout";
      if (typeLabel === "heading") typeLabel = "heading";

      window.setTimeout(function () {
        var typeBtn =
          clickButtonMatching(wrap, typeLabel) ||
          clickButtonMatching(document, typeLabel);
        if (typeBtn) typeBtn.click();

        window.setTimeout(function () {
          if (block.type === "paragraph" && block.text) {
            var ta = wrap.querySelector("textarea");
            if (ta) setInputValue(ta, block.text);
          } else if (block.type === "heading") {
            applyScalarField(root, "heading text", block.text);
            if (block.level) applyScalarField(root, "level", block.level);
          } else if (block.type === "quote") {
            applyScalarField(root, "quote text", block.text);
            if (block.attribution) applyScalarField(root, "attribution", block.attribution);
          }
        }, 80);
      }, 80);

      applied += 1;
    });
    return applied;
  }

  function applySections(root, sections) {
    if (!sections || !sections.length) return 0;
    var applied = 0;
    sections.forEach(function (section) {
      var wrap = findFieldByLabel(root, "sections");
      if (!wrap) return;
      var addBtn = clickButtonMatching(wrap, "add");
      if (!addBtn) return;
      addBtn.click();
      window.setTimeout(function () {
        applyScalarField(root, "heading", section.heading);
        applyScalarField(root, "body", section.body);
      }, 100);
      applied += 1;
    });
    return applied;
  }

  var META_FIELDS_EF = [
    ["title", "title"],
    ["summary", "summary"],
    ["search preview", "description"],
    ["author", "author"],
    ["tag", "category"],
    ["main scripture", "scripture"],
    ["sermon series", "sermonSeries"],
  ];

  var META_FIELDS_BTB = [
    ["title", "title"],
    ["description", "description"],
    ["passage", "passage"],
    ["author", "author"],
    ["tag", "category"],
  ];

  function applyEntryImport(root, entry, options) {
    options = options || {};
    var contentOnly = options.contentOnly !== false;
    var collection = getCollection();
    var metaFields = collection === "back-to-bible" ? META_FIELDS_BTB : META_FIELDS_EF;
    var results = { meta: 0, content: 0, warnings: [] };

    if (!contentOnly) {
      metaFields.forEach(function (pair) {
        var label = pair[0];
        var key = pair[1];
        if (options.fillEmptyOnly) {
          var existing = findFieldByLabel(root, label);
          var input = existing && existing.querySelector("input, textarea");
          if (input && input.value && input.value.trim()) return;
        }
        if (applyScalarField(root, label, entry[key])) results.meta += 1;
      });

      if (entry.date) applyScalarField(root, "date", entry.date);
      if (typeof entry.featured === "boolean") applyScalarField(root, "featured", entry.featured);
      if (typeof entry.publish === "boolean") applyScalarField(root, "published", entry.publish);
      if (typeof entry.includeQuiz === "boolean") applyScalarField(root, "include quiz", entry.includeQuiz);

      if (entry.title) {
        var headerInput = $("admin-editor-title-input");
        if (headerInput && (!options.fillEmptyOnly || !headerInput.value.trim())) {
          setInputValue(headerInput, entry.title);
        }
        if (window.AdminComposer && window.AdminComposer.syncTitleFromDecap) {
          window.AdminComposer.syncTitleFromDecap(root);
        }
      }
    }

    if (collection === "everyday-faith") {
      results.content += applySimpleList(root, "key takeaways", entry.keyTakeaways || []);
      var blockCount = applyBlocks(root, entry.blocks || []);
      results.content += blockCount;
      if ((entry.blocks || []).length && blockCount < (entry.blocks || []).length) {
        results.warnings.push("Some content blocks may need manual review after import.");
      }
    } else {
      results.content += applySections(root, entry.sections || []);
      results.content += applySimpleList(root, "discussion questions", entry.discussionQuestions || []);
    }

    if (window.AdminComposer && window.AdminComposer.resetEditorSnapshot) {
      window.setTimeout(function () {
        window.AdminComposer.resetEditorSnapshot(root);
      }, 500);
    }

    return results;
  }

  function showToast(message, type) {
    var toast = document.createElement("div");
    toast.className = "admin-import-toast admin-import-toast--" + (type || "info");
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.appendChild(toast);
    window.requestAnimationFrame(function () {
      toast.classList.add("admin-import-toast--visible");
    });
    window.setTimeout(function () {
      toast.classList.remove("admin-import-toast--visible");
      window.setTimeout(function () {
        toast.remove();
      }, 300);
    }, 4500);
  }

  function formatImportSummary(results, contentOnly) {
    var msg;
    if (contentOnly) {
      msg =
        results.content === 0
          ? "No blog content fields were filled."
          : "Imported " + results.content + " blog content item" + (results.content === 1 ? "" : "s");
    } else {
      msg = "Imported " + results.meta + " info field" + (results.meta === 1 ? "" : "s");
      if (results.content) {
        msg += " and " + results.content + " content item" + (results.content === 1 ? "" : "s");
      }
    }
    if (results.warnings.length) msg += ". " + results.warnings.join(" ");
    return msg;
  }

  function runAutoImport(entry, options) {
    options = options || {};
    if (options.contentOnly === undefined) options.contentOnly = true;
    if (!entry) {
      showToast("Nothing to import.", "error");
      return { ok: false };
    }

    var root = getRoot();
    if (!root) {
      showToast("Editor not ready. Try again in a moment.", "error");
      return { ok: false };
    }

    try {
      var results = applyEntryImport(root, entry, options);
      if (!results.meta && !results.content) {
        showToast(
          options.contentOnly ? "No blog content fields found to fill." : "No matching empty fields found to fill.",
          "info"
        );
        return { ok: true, results: results, empty: true };
      }
      showToast(formatImportSummary(results, options.contentOnly), "success");
      return { ok: true, results: results };
    } catch (err) {
      showToast("Import failed: " + (err.message || err), "error");
      return { ok: false, error: err.message || String(err) };
    }
  }

  function looksLikeImport(text) {
    if (!text) return false;
    var trimmed = String(text).trim();
    if (trimmed.length < 24) return false;

    if (trimmed.charAt(0) === "{" || trimmed.charAt(0) === "[") {
      try {
        JSON.parse(trimmed);
        return true;
      } catch (e) {
        /* not JSON */
      }
    }

    return (
      /"blocks"\s*:/.test(trimmed) ||
      /"sections"\s*:/.test(trimmed) ||
      /"keyTakeaways"\s*:/.test(trimmed) ||
      /"discussionQuestions"\s*:/.test(trimmed) ||
      /^#\s+.+/m.test(trimmed)
    );
  }

  function ensureModal() {
    var modal = $("admin-import-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "admin-import-modal";
    modal.className = "admin-import-modal";
    modal.hidden = true;
    modal.innerHTML =
      '<div class="admin-import-modal__backdrop" data-import-close></div>' +
      '<div class="admin-import-modal__panel" role="dialog" aria-labelledby="admin-import-title">' +
      '<h2 id="admin-import-title" class="admin-import-modal__title">Import article</h2>' +
      '<p class="admin-import-modal__summary" id="admin-import-summary"></p>' +
      '<label class="admin-import-modal__label"><input type="checkbox" id="admin-import-replace" /> Replace blog content that already has text</label>' +
      '<p class="admin-import-modal__hint">Imports article body only — set title, tag, date, and other info manually in the editor.</p>' +
      '<details class="admin-import-modal__help"><summary>Blog content JSON template</summary><pre id="admin-import-example"></pre></details>' +
      '<div class="admin-import-modal__actions">' +
      '<button type="button" class="btn-outline" data-import-close>Cancel</button>' +
      '<button type="button" class="btn-primary" id="admin-import-confirm">Import</button>' +
      "</div></div>";
    document.body.appendChild(modal);

    modal.querySelectorAll("[data-import-close]").forEach(function (el) {
      el.addEventListener("click", function () {
        modal.hidden = true;
      });
    });

    var confirmBtn = modal.querySelector("#admin-import-confirm");
    if (confirmBtn && confirmBtn.dataset.bound !== "true") {
      confirmBtn.dataset.bound = "true";
      confirmBtn.addEventListener("click", function () {
        if (!pendingEntry) return;
        var replace = $("admin-import-replace") && $("admin-import-replace").checked;
        runAutoImport(pendingEntry, { fillEmptyOnly: !replace, contentOnly: true });
        pendingEntry = null;
        modal.hidden = true;
      });
    }

    return modal;
  }

  function ensureDropZone() {
    var zone = $("admin-import-dropzone");
    if (zone) return zone;

    zone = document.createElement("div");
    zone.id = "admin-import-dropzone";
    zone.className = "admin-import-dropzone";
    zone.hidden = true;
    zone.innerHTML =
      '<div class="admin-import-dropzone__inner">' +
      "<p><strong>Drop blog content</strong></p>" +
      "<p>JSON with blocks, takeaways, or sections</p>" +
      "</div>";
    document.body.appendChild(zone);
    return zone;
  }

  var pendingEntry = null;

  function openImportModal(entry) {
    if (!parseApi) return;
    pendingEntry = entry;
    var modal = ensureModal();
    var summary = summarizeText(entry);
    $("admin-import-summary").textContent = summary;
    var example = $("admin-import-example");
    if (example) {
      example.textContent = JSON.stringify(
        parseApi.CONTENT_JSON_EXAMPLE[getCollection()] || parseApi.CONTENT_JSON_EXAMPLE["everyday-faith"],
        null,
        2
      );
    }
    modal.hidden = false;
  }

  function summarizeText(entry) {
    if (!parseApi) return "";
    var s = parseApi.summarizeContentEntry(entry, getCollection());
    var parts = ["Blog content"];
    if (s.blockCount) parts.push(s.blockCount + " blocks");
    if (s.sectionCount) parts.push(s.sectionCount + " sections");
    if (s.takeawayCount) parts.push(s.takeawayCount + " takeaways");
    if (s.questionCount) parts.push(s.questionCount + " questions");
    return parts.join(" · ");
  }

  function handleParsedEntry(entry, options) {
    options = options || {};
    if (options.useModal) {
      openImportModal(entry);
      return;
    }
    var result = runAutoImport(entry, { fillEmptyOnly: options.fillEmptyOnly !== false });
    if (!result.ok && entry) {
      openImportModal(entry);
    }
  }

  function handleFile(file, options) {
    if (!parseApi || !file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var entry = parseApi.parseImportFile(reader.result, getCollection(), file.name);
        handleParsedEntry(entry, options || { fillEmptyOnly: true });
      } catch (err) {
        showToast("Could not parse file: " + (err.message || err), "error");
      }
    };
    reader.readAsText(file);
  }

  function handlePasteText(text) {
    if (!parseApi || !looksLikeImport(text)) return false;
    try {
      var entry = parseApi.parseImportFile(text, getCollection());
      runAutoImport(entry, { fillEmptyOnly: true });
      return true;
    } catch (err) {
      showToast("Could not parse pasted content: " + (err.message || err), "error");
      return false;
    }
  }

  function bindImportUi() {
    var importBtn = $("admin-import-btn");
    if (importBtn && importBtn.dataset.bound !== "true") {
      importBtn.dataset.bound = "true";
      importBtn.addEventListener("click", function () {
        var input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,.md,.txt,text/plain,application/json";
        input.addEventListener("change", function () {
          if (input.files && input.files[0]) handleFile(input.files[0], { fillEmptyOnly: true });
        });
        input.click();
      });
    }

    var zone = ensureDropZone();
    if (zone.dataset.bound === "true") return;
    zone.dataset.bound = "true";

    ["dragenter", "dragover"].forEach(function (name) {
      document.addEventListener(name, function (event) {
        if (!isEditorRoute()) return;
        event.preventDefault();
        zone.hidden = false;
        zone.classList.add("admin-import-dropzone--active");
      });
    });

    document.addEventListener("dragleave", function (event) {
      if (!isEditorRoute()) return;
      if (event.relatedTarget && zone.contains(event.relatedTarget)) return;
      zone.classList.remove("admin-import-dropzone--active");
      zone.hidden = true;
    });

    zone.addEventListener("drop", function (event) {
      event.preventDefault();
      zone.classList.remove("admin-import-dropzone--active");
      zone.hidden = true;
      if (!isEditorRoute()) return;
      var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) {
        handleFile(file, { fillEmptyOnly: true });
        return;
      }
      var text = event.dataTransfer && event.dataTransfer.getData("text/plain");
      if (text) handlePasteText(text);
    });

    document.addEventListener("drop", function (event) {
      if (!isEditorRoute()) return;
      event.preventDefault();
    });

    document.addEventListener("paste", function (event) {
      if (!isEditorRoute()) return;
      var active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable ||
          active.closest("[contenteditable='true']"))
      ) {
        return;
      }
      var text = event.clipboardData && event.clipboardData.getData("text/plain");
      if (!text || !looksLikeImport(text)) return;
      event.preventDefault();
      handlePasteText(text);
    });
  }

  function syncDropZoneVisibility() {
    var zone = $("admin-import-dropzone");
    if (!zone) return;
    if (!isEditorRoute()) {
      zone.hidden = true;
      zone.classList.remove("admin-import-dropzone--active");
    }
  }

  function init() {
    bindImportUi();
    window.addEventListener("hashchange", syncDropZoneVisibility);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.AdminImport = {
    applyEntryImport: applyEntryImport,
    handleFile: handleFile,
    openImportModal: openImportModal,
    runAutoImport: runAutoImport,
    looksLikeImport: looksLikeImport,
  };
})();
