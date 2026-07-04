(function (global) {
  "use strict";

  var PER_PAGE = 20;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    var parts = String(text).split(new RegExp("(" + escapeRegExp(query) + ")", "ig"));
    return parts
      .map(function (part) {
        if (part.toLowerCase() === query.toLowerCase()) {
          return '<mark class="faq-highlight">' + escapeHtml(part) + "</mark>";
        }
        return escapeHtml(part);
      })
      .join("");
  }

  function formatAnswerHtml(text) {
    return escapeHtml(text)
      .split(/\n{2,}/)
      .map(function (p) {
        return p.trim();
      })
      .filter(Boolean)
      .map(function (p) {
        return "<p>" + p.replace(/\n/g, "<br />") + "</p>";
      })
      .join("");
  }

  function readQueryParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      q: (params.get("q") || "").trim(),
      category: (params.get("category") || "all").trim(),
      page: Math.max(1, parseInt(params.get("page") || "1", 10) || 1),
    };
  }

  function writeQueryParams(state, replace) {
    var params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.category && state.category !== "all") params.set("category", state.category);
    if (state.page && state.page > 1) params.set("page", String(state.page));
    var qs = params.toString();
    var url = window.location.pathname + (qs ? "?" + qs : "");
    if (replace) {
      window.history.replaceState(state, "", url);
    } else {
      window.history.pushState(state, "", url);
    }
  }

  function filterFaqs(faqs, state) {
    var q = (state.q || "").toLowerCase();
    var category = state.category || "all";
    return faqs.filter(function (faq) {
      if (category !== "all" && faq.category !== category) return false;
      if (!q) return true;
      return faq.question.toLowerCase().indexOf(q) !== -1 || faq.answer.toLowerCase().indexOf(q) !== -1;
    });
  }

  function paginate(list, page, perPage) {
    var totalPages = Math.max(1, Math.ceil(list.length / perPage));
    var safePage = Math.min(Math.max(1, page), totalPages);
    var start = (safePage - 1) * perPage;
    return {
      items: list.slice(start, start + perPage),
      page: safePage,
      totalPages: totalPages,
      total: list.length,
      start: list.length ? start + 1 : 0,
      end: Math.min(start + perPage, list.length),
    };
  }

  global.FAQCore = {
    PER_PAGE: PER_PAGE,
    escapeHtml: escapeHtml,
    highlightText: highlightText,
    formatAnswerHtml: formatAnswerHtml,
    readQueryParams: readQueryParams,
    writeQueryParams: writeQueryParams,
    filterFaqs: filterFaqs,
    paginate: paginate,
  };
})(window);
