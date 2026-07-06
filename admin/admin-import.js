(function () {
  var parseApi = typeof ArticleImportParse !== "undefined" ? ArticleImportParse : null;

  var LABEL_ALIASES = {
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
    return aliases[id] || id;
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

  function toStoreValue(value) {
    if (value === undefined || value === null) return value;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
    if (window.Immutable && typeof window.Immutable.fromJS === "function") {
      return window.Immutable.fromJS(value);
    }
    return value;
  }

  function changeDraftFieldValue(store, fieldName, value) {
    var field = getFieldSchema(store, fieldName);
    if (!field) return false;
    store.dispatch({
      type: "DRAFT_CHANGE_FIELD",
      payload: {
        field: field,
        value: value,
        metadata: {},
        entries: [],
      },
    });
    return true;
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
      if (secLen > 0) verified.content += secLen;
      else verified.warnings.push("Sections did not apply.");
    }
    if (importData.discussionQuestions && importData.discussionQuestions.length) {
      var qLen = (data.discussionQuestions || []).length;
      if (qLen > 0) verified.content += qLen;
    }
    if (importData.includeQuiz === true && data.includeQuiz === true) verified.meta += 1;
    if (importData.quiz && importData.quiz.length) {
      var quizLen = (data.quiz || []).length;
      if (quizLen > 0) verified.quiz = quizLen;
      else verified.warnings.push("Quiz questions did not apply.");
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

    if (mergedData.title) {
      var headerInput = $("admin-editor-title-input");
      if (headerInput) setInputValue(headerInput, mergedData.title);
      var root = getRoot();
      if (root && window.AdminComposer && window.AdminComposer.syncTitleFromDecap) {
        window.AdminComposer.syncTitleFromDecap(root);
      }
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

    window.setTimeout(finish, mergedData.quiz && mergedData.includeQuiz ? 200 : 80);
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

  function prepareDraftForSave() {
    var store = getCmsStore();
    if (!store) return false;

    var data = readDraftData();
    var headerInput = $("admin-editor-title-input");
    var headerTitle = headerInput ? headerInput.value.trim() : "";
    var today = new Date().toISOString().slice(0, 10);

    if (headerTitle && headerTitle !== data.title) {
      changeDraftFieldValue(store, "title", headerTitle);
      data.title = headerTitle;
    }

    if (!data.title || !String(data.title).trim()) {
      return false;
    }

    if (!data.date) changeDraftFieldValue(store, "date", today);
    if (!data.category) changeDraftFieldValue(store, "category", "General");
    if (!data.thumbnail) changeDraftFieldValue(store, "thumbnail", "/images/og-image.jpg");
    if (data.publish !== false) changeDraftFieldValue(store, "publish", false);

    changeDraftFieldValue(store, "title", data.title || headerTitle);
    return true;
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
      '<label class="admin-import-modal__label"><input type="checkbox" id="admin-import-replace" /> Replace fields that already have content</label>' +
      '<p class="admin-import-modal__hint">Imports title, summary, content, and quiz. Set tag, date, hero image, featured, and published manually in the editor.</p>' +
      '<details class="admin-import-modal__help"><summary>Article import JSON template</summary><pre id="admin-import-example"></pre></details>' +
      '<div class="admin-import-modal__actions">' +
      '<button type="button" class="btn-outline" data-import-close>Cancel</button>' +
      '<button type="button" class="btn-outline" id="admin-import-download">Download repo JSON</button>' +
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
        runAutoImport(pendingEntry, { fillEmptyOnly: !replace });
        pendingEntry = null;
        modal.hidden = true;
      });
    }

    var downloadBtn = modal.querySelector("#admin-import-download");
    if (downloadBtn && downloadBtn.dataset.bound !== "true") {
      downloadBtn.dataset.bound = "true";
      downloadBtn.addEventListener("click", function () {
        if (!pendingEntry) return;
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

  function openImportModal(entry) {
    if (!parseApi) return;
    pendingEntry = entry;
    var modal = ensureModal();
    var summary = summarizeText(entry);
    $("admin-import-summary").textContent = summary;
    var example = $("admin-import-example");
    if (example) {
      example.textContent = JSON.stringify(
        parseApi.CONTENT_JSON_EXAMPLE[getCollection()] || parseApi.CONTENT_JSON_EXAMPLE.articles,
        null,
        2
      );
    }
    modal.hidden = false;
  }

  function summarizeText(entry) {
    if (!parseApi) return "";
    var s = parseApi.summarizeContentEntry(entry, getCollection());
    var parts = [];
    if (s.title) parts.push('"' + s.title + '"');
    else parts.push("Article import");
    if (s.blockCount) parts.push(s.blockCount + " blocks");
    if (s.sectionCount) parts.push(s.sectionCount + " sections");
    if (s.takeawayCount) parts.push(s.takeawayCount + " takeaways");
    if (s.questionCount) parts.push(s.questionCount + " discussion questions");
    if (s.quizCount) parts.push(s.quizCount + " quiz questions");
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
    getCmsStore: getCmsStore,
    prepareDraftForSave: prepareDraftForSave,
    clickDecapSaveButton: clickDecapSaveButton,
  };
})();
