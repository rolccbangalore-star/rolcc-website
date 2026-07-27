(function () {
  var parseApi = typeof ArticleImportParse !== "undefined" ? ArticleImportParse : null;
  var GITHUB_REPO = "rolccbangalore-star/rolcc-website";
  var GITHUB_BRANCH = "main";

  var LABEL_ALIASES = {
    tag: ["tag", "tags"],
    tags: ["tags", "tag"],
    author: ["author"],
    featured: ["featured", "featured article"],
    published: ["published"],
    scripture: ["scripture", "main scripture"],
    "correct option index": ["correct option index", "correct option index (0-based)"],
    "include quiz": ["include quiz", "include quiz?"],
    "article content": ["article content", "blocks"],
    "key takeaways": ["key takeaways", "key takeaways"],
    "search preview": ["search preview", "description"],
  };

  function labelMatches(labelNorm, target) {
    if (!labelNorm || !target) return false;
    if (labelNorm === target) return true;
    if (labelNorm.indexOf(target) === 0) {
      var next = labelNorm.charAt(target.length);
      return !next || next === " " || next === "?";
    }
    return false;
  }

  function getEditorScopes(root) {
    var scopes = [];
    var main = root.querySelector("main");
    var pane = root.querySelector('[class*="EditorControlPane"]');
    var form = root.querySelector("form");
    if (main) scopes.push(main);
    if (pane && scopes.indexOf(pane) === -1) scopes.push(pane);
    if (form && scopes.indexOf(form) === -1) scopes.push(form);
    if (scopes.indexOf(root) === -1) scopes.push(root);
    return scopes;
  }

  function getFieldWrap(labelEl) {
    if (!labelEl) return null;
    return (
      labelEl.closest('[class*="EditorControl"]') ||
      labelEl.closest('[class*="ListControl"]') ||
      labelEl.closest("fieldset") ||
      labelEl.closest("div")
    );
  }

  function findFieldByLabel(root, labelText) {
    var target = normalizeLabel(labelText);
    var targets = LABEL_ALIASES[target] || [target];
    var scopes = getEditorScopes(root);

    for (var s = 0; s < scopes.length; s++) {
      var labels = scopes[s].querySelectorAll("label, legend, [class*='FieldLabel']");
      for (var i = 0; i < labels.length; i++) {
        var labelNorm = normalizeLabel(labels[i].textContent);
        for (var j = 0; j < targets.length; j++) {
          if (labelMatches(labelNorm, targets[j])) {
            var wrap = getFieldWrap(labels[i]);
            if (wrap) return wrap;
          }
        }
      }
    }

    return findListFieldWrap(root, labelText);
  }

  function findListFieldWrap(root, labelText) {
    var target = normalizeLabel(labelText);
    var scopes = getEditorScopes(root);
    for (var s = 0; s < scopes.length; s++) {
      var buttons = scopes[s].querySelectorAll("button");
      for (var i = 0; i < buttons.length; i++) {
        var btnText = normalize(buttons[i].textContent);
        if (btnText.indexOf("add") === -1) continue;
        if (labelMatches(btnText, "add " + target) || btnText.indexOf(target) !== -1) {
          return (
            buttons[i].closest('[class*="EditorControl"]') ||
            buttons[i].closest('[class*="ListControl"]') ||
            buttons[i].closest("div")
          );
        }
      }
    }
    return null;
  }

  function findFieldInContainer(container, labelText) {
    if (!container) return null;
    var target = normalizeLabel(labelText);
    var targets = LABEL_ALIASES[target] || [target];
    var labels = container.querySelectorAll("label, legend, [class*='FieldLabel']");
    for (var i = 0; i < labels.length; i++) {
      var labelNorm = normalizeLabel(labels[i].textContent);
      for (var j = 0; j < targets.length; j++) {
        if (labelMatches(labelNorm, targets[j])) {
          return getFieldWrap(labels[i]);
        }
      }
    }
    return null;
  }

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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showToast(message, type) {
    if (!message) return;
    type = type || "info";
    var container = $("admin-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "admin-toast-container";
      container.className = "admin-toast-container";
      document.body.appendChild(container);
    }
    var toast = document.createElement("div");
    toast.className = "admin-toast admin-toast--" + type;
    toast.textContent = message;
    container.appendChild(toast);
    window.setTimeout(function () {
      toast.classList.add("admin-toast--visible");
    }, 10);
    window.setTimeout(function () {
      toast.classList.remove("admin-toast--visible");
      window.setTimeout(function () {
        toast.remove();
      }, 300);
    }, 4000);
  }

  function isEditorRoute() {
    return /\/entries\/|\/new$/.test(location.hash || "");
  }

  function getRoot() {
    return window.AdminComposer && window.AdminComposer.getRoot ? window.AdminComposer.getRoot() : $("nc-root");
  }

  function normalizeCollectionId(id) {
    if (!id) return "";
    if (window.AdminComposer && window.AdminComposer.normalizeCollectionId) {
      return window.AdminComposer.normalizeCollectionId(id);
    }
    var aliases = {
      "everyday-faith": "articles",
      "back-to-bible": "bible-study",
    };
    var key = String(id).replace(/_/g, "-");
    return aliases[key] || aliases[id] || key;
  }

  function isArticlesCollection(collection) {
    if (window.AdminComposer && window.AdminComposer.isArticlesCollection) {
      return window.AdminComposer.isArticlesCollection(collection);
    }
    return normalizeCollectionId(collection) === "articles";
  }

  function isBibleStudyCollection(collection) {
    if (window.AdminComposer && window.AdminComposer.isBibleStudyCollection) {
      return window.AdminComposer.isBibleStudyCollection(collection);
    }
    return normalizeCollectionId(collection) === "bible-study";
  }

  function getCollection() {
    if (window.AdminComposer && window.AdminComposer.getActiveCollection) {
      var active = window.AdminComposer.getActiveCollection();
      if (active) return active;
    }
    var match = (location.hash || "").match(/\/collections\/([^/?]+)/);
    if (match) return normalizeCollectionId(match[1]);
    if (window.AdminComposer && window.AdminComposer.getPreferredCollection) {
      return window.AdminComposer.getPreferredCollection();
    }
    return "articles";
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

  function applyScalarInContainer(container, labelText, value) {
    if (value === undefined || value === null || value === "") return false;
    var wrap = findFieldInContainer(container, labelText);
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

  function getLatestListEntry(wrap) {
    if (!wrap) return null;
    var candidates = wrap.querySelectorAll(
      '[class*="ListItem"], [class*="ObjectControl"], [class*="NestedObjectControl"]'
    );
    if (candidates.length) return candidates[candidates.length - 1];
    return wrap;
  }

  function shouldApplyField(root, label, options) {
    if (!options.fillEmptyOnly) return true;
    var existing = findFieldByLabel(root, label);
    if (!existing) return true;
    var checkbox = existing.querySelector('input[type="checkbox"]');
    if (checkbox) return !checkbox.checked;
    var input = existing.querySelector("input, textarea");
    return !input || !input.value || !String(input.value).trim();
  }

  function entryHasImportData(entry) {
    if (!entry) return false;
    return !!(
      entry.title ||
      entry.summary ||
      entry.description ||
      entry.author ||
      entry.scripture ||
      entry.sermonSeries ||
      entry.passage ||
      (entry.blocks && entry.blocks.length) ||
      (entry.keyTakeaways && entry.keyTakeaways.length) ||
      (entry.sections && entry.sections.length) ||
      (entry.discussionQuestions && entry.discussionQuestions.length) ||
      (entry.quiz && entry.quiz.length)
    );
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

  function applyQuiz(root, quiz, options) {
    if (!quiz || !quiz.length) return 0;
    options = options || {};

    if (options.fillEmptyOnly) {
      var quizWrap = findFieldByLabel(root, "quiz");
      var existingItems = quizWrap && quizWrap.querySelectorAll('[class*="ListItem"]');
      if (existingItems && existingItems.length) return 0;
    }

    if (options.includeQuiz !== false) {
      applyScalarField(root, "include quiz", true);
    }

    var wrap = findFieldByLabel(root, "quiz");
    if (!wrap) return 0;

    var applied = 0;
    quiz.forEach(function (item, index) {
      if (!item || !item.question) return;

      window.setTimeout(function () {
        var addBtn = clickButtonMatching(wrap, "add");
        if (!addBtn) return;
        addBtn.click();

        window.setTimeout(function () {
          var entry = getLatestListEntry(wrap);
          if (!entry) return;

          applyScalarInContainer(entry, "question", item.question);

          var optionsWrap = findFieldInContainer(entry, "options");
          if (optionsWrap && item.options && item.options.length) {
            item.options.forEach(function (opt, optIndex) {
              window.setTimeout(function () {
                var optAdd = clickButtonMatching(optionsWrap, "add");
                if (optAdd) optAdd.click();
                window.setTimeout(function () {
                  var optInputs = optionsWrap.querySelectorAll('input[type="text"]');
                  var lastOpt = optInputs[optInputs.length - 1];
                  if (lastOpt) setInputValue(lastOpt, opt);
                }, 40);
              }, optIndex * 60);
            });
          }

          window.setTimeout(function () {
            if (typeof item.correctIndex === "number") {
              applyScalarInContainer(entry, "correct option index", item.correctIndex);
            }
            if (item.explanation) {
              applyScalarInContainer(entry, "explanation", item.explanation);
            }
          }, (item.options || []).length * 60 + 80);
        }, 100);
      }, index * 400);

      applied += 1;
    });

    return applied;
  }

  var IMPORT_META_EF = [
    ["title", "title"],
    ["summary", "summary"],
    ["search preview", "description"],
    ["author", "author"],
    ["main scripture", "scripture"],
    ["sermon series", "sermonSeries"],
  ];

  var IMPORT_META_BTB = [
    ["title", "title"],
    ["description", "description"],
    ["passage", "passage"],
    ["author", "author"],
  ];

  var AUTHOR_DEFAULTS = ["ROLCC Pastoral Team", "ROLCC Fellowship Team"];
  var cachedCmsStore = null;

  function findDecapStoreFromReact() {
    var roots = [document.getElementById("nc-root"), document.getElementById("admin-workspace")].filter(Boolean);
    for (var r = 0; r < roots.length; r++) {
      var root = roots[r];
      var fiberKey = Object.keys(root).find(function (k) {
        return k.indexOf("__reactFiber$") === 0 || k.indexOf("__reactContainer$") === 0;
      });
      if (!fiberKey) continue;
      var seen = new Set();
      var queue = [root[fiberKey]];
      while (queue.length) {
        var node = queue.shift();
        if (!node || seen.has(node)) continue;
        seen.add(node);
        var props = node.memoizedProps || node.pendingProps;
        if (props && props.store && typeof props.store.dispatch === "function") {
          return props.store;
        }
        if (node.child) queue.push(node.child);
        if (node.sibling) queue.push(node.sibling);
      }
    }
    return null;
  }

  function getCmsStore() {
    if (cachedCmsStore) return cachedCmsStore;
    if (window.CMS && window.CMS.store) {
      cachedCmsStore = window.CMS.store;
      return cachedCmsStore;
    }
    var store = findDecapStoreFromReact();
    if (store) {
      cachedCmsStore = store;
      if (window.CMS) window.CMS.store = store;
    }
    return store;
  }

  function getDraftEntryJs() {
    var store = getCmsStore();
    if (!store) return null;
    var state = store.getState();
    if (!state || !state.entryDraft) return null;
    var draft = state.entryDraft;
    var entry = draft.get ? draft.get("entry") : draft.entry;
    if (!entry) return null;
    if (entry.toJS) return entry.toJS();
    return JSON.parse(JSON.stringify(entry));
  }

  function isEmptyImportValue(key, value) {
    if (value === undefined || value === null) return true;
    if (typeof value === "string" && !value.trim()) return true;
    if (typeof value === "boolean" && key === "includeQuiz" && value === false) return true;
    if (key === "author" && typeof value === "string" && AUTHOR_DEFAULTS.indexOf(value.trim()) !== -1) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (key === "passageReading" && typeof value === "object" && !Array.isArray(value)) {
      return !String(value.text || "").trim();
    }
    return false;
  }

  function mergeImportIntoData(currentData, importData, fillEmptyOnly) {
    var merged = Object.assign({}, currentData || {});
    Object.keys(importData).forEach(function (key) {
      if (!fillEmptyOnly || isEmptyImportValue(key, merged[key])) {
        merged[key] = importData[key];
      }
    });
    return merged;
  }

  function getCollectionFromStore(store) {
    var state = store.getState();
    if (!state || !state.collections) return null;
    var name = getCollection();
    var collections = state.collections;
    if (collections.get) {
      return collections.get(name);
    }
    var list = collections.toArray ? collections.toArray() : collections;
    if (!list || !list.length) return null;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c && c.get && c.get("name") === name) return c;
      if (c && c.name === name) return c;
    }
    return null;
  }

  function getFieldSchema(store, fieldName) {
    var collection = getCollectionFromStore(store);
    if (!collection) return null;
    var fields = collection.get ? collection.get("fields") : collection.fields;
    if (!fields) return null;
    var list = fields.toArray ? fields.toArray() : fields;
    if (!list || !list.length) return null;
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (f && f.get && f.get("name") === fieldName) return f;
      if (f && f.name === fieldName) return f;
    }
    return null;
  }

  function deepClonePlain(value) {
    if (value === undefined || value === null) return value;
    if (typeof value !== "object") return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return value;
    }
  }

  /**
   * Decap 3 widgets expect Immutable v3 Maps/Lists (or plain values Decap converts).
   * Immutable v4 from the CDN breaks nested object/list editing after import.
   */
  function getDecapCompatibleImmutable() {
    var Imm = window.Immutable;
    if (!Imm || typeof Imm.fromJS !== "function") return null;
    var major = parseInt(String(Imm.version || "0").split(".")[0], 10);
    if (major >= 4) return null;
    return Imm;
  }

  function toStoreValue(value) {
    if (value === undefined || value === null) return value;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
    var Imm = getDecapCompatibleImmutable();
    if (Imm) return Imm.fromJS(deepClonePlain(value));
    return deepClonePlain(value);
  }

  function changeDraftFieldValue(store, fieldName, value, entries) {
    var field = getFieldSchema(store, fieldName);
    if (!field) return false;
    store.dispatch({
      type: "DRAFT_CHANGE_FIELD",
      payload: {
        field: field,
        value: value,
        metadata: {},
        entries: entries || [],
      },
    });
    return true;
  }

  function getNestedFieldSchema(store, parentName, childName) {
    var parent = getFieldSchema(store, parentName);
    if (!parent) return null;
    var fields = parent.get ? parent.get("fields") : parent.fields;
    if (!fields) return null;
    if (fields.find) {
      return (
        fields.find(function (f) {
          return (f.get ? f.get("name") : f.name) === childName;
        }) || null
      );
    }
    var list = fields.toArray ? fields.toArray() : fields;
    for (var i = 0; i < (list || []).length; i++) {
      var f = list[i];
      if ((f.get ? f.get("name") : f.name) === childName) return f;
    }
    return null;
  }

  function changeNestedObjectField(store, parentName, childName, value) {
    var childField = getNestedFieldSchema(store, parentName, childName);
    if (!childField) return false;
    store.dispatch({
      type: "DRAFT_CHANGE_FIELD",
      payload: {
        field: childField,
        value: value,
        metadata: {},
        entries: [parentName],
      },
    });
    return true;
  }

  function applyPassageReadingToStore(store, passageReading) {
    if (!passageReading || typeof passageReading !== "object") return;
    var reference = String(passageReading.reference || "").trim();
    var text = String(passageReading.text || "").trim();
    var wroteNested = false;
    if (reference) wroteNested = changeNestedObjectField(store, "passageReading", "reference", reference) || wroteNested;
    if (text) wroteNested = changeNestedObjectField(store, "passageReading", "text", text) || wroteNested;
    if (!wroteNested) {
      changeDraftFieldValue(store, "passageReading", toStoreValue({ reference: reference, text: text }));
    }
  }

  function applyImportFieldsToStore(store, mergedData, collection) {
    var scalars = ["title", "summary", "description", "author", "scripture", "sermonSeries", "passage"];
    var lists = isArticlesCollection(collection) ? ["blocks", "keyTakeaways"] : ["sections", "discussionQuestions"];

    scalars.forEach(function (key) {
      if (mergedData[key] !== undefined) changeDraftFieldValue(store, key, mergedData[key]);
    });

    lists.forEach(function (key) {
      if (mergedData[key] !== undefined) changeDraftFieldValue(store, key, toStoreValue(mergedData[key]));
    });

    if (mergedData.includeQuiz !== undefined) {
      changeDraftFieldValue(store, "includeQuiz", mergedData.includeQuiz);
    }

    if (mergedData.passageReading !== undefined) {
      applyPassageReadingToStore(store, mergedData.passageReading);
    }

    if (mergedData.quiz !== undefined) {
      var quizValue = toStoreValue(mergedData.quiz);
      if (mergedData.includeQuiz) {
        window.setTimeout(function () {
          changeDraftFieldValue(store, "quiz", quizValue);
        }, 80);
      } else {
        changeDraftFieldValue(store, "quiz", quizValue);
      }
    }

    if (mergedData.tags && mergedData.tags.length) {
      if (window.AdminEditorFields && window.AdminEditorFields.applyTags) {
        window.AdminEditorFields.applyTags(mergedData.tags);
      } else {
        changeDraftFieldValue(store, "tags", tagsToStoreValue(mergedData.tags));
        changeDraftFieldValue(store, "category", mergedData.tags[0] || "");
      }
    }
  }

  function readDraftData() {
    var entryObj = getDraftEntryJs();
    return entryObj && entryObj.data ? entryObj.data : {};
  }

  function countImportedList(actual, expected) {
    var actualLen = (actual || []).length;
    var expectedLen = (expected || []).length;
    if (!actualLen) return 0;
    return Math.min(actualLen, expectedLen);
  }

  function verifyStoreImport(importData) {
    var data = readDraftData();
    var verified = { meta: 0, content: 0, quiz: 0, warnings: [] };

    if (importData.title && data.title === importData.title) verified.meta += 1;
    if (importData.summary && data.summary === importData.summary) verified.meta += 1;
    if (importData.description && data.description === importData.description) verified.meta += 1;
    if (importData.author && data.author === importData.author) verified.meta += 1;
    if (importData.scripture && data.scripture === importData.scripture) verified.meta += 1;
    if (importData.sermonSeries && data.sermonSeries === importData.sermonSeries) verified.meta += 1;
    if (importData.passage && data.passage === importData.passage) verified.meta += 1;

    if (importData.passageReading) {
      var expectedReading = importData.passageReading || {};
      var actualReading = data.passageReading || {};
      var expectedText = String(expectedReading.text || "").trim();
      var actualText = String(actualReading.text || "").trim();
      if (expectedText && actualText) verified.content += 1;
      else if (expectedText) verified.warnings.push("Scripture reading (NKJV) did not apply.");
    }

    if (importData.blocks && importData.blocks.length) {
      var blockLen = countImportedList(data.blocks, importData.blocks);
      if (blockLen > 0) verified.content += blockLen;
      else verified.warnings.push("Article content blocks did not apply.");
    }
    if (importData.keyTakeaways && importData.keyTakeaways.length) {
      var takeLen = countImportedList(data.keyTakeaways, importData.keyTakeaways);
      if (takeLen > 0) verified.content += takeLen;
      else verified.warnings.push("Key takeaways did not apply.");
    }
    if (importData.sections && importData.sections.length) {
      var secLen = (data.sections || []).length;
      var firstSection = (data.sections || [])[0] || {};
      var firstHeading = String(firstSection.heading || "").trim();
      if (secLen > 0 && firstHeading) verified.content += secLen;
      else if (secLen > 0) verified.content += secLen;
      else verified.warnings.push("Sections did not apply.");
    }
    if (importData.discussionQuestions && importData.discussionQuestions.length) {
      var qLen = (data.discussionQuestions || []).length;
      if (qLen > 0) verified.content += qLen;
      else verified.warnings.push("Discussion questions did not apply.");
    }
    if (importData.includeQuiz === true && data.includeQuiz === true) verified.meta += 1;
    if (importData.quiz && importData.quiz.length) {
      var quizLen = (data.quiz || []).length;
      if (quizLen > 0) verified.quiz = quizLen;
      else verified.warnings.push("Quiz questions did not apply.");
    }
    if (importData.tags && importData.tags.length) {
      var importedTags = normalizeDraftTags(data);
      if (importedTags.length) verified.meta += 1;
      else verified.warnings.push("Tags did not apply.");
    }

    return verified;
  }

  function applyEntryViaStore(entry, options, done) {
    options = options || {};
    if (!parseApi) {
      if (done) done(null);
      return null;
    }

    var store = getCmsStore();
    if (!store) {
      if (done) done(null);
      return null;
    }

    if (!getDraftEntryJs()) {
      if (done) done(null);
      return null;
    }

    var collection = getCollection();
    var normalized = parseApi.normalizeEntryForCms(entry, collection);
    var importData = parseApi.pickImportFields(normalized, collection);
    if (!Object.keys(importData).length) {
      var empty = { meta: 0, content: 0, quiz: 0, warnings: [] };
      if (done) done(empty);
      return empty;
    }

    var currentData = readDraftData();
    var mergedData = mergeImportIntoData(currentData, importData, options.fillEmptyOnly !== false);

    applyImportFieldsToStore(store, mergedData, collection);

    var root = getRoot();
    if (mergedData.title) {
      var headerInput = $("admin-editor-title-input");
      if (headerInput) setInputValue(headerInput, mergedData.title);
      if (root && window.AdminComposer && window.AdminComposer.syncTitleFromDecap) {
        window.AdminComposer.syncTitleFromDecap(root);
      }
    }

    if (root && window.AdminEditorFields && typeof window.AdminEditorFields.mount === "function") {
      window.setTimeout(function () {
        window.AdminEditorFields.mount(getRoot());
      }, 120);
    }

    if (window.AdminComposer && window.AdminComposer.resetEditorSnapshot) {
      window.setTimeout(function () {
        window.AdminComposer.resetEditorSnapshot(getRoot());
      }, 300);
    }

    function finish() {
      var verified = verifyStoreImport(importData);
      if (done) done(verified);
      return verified;
    }

    window.setTimeout(finish, mergedData.quiz && mergedData.includeQuiz ? 280 : 160);
    return null;
  }

  function applyEntryImport(root, entry, options, done) {
    options = options || {};
    applyEntryViaStore(entry, options, function (storeResults) {
      var results;
      if (storeResults && (storeResults.meta || storeResults.content || storeResults.quiz)) {
        results = storeResults;
      } else if (storeResults && storeResults.warnings && storeResults.warnings.length) {
        results = storeResults;
      } else {
        results = {
          meta: 0,
          content: 0,
          quiz: 0,
          warnings: [
            "Could not import into the editor. Save your JSON file, then use it as a reference while filling fields manually.",
          ],
        };
      }
      if (done) done(results);
    });
  }

  function applyEntryImportDom_UNUSED(root, entry, options) {
    options = options || {};
    var collection = getCollection();
    var metaFields = isBibleStudyCollection(collection) ? IMPORT_META_BTB : IMPORT_META_EF;
    var results = { meta: 0, content: 0, quiz: 0, warnings: [] };

    metaFields.forEach(function (pair) {
      var label = pair[0];
      var key = pair[1];
      if (entry[key] === undefined || entry[key] === null || entry[key] === "") return;
      if (!shouldApplyField(root, label, options)) return;
      if (applyScalarField(root, label, entry[key])) results.meta += 1;
    });

    if (entry.title && shouldApplyField(root, "title", options)) {
      var headerInput = $("admin-editor-title-input");
      if (headerInput) setInputValue(headerInput, entry.title);
      if (window.AdminComposer && window.AdminComposer.syncTitleFromDecap) {
        window.AdminComposer.syncTitleFromDecap(root);
      }
    }

    if (isArticlesCollection(collection)) {
      if (!options.fillEmptyOnly || shouldApplyField(root, "key takeaways", options)) {
        results.content += applySimpleList(root, "key takeaways", entry.keyTakeaways || []);
      }
      var blockCount = applyBlocks(root, entry.blocks || []);
      results.content += blockCount;
      if ((entry.blocks || []).length && blockCount < (entry.blocks || []).length) {
        results.warnings.push("Some content blocks may need manual review after import.");
      }
    } else {
      results.content += applySections(root, entry.sections || []);
      results.content += applySimpleList(root, "discussion questions", entry.discussionQuestions || []);
    }

    if (entry.quiz && entry.quiz.length) {
      results.quiz = applyQuiz(root, entry.quiz, {
        fillEmptyOnly: options.fillEmptyOnly,
        includeQuiz: entry.includeQuiz !== false,
      });
      if (results.quiz < entry.quiz.length) {
        results.warnings.push("Some quiz questions may need manual review after import.");
      }
    }

    if (window.AdminComposer && window.AdminComposer.resetEditorSnapshot) {
      window.setTimeout(function () {
        window.AdminComposer.resetEditorSnapshot(root);
      }, 1200);
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

  function downloadRepoReadyJson(entry) {
    if (!parseApi || !entry) return "";
    var collection = getCollection();
    var disk = parseApi.normalizeEntryForDisk(entry, collection);
    var slug = parseApi.slugifyTitle(disk.title);
    var text = JSON.stringify(disk, null, 2) + "\n";
    var blob = new Blob([text], { type: "application/json" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = slug + ".json";
    document.body.appendChild(link);
    link.click();
    window.setTimeout(function () {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 0);
    return slug + ".json";
  }

  function prepareDraftForSave(options) {
    options = options || {};
    var store = getCmsStore();
    if (!store) return false;

    var data = readDraftData();
    var headerInput = $("admin-editor-title-input");
    var headerTitle = headerInput ? headerInput.value.trim() : "";
    var today = new Date().toISOString().slice(0, 10);

    if (headerTitle) {
      changeDraftFieldValue(store, "title", headerTitle);
      data.title = headerTitle;
    }

    if (!data.title || !String(data.title).trim()) {
      if (options.allowIncomplete) {
        changeDraftFieldValue(store, "title", "Untitled draft");
        data.title = "Untitled draft";
      } else {
        return false;
      }
    }

    if (!data.date) changeDraftFieldValue(store, "date", today);
    if (!data.thumbnail) changeDraftFieldValue(store, "thumbnail", "/images/og-image.jpg");
    changeDraftFieldValue(store, "publish", options.publish === true);

    if (options.publish === true) {
      changeDraftFieldValue(store, "scheduleDate", "");
      changeDraftFieldValue(store, "scheduleWindow", "");
    } else if (options.scheduleDate && options.scheduleWindow) {
      changeDraftFieldValue(store, "scheduleDate", options.scheduleDate);
      changeDraftFieldValue(store, "scheduleWindow", options.scheduleWindow);
      changeDraftFieldValue(store, "date", options.scheduleDate);
    }
    var tags = normalizeDraftTags(data);
    if (tags.length) {
      changeDraftFieldValue(store, "tags", tagsToStoreValue(tags));
      changeDraftFieldValue(store, "category", tags[0]);
    }

    return true;
  }

  var PUBLISH_FIELD_LABELS = {
    title: ["title"],
    date: ["date"],
    tags: ["tags", "tag"],
    summary: ["summary"],
    description: ["search preview"],
    passage: ["passage"],
    sections: ["sections"],
    "discussion questions": ["discussion questions"],
    quiz: ["quiz"],
  };

  function normalizeDraftTags(data) {
    data = data || {};
    var tags = [];
    if (Array.isArray(data.tags)) {
      data.tags.forEach(function (item) {
        var name = "";
        if (typeof item === "string" && item.trim()) name = item.trim();
        else if (item && typeof item === "object") {
          if (item.tag !== undefined) name = String(item.tag).trim();
          else if (item.name !== undefined) name = String(item.name).trim();
          else if (typeof item.toJS === "function") {
            var plain = item.toJS();
            if (plain && plain.tag) name = String(plain.tag).trim();
          } else if (typeof item.get === "function") {
            var mapped = item.get("tag") || item.get("name");
            if (mapped !== undefined) name = String(mapped).trim();
          }
        }
        if (name && name !== "[object Object]") tags.push(name);
      });
    }
    if (!tags.length && data.category) {
      var cat = String(data.category).trim();
      if (cat && cat !== "[object Object]") tags.push(cat);
    }
    if (window.AdminEditorFields && window.AdminEditorFields.mapLegacyTags) {
      tags = window.AdminEditorFields.mapLegacyTags(tags);
    }
    var seen = Object.create(null);
    return tags.filter(function (tag) {
      if (!tag || seen[tag]) return false;
      seen[tag] = true;
      return true;
    });
  }

  function tagsToStoreValue(tags) {
    var list = (tags || []).map(function (tag) {
      return { tag: tag };
    });
    return toStoreValue(list);
  }

  function validatePublishRequirements() {
    var data = readDraftData();
    var collection = getCollection();
    var headerInput = $("admin-editor-title-input");
    var title = (headerInput && headerInput.value.trim()) || (data.title && String(data.title).trim()) || "";
    var missing = [];

    if (!title) missing.push({ key: "title", label: "Title" });
    if (!data.date) missing.push({ key: "date", label: "Date" });

    if (isBibleStudyCollection(collection)) {
      var studyTags = normalizeDraftTags(data);
      if (studyTags.length < 1) missing.push({ key: "tags", label: "Tags (at least 1)" });
      if (!data.description || !String(data.description).trim()) {
        missing.push({ key: "description", label: "Description" });
      }
      if (!data.passage || !String(data.passage).trim()) {
        missing.push({ key: "passage", label: "Passage" });
      }
      var passageReading = data.passageReading || {};
      if (passageReading && typeof passageReading.get === "function") {
        passageReading = {
          reference: passageReading.get("reference") || "",
          text: passageReading.get("text") || "",
        };
      }
      var passageReadingText = String(passageReading.text || "").trim();
      if (!passageReadingText) {
        missing.push({ key: "passageReading", label: "Scripture reading (NKJV)" });
      }
      var sections = data.sections || [];
      var hasSectionContent = sections.some(function (section) {
        return section && (String(section.heading || "").trim() || String(section.body || "").trim());
      });
      if (!hasSectionContent) missing.push({ key: "sections", label: "Sections" });
      if (!data.discussionQuestions || !data.discussionQuestions.length) {
        missing.push({ key: "discussionQuestions", label: "Discussion questions" });
      }
      var quizCount = (data.quiz || []).length;
      if (data.includeQuiz !== true || quizCount < 3) {
        missing.push({ key: "quiz", label: "Quiz (at least 3 questions)" });
      }
      return missing;
    }

    var tags = normalizeDraftTags(data);
    if (tags.length < 2) missing.push({ key: "tags", label: "Tags (at least 2)" });
    if (!data.summary || !String(data.summary).trim()) missing.push({ key: "summary", label: "Summary" });
    if (!data.description || !String(data.description).trim()) {
      missing.push({ key: "description", label: "Search preview" });
    }
    if (!data.blocks || !data.blocks.length) missing.push({ key: "blocks", label: "Article content" });

    return missing;
  }

  function findFieldContainer(labelEl) {
    var node = labelEl;
    for (var i = 0; i < 10 && node; i++) {
      if (
        node.classList &&
        (Array.prototype.some.call(node.classList, function (c) {
          return /Control|Widget|FieldPane|field/i.test(c);
        }) ||
          node.tagName === "SECTION")
      ) {
        return node;
      }
      node = node.parentElement;
    }
    return labelEl.parentElement || labelEl;
  }

  function resolvePublishFieldEl(root, item) {
    if (!root || !item) return null;

    if (item.key === "title") {
      return $("admin-editor-title-block");
    }

    if (item.key === "tags") {
      return root.querySelector(".admin-field--tags-wired");
    }

    var labelKey =
      item.key === "description"
        ? "search preview"
        : item.key === "blocks"
          ? "article content"
          : item.key === "discussionQuestions"
            ? "discussion questions"
            : item.key;
    var wrap = findFieldByLabel(root, labelKey);
    if (wrap) return wrap;

    var labels = PUBLISH_FIELD_LABELS[item.key] || [String(item.label || "").toLowerCase()];
    var nodes = root.querySelectorAll("main label, main h2, main legend, main p");
    for (var i = 0; i < nodes.length; i++) {
      var text = normalizeLabel(nodes[i].textContent || "");
      var matched = labels.some(function (label) {
        return text === label || text.indexOf(label) === 0;
      });
      if (!matched) continue;
      return findFieldContainer(nodes[i]);
    }

    return null;
  }

  function getScrollParent(el) {
    var node = el && el.parentElement;
    while (node && node !== document.body) {
      var style = window.getComputedStyle(node);
      var overflowY = style.overflowY;
      if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight + 1) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function scrollToPublishField(el) {
    if (!el) return;

    var topbar = $("admin-topbar");
    var headerOffset = topbar && !topbar.hidden ? topbar.offsetHeight + 20 : 20;
    var titleBlock = $("admin-editor-title-block");

    if (titleBlock && (el === titleBlock || titleBlock.contains(el))) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      var titleInput = $("admin-editor-title-input");
      if (titleInput) {
        window.setTimeout(function () {
          titleInput.focus({ preventScroll: true });
        }, 320);
      }
      return;
    }

    var scrollParent = getScrollParent(el);
    if (scrollParent) {
      var parentRect = scrollParent.getBoundingClientRect();
      var elRect = el.getBoundingClientRect();
      var nextTop = scrollParent.scrollTop + (elRect.top - parentRect.top) - headerOffset;
      scrollParent.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
    } else {
      var rect = el.getBoundingClientRect();
      var absoluteTop = window.pageYOffset + rect.top - headerOffset;
      window.scrollTo({ top: Math.max(0, absoluteTop), behavior: "smooth" });
    }

    var focusable = el.querySelector(
      'input:not([type="hidden"]), textarea, select, button, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) {
      window.setTimeout(function () {
        focusable.focus({ preventScroll: true });
      }, 360);
    }
  }

  function clearFieldHighlights(root) {
    if (!root) return;
    root.querySelectorAll(".admin-field--missing").forEach(function (el) {
      el.classList.remove("admin-field--missing");
    });
    var titleBlock = $("admin-editor-title-block");
    if (titleBlock) titleBlock.classList.remove("admin-field--missing");
  }

  function highlightPublishFields(root, missing) {
    clearFieldHighlights(root);
    if (!root || !missing || !missing.length) return null;

    var firstEl = null;
    missing.forEach(function (item) {
      var el = resolvePublishFieldEl(root, item);
      if (!el) return;
      el.classList.add("admin-field--missing");
      if (!firstEl) firstEl = el;
    });

    if (firstEl) {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          scrollToPublishField(firstEl);
        });
      });
    }

    return firstEl;
  }

  function findEditorPersistApi(rootEl) {
    return findEditorActionApi(rootEl);
  }

  function findEditorActionApi(rootEl) {
    if (!rootEl) return null;
    var fiberKey = Object.keys(rootEl).find(function (k) {
      return k.indexOf("__reactFiber$") === 0 || k.indexOf("__reactContainer$") === 0;
    });
    if (!fiberKey) return null;

    var api = {};
    var actionNames = [
      "persistEntry",
      "handlePersistEntry",
      "deleteEntry",
      "handleDeleteEntry",
      "handleDeletePublishedEntry",
      "deletePublishedEntry",
      "onDelete",
      "discardDraft",
      "handleDiscardDraft",
    ];

    var seen = new Set();
    var queue = [rootEl[fiberKey]];
    while (queue.length) {
      var node = queue.shift();
      if (!node || seen.has(node)) continue;
      seen.add(node);
      var props = node.memoizedProps || node.pendingProps;
      if (props) {
        actionNames.forEach(function (name) {
          if (typeof props[name] === "function" && !api[name]) {
            api[name] = props[name];
          }
        });
        if (props.collection && !api.collection) {
          api.collection = props.collection;
        }
      }
      if (node.child) queue.push(node.child);
      if (node.sibling) queue.push(node.sibling);
      if (node.return) queue.push(node.return);
    }

    var hasAction = actionNames.some(function (name) {
      return typeof api[name] === "function";
    });
    return hasAction ? api : null;
  }

  function isNewEntryRoute() {
    return /\/new(?:\?|$)/.test(location.hash || "");
  }

  function getArticleDataFolder(collectionName) {
    var folders = {
      articles: "everyday-faith",
      "bible-study": "back-to-bible",
    };
    return folders[normalizeCollectionId(collectionName)] || null;
  }

  function getDraftMeta() {
    var collectionName = getCollection();
    var slugFromHash = getEntrySlugFromHash();
    var store = getCmsStore();

    if (store) {
      var state = store.getState();
      if (state && state.entryDraft) {
        var draft = state.entryDraft;
        var slug = draft.get ? draft.get("slug") : draft.slug;
        var newRecord = draft.get ? draft.get("newRecord") : draft.newRecord;
        return {
          slug: slug || slugFromHash,
          newRecord: Boolean(newRecord) || isNewEntryRoute(),
          collection: getCollectionFromStore(store),
          collectionName: collectionName,
        };
      }
    }

    if (!isEditorRoute()) return null;

    if (isNewEntryRoute()) {
      return {
        slug: "",
        newRecord: true,
        collection: store ? getCollectionFromStore(store) : null,
        collectionName: collectionName,
      };
    }

    if (slugFromHash) {
      return {
        slug: slugFromHash,
        newRecord: false,
        collection: store ? getCollectionFromStore(store) : null,
        collectionName: collectionName,
      };
    }

    return null;
  }

  function navigateToCollection(collectionName) {
    var name = collectionName || getCollection();
    location.hash = "#/collections/" + name;
  }

  function discardDraftEntry() {
    var store = getCmsStore();
    var root = $("nc-root");
    var api = root ? findEditorActionApi(root) : null;

    if (api && typeof api.discardDraft === "function") {
      api.discardDraft();
    } else if (api && typeof api.handleDiscardDraft === "function") {
      api.handleDiscardDraft();
    } else if (store) {
      store.dispatch({ type: "DRAFT_DISCARD" });
    }

    navigateToCollection();
    return Promise.resolve();
  }

  function getEntrySlugFromHash() {
    var match = (location.hash || "").match(/\/entries\/([^/?]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function findEntryEditorDeleteApi(rootEl) {
    if (!rootEl) return null;
    var fiberKey = Object.keys(rootEl).find(function (k) {
      return k.indexOf("__reactFiber$") === 0 || k.indexOf("__reactContainer$") === 0;
    });
    if (!fiberKey) return null;

    var seen = new Set();
    var queue = [rootEl[fiberKey]];
    while (queue.length) {
      var node = queue.shift();
      if (!node || seen.has(node)) continue;
      seen.add(node);

      if (node.stateNode && typeof node.stateNode.handleDeleteEntry === "function") {
        return {
          handleDeleteEntry: function () {
            return node.stateNode.handleDeleteEntry();
          },
          newEntry: Boolean(node.stateNode.props && node.stateNode.props.newEntry),
        };
      }

      var props = node.memoizedProps || node.pendingProps;
      if (props && props.collection && typeof props.deleteEntry === "function") {
        var slug = props.slug || getEntrySlugFromHash();
        if (props.newEntry) {
          return {
            newEntry: true,
            collection: props.collection,
            collectionName: props.collection.get ? props.collection.get("name") : getCollection(),
          };
        }
        if (slug) {
          return {
            deleteEntry: props.deleteEntry,
            collection: props.collection,
            slug: slug,
            collectionName: props.collection.get ? props.collection.get("name") : getCollection(),
          };
        }
      }

      if (node.child) queue.push(node.child);
      if (node.sibling) queue.push(node.sibling);
      if (node.return) queue.push(node.return);
    }
    return null;
  }

  function withConfirmBypass(fn) {
    var original = window.confirm;
    window.confirm = function () {
      return true;
    };
    try {
      return fn();
    } finally {
      window.confirm = original;
    }
  }

  function waitForEditorExit(timeoutMs) {
    timeoutMs = timeoutMs || 15000;
    return new Promise(function (resolve, reject) {
      if (!isEditorRoute()) {
        resolve();
        return;
      }
      var started = Date.now();
      var timer = window.setInterval(function () {
        if (!isEditorRoute()) {
          window.clearInterval(timer);
          resolve();
          return;
        }
        if (Date.now() - started > timeoutMs) {
          window.clearInterval(timer);
          reject(new Error("Delete timed out — refresh and try again."));
        }
      }, 150);
    });
  }

  function clickDecapDeleteButton(root) {
    if (!root) return false;
    var candidates = root.querySelectorAll("button, a[class*='Button'], a.btn");
    for (var i = 0; i < candidates.length; i++) {
      var btn = candidates[i];
      var text = (btn.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (
        text === "delete" ||
        text === "delete entry" ||
        text.indexOf("delete published") === 0 ||
        text.indexOf("delete unpublished") === 0
      ) {
        btn.click();
        return true;
      }
    }
    return false;
  }

  function invokeDeleteEntry(deleteFn, collection, slug) {
    if (!deleteFn || !collection || !slug) {
      return Promise.reject(new Error("Delete action not available for this entry"));
    }
    var store = getCmsStore();
    var result = deleteFn(collection, slug);
    if (typeof result === "function") {
      if (!store || typeof store.dispatch !== "function") {
        return Promise.reject(new Error("CMS store not ready — refresh and try again"));
      }
      return Promise.resolve(store.dispatch(result));
    }
    return Promise.resolve(result);
  }

  function deleteEntryOnGithub(collectionName, slug) {
    var folder = getArticleDataFolder(collectionName);
    if (!folder) {
      return Promise.reject(new Error("Unknown collection — cannot delete file"));
    }
    var path = "data/articles/" + folder + "/" + slug + ".json";
    var cms = window.CMS;
    var backend = cms && typeof cms.getBackend === "function" ? cms.getBackend() : null;
    if (!backend || typeof backend.getToken !== "function") {
      return Promise.reject(new Error("Not signed in — log in to GitHub and try again"));
    }

    return backend.getToken().then(function (token) {
      if (!token) {
        return Promise.reject(new Error("Not signed in — log in to GitHub and try again"));
      }
      var readUrl =
        "https://api.github.com/repos/" +
        GITHUB_REPO +
        "/contents/" +
        encodeURIComponent(path) +
        "?ref=" +
        GITHUB_BRANCH;
      return fetch(readUrl, {
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/vnd.github+json",
        },
      })
        .then(function (res) {
          if (res.status === 404) return { missing: true };
          if (!res.ok) {
            return res.json().catch(function () {
              return {};
            }).then(function (body) {
              throw new Error((body && body.message) || "Could not read article file on GitHub");
            });
          }
          return res.json();
        })
        .then(function (file) {
          if (file && file.missing) return true;
          if (!file || !file.sha) {
            throw new Error("Article file not found in repository");
          }
          return fetch("https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + encodeURIComponent(path), {
            method: "DELETE",
            headers: {
              Authorization: "Bearer " + token,
              Accept: "application/vnd.github+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: 'Delete article "' + slug + '"',
              sha: file.sha,
              branch: GITHUB_BRANCH,
            }),
          }).then(function (res) {
            if (!res.ok) {
              return res.json().catch(function () {
                return {};
              }).then(function (body) {
                throw new Error((body && body.message) || "GitHub rejected the delete request");
              });
            }
            return true;
          });
        });
    });
  }

  function isGitBackendError(err) {
    var msg = (err && err.message) || String(err || "");
    return msg.indexOf("BadObjectState") !== -1 || msg.indexOf("GitRPC") !== -1 || msg.indexOf("API_ERROR") !== -1;
  }

  function clearEntryLocalDraft(meta) {
    var slug = meta.slug || getEntrySlugFromHash();
    var folder = getArticleDataFolder(meta.collectionName || getCollection());
    if (!slug) return;
    var markers = [slug];
    if (folder) {
      markers.push("data/articles/" + folder + "/" + slug);
      markers.push(folder + "/" + slug);
    }
    try {
      Object.keys(localStorage).forEach(function (key) {
        if (!/netlify|decap|nc-|backstage|persist/i.test(key)) return;
        var val = localStorage.getItem(key);
        if (!val) return;
        for (var i = 0; i < markers.length; i++) {
          if (val.indexOf(markers[i]) !== -1) {
            localStorage.removeItem(key);
            break;
          }
        }
      });
    } catch (err) {
      /* ignore */
    }
    var store = getCmsStore();
    if (store) {
      try {
        store.dispatch({ type: "DRAFT_DISCARD" });
      } catch (err2) {
        /* ignore */
      }
    }
  }

  function deleteEntryReliably(meta) {
    var collectionName = meta.collectionName || getCollection();
    var slug = meta.slug || getEntrySlugFromHash();
    return deleteEntryOnGithub(collectionName, slug).then(function () {
      clearEntryLocalDraft(meta);
      return true;
    });
  }

  function deleteEntryViaBackend(meta) {
    var store = getCmsStore();
    var collectionName = meta.collectionName || getCollection();
    var slug = meta.slug || getEntrySlugFromHash();
    if (!slug) {
      return Promise.reject(new Error("No article open — missing entry slug"));
    }

    return deleteEntryOnGithub(collectionName, slug).catch(function (githubErr) {
      var collection = meta.collection;
      if (!collection && store) {
        collection = getCollectionFromStore(store);
      }

      var cms = window.CMS;
      var backend = cms && typeof cms.getBackend === "function" ? cms.getBackend() : null;
      if (backend && typeof backend.deleteEntry === "function" && store && collection) {
        var state = store.getState();
        return Promise.resolve(backend.deleteEntry(state, collection, slug)).catch(function (backendErr) {
          if (isGitBackendError(backendErr) && !isGitBackendError(githubErr)) {
            throw backendErr;
          }
          throw githubErr;
        });
      }

      throw githubErr;
    });
  }

  function deleteExistingEntry(root, meta, attempt) {
    attempt = attempt || 0;
    var collectionName = meta.collectionName || getCollection();
    var slug = meta.slug || getEntrySlugFromHash();
    var editorApi = findEntryEditorDeleteApi(root);
    var actionApi = findEditorActionApi(root);

    if ((editorApi && editorApi.newEntry) || (isNewEntryRoute() && !slug)) {
      return discardDraftEntry();
    }

    if (slug && getArticleDataFolder(collectionName)) {
      return deleteEntryReliably(meta).then(function () {
        navigateToCollection(collectionName);
      });
    }

    var handleDelete =
      (editorApi && editorApi.handleDeleteEntry) ||
      (actionApi && actionApi.handleDeleteEntry) ||
      (actionApi && actionApi.handleDeletePublishedEntry);
    if (typeof handleDelete === "function") {
      withConfirmBypass(function () {
        handleDelete();
      });
      return waitForEditorExit();
    }

    var deleteFn =
      (editorApi && editorApi.deleteEntry) ||
      (actionApi && actionApi.deleteEntry) ||
      (actionApi && actionApi.deletePublishedEntry);
    var collection =
      (editorApi && editorApi.collection) ||
      (actionApi && actionApi.collection) ||
      meta.collection;
    if (!collection) {
      var store = getCmsStore();
      if (store) collection = getCollectionFromStore(store);
    }
    var resolvedSlug = (editorApi && editorApi.slug) || slug;

    if (typeof deleteFn === "function" && collection && resolvedSlug) {
      return invokeDeleteEntry(deleteFn, collection, resolvedSlug)
        .then(function () {
          clearEntryLocalDraft(meta);
          navigateToCollection(collectionName);
        })
        .catch(function (err) {
          if (!isGitBackendError(err)) throw err;
          return deleteEntryReliably(meta).then(function () {
            navigateToCollection(collectionName);
          });
        });
    }

    if (attempt < 10) {
      return new Promise(function (resolve, reject) {
        window.setTimeout(function () {
          deleteExistingEntry(root, meta, attempt + 1).then(resolve).catch(reject);
        }, 200);
      });
    }

    return deleteEntryViaBackend(meta).then(function () {
      clearEntryLocalDraft(meta);
      navigateToCollection(collectionName);
    });
  }

  function deleteArticleEntry() {
    var root = $("nc-root");
    if (!root) {
      return Promise.reject(new Error("CMS shell not loaded — refresh and try again"));
    }

    if (!isEditorRoute()) {
      return Promise.reject(new Error("No article open — open an article first"));
    }

    var meta = getDraftMeta();
    if (!meta) {
      return Promise.reject(new Error("No article open — could not read the current entry"));
    }

    if (meta.newRecord) {
      return discardDraftEntry();
    }

    var slug = meta.slug || getEntrySlugFromHash();
    if (!slug) {
      return Promise.reject(new Error("No article open — missing entry slug"));
    }
    var collectionName = meta.collectionName || getCollection();

    return deleteExistingEntry(root, meta).then(function () {
      if (window.AdminComposer && window.AdminComposer.removeArticleFromListing) {
        window.AdminComposer.removeArticleFromListing(collectionName, slug);
      }
      if (isEditorRoute()) {
        navigateToCollection(collectionName);
      }
    });
  }

  function isEditorRoute() {
    return /\/entries\/|\/new$/.test(location.hash || "");
  }

  function persistEntryDraft(attempt) {
    attempt = attempt || 0;
    var store = getCmsStore();
    var root = $("nc-root");
    if (!store || !root) {
      return Promise.reject(new Error("Editor not ready"));
    }

    var api = findEditorPersistApi(root);
    if (!api) {
      if (attempt < 10) {
        return new Promise(function (resolve, reject) {
          window.setTimeout(function () {
            persistEntryDraft(attempt + 1).then(resolve).catch(reject);
          }, 200);
        });
      }
      return Promise.reject(new Error("Could not connect to the editor save action"));
    }

    if (api.handlePersistEntry) {
      return Promise.resolve(api.handlePersistEntry({}));
    }

    var collection = api.collection;
    if (!collection) {
      var state = store.getState();
      if (state.collections && state.collections.get) {
        collection = state.collections.get(getCollection());
      }
    }
    if (!collection) {
      return Promise.reject(new Error("Collection not found"));
    }

    return Promise.resolve(api.persistEntry(collection));
  }

  function saveEntry(options) {
    options = options || {};
    var mode = options.mode || "draft";
    prepareDraftForSave({
      publish: mode === "publish",
      scheduleDate: mode === "schedule" ? options.scheduleDate : "",
      scheduleWindow: mode === "schedule" ? options.scheduleWindow : "",
      allowIncomplete: mode === "draft",
    });

    var data = readDraftData();
    var tagWork = Promise.resolve();
    if (window.AdminEditorFields) {
      var tags = normalizeDraftTags(data);
      tags.forEach(function (tagName) {
        tagWork = tagWork.then(function () {
          return window.AdminEditorFields.ensureTagPersisted(tagName);
        });
      });
      tagWork = tagWork.then(function () {
        return window.AdminEditorFields.ensurePendingTagsPersisted();
      });
      if (data.featured === true && mode === "publish") {
        tagWork = tagWork.then(function () {
          return window.AdminEditorFields.ensureSingleFeaturedArticle();
        });
      }
    }

    return tagWork.then(function () {
      return persistEntryDraft(0);
    });
  }

  function clickDecapSaveButton(root) {
    if (!root) return false;
    var candidates = root.querySelectorAll("button, a[class*='Button'], a.btn");
    for (var i = 0; i < candidates.length; i++) {
      var btn = candidates[i];
      if (btn.id === "admin-save-draft-btn" || btn.closest("#admin-save-draft-btn")) continue;
      var text = (btn.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (
        text === "publish" ||
        text === "publish now" ||
        text === "save" ||
        text === "save and publish" ||
        text.indexOf("publish") === 0
      ) {
        btn.click();
        return true;
      }
    }
    return false;
  }

  function getRepoImportFolder(collection) {
    return isBibleStudyCollection(collection) ? "data/articles/back-to-bible" : "data/articles/everyday-faith";
  }

  function formatImportSummary(results) {
    var parts = [];
    if (results.meta) {
      parts.push(results.meta + " info field" + (results.meta === 1 ? "" : "s"));
    }
    if (results.content) {
      parts.push(results.content + " content item" + (results.content === 1 ? "" : "s"));
    }
    if (results.quiz) {
      parts.push(results.quiz + " quiz question" + (results.quiz === 1 ? "" : "s"));
    }
    var msg = parts.length ? "Imported " + parts.join(", ") : "No matching empty fields found to fill.";
    if (results.warnings.length) msg += ". " + results.warnings.join(" ");
    return msg;
  }

  function runAutoImport(entry, options, attempt) {
    options = options || {};
    attempt = attempt || 0;
    if (!entry) {
      showToast("Nothing to import.", "error");
      return { ok: false };
    }

    var root = getRoot();
    if (!root) {
      showToast("Editor not ready. Try again in a moment.", "error");
      return { ok: false };
    }

    if (!isEditorRoute()) {
      showToast("Open an article in the editor, then drop the JSON file again.", "error");
      return { ok: false };
    }

    function runImport() {
      try {
        applyEntryImport(root, entry, options, function (results) {
          if (!results.meta && !results.content && !results.quiz) {
            if (entryHasImportData(entry) && attempt < 8) {
              window.setTimeout(function () {
                runAutoImport(entry, options, attempt + 1);
              }, attempt === 0 ? 400 : 600);
              if (attempt === 0) {
                showToast("Waiting for editor…", "info");
              }
              return;
            }
            var folder = getRepoImportFolder(getCollection());
            var filename = downloadRepoReadyJson(entry);
            var failMsg = filename
              ? "Editor import failed. Downloaded " + filename + " — save to " + folder + "/ and open in the CMS."
              : results.warnings.length
                ? results.warnings.join(" ")
                : "Could not fill fields. Download repo JSON from the import dialog instead.";
            showToast(failMsg, "info");
            return;
          }
          var toastType = results.warnings.length ? "info" : "success";
          showToast(formatImportSummary(results), toastType);
        });
        return { ok: true, pending: true };
      } catch (err) {
        showToast("Import failed: " + (err.message || err), "error");
        return { ok: false, error: err.message || String(err) };
      }
    }

    return loadImportTags().then(function () {
      return runImport();
    });
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
      /"title"\s*:/.test(trimmed) ||
      /"blocks"\s*:/.test(trimmed) ||
      /"sections"\s*:/.test(trimmed) ||
      /"keyTakeaways"\s*:/.test(trimmed) ||
      /"discussionQuestions"\s*:/.test(trimmed) ||
      /"quiz"\s*:/.test(trimmed) ||
      /^#\s+.+/m.test(trimmed)
    );
  }

  function ensureModal() {
    var modal = $("admin-import-modal");
    if (modal && !modal.querySelector(".admin-import-modal__checklist")) {
      modal.remove();
      modal = null;
    }
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "admin-import-modal";
    modal.className = "admin-import-modal";
    modal.hidden = true;
    modal.innerHTML =
      '<div class="admin-import-modal__backdrop" data-import-close></div>' +
      '<div class="admin-import-modal__panel" role="dialog" aria-labelledby="admin-import-title">' +
      '<div class="admin-import-modal__header">' +
      '<h2 id="admin-import-title" class="admin-import-modal__title">Import content</h2>' +
      '<button type="button" class="admin-import-modal__close-btn" data-import-close aria-label="Close modal">&times;</button>' +
      '</div>' +
      '<div class="admin-import-modal__body">' +
      '<div class="admin-import-modal__source-actions">' +
      '<button type="button" class="btn-outline admin-import-source-btn" id="admin-import-file-btn">' +
      '<svg class="admin-topbar-icon-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>Choose JSON file</span>' +
      '</button>' +
      '<button type="button" class="btn-outline admin-import-source-btn" id="admin-import-paste-btn">' +
      '<svg class="admin-topbar-icon-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg><span>Paste from clipboard</span>' +
      '</button>' +
      '<input type="file" id="admin-import-file-input" accept=".json,application/json,.txt,text/plain" hidden />' +
      '</div>' +
      '<div class="admin-import-modal__paste-box" id="admin-import-paste-box" hidden>' +
      '<textarea id="admin-import-paste-textarea" class="admin-import-modal__textarea" placeholder="Paste article JSON content here..."></textarea>' +
      '<div class="admin-import-modal__paste-actions">' +
      '<button type="button" class="btn-primary" id="admin-import-parse-pasted-btn">Parse Pasted JSON</button>' +
      '</div>' +
      '</div>' +
      '<div class="admin-import-modal__summary-wrap">' +
      '<ul class="admin-import-modal__checklist" id="admin-import-summary"></ul>' +
      '<label class="admin-import-modal__label"><input type="checkbox" id="admin-import-replace" /> Replace fields that already have content</label>' +
      '<p class="admin-import-modal__hint" id="admin-import-hint"></p>' +
      '</div>' +
      '<details class="admin-import-modal__help"><summary id="admin-import-template-label">Import JSON template</summary><pre id="admin-import-example"></pre></details>' +
      '</div>' +
      '<div class="admin-import-modal__actions">' +
      '<button type="button" class="btn-outline" data-import-close>Cancel</button>' +
      '<button type="button" class="btn-outline" id="admin-import-download">Download repo JSON</button>' +
      '<button type="button" class="btn-primary" id="admin-import-confirm">Import</button>' +
      '</div></div>';
    document.body.appendChild(modal);

    modal.querySelectorAll("[data-import-close]").forEach(function (el) {
      el.addEventListener("click", function () {
        modal.hidden = true;
      });
    });

    var fileBtn = modal.querySelector("#admin-import-file-btn");
    var fileInput = modal.querySelector("#admin-import-file-input");
    if (fileBtn && fileInput) {
      fileBtn.addEventListener("click", function () {
        fileInput.click();
      });
      fileInput.addEventListener("change", function () {
        if (fileInput.files && fileInput.files[0]) {
          handleFile(fileInput.files[0], { useModal: true });
        }
      });
    }

    var pasteBtn = modal.querySelector("#admin-import-paste-btn");
    var pasteBox = modal.querySelector("#admin-import-paste-box");
    var pasteTextarea = modal.querySelector("#admin-import-paste-textarea");
    var parsePastedBtn = modal.querySelector("#admin-import-parse-pasted-btn");

    if (pasteBtn) {
      pasteBtn.addEventListener("click", function () {
        if (navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard
            .readText()
            .then(function (text) {
              if (text && looksLikeImport(text)) {
                try {
                  var entry = parseApi.parseImportFile(text, getCollection());
                  openImportModal(entry);
                  showToast("JSON loaded from clipboard", "success");
                  if (pasteBox) pasteBox.hidden = true;
                } catch (err) {
                  showToast("Could not parse clipboard content: " + (err.message || err), "error");
                  if (pasteBox) {
                    pasteBox.hidden = false;
                    if (pasteTextarea) pasteTextarea.value = text;
                  }
                }
              } else {
                showToast("Clipboard does not contain valid article JSON. Paste below manually.", "info");
                if (pasteBox) {
                  pasteBox.hidden = false;
                  if (pasteTextarea) {
                    if (text) pasteTextarea.value = text;
                    pasteTextarea.focus();
                  }
                }
              }
            })
            .catch(function () {
              showToast("Clipboard read blocked. Paste JSON into the box below.", "info");
              if (pasteBox) {
                pasteBox.hidden = false;
                if (pasteTextarea) pasteTextarea.focus();
              }
            });
        } else {
          if (pasteBox) {
            pasteBox.hidden = !pasteBox.hidden;
            if (!pasteBox.hidden && pasteTextarea) pasteTextarea.focus();
          }
        }
      });
    }

    if (parsePastedBtn && pasteTextarea) {
      parsePastedBtn.addEventListener("click", function () {
        var text = pasteTextarea.value;
        if (!text || !text.trim()) {
          showToast("Please paste JSON text first.", "error");
          return;
        }
        try {
          var entry = parseApi.parseImportFile(text, getCollection());
          openImportModal(entry);
          showToast("Parsed pasted JSON successfully", "success");
          if (pasteBox) pasteBox.hidden = true;
        } catch (err) {
          showToast("Could not parse JSON: " + (err.message || err), "error");
        }
      });
    }

    var confirmBtn = modal.querySelector("#admin-import-confirm");
    if (confirmBtn && confirmBtn.dataset.bound !== "true") {
      confirmBtn.dataset.bound = "true";
      confirmBtn.addEventListener("click", function () {
        if (!pendingEntry) {
          showToast("Please choose a JSON file or paste JSON content first.", "error");
          return;
        }
        var replace = $("admin-import-replace") && $("admin-import-replace").checked;
        runAutoImport(pendingEntry, { fillEmptyOnly: !replace });
        pendingEntry = null;
        modal.hidden = true;
      });
    }

    var downloadBtn = modal.querySelector("#admin-import-download");
    if (downloadBtn && downloadBtn.dataset.bound !== "true") {
      downloadBtn.dataset.bound = "true";
      downloadBtn.addEventListener("click", function () {
        if (!pendingEntry) {
          showToast("No JSON loaded to download.", "error");
          return;
        }
        var filename = downloadRepoReadyJson(pendingEntry);
        var folder = getRepoImportFolder(getCollection());
        showToast(
          "Downloaded " + filename + ". Save to " + folder + "/ then open it in the CMS.",
          "info"
        );
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
      "<p><strong>Drop article JSON</strong></p>" +
      "<p>Title, content, quiz, and more</p>" +
      "</div>";
    document.body.appendChild(zone);
    return zone;
  }

  var pendingEntry = null;

  function loadImportTags() {
    if (!parseApi || !parseApi.setAllowedTags) return Promise.resolve([]);
    return fetch("/data/tags/index.json")
      .then(function (res) {
        return res.ok ? res.json() : { tags: [] };
      })
      .catch(function () {
        return { tags: [] };
      })
      .then(function (data) {
        var tags = Array.isArray(data.tags) ? data.tags : [];
        parseApi.setAllowedTags(tags);
        return tags;
      });
  }

  function getImportExampleTemplate(collection) {
    var base =
      parseApi.CONTENT_JSON_EXAMPLE[collection] || parseApi.CONTENT_JSON_EXAMPLE.articles;
    var example = Object.assign({}, base);
    if (parseApi.getAllowedTags) {
      example._allowedTags = parseApi.getAllowedTags();
      if (!example._tagInstructions) {
        example._tagInstructions =
          "Read the full article. Pick 1–2 tags from _allowedTags that best match the content's themes and application. Use exact spelling only.";
      }
      example.tags = [];
    }
    return example;
  }

  function openImportModal(entry) {
    if (!parseApi) return;
    pendingEntry = entry;
    var modal = ensureModal();
    var collection = getCollection();
    var titleEl = $("admin-import-title");
    var summaryEl = $("admin-import-summary");
    var hintEl = $("admin-import-hint");
    var templateLabel = $("admin-import-template-label");
    if (titleEl) {
      titleEl.textContent = isBibleStudyCollection(collection) ? "Import Bible study" : "Import sermon summary";
    }
    if (summaryEl) summaryEl.innerHTML = summarizeText(entry);
    if (hintEl) hintEl.textContent = getImportHint(collection);
    if (templateLabel) {
      templateLabel.textContent = isBibleStudyCollection(collection)
        ? "Bible study import JSON template"
        : "Sermon import JSON template";
    }
    var example = $("admin-import-example");
    loadImportTags().then(function () {
      if (example) {
        example.textContent = JSON.stringify(getImportExampleTemplate(collection), null, 2);
      }
    });
    modal.hidden = false;
  }

  function importRow(label, value) {
    return (
      '<li class="admin-import-modal__row">' +
      '<span class="admin-import-modal__label-text">' +
      escapeHtml(label) +
      "</span>" +
      '<span class="admin-import-modal__value">' +
      escapeHtml(value) +
      "</span>" +
      "</li>"
    );
  }

  function includedOrMissing(present, includedText, missingText) {
    return present ? includedText || "Included" : missingText || "Not included";
  }

  function buildImportSummaryHtml(entry, collection) {
    if (!parseApi) return "";
    var s = parseApi.summarizeContentEntry(entry, collection);
    var rows = [];
    var isStudy = s.isBibleStudy;

    rows.push(importRow("Title", s.title ? "Included" : "Missing"));
    rows.push(
      importRow(
        isStudy ? "Description" : "Meta description",
        includedOrMissing(Boolean(s.description && String(s.description).trim()))
      )
    );

    if (isStudy) {
      rows.push(importRow("Passage", includedOrMissing(Boolean(s.passage && String(s.passage).trim()))));
      rows.push(
        importRow(
          "Scripture reading",
          includedOrMissing(Boolean(s.passageReadingText && String(s.passageReadingText).trim()))
        )
      );
      rows.push(
        importRow(
          "Sections",
          s.sectionCount
            ? s.sectionCount + " section" + (s.sectionCount === 1 ? "" : "s") + " included"
            : "Not included"
        )
      );
      rows.push(
        importRow(
          "Discussion questions",
          s.questionCount
            ? s.questionCount + " question" + (s.questionCount === 1 ? "" : "s") + " included"
            : "Not included"
        )
      );
      if (s.activityCount) {
        rows.push(importRow("Activities", s.activityCount + " included"));
      }
    } else {
      rows.push(
        importRow("Summary", includedOrMissing(Boolean(s.summaryText && String(s.summaryText).trim())))
      );
      rows.push(
        importRow(
          "Article content",
          s.blockCount
            ? s.blockCount + " block" + (s.blockCount === 1 ? "" : "s") + " included"
            : "Not included"
        )
      );
      if (s.takeawayCount) {
        rows.push(importRow("Key takeaways", s.takeawayCount + " included"));
      }
    }

    if (s.author && String(s.author).trim()) {
      rows.push(importRow("Author", "Included"));
    }

    rows.push(
      importRow(
        "Quiz",
        s.quizCount
          ? s.quizCount + " question" + (s.quizCount === 1 ? "" : "s") + " and answers included"
          : "Not included"
      )
    );

    rows.push(
      importRow(
        "Tags",
        s.tagCount
          ? s.tagCount + " tag" + (s.tagCount === 1 ? "" : "s") + " included"
          : "Not included"
      )
    );

    return rows.join("");
  }

  function getImportHint(collection) {
    if (isBibleStudyCollection(collection)) {
      return "Imports title, description, passage, scripture reading (NKJV), sections, discussion questions, quiz, and tags. Set date, hero image, featured, and published manually in the editor.";
    }
    return "Imports title, summary, description, article content, quiz, and tags. Set date, hero image, featured, and published manually in the editor.";
  }

  function summarizeText(entry) {
    if (!parseApi) return "";
    if (!entry) {
      return (
        '<li class="admin-import-modal__row admin-import-modal__row--placeholder">' +
        '<span class="admin-import-modal__label-text">Select a JSON file or tap "Paste from clipboard" above.</span>' +
        '</li>'
      );
    }
    var collection = getCollection();
    return buildImportSummaryHtml(entry, collection);
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
        handleParsedEntry(entry, options || { fillEmptyOnly: true, useModal: true });
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
      openImportModal(entry);
      showToast("Pasted article JSON loaded into import modal", "success");
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
        openImportModal(pendingEntry);
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
        handleFile(file, { useModal: true });
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
    loadImportTags();
    bindImportUi();
    window.addEventListener("hashchange", syncDropZoneVisibility);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.AdminImport = {
    showToast: showToast,
    applyEntryImport: applyEntryImport,
    handleFile: handleFile,
    openImportModal: openImportModal,
    runAutoImport: runAutoImport,
    looksLikeImport: looksLikeImport,
    getCmsStore: getCmsStore,
    getDraftEntryJs: getDraftEntryJs,
    readDraftData: readDraftData,
    changeDraftFieldValue: changeDraftFieldValue,
    prepareDraftForSave: prepareDraftForSave,
    saveEntry: saveEntry,
    deleteArticleEntry: deleteArticleEntry,
    getDraftMeta: getDraftMeta,
    isNewEntryRoute: isNewEntryRoute,
    validatePublishRequirements: validatePublishRequirements,
    clearFieldHighlights: clearFieldHighlights,
    highlightPublishFields: highlightPublishFields,
    clickDecapSaveButton: clickDecapSaveButton,
    findFieldByLabel: findFieldByLabel,
    getEditorScopes: getEditorScopes,
    normalizeDraftTags: normalizeDraftTags,
    tagsToStoreValue: tagsToStoreValue,
  };
})();
