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

  function normalizeTagsList(raw, fallbackCategory) {
    var tags = [];
    if (Array.isArray(raw)) {
      raw.forEach(function (item) {
        if (typeof item === "string" && item.trim()) tags.push(item.trim());
        else if (item && item.tag && String(item.tag).trim()) tags.push(String(item.tag).trim());
      });
    }
    if (!tags.length && fallbackCategory) tags.push(String(fallbackCategory).trim());
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
    var clean = normalizeTagsList(tags);
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

  function populateTagAddSelect(select, tags, selectedTags) {
    while (select.firstChild) select.removeChild(select.firstChild);
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = selectedTags.length ? "Add another tag…" : "Choose a tag…";
    select.appendChild(placeholder);

    tags.forEach(function (name) {
      if (selectedTags.indexOf(name) !== -1) return;
      var opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });

    var createOpt = document.createElement("option");
    createOpt.value = CREATE_TAG_VALUE;
    createOpt.textContent = "Create new tag…";
    select.appendChild(createOpt);
    select.value = "";
  }

  function renderTagChips(container, tags, onRemove) {
    container.textContent = "";
    tags.forEach(function (tag) {
      var chip = document.createElement("span");
      chip.className = "admin-tag-chip";
      chip.innerHTML =
        '<span class="admin-tag-chip__label">' +
        tag.replace(/&/g, "&amp;").replace(/</g, "&lt;") +
        '</span><button type="button" class="admin-tag-chip__remove" aria-label="Remove ' +
        tag.replace(/"/g, "&quot;") +
        '">×</button>';
      chip.querySelector(".admin-tag-chip__remove").addEventListener("click", function () {
        onRemove(tag);
      });
      container.appendChild(chip);
    });
  }

  function wireTagField(root) {
    var wrap = findFieldWrap(root, "tags") || findFieldWrap(root, "tag");
    if (!wrap) return;
    wrap.classList.add("admin-field--tags-wired");

    if (wrap.dataset.adminTagWired === "true") {
      var chipsHost = wrap.querySelector("#admin-editor-tag-chips");
      if (chipsHost) {
        var current = readCurrentTags();
        renderTagChips(chipsHost, current, function (removed) {
          applyTags(current.filter(function (tag) {
            return tag !== removed;
          }));
          wireTagField(root);
        });
      }
      return;
    }

    hideDecapControl(wrap);
    wrap.querySelectorAll('[class*="ListControl"], [class*="NestedObjectControl"]').forEach(function (el) {
      if (!el.closest(".admin-editor-custom")) {
        el.classList.add("admin-editor-native-hidden");
      }
    });

    var custom = wrap.querySelector(".admin-editor-custom--tag");
    if (!custom) {
      custom = document.createElement("div");
      custom.className = "admin-editor-custom admin-editor-custom--tag";
      custom.innerHTML =
        '<div class="admin-tags-input" id="admin-editor-tags-input">' +
        '<div class="admin-tags-input__chips" id="admin-editor-tag-chips" aria-live="polite"></div>' +
        '<select class="admin-editor-select admin-tags-input__add" id="admin-editor-tag-add" aria-label="Add article tag"></select>' +
        "</div>" +
        '<p class="admin-editor-field-hint">Add at least 2 tags. Pick from the list or create a new one — new tags are saved for future articles.</p>';
      wrap.appendChild(custom);
    }

    var chipsHost = custom.querySelector("#admin-editor-tag-chips");
    var addSelect = custom.querySelector("#admin-editor-tag-add");
    if (!chipsHost || !addSelect || addSelect.dataset.bound === "true") {
      if (addSelect) wrap.dataset.adminTagWired = "true";
      return;
    }
    addSelect.dataset.bound = "true";

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
      loadTags().then(function (tags) {
        populateTagAddSelect(addSelect, tags, selected);
      });
    }

    addSelect.addEventListener("change", function () {
      var value = addSelect.value;
      if (!value) return;
      var selected = readCurrentTags();
      if (value === CREATE_TAG_VALUE) {
        var created = promptForTagName();
        addSelect.value = "";
        if (!created) {
          refreshTagsUi();
          return;
        }
        rememberTag(created);
        if (selected.indexOf(created) === -1) selected.push(created);
        applyTags(selected);
        refreshTagsUi();
        return;
      }
      if (selected.indexOf(value) === -1) selected.push(value);
      applyTags(selected);
      refreshTagsUi();
    });

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
      var tagReady = !!liveRoot.querySelector("#admin-editor-tags-input");
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
