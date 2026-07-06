const fs = require("fs");
const path = require("path");
const {
  ARTICLES_PER_PAGE,
  LATEST_COUNT,
  FEATURED_MAX,
  RELATED_COUNT,
  SITE_ORIGIN,
  DEFAULT_THUMBNAIL,
  TYPE_LABELS,
  escapeHtml,
  computeReadTime,
  formatDate,
  articleUrl,
  articleCanonical,
  parseFrontmatter,
  markdownToHtml,
  collectBlockText,
  renderBlocks,
  renderArticleMetaBar,
  renderSummaryBox,
  renderKeyTakeaways,
  selectRelatedArticles,
  getPrevNext,
} = require("./article-config");

const ROOT = path.join(__dirname, "..");
const TODAY = new Date().toISOString().slice(0, 10);
const DATA_DIR = path.join(ROOT, "data");
const EF_DIR = path.join(DATA_DIR, "articles", "everyday-faith");
const BTB_DIR = path.join(DATA_DIR, "articles", "back-to-bible");
const OUT_EF = path.join(ROOT, "articles", "everyday-faith");
const OUT_BTB = path.join(ROOT, "articles", "back-to-bible");

function loadEverydayFaith() {
  if (!fs.existsSync(EF_DIR)) return [];
  const articles = [];

  fs.readdirSync(EF_DIR).forEach((fileName) => {
    const slug = fileName.replace(/\.(json|md)$/, "");
    const filePath = path.join(EF_DIR, fileName);

    if (fileName.endsWith(".json")) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (data.publish === false) return;

      const blocks = data.blocks || [];
      const keyTakeaways = data.keyTakeaways || [];
      const textForReadTime = [
        data.title,
        data.description,
        data.summary,
        ...keyTakeaways,
        collectBlockText(blocks),
      ].join(" ");

      articles.push({
        type: "everyday-faith",
        typeLabel: TYPE_LABELS["everyday-faith"],
        slug,
        title: data.title || slug,
        description: data.description || "",
        summary: data.summary || data.description || "",
        author: data.author || "ROLCC Pastoral Team",
        category: data.category || "General",
        date: data.date || TODAY,
        dateFormatted: formatDate(data.date || TODAY),
        thumbnail: data.thumbnail || DEFAULT_THUMBNAIL,
        featured: data.featured === true,
        scripture: data.scripture || "",
        sermonSeries: data.sermonSeries || "",
        keyTakeaways,
        blocks,
        includeQuiz: data.includeQuiz === true,
        quiz:
          data.includeQuiz === true
            ? (data.quiz || []).map((item) => ({
                question: item.question,
                options: (item.options || []).map((o) => (typeof o === "string" ? o : o.option || "")),
                correctIndex: item.correctIndex,
                explanation: item.explanation || "",
              }))
            : [],
        readTime: computeReadTime(textForReadTime),
        bodyHtml: renderBlocks(blocks),
      });
      return;
    }

    if (fileName.endsWith(".md")) {
      const raw = fs.readFileSync(filePath, "utf8");
      const { meta, body } = parseFrontmatter(raw);
      if (meta.publish === false) return;
      const html = markdownToHtml(body);
      articles.push({
        type: "everyday-faith",
        typeLabel: TYPE_LABELS["everyday-faith"],
        slug,
        title: meta.title || slug,
        description: meta.description || "",
        summary: meta.summary || meta.description || "",
        author: meta.author || "ROLCC Pastoral Team",
        category: meta.category || "General",
        date: meta.date || TODAY,
        dateFormatted: formatDate(meta.date || TODAY),
        thumbnail: meta.thumbnail || DEFAULT_THUMBNAIL,
        featured: meta.featured === true,
        scripture: meta.scripture || "",
        sermonSeries: meta.sermonSeries || "",
        keyTakeaways: [],
        blocks: [],
        readTime: computeReadTime(body),
        bodyHtml: html,
      });
    }
  });

  return articles;
}

function loadBackToBible() {
  if (!fs.existsSync(BTB_DIR)) return [];
  return fs
    .readdirSync(BTB_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((fileName) => {
      const slug = fileName.replace(/\.json$/, "");
      const data = JSON.parse(fs.readFileSync(path.join(BTB_DIR, fileName), "utf8"));
      if (data.publish === false) return null;
      const textParts = [
        data.passage,
        ...(data.sections || []).map((s) => `${s.heading} ${s.body}`),
        ...(data.discussionQuestions || []),
      ];
      const readTime = computeReadTime(textParts.join(" "));
      return {
        type: "back-to-bible",
        typeLabel: TYPE_LABELS["back-to-bible"],
        slug,
        title: data.title || slug,
        description: data.description || "",
        author: data.author || "ROLCC",
        category: data.category || "Bible Study",
        date: data.date || TODAY,
        dateFormatted: formatDate(data.date || TODAY),
        thumbnail: data.thumbnail || DEFAULT_THUMBNAIL,
        featured: data.featured === true,
        passage: data.passage || "",
        sections: data.sections || [],
        discussionQuestions: (data.discussionQuestions || []).map((q) =>
          typeof q === "string" ? q : q.question || ""
        ).filter(Boolean),
        activities: data.activities || [],
        includeQuiz: data.includeQuiz === true,
        quiz:
          data.includeQuiz === true
            ? (data.quiz || []).map((item) => ({
                question: item.question,
                options: (item.options || []).map((o) => (typeof o === "string" ? o : o.option || "")),
                correctIndex: item.correctIndex,
                explanation: item.explanation || "",
              }))
            : [],
        readTime,
      };
    })
    .filter(Boolean);
}

function loadArticles() {
  const articles = [...loadEverydayFaith(), ...loadBackToBible()];
  return articles.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function articlesHref(pageNum) {
  return pageNum === 1 ? "/articles" : `/articles/${pageNum}`;
}

function readHeaderNavTemplate(assetRoot) {
  const css = `${assetRoot}css/styles.css`;
  const logo = `${assetRoot}assets/logo.svg`;
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{TITLE}}</title>
    <meta name="description" content="{{DESCRIPTION}}" />
    <meta property="og:title" content="{{TITLE}}" />
    <meta property="og:description" content="{{DESCRIPTION}}" />
    <meta property="og:type" content="{{OG_TYPE}}" />
    <meta property="og:url" content="{{CANONICAL}}" />
    <meta property="og:image" content="{{OG_IMAGE}}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{{TITLE}}" />
    <meta name="twitter:description" content="{{DESCRIPTION}}" />
    <meta name="twitter:image" content="{{OG_IMAGE}}" />
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" type="image/png" sizes="48x48" href="/images/favicon-48x48.png" />
    <link rel="icon" type="image/png" sizes="96x96" href="/images/favicon-96x96.png" />
    <link rel="apple-touch-icon" href="/images/apple-touch-icon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = { theme: { extend: { colors: { primary: "#ffffff", primaryDark: "#f6f9fc", accent: "#635bff", accentSoft: "#818cf8" } } } };
    </script>
    <link rel="stylesheet" href="${css}" />
    {{HEAD_EXTRA}}
  </head>
  <body class="bg-slate-50 text-slate-900">
    <div id="announce-banner" class="announce-banner" role="banner" aria-label="Announcement">
      <div class="announce-banner__inner">
        <p class="announce-banner__title">Join with us Online <a href="#" id="announce-watch-live" class="announce-banner__btn" aria-label="Watch Live"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg></a></p>
        <button type="button" id="announce-banner-close" class="announce-banner__close" aria-label="Dismiss announcement"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </div>
    </div>
    <header class="header-top" id="header">
      <nav class="header-top__bar mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between">
        <a href="/" class="header-top__brand flex items-center gap-3">
          <img src="${logo}" alt="River of Life Christian Church" class="header-top__logo-img" width="36" height="44" />
          <div class="leading-tight"><p class="text-sm font-semibold tracking-wide">River of Life</p><p class="text-[11px] text-slate-500">Christian Church · Bangalore</p></div>
        </a>
        <div class="hidden lg:flex items-center gap-6 text-sm font-medium">
          <a href="/" class="header-top__link hidden xl:inline-flex" data-nav="index">Home</a>
          <a href="/about" class="header-top__link" data-nav="about">About Us</a>
          <div class="header-top__dropdown relative" id="ministries-dropdown">
            <button type="button" class="header-top__link flex items-center gap-0.5" aria-expanded="false" aria-haspopup="true" aria-controls="ministries-menu" id="ministries-trigger">Ministries <span class="text-[10px] ml-0.5" aria-hidden="true">▾</span></button>
            <div class="header-top__dropdown-panel absolute top-full left-0 mt-1 py-2 min-w-[10rem] rounded-lg border border-slate-200 bg-white shadow-lg z-50 hidden" id="ministries-menu" role="menu">
              <a href="/services" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-t-lg" role="menuitem" data-nav="services">Worship Services</a>
              <a href="/river-kids" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50" role="menuitem" data-nav="river-kids">River Kids</a>
              <a href="/fellowship" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50" role="menuitem" data-nav="fellowship">Cell Fellowship</a>
              <a href="/pmd" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50" role="menuitem" data-nav="pmd">PMD</a>
              <a href="/counselling" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50" role="menuitem" data-nav="counselling">Counselling</a>
              <a href="/rolf" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-b-lg" role="menuitem" data-nav="rolf">ROLF</a>
            </div>
          </div>
          <a href="/giving" class="header-top__link hidden xl:inline-flex" data-nav="giving">Giving</a>
          <a href="/contact" class="header-top__link" data-nav="contact">Contact Us</a>
        </div>
        <div class="hidden lg:block">
          <a href="/contact#location" class="header-top__cta inline-flex items-center rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-accent/70 hover:bg-accentSoft transition">Join Us This Sunday</a></div>
        <button id="nav-toggle" type="button" class="header-top__hamburger lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100" aria-label="Open menu" aria-expanded="false" aria-controls="nav-menu"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
      </nav>
      <div id="nav-menu" class="header-top__menu hidden lg:hidden border-t border-slate-200 bg-white" aria-hidden="true">
        <div class="mx-auto max-w-6xl px-4 py-3 space-y-1 sm:px-6 lg:px-8">
          <a href="/" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" data-nav="index">Home</a>
          <a href="/about" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" data-nav="about">About Us</a>
          <p class="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mt-2">Ministries</p>
          <a href="/services" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="services">Worship Services</a>
          <a href="/river-kids" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="river-kids">River Kids</a>
          <a href="/fellowship" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="fellowship">Cell Fellowship</a>
          <a href="/pmd" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="pmd">PMD</a>
          <a href="/counselling" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="counselling">Counselling</a>
          <a href="/rolf" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="rolf">ROLF</a>
          <a href="/events" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="events">Events</a>
          <a href="/membership" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="membership">Membership</a>
          <a href="/giving" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" data-nav="giving">Giving</a>
          <a href="/contact" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" data-nav="contact">Contact Us</a>
          <a href="/contact#location" class="header-top__menu-cta mt-3 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">Join Us This Sunday</a>
        </div>
      </div>
    </header>`;
}

function readFooterTemplate() {
  return `
    <footer id="footer-section" class="footer-reveal relative z-10 border-t border-slate-200 bg-slate-900 text-slate-300">
      <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Resources</p>
            <ul class="mt-4 space-y-2 text-sm">
              <li><a href="/articles" class="hover:text-white">Articles &amp; Studies</a></li>
              <li><a href="/faq" class="hover:text-white">FAQs</a></li>
              <li><a href="/contact" class="hover:text-white">Contact</a></li>
            </ul>
          </div>
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Ministries</p>
            <ul class="mt-4 space-y-2 text-sm">
              <li><a href="/services" class="hover:text-white">Worship Services</a></li>
              <li><a href="/fellowship" class="hover:text-white">Cell Fellowship</a></li>
              <li><a href="/river-kids" class="hover:text-white">River Kids</a></li>
            </ul>
          </div>
        </div>
        <div class="mt-10 border-t border-white/10 pt-6 text-center text-[11px] text-slate-400">
          <p>© <span id="year"></span> River of Life Christian Church. All rights reserved.</p>
        </div>
      </div>
    </footer>
    <button id="scroll-top-btn" class="scroll-to-top hidden fixed bottom-5 right-4 z-40 rounded-full bg-slate-900/90 p-2 text-xs text-slate-100 shadow-lg ring-1 ring-slate-600 hover:bg-slate-800 sm:bottom-6 sm:right-6" aria-label="Scroll to top" type="button">↑</button>`;
}

function renderArticleCard(article) {
  const href = articleUrl(article);
  return `<a href="${href}" class="articles-card">
    <img class="articles-card__media" src="${escapeHtml(article.thumbnail)}" alt="" loading="lazy" width="640" height="360" />
    <div class="articles-card__body">
      <div class="articles-card__tags">
        <span class="article-tag article-tag--sm">${escapeHtml(article.typeLabel)}</span>
        <span class="article-tag article-tag--sm article-tag--muted">${escapeHtml(article.category)}</span>
      </div>
      <h2 class="articles-card__title">${escapeHtml(article.title)}</h2>
      <p class="articles-card__desc">${escapeHtml(article.summary || article.description)}</p>
      <p class="articles-card__meta">${escapeHtml(article.author)} · ${escapeHtml(article.dateFormatted)} · ${article.readTime} min read</p>
    </div>
  </a>`;
}

function renderPagination(pageNum, totalPages) {
  if (totalPages <= 1) return "";
  const mkLink = (num, label, current) => {
    const href = articlesHref(num);
    if (num === current) return `<span class="articles-pagination__page is-current" aria-current="page">${label}</span>`;
    return `<a class="articles-pagination__page" href="${href}">${label}</a>`;
  };
  let pages = "";
  for (let i = 1; i <= totalPages; i++) pages += mkLink(i, String(i), pageNum);
  const prev =
    pageNum > 1
      ? `<a class="articles-pagination__nav" href="${articlesHref(pageNum - 1)}" rel="prev">Previous</a>`
      : `<span class="articles-pagination__nav is-disabled">Previous</span>`;
  const next =
    pageNum < totalPages
      ? `<a class="articles-pagination__nav" href="${articlesHref(pageNum + 1)}" rel="next">Next</a>`
      : `<span class="articles-pagination__nav is-disabled">Next</span>`;
  return `<nav class="articles-pagination" aria-label="Articles pages">${prev}<div class="flex flex-wrap gap-1">${pages}</div>${next}</nav>`;
}

function renderFilterChips(categories) {
  const chips = [
    `<button type="button" class="articles-chip is-active" data-articles-filter="all">All</button>`,
    `<button type="button" class="articles-chip" data-articles-filter="everyday-faith">Everyday Faith</button>`,
    `<button type="button" class="articles-chip" data-articles-filter="back-to-bible">Back to the Bible</button>`,
  ];
  categories.forEach((cat) => {
    chips.push(
      `<button type="button" class="articles-chip" data-articles-filter="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`
    );
  });
  return `<div class="articles-chips mt-6" role="toolbar" aria-label="Filter articles" data-articles-chips>${chips.join("")}</div>`;
}

function buildPageShell({ title, description, canonical, ogType, ogImage, headExtra, bodyMain, assetRoot, scripts }) {
  return `${readHeaderNavTemplate(assetRoot)
    .replaceAll("{{TITLE}}", escapeHtml(title))
    .replaceAll("{{DESCRIPTION}}", escapeHtml(description))
    .replaceAll("{{OG_TYPE}}", ogType || "website")
    .replaceAll("{{CANONICAL}}", canonical)
    .replaceAll("{{OG_IMAGE}}", ogImage || `${SITE_ORIGIN}/images/og-image.jpg`)
    .replace("{{HEAD_EXTRA}}", headExtra)}
    <main class="main-no-top-gap relative z-10">${bodyMain}</main>
${readFooterTemplate()}
    <script src="${assetRoot}js/main.js"></script>
    ${scripts || ""}
  </body>
</html>`;
}

function buildHubPage(articles, pageNum, totalPages, categories) {
  const start = (pageNum - 1) * ARTICLES_PER_PAGE;
  const pageArticles = articles.slice(start, start + ARTICLES_PER_PAGE);
  const featured = articles.filter((a) => a.featured).slice(0, FEATURED_MAX);
  const latest = articles.slice(0, LATEST_COUNT);
  const canonical = pageNum === 1 ? `${SITE_ORIGIN}/articles` : `${SITE_ORIGIN}/articles/${pageNum}`;
  const title =
    pageNum === 1
      ? "Articles & Bible Studies | River of Life Christian Church, Bangalore"
      : `Articles & Bible Studies | Page ${pageNum} | River of Life Christian Church`;
  const description =
    "Everyday Faith articles and Back to the Bible cell fellowship studies from River of Life Christian Church in Bangalore.";

  const headExtra = `<link rel="stylesheet" href="/css/articles.css" />
    <link rel="canonical" href="${canonical}" />
    ${pageNum > 1 ? `<link rel="prev" href="${pageNum === 2 ? `${SITE_ORIGIN}/articles` : `${SITE_ORIGIN}/articles/${pageNum - 1}`}" />` : ""}
    ${pageNum < totalPages ? `<link rel="next" href="${SITE_ORIGIN}/articles/${pageNum + 1}" />` : ""}`;

  const bodyMain = `
      <section class="articles-hero contact-hero relative border-b border-slate-200">
        <div class="relative z-10 mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6 sm:pt-24 sm:pb-12 lg:px-8">
          <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Articles &amp; Studies</p>
          <h1 class="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">Faith for everyday life and deeper Bible study</h1>
          <p class="mt-5 max-w-2xl text-sm text-slate-600 sm:text-base leading-relaxed">Read Everyday Faith reflections from Sunday messages, or explore Back to the Bible studies for cell fellowship.</p>
          ${renderFilterChips(categories)}
        </div>
      </section>

      ${
        pageNum === 1 && featured.length
          ? `<section class="border-b border-slate-200 bg-white" aria-label="Featured articles">
        <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 class="text-lg font-semibold text-slate-900">Featured</h2>
          <div class="articles-featured mt-6">${featured.map(renderArticleCard).join("")}</div>
        </div>
      </section>`
          : ""
      }

      ${
        pageNum === 1 && latest.length
          ? `<section class="border-b border-slate-200 bg-slate-50" aria-label="Latest articles">
        <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 class="text-lg font-semibold text-slate-900">Latest</h2>
          <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${latest.map(renderArticleCard).join("")}</div>
        </div>
      </section>`
          : ""
      }

      <section class="border-b border-slate-200 bg-white" aria-label="All articles">
        <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <h2 class="text-lg font-semibold text-slate-900">${pageNum === 1 ? "All articles" : `Page ${pageNum}`}</h2>
          <p class="articles-results-meta mt-2 text-sm text-slate-500" data-articles-results-meta>Showing ${start + 1}–${Math.min(start + ARTICLES_PER_PAGE, articles.length)} of ${articles.length} articles</p>
          <div class="mt-6" data-articles-grid>
            <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${pageArticles.map(renderArticleCard).join("")}</div>
          </div>
          <p class="articles-empty hidden mt-8" data-articles-empty>No articles match this filter.</p>
          <div class="mt-10">${renderPagination(pageNum, totalPages)}</div>
        </div>
      </section>`;

  const listPayload = articles.map((a) => ({
    type: a.type,
    typeLabel: a.typeLabel,
    slug: a.slug,
    title: a.title,
    description: a.description,
    summary: a.summary || a.description,
    category: a.category,
    author: a.author,
    dateFormatted: a.dateFormatted,
    readTime: a.readTime,
    thumbnail: a.thumbnail,
  }));

  const scripts = `<script id="articles-data" type="application/json">${JSON.stringify({
    articles: listPayload,
    perPage: ARTICLES_PER_PAGE,
    page: pageNum,
    categories,
  })}</script>
    <script src="/js/articles/hub.js"></script>`;

  return {
    fileName: pageNum === 1 ? "articles.html" : `articles-${pageNum}.html`,
    html: buildPageShell({
      title,
      description,
      canonical,
      headExtra,
      bodyMain,
      assetRoot: "/",
      scripts,
    }),
  };
}

function renderRelated(articles, current) {
  const related = selectRelatedArticles(articles, current);
  if (!related.length) return "";
  return `<section class="mt-14 border-t border-slate-200 pt-10" aria-labelledby="related-articles-heading">
    <h2 id="related-articles-heading" class="text-xl font-semibold text-slate-900">More to read</h2>
    <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${related.map(renderArticleCard).join("")}</div>
  </section>`;
}

function renderPrevNext(articles, current) {
  const { prev, next } = getPrevNext(articles, current);
  if (!prev && !next) return "";
  return `<nav class="article-nav-links" aria-label="Article navigation">
    ${prev ? `<a href="${articleUrl(prev)}">← ${escapeHtml(prev.title)}</a>` : "<span></span>"}
    ${next ? `<a href="${articleUrl(next)}" class="text-right">${escapeHtml(next.title)} →</a>` : ""}
  </nav>`;
}

function articleSchema(article, canonical) {
  const base = {
    "@context": "https://schema.org",
    "@type": article.type === "everyday-faith" ? "BlogPosting" : "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    author: { "@type": "Organization", name: article.author },
    image: article.thumbnail.startsWith("http") ? article.thumbnail : `${SITE_ORIGIN}${article.thumbnail}`,
    url: canonical,
    publisher: {
      "@type": "Organization",
      name: "River of Life Christian Church",
      logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/images/og-image.jpg` },
    },
  };
  return JSON.stringify(base, null, 2);
}

function renderQuizSection(article) {
  if (!article.includeQuiz || !article.quiz?.length) return "";
  return `<section class="article-section" aria-label="Study quiz">
      <h2 class="text-lg font-semibold text-slate-900">Quick quiz</h2>
      <p class="mt-2 text-sm text-slate-600">Test your understanding. Answers stay on this device only.</p>
      <div class="article-quiz mt-4" data-article-quiz>
        <p class="text-xs text-slate-500" data-quiz-progress></p>
        <p class="article-quiz__question mt-2" data-quiz-question></p>
        <div class="article-quiz__options" data-quiz-options></div>
        <p class="article-quiz__feedback" data-quiz-feedback></p>
        <div class="article-quiz__actions">
          <button type="button" class="article-quiz__btn" data-quiz-next hidden>Next question</button>
          <button type="button" class="article-quiz__btn article-quiz__btn--ghost" data-quiz-reset>Reset quiz</button>
        </div>
      </div>
    </section>`;
}

function renderQuizScripts(article) {
  if (!article.includeQuiz || !article.quiz?.length) return "";
  return `\n    <script id="article-quiz-data" type="application/json">${JSON.stringify(article.quiz)}</script>\n    <script src="/js/articles/quiz.js"></script>`;
}

function buildEverydayFaithPage(article, allArticles) {
  const canonical = articleCanonical(article);
  const assetRoot = "/";
  const title = `${article.title} | Everyday Faith | River of Life Christian Church`;
  const headExtra = `<link rel="stylesheet" href="/css/articles.css" />
    <link rel="canonical" href="${canonical}" />
    <script type="application/ld+json">${articleSchema(article, canonical)}</script>`;

  const bodyMain = `
      <article class="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">${escapeHtml(article.typeLabel)}${article.sermonSeries ? ` · ${escapeHtml(article.sermonSeries)}` : ""}</p>
        <h1 class="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">${escapeHtml(article.title)}</h1>
        ${renderArticleMetaBar(article)}
        <img class="mt-8 w-full rounded-2xl border border-slate-200" src="${escapeHtml(article.thumbnail)}" alt="" width="960" height="540" loading="lazy" />
        ${renderSummaryBox(article.summary)}
        <div class="article-prose mt-8">${article.bodyHtml}</div>
        ${renderKeyTakeaways(article.keyTakeaways)}
        ${renderQuizSection(article)}
        <div class="mt-10">
          <button type="button" class="article-clap" data-article-clap data-slug="${escapeHtml(article.slug)}" aria-label="Appreciate this article">
            <span aria-hidden="true">👏</span> Appreciate · <span data-clap-count>0</span>
          </button>
        </div>
        ${renderPrevNext(allArticles, article)}
        ${renderRelated(allArticles, article)}
        <p class="mt-10"><a href="/articles" class="text-sm font-medium text-accent hover:underline">← Back to all articles</a></p>
      </article>`;

  const scripts = `<script src="/js/articles/clap.js"></script>${renderQuizScripts(article)}`;
  return buildPageShell({ title, description: article.description, canonical, ogType: "article", ogImage: article.thumbnail.startsWith("http") ? article.thumbnail : `${SITE_ORIGIN}${article.thumbnail}`, headExtra, bodyMain, assetRoot, scripts });
}

function buildBackToBiblePage(article, allArticles) {
  const canonical = articleCanonical(article);
  const title = `${article.title} | Back to the Bible | River of Life Christian Church`;
  const headExtra = `<link rel="stylesheet" href="/css/articles.css" />
    <link rel="canonical" href="${canonical}" />
    <script type="application/ld+json">${articleSchema(article, canonical)}</script>`;

  const sectionsHtml = (article.sections || [])
    .map(
      (s) => `<section class="article-section">
      <h2 class="text-lg font-semibold text-slate-900">${escapeHtml(s.heading)}</h2>
      <p class="mt-3 text-slate-700 leading-relaxed">${escapeHtml(s.body)}</p>
    </section>`
    )
    .join("");

  const questionsHtml = article.discussionQuestions?.length
    ? `<section class="article-section">
      <h2 class="text-lg font-semibold text-slate-900">Discussion questions</h2>
      <ul class="mt-3 list-disc pl-5 space-y-2 text-slate-700">${article.discussionQuestions.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}</ul>
    </section>`
    : "";

  const activitiesHtml = article.activities?.length
    ? `<section class="article-section">
      <h2 class="text-lg font-semibold text-slate-900">Activities</h2>
      ${article.activities
        .map(
          (a) => `<div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 class="font-medium text-slate-900">${escapeHtml(a.title)}</h3>
        <p class="mt-2 text-sm text-slate-600">${escapeHtml(a.body)}</p>
      </div>`
        )
        .join("")}
    </section>`
    : "";

  const quizHtml = renderQuizSection(article);

  const bodyMain = `
      <article class="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">${escapeHtml(article.typeLabel)}</p>
        <h1 class="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">${escapeHtml(article.title)}</h1>
        <p class="mt-4 text-sm text-slate-500">${escapeHtml(article.dateFormatted)} · ${article.readTime} min read</p>
        ${article.passage ? `<p class="mt-2 text-sm font-medium text-slate-700">Passage: ${escapeHtml(article.passage)}</p>` : ""}
        <img class="mt-8 w-full rounded-2xl border border-slate-200" src="${escapeHtml(article.thumbnail)}" alt="" width="960" height="540" loading="lazy" />
        ${sectionsHtml}
        ${questionsHtml}
        ${activitiesHtml}
        ${quizHtml}
        <div class="mt-10">
          <button type="button" class="article-clap" data-article-clap data-slug="${escapeHtml(article.slug)}" aria-label="Appreciate this study">
            <span aria-hidden="true">👏</span> Appreciate · <span data-clap-count>0</span>
          </button>
        </div>
        ${renderPrevNext(allArticles, article)}
        ${renderRelated(allArticles, article)}
        <p class="mt-10"><a href="/articles" class="text-sm font-medium text-accent hover:underline">← Back to all articles</a></p>
      </article>`;

  const scripts = `<script src="/js/articles/clap.js"></script>${renderQuizScripts(article)}`;
  return buildPageShell({ title, description: article.description, canonical, ogType: "article", ogImage: article.thumbnail.startsWith("http") ? article.thumbnail : `${SITE_ORIGIN}${article.thumbnail}`, headExtra, bodyMain, assetRoot: "/", scripts });
}

function updateSitemap(articles, faqTotalPages) {
  const staticPages = [
    ["/", "weekly", "1.0"],
    ["/about", "monthly", "0.9"],
    ["/services", "monthly", "0.9"],
    ["/contact", "monthly", "0.9"],
    ["/giving", "monthly", "0.8"],
    ["/events", "weekly", "0.8"],
    ["/membership", "monthly", "0.8"],
    ["/river-kids", "monthly", "0.8"],
    ["/fellowship", "monthly", "0.8"],
    ["/pmd", "monthly", "0.7"],
    ["/counselling", "monthly", "0.7"],
    ["/rolf", "monthly", "0.7"],
    ["/articles", "weekly", "0.85"],
  ];
  const urls = staticPages.map(
    ([loc, changefreq, priority]) =>
      `  <url>\n    <loc>${SITE_ORIGIN}${loc === "/" ? "/" : loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
  );

  for (let i = 1; i <= faqTotalPages; i++) {
    const loc = i === 1 ? "/faq" : `/faq/${i}`;
    urls.push(
      `  <url>\n    <loc>${SITE_ORIGIN}${loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${i === 1 ? "0.8" : "0.6"}</priority>\n  </url>`
    );
  }

  const articleHubPages = Math.max(1, Math.ceil(articles.length / ARTICLES_PER_PAGE));
  for (let i = 2; i <= articleHubPages; i++) {
    urls.push(
      `  <url>\n    <loc>${SITE_ORIGIN}/articles/${i}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.65</priority>\n  </url>`
    );
  }

  articles.forEach((a) => {
    urls.push(
      `  <url>\n    <loc>${articleCanonical(a)}</loc>\n    <lastmod>${a.date || TODAY}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`
    );
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml, "utf8");
}

function getFaqTotalPages() {
  const faqsPath = path.join(DATA_DIR, "faqs.json");
  if (!fs.existsSync(faqsPath)) return 8;
  try {
    const data = JSON.parse(fs.readFileSync(faqsPath, "utf8"));
    const perPage = data.perPage || 25;
    return Math.max(1, Math.ceil((data.total || data.faqs?.length || 0) / perPage));
  } catch {
    return 8;
  }
}

const FOOTER_FAQ_COLUMN = `              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Help &amp; FAQs</p>
                <ul class="mt-4 space-y-2.5 text-sm text-slate-300">
                  <li><a href="/faq" class="footer-link hover:text-white">Browse all FAQs</a></li>
                </ul>
              </div>`;

function collectSiteHtmlFiles() {
  const files = [];
  fs.readdirSync(ROOT)
    .filter((f) => f.endsWith(".html"))
    .forEach((f) => files.push(path.join(ROOT, f)));

  const articlesDir = path.join(ROOT, "articles");
  if (!fs.existsSync(articlesDir)) return files;

  function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(entryPath);
      else if (entry.name.endsWith(".html")) files.push(entryPath);
    });
  }
  walk(articlesDir);
  return files;
}

function syncSiteNav() {
  const headerFaqPatterns = [
    /\s*<a href="\/faq" class="header-top__link"[^>]*data-nav="faq"[^>]*>FAQs<\/a>/g,
    /\s*<a href="faq\.html" class="header-top__link"[^>]*data-nav="faq"[^>]*>FAQs<\/a>/g,
    /\s*<a href="\/faq" class="header-top__menu-link[^>]*data-nav="faq"[^>]*>FAQs<\/a>/g,
    /\s*<a href="faq\.html" class="header-top__menu-link[^>]*data-nav="faq"[^>]*>FAQs<\/a>/g,
  ];
  const headerArticlesDesktop =
    /\s*<a href="\/articles" class="header-top__link" data-nav="articles">Articles<\/a>\r?\n?/g;
  const headerArticlesMobile =
    /\s*<a href="\/articles" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" data-nav="articles">Articles<\/a>\r?\n?/g;

  collectSiteHtmlFiles().forEach((filePath) => {
    if (filePath.includes(`${path.sep}admin${path.sep}`)) return;

    let html = fs.readFileSync(filePath, "utf8");
    let changed = false;

    headerFaqPatterns.forEach((pattern) => {
      if (pattern.test(html)) {
        html = html.replace(pattern, "");
        changed = true;
      }
    });

    if (headerArticlesDesktop.test(html) || headerArticlesMobile.test(html)) {
      html = html.replace(headerArticlesDesktop, "");
      html = html.replace(headerArticlesMobile, "");
      changed = true;
    }

    if (!html.includes("Browse all FAQs")) {
      const emptyFooterDiv =
        /\n(\s*)<div><\/div>\n(\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*<div class="mt-auto border-t)/;
      if (emptyFooterDiv.test(html)) {
        html = html.replace(emptyFooterDiv, `\n$1${FOOTER_FAQ_COLUMN.trim()}\n$2`);
        changed = true;
      }
    }

    if (!html.includes('href="/articles" class="footer-link')) {
      const footerArticlesPattern =
        /(<li><a href="\/about" class="footer-link hover:text-white">About Us<\/a><\/li>\s*)(<li><a href="\/contact" class="footer-link hover:text-white">Contact<\/a><\/li>)/;
      if (footerArticlesPattern.test(html)) {
        html = html.replace(
          footerArticlesPattern,
          '$1<li><a href="/articles" class="footer-link hover:text-white">Articles</a></li>\n                $2'
        );
        changed = true;
      }
    }

    if (changed) fs.writeFileSync(filePath, html, "utf8");
  });
}

function main() {
  const articles = loadArticles();
  const categories = [...new Set(articles.map((a) => a.category).filter(Boolean))].sort();
  const totalPages = Math.max(1, Math.ceil(articles.length / ARTICLES_PER_PAGE));

  fs.mkdirSync(OUT_EF, { recursive: true });
  fs.mkdirSync(OUT_BTB, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  fs.writeFileSync(
    path.join(DATA_DIR, "articles.json"),
    JSON.stringify({ articles: articles.map(({ bodyHtml, blocks, ...rest }) => rest), total: articles.length, perPage: ARTICLES_PER_PAGE }, null, 0)
  );

  for (let page = 1; page <= totalPages; page++) {
    const { fileName, html } = buildHubPage(articles, page, totalPages, categories);
    fs.writeFileSync(path.join(ROOT, fileName), html, "utf8");
    console.log(`Wrote ${fileName}`);
  }

  articles.forEach((article) => {
    const html =
      article.type === "everyday-faith"
        ? buildEverydayFaithPage(article, articles)
        : buildBackToBiblePage(article, articles);
    const outDir = article.type === "everyday-faith" ? OUT_EF : OUT_BTB;
    const outFile = path.join(outDir, `${article.slug}.html`);
    fs.writeFileSync(outFile, html, "utf8");
    console.log(`Wrote articles/${article.type}/${article.slug}.html`);
  });

  updateSitemap(articles, getFaqTotalPages());
  syncSiteNav();

  console.log(`Built ${articles.length} articles across ${totalPages} hub page(s).`);
}

main();
