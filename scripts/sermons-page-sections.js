const fs = require("fs");
const path = require("path");
const {
  selectRelatedFaqs,
  getPageFaqMeta,
  escapeHtml,
  formatAnswerHtml,
} = require("./faq-config");

const ROOT = path.join(__dirname, "..");

const SERMONS_ARTICLE_TAGS = {
  primaryTags: ["Ministry", "Calling", "Bible Study", "Counselling", "Cell Fellowship"],
  tags: [
    "Ministry",
    "Calling",
    "Bible Study",
    "Counselling",
    "Cell Fellowship",
    "Discipleship",
    "Faith",
    "Anxiety & Stress",
    "Everyday Life",
    "Prayer",
  ],
  types: ["everyday-faith"],
};

function renderArticleCardMeta(article) {
  const parts = [];
  if (article.type === "everyday-faith" && article.author) {
    parts.push(escapeHtml(article.author));
  } else if (article.type === "back-to-bible") {
    const ref = String(article.passage || article.scripture || "").trim();
    if (ref) parts.push(escapeHtml(ref));
  }
  if (article.readTime) parts.push(`${article.readTime} min read`);
  return parts.join(" · ");
}

function loadArticles() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "articles.json"), "utf8"));
  return Array.isArray(data.articles) ? data.articles : [];
}

function loadFaqs() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "faqs.json"), "utf8"));
  return Array.isArray(data.faqs) ? data.faqs : [];
}

function articleTags(article) {
  if (Array.isArray(article.tags) && article.tags.length) return article.tags;
  return article.category ? [article.category] : [];
}

function scoreArticleForSermons(article) {
  const tags = articleTags(article);
  let score = 0;

  SERMONS_ARTICLE_TAGS.primaryTags.forEach((tag) => {
    if (tags.includes(tag)) score += 20;
  });

  SERMONS_ARTICLE_TAGS.tags.forEach((tag) => {
    if (tags.includes(tag) && !SERMONS_ARTICLE_TAGS.primaryTags.includes(tag)) score += 8;
  });

  if (SERMONS_ARTICLE_TAGS.types.includes(article.type)) score += 6;

  return score;
}

function rankArticlesForSermons(articles) {
  return articles
    .map((article) => ({ article, score: scoreArticleForSermons(article) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.article.date || "").localeCompare(String(a.article.date || ""));
    })
    .map(({ article }) => article);
}

function articleUrl(article) {
  return `/articles/${article.type}/${article.slug}`;
}

function articleImageAlt(article) {
  return escapeHtml(article.title || "Article");
}

function renderArticleCardTag(article) {
  const tag = articleTags(article)[0] || article.category || "Article";
  return `<span class="article-tag article-tag--sm article-tag--muted">${escapeHtml(tag)}</span>`;
}

function renderArticleCard(article, options = {}) {
  const badgeHtml = options.featured
    ? '<span class="articles-card__badge articles-card__badge--featured">Featured</span>'
    : options.latest
      ? '<span class="articles-card__badge articles-card__badge--latest">Latest</span>'
      : "";

  const readTime = renderArticleCardMeta(article);

  return `<a href="${articleUrl(article)}" class="articles-card articles-card--tall" data-article-type="${escapeHtml(article.type)}" data-article-category="${escapeHtml(article.category || "")}">
    <div class="articles-card__media-wrap">
      <img class="articles-card__media" src="${escapeHtml(article.thumbnail)}" alt="${articleImageAlt(article)}" loading="lazy" width="640" height="800" />
      ${badgeHtml}
    </div>
    <div class="articles-card__body">
      <div class="articles-card__tags">
        ${renderArticleCardTag(article)}
      </div>
      <h2 class="articles-card__title">${escapeHtml(article.title)}</h2>
      <p class="articles-card__meta">${readTime}</p>
    </div>
  </a>`;
}

function selectSermonsArticles(articles, limit = 3) {
  const sermonArticles = articles.filter((article) => article.type === "everyday-faith");
  const pool = rankArticlesForSermons(sermonArticles);
  if (!pool.length) return [];

  const featured = pool.find((article) => article.featured) || pool[0];
  const featuredKey = `${featured.type}/${featured.slug}`;
  const latest = pool.find((article) => `${article.type}/${article.slug}` !== featuredKey) || null;
  const cards = [{ article: featured, featured: true, latest: false }];

  pool.forEach((article) => {
    if (cards.length >= limit) return;
    const key = `${article.type}/${article.slug}`;
    if (key === featuredKey) return;
    cards.push({
      article,
      featured: false,
      latest: latest && key === `${latest.type}/${latest.slug}`,
    });
  });

  return cards;
}

function renderSermonsArticlesSection(articles) {
  const cards = selectSermonsArticles(articles);
  if (!cards.length) return "";

  const cardHtml = cards
    .map(({ article, featured, latest }) => renderArticleCard(article, { featured, latest }))
    .join("\n");

  return `<section id="articles-spotlight" class="home-blog border-b border-slate-200 bg-white" aria-labelledby="home-blog-heading-sermons">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-16 lg:px-8">
          <div class="scroll-reveal max-w-2xl">
            <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Articles</p>
            <h2 id="home-blog-heading-sermons" class="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Grow beyond the sermon</h2>
            <p class="mx-auto mt-3 max-w-xl text-sm text-slate-600 sm:text-base">Sermon reflections and practical reads on faith, calling, and pastoral care — for ministry, volunteering, and life with Jesus.</p>
          </div>
          <div class="mt-8 scroll-reveal scroll-reveal--delay-1">
            <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${cardHtml}</div>
          </div>
          <div class="mt-8 scroll-reveal scroll-reveal--delay-2">
            <a href="/articles" class="btn-outline inline-flex items-center rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-800 hover:border-accent hover:text-accentSoft">View All Articles</a>
          </div>
        </div>
      </section>`;
}

function renderSermonsCtaBanner() {
  return `<section class="border-b border-slate-200 bg-white">
        <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 md:py-14 lg:px-8">
          <div class="cta-gradient rounded-3xl scroll-reveal" id="cta-gradient-sermons">
            <div class="cta-gradient__bg rounded-3xl"></div>
            <div class="cta-gradient__overlay rounded-3xl"></div>
            <div class="relative z-10 px-6 py-12 sm:px-10 md:py-16 text-center">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Go beyond Sunday</p>
              <h2 class="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl text-balance">Put God&apos;s Word into practice through ministry</h2>
              <p class="mx-auto mt-3 max-w-xl text-sm text-white/75 sm:text-base">Sunday messages are a starting point. Explore cell fellowship, volunteer teams, pastoral care, and counselling when you are ready to take a next step.</p>
              <div class="mt-6 flex flex-wrap justify-center gap-3">
                <a href="/fellowship" class="inline-flex items-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white/90">Explore Fellowship</a>
                <a href="/counselling" class="inline-flex items-center rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/50">Counselling Support</a>
                <a href="/contact" class="inline-flex items-center rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/50">Volunteer with Us</a>
              </div>
            </div>
          </div>
        </div>
      </section>`;
}

function renderFaqAccordionItem(faq, prefix) {
  const headingId = `${prefix}faq-q-${faq.slug}`;
  const panelId = `${prefix}faq-a-${faq.slug}`;

  return `<article class="faq-accordion__item" data-faq-id="${escapeHtml(faq.id)}" data-faq-topic="${escapeHtml(faq.topic)}" data-faq-category="${escapeHtml(faq.category)}">
  <h3 class="faq-accordion__heading">
    <button type="button" class="faq-accordion__trigger" id="${headingId}" aria-expanded="false" aria-controls="${panelId}">
      <span class="faq-accordion__question">${escapeHtml(faq.question)}</span>
      <span class="faq-accordion__icon" aria-hidden="true"></span>
    </button>
  </h3>
  <div class="faq-accordion__panel" id="${panelId}" role="region" aria-labelledby="${headingId}" hidden>
    <div class="faq-accordion__answer">${formatAnswerHtml(faq.answer)}${faq.scripture ? `<p class="faq-accordion__scripture"><em>${escapeHtml(faq.scripture)}</em></p>` : ""}</div>
  </div>
</article>`;
}

function renderSermonsFaqSection(faqs) {
  const related = selectRelatedFaqs(faqs, "sermons");
  if (!related.length) return "";

  const meta = getPageFaqMeta("sermons");
  const accordion = `<div class="faq-accordion" data-faq-accordion>${related
    .map((faq) => renderFaqAccordionItem(faq, "sermons-"))
    .join("\n")}</div>`;

  return `<section class="related-faqs border-b border-slate-200 bg-slate-50" aria-labelledby="related-faqs-heading-sermons">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-16 lg:px-8">
          <div class="scroll-reveal max-w-2xl">
            <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Questions &amp; Answers</p>
            <h2 id="related-faqs-heading-sermons" class="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">${escapeHtml(meta.heading)}</h2>
            <p class="mt-3 text-sm text-slate-600 sm:text-base">${escapeHtml(meta.description)}</p>
          </div>
          <div class="mt-8 scroll-reveal scroll-reveal--delay-1">
            ${accordion}
          </div>
          <div class="mt-8 scroll-reveal scroll-reveal--delay-2">
            <a href="/faq" class="inline-flex items-center rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-accent/70 transition hover:bg-accentSoft">View All FAQs</a>
          </div>
        </div>
      </section>`;
}

function renderSermonsPageSections() {
  const articles = loadArticles();
  const faqs = loadFaqs();

  return [
    renderSermonsArticlesSection(articles),
    renderSermonsCtaBanner(),
    renderSermonsFaqSection(faqs),
  ]
    .filter(Boolean)
    .join("\n");
}

module.exports = {
  renderSermonsPageSections,
};
