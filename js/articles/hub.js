(function () {
  const dataEl = document.getElementById("articles-data");
  if (!dataEl) return;

  let payload;
  try {
    payload = JSON.parse(dataEl.textContent);
  } catch {
    return;
  }

  const chips = document.querySelector("[data-articles-chips]");
  const grid = document.querySelector("[data-articles-grid]");
  const empty = document.querySelector("[data-articles-empty]");
  const meta = document.querySelector("[data-articles-results-meta]");
  const sortSelect = document.querySelector("[data-articles-sort]");
  const paginationWrap = document.querySelector("[data-articles-pagination-wrap]");
  if (!chips || !grid) return;

  const perPage = payload.perPage || 12;
  const featuredSlug = payload.featuredSlug || "";
  let filter = "all";
  let sort = "newest";
  let page = 1;

  function articleKey(article) {
    return `${article.type}/${article.slug}`;
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function articleTags(article) {
    if (article.tags && article.tags.length) return article.tags;
    if (article.category) return [article.category];
    return [];
  }

  function typeTagLabel(article) {
    if (article.type === "everyday-faith") return "Sermon";
    if (article.type === "back-to-bible") return "Bible Study";
    return article.typeLabel || article.type || "";
  }

  function primaryTag(article) {
    const tags = articleTags(article);
    if (tags.length) return tags[0];
    if (article.category) return article.category;
    return typeTagLabel(article);
  }

  function renderTagsHtml(article) {
    const label = primaryTag(article);
    if (!label) return "";
    return `<span class="article-tag article-tag--sm article-tag--muted">${escapeHtml(label)}</span>`;
  }

  function renderMeta(article) {
    if (!article.readTime) return "";
    return `${article.readTime} min read`;
  }

  function cardHtml(article, options) {
    const href = `/articles/${article.type}/${article.slug}`;
    const thumb = article.thumbnail || "/images/og-image.jpg";
    const badgeHtml = options.latest
      ? '<span class="articles-card__badge articles-card__badge--latest">Latest</span>'
      : "";

    return `<a href="${href}" class="articles-card articles-card--tall" data-article-type="${escapeHtml(article.type)}" data-article-category="${escapeHtml(article.category || "")}">
      <div class="articles-card__media-wrap">
        <img class="articles-card__media" src="${escapeHtml(thumb)}" alt="" loading="lazy" width="640" height="800" />
        ${badgeHtml}
      </div>
      <div class="articles-card__body">
        <div class="articles-card__tags">${renderTagsHtml(article)}</div>
        <h2 class="articles-card__title">${escapeHtml(article.title)}</h2>
        <p class="articles-card__meta">${renderMeta(article)}</p>
      </div>
    </a>`;
  }

  function matchesFilter(article) {
    if (filter === "all") return true;
    return article.type === filter;
  }

  function getPool() {
    return payload.articles.filter(function (article) {
      if (featuredSlug && articleKey(article) === featuredSlug) return false;
      return matchesFilter(article);
    });
  }

  function sortArticles(list) {
    const sorted = list.slice();
    if (sort === "oldest") {
      sorted.sort(function (a, b) {
        return String(a.date || "").localeCompare(String(b.date || ""));
      });
    } else if (sort === "title") {
      sorted.sort(function (a, b) {
        return String(a.title || "").localeCompare(String(b.title || ""));
      });
    } else {
      sorted.sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      });
    }
    return sorted;
  }

  function renderPagination(totalPages) {
    if (!paginationWrap) return;
    if (totalPages <= 1) {
      paginationWrap.hidden = true;
      paginationWrap.innerHTML = "";
      return;
    }

    paginationWrap.hidden = false;
    let pages = "";
    for (let i = 1; i <= totalPages; i++) {
      if (i === page) {
        pages += `<span class="articles-pagination__page is-current" aria-current="page">${i}</span>`;
      } else {
        pages += `<button type="button" class="articles-pagination__page" data-articles-page="${i}">${i}</button>`;
      }
    }

    const prevDisabled = page <= 1 ? " is-disabled" : "";
    const nextDisabled = page >= totalPages ? " is-disabled" : "";
    paginationWrap.innerHTML =
      `<nav class="articles-pagination" aria-label="Articles pages">` +
      `<button type="button" class="articles-pagination__nav${prevDisabled}" data-articles-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>Previous</button>` +
      `<div class="flex flex-wrap gap-1">${pages}</div>` +
      `<button type="button" class="articles-pagination__nav${nextDisabled}" data-articles-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>Next</button>` +
      `</nav>`;
  }

  function render() {
    const pool = sortArticles(getPool());
    const totalPages = Math.max(1, Math.ceil(pool.length / perPage));
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * perPage;
    const pageItems = pool.slice(start, start + perPage);
    const newestInPool = pool[0] ? articleKey(pool[0]) : "";

    grid.innerHTML = pageItems.length
      ? `<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${pageItems
          .map(function (article) {
            const key = articleKey(article);
            return cardHtml(article, {
              latest: sort === "newest" && key === newestInPool && key !== featuredSlug,
            });
          })
          .join("")}</div>`
      : "";

    if (empty) empty.classList.toggle("hidden", pageItems.length > 0);
    if (meta) {
      if (!pool.length) {
        meta.textContent = "No articles match this filter.";
      } else {
        const end = Math.min(start + perPage, pool.length);
        meta.textContent = `Showing ${start + 1}–${end} of ${pool.length} articles`;
      }
    }

    renderPagination(totalPages);
  }

  chips.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-articles-filter]");
    if (!btn) return;
    filter = btn.getAttribute("data-articles-filter") || "all";
    page = 1;
    chips.querySelectorAll(".articles-chip").forEach(function (chip) {
      chip.classList.toggle("is-active", chip === btn);
    });
    render();
  });

  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      sort = sortSelect.value || "newest";
      page = 1;
      render();
    });
  }

  if (paginationWrap) {
    paginationWrap.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-articles-page]");
      if (!btn || btn.disabled) return;
      const nextPage = Number(btn.getAttribute("data-articles-page"));
      if (!nextPage || nextPage < 1) return;
      page = nextPage;
      render();
      const section = document.querySelector('[aria-label="All articles"]');
      if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  render();
})();
