(function () {
  var CREATE_TAG_VALUE = "__create_new_tag__";
  var AUTHOR_PREFIXES = ["", "Mr.", "Mrs.", "Ms.", "Pr.", "Dr.", "Rev."];
  var PREFIX_PARSE_ORDER = ["Rev.", "Dr.", "Pr.", "Mr.", "Mrs.", "Ms."];
  var GITHUB_REPO = "rolccbangalore-star/rolcc-website";
  var GITHUB_BRANCH = "main";

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

  function slugifyTag(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
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

  function findFieldWrap(root, labelText) {
    if (!root) return null;
    var target = normalizeLabel(labelText);
    var aliases = {
      tag: ["tag"],
      author: ["author"],
      "include quiz": ["include quiz", "include quiz?"],
      quiz: ["quiz"],
    };
    var targets = aliases[target] || [target];
    var main = root.querySelector("main");
    if (!main) return null;

    var labels = main.querySelectorAll("label, legend, [class*='FieldLabel']");
    for (var i = 0; i < labels.length; i++) {
      var labelNorm = normalizeLabel(labels[i].textContent);
      for (var j = 0; j < targets.length; j++) {
        if (labelNorm !== targets[j] && labelNorm.indexOf(targets[j]) !== 0) continue;
        var wrap = getFieldWrap(labels[i]);
        if (wrap) return wrap;
      }
    }
    return null;
  }

  function hideDecapControl(wrap) {
    if (!wrap) return;
    wrap.querySelectorAll('[class*="ControlContainer"], [class*="RelationControl"], input, select, textarea').forEach(function (el) {
      if (el.closest(".admin-editor-custom")) return;
      el.classList.add("admin-editor-native-hidden");
      el.setAttribute("tabindex", "-1");
      el.setAttribute("aria-hidden", "true");
    });
  }

  function tagsFromStore() {
    var store = getStore();
    if (!store) return [];
    var state = store.getState();
    if (!state || !state.entries || !state.entries.get) return [];
    var entries = state.entries.get("article-tags");
    if (!entries || !entries.size) return [];
    var names = [];
    entries.forEach(function (entry) {
      var data = entry.get ? entry.get("data") : entry.data;
      var name = data && data.get ? data.get("name") : data && data.name;
      if (name) names.push(String(name).trim());
    });
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
        tagsFromStore().forEach(function (name) {
          if (name) names[name] = true;
        });
        Object.keys(pendingNewTags).forEach(function (name) {
          names[name] = true;
        });
        tagCache = Object.keys(names).sort(function (a, b) {
          return a.localeCompare(b);
        });
        return tagCache.slice();
      })
      .catch(function () {
        var names = Object.create(null);
        tagsFromStore().forEach(function (name) {
          if (name) names[name] = true;
        });
        Object.keys(pendingNewTags).forEach(function (name) {
          names[name] = true;
        });
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

  function promptForTagName() {
    var value = window.prompt("New tag name", "");
    if (value === null) return "";
    value = String(value).replace(/\s+/g, " ").trim();
    if (!value) return "";
    if (value.length > 48) {
      window.alert("Please keep tag names under 48 characters.");
      return "";
    }
    return value;
  }

  function populateTagSelect(select, tags, selected) {
    while (select.firstChild) select.removeChild(select.firstChild);
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a tag…";
    select.appendChild(placeholder);

    tags.forEach(function (name) {
      var opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });

    var createOpt = document.createElement("option");
    createOpt.value = CREATE_TAG_VALUE;
    createOpt.textContent = "Create new tag…";
    select.appendChild(createOpt);

    if (selected && tags.indexOf(selected) !== -1) {
      select.value = selected;
    } else if (selected) {
      var custom = document.createElement("option");
      custom.value = selected;
      custom.textContent = selected;
      select.insertBefore(custom, createOpt);
      select.value = selected;
    } else {
      select.value = "";
    }
  }

  function wireTagField(root) {
    var wrap = findFieldWrap(root, "tag");
    if (!wrap) return;
    if (wrap.dataset.adminTagWired === "true") {
      var existingSelect = wrap.querySelector("#admin-editor-tag-select");
      if (existingSelect) {
        var current = readDraftData().category || "";
        if (current && existingSelect.value !== current) {
          loadTags().then(function (tags) {
            populateTagSelect(existingSelect, tags, current);
          });
        }
      }
      return;
    }

    var decapHost = wrap.querySelector('[class*="ControlContainer"], [class*="Widget"], [class*="Relation"]') || wrap;
    hideDecapControl(wrap);

    var custom = wrap.querySelector(".admin-editor-custom--tag");
    if (!custom) {
      custom = document.createElement("div");
      custom.className = "admin-editor-custom admin-editor-custom--tag";
      custom.innerHTML =
        '<select class="admin-editor-select" id="admin-editor-tag-select" aria-label="Article tag"></select>' +
        '<p class="admin-editor-field-hint">Choose an existing tag or create a new one for future articles.</p>';
      decapHost.appendChild(custom);
    }

    var select = custom.querySelector("#admin-editor-tag-select");
    if (!select || select.dataset.bound === "true") {
      wrap.dataset.adminTagWired = "true";
      return;
    }
    select.dataset.bound = "true";

    function applyTag(value) {
      if (!value) return;
      rememberTag(value);
      changeField("category", value);
    }

    function refreshTags(selected) {
      loadTags().then(function (tags) {
        populateTagSelect(select, tags, selected || readDraftData().category || "");
      });
    }

    select.addEventListener("change", function () {
      var value = select.value;
      if (value === CREATE_TAG_VALUE) {
        var created = promptForTagName();
        if (!created) {
          refreshTags(readDraftData().category || "");
          return;
        }
        rememberTag(created);
        applyTag(created);
        refreshTags(created);
        return;
      }
      if (!value) {
        changeField("category", "");
        return;
      }
      applyTag(value);
    });

    refreshTags(readDraftData().category || "");
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

    var decapHost = wrap.querySelector('[class*="ControlContainer"], [class*="Widget"]') || wrap;
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
      decapHost.appendChild(custom);
    }

    var prefixSelect = custom.querySelector("#admin-editor-author-prefix");
    var nameInput = custom.querySelector("#admin-editor-author-name");
    var datalist = custom.querySelector("#admin-editor-author-list");
    if (!prefixSelect || !nameInput || prefixSelect.dataset.bound === "true") {
      wrap.dataset.adminAuthorWired = "true";
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
        if (exists) return true;
        return createTagOnGithub(token, trimmed, slug);
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
  }

  window.AdminEditorFields = {
    mount: mountEditorFields,
    ensureTagPersisted: ensureTagPersisted,
    ensurePendingTagsPersisted: ensurePendingTagsPersisted,
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
