const fs = require("fs");
const { getMegaMenuPanelHtml, getHamburgerButtonHtml } = require("./mega-menu-template");
const path = require("path");
const { parseCsv } = require("./csv-parse");
const {
  PER_PAGE,
  RELATED_COUNT,
  FAQ_CHIP_TOPICS,
  HTML_PAGE_SLUGS,
  faqNumber,
  isApprovedFaq,
  confidenceScore,
  assignTopic,
  selectRelatedFaqs,
  getPageFaqMeta,
  sortFaqsForDisplay,
  escapeHtml,
  formatAnswerHtml,
} = require("./faq-config");

const ROOT = path.join(__dirname, "..");
const TODAY = new Date().toISOString().slice(0, 10);
const CSV_PATH = path.join(ROOT, "data", "faqs-source-v2.csv");
const DATA_DIR = path.join(ROOT, "data");

function loadFaqs() {
  const csv = fs.readFileSync(CSV_PATH, "utf8");
  const records = parseCsv(csv);
  const faqs = records
    .filter(isApprovedFaq)
    .map((record) => {
      const faq = {
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

function renderAccordionItem(faq, options = {}) {
  const { open = false, prefix = "" } = options;
  const headingId = `${prefix}faq-q-${faq.slug}`;
  const panelId = `${prefix}faq-a-${faq.slug}`;
  return `<article class="faq-accordion__item" data-faq-id="${escapeHtml(faq.id)}" data-faq-topic="${escapeHtml(faq.topic)}" data-faq-category="${escapeHtml(faq.category)}">
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

function renderRelatedSection(faqs, pageSlug) {
  const related = selectRelatedFaqs(faqs, pageSlug);
  if (!related.length) return "";

  const meta = getPageFaqMeta(pageSlug);

  return `      <!-- Related FAQs (auto-generated) -->
      <section class="related-faqs border-b border-slate-200 bg-slate-50" aria-labelledby="related-faqs-heading-${pageSlug}">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-16 lg:px-8">
          <div class="scroll-reveal max-w-2xl">
            <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Questions &amp; Answers</p>
            <h2 id="related-faqs-heading-${pageSlug}" class="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">${escapeHtml(meta.heading)}</h2>
            <p class="mt-3 text-sm text-slate-600 sm:text-base">${escapeHtml(meta.description)}</p>
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
    <meta property="og:image" content="https://www.rolcc.in/images/og-image.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{{TITLE}}" />
    <meta name="twitter:description" content="{{DESCRIPTION}}" />
    <meta name="twitter:image" content="https://www.rolcc.in/images/og-image.jpg" />
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
        <a href="/" class="header-top__brand flex items-center gap-3">
          <img src="assets/logo.svg" alt="River of Life Christian Church" class="header-top__logo-img" width="36" height="44" />
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
  return `
    <footer id="footer-section" class="footer-reveal fixed bottom-0 left-0 right-0 z-0 min-h-screen overflow-hidden">
      <img src="https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=1920&q=70" alt="River of Life Christian Church Bangalore" class="footer-bg absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div class="footer-overlay absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-900/70 to-slate-950/95" aria-hidden="true"></div>
      <div class="relative z-10 flex min-h-screen flex-col">
        <section class="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:py-24">
          <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">Still have questions?</h2>
          <p class="mt-4 max-w-lg text-sm text-slate-300 sm:text-base">We would love to help you find the right next step.</p>
          <a href="/contact" class="btn-primary mt-8 inline-flex rounded-full bg-accent px-8 py-3.5 text-base font-semibold text-white shadow-lg ring-1 ring-accent/70 hover:bg-accentSoft">Contact Us</a>
        </section>
        <div class="border-t border-white/10">
          <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Services</p>
                <ul class="mt-4 space-y-2.5 text-sm text-slate-300">
                  <li><a href="/services" class="footer-link inline-flex items-center gap-2 hover:text-white">Worship Services <span class="text-slate-500">→</span></a></li>
                  <li><a href="/river-kids" class="footer-link inline-flex items-center gap-2 hover:text-white">River Kids <span class="text-slate-500">→</span></a></li>
                  <li><a href="/fellowship" class="footer-link inline-flex items-center gap-2 hover:text-white">Cell Fellowship <span class="text-slate-500">→</span></a></li>
                  <li><a href="/pmd" class="footer-link inline-flex items-center gap-2 hover:text-white">PMD <span class="text-slate-500">→</span></a></li>
                  <li><a href="/counselling" class="footer-link inline-flex items-center gap-2 hover:text-white">Counselling <span class="text-slate-500">→</span></a></li>
                  <li><a href="/rolf" class="footer-link inline-flex items-center gap-2 hover:text-white">ROLF <span class="text-slate-500">→</span></a></li>
                  <li><a href="/giving" class="footer-link inline-flex items-center gap-2 hover:text-white">Giving <span class="text-slate-500">→</span></a></li>
                </ul>
              </div>
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Navigation</p>
                <ul class="mt-4 space-y-2.5 text-sm text-slate-300">
                  <li><a href="/" class="footer-link hover:text-white">Home</a></li>
                  <li><a href="/services" class="footer-link hover:text-white">Our Ministries</a></li>
                  <li><a href="/events" class="footer-link hover:text-white">Events</a></li>
                  <li><a href="/membership" class="footer-link hover:text-white">Membership</a></li>
                  <li><a href="/about" class="footer-link hover:text-white">About Us</a></li>
                  <li><a href="/contact" class="footer-link hover:text-white">Contact</a></li>
                </ul>
              </div>
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Resources</p>
                <ul class="mt-4 space-y-2.5 text-sm text-slate-300">
                  <li><a href="/faq" class="footer-link hover:text-white">FAQ</a></li>
                  <li><a href="/articles" class="footer-link hover:text-white">Articles</a></li>
                  <li><a href="/bible-study" class="footer-link hover:text-white">Bible Study</a></li>
                  <li><a href="/gallery" class="footer-link hover:text-white">Gallery</a></li>
                  <li><a href="/sermons" class="footer-link hover:text-white">Latest Sermon</a></li>
                </ul>
              </div>
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Connect</p>
                <div class="mt-4 flex flex-nowrap items-center gap-2">
                  <a href="https://www.facebook.com/rolccindia/" target="_blank" rel="noopener noreferrer" class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-accent hover:bg-accent/20" aria-label="Facebook">
                    <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                  <a href="https://www.instagram.com/rolccindia" target="_blank" rel="noopener noreferrer" class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-accent hover:bg-accent/20" aria-label="Instagram">
                    <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  </a>
                  <a href="https://www.linkedin.com/company/142902442/" target="_blank" rel="noopener noreferrer" class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-accent hover:bg-accent/20" aria-label="LinkedIn">
                    <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </a>
                  <a href="https://www.youtube.com/@rolccindia" target="_blank" rel="noopener noreferrer" class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-accent hover:bg-accent/20" aria-label="YouTube">
                    <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-auto border-t border-white/10">
          <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-[11px] text-slate-400 sm:flex-row sm:px-6 lg:px-8">
            <p>© <span id="year"></span> River of Life Christian Church. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
    <button id="scroll-top-btn" class="scroll-to-top hidden fixed bottom-5 right-4 z-40 rounded-full bg-slate-900/90 p-2 text-xs text-slate-100 shadow-lg ring-1 ring-slate-600 hover:bg-slate-800 sm:bottom-6 sm:right-6" aria-label="Scroll to top" type="button">↑</button>`;
}

function renderPagination(pageNum, totalPages) {
  if (totalPages <= 1) return "";

  const mkLink = (num, label, current) => {
    const href = faqHref(num);
    if (num === current) {
      return `<span class="faq-pagination__page is-current" aria-current="page">${label}</span>`;
    }
    return `<a class="faq-pagination__page" href="${href}" data-faq-page="${num}">${label}</a>`;
  };

  let pages = "";
  for (let i = 1; i <= totalPages; i++) {
    pages += mkLink(i, String(i), pageNum);
  }

  const prev = pageNum > 1 ? `<a class="faq-pagination__nav" href="${faqHref(pageNum - 1)}" rel="prev" data-faq-page="${pageNum - 1}">Previous</a>` : `<span class="faq-pagination__nav is-disabled">Previous</span>`;
  const next = pageNum < totalPages ? `<a class="faq-pagination__nav" href="${faqHref(pageNum + 1)}" rel="next" data-faq-page="${pageNum + 1}">Next</a>` : `<span class="faq-pagination__nav is-disabled">Next</span>`;

  return `<nav class="faq-pagination" aria-label="FAQ pages" data-faq-pagination-static>${prev}<div class="faq-pagination__pages">${pages}</div>${next}</nav>`;
}

function renderFilterChips() {
  const chips = [`<button type="button" class="faq-chip is-active" data-faq-filter="all">All</button>`];
  FAQ_CHIP_TOPICS.forEach((chip) => {
    chips.push(
      `<button type="button" class="faq-chip" data-faq-filter="${escapeHtml(chip.id)}">${escapeHtml(chip.label)}</button>`
    );
  });
  return `<div class="faq-chips-wrap" data-faq-chips-wrap>
    <button type="button" class="faq-chips-nav faq-chips-nav--prev" data-faq-chips-prev aria-label="Scroll categories left" disabled>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <div class="faq-chips-viewport">
      <div class="faq-chips" role="toolbar" aria-label="Filter FAQs by topic" data-faq-chips>${chips.join("")}</div>
    </div>
    <button type="button" class="faq-chips-nav faq-chips-nav--next" data-faq-chips-next aria-label="Scroll categories right">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
    </button>
  </div>`;
}

function faqCanonicalUrl(pageNum) {
  return pageNum === 1 ? "https://www.rolcc.in/faq" : `https://www.rolcc.in/faq/${pageNum}`;
}
function faqHref(pageNum) {
  return pageNum === 1 ? "/faq" : `/faq/${pageNum}`;
}

function buildFaqPageHtml(faqs, pageNum, totalPages) {
  const start = (pageNum - 1) * PER_PAGE;
  const pageFaqs = faqs.slice(start, start + PER_PAGE);
  const isFirstPage = pageNum === 1;
  const fileName = isFirstPage ? "faq.html" : `faq-${pageNum}.html`;
  const canonical = faqCanonicalUrl(pageNum);
  let pageTitle;
  let pageDesc;
  if (isFirstPage) {
    pageTitle = "Church FAQs | Visiting, Faith & Community | River of Life Christian Church, Bangalore";
    pageDesc =
      "Answers about visiting ROLCC for the first time — Sunday services, finding community, faith questions, families, River Kids, serving, and prayer support in HSR Layout, Bangalore.";
  } else if (pageNum === 2) {
    pageTitle = `Church FAQs | Faith & Church Life | Page 2 of ${totalPages} | River of Life Christian Church, Bangalore`;
    pageDesc =
      "More answers about faith, worship, and everyday church life at River of Life Christian Church — practical guidance for guests and members in Bangalore.";
  } else {
    pageTitle = `Church FAQs | Page ${pageNum} of ${totalPages} | River of Life Christian Church, Bangalore`;
    pageDesc = `Continue browsing ROLCC FAQs — page ${pageNum} of ${totalPages}. Helpful answers about visiting, community, ministry, and church life in HSR Layout, Bangalore.`;
  }

  const headExtra = `<link rel="stylesheet" href="css/faq.css" />
    <link rel="canonical" href="${canonical}" />
    ${pageNum > 1 ? `<link rel="prev" href="${faqCanonicalUrl(pageNum - 1)}" />` : ""}
    ${pageNum < totalPages ? `<link rel="next" href="${faqCanonicalUrl(pageNum + 1)}" />` : ""}
    <script type="application/ld+json">${renderFaqPageSchema(pageFaqs, canonical)}</script>
    <script type="application/ld+json">${renderBreadcrumbSchema(pageNum, totalPages)}</script>`;

  const body = `${readHeaderNavTemplate()
    .replaceAll("{{TITLE}}", pageTitle)
    .replaceAll("{{DESCRIPTION}}", pageDesc)
    .replace("{{CANONICAL}}", canonical)
    .replace("{{HEAD_EXTRA}}", headExtra)}
    <main class="main-no-top-gap relative z-10">
      <section class="faq-hero contact-hero contact-hero--bg-image relative">
        <div class="contact-hero__curve" aria-hidden="true"></div>
        <div class="relative z-10 mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6 sm:pt-24 sm:pb-12 md:pt-28 lg:px-8 lg:pt-32">
          <div class="max-w-3xl scroll-reveal">
            <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Help Center</p>
            <h1 class="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">Find the Answers You&apos;re Looking For</h1>
            <p class="mt-5 text-sm text-slate-600 sm:text-base leading-relaxed">Answers about visiting for the first time, finding community, exploring faith, family programs, serving, getting support, and other general questions. Search or filter by topic to find what you need.</p>
            <div class="faq-hero__tools mt-8 scroll-reveal scroll-reveal--delay-1">
              <label class="sr-only" for="faq-search">Search FAQs</label>
              <div class="faq-search" data-faq-search-wrap>
                <div class="faq-search__field">
                  <svg class="faq-search__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  <input type="text" id="faq-search" class="faq-search__input" placeholder=" " autocomplete="off" inputmode="search" enterkeyhint="search" role="searchbox" data-faq-search aria-autocomplete="list" aria-controls="faq-suggestions" aria-expanded="false" aria-label="Search FAQs. Try searching for kids ministry, serving at church, counselling, membership, or visiting." />
                  <div class="faq-search__hint" data-faq-search-hint aria-hidden="true">Try searching for <span class="faq-search__hint-phrase" data-faq-search-hint-phrase>kids ministry</span></div>
                </div>
                <button type="button" class="faq-search__clear hidden" data-faq-search-clear aria-label="Clear search">×</button>
                <div class="faq-suggestions hidden" id="faq-suggestions" data-faq-suggestions role="listbox" aria-label="Suggested questions"></div>
              </div>
              <div class="faq-hero__chips scroll-reveal scroll-reveal--delay-2">${renderFilterChips()}</div>
            </div>
          </div>
        </div>
      </section>

      <section class="border-b border-slate-200 bg-white" aria-label="FAQ results">
        <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <p class="faq-results-meta text-sm text-slate-500" data-faq-results-meta aria-live="polite">Showing ${start + 1}–${Math.min(start + PER_PAGE, faqs.length)} of ${faqs.length} questions</p>
          <div class="mt-6" data-faq-list-static>${renderAccordionList(pageFaqs)}</div>
          <div class="mt-6 hidden" data-faq-list-dynamic aria-live="polite"></div>
          <p class="faq-empty hidden mt-8 text-center text-sm text-slate-500" data-faq-empty>No FAQs match your search. Try another keyword or topic.</p>
          <div class="mt-10">${renderPagination(pageNum, totalPages)}</div>
          <nav class="faq-pagination hidden mt-10" aria-label="Filtered FAQ pages" data-faq-pagination-dynamic></nav>
        </div>
      </section>

      <div class="serve-unveil-spacer min-h-screen" aria-hidden="true"></div>
    </main>
${readFooterTemplate()}
    <script src="js/main.js"></script>
    <script id="faq-data" type="application/json">${JSON.stringify({ faqs, chips: FAQ_CHIP_TOPICS, total: faqs.length, perPage: PER_PAGE })}</script>
    <script src="js/faq/search.js"></script>
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
    const section = renderRelatedSection(faqs, slug);
    const relatedPattern = /      <!-- Related FAQs \(auto-generated\) -->[\s\S]*?      <\/section>\r?\n/;

    if (relatedPattern.test(html)) {
      html = html.replace(relatedPattern, section);
    } else {
      const markerStart = "<!-- @related-faqs:start -->";
      const markerEnd = "<!-- @related-faqs:end -->";
      if (html.includes(markerStart)) {
        html = html.replace(new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`), `${markerStart}\n${section}      ${markerEnd}`);
      } else {
        const footerIdx = html.lastIndexOf('<footer id="footer-section"');
        const spacerIdx = html.lastIndexOf('<div class="serve-unveil-spacer min-h-screen" aria-hidden="true"></div>', footerIdx);
        if (spacerIdx !== -1) {
          html = html.slice(0, spacerIdx) + section + html.slice(spacerIdx);
        }
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
  const { writeSitemap, loadArticlesFromManifest } = require("./build-sitemap");
  writeSitemap({ articles: loadArticlesFromManifest(), faqTotalPages: totalPages, today: TODAY });
}

function main() {
  const faqs = loadFaqs();
  const totalPages = Math.max(1, Math.ceil(faqs.length / PER_PAGE));

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(DATA_DIR, "faqs.json"),
    JSON.stringify({ faqs, chips: FAQ_CHIP_TOPICS, total: faqs.length, perPage: PER_PAGE }, null, 0)
  );

  for (let page = 1; page <= totalPages; page++) {
    const { fileName, html } = buildFaqPageHtml(faqs, page, totalPages);
    fs.writeFileSync(path.join(ROOT, fileName), html, "utf8");
    console.log(`Wrote ${fileName} (${Math.min(PER_PAGE, faqs.length - (page - 1) * PER_PAGE)} FAQs)`);
  }

  injectRelatedFaqs(faqs);
  updateSitemap(totalPages);

  console.log(`Built ${faqs.length} approved FAQs across ${totalPages} pages and ${FAQ_CHIP_TOPICS.length} topic chips.`);
  FAQ_CHIP_TOPICS.forEach((chip) => {
    const count = faqs.filter((f) => f.topic === chip.id).length;
    console.log(`  ${chip.label}: ${count}`);
  });
}

main();
