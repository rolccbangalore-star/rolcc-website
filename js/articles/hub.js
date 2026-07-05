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
  if (!chips || !grid) return;

  const perPage = payload.perPage || 12;
  const page = payload.page || 1;
  let filter = "all";

  function cardHtml(article) {
    const href = `/articles/${article.type}/${article.slug}`;
    const thumb = article.thumbnail || "/images/og-image.jpg";
    const desc = article.summary || article.description || "";
    return `<a href="${href}" class="articles-card" data-article-type="${article.type}" data-article-category="${article.category || ""}">
      <img class="articles-card__media" src="${thumb}" alt="" loading="lazy" width="640" height="360" />
      <div class="articles-card__body">
        <div class="articles-card__tags">
          <span class="article-tag article-tag--sm">${article.typeLabel || article.type}</span>
          <span class="article-tag article-tag--sm article-tag--muted">${article.category || ""}</span>
        </div>
        <h2 class="articles-card__title">${article.title}</h2>
        <p class="articles-card__desc">${desc}</p>
        <p class="articles-card__meta">${article.author || ""} · ${article.dateFormatted || ""}${article.readTime ? ` · ${article.readTime} min read` : ""}</p>
      </div>
    </a>`;
  }

  function matchesFilter(article) {
    if (filter === "all") return true;
    if (filter === "everyday-faith" || filter === "back-to-bible") return article.type === filter;
    return (article.category || "").toLowerCase() === filter.toLowerCase();
  }

  function renderFiltered() {
    const filtered = payload.articles.filter(matchesFilter);
    const start = (page - 1) * perPage;
    const pageItems = filtered.slice(start, start + perPage);

    grid.innerHTML = pageItems.length
      ? `<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${pageItems.map(cardHtml).join("")}</div>`
      : "";

    if (empty) empty.classList.toggle("hidden", pageItems.length > 0);
    if (meta) {
      if (!filtered.length) {
        meta.textContent = "No articles match this filter.";
      } else {
        const end = Math.min(start + perPage, filtered.length);
        meta.textContent = `Showing ${start + 1}–${end} of ${filtered.length} articles`;
      }
    }
  }

  chips.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-articles-filter]");
    if (!btn) return;
    filter = btn.getAttribute("data-articles-filter") || "all";
    chips.querySelectorAll(".articles-chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip === btn);
    });
    renderFiltered();
  });

  renderFiltered();
})();
