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
  renderArticleStatsBar,
  renderArticleEyebrow,
  renderArticleMetaBar,
  renderArticleHeroHeader,
  renderArticleTagsHtml,
  renderArticleCardTag,
  normalizeArticleTags,
  normalizeQuizItem,
  shuffleQuizItem,
  hashSeed,
  renderSummaryBox,
  renderKeyTakeaways,
  selectRelatedArticles,
  articleImageAlt,
  collectFaqItemsFromBlocks,
} = require("./article-config");
const { parseCsv } = require("./csv-parse");
const { writeSitemap } = require("./build-sitemap");
const {
  isApprovedFaq,
  confidenceScore,
  assignTopic,
  selectRelatedFaqs,
  getPageFaqMeta,
  sortFaqsForDisplay,
  faqNumber,
  formatAnswerHtml,
  FAQ_CHIP_TOPICS,
} = require("./faq-config");
const { renderSiteSortMenu, ARTICLES_SORT_OPTIONS } = require("./sort-menu-template");
const { renderBibleStudyBodyHtml, normalizePassageReading, renderPassageReadingAccordion, sanitizeStudyHeading } = require("./bible-study-sections");
const { getMegaMenuPanelHtml, getHamburgerButtonHtml } = require("./mega-menu-template");

function loadApprovedFaqs() {
  const csvPath = path.join(DATA_DIR, "faqs-source-v2.csv");
  if (!fs.existsSync(csvPath)) return [];
  const records = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const faqs = records
    .filter(isApprovedFaq)
    .map((record) => {
      const faq = {
        id: record.ID.trim(),
        question: (record.Question || "").trim(),
        answer: (record.Answer || "").trim(),
        category: (record.Category || "General").trim(),
        scripture: (record.Scripture || "").trim(),
        priority: confidenceScore(record),
        sortOrder: faqNumber(record.ID),
        slug: record.ID.trim().toLowerCase(),
      };
      faq.topic = assignTopic(faq);
      faq.topicLabel = FAQ_CHIP_TOPICS.find((chip) => chip.id === faq.topic)?.label || faq.topic;
      return faq;
    })
    .filter((faq) => faq.question && faq.answer);

  return sortFaqsForDisplay(faqs).map((faq, index) => ({
    ...faq,
    sortOrder: index + 1,
  }));
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

function renderHubFaqSection(faqs) {
  const related = selectRelatedFaqs(faqs, "articles");
  if (!related.length) return "";
  const meta = getPageFaqMeta("articles");
  const accordion = `<div class="faq-accordion" data-faq-accordion>${related
    .map((faq) => renderFaqAccordionItem(faq, "articles-"))
    .join("\n")}</div>`;

  return `      <section class="related-faqs border-b border-slate-200 bg-slate-50" aria-labelledby="related-faqs-heading-articles">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-16 lg:px-8">
          <div class="scroll-reveal max-w-2xl">
            <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Questions &amp; Answers</p>
            <h2 id="related-faqs-heading-articles" class="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">${escapeHtml(meta.heading)}</h2>
            <p class="mt-3 text-sm text-slate-600 sm:text-base">${escapeHtml(meta.description)}</p>
          </div>
          <div class="mt-8 scroll-reveal scroll-reveal--delay-1">${accordion}</div>
          <div class="mt-8 scroll-reveal scroll-reveal--delay-2">
            <a href="/faq" class="inline-flex items-center rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-accent/70 transition hover:bg-accentSoft">View All FAQs</a>
          </div>
        </div>
      </section>`;
}

function renderHubCtaBanner() {
  return `      <section class="border-b border-slate-200 bg-white">
        <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 md:py-14 lg:px-8">
          <div class="cta-gradient rounded-3xl scroll-reveal" id="cta-gradient">
            <div class="cta-gradient__bg rounded-3xl"></div>
            <div class="cta-gradient__overlay rounded-3xl"></div>
            <div class="relative z-10 px-6 py-10 sm:px-10 sm:py-12 text-center">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Go deeper together</p>
              <h2 class="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl text-balance">Study God's Word in community</h2>
              <p class="mx-auto mt-3 max-w-lg text-sm text-white/75">Join a cell fellowship, ask a question, or plan a visit — we would love to walk with you.</p>
              <div class="mt-6 flex flex-wrap justify-center gap-3">
                <a href="/fellowship" class="inline-flex items-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white/90">Explore Fellowship</a>
                <a href="/contact" class="inline-flex items-center rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/50">Contact Us</a>
              </div>
            </div>
          </div>
        </div>
      </section>`;
}

function pickFeaturedArticle(articles) {
  const featured = articles.filter((a) => a.featured).sort((a, b) => b.date.localeCompare(a.date));
  if (featured.length) return featured[0];
  return articles[0] || null;
}

function normalizeArticleQuiz(slug, quiz) {
  return (quiz || []).map((item) => {
    const normalized = normalizeQuizItem(item);
    return shuffleQuizItem(normalized, hashSeed(String(slug || "") + "|" + normalized.question));
  });
}

function readHubFooterTemplate() {
  const contactPath = path.join(ROOT, "contact.html");
  if (!fs.existsSync(contactPath)) return readFooterTemplate();
  const contactHtml = fs.readFileSync(contactPath, "utf8");
  const footerMatch = contactHtml.match(
    /<!-- Footer: fixed at bottom[\s\S]*?<\/footer>\s*<!-- Scroll to Top Button -->[\s\S]*?<\/button>/
  );
  if (!footerMatch) return readFooterTemplate();
  return `\n    ${footerMatch[0].trim()}\n`;
}

const ROOT = path.join(__dirname, "..");
const TODAY = new Date().toISOString().slice(0, 10);
const ASSET_CACHE_VERSION = "bible-study-format-v3";
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
        tags: normalizeArticleTags(data),
        category: normalizeArticleTags(data)[0] || data.category || "General",
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
            ? normalizeArticleQuiz(slug, data.quiz)
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
        normalizePassageReading(data).text,
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
        tags: normalizeArticleTags(data),
        category: normalizeArticleTags(data)[0] || data.category || "Bible Study",
        date: data.date || TODAY,
        dateFormatted: formatDate(data.date || TODAY),
        thumbnail: data.thumbnail || DEFAULT_THUMBNAIL,
        featured: data.featured === true,
        passage: data.passage || "",
        passageReading: normalizePassageReading(data),
        sections: data.sections || [],
        discussionQuestions: (data.discussionQuestions || []).map((q) =>
          typeof q === "string" ? q : q.question || ""
        ).filter(Boolean),
        activities: data.activities || [],
        includeQuiz: data.includeQuiz === true,
        quiz:
          data.includeQuiz === true
            ? normalizeArticleQuiz(slug, data.quiz)
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

function hubHref(basePath, pageNum) {
  return pageNum === 1 ? basePath : `${basePath}/${pageNum}`;
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
    <meta property="og:site_name" content="River of Life Christian Church" />
    <meta property="og:locale" content="en_IN" />
    {{ARTICLE_META}}
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
        ${getHamburgerButtonHtml()}
      </nav>
${getMegaMenuPanelHtml()}
    </header>`;
}

function readFooterTemplate() {
  return readHubFooterTemplate();
}

function renderArticleCardMeta(article, options = {}) {
  const parts = [];
  if (!options.related) {
    if (article.type === "everyday-faith" && article.author) {
      parts.push(escapeHtml(article.author));
    } else if (article.type === "back-to-bible") {
      const ref = (article.passage || article.scripture || "").trim();
      if (ref) parts.push(escapeHtml(ref));
    }
  }
  if (article.readTime) parts.push(`${article.readTime} min read`);
  return parts.join(" · ");
}

function renderArticleCard(article, options = {}) {
  const href = articleUrl(article);
  const badgeHtml = options.featured
    ? '<span class="articles-card__badge articles-card__badge--featured">Featured</span>'
    : options.latest
      ? '<span class="articles-card__badge articles-card__badge--latest">Latest</span>'
      : "";

  return `<a href="${href}" class="articles-card articles-card--tall" data-article-type="${escapeHtml(article.type)}" data-article-category="${escapeHtml(article.category || "")}">
    <div class="articles-card__media-wrap">
      <img class="articles-card__media" src="${escapeHtml(article.thumbnail)}" alt="${escapeHtml(articleImageAlt(article))}" loading="lazy" width="640" height="800" />
      ${badgeHtml}
    </div>
    <div class="articles-card__body">
      <div class="articles-card__tags">
        ${renderArticleCardTag(article)}
      </div>
      <h2 class="articles-card__title">${escapeHtml(article.title)}</h2>
      <p class="articles-card__meta">${renderArticleCardMeta(article, options)}</p>
    </div>
  </a>`;
}

function renderPagination(pageNum, totalPages, basePath) {
  if (totalPages <= 1) return "";
  const mkLink = (num, label, current) => {
    const href = hubHref(basePath, num);
    if (num === current) return `<span class="articles-pagination__page is-current" aria-current="page">${label}</span>`;
    return `<a class="articles-pagination__page" href="${href}">${label}</a>`;
  };
  let pages = "";
  for (let i = 1; i <= totalPages; i++) pages += mkLink(i, String(i), pageNum);
  const prev =
    pageNum > 1
      ? `<a class="articles-pagination__nav" href="${hubHref(basePath, pageNum - 1)}" rel="prev">Previous</a>`
      : `<span class="articles-pagination__nav is-disabled">Previous</span>`;
  const next =
    pageNum < totalPages
      ? `<a class="articles-pagination__nav" href="${hubHref(basePath, pageNum + 1)}" rel="next">Next</a>`
      : `<span class="articles-pagination__nav is-disabled">Next</span>`;
  return `<nav class="articles-pagination" aria-label="Articles pages">${prev}<div class="flex flex-wrap gap-1">${pages}</div>${next}</nav>`;
}

function renderFilterChips(options = {}) {
  const chipsClass = options.toolbar ? "articles-chips articles-chips--toolbar" : "articles-chips mt-6";
  return `<div class="${chipsClass}" role="toolbar" aria-label="Filter articles" data-articles-chips>
    <button type="button" class="articles-chip is-active" data-articles-filter="all">All</button>
    <button type="button" class="articles-chip" data-articles-filter="everyday-faith">Sermon</button>
    <button type="button" class="articles-chip" data-articles-filter="back-to-bible">Bible Study</button>
  </div>`;
}

function renderHubToolbar(options = {}) {
  const showFilters = options.showFilters !== false;
  const filters = showFilters ? renderFilterChips({ toolbar: true }) : "";
  const rowClass = showFilters ? "articles-toolbar__row" : "articles-toolbar__row articles-toolbar__row--sort-only";
  return `<div class="articles-toolbar">
    <div class="${rowClass}">
      ${filters}
      ${renderSiteSortMenu({
        dataPrefix: "articles",
        ariaLabel: "Sort articles",
        options: ARTICLES_SORT_OPTIONS,
        defaultValue: "newest",
      })}
      <p class="articles-results-meta hidden sm:block text-sm text-slate-500" data-articles-results-meta></p>
    </div>
  </div>`;
}

function hubLatestSlug(articles, featuredSlug) {
  const candidate = articles.find((a) => `${a.type}/${a.slug}` !== featuredSlug);
  return candidate ? `${candidate.type}/${candidate.slug}` : "";
}

function hubCardOptions(article, featuredSlug, latestSlug) {
  const key = `${article.type}/${article.slug}`;
  return {
    featured: Boolean(featuredSlug && key === featuredSlug),
    latest: Boolean(latestSlug && key === latestSlug && key !== featuredSlug),
  };
}

const BLOG_SECTION_PAGES = {
  "index.html": {
    slug: "index",
    eyebrow: "Articles",
    title: "Faith for everyday life",
    description: "Sermon reflections written for real life — featured picks and the latest reads.",
    articleType: "everyday-faith",
    hubUrl: "/articles",
    ctaLabel: "View All Articles",
    limit: 4,
    gridClass: "grid gap-6 sm:grid-cols-2 lg:grid-cols-4",
  },
  "fellowship.html": {
    slug: "fellowship",
    eyebrow: "Bible Study",
    title: "Grow together in the Word",
    description: "Bible studies chosen for cell fellowship and walking with Jesus in community.",
    articleType: "back-to-bible",
    hubUrl: "/bible-study",
    ctaLabel: "View All Bible Studies",
    limit: 3,
    gridClass: "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
  },
  "pmd.html": {
    slug: "pmd",
    eyebrow: "Articles",
    title: "Calling, work, and ministry",
    description: "Articles on purpose, leadership, and serving with your gifts — matched to PMD themes.",
    articleType: "everyday-faith",
    hubUrl: "/articles",
    ctaLabel: "View All Articles",
    limit: 3,
    gridClass: "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
  },
  "counselling.html": {
    slug: "counselling",
    eyebrow: "Articles",
    title: "Hope for hard seasons",
    description: "Reads on stress, grief, and finding rest in God — selected for pastoral care and support.",
    articleType: "everyday-faith",
    hubUrl: "/articles",
    ctaLabel: "View All Articles",
    limit: 3,
    gridClass: "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
  },
};

/** Maps ministry pages to article content tags (from admin article-tags). */
const BLOG_PAGE_TAG_RELEVANCE = {
  fellowship: {
    primaryTags: ["Cell Fellowship", "Bible Study"],
    tags: [
      "Cell Fellowship",
      "Bible Study",
      "Community",
      "Discipleship",
      "Prayer",
      "Faith",
      "Everyday Life",
      "Holy Spirit",
    ],
    types: ["back-to-bible"],
  },
  pmd: {
    primaryTags: ["PMD", "Calling", "Work & Calling"],
    tags: [
      "PMD",
      "Calling",
      "Work & Calling",
      "Work",
      "Leadership",
      "Ministry",
      "Mentorship",
      "Stewardship",
      "Finance & Budget",
    ],
  },
  counselling: {
    primaryTags: ["Counselling", "Anxiety & Stress"],
    tags: [
      "Counselling",
      "Anxiety & Stress",
      "Grief",
      "Grief & Care",
      "Care",
      "Faith & Peace",
      "Peace",
      "Healing",
      "Healing & Hope",
      "Hope",
      "Family",
      "Prayer",
    ],
  },
};

function scoreArticleForPage(article, pageSlug) {
  if (pageSlug === "index") return 1;

  const relevance = BLOG_PAGE_TAG_RELEVANCE[pageSlug];
  if (!relevance) return 0;

  const tags = normalizeArticleTags(article);
  let score = 0;

  relevance.primaryTags.forEach((tag) => {
    if (tags.includes(tag)) score += 20;
  });

  relevance.tags.forEach((tag) => {
    if (tags.includes(tag) && !relevance.primaryTags.includes(tag)) score += 8;
  });

  if (relevance.types && relevance.types.includes(article.type)) {
    score += 6;
  }

  return score;
}

function rankArticlesForPage(articles, pageSlug) {
  if (pageSlug === "index") {
    const featuredArticle = pickFeaturedArticle(articles);
    const featuredSlug = featuredArticle ? `${featuredArticle.type}/${featuredArticle.slug}` : "";
    return sortHubArticles(articles.slice(), "newest", featuredSlug);
  }

  return articles
    .map((article) => ({ article, score: scoreArticleForPage(article, pageSlug) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.article.date || "").localeCompare(String(a.article.date || ""));
    })
    .map(({ article }) => article);
}

function pickFeaturedFromPool(pool, pageSlug) {
  if (pageSlug !== "index") {
    for (const article of pool) {
      if (article.featured) return article;
    }
    return pool[0] || null;
  }

  const featured = pool
    .filter((article) => article.featured)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  if (featured.length) return featured[0];
  return pool[0] || null;
}

function selectBlogShowcaseArticles(articles, pageConfig) {
  const limit = pageConfig.limit;
  const pageSlug = pageConfig.slug;
  const scoped = pageConfig.articleType
    ? articles.filter((article) => article.type === pageConfig.articleType)
    : articles;
  const pool = rankArticlesForPage(scoped, pageSlug);
  if (!pool.length) return [];

  const featuredArticle = pickFeaturedFromPool(pool, pageSlug);
  const featuredSlug = featuredArticle ? `${featuredArticle.type}/${featuredArticle.slug}` : "";
  const latestSlug = hubLatestSlug(pool, featuredSlug);
  const cards = [];

  if (featuredArticle) {
    cards.push({
      article: featuredArticle,
      ...hubCardOptions(featuredArticle, featuredSlug, latestSlug),
    });
  }

  for (const article of pool) {
    if (cards.length >= limit) break;
    const key = `${article.type}/${article.slug}`;
    if (key === featuredSlug) continue;
    cards.push({
      article,
      ...hubCardOptions(article, featuredSlug, latestSlug),
    });
  }

  return cards;
}

function renderBlogSection(articles, pageConfig) {
  const cards = selectBlogShowcaseArticles(articles, pageConfig);
  if (!cards.length) return "";

  const cardHtml = cards
    .map(({ article, featured, latest }) => renderArticleCard(article, { featured, latest }))
    .join("\n");

  return `      <!-- @blog-section:start -->
      <!-- Blog spotlight (auto-generated) -->
      <section id="articles-spotlight" class="home-blog border-b border-slate-200 bg-white" aria-labelledby="home-blog-heading-${pageConfig.slug}">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-16 lg:px-8">
          <div class="scroll-reveal max-w-2xl">
            <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">${escapeHtml(pageConfig.eyebrow)}</p>
            <h2 id="home-blog-heading-${pageConfig.slug}" class="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">${escapeHtml(pageConfig.title)}</h2>
            <p class="mt-3 text-sm text-slate-600 sm:text-base">${escapeHtml(pageConfig.description)}</p>
          </div>
          <div class="mt-8 scroll-reveal scroll-reveal--delay-1">
            <div class="${pageConfig.gridClass}">${cardHtml}</div>
          </div>
          <div class="mt-8 scroll-reveal scroll-reveal--delay-2">
            <a href="${pageConfig.hubUrl || "/articles"}" class="btn-outline inline-flex items-center rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-800 hover:border-accent hover:text-accentSoft">${escapeHtml(pageConfig.ctaLabel || "View All Articles")}</a>
          </div>
        </div>
      </section>
      <!-- @blog-section:end -->
`;
}

function replaceBlogSection(html, section) {
  const markerPattern = /<!-- @blog-section:start -->[\s\S]*?<!-- @blog-section:end -->\r?\n?/;
  if (markerPattern.test(html)) {
    return html.replace(markerPattern, section.trimEnd() + "\n");
  }

  const legacyPattern = /[ \t]*<!-- Blog spotlight \(auto-generated\) -->[\s\S]*?<section class="home-blog[\s\S]*?<\/section>\r?\n?/;
  if (legacyPattern.test(html)) {
    return html.replace(legacyPattern, section);
  }

  const faqMarker = "      <!-- Related FAQs (auto-generated) -->";
  if (html.includes(faqMarker)) {
    return html.replace(faqMarker, `${section}${faqMarker}`);
  }

  return html;
}

function verifyBlogSections() {
  Object.keys(BLOG_SECTION_PAGES).forEach((fileName) => {
    const filePath = path.join(ROOT, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Blog spotlight missing: ${fileName} not found after build`);
    }

    const html = fs.readFileSync(filePath, "utf8");
    if (!html.includes("home-blog") || !html.includes("<!-- @blog-section:end -->")) {
      throw new Error(`Blog spotlight was not injected into ${fileName}`);
    }
  });
}

function injectBlogSections(articles) {
  Object.entries(BLOG_SECTION_PAGES).forEach(([fileName, pageConfig]) => {
    const filePath = path.join(ROOT, fileName);
    if (!fs.existsSync(filePath)) return;

    let html = fs.readFileSync(filePath, "utf8");
    const section = renderBlogSection(articles, pageConfig);
    if (!section) {
      throw new Error(`Blog spotlight has no articles to show for ${fileName}`);
    }

    html = replaceBlogSection(html, section);

    if (!html.includes("css/articles.css")) {
      html = html.replace(
        'href="css/styles.css"',
        `href="css/styles.css" />\n    <link rel="stylesheet" href="css/articles.css?v=${ASSET_CACHE_VERSION}"`
      );
    }

    fs.writeFileSync(filePath, html, "utf8");
    console.log(`Injected blog spotlight into ${fileName}`);
  });

  verifyBlogSections();
}

function sortHubArticles(articles, sort, featuredSlug) {
  const sorted = articles.slice();
  if (sort === "oldest") {
    sorted.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  } else if (sort === "title") {
    sorted.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  } else {
    sorted.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }
  if (!featuredSlug) return sorted;
  const featuredIndex = sorted.findIndex((a) => `${a.type}/${a.slug}` === featuredSlug);
  if (featuredIndex > 0) {
    const [featured] = sorted.splice(featuredIndex, 1);
    sorted.unshift(featured);
  }
  return sorted;
}

function buildPageShell({ title, description, canonical, ogType, ogImage, headExtra, bodyMain, assetRoot, scripts, hubPage, siteFooter, articleMeta }) {
  const footer = hubPage || siteFooter ? readHubFooterTemplate() : readFooterTemplate();
  return `${readHeaderNavTemplate(assetRoot)
    .replaceAll("{{TITLE}}", escapeHtml(title))
    .replaceAll("{{DESCRIPTION}}", escapeHtml(description))
    .replaceAll("{{OG_TYPE}}", ogType || "website")
    .replaceAll("{{CANONICAL}}", canonical)
    .replaceAll("{{OG_IMAGE}}", ogImage || `${SITE_ORIGIN}/images/og-image.jpg`)
    .replace("{{ARTICLE_META}}", articleMeta || "")
    .replace("{{HEAD_EXTRA}}", headExtra)}
    <main class="main-no-top-gap relative z-10">${bodyMain}</main>
${footer}
    <script src="${assetRoot}js/main.js"></script>
    ${scripts || ""}
  </body>
</html>`;
}

const HUB_PAGE_CONFIGS = [
  {
    fileName: "articles.html",
    basePath: "/articles",
    articleType: "everyday-faith",
    breadcrumbName: "Articles",
    collectionName: "Articles",
    eyebrow: "Articles",
    h1: "Sermon reflections for everyday life",
    heroDescription:
      "Read sermon summaries and practical faith articles from River of Life Christian Church in Bangalore.",
    title: "Articles & Sermon Summaries | River of Life Christian Church, Bangalore",
    description:
      "Everyday Faith sermon summaries and practical reads from River of Life Christian Church in Bangalore.",
    ariaLabel: "Articles",
    itemLabel: "articles",
    showFilters: false,
  },
  {
    fileName: "bible-study.html",
    basePath: "/bible-study",
    articleType: "back-to-bible",
    breadcrumbName: "Bible Study",
    collectionName: "Bible Study",
    eyebrow: "Bible Study",
    h1: "Back to the Bible for cell fellowship",
    heroDescription:
      "Guided Bible study outlines with discussion questions for small groups and personal study.",
    title: "Bible Study Guides | River of Life Christian Church, Bangalore",
    description:
      "Back to the Bible cell fellowship studies from River of Life Christian Church in Bangalore.",
    ariaLabel: "Bible studies",
    itemLabel: "studies",
    showFilters: false,
  },
];

function buildHubPage(allArticles, faqs, hubConfig) {
  const articles = allArticles.filter((article) => article.type === hubConfig.articleType);
  const featuredArticle = pickFeaturedArticle(articles);
  const featuredSlug = featuredArticle ? `${featuredArticle.type}/${featuredArticle.slug}` : "";
  const latestSlug = hubLatestSlug(articles, featuredSlug);
  const canonical = `${SITE_ORIGIN}${hubConfig.basePath}`;

  const hubFaqs = selectRelatedFaqs(faqs, "articles");
  const hubSchemaScripts = [
    renderHubCollectionSchema(articles, canonical, hubConfig.collectionName, hubConfig.description),
    hubFaqs.length ? renderFaqPageSchema(hubFaqs, canonical) : "",
    renderHubBreadcrumbSchema(hubConfig),
  ]
    .filter(Boolean)
    .map((json) => `<script type="application/ld+json">${json}</script>`)
    .join("\n    ");

  const headExtra = `<link rel="stylesheet" href="/css/articles.css?v=${ASSET_CACHE_VERSION}" />
    <link rel="stylesheet" href="/css/faq.css" />
    <link rel="canonical" href="${canonical}" />
    ${hubSchemaScripts}`;

  const initialCards = sortHubArticles(articles, "newest", featuredSlug)
    .slice(0, ARTICLES_PER_PAGE)
    .map((article) => renderArticleCard(article, hubCardOptions(article, featuredSlug, latestSlug)));

  const bodyMain = `
      <div class="articles-hub-page">
      <div class="articles-hub-top">
      <section class="articles-hero contact-hero relative">
        <div class="relative z-10 mx-auto max-w-6xl px-4 pt-6 pb-12 sm:px-6 sm:pt-24 sm:pb-16 md:pt-28 md:pb-20 lg:px-8 lg:pt-32 lg:pb-24">
          <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">${escapeHtml(hubConfig.eyebrow)}</p>
          <h1 class="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">${escapeHtml(hubConfig.h1)}</h1>
          <p class="mt-5 max-w-2xl text-sm text-slate-600 sm:text-base leading-relaxed">${escapeHtml(hubConfig.heroDescription)}</p>
        </div>
      </section>

      <section class="articles-list-section border-b border-slate-200" aria-label="${escapeHtml(hubConfig.ariaLabel)}">
        <div class="mx-auto max-w-6xl px-4 pb-10 sm:px-6 md:pb-14 lg:px-8">
          ${renderHubToolbar({ showFilters: hubConfig.showFilters })}
          <div class="mt-6" data-articles-grid>
            <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${initialCards.join("")}</div>
          </div>
          <p class="articles-empty hidden mt-8 text-center text-sm text-slate-500" data-articles-empty>No ${escapeHtml(hubConfig.itemLabel)} match this filter.</p>
          <div class="mt-10" data-articles-pagination-wrap hidden></div>
        </div>
      </section>

      </div>
      ${renderHubCtaBanner()}
      ${renderHubFaqSection(faqs)}
      </div>
      <div class="serve-unveil-spacer min-h-screen" aria-hidden="true"></div>`;

  const listPayload = articles.map((a) => ({
    type: a.type,
    typeLabel: a.typeLabel,
    slug: a.slug,
    title: a.title,
    description: a.description,
    summary: a.summary || a.description,
    category: a.category,
    tags: normalizeArticleTags(a),
    author: a.author,
    passage: a.passage || "",
    scripture: a.scripture || "",
    date: a.date,
    dateFormatted: a.dateFormatted,
    readTime: a.readTime,
    thumbnail: a.thumbnail,
    featured: a.featured === true,
  }));

  const scripts = `<script id="articles-data" type="application/json">${JSON.stringify({
    articles: listPayload,
    perPage: ARTICLES_PER_PAGE,
    featuredSlug,
    latestSlug,
    hubType: hubConfig.articleType,
    basePath: hubConfig.basePath,
    itemLabel: hubConfig.itemLabel,
  })}</script>
    <script src="/js/site-sort-menu.js?v=${ASSET_CACHE_VERSION}"></script>
    <script src="/js/articles/hub.js?v=${ASSET_CACHE_VERSION}"></script>
    <script src="/js/faq/accordion.js"></script>`;

  return {
    fileName: hubConfig.fileName,
    html: buildPageShell({
      title: hubConfig.title,
      description: hubConfig.description,
      canonical,
      headExtra,
      bodyMain,
      assetRoot: "/",
      scripts,
      hubPage: true,
    }),
  };
}

function schemaAuthor(authorName) {
  const name = String(authorName || "River of Life Christian Church").trim();
  if (/team|church|rolcc/i.test(name)) {
    return { "@type": "Organization", name };
  }
  return { "@type": "Person", name };
}

function articleWordCount(article) {
  const parts = [article.title, article.description, article.summary || ""];
  if (article.blocks?.length) parts.push(collectBlockText(article.blocks));
  if (article.keyTakeaways?.length) {
    article.keyTakeaways.forEach((k) => parts.push(typeof k === "string" ? k : k.item || ""));
  }
  if (article.sections?.length) {
    article.sections.forEach((s) => parts.push(`${s.heading} ${s.body}`));
  }
  return parts.join(" ").split(/\s+/).filter(Boolean).length;
}

function articleSchemaObject(article, canonical) {
  const image = article.thumbnail.startsWith("http") ? article.thumbnail : `${SITE_ORIGIN}${article.thumbnail}`;
  const keywords = normalizeArticleTags(article).join(", ");
  const schema = {
    "@type": article.type === "everyday-faith" ? "BlogPosting" : "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.date,
    author: schemaAuthor(article.author),
    image,
    url: canonical,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    wordCount: articleWordCount(article),
    publisher: {
      "@type": "Organization",
      name: "River of Life Christian Church",
      logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/images/og-image.jpg` },
    },
  };
  if (keywords) schema.keywords = keywords;
  if (article.category) schema.articleSection = article.category;
  if (article.scripture) schema.about = article.scripture;
  return schema;
}

function renderArticleBreadcrumbSchema(article, canonical) {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: "Articles", item: `${SITE_ORIGIN}/articles` },
        {
          "@type": "ListItem",
          position: 3,
          name: article.typeLabel,
          item: `${SITE_ORIGIN}/articles?type=${encodeURIComponent(article.type)}`,
        },
        { "@type": "ListItem", position: 4, name: article.title, item: canonical },
      ],
    },
    null,
    2
  );
}

function renderFaqPageSchema(faqItems, pageUrl) {
  if (!faqItems.length) return "";
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
      url: pageUrl,
    },
    null,
    2
  );
}

function renderHubCollectionSchema(articles, canonical, name, description) {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name,
      description,
      url: canonical,
      isPartOf: { "@type": "WebSite", name: "River of Life Christian Church", url: SITE_ORIGIN },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: articles.map((article, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: article.title,
          url: articleCanonical(article),
        })),
      },
    },
    null,
    2
  );
}

function renderHubBreadcrumbSchema(hubConfig) {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: hubConfig.breadcrumbName, item: `${SITE_ORIGIN}${hubConfig.basePath}` },
      ],
    },
    null,
    2
  );
}

function parseSchemaForGraph(json) {
  const obj = JSON.parse(json);
  delete obj["@context"];
  return obj;
}

function renderArticleJsonLd(article, canonical) {
  const graph = [
    articleSchemaObject(article, canonical),
    parseSchemaForGraph(renderArticleBreadcrumbSchema(article, canonical)),
  ];
  const faqItems = collectFaqItemsFromBlocks(article.blocks);
  if (faqItems.length) {
    graph.push(parseSchemaForGraph(renderFaqPageSchema(faqItems, canonical)));
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2);
}

function renderArticleHeadMeta(article) {
  if (!article.date) return "";
  return `<meta property="article:published_time" content="${escapeHtml(article.date)}" />
    <meta property="article:modified_time" content="${escapeHtml(article.date)}" />`;
}

function articleSchema(article, canonical) {
  return renderArticleJsonLd(article, canonical);
}

function validateArticlesSeo(articles) {
  const slugs = new Set();
  articles.forEach((article) => {
    const key = `${article.type}/${article.slug}`;
    if (!article.description?.trim()) {
      console.warn(`SEO warning: missing meta description for ${key}`);
    }
    if ((article.title || "").length > 65) {
      console.warn(`SEO warning: long title (${article.title.length} chars) for ${key}`);
    }
    if ((article.description || "").length > 165) {
      console.warn(`SEO warning: long meta description (${article.description.length} chars) for ${key}`);
    }
    if (slugs.has(key)) {
      console.warn(`SEO warning: duplicate slug ${key}`);
    }
    slugs.add(key);
    if (
      article.thumbnail?.startsWith("http") &&
      !article.thumbnail.includes("rolcc.in") &&
      !article.thumbnail.startsWith(SITE_ORIGIN)
    ) {
      console.warn(`SEO warning: external OG image for ${key}`);
    }
  });
}

function pruneStaleArticleHtml(articles) {
  const expected = new Set(articles.map((a) => `${a.type}/${a.slug}`));
  [
    [OUT_EF, "everyday-faith"],
    [OUT_BTB, "back-to-bible"],
  ].forEach(([dir, type]) => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir)
      .filter((name) => name.endsWith(".html"))
      .forEach((name) => {
        const slug = name.replace(/\.html$/, "");
        const key = `${type}/${slug}`;
        if (!expected.has(key)) {
          fs.unlinkSync(path.join(dir, name));
          console.log(`Removed stale articles/${key}.html`);
        }
      });
  });
}

function renderRelated(articles, current) {
  const related = selectRelatedArticles(articles, current);
  if (!related.length) return "";
  return `<section class="mt-14 border-t border-slate-200 pt-10" aria-labelledby="related-articles-heading">
    <h2 id="related-articles-heading" class="text-xl font-semibold text-slate-900">More to read</h2>
    <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${related.map((article) => renderArticleCard(article, { related: true })).join("")}</div>
  </section>`;
}

function renderClapScripts(article) {
  return `\n    <script id="article-clap-slug" type="application/json">${JSON.stringify(article.slug)}</script>\n    <script src="/js/articles/clap.js?v=${ASSET_CACHE_VERSION}"></script>`;
}

function renderQuizSection(article) {
  if (!article.includeQuiz || !article.quiz?.length) return "";
  return `<section class="article-section" id="article-quiz" aria-label="Study quiz">
      <h2 class="text-lg font-semibold text-slate-900">Quick quiz</h2>
      <p class="mt-2 text-sm text-slate-600">Test your understanding. Answers stay on this device only.</p>
      <div class="article-quiz mt-4" data-article-quiz>
        <p class="text-xs text-slate-500" data-quiz-progress></p>
        <p class="article-quiz__question mt-2" data-quiz-question></p>
        <div class="article-quiz__options" data-quiz-options></div>
        <div class="article-quiz__results" data-quiz-results hidden></div>
        <p class="article-quiz__feedback" data-quiz-feedback></p>
        <div class="article-quiz__actions">
          <button type="button" class="article-quiz__btn" data-quiz-next hidden>Next question</button>
          <button type="button" class="article-quiz__btn article-quiz__btn--ghost" data-quiz-reset hidden>Retake quiz</button>
        </div>
      </div>
    </section>`;
}

function renderQuizScripts(article) {
  if (!article.includeQuiz || !article.quiz?.length) return "";
  return `\n    <script id="article-quiz-data" type="application/json">${JSON.stringify(article.quiz)}</script>\n    <script src="/js/articles/quiz.js?v=20260712quiz1"></script>`;
}

function buildEverydayFaithPage(article, allArticles) {
  const canonical = articleCanonical(article);
  const assetRoot = "/";
  const title = `${article.title} | Everyday Faith | River of Life Christian Church`;
  const headExtra = `<link rel="stylesheet" href="/css/articles.css?v=${ASSET_CACHE_VERSION}" />
    <link rel="canonical" href="${canonical}" />
    <script type="application/ld+json">${articleSchema(article, canonical)}</script>`;

  const bodyMain = `
      <div class="article-detail-page">
      <article class="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <header class="article-header">
        ${renderArticleStatsBar(article)}
        ${renderArticleEyebrow(article)}
        <h1 class="article-header__title text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">${escapeHtml(article.title)}</h1>
        ${renderArticleHeroHeader(article)}
        </header>
        ${renderSummaryBox(article.summary)}
        <div class="article-prose mt-8">${article.bodyHtml}</div>
        ${renderKeyTakeaways(article.keyTakeaways)}
        ${renderQuizSection(article)}
        ${renderRelated(allArticles, article)}
        <p class="mt-10"><a href="/articles" class="text-sm font-medium text-accent hover:underline">← Back to articles</a></p>
      </article>
      </div>
      <div class="serve-unveil-spacer min-h-screen" aria-hidden="true"></div>`;

  const scripts = `${renderClapScripts(article)}${renderQuizScripts(article)}`;
  return buildPageShell({
    title,
    description: article.description,
    canonical,
    ogType: "article",
    ogImage: article.thumbnail.startsWith("http") ? article.thumbnail : `${SITE_ORIGIN}${article.thumbnail}`,
    headExtra,
    bodyMain,
    assetRoot,
    scripts,
    siteFooter: true,
    articleMeta: renderArticleHeadMeta(article),
  });
}

function buildBackToBiblePage(article, allArticles) {
  const canonical = articleCanonical(article);
  const title = `${article.title} | Back to the Bible | River of Life Christian Church`;
  const headExtra = `<link rel="stylesheet" href="/css/articles.css?v=${ASSET_CACHE_VERSION}" />
    <link rel="canonical" href="${canonical}" />
    <script type="application/ld+json">${articleSchema(article, canonical)}</script>`;

  const passageReadingHtml = renderPassageReadingAccordion(article.passageReading);

  const sectionsHtml = (article.sections || [])
    .map(
      (s) => `<section class="article-section bible-study-section">
      <h2 class="bible-study-section__heading text-lg font-semibold text-slate-900">${escapeHtml(sanitizeStudyHeading(s.heading))}</h2>
      <div class="bible-study-section__body mt-3 text-slate-700 leading-relaxed">${renderBibleStudyBodyHtml(s.body)}</div>
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
      <div class="article-detail-page">
      <article class="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">${escapeHtml(article.typeLabel)}</p>
        <h1 class="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">${escapeHtml(article.title)}</h1>
        <p class="mt-4 text-sm text-slate-500">${escapeHtml(article.dateFormatted)} · ${article.readTime} min read</p>
        ${article.passage ? `<p class="mt-2 text-sm font-medium text-slate-700">Passage: ${escapeHtml(article.passage)}</p>` : ""}
        <img class="mt-8 w-full rounded-2xl border border-slate-200" src="${escapeHtml(article.thumbnail)}" alt="${escapeHtml(articleImageAlt(article))}" width="960" height="540" loading="lazy" />
        ${passageReadingHtml}
        ${sectionsHtml}
        ${questionsHtml}
        ${activitiesHtml}
        ${quizHtml}
        ${renderRelated(allArticles, article)}
        <p class="mt-10"><a href="/bible-study" class="text-sm font-medium text-accent hover:underline">← Back to Bible studies</a></p>
      </article>
      </div>
      <div class="serve-unveil-spacer min-h-screen" aria-hidden="true"></div>`;

  const scripts = `${renderClapScripts(article)}${renderQuizScripts(article)}`;
  return buildPageShell({
    title,
    description: article.description,
    canonical,
    ogType: "article",
    ogImage: article.thumbnail.startsWith("http") ? article.thumbnail : `${SITE_ORIGIN}${article.thumbnail}`,
    headExtra,
    bodyMain,
    assetRoot: "/",
    scripts,
    siteFooter: true,
    articleMeta: renderArticleHeadMeta(article),
  });
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

const FOOTER_RESOURCES_COLUMN = `              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Resources</p>
                <ul class="mt-4 space-y-2.5 text-sm text-slate-300">
                  <li><a href="/faq" class="footer-link hover:text-white">FAQ</a></li>
                  <li><a href="/articles" class="footer-link hover:text-white">Articles</a></li>
                  <li><a href="/bible-study" class="footer-link hover:text-white">Bible Study</a></li>
                  <li><a href="/gallery" class="footer-link hover:text-white">Gallery</a></li>
                  <li><a href="/sermons" class="footer-link hover:text-white">Latest Sermon</a></li>
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

function syncFooterColumnOrder() {
  const wrongOrder =
    /(<div>\s*<p class="text-\[11px\] font-semibold uppercase tracking-\[0\.22em\] text-slate-400">Connect<\/p>\s*<div class="mt-4 flex flex-wrap gap-3">[\s\S]*?<\/div>\s*<\/div>)\s*(<div>\s*<p class="text-\[11px\] font-semibold uppercase tracking-\[0\.22em\] text-slate-400">Resources<\/p>\s*<ul class="mt-4 space-y-2\.5 text-sm text-slate-300">[\s\S]*?<\/ul>\s*<\/div>)/g;

  collectSiteHtmlFiles().forEach((filePath) => {
    if (filePath.includes(`${path.sep}admin${path.sep}`)) return;

    let html = fs.readFileSync(filePath, "utf8");
    if (!wrongOrder.test(html)) return;

    html = html.replace(wrongOrder, "$2\n$1");
    fs.writeFileSync(filePath, html, "utf8");
  });
}

function syncLegacyFooters() {
  const hubFooter = readHubFooterTemplate();
  if (!hubFooter) return;

  collectSiteHtmlFiles().forEach((filePath) => {
    if (filePath.includes(`${path.sep}admin${path.sep}`)) return;

    let html = fs.readFileSync(filePath, "utf8");
    if (!html.includes('footer-reveal relative z-10')) return;

    let changed = false;

    if (!html.includes("serve-unveil-spacer")) {
      const mainClosePattern = /<\/article>\s*<\/main>/;
      if (mainClosePattern.test(html)) {
        html = html.replace(
          mainClosePattern,
          '</article>\n      </div>\n      <div class="serve-unveil-spacer min-h-screen" aria-hidden="true"></div></main>'
        );
        changed = true;
      }
    }

    const legacyFooterPattern =
      /<footer id="footer-section" class="footer-reveal relative[\s\S]*?<\/footer>\s*(?:<!-- Scroll to Top Button -->[\s\S]*?<\/button>\s*)?/;
    if (legacyFooterPattern.test(html)) {
      html = html.replace(legacyFooterPattern, `${hubFooter.trim()}\n\n`);
      changed = true;
    }

    if (changed) fs.writeFileSync(filePath, html, "utf8");
  });
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

    if (!html.includes('href="/#latest-sermon" class="footer-link')) {
      const emptyFooterDiv =
        /\n(\s*)<div><\/div>\n(\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*<div class="mt-auto border-t)/;
      if (emptyFooterDiv.test(html)) {
        html = html.replace(emptyFooterDiv, `\n$1${FOOTER_RESOURCES_COLUMN.trim()}\n$2`);
        changed = true;
      }
    }

    if (html.includes('Help &amp; FAQs')) {
      html = html.replace(
        /<div>\s*<p class="text-\[11px\][^"]*">Help &amp; FAQs<\/p>\s*<ul class="mt-4 space-y-2\.5 text-sm text-slate-300">\s*<li><a href="\/faq" class="footer-link hover:text-white">Browse all FAQs<\/a><\/li>\s*<\/ul>\s*<\/div>/g,
        FOOTER_RESOURCES_COLUMN.trim()
      );
      changed = true;
    }

    if (html.includes('href="/articles" class="footer-link hover:text-white">Articles</a>') && !html.includes('href="/bible-study"')) {
      html = html.replace(
        /<li><a href="\/articles" class="footer-link hover:text-white">Articles<\/a><\/li>/,
        `<li><a href="/articles" class="footer-link hover:text-white">Articles</a></li>\n                  <li><a href="/bible-study" class="footer-link hover:text-white">Bible Study</a></li>`
      );
      changed = true;
    }

    const footerArticlesNavPattern =
      /(<li><a href="\/about" class="footer-link hover:text-white">About Us<\/a><\/li>\s*)<li><a href="\/articles" class="footer-link hover:text-white">Articles<\/a><\/li>\s*(<li><a href="\/contact" class="footer-link hover:text-white">Contact<\/a><\/li>)/;
    if (footerArticlesNavPattern.test(html)) {
      html = html.replace(footerArticlesNavPattern, "$1$2");
      changed = true;
    }

    if (html.replace(/footer-link hover:text-white">Main<\/a>/g, 'footer-link hover:text-white">Home</a>') !== html) {
      html = html.replace(/footer-link hover:text-white">Main<\/a>/g, 'footer-link hover:text-white">Home</a>');
      changed = true;
    }

    if (changed) fs.writeFileSync(filePath, html, "utf8");
  });

  syncFooterColumnOrder();
  syncLegacyFooters();
}

function main() {
  const articles = loadArticles();
  const faqs = loadApprovedFaqs();

  validateArticlesSeo(articles);

  fs.mkdirSync(OUT_EF, { recursive: true });
  fs.mkdirSync(OUT_BTB, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  fs.writeFileSync(
    path.join(DATA_DIR, "articles.json"),
    JSON.stringify({ articles: articles.map(({ bodyHtml, blocks, ...rest }) => rest), total: articles.length, perPage: ARTICLES_PER_PAGE }, null, 0)
  );

  HUB_PAGE_CONFIGS.forEach((hubConfig) => {
    const { fileName, html } = buildHubPage(articles, faqs, hubConfig);
    fs.writeFileSync(path.join(ROOT, fileName), html, "utf8");
    console.log(`Wrote ${fileName}`);

    if (fileName === "bible-study.html") {
      const hubDir = path.join(ROOT, "bible-study");
      fs.mkdirSync(hubDir, { recursive: true });
      fs.writeFileSync(path.join(hubDir, "index.html"), html, "utf8");
      console.log("Wrote bible-study/index.html");
    }
  });

  fs.readdirSync(ROOT)
    .filter((name) => /^(articles|bible-study)-\d+\.html$/.test(name))
    .forEach((name) => {
      fs.unlinkSync(path.join(ROOT, name));
      console.log(`Removed stale ${name}`);
    });

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

  pruneStaleArticleHtml(articles);
  writeSitemap({ articles, faqTotalPages: getFaqTotalPages(), today: TODAY });
  syncSiteNav();
  injectBlogSections(articles);

  console.log(`Built ${articles.length} articles.`);
}

main();
