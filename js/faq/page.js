(function () {
  "use strict";

  if (!document.querySelector("[data-faq-search]")) return;

  var core = window.FAQCore;
  var accordion = window.FAQAccordion;
  var config = window.FAQ_PAGE_CONFIG || { page: 1, perPage: 20 };
  var state = core.readQueryParams();
  var allFaqs = [];
  var debounceTimer;

  var searchInput = document.querySelector("[data-faq-search]");
  var searchClear = document.querySelector("[data-faq-search-clear]");
  var chipsWrap = document.querySelector("[data-faq-chips]");
  var staticList = document.querySelector("[data-faq-list-static]");
  var dynamicList = document.querySelector("[data-faq-list-dynamic]");
  var staticPagination = document.querySelector("[data-faq-pagination-static]");
  var dynamicPagination = document.querySelector("[data-faq-pagination-dynamic]");
  var resultsMeta = document.querySelector("[data-faq-results-meta]");
  var emptyState = document.querySelector("[data-faq-empty]");

  function renderAccordionItem(faq, query) {
    var slug = faq.slug || faq.id.toLowerCase();
    var headingId = "faq-q-" + slug + "-dyn";
    var panelId = "faq-a-" + slug + "-dyn";
    var questionHtml = query ? core.highlightText(faq.question, query) : core.escapeHtml(faq.question);
    var answerHtml = query ? core.highlightText(faq.answer, query) : core.formatAnswerHtml(faq.answer);
    if (!query) {
      answerHtml = core.formatAnswerHtml(faq.answer);
    } else {
      answerHtml =
        faq.answer
          .split(/\n{2,}/)
          .map(function (p) {
            return p.trim();
          })
          .filter(Boolean)
          .map(function (p) {
            return "<p>" + core.highlightText(p, query).replace(/\n/g, "<br />") + "</p>";
          })
          .join("") +
        (faq.scripture ? '<p class="faq-accordion__scripture"><em>' + core.escapeHtml(faq.scripture) + "</em></p>" : "");
    }

    return (
      '<article class="faq-accordion__item" data-faq-id="' +
      core.escapeHtml(faq.id) +
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

  function isInteractiveMode() {
    return !!state.q || (state.category && state.category !== "all") || state.page > 1;
  }

  function syncChips() {
    if (!chipsWrap) return;
    chipsWrap.querySelectorAll("[data-faq-filter]").forEach(function (chip) {
      var value = chip.getAttribute("data-faq-filter");
      chip.classList.toggle("is-active", value === (state.category || "all"));
    });
  }

  function syncSearchInput() {
    if (searchInput) searchInput.value = state.q || "";
    if (searchClear) searchClear.classList.toggle("hidden", !state.q);
  }

  function renderDynamic() {
    var filtered = core.filterFaqs(allFaqs, state);
    var paged = core.paginate(filtered, state.page, config.perPage || core.PER_PAGE);

    if (resultsMeta) {
      resultsMeta.textContent = filtered.length
        ? "Showing " + paged.start + "–" + paged.end + " of " + filtered.length + " questions"
        : "No matching questions";
    }

    if (emptyState) emptyState.classList.toggle("hidden", filtered.length > 0);

    if (dynamicList) {
      dynamicList.innerHTML =
        filtered.length > 0
          ? '<div class="faq-accordion" data-faq-accordion>' +
            paged.items.map(function (faq) {
              return renderAccordionItem(faq, state.q);
            }).join("") +
            "</div>"
          : "";
      accordion.initAll(dynamicList);
    }

    if (dynamicPagination) {
      dynamicPagination.innerHTML = renderPagination(paged.page, paged.totalPages);
      dynamicPagination.classList.toggle("hidden", paged.totalPages <= 1);
    }
  }

  function updateView() {
    var interactive = isInteractiveMode();
    if (staticList) staticList.classList.toggle("hidden", interactive);
    if (staticPagination) staticPagination.classList.toggle("hidden", interactive);
    if (dynamicList) dynamicList.classList.toggle("hidden", !interactive);
    if (dynamicPagination) dynamicPagination.classList.toggle("hidden", !interactive && !(state.page > 1));

    syncChips();
    syncSearchInput();

    if (interactive) {
      renderDynamic();
    } else if (resultsMeta && config.total) {
      var start = (config.page - 1) * config.perPage + 1;
      var end = Math.min(config.page * config.perPage, config.total);
      resultsMeta.textContent = "Showing " + start + "–" + end + " of " + config.total + " questions";
    }
  }

  function applyState(next, replaceHistory) {
    state = Object.assign({}, state, next);
    if (!state.q && state.category === "all" && state.page === 1) {
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
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          applyState({ q: searchInput.value.trim(), page: 1 }, false);
        }, 180);
      });
    }

    if (searchClear) {
      searchClear.addEventListener("click", function () {
        searchInput.value = "";
        applyState({ q: "", page: 1 }, false);
        searchInput.focus();
      });
    }

    if (chipsWrap) {
      chipsWrap.addEventListener("click", function (event) {
        var chip = event.target.closest("[data-faq-filter]");
        if (!chip) return;
        applyState({ category: chip.getAttribute("data-faq-filter") || "all", page: 1 }, false);
      });
    }

    document.addEventListener("click", function (event) {
      var pageBtn = event.target.closest("[data-faq-page]");
      if (!pageBtn || !dynamicPagination || !dynamicPagination.contains(pageBtn)) return;
      var page = parseInt(pageBtn.getAttribute("data-faq-page"), 10);
      if (!page) return;
      applyState({ page: page }, false);
      var listTop = document.querySelector("[aria-label='FAQ results']");
      if (listTop) listTop.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    window.addEventListener("popstate", function () {
      state = core.readQueryParams();
      updateView();
    });
  }

  fetch("data/faqs.json")
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      allFaqs = data.faqs || [];
      state = core.readQueryParams();
      if (state.q || state.category !== "all" || state.page > 1) {
        updateView();
      }
      bindEvents();
    })
    .catch(function () {
      bindEvents();
    });

  if (state.q || state.category !== "all" || state.page > 1) {
    updateView();
  }
})();
