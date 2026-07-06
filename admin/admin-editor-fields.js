(function () {
  var MAX_TAGS = 5;
  var AUTHOR_PREFIXES = ["", "Mr.", "Mrs.", "Ms.", "Pr.", "Dr.", "Rev."];
  var PREFIX_PARSE_ORDER = ["Rev.", "Dr.", "Pr.", "Mr.", "Mrs.", "Ms."];
  var GITHUB_REPO = "rolccbangalore-star/rolcc-website";
  var GITHUB_BRANCH = "main";
  var LEGACY_TAG_MAP = {
    "Faith & Peace": ["Faith", "Peace"],
    "Grief & Care": ["Grief", "Care"],
    "Healing & Hope": ["Healing", "Hope"],
    "Work & Calling": ["Work", "Calling"],
  };

  var tagCache = null;
  var tagCachePromise = null;
  var authorCache = null;
  var authorCachePromise = null;
  var pendingNewTags = Object.create(null);

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
    return window.AdminComposer && window.AdminComposer.getRoot
      ? window.AdminComposer.getRoot()
      : document.getElementById("nc-root");
  }

  function getStore() {
    return window.AdminImport && window.AdminImport.getCmsStore ? window.AdminImport.getCmsStore() : null;
  }

  function changeField(fieldName, value) {
    var store = getStore();
    if (!store || !window.AdminImport || !window.AdminImport.changeDraftFieldValue) return false;
    return window.AdminImport.changeDraftFieldValue(store, fieldName, value);
  }

  function readDraftData() {
    return window.AdminImport && window.AdminImport.readDraftData ? window.AdminImport.readDraftData() : {};
  }

  function expandLegacyTag(tag) {
    return LEGACY_TAG_MAP[tag] || [tag];
  }

  function mapLegacyTags(tags) {
    var result = [];
    (tags || []).forEach(function (tag) {
      expandLegacyTag(tag).forEach(function (mapped) {
        if (mapped && result.indexOf(mapped) === -1) result.push(mapped);
      });
    });
    return result;
  }

  function wordStartsWithMatch(text, query) {
    var parts = String(text || "").split(/\s+/);
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].indexOf(query) === 0) return true;
    }
    return false;
  }

  function rankTagMatches(query, tags, selected) {
    var q = normalize(query);
    var selectedSet = Object.create(null);
    (selected || []).forEach(function (tag) {
      selectedSet[tag] = true;
    });

    var startsWith = [];
    var wordStarts = [];
    var contains = [];

    (tags || []).forEach(function (name) {
      if (!name || selectedSet[name]) return;
      var n = normalize(name);
      if (!q) {
        startsWith.push(name);
        return;
      }
      if (n.indexOf(q) === 0) startsWith.push(name);
      else if (wordStartsWithMatch(n, q)) wordStarts.push(name);
      else if (n.indexOf(q) !== -1) contains.push(name);
    });

    function sortAlpha(list) {
      return list.sort(function (a, b) {
        return a.localeCompare(b);
      });
    }

    if (!q) return sortAlpha(startsWith);
    return sortAlpha(startsWith).concat(sortAlpha(wordStarts), sortAlpha(contains));
  }

  function getTagSuggestions(query, tags, selected) {
    var ranked = rankTagMatches(query, tags, selected);
    var trimmed = String(query || "").replace(/\s+/g, " ").trim();
    if (!trimmed) return ranked.slice(0, 12);

    var exact = (tags || []).some(function (name) {
      return normalize(name) === normalize(trimmed);
    });
    if (!exact && selected.indexOf(trimmed) === -1 && trimmed.length <= 48) {
      ranked.push({ create: true, name: trimmed });
    }
    return ranked.slice(0, 12);
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function slugifyTag(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function labelMatches(labelNorm, target) {
    if (!labelNorm || !target) return false;
    if (labelNorm === target) return true;
    if (labelNorm.indexOf(target) === 0) {
      var next = labelNorm.charAt(target.length);
      return !next || next === " " || next === "?";
    }
    return false;
  }

  function findFieldWrap(root, labelText) {
    if (!root) return null;
    if (window.AdminImport && window.AdminImport.findFieldByLabel) {
      return window.AdminImport.findFieldByLabel(root, labelText);
    }
    var target = normalizeLabel(labelText);
    var scopes = [root.querySelector("main"), root.querySelector("form"), root].filter(Boolean);
    for (var s = 0; s < scopes.length; s++) {
      var labels = scopes[s].querySelectorAll("label, legend, [class*='FieldLabel']");
      for (var i = 0; i < labels.length; i++) {
        var labelNorm = normalizeLabel(labels[i].textContent);
        if (!labelMatches(labelNorm, target)) continue;
        var wrap =
          labels[i].closest('[class*="EditorControl"]') ||
          labels[i].closest('[class*="ListControl"]') ||
          labels[i].closest("fieldset") ||
          labels[i].closest("div");
        if (wrap) return wrap;
      }
    }
    return null;
  }

  function hideDecapControl(wrap) {
    if (!wrap) return;
    wrap.querySelectorAll('[class*="ControlContainer"], [class*="RelationControl"], [class*="Widget"]').forEach(function (el) {
      if (el.closest(".admin-editor-custom")) return;
      el.classList.add("admin-editor-native-hidden");
      el.setAttribute("tabindex", "-1");
      el.setAttribute("aria-hidden", "true");
    });
  }

  function tagsFromArticles() {
    var store = getStore();
    if (!store) return [];
    var state = store.getState();
    if (!state || !state.entries || !state.entries.get) return [];
    var names = Object.create(null);
    ["articles", "bible-study"].forEach(function (collection) {
      var entries = state.entries.get(collection);
      if (!entries || !entries.forEach) return;
      entries.forEach(function (entry) {
        var data = entry.get ? entry.get("data") : entry.data;
        if (!data) return;
        var tags = data.get ? data.get("tags") : data.tags;
        var category = data.get ? data.get("category") : data.category;
        mapLegacyTags(normalizeTagsList(tags, category, false)).forEach(function (name) {
          names[name] = true;
        });
      });
    });
    return Object.keys(names);
  }

  function tagsFromComposerCards(manifest) {
    var names = Object.create(null);
    Object.keys(manifest || {}).forEach(function (collection) {
      Object.keys(manifest[collection] || {}).forEach(function (slug) {
        var category = manifest[collection][slug] && manifest[collection][slug].category;
        if (!category) return;
        mapLegacyTags([String(category).trim()]).forEach(function (name) {
          names[name] = true;
        });
      });
    });
    return Object.keys(names);
  }

  function mergeTagNames() {
    var names = Object.create(null);
    function add(name) {
      if (name) names[String(name).trim()] = true;
    }
    Object.keys(pendingNewTags).forEach(add);
    tagsFromArticles().forEach(add);
    return names;
  }

  function loadTags() {
    if (tagCache) return Promise.resolve(tagCache.slice());
    if (tagCachePromise) return tagCachePromise;

    tagCachePromise = fetch("/data/tags/index.json")
      .then(function (res) {
        if (!res.ok) throw new Error("missing tag index");
        return res.json();
      })
      .then(function (data) {
        var names = Object.create(null);
        (data.tags || []).forEach(function (name) {
          if (name) names[String(name).trim()] = true;
        });
        Object.keys(mergeTagNames()).forEach(function (name) {
          names[name] = true;
        });
        return fetch("/data/articles/composer-cards.json")
          .then(function (res) {
            if (res.ok) return res.json();
            return null;
          })
          .catch(function () {
            return null;
          })
          .then(function (manifest) {
            tagsFromComposerCards(manifest).forEach(function (name) {
              names[name] = true;
            });
            tagCache = Object.keys(names).sort(function (a, b) {
              return a.localeCompare(b);
            });
            return tagCache.slice();
          });
      })
      .catch(function () {
        var names = mergeTagNames();
        tagCache = Object.keys(names).sort(function (a, b) {
          return a.localeCompare(b);
        });
        return tagCache.slice();
      });

    return tagCachePromise;
  }

  function rememberTag(name) {
    var trimmed = String(name || "").trim();
    if (!trimmed) return;
    pendingNewTags[trimmed] = true;
    if (!tagCache) tagCache = [];
    if (tagCache.indexOf(trimmed) === -1) {
      tagCache.push(trimmed);
      tagCache.sort(function (a, b) {
        return a.localeCompare(b);
      });
    }
  }

  function parseAuthor(full) {
    var value = String(full || "").trim();
    for (var i = 0; i < PREFIX_PARSE_ORDER.length; i++) {
      var prefix = PREFIX_PARSE_ORDER[i];
      if (value.indexOf(prefix + " ") === 0) {
        return { prefix: prefix, name: value.slice(prefix.length + 1).trim() };
      }
    }
    return { prefix: "", name: value };
  }

  function formatAuthor(prefix, name) {
    var cleanName = String(name || "").trim();
    if (!cleanName) return "";
    if (!prefix) return cleanName;
    return prefix + " " + cleanName;
  }

  function loadAuthors() {
    if (authorCache) return Promise.resolve(authorCache.slice());
    if (authorCachePromise) return authorCachePromise;

    authorCachePromise = fetch("/data/articles/composer-cards.json")
      .then(function (res) {
        if (!res.ok) throw new Error("missing cards");
        return res.json();
      })
      .then(function (manifest) {
        var names = Object.create(null);
        ["ROLCC Pastoral Team", "ROLCC Fellowship Team"].forEach(function (name) {
          names[name] = true;
        });
        Object.keys(manifest || {}).forEach(function (collection) {
          Object.keys(manifest[collection] || {}).forEach(function (slug) {
            var author = manifest[collection][slug] && manifest[collection][slug].author;
            if (author) names[String(author).trim()] = true;
          });
        });
        var current = readDraftData().author;
        if (current) names[String(current).trim()] = true;
        authorCache = Object.keys(names).sort(function (a, b) {
          return a.localeCompare(b);
        });
        return authorCache.slice();
      })
      .catch(function () {
        authorCache = ["ROLCC Fellowship Team", "ROLCC Pastoral Team"];
        return authorCache.slice();
      });

    return authorCachePromise;
  }

  function rememberAuthor(name) {
    var trimmed = String(name || "").trim();
    if (!trimmed) return;
    if (!authorCache) authorCache = [];
    if (authorCache.indexOf(trimmed) === -1) {
      authorCache.push(trimmed);
      authorCache.sort(function (a, b) {
        return a.localeCompare(b);
      });
    }
  }

  function normalizeTagsList(raw, fallbackCategory, applyLegacy) {
    if (applyLegacy === undefined) applyLegacy = true;
    var tags = [];
    if (Array.isArray(raw)) {
      raw.forEach(function (item) {
        if (typeof item === "string" && item.trim()) tags.push(item.trim());
        else if (item && item.tag && String(item.tag).trim()) tags.push(String(item.tag).trim());
      });
    }
    if (!tags.length && fallbackCategory) tags.push(String(fallbackCategory).trim());
    if (applyLegacy) tags = mapLegacyTags(tags);
    var seen = Object.create(null);
    return tags.filter(function (tag) {
      if (!tag || seen[tag]) return false;
      seen[tag] = true;
      return true;
    });
  }

  function readCurrentTags() {
    var data = readDraftData();
    return normalizeTagsList(data.tags, data.category);
  }

  function applyTags(tags) {
    var clean = normalizeTagsList(tags).slice(0, MAX_TAGS);
    var store = getStore();
    if (!store || !window.AdminImport) return;
    if (window.AdminImport.tagsToStoreValue) {
      changeField("tags", window.AdminImport.tagsToStoreValue(clean));
    } else {
      changeField(
        "tags",
        clean.map(function (tag) {
          return { tag: tag };
        })
      );
    }
    changeField("category", clean[0] || "");
    clean.forEach(function (tag) {
      rememberTag(tag);
    });
  }

  function findTagMountPoint(root) {
    var anchor =
      findFieldWrap(root, "author") ||
      findFieldWrap(root, "date") ||
      findFieldWrap(root, "tags") ||
      findFieldWrap(root, "tag");
    if (!anchor) {
      var main = root.querySelector("main");
      return main || root;
    }
    return anchor.closest('[class*="EditorControlPane"]') || anchor.parentElement || anchor;
  }

  function renderTagChips(container, tags, onRemove) {
    container.textContent = "";
    tags.forEach(function (tag) {
      var chip = document.createElement("span");
      chip.className = "admin-tag-chip";
      chip.innerHTML =
        '<span class="admin-tag-chip__label">' +
        escapeHtml(tag) +
        '</span><button type="button" class="admin-tag-chip__remove" aria-label="Remove ' +
        escapeHtml(tag) +
        '">×</button>';
      chip.querySelector(".admin-tag-chip__remove").addEventListener("click", function () {
        onRemove(tag);
      });
      container.appendChild(chip);
    });
  }

  function updateTagHint(hintEl, count) {
    if (!hintEl) return;
    var needed = Math.max(0, 2 - count);
    hintEl.classList.toggle("admin-tags-field__hint--warn", needed > 0);
    if (needed === 2) {
      hintEl.textContent = "Type to find tags. Add at least 2 before publishing.";
    } else if (needed === 1) {
      hintEl.textContent = "1 more tag needed to publish.";
    } else if (count >= MAX_TAGS) {
      hintEl.textContent = "Maximum of " + MAX_TAGS + " tags reached.";
    } else {
      hintEl.textContent = count + " tags added.";
    }
  }

  function wireTagField(root) {
    var mount = findTagMountPoint(root);
    if (!mount) return;

    var wrap = mount.querySelector(".admin-field--tags-wired");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "admin-field--tags-wired admin-editor-custom admin-editor-custom--tag";
      wrap.innerHTML =
        '<label class="admin-tags-field__label" for="admin-editor-tag-input">Tags</label>' +
        '<div class="admin-tags-combobox" id="admin-editor-tags-combobox">' +
        '<div class="admin-tags-combobox__pill" id="admin-editor-tags-pill">' +
        '<div class="admin-tags-combobox__chips" id="admin-editor-tag-chips" aria-live="polite"></div>' +
        '<input type="text" class="admin-tags-combobox__input" id="admin-editor-tag-input" placeholder="Type to find a tag…" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="admin-editor-tag-list" aria-autocomplete="list" />' +
        "</div>" +
        '<ul class="admin-tags-combobox__list" id="admin-editor-tag-list" role="listbox" hidden></ul>' +
        "</div>" +
        '<p class="admin-editor-field-hint admin-tags-field__hint" id="admin-editor-tag-hint">Type to find tags. Add at least 2 before publishing.</p>';

      var anchor = findFieldWrap(root, "author") || findFieldWrap(root, "date");
      if (anchor && anchor.parentElement) {
        anchor.parentElement.insertBefore(wrap, anchor.nextSibling);
      } else {
        mount.appendChild(wrap);
      }
    }

    if (wrap.dataset.adminTagWired === "true") {
      var chipsHostLive = wrap.querySelector("#admin-editor-tag-chips");
      var hintLive = wrap.querySelector("#admin-editor-tag-hint");
      if (chipsHostLive) {
        var currentLive = readCurrentTags();
        renderTagChips(chipsHostLive, currentLive, function (removed) {
          applyTags(
            currentLive.filter(function (tag) {
              return tag !== removed;
            })
          );
        });
        updateTagHint(hintLive, currentLive.length);
      }
      return;
    }

    var combobox = wrap.querySelector("#admin-editor-tags-combobox");
    var chipsHost = wrap.querySelector("#admin-editor-tag-chips");
    var input = wrap.querySelector("#admin-editor-tag-input");
    var list = wrap.querySelector("#admin-editor-tag-list");
    var hint = wrap.querySelector("#admin-editor-tag-hint");
    if (!combobox || !chipsHost || !input || !list || input.dataset.bound === "true") {
      if (input) wrap.dataset.adminTagWired = "true";
      return;
    }
    input.dataset.bound = "true";

    var allTags = [];
    var activeIndex = -1;
    var listOpen = false;

    function closeList() {
      listOpen = false;
      activeIndex = -1;
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
    }

    function openList() {
      listOpen = true;
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function addTagName(name) {
      var trimmed = String(name || "").replace(/\s+/g, " ").trim();
      if (!trimmed || trimmed.length > 48) return;
      var selected = readCurrentTags();
      if (selected.indexOf(trimmed) !== -1) return;
      if (selected.length >= MAX_TAGS) return;
      rememberTag(trimmed);
      selected.push(trimmed);
      applyTags(selected);
      input.value = "";
      refreshTagsUi();
      input.focus();
    }

    function renderSuggestions() {
      var selected = readCurrentTags();
      var suggestions = getTagSuggestions(input.value, allTags, selected);
      list.textContent = "";
      activeIndex = -1;
      if (!suggestions.length) {
        closeList();
        return;
      }
      openList();
      suggestions.forEach(function (item, index) {
        var li = document.createElement("li");
        li.className = "admin-tags-combobox__option";
        li.setAttribute("role", "option");
        li.dataset.index = String(index);
        if (item && item.create) {
          li.classList.add("admin-tags-combobox__option--create");
          li.textContent = 'Create tag: "' + item.name + '"';
          li.dataset.value = item.name;
        } else {
          li.textContent = item;
          li.dataset.value = item;
        }
        li.addEventListener("mousedown", function (event) {
          event.preventDefault();
        });
        li.addEventListener("click", function () {
          addTagName(li.dataset.value);
          closeList();
        });
        list.appendChild(li);
      });
    }

    function highlightOption(index) {
      var options = list.querySelectorAll(".admin-tags-combobox__option");
      if (!options.length) return;
      if (index < 0) index = options.length - 1;
      if (index >= options.length) index = 0;
      activeIndex = index;
      options.forEach(function (opt, i) {
        opt.classList.toggle("admin-tags-combobox__option--active", i === activeIndex);
      });
      var active = options[activeIndex];
      if (active && active.scrollIntoView) active.scrollIntoView({ block: "nearest" });
    }

    function refreshTagsUi() {
      var selected = readCurrentTags();
      renderTagChips(chipsHost, selected, function (removed) {
        applyTags(
          selected.filter(function (tag) {
            return tag !== removed;
          })
        );
        refreshTagsUi();
      });
      updateTagHint(hint, selected.length);
      input.disabled = selected.length >= MAX_TAGS;
      input.placeholder =
        selected.length >= MAX_TAGS ? "Maximum tags reached" : "Type to find a tag…";
      if (input.value.trim()) renderSuggestions();
      else closeList();
    }

    loadTags().then(function (tags) {
      allTags = tags;
      refreshTagsUi();
    });

    input.addEventListener("input", function () {
      renderSuggestions();
    });

    input.addEventListener("focus", function () {
      if (readCurrentTags().length >= MAX_TAGS) return;
      renderSuggestions();
    });

    input.addEventListener("keydown", function (event) {
      var options = list.querySelectorAll(".admin-tags-combobox__option");
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!listOpen) renderSuggestions();
        highlightOption(activeIndex + 1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!listOpen) renderSuggestions();
        highlightOption(activeIndex - 1);
        return;
      }
      if (event.key === "Escape") {
        closeList();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (listOpen && activeIndex >= 0 && options[activeIndex]) {
          addTagName(options[activeIndex].dataset.value);
          closeList();
          return;
        }
        addTagName(input.value);
        closeList();
      }
    });

    document.addEventListener("click", function (event) {
      if (!wrap.contains(event.target)) closeList();
    });

    (function syncLegacyTagsOnLoad() {
      var data = readDraftData();
      var raw = normalizeTagsList(data.tags, data.category, false);
      var hasLegacy = raw.some(function (tag) {
        return LEGACY_TAG_MAP[tag];
      });
      if (!hasLegacy) return;
      applyTags(mapLegacyTags(raw));
    })();

    refreshTagsUi();
    wrap.dataset.adminTagWired = "true";
  }

  function wireAuthorField(root) {
    var wrap = findFieldWrap(root, "author");
    if (!wrap) return;
    if (wrap.dataset.adminAuthorWired === "true") {
      var nameInput = wrap.querySelector("#admin-editor-author-name");
      var prefixSelect = wrap.querySelector("#admin-editor-author-prefix");
      if (nameInput && prefixSelect) {
        var parsed = parseAuthor(readDraftData().author || "");
        if (parsed.name && nameInput.value !== parsed.name) {
          prefixSelect.value = parsed.prefix;
          nameInput.value = parsed.name;
        }
      }
      return;
    }

    hideDecapControl(wrap);

    var custom = wrap.querySelector(".admin-editor-custom--author");
    if (!custom) {
      custom = document.createElement("div");
      custom.className = "admin-editor-custom admin-editor-custom--author";
      custom.innerHTML =
        '<div class="admin-editor-author-row">' +
        '<select class="admin-editor-select admin-editor-author-prefix" id="admin-editor-author-prefix" aria-label="Author title"></select>' +
        '<input type="text" class="admin-editor-input admin-editor-author-name" id="admin-editor-author-name" list="admin-editor-author-list" placeholder="Author name" aria-label="Author name" autocomplete="off" />' +
        "</div>" +
        '<datalist id="admin-editor-author-list"></datalist>' +
        '<p class="admin-editor-field-hint">Pick a title prefix and name. Previously used authors appear as suggestions.</p>';
      wrap.appendChild(custom);
    }

    var prefixSelect = custom.querySelector("#admin-editor-author-prefix");
    var nameInput = custom.querySelector("#admin-editor-author-name");
    var datalist = custom.querySelector("#admin-editor-author-list");
    if (!prefixSelect || !nameInput || prefixSelect.dataset.bound === "true") {
      if (prefixSelect) wrap.dataset.adminAuthorWired = "true";
      return;
    }
    prefixSelect.dataset.bound = "true";

    AUTHOR_PREFIXES.forEach(function (prefix) {
      var opt = document.createElement("option");
      opt.value = prefix;
      opt.textContent = prefix || "No prefix";
      prefixSelect.appendChild(opt);
    });

    var syncing = false;

    function applyAuthor() {
      if (syncing) return;
      var full = formatAuthor(prefixSelect.value, nameInput.value);
      rememberAuthor(full);
      changeField("author", full);
    }

    function populateAuthors(selectedFull) {
      loadAuthors().then(function (authors) {
        while (datalist.firstChild) datalist.removeChild(datalist.firstChild);
        authors.forEach(function (name) {
          var opt = document.createElement("option");
          opt.value = name;
          datalist.appendChild(opt);
        });

        syncing = true;
        var parsed = parseAuthor(selectedFull || readDraftData().author || "");
        prefixSelect.value = parsed.prefix;
        nameInput.value = parsed.name;
        syncing = false;
      });
    }

    prefixSelect.addEventListener("change", applyAuthor);
    nameInput.addEventListener("input", applyAuthor);
    nameInput.addEventListener("change", function () {
      var full = formatAuthor(prefixSelect.value, nameInput.value);
      if (full && authorCache && authorCache.indexOf(full) !== -1) {
        var parsed = parseAuthor(full);
        syncing = true;
        prefixSelect.value = parsed.prefix;
        nameInput.value = parsed.name;
        syncing = false;
      }
      applyAuthor();
    });

    populateAuthors(readDraftData().author || "");
    wrap.dataset.adminAuthorWired = "true";
  }

  function wireQuizToggle(root) {
    var includeWrap = findFieldWrap(root, "include quiz");
    var quizWrap = findFieldWrap(root, "quiz");
    if (!includeWrap || !quizWrap) return;

    function getIncludeCheckbox() {
      return includeWrap.querySelector('input[type="checkbox"]');
    }

    function syncQuizVisibility() {
      var checkbox = getIncludeCheckbox();
      var enabled = !!(checkbox && checkbox.checked);
      quizWrap.hidden = !enabled;
      quizWrap.classList.toggle("admin-field--quiz-collapsed", !enabled);
      quizWrap.setAttribute("aria-hidden", enabled ? "false" : "true");
      if (!enabled) {
        quizWrap.querySelectorAll("input, textarea, select, button").forEach(function (el) {
          el.setAttribute("tabindex", "-1");
        });
      } else {
        quizWrap.querySelectorAll("input, textarea, select, button").forEach(function (el) {
          el.removeAttribute("tabindex");
        });
      }
    }

    if (includeWrap.dataset.adminQuizWired !== "true") {
      includeWrap.dataset.adminQuizWired = "true";
      var checkbox = getIncludeCheckbox();
      if (checkbox) {
        checkbox.addEventListener("change", syncQuizVisibility);
        checkbox.addEventListener("click", function () {
          window.setTimeout(syncQuizVisibility, 0);
        });
      }
      includeWrap.addEventListener("change", syncQuizVisibility, true);
    }

    syncQuizVisibility();
  }

  function encodeGithubContent(text) {
    return btoa(unescape(encodeURIComponent(text)));
  }

  function decodeGithubContent(encoded) {
    return decodeURIComponent(escape(atob(String(encoded || "").replace(/\n/g, ""))));
  }

  function getCollectionFolders() {
    return {
      articles: "everyday-faith",
      "bible-study": "back-to-bible",
    };
  }

  function findCurrentFeaturedArticle(excludeCollection, excludeSlug) {
    var store = getStore();
    if (!store) return null;
    var state = store.getState();
    if (!state || !state.entries || !state.entries.get) return null;
    var folders = getCollectionFolders();
    var found = null;
    Object.keys(folders).forEach(function (collection) {
      var entries = state.entries.get(collection);
      if (!entries || !entries.forEach) return;
      entries.forEach(function (entry, slug) {
        if (collection === excludeCollection && slug === excludeSlug) return;
        var data = entry.get ? entry.get("data") : entry.data;
        if (!data) return;
        var featured = data.get ? data.get("featured") : data.featured;
        var publish = data.get ? data.get("publish") : data.publish;
        var title = data.get ? data.get("title") : data.title;
        if (featured === true && publish !== false) {
          found = {
            title: title || slug,
            slug: slug,
            collection: collection,
            folder: folders[collection],
          };
        }
      });
    });
    return found;
  }

  function updateArticleFeaturedOnGithub(token, folder, slug, featured) {
    var path = "data/articles/" + folder + "/" + slug + ".json";
    var readUrl =
      "https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + encodeURIComponent(path) + "?ref=" + GITHUB_BRANCH;
    return fetch(readUrl, {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
      },
    })
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (file) {
        if (!file || !file.content) return false;
        var data = JSON.parse(decodeGithubContent(file.content));
        if (data.featured === featured) return true;
        data.featured = featured;
        var body = JSON.stringify(data, null, 2) + "\n";
        return fetch("https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + encodeURIComponent(path), {
          method: "PUT",
          headers: {
            Authorization: "Bearer " + token,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: featured ? 'Feature article "' + slug + '"' : 'Unfeature article "' + slug + '"',
            content: encodeGithubContent(body),
            branch: GITHUB_BRANCH,
            sha: file.sha,
          }),
        }).then(function (res) {
          return res.ok;
        });
      });
  }

  function ensureSingleFeaturedArticle() {
    var meta =
      window.AdminImport && window.AdminImport.getDraftMeta ? window.AdminImport.getDraftMeta() : { collection: "", slug: "" };
    var data = readDraftData();
    if (data.featured !== true) return Promise.resolve(true);

    var cms = window.CMS;
    var backend = cms && typeof cms.getBackend === "function" ? cms.getBackend() : null;
    if (!backend || typeof backend.getToken !== "function") return Promise.resolve(false);

    return backend.getToken().then(function (token) {
      if (!token) return false;
      var folders = getCollectionFolders();
      var store = getStore();
      if (!store) return false;
      var state = store.getState();
      var jobs = [];
      Object.keys(folders).forEach(function (collection) {
        var entries = state.entries && state.entries.get(collection);
        if (!entries || !entries.forEach) return;
        entries.forEach(function (entry, slug) {
          if (collection === meta.collection && slug === meta.slug) return;
          var entryData = entry.get ? entry.get("data") : entry.data;
          if (!entryData) return;
          var featured = entryData.get ? entryData.get("featured") : entryData.featured;
          var publish = entryData.get ? entryData.get("publish") : entryData.publish;
          if (featured === true && publish !== false) {
            jobs.push(updateArticleFeaturedOnGithub(token, folders[collection], slug, false));
          }
        });
      });
      if (!jobs.length) return true;
      return Promise.all(jobs).then(function (results) {
        return results.every(Boolean);
      });
    });
  }

  function wireFeaturedField(root) {
    var wrap = findFieldWrap(root, "featured article") || findFieldWrap(root, "featured");
    if (!wrap) return;

    function getFeaturedCheckbox() {
      return wrap.querySelector('input[type="checkbox"]');
    }

    if (wrap.dataset.adminFeaturedWired !== "true") {
      wrap.dataset.adminFeaturedWired = "true";
      var checkbox = getFeaturedCheckbox();
      if (checkbox) {
        checkbox.addEventListener("change", function () {
          if (!checkbox.checked) return;
          var meta =
            window.AdminImport && window.AdminImport.getDraftMeta
              ? window.AdminImport.getDraftMeta()
              : { collection: "", slug: "" };
          var current = findCurrentFeaturedArticle(meta.collection, meta.slug);
          if (!current) return;
          var ok = window.confirm(
            '"' +
              current.title +
              '" is currently the featured article on the listing page.\n\nMaking this article featured will replace it. Continue?'
          );
          if (!ok) checkbox.checked = false;
        });
      }
    }
  }

  function wireHidePublishedField(root) {
    var wrap = findFieldWrap(root, "published");
    if (!wrap) return;
    wrap.classList.add("admin-editor-field--hidden");
    hideDecapControl(wrap);
  }

  function wireHideCategoryField(root) {
    var wrap = findFieldWrap(root, "primary tag") || findFieldWrap(root, "category");
    if (!wrap) return;
    wrap.classList.add("admin-editor-field--hidden");
    hideDecapControl(wrap);
  }

  function readGithubFile(token, path) {
    var url =
      "https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + encodeURIComponent(path) + "?ref=" + GITHUB_BRANCH;
    return fetch(url, {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
      },
    }).then(function (res) {
      if (!res.ok) return null;
      return res.json();
    });
  }

  function tagExistsOnGithub(token, slug) {
    var path = "data/tags/" + slug + ".json";
    var url =
      "https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + encodeURIComponent(path) + "?ref=" + GITHUB_BRANCH;
    return fetch(url, {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
      },
    }).then(function (res) {
      return res.ok;
    });
  }

  function createTagOnGithub(token, tagName, slug) {
    var path = "data/tags/" + slug + ".json";
    var body = JSON.stringify({ name: tagName }, null, 2) + "\n";
    var url = "https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + encodeURIComponent(path);
    return fetch(url, {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: 'Create article tag "' + tagName + '"',
        content: encodeGithubContent(body),
        branch: GITHUB_BRANCH,
      }),
    }).then(function (res) {
      return res.ok;
    });
  }

  function updateTagIndexOnGithub(token, tagName) {
    var path = "data/tags/index.json";
    return readGithubFile(token, path).then(function (file) {
      var tags = [];
      var sha = file && file.sha;
      if (file && file.content) {
        try {
          var data = JSON.parse(decodeGithubContent(file.content));
          tags = Array.isArray(data.tags) ? data.tags.slice() : [];
        } catch (err) {
          tags = [];
        }
      }
      if (tags.indexOf(tagName) !== -1) return true;
      tags.push(tagName);
      tags.sort(function (a, b) {
        return a.localeCompare(b);
      });
      var body = JSON.stringify({ tags: tags }, null, 2) + "\n";
      var url = "https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + encodeURIComponent(path);
      return fetch(url, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: 'Add tag "' + tagName + '" to index',
          content: encodeGithubContent(body),
          branch: GITHUB_BRANCH,
          sha: sha || undefined,
        }),
      }).then(function (res) {
        return res.ok;
      });
    });
  }

  function ensureTagPersisted(tagName) {
    var trimmed = String(tagName || "").trim();
    if (!trimmed) return Promise.resolve(false);

    var slug = slugifyTag(trimmed);
    if (!slug) return Promise.resolve(false);

    var cms = window.CMS;
    var backend = cms && typeof cms.getBackend === "function" ? cms.getBackend() : null;
    if (!backend || typeof backend.getToken !== "function") return Promise.resolve(false);

    return backend.getToken().then(function (token) {
      if (!token) return false;
      return tagExistsOnGithub(token, slug).then(function (exists) {
        var fileWork = exists ? Promise.resolve(true) : createTagOnGithub(token, trimmed, slug);
        return fileWork.then(function (ok) {
          if (!ok) return false;
          return updateTagIndexOnGithub(token, trimmed);
        });
      });
    });
  }

  function ensurePendingTagsPersisted() {
    var tags = Object.keys(pendingNewTags);
    if (!tags.length) return Promise.resolve();
    return tags.reduce(function (chain, tagName) {
      return chain.then(function () {
        return ensureTagPersisted(tagName);
      });
    }, Promise.resolve());
  }

  function mountEditorFields(root) {
    if (!root || !isEditorRoute()) return;
    wireTagField(root);
    wireAuthorField(root);
    wireQuizToggle(root);
    wireFeaturedField(root);
    wireHidePublishedField(root);
    wireHideCategoryField(root);
  }

  var mountRetryTimer = null;
  function scheduleFieldMounts(root) {
    if (!root || !isEditorRoute()) return;
    mountEditorFields(root);
    if (mountRetryTimer) window.clearTimeout(mountRetryTimer);
    var attempts = 0;
    function retry() {
      if (!isEditorRoute()) return;
      attempts += 1;
      var liveRoot = getRoot();
      mountEditorFields(liveRoot);
      var tagReady = !!liveRoot.querySelector("#admin-editor-tag-input");
      var authorReady = !!liveRoot.querySelector("#admin-editor-author-prefix");
      if ((!tagReady || !authorReady) && attempts < 24) {
        mountRetryTimer = window.setTimeout(retry, 250);
      }
    }
    mountRetryTimer = window.setTimeout(retry, 250);
  }

  window.AdminEditorFields = {
    mount: scheduleFieldMounts,
    ensureTagPersisted: ensureTagPersisted,
    ensurePendingTagsPersisted: ensurePendingTagsPersisted,
    ensureSingleFeaturedArticle: ensureSingleFeaturedArticle,
    mapLegacyTags: mapLegacyTags,
    slugifyTag: slugifyTag,
    rememberTag: rememberTag,
    loadTags: loadTags,
    resetCaches: function () {
      tagCache = null;
      tagCachePromise = null;
      authorCache = null;
      authorCachePromise = null;
    },
  };
})();
