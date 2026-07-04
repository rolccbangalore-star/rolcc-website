(function () {
  "use strict";

  if (!document.querySelector("[data-faq-search]")) return;

  var core = window.FAQCore;
  var accordion = window.FAQAccordion;
  var config = window.FAQ_PAGE_CONFIG || { page: 1, perPage: 20 };
  var state = core.readQueryParams();
  var allFaqs = [];
  var debounceTimer;
  var suggestTimer;
  var dataReady = false;
  var suggestionIndex = -1;
  var currentSuggestions = [];

  var searchInput = document.querySelector("[data-faq-search]");
  var searchClear = document.querySelector("[data-faq-search-clear]");
  var searchWrap = document.querySelector("[data-faq-search-wrap]");
  var suggestionsEl = document.querySelector("[data-faq-suggestions]");
  var chipsWrap = document.querySelector("[data-faq-chips]");
  var chipsPrev = document.querySelector("[data-faq-chips-prev]");
  var chipsNext = document.querySelector("[data-faq-chips-next]");
  var staticList = document.querySelector("[data-faq-list-static]");
  var dynamicList = document.querySelector("[data-faq-list-dynamic]");
  var staticPagination = document.querySelector("[data-faq-pagination-static]");
  var dynamicPagination = document.querySelector("[data-faq-pagination-dynamic]");
  var resultsMeta = document.querySelector("[data-faq-results-meta]");
  var emptyState = document.querySelector("[data-faq-empty]");
  var hintPhrase = document.querySelector("[data-faq-search-hint-phrase]");
  var hintTimer = null;
  var hintIndex = 0;
  var hintAnimating = false;
  var HINT_PHRASES = ["kids ministry", "serving at church", "counselling", "membership", "visiting"];
  var HINT_INTERVAL_MS = 3200;

  function syncSearchHintState() {
    if (!searchWrap || !searchInput) return;
    searchWrap.classList.toggle("is-empty", !searchInput.value.trim());
  }

  function stopHintRotation() {
    if (hintTimer) {
      clearInterval(hintTimer);
      hintTimer = null;
    }
  }

  function startHintRotation() {
    stopHintRotation();
    if (!hintPhrase || !searchWrap || !searchWrap.classList.contains("is-empty")) return;
    hintTimer = setInterval(cycleSearchHint, HINT_INTERVAL_MS);
  }

  function cycleSearchHint() {
    if (!hintPhrase || hintAnimating || !searchWrap || !searchWrap.classList.contains("is-empty")) return;

    hintAnimating = true;
    hintPhrase.classList.add("is-exiting");

    window.setTimeout(function () {
      hintIndex = (hintIndex + 1) % HINT_PHRASES.length;
      hintPhrase.textContent = HINT_PHRASES[hintIndex];
      hintPhrase.classList.remove("is-exiting");
      hintPhrase.classList.add("is-entering");

      window.setTimeout(function () {
        hintPhrase.classList.remove("is-entering");
        hintAnimating = false;
      }, 320);
    }, 320);
  }

  function initSearchHint() {
    if (!hintPhrase) return;
    hintPhrase.textContent = HINT_PHRASES[0];
    syncSearchHintState();
    if (searchWrap && searchWrap.classList.contains("is-empty")) {
      startHintRotation();
    }
  }

  function isFaqHomePage() {
    return /(?:^|\/)faq\.html$/i.test(window.location.pathname);
  }

  function readEmbeddedFaqData() {
    var node = document.getElementById("faq-data");
    if (!node || !node.textContent) return null;
    try {
      return JSON.parse(node.textContent);
    } catch (error) {
      return null;
    }
  }

  function renderAccordionItem(faq, query) {
    var slug = faq.slug || faq.id.toLowerCase();
    var headingId = "faq-q-" + slug + "-dyn";
    var panelId = "faq-a-" + slug + "-dyn";
    var questionHtml = query ? core.highlightForSearch(faq.question, query) : core.escapeHtml(faq.question);
    var answerHtml;

    if (!query) {
      answerHtml = core.formatAnswerHtml(faq.answer);
      if (faq.scripture) {
        answerHtml += '<p class="faq-accordion__scripture"><em>' + core.escapeHtml(faq.scripture) + "</em></p>";
      }
    } else {
      answerHtml =
        faq.answer
          .split(/\n{2,}/)
          .map(function (p) {
            return p.trim();
          })
          .filter(Boolean)
          .map(function (p) {
            return "<p>" + core.highlightForSearch(p, query).replace(/\n/g, "<br />") + "</p>";
          })
          .join("") +
        (faq.scripture ? '<p class="faq-accordion__scripture"><em>' + core.escapeHtml(faq.scripture) + "</em></p>" : "");
    }

    return (
      '<article class="faq-accordion__item" data-faq-id="' +
      core.escapeHtml(faq.id) +
      '" data-faq-topic="' +
      core.escapeHtml(faq.topic || "") +
      '">' +
      '<h3 class="faq-accordion__heading"><button type="button" class="faq-accordion__trigger" id="' +
      headingId +
      '" aria-expanded="false" aria-controls="' +
      panelId +
      '"><span class="faq-accordion__question">' +
      questionHtml +
      '</span><span class="faq-accordion__icon" aria-hidden="true"></span></button></h3>' +
      '<div class="faq-accordion__panel" id="' +
      panelId +
      '" role="region" aria-labelledby="' +
      headingId +
      '" hidden><div class="faq-accordion__answer">' +
      answerHtml +
      "</div></div></article>"
    );
  }

  function renderPagination(page, totalPages) {
    if (totalPages <= 1) return "";
    var html = "";
    html +=
      page > 1
        ? '<button type="button" class="faq-pagination__nav" data-faq-page="' + (page - 1) + '">Previous</button>'
        : '<span class="faq-pagination__nav is-disabled">Previous</span>';
    html += '<div class="faq-pagination__pages">';
    for (var i = 1; i <= totalPages; i++) {
      html +=
        i === page
          ? '<span class="faq-pagination__page is-current" aria-current="page">' + i + "</span>"
          : '<button type="button" class="faq-pagination__page" data-faq-page="' + i + '">' + i + "</button>";
    }
    html += "</div>";
    html +=
      page < totalPages
        ? '<button type="button" class="faq-pagination__nav" data-faq-page="' + (page + 1) + '">Next</button>'
        : '<span class="faq-pagination__nav is-disabled">Next</span>';
    return html;
  }

  function normalizeState(next) {
    var merged = Object.assign({}, state, next || {});
    merged.q = (merged.q || "").trim();
    merged.category = (merged.category || "all").trim() || "all";
    merged.page = Math.max(1, parseInt(merged.page, 10) || 1);
    return merged;
  }

  function isInteractiveMode() {
    return !!state.q || state.category !== "all" || state.page > 1;
  }

  function hideSuggestions() {
    suggestionIndex = -1;
    currentSuggestions = [];
    if (searchWrap) searchWrap.classList.remove("is-suggestions-open");
    if (suggestionsEl) {
      suggestionsEl.innerHTML = "";
      suggestionsEl.classList.add("hidden");
    }
    if (searchInput) searchInput.setAttribute("aria-expanded", "false");
  }

  function showSuggestions() {
    if (searchWrap) searchWrap.classList.add("is-suggestions-open");
    if (suggestionsEl) suggestionsEl.classList.remove("hidden");
    if (searchInput) searchInput.setAttribute("aria-expanded", "true");
  }

  function topicLabelFor(faq) {
    return faq.topicLabel || faq.topic || "General";
  }

  function getSuggestionItems(query) {
    if (!dataReady || !window.FAQSearch) return [];

    var trimmed = (query || "").trim();
    if (trimmed.length >= 2) {
      return window.FAQSearch.getSuggestions(allFaqs, Object.assign({}, state, { q: trimmed }), 6);
    }

    return allFaqs.slice(0, 5).map(function (faq) {
      return { faq: faq, score: 0, label: faq.question };
    });
  }

  function renderSuggestions(query) {
    if (!suggestionsEl || !dataReady) return;

    var items = getSuggestionItems(query);
    currentSuggestions = items;
    suggestionIndex = -1;

    if (!items.length) {
      hideSuggestions();
      return;
    }

    var heading =
      (query || "").trim().length >= 2
        ? '<p class="faq-suggestions__label">Suggested questions</p>'
        : '<p class="faq-suggestions__label">Popular questions</p>';

    suggestionsEl.innerHTML =
      heading +
      items
        .map(function (item, index) {
          var label = (query || "").trim().length >= 2 ? core.highlightForSearch(item.label, query) : core.escapeHtml(item.label);
          return (
            '<button type="button" class="faq-suggestions__item" role="option" data-suggestion-index="' +
            index +
            '" data-faq-id="' +
            core.escapeHtml(item.faq.id) +
            '"><span class="faq-suggestions__question">' +
            label +
            '</span><span class="faq-suggestions__meta">' +
            core.escapeHtml(topicLabelFor(item.faq)) +
            "</span></button>"
          );
        })
        .join("");

    showSuggestions();
  }

  function applySuggestion(item) {
    if (!item || !item.faq) return;
    hideSuggestions();
    applyState({ q: item.faq.question, page: 1 }, false);
    if (searchInput) searchInput.value = item.faq.question;
  }

  function syncSuggestionHighlight() {
    if (!suggestionsEl) return;
    suggestionsEl.querySelectorAll("[data-suggestion-index]").forEach(function (node) {
      var index = parseInt(node.getAttribute("data-suggestion-index"), 10);
      node.classList.toggle("is-active", index === suggestionIndex);
    });
  }

  function resetStaticView() {
    if (emptyState) emptyState.classList.add("hidden");
    if (dynamicList) {
      dynamicList.innerHTML = "";
      dynamicList.classList.add("hidden");
    }
    if (dynamicPagination) {
      dynamicPagination.classList.add("hidden");
      dynamicPagination.innerHTML = "";
    }
    if (staticList) staticList.classList.remove("hidden");
    if (staticPagination) staticPagination.classList.remove("hidden");
    if (resultsMeta && config.total) {
      var start = (config.page - 1) * config.perPage + 1;
      var end = Math.min(config.page * config.perPage, config.total);
      resultsMeta.textContent = "Showing " + start + "–" + end + " of " + config.total + " questions";
    }
  }

  function syncChipScrollButtons() {
    if (!chipsWrap || !chipsPrev || !chipsNext) return;
    var maxScroll = chipsWrap.scrollWidth - chipsWrap.clientWidth;
    if (maxScroll <= 4) {
      chipsPrev.disabled = true;
      chipsNext.disabled = true;
      return;
    }
    chipsPrev.disabled = chipsWrap.scrollLeft <= 4;
    chipsNext.disabled = chipsWrap.scrollLeft >= maxScroll - 4;
  }

  function scrollChips(direction) {
    if (!chipsWrap) return;
    var amount = Math.max(180, Math.round(chipsWrap.clientWidth * 0.65));
    chipsWrap.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  function syncChips() {
    if (!chipsWrap) return;
    chipsWrap.querySelectorAll("[data-faq-filter]").forEach(function (chip) {
      var value = chip.getAttribute("data-faq-filter") || "all";
      chip.classList.toggle("is-active", value === state.category);
    });
  }

  function syncSearchInput() {
    if (searchInput) searchInput.value = state.q || "";
    if (searchClear) searchClear.classList.toggle("hidden", !state.q);
    syncSearchHintState();
    if (searchWrap && searchWrap.classList.contains("is-empty")) startHintRotation();
    else stopHintRotation();
  }

  function renderDynamic() {
    if (!dataReady || !allFaqs.length) {
      if (resultsMeta) resultsMeta.textContent = "Loading questions…";
      if (emptyState) emptyState.classList.add("hidden");
      return;
    }

    var filtered = core.filterFaqs(allFaqs, state);
    var paged = core.paginate(filtered, state.page, config.perPage || core.PER_PAGE);

    if (resultsMeta) {
      resultsMeta.textContent = filtered.length
        ? "Showing " + paged.start + "–" + paged.end + " of " + filtered.length + " matched questions"
        : "No close matches — try a suggested question above";
    }

    if (emptyState) emptyState.classList.toggle("hidden", filtered.length > 0);

    if (!filtered.length && state.q) {
      renderSuggestions(state.q);
    }

    if (dynamicList) {
      dynamicList.innerHTML =
        filtered.length > 0
          ? '<div class="faq-accordion" data-faq-accordion>' +
            paged.items
              .map(function (faq) {
                return renderAccordionItem(faq, state.q);
              })
              .join("") +
            "</div>"
          : "";
      dynamicList.classList.remove("hidden");
      accordion.initAll(dynamicList);
    }

    if (dynamicPagination) {
      dynamicPagination.innerHTML = renderPagination(paged.page, paged.totalPages);
      dynamicPagination.classList.toggle("hidden", paged.totalPages <= 1);
    }
  }

  function updateView() {
    state = normalizeState(state);
    var interactive = isInteractiveMode();

    if (staticList) staticList.classList.toggle("hidden", interactive);
    if (staticPagination) staticPagination.classList.toggle("hidden", interactive);

    syncChips();
    syncSearchInput();

    if (interactive) {
      renderDynamic();
    } else {
      resetStaticView();
      if (document.activeElement === searchInput && !(state.q || "").trim()) {
        renderSuggestions("");
      }
    }
  }

  function applyState(next, replaceHistory) {
    state = normalizeState(Object.assign({}, state, next));

    var resetToDefault = !state.q && state.category === "all" && state.page === 1;
    if (resetToDefault && !isFaqHomePage()) {
      window.location.href = "faq.html";
      return;
    }

    if (resetToDefault) {
      hideSuggestions();
      core.writeQueryParams(state, true);
      updateView();
      return;
    }

    core.writeQueryParams(state, replaceHistory !== false);
    updateView();
  }

  function bindEvents() {
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        var value = searchInput.value;
        syncSearchHintState();
        if (searchWrap && searchWrap.classList.contains("is-empty")) startHintRotation();
        else stopHintRotation();

        clearTimeout(suggestTimer);
        clearTimeout(debounceTimer);

        suggestTimer = setTimeout(function () {
          renderSuggestions(value);
        }, 90);

        debounceTimer = setTimeout(function () {
          applyState({ q: value.trim(), page: 1 }, false);
        }, 200);
      });

      searchInput.addEventListener("focus", function () {
        renderSuggestions(searchInput.value);
      });

      searchInput.addEventListener("keydown", function (event) {
        if (!suggestionsEl || suggestionsEl.classList.contains("hidden") || !currentSuggestions.length) return;

        if (event.key === "ArrowDown") {
          event.preventDefault();
          suggestionIndex = Math.min(suggestionIndex + 1, currentSuggestions.length - 1);
          syncSuggestionHighlight();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          suggestionIndex = Math.max(suggestionIndex - 1, 0);
          syncSuggestionHighlight();
        } else if (event.key === "Enter" && suggestionIndex >= 0) {
          event.preventDefault();
          applySuggestion(currentSuggestions[suggestionIndex]);
        } else if (event.key === "Escape") {
          hideSuggestions();
        }
      });
    }

    if (searchClear) {
      searchClear.addEventListener("click", function () {
        searchInput.value = "";
        syncSearchHintState();
        startHintRotation();
        hideSuggestions();
        applyState({ q: "", page: 1 }, false);
        searchInput.focus();
      });
    }

    if (suggestionsEl) {
      suggestionsEl.addEventListener("click", function (event) {
        var button = event.target.closest("[data-suggestion-index]");
        if (!button) return;
        var index = parseInt(button.getAttribute("data-suggestion-index"), 10);
        if (currentSuggestions[index]) applySuggestion(currentSuggestions[index]);
      });
    }

    document.addEventListener("click", function (event) {
      if (searchWrap && !searchWrap.contains(event.target)) hideSuggestions();
    });

    if (chipsWrap) {
      chipsWrap.addEventListener("scroll", syncChipScrollButtons, { passive: true });
    }

    if (chipsPrev) {
      chipsPrev.addEventListener("click", function () {
        scrollChips(-1);
      });
    }

    if (chipsNext) {
      chipsNext.addEventListener("click", function () {
        scrollChips(1);
      });
    }

    window.addEventListener("resize", syncChipScrollButtons);

    if (chipsWrap) {
      chipsWrap.addEventListener("click", function (event) {
        var chip = event.target.closest("[data-faq-filter]");
        if (!chip) return;
        event.preventDefault();
        applyState({ category: chip.getAttribute("data-faq-filter") || "all", page: 1, q: state.q }, false);
      });
    }

    document.addEventListener("click", function (event) {
      var pageBtn = event.target.closest("[data-faq-page]");
      if (!pageBtn || !dynamicPagination || !dynamicPagination.contains(pageBtn)) return;
      event.preventDefault();
      var page = parseInt(pageBtn.getAttribute("data-faq-page"), 10);
      if (!page) return;
      applyState({ page: page }, false);
      var listTop = document.querySelector("[aria-label='FAQ results']");
      if (listTop) listTop.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    window.addEventListener("popstate", function () {
      state = normalizeState(core.readQueryParams());
      updateView();
    });
  }

  function boot(data) {
    allFaqs = (data && data.faqs) || [];
    if (data && data.total) config.total = data.total;
    if (data && data.perPage) config.perPage = data.perPage;
    dataReady = allFaqs.length > 0;
    state = normalizeState(core.readQueryParams());
    bindEvents();
    initSearchHint();
    syncChipScrollButtons();
    updateView();
  }

  var embedded = readEmbeddedFaqData();
  if (embedded && embedded.faqs && embedded.faqs.length) {
    boot(embedded);
  } else {
    fetch("data/faqs.json")
      .then(function (res) {
        if (!res.ok) throw new Error("FAQ data unavailable");
        return res.json();
      })
      .then(boot)
      .catch(function () {
        bindEvents();
        if (resultsMeta) {
          resultsMeta.textContent = "Unable to load FAQ filters. Please refresh the page.";
        }
      });
  }
})();
