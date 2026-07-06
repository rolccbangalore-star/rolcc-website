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
  renderArticleTagsHtml,
  renderArticleCardTag,
  normalizeArticleTags,
  normalizeQuizItem,
  renderSummaryBox,
  renderKeyTakeaways,
  selectRelatedArticles,
} = require("./article-config");
const { parseCsv } = require("./csv-parse");
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
            ? (data.quiz || []).map((item) => normalizeQuizItem(item))
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
        tags: normalizeArticleTags(data),
        category: normalizeArticleTags(data)[0] || data.category || "Bible Study",
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
            ? (data.quiz || []).map((item) => normalizeQuizItem(item))
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

function renderArticleCardMeta(article) {
  if (!article.readTime) return "";
  return `${article.readTime} min read`;
}

function renderArticleCard(article, options = {}) {
  const href = articleUrl(article);
  const badgeHtml = options.latest
    ? '<span class="articles-card__badge articles-card__badge--latest">Latest</span>'
    : "";

  return `<a href="${href}" class="articles-card articles-card--tall" data-article-type="${escapeHtml(article.type)}" data-article-category="${escapeHtml(article.category || "")}">
    <div class="articles-card__media-wrap">
      <img class="articles-card__media" src="${escapeHtml(article.thumbnail)}" alt="" loading="lazy" width="640" height="800" />
      ${badgeHtml}
    </div>
    <div class="articles-card__body">
      <div class="articles-card__tags">
        ${renderArticleCardTag(article)}
      </div>
      <h2 class="articles-card__title">${escapeHtml(article.title)}</h2>
      <p class="articles-card__meta">${renderArticleCardMeta(article)}</p>
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

function renderFilterChips() {
  return `<div class="articles-chips mt-6" role="toolbar" aria-label="Filter articles" data-articles-chips>
    <button type="button" class="articles-chip is-active" data-articles-filter="all">All</button>
    <button type="button" class="articles-chip" data-articles-filter="everyday-faith">Sermon</button>
    <button type="button" class="articles-chip" data-articles-filter="back-to-bible">Bible Study</button>
  </div>`;
}

function buildPageShell({ title, description, canonical, ogType, ogImage, headExtra, bodyMain, assetRoot, scripts, hubPage, siteFooter }) {
  const footer = hubPage || siteFooter ? readHubFooterTemplate() : readFooterTemplate();
  return `${readHeaderNavTemplate(assetRoot)
    .replaceAll("{{TITLE}}", escapeHtml(title))
    .replaceAll("{{DESCRIPTION}}", escapeHtml(description))
    .replaceAll("{{OG_TYPE}}", ogType || "website")
    .replaceAll("{{CANONICAL}}", canonical)
    .replaceAll("{{OG_IMAGE}}", ogImage || `${SITE_ORIGIN}/images/og-image.jpg`)
    .replace("{{HEAD_EXTRA}}", headExtra)}
    <main class="main-no-top-gap relative z-10">${bodyMain}</main>
${footer}
    <script src="${assetRoot}js/main.js"></script>
    ${scripts || ""}
  </body>
</html>`;
}

function buildHubPage(articles, faqs) {
  const featuredArticle = pickFeaturedArticle(articles);
  const featuredSlug = featuredArticle ? `${featuredArticle.type}/${featuredArticle.slug}` : "";
  const listArticles = featuredArticle
    ? articles.filter((a) => `${a.type}/${a.slug}` !== featuredSlug)
    : articles;
  const latestSlug = articles[0] ? `${articles[0].type}/${articles[0].slug}` : "";
  const canonical = `${SITE_ORIGIN}/articles`;
  const title = "Articles & Bible Studies | River of Life Christian Church, Bangalore";
  const description =
    "Everyday Faith sermon summaries and Back to the Bible cell fellowship studies from River of Life Christian Church in Bangalore.";

  const headExtra = `<link rel="stylesheet" href="/css/articles.css" />
    <link rel="stylesheet" href="/css/faq.css" />
    <link rel="canonical" href="${canonical}" />`;

  const initialCards = listArticles.slice(0, ARTICLES_PER_PAGE).map((article, index) => {
    const isLatest = `${article.type}/${article.slug}` === latestSlug && latestSlug !== featuredSlug;
    return renderArticleCard(article, { latest: isLatest });
  });

  const bodyMain = `
      <div class="articles-hub-top">
      <section class="articles-hero relative overflow-hidden">
        <div class="relative z-10 mx-auto max-w-6xl px-4 pt-6 pb-8 sm:px-6 sm:pt-24 sm:pb-10 md:pt-28 md:pb-12 lg:px-8 lg:pt-32 lg:pb-14">
          <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Articles &amp; Studies</p>
          <h1 class="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">Faith for everyday life and deeper Bible study</h1>
          <p class="mt-5 max-w-2xl text-sm text-slate-600 sm:text-base leading-relaxed">Read sermon reflections and Bible study guides written for everyday life and cell fellowship.</p>
          ${renderFilterChips()}
        </div>
      </section>

      ${
        featuredArticle
          ? `<section class="articles-featured-wrap" aria-label="Featured article">
        <div class="relative z-10 mx-auto max-w-6xl px-4 pb-10 sm:px-6 sm:pb-12 lg:px-8">
          <h2 class="text-lg font-semibold text-slate-900">Featured</h2>
          <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${renderArticleCard(featuredArticle)}</div>
        </div>
      </section>`
          : ""
      }
      </div>

      <section class="articles-list-section border-b border-slate-200 bg-slate-50" aria-label="All articles">
        <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <div class="articles-toolbar">
            <h2 class="text-lg font-semibold text-slate-900">All articles</h2>
            <div class="articles-toolbar__controls">
              <label class="articles-sort">
                <span class="articles-sort__label">Sort by</span>
                <select class="articles-sort__select" data-articles-sort aria-label="Sort articles">
                  <option value="newest" selected>Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="title">Title A–Z</option>
                </select>
              </label>
            </div>
          </div>
          <p class="articles-results-meta mt-2 text-sm text-slate-500" data-articles-results-meta></p>
          <div class="mt-6" data-articles-grid>
            <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${initialCards.join("")}</div>
          </div>
          <p class="articles-empty hidden mt-8 text-center text-sm text-slate-500" data-articles-empty>No articles match this filter.</p>
          <div class="mt-10" data-articles-pagination-wrap hidden></div>
        </div>
      </section>

      ${renderHubCtaBanner()}
      ${renderHubFaqSection(faqs)}
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
  })}</script>
    <script src="/js/articles/hub.js"></script>
    <script src="/js/faq/accordion.js"></script>`;

  return {
    fileName: "articles.html",
    html: buildPageShell({
      title,
      description,
      canonical,
      headExtra,
      bodyMain,
      assetRoot: "/",
      scripts,
      hubPage: true,
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
      <div class="article-detail-page">
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
        ${renderRelated(allArticles, article)}
        <p class="mt-10"><a href="/articles" class="text-sm font-medium text-accent hover:underline">← Back to all articles</a></p>
      </article>
      </div>
      <div class="serve-unveil-spacer min-h-screen" aria-hidden="true"></div>`;

  const scripts = `<script src="/js/articles/clap.js"></script>${renderQuizScripts(article)}`;
  return buildPageShell({ title, description: article.description, canonical, ogType: "article", ogImage: article.thumbnail.startsWith("http") ? article.thumbnail : `${SITE_ORIGIN}${article.thumbnail}`, headExtra, bodyMain, assetRoot, scripts, siteFooter: true });
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
      <div class="article-detail-page">
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
        ${renderRelated(allArticles, article)}
        <p class="mt-10"><a href="/articles" class="text-sm font-medium text-accent hover:underline">← Back to all articles</a></p>
      </article>
      </div>
      <div class="serve-unveil-spacer min-h-screen" aria-hidden="true"></div>`;

  const scripts = `<script src="/js/articles/clap.js"></script>${renderQuizScripts(article)}`;
  return buildPageShell({ title, description: article.description, canonical, ogType: "article", ogImage: article.thumbnail.startsWith("http") ? article.thumbnail : `${SITE_ORIGIN}${article.thumbnail}`, headExtra, bodyMain, assetRoot: "/", scripts, siteFooter: true });
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
  const faqs = loadApprovedFaqs();

  fs.mkdirSync(OUT_EF, { recursive: true });
  fs.mkdirSync(OUT_BTB, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  fs.writeFileSync(
    path.join(DATA_DIR, "articles.json"),
    JSON.stringify({ articles: articles.map(({ bodyHtml, blocks, ...rest }) => rest), total: articles.length, perPage: ARTICLES_PER_PAGE }, null, 0)
  );

  const { fileName, html } = buildHubPage(articles, faqs);
  fs.writeFileSync(path.join(ROOT, fileName), html, "utf8");
  console.log(`Wrote ${fileName}`);

  fs.readdirSync(ROOT)
    .filter((name) => /^articles-\d+\.html$/.test(name))
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

  updateSitemap(articles, getFaqTotalPages());
  syncSiteNav();

  console.log(`Built ${articles.length} articles.`);
}

main();
