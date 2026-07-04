const fs = require("fs");
const path = require("path");
const { parseCsv } = require("./csv-parse");
const {
  PER_PAGE,
  RELATED_COUNT,
  PAGE_CATEGORY_MAP,
  HTML_PAGE_SLUGS,
  faqNumber,
  isApprovedFaq,
  confidenceScore,
  escapeHtml,
  formatAnswerHtml,
} = require("./faq-config");

const ROOT = path.join(__dirname, "..");
const CSV_PATH = path.join(ROOT, "data", "faqs-source.csv");
const DATA_DIR = path.join(ROOT, "data");

function loadFaqs() {
  const csv = fs.readFileSync(CSV_PATH, "utf8");
  const records = parseCsv(csv);
  return records
    .filter(isApprovedFaq)
    .map((record, index) => ({
      id: record.ID.trim(),
      question: (record.Question || "").trim(),
      answer: (record.Answer || "").trim(),
      category: (record.Category || "General").trim(),
      status: (record.Status || "").trim() || "Approved",
      confidence: (record.Confidence || "").trim(),
      scripture: (record.Scripture || "").trim(),
      suggestedPage: (record["Suggested Page"] || "").trim(),
      priority: confidenceScore(record),
      sortOrder: faqNumber(record.ID),
      slug: record.ID.trim().toLowerCase(),
    }))
    .filter((faq) => faq.question && faq.answer)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function uniqueCategories(faqs) {
  const counts = new Map();
  faqs.forEach((faq) => {
    counts.set(faq.category, (counts.get(faq.category) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);
}

function renderAccordionItem(faq, options = {}) {
  const { open = false, prefix = "" } = options;
  const headingId = `${prefix}faq-q-${faq.slug}`;
  const panelId = `${prefix}faq-a-${faq.slug}`;
  return `<article class="faq-accordion__item" data-faq-id="${escapeHtml(faq.id)}" data-faq-category="${escapeHtml(faq.category)}">
  <h3 class="faq-accordion__heading">
    <button type="button" class="faq-accordion__trigger${open ? " is-open" : ""}" id="${headingId}" aria-expanded="${open ? "true" : "false"}" aria-controls="${panelId}">
      <span class="faq-accordion__question">${escapeHtml(faq.question)}</span>
      <span class="faq-accordion__icon" aria-hidden="true"></span>
    </button>
  </h3>
  <div class="faq-accordion__panel${open ? " is-open" : ""}" id="${panelId}" role="region" aria-labelledby="${headingId}"${open ? "" : ' hidden'}>
    <div class="faq-accordion__answer">${formatAnswerHtml(faq.answer)}${faq.scripture ? `<p class="faq-accordion__scripture"><em>${escapeHtml(faq.scripture)}</em></p>` : ""}</div>
  </div>
</article>`;
}

function renderAccordionList(faqs, options = {}) {
  return `<div class="faq-accordion" data-faq-accordion${options.singleOpen === false ? ' data-single-open="false"' : ""}>${faqs.map((faq, i) => renderAccordionItem(faq, { open: options.openFirst && i === 0, prefix: options.prefix || "" })).join("\n")}</div>`;
}

function selectRelatedFaqs(faqs, pageSlug) {
  const categories = PAGE_CATEGORY_MAP[pageSlug] || ["General"];
  const picked = [];
  const used = new Set();

  function takeFrom(list) {
    for (const faq of list) {
      if (picked.length >= RELATED_COUNT) break;
      if (used.has(faq.id)) continue;
      used.add(faq.id);
      picked.push(faq);
    }
  }

  categories.forEach((category) => {
    takeFrom(
      faqs
        .filter((f) => f.category === category)
        .sort((a, b) => b.priority - a.priority || a.sortOrder - b.sortOrder)
    );
  });

  if (picked.length < RELATED_COUNT) {
    takeFrom(
      faqs
        .filter((f) => categories.includes(f.category))
        .sort((a, b) => b.priority - a.priority || a.sortOrder - b.sortOrder)
    );
  }

  if (picked.length < RELATED_COUNT) {
    takeFrom(faqs.sort((a, b) => b.priority - a.priority || a.sortOrder - b.sortOrder));
  }

  return picked.slice(0, RELATED_COUNT);
}

function renderRelatedSection(faqs, pageSlug) {
  const related = selectRelatedFaqs(faqs, pageSlug);
  if (!related.length) return "";

  return `      <!-- Related FAQs (auto-generated) -->
      <section class="related-faqs border-b border-slate-200 bg-slate-50" aria-labelledby="related-faqs-heading-${pageSlug}">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-16 lg:px-8">
          <div class="scroll-reveal max-w-2xl">
            <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Questions &amp; Answers</p>
            <h2 id="related-faqs-heading-${pageSlug}" class="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Related FAQs</h2>
            <p class="mt-3 text-sm text-slate-600 sm:text-base">Quick answers related to this part of our church life.</p>
          </div>
          <div class="mt-8 scroll-reveal scroll-reveal--delay-1">
            ${renderAccordionList(related, { prefix: `${pageSlug}-` })}
          </div>
          <div class="mt-8 scroll-reveal scroll-reveal--delay-2">
            <a href="faq.html" class="inline-flex items-center rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-accent/70 transition hover:bg-accentSoft">View All FAQs</a>
          </div>
        </div>
      </section>
`;
}

function renderFaqPageSchema(faqs, pageUrl) {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
      url: pageUrl,
    },
    null,
    2
  );
}

function renderBreadcrumbSchema(pageNum, totalPages) {
  const items = [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.rolcc.in/" },
    { "@type": "ListItem", position: 2, name: "FAQs", item: "https://www.rolcc.in/faq.html" },
  ];
  if (pageNum > 1) {
    items.push({
      "@type": "ListItem",
      position: 3,
      name: `Page ${pageNum}`,
      item: `https://www.rolcc.in/faq-${pageNum}.html`,
    });
  }
  return JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items }, null, 2);
}

function readHeaderNavTemplate() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{TITLE}}</title>
    <meta name="description" content="{{DESCRIPTION}}" />
    <meta property="og:title" content="{{TITLE}}" />
    <meta property="og:description" content="{{DESCRIPTION}}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{{CANONICAL}}" />
    <meta property="og:image" content="/images/og-image.jpg" />
    <link rel="icon" type="image/x-icon" href="/images/favicon.ico" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = { theme: { extend: { colors: { primary: "#ffffff", primaryDark: "#f6f9fc", accent: "#635bff", accentSoft: "#818cf8" } } } };
    </script>
    <link rel="stylesheet" href="css/styles.css" />
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
        <a href="index.html" class="header-top__brand flex items-center gap-3">
          <img src="assets/logo.svg" alt="River of Life Christian Church" class="header-top__logo-img" width="36" height="44" />
          <div class="leading-tight"><p class="text-sm font-semibold tracking-wide">River of Life</p><p class="text-[11px] text-slate-500">Christian Church · Bangalore</p></div>
        </a>
        <div class="hidden md:flex items-center gap-6 text-sm font-medium">
          <a href="index.html" class="header-top__link" data-nav="index">Home</a>
          <a href="about.html" class="header-top__link" data-nav="about">About Us</a>
          <div class="header-top__dropdown relative" id="ministries-dropdown">
            <button type="button" class="header-top__link flex items-center gap-0.5" aria-expanded="false" aria-haspopup="true" aria-controls="ministries-menu" id="ministries-trigger">Ministries <span class="text-[10px] ml-0.5" aria-hidden="true">▾</span></button>
            <div class="header-top__dropdown-panel absolute top-full left-0 mt-1 py-2 min-w-[10rem] rounded-lg border border-slate-200 bg-white shadow-lg z-50 hidden" id="ministries-menu" role="menu">
              <a href="services.html" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-t-lg" role="menuitem" data-nav="services">Worship Services</a>
              <a href="river-kids.html" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50" role="menuitem" data-nav="river-kids">River Kids</a>
              <a href="fellowship.html" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50" role="menuitem" data-nav="fellowship">Cell Fellowship</a>
              <a href="pmd.html" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50" role="menuitem" data-nav="pmd">PMD</a>
              <a href="counselling.html" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50" role="menuitem" data-nav="counselling">Counselling</a>
              <a href="rolf.html" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-b-lg" role="menuitem" data-nav="rolf">ROLF</a>
            </div>
          </div>
          <a href="giving.html" class="header-top__link" data-nav="giving">Giving</a>
          <a href="faq.html" class="header-top__link text-slate-900 font-semibold" data-nav="faq">FAQs</a>
          <a href="contact.html" class="header-top__link" data-nav="contact">Contact Us</a>
        </div>
        <div class="hidden md:block"><a href="contact.html#location" class="header-top__cta inline-flex items-center rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-accent/70 hover:bg-accentSoft transition">Join Us This Sunday</a></div>
        <button id="nav-toggle" type="button" class="header-top__hamburger md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100" aria-label="Open menu" aria-expanded="false" aria-controls="nav-menu"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
      </nav>
      <div id="nav-menu" class="header-top__menu hidden md:hidden border-t border-slate-200 bg-white" aria-hidden="true">
        <div class="mx-auto max-w-6xl px-4 py-3 space-y-1 sm:px-6 lg:px-8">
          <a href="index.html" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" data-nav="index">Home</a>
          <a href="about.html" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" data-nav="about">About Us</a>
          <p class="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mt-2">Ministries</p>
          <a href="services.html" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="services">Worship Services</a>
          <a href="river-kids.html" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="river-kids">River Kids</a>
          <a href="fellowship.html" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="fellowship">Cell Fellowship</a>
          <a href="pmd.html" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="pmd">PMD</a>
          <a href="counselling.html" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="counselling">Counselling</a>
          <a href="rolf.html" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="rolf">ROLF</a>
          <a href="events.html" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="events">Events</a>
          <a href="membership.html" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="membership">Membership</a>
          <a href="giving.html" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" data-nav="giving">Giving</a>
          <a href="faq.html" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-900 font-medium bg-slate-100" data-nav="faq">FAQs</a>
          <a href="contact.html" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" data-nav="contact">Contact Us</a>
          <a href="contact.html#location" class="header-top__menu-cta mt-3 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">Join Us This Sunday</a>
        </div>
      </div>
    </header>`;
}

function readFooterTemplate() {
  return `
    <footer id="footer-section" class="footer-reveal fixed bottom-0 left-0 right-0 z-0 min-h-screen overflow-hidden">
      <img src="https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=1920&q=70" alt="ROLCC Bangalore" class="footer-bg absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div class="footer-overlay absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-900/70 to-slate-950/95" aria-hidden="true"></div>
      <div class="relative z-10 flex min-h-screen flex-col">
        <section class="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:py-24">
          <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">Still have questions?</h2>
          <p class="mt-4 max-w-lg text-sm text-slate-300 sm:text-base">We would love to help you find the right next step.</p>
          <a href="contact.html" class="btn-primary mt-8 inline-flex rounded-full bg-accent px-8 py-3.5 text-base font-semibold text-white shadow-lg ring-1 ring-accent/70 hover:bg-accentSoft">Contact Us</a>
        </section>
        <div class="border-t border-white/10">
          <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Services</p>
                <ul class="mt-4 space-y-2.5 text-sm text-slate-300">
                  <li><a href="services.html" class="footer-link inline-flex items-center gap-2 hover:text-white">Worship Services <span class="text-slate-500">→</span></a></li>
                  <li><a href="river-kids.html" class="footer-link inline-flex items-center gap-2 hover:text-white">River Kids <span class="text-slate-500">→</span></a></li>
                  <li><a href="fellowship.html" class="footer-link inline-flex items-center gap-2 hover:text-white">Cell Fellowship <span class="text-slate-500">→</span></a></li>
                  <li><a href="faq.html" class="footer-link inline-flex items-center gap-2 hover:text-white">FAQs <span class="text-slate-500">→</span></a></li>
                </ul>
              </div>
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Navigation</p>
                <ul class="mt-4 space-y-2.5 text-sm text-slate-300">
                  <li><a href="index.html" class="footer-link hover:text-white">Main</a></li>
                  <li><a href="about.html" class="footer-link hover:text-white">About Us</a></li>
                  <li><a href="contact.html" class="footer-link hover:text-white">Contact</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-auto border-t border-white/10">
          <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-[11px] text-slate-400 sm:flex-row sm:px-6 lg:px-8">
            <p>© <span id="year"></span> River of Life Christian Church. All rights reserved.</p>
            <p>&quot;A Place to Encounter Jesus&quot;</p>
          </div>
        </div>
      </div>
    </footer>
    <button id="scroll-top-btn" class="scroll-to-top hidden fixed bottom-5 right-4 z-40 rounded-full bg-slate-900/90 p-2 text-xs text-slate-100 shadow-lg ring-1 ring-slate-600 hover:bg-slate-800 sm:bottom-6 sm:right-6" aria-label="Scroll to top" type="button">↑</button>`;
}

function renderPagination(pageNum, totalPages) {
  if (totalPages <= 1) return "";

  const mkLink = (num, label, current) => {
    const href = num === 1 ? "faq.html" : `faq-${num}.html`;
    if (num === current) {
      return `<span class="faq-pagination__page is-current" aria-current="page">${label}</span>`;
    }
    return `<a class="faq-pagination__page" href="${href}" data-faq-page="${num}">${label}</a>`;
  };

  let pages = "";
  for (let i = 1; i <= totalPages; i++) {
    pages += mkLink(i, String(i), pageNum);
  }

  const prev = pageNum > 1 ? `<a class="faq-pagination__nav" href="${pageNum === 2 ? "faq.html" : `faq-${pageNum - 1}.html`}" rel="prev" data-faq-page="${pageNum - 1}">Previous</a>` : `<span class="faq-pagination__nav is-disabled">Previous</span>`;
  const next = pageNum < totalPages ? `<a class="faq-pagination__nav" href="faq-${pageNum + 1}.html" rel="next" data-faq-page="${pageNum + 1}">Next</a>` : `<span class="faq-pagination__nav is-disabled">Next</span>`;

  return `<nav class="faq-pagination" aria-label="FAQ pages" data-faq-pagination-static>${prev}<div class="faq-pagination__pages">${pages}</div>${next}</nav>`;
}

function renderFilterChips(categories) {
  const chips = [`<button type="button" class="faq-chip is-active" data-faq-filter="all">All</button>`];
  categories.forEach((cat) => {
    chips.push(`<button type="button" class="faq-chip" data-faq-filter="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`);
  });
  return `<div class="faq-chips" role="toolbar" aria-label="Filter FAQs by topic" data-faq-chips>${chips.join("")}</div>`;
}

function buildFaqPageHtml(faqs, categories, pageNum, totalPages) {
  const start = (pageNum - 1) * PER_PAGE;
  const pageFaqs = faqs.slice(start, start + PER_PAGE);
  const isFirstPage = pageNum === 1;
  const fileName = isFirstPage ? "faq.html" : `faq-${pageNum}.html`;
  const canonical = isFirstPage ? "https://www.rolcc.in/faq.html" : `https://www.rolcc.in/${fileName}`;
  const titleSuffix = isFirstPage ? "" : ` — Page ${pageNum}`;

  const headExtra = `<link rel="stylesheet" href="css/faq.css" />
    <link rel="canonical" href="${canonical}" />
    ${pageNum > 1 ? `<link rel="prev" href="${pageNum === 2 ? "https://www.rolcc.in/faq.html" : `https://www.rolcc.in/faq-${pageNum - 1}.html`}" />` : ""}
    ${pageNum < totalPages ? `<link rel="next" href="https://www.rolcc.in/faq-${pageNum + 1}.html" />` : ""}
    <script type="application/ld+json">${renderFaqPageSchema(pageFaqs, canonical)}</script>
    <script type="application/ld+json">${renderBreadcrumbSchema(pageNum, totalPages)}</script>`;

  const body = `${readHeaderNavTemplate()
    .replace("{{TITLE}}", `FAQs${titleSuffix} | River of Life Christian Church`)
    .replace("{{DESCRIPTION}}", "Browse answers about ROLCC — church, ministries, Bible College, events, giving, and more.")
    .replace("{{CANONICAL}}", canonical)
    .replace("{{HEAD_EXTRA}}", headExtra)}
    <main class="main-no-top-gap relative z-10">
      <section class="faq-hero contact-hero contact-hero--bg-image relative overflow-hidden">
        <div class="contact-hero__curve" aria-hidden="true"></div>
        <div class="relative z-10 mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6 sm:pt-24 sm:pb-12 md:pt-28 lg:px-8 lg:pt-32">
          <div class="max-w-3xl scroll-reveal">
            <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Help Center</p>
            <h1 class="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">Find the Answers You&apos;re Looking For</h1>
            <p class="mt-5 text-sm text-slate-600 sm:text-base leading-relaxed">Browse answers to common questions about our church, ministries, Bible College, internships, events, and more. Search or explore by topic to quickly find what you&apos;re looking for.</p>
            <div class="mt-8 scroll-reveal scroll-reveal--delay-1">
              <label class="sr-only" for="faq-search">Search FAQs</label>
              <div class="faq-search" data-faq-search-wrap>
                <svg class="faq-search__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input type="search" id="faq-search" class="faq-search__input" placeholder="Search questions and answers…" autocomplete="off" data-faq-search />
                <button type="button" class="faq-search__clear hidden" data-faq-search-clear aria-label="Clear search">×</button>
              </div>
            </div>
            <div class="mt-5 scroll-reveal scroll-reveal--delay-2">${renderFilterChips(categories)}</div>
          </div>
        </div>
      </section>

      <section class="border-b border-slate-200 bg-white" aria-label="FAQ results">
        <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <p class="faq-results-meta text-sm text-slate-500" data-faq-results-meta aria-live="polite">Showing ${start + 1}–${Math.min(start + PER_PAGE, faqs.length)} of ${faqs.length} questions</p>
          <div class="mt-6" data-faq-list-static>${renderAccordionList(pageFaqs)}</div>
          <div class="mt-6 hidden" data-faq-list-dynamic aria-live="polite"></div>
          <p class="faq-empty hidden mt-8 text-center text-sm text-slate-500" data-faq-empty>No FAQs match your search. Try another keyword or category.</p>
          <div class="mt-10">${renderPagination(pageNum, totalPages)}</div>
          <nav class="faq-pagination hidden mt-10" aria-label="Filtered FAQ pages" data-faq-pagination-dynamic></nav>
        </div>
      </section>

      <div class="serve-unveil-spacer min-h-screen" aria-hidden="true"></div>
    </main>
${readFooterTemplate()}
    <script src="js/main.js"></script>
    <script src="js/faq/core.js"></script>
    <script src="js/faq/accordion.js"></script>
    <script src="js/faq/page.js"></script>
    <script>
      window.FAQ_PAGE_CONFIG = ${JSON.stringify({ page: pageNum, perPage: PER_PAGE, total: faqs.length, totalPages, mode: "static" })};
    </script>
  </body>
</html>`;

  return { fileName, html: body };
}

function injectRelatedFaqs(faqs) {
  Object.entries(HTML_PAGE_SLUGS).forEach(([fileName, slug]) => {
    const filePath = path.join(ROOT, fileName);
    if (!fs.existsSync(filePath)) return;

    let html = fs.readFileSync(filePath, "utf8");
    if (html.includes(`related-faqs-heading-${slug}`)) return;
    const markerStart = "<!-- @related-faqs:start -->";
    const markerEnd = "<!-- @related-faqs:end -->";
    const section = renderRelatedSection(faqs, slug);

    if (html.includes(markerStart)) {
      html = html.replace(new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`), `${markerStart}\n${section}      ${markerEnd}`);
    } else {
      const footerIdx = html.lastIndexOf('<footer id="footer-section"');
      const spacerIdx = html.lastIndexOf('<div class="serve-unveil-spacer min-h-screen" aria-hidden="true"></div>', footerIdx);
      if (spacerIdx !== -1) {
        html = html.slice(0, spacerIdx) + section + html.slice(spacerIdx);
      }
    }

    if (!html.includes("css/faq.css")) {
      html = html.replace('href="css/styles.css"', 'href="css/styles.css" />\n    <link rel="stylesheet" href="css/faq.css"');
    }

    if (!html.includes("js/faq/accordion.js")) {
      html = html.replace(
        '<script src="js/main.js"></script>',
        '<script src="js/main.js"></script>\n    <script src="js/faq/core.js"></script>\n    <script src="js/faq/accordion.js"></script>'
      );
    }

    fs.writeFileSync(filePath, html, "utf8");
  });
}

function updateSitemap(totalPages) {
  const sitemapPath = path.join(ROOT, "sitemap.xml");
  if (!fs.existsSync(sitemapPath)) return;
  let xml = fs.readFileSync(sitemapPath, "utf8");

  const faqEntries = [];
  for (let i = 1; i <= totalPages; i++) {
    const loc = i === 1 ? "https://www.rolcc.in/faq.html" : `https://www.rolcc.in/faq-${i}.html`;
    if (xml.includes(loc)) continue;
    faqEntries.push(`  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${i === 1 ? "0.8" : "0.6"}</priority>\n  </url>`);
  }

  if (!faqEntries.length) return;
  xml = xml.replace("</urlset>", `${faqEntries.join("\n")}\n</urlset>`);
  fs.writeFileSync(sitemapPath, xml, "utf8");
}

function addFaqNavLink() {
  const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html") && !f.startsWith("faq"));
  pages.forEach((fileName) => {
    const filePath = path.join(ROOT, fileName);
    let html = fs.readFileSync(filePath, "utf8");
    if (html.includes('href="faq.html"')) return;

    html = html.replace(
      '<a href="giving.html" class="header-top__link" data-nav="giving">Giving</a>',
      '<a href="giving.html" class="header-top__link" data-nav="giving">Giving</a>\n          <a href="faq.html" class="header-top__link" data-nav="faq">FAQs</a>'
    );
    html = html.replace(
      '<a href="giving.html" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" data-nav="giving">Giving</a>',
      '<a href="giving.html" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" data-nav="giving">Giving</a>\n          <a href="faq.html" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" data-nav="faq">FAQs</a>'
    );
    fs.writeFileSync(filePath, html, "utf8");
  });
}

function main() {
  const faqs = loadFaqs();
  const categories = uniqueCategories(faqs);
  const totalPages = Math.max(1, Math.ceil(faqs.length / PER_PAGE));

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, "faqs.json"), JSON.stringify({ faqs, categories, total: faqs.length, perPage: PER_PAGE }, null, 0));

  for (let page = 1; page <= totalPages; page++) {
    const { fileName, html } = buildFaqPageHtml(faqs, categories, page, totalPages);
    fs.writeFileSync(path.join(ROOT, fileName), html, "utf8");
    console.log(`Wrote ${fileName} (${Math.min(PER_PAGE, faqs.length - (page - 1) * PER_PAGE)} FAQs)`);
  }

  injectRelatedFaqs(faqs);
  updateSitemap(totalPages);
  addFaqNavLink();

  console.log(`Built ${faqs.length} approved FAQs across ${totalPages} pages and ${categories.length} categories.`);
}

main();
