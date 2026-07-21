/**
 * Generate Personal Caring pages from membership.html chrome (header/footer).
 */
const fs = require("fs");
const path = require("path");
const { getFooterLinksGridHtml } = require("./footer-links-template");
const {
  selectRelatedFaqs,
  getPageFaqMeta,
  escapeHtml,
  formatAnswerHtml,
} = require("./faq-config");

const ROOT = path.join(__dirname, "..");
const chromeSrc = fs.readFileSync(path.join(ROOT, "membership.html"), "utf8");

function loadFaqs() {
  const data = JSON.parse(
    fs.readFileSync(path.join(ROOT, "data", "faqs.json"), "utf8")
  );
  return Array.isArray(data.faqs) ? data.faqs : [];
}

function renderPcareFaqs(pageSlug, currentPath) {
  const faqs = selectRelatedFaqs(loadFaqs(), pageSlug);
  const meta = getPageFaqMeta(pageSlug);
  const items = faqs
    .map((faq, index) => {
      const n = index + 1;
      const qId = `${pageSlug}-faq-q${n}`;
      const aId = `${pageSlug}-faq-a${n}`;
      return `<article class="faq-accordion__item" role="listitem" data-faq-id="${escapeHtml(faq.id)}">
              <h3 class="faq-accordion__heading">
                <button type="button" class="faq-accordion__trigger" id="${qId}" aria-expanded="false" aria-controls="${aId}">
                  <span class="faq-accordion__question">${escapeHtml(faq.question)}</span>
                  <span class="faq-accordion__icon" aria-hidden="true"></span>
                </button>
              </h3>
              <div class="faq-accordion__panel" id="${aId}" role="region" aria-labelledby="${qId}" hidden>
                <div class="faq-accordion__answer">${formatAnswerHtml(faq.answer)}${
                  faq.scripture
                    ? `<p class="faq-accordion__scripture"><em>${escapeHtml(faq.scripture)}</em></p>`
                    : ""
                }</div>
              </div>
            </article>`;
    })
    .join("\n            ");

  return `
      <section class="border-b border-slate-200 bg-white pcare-faqs" id="faqs">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">${escapeHtml(meta.heading)}</h2>
            <p class="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">${escapeHtml(meta.description)}</p>
          </div>
          <div class="faq-accordion mt-8 pcare-reveal" data-faq-accordion role="list">
            ${items}
          </div>
          <div class="mt-10 pcare-reveal">
            <p class="text-sm font-medium text-slate-500 mb-3">Personal Caring</p>
            ${crosslinks(currentPath)}
          </div>
        </div>
      </section>
`;
}

function replaceMeta(html, meta) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${meta.title}</title>`)
    .replace(
      /<meta\s*\n?\s*name="description"\s*\n?\s*content="[\s\S]*?"\s*\n?\s*\/>/,
      `<meta\n      name="description"\n      content="${meta.description}"\n    />`
    )
    .replace(
      /<meta\s*\n?\s*name="keywords"\s*\n?\s*content="[\s\S]*?"\s*\n?\s*\/>/,
      `<meta\n      name="keywords"\n      content="${meta.keywords}"\n    />`
    )
    .replace(
      /<meta property="og:title" content="[\s\S]*?" \/>/,
      `<meta property="og:title" content="${meta.title}" />`
    )
    .replace(
      /<meta\s*\n?\s*property="og:description"\s*\n?\s*content="[\s\S]*?"\s*\n?\s*\/>/,
      `<meta\n      property="og:description"\n      content="${meta.description}"\n    />`
    )
    .replace(
      /<meta property="og:url" content="[\s\S]*?" \/>/,
      `<meta property="og:url" content="${meta.url}" />`
    )
    .replace(
      /<meta name="twitter:title" content="[\s\S]*?" \/>/,
      `<meta name="twitter:title" content="${meta.title}" />`
    )
    .replace(
      /<meta name="twitter:description" content="[\s\S]*?" \/>/,
      `<meta name="twitter:description" content="${meta.description}" />`
    )
    .replace(
      /<link rel="canonical" href="[\s\S]*?" \/>/,
      `<link rel="canonical" href="${meta.url}" />`
    );
}

function updateFooterGrid(html) {
  const footerStart = html.indexOf('id="footer-section"');
  if (footerStart < 0) return html;

  const openRe =
    /<div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-\d[^"]*"[^>]*>/;
  const slice = html.slice(footerStart);
  const openMatch = slice.match(openRe);
  if (!openMatch) return html;

  const start = footerStart + openMatch.index;
  let i = start + openMatch[0].length;
  let depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", i);
    const nextClose = html.indexOf("</div>", i);
    if (nextClose < 0) return html;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
    } else {
      depth -= 1;
      i = nextClose + 6;
    }
  }
  return html.slice(0, start) + getFooterLinksGridHtml().trim() + html.slice(i);
}

function crosslinks(current) {
  const items = [
    { href: "/membership", label: "Membership" },
    { href: "/salvation", label: "Salvation" },
    { href: "/prayer-request", label: "Prayer Request" },
    { href: "/baptism", label: "Baptism" },
    { href: "/marriage", label: "Marriage" },
  ];
  return `<div class="pcare-crosslinks" role="navigation" aria-label="Personal Caring">
            ${items
              .map(
                (i) =>
                  `<a href="${i.href}"${
                    i.href === current
                      ? ' class="is-current" aria-current="page"'
                      : ""
                  }>${i.label}</a>`
              )
              .join("\n            ")}
          </div>`;
}

function buildPage({ file, meta, mainHtml }) {
  const headEnd = chromeSrc.indexOf("</head>") + "</head>".length;
  const headerEnd = chromeSrc.indexOf("</header>") + "</header>".length;
  const footerStart = chromeSrc.indexOf("<!-- Footer -->");
  if (headEnd < 0 || headerEnd < 0 || footerStart < 0) {
    throw new Error("Could not parse membership.html chrome");
  }

  let head = replaceMeta(chromeSrc.slice(0, headEnd), meta);
  const bodyOpenAndHeader = chromeSrc.slice(headEnd, headerEnd);
  let footer = chromeSrc.slice(footerStart);
  footer = updateFooterGrid(footer);
  footer = footer.replace(
    /<script src="js\/main\.js"><\/script>[\s\S]*?<\/html>\s*$/,
    `<script src="js/main.js"></script>
    <script src="js/faq/core.js"></script>
    <script src="js/faq/accordion.js"></script>
    <script src="js/vendor/gsap.min.js"></script>
    <script src="js/vendor/ScrollTrigger.min.js"></script>
    <script src="js/personal-caring.js"></script>
  </body>
</html>
`
  );

  const out = `${head}${bodyOpenAndHeader}

    <main class="main-no-top-gap relative z-10">
${mainHtml}
      <div class="serve-unveil-spacer min-h-screen" aria-hidden="true"></div>
    </main>

    ${footer}`;

  fs.writeFileSync(path.join(ROOT, file), out, "utf8");
  console.log("Wrote", file);
}

const salvationMain = `
      <section class="pcare-hero pcare-hero--banner" id="hero" aria-label="Salvation">
        <div class="pcare-hero__media" aria-hidden="true">
          <img src="assets/salvation-cover.png" alt="" width="1920" height="400" loading="eager" decoding="async" />
        </div>
        <div class="pcare-hero__content">
          <p class="pcare-hero__eyebrow">Personal Caring</p>
          <h1 class="pcare-hero__title">Salvation</h1>
          <p class="pcare-hero__lead">Becoming a follower of Jesus. You can take this step today, wherever you are.</p>
          <div class="pcare-hero__actions">
            <a href="#how-to" class="btn-primary inline-flex rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-accent/70 hover:bg-accentSoft">I have decided</a>
            <a href="#about" class="btn-outline inline-flex rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-800 hover:border-accent hover:text-accentSoft">Learn more</a>
          </div>
        </div>
      </section>

      <nav class="pcare-section-rail" aria-label="Page sections">
        <ul class="pcare-section-rail__list" role="list">
          <li><a href="#about">About</a></li>
          <li><a href="#how-to">How to</a></li>
          <li><a href="#next">Next steps</a></li>
          <li><a href="#resources">Resources</a></li>
          <li><a href="#faqs">FAQs</a></li>
        </ul>
      </nav>

      <section class="border-b border-slate-200 bg-white" id="about">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal pcare-prose">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Take the first step on your journey of faith</h2>
            <p class="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">God loves you so much, just as you are right now. There is nothing you can do to make Him love you more or less. Because of that love, He sent His Son, Jesus, to die to pay the penalty for the sin that separates us from Him. Then He was resurrected. He came back to life as the ultimate victory over sin and death.</p>
            <blockquote class="pcare-scripture">
              &ldquo;Salvation is found in no one else, for there is no other name under heaven given to mankind by which we must be saved.&rdquo;
              <cite>Acts 4:12</cite>
            </blockquote>
            <p class="mt-6 text-sm leading-relaxed text-slate-600 sm:text-base">Salvation is a gift from God. It cannot be earned through our own efforts. You accept this gift by placing your faith in the death and resurrection of Jesus and choosing to live according to His Word. If you are ready to receive this gift and commit your life to Him, you can do that right now.</p>
          </div>
        </div>
      </section>

      <section class="border-b border-slate-200 bg-slate-50" id="how-to">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal max-w-2xl">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Decide to follow Jesus</h2>
            <p class="mt-3 text-sm leading-relaxed text-slate-600">You are a few simple steps away from entering into a relationship with Jesus Christ.</p>
          </div>
          <div class="pcare-steps mt-10">
            <article class="pcare-step">
              <span class="pcare-step__index" aria-hidden="true">01</span>
              <h3>Admit</h3>
              <p>Admit that you are a sinner in need of a Savior, and ask for forgiveness of your sins.</p>
            </article>
            <article class="pcare-step">
              <span class="pcare-step__index" aria-hidden="true">02</span>
              <h3>Believe</h3>
              <p>Believe that Jesus died and rose again to pay the penalty for your sins and give you new life in Him.</p>
            </article>
            <article class="pcare-step">
              <span class="pcare-step__index" aria-hidden="true">03</span>
              <h3>Choose</h3>
              <p>Giving your life to Jesus is the first step. Growing to become more like Christ is a lifelong commitment.</p>
            </article>
          </div>

          <div class="pcare-prayer mt-12 md:mt-16">
            <h3 class="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Salvation prayer</h3>
            <p class="mt-3 text-sm text-slate-600">If you are ready, pray the prayer below. There is nothing special about these exact words. Make them your own. What matters is a genuine need for God, belief in Jesus, and a commitment to Him.</p>
            <div class="pcare-prayer__body">
              <p>Heavenly Father,</p>
              <p>I come to you as a sinner in need of a Savior. I believe that Jesus Christ is the Son of God and the Savior of the world. Today, I make Jesus the Lord of my life. I believe He died so I could be forgiven and rose again to give me life. I receive this new life. This is my new beginning. I am a child of God.</p>
              <p>Amen.</p>
            </div>
            <div class="pcare-congrats">
              <h4 class="text-lg font-semibold text-slate-900">Congratulations on making the best decision of your life</h4>
              <p class="mt-3 text-sm leading-relaxed text-slate-600">When you decide to follow Christ, you get a new beginning. You are not just a better version of yourself. You are new. For whatever has held you back, there is healing and freedom in Christ. You are no longer walking alone. God&apos;s presence is with you every step of the way.</p>
              <blockquote class="pcare-scripture">
                Therefore, if anyone is in Christ, the new creation has come: the old has gone, the new is here!
                <cite>2 Corinthians 5:17 (NIV)</cite>
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      <section class="border-b border-slate-200 bg-white" id="next">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal max-w-2xl">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Begin your journey of faith</h2>
            <p class="mt-3 text-sm leading-relaxed text-slate-600">You have taken the first step. Here is what to do next at River of Life.</p>
          </div>
          <div class="pcare-next mt-10">
            <div class="pcare-next__item pcare-reveal">
              <h3>Grow with a community</h3>
              <p>Get connected with believers who will walk alongside you. Join us on Sunday, or find a Cell Fellowship near you in Bangalore.</p>
              <a href="/fellowship">Explore Cell Fellowship <span aria-hidden="true">→</span></a>
            </div>
            <div class="pcare-next__item pcare-next__item--alt pcare-reveal">
              <h3>Take the next step of baptism</h3>
              <p>Baptism is the outward declaration of your inward decision to follow Christ. We would love to walk with you.</p>
              <a href="/baptism">Learn about baptism <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </div>
      </section>

      <section class="border-b border-slate-200 bg-slate-50" id="resources">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Resources</h2>
            <p class="mt-3 max-w-xl text-sm text-slate-600">Helpful next steps as you grow in faith with ROLCC.</p>
          </div>
          <div class="pcare-resources mt-8 pcare-reveal">
            <a href="/bible-study">
              <span>
                <span class="pcare-resources__title">Bible Study</span>
                <span class="pcare-resources__desc">Learn the basics of faith through Scripture, one passage at a time.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
            <a href="/articles">
              <span>
                <span class="pcare-resources__title">Articles</span>
                <span class="pcare-resources__desc">Everyday Faith and Back to the Bible writing from our church family.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
            <a href="/sermons">
              <span>
                <span class="pcare-resources__title">Latest Sermon</span>
                <span class="pcare-resources__desc">Listen and grow through the Word preached at ROLCC.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
            <a href="/membership">
              <span>
                <span class="pcare-resources__title">Membership &amp; Church Care</span>
                <span class="pcare-resources__desc">Belong, grow, and walk with us through life&apos;s milestones.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
            <a href="/about">
              <span>
                <span class="pcare-resources__title">About ROLCC</span>
                <span class="pcare-resources__desc">Discover the beliefs and values that guide our church.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

${renderPcareFaqs("salvation", "/salvation")}
`;

function shellMain({
  title,
  lead,
  body,
  ctaHref,
  ctaLabel,
  current,
  image,
  imageAlt,
}) {
  return `
      <section class="pcare-hero" id="hero">
        <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div class="pcare-hero__grid">
            <div class="pcare-hero__content">
              <p class="pcare-hero__eyebrow">Personal Caring</p>
              <h1 class="pcare-hero__title">${title}</h1>
              <p class="pcare-hero__lead">${lead}</p>
              <div class="pcare-hero__actions">
                <a href="${ctaHref}" class="btn-primary inline-flex rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-accent/70 hover:bg-accentSoft">${ctaLabel}</a>
                <a href="/salvation" class="btn-outline inline-flex rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-800 hover:border-accent hover:text-accentSoft">About salvation</a>
              </div>
            </div>
            <div class="pcare-hero__visual">
              <img src="${image}" alt="${imageAlt}" width="1200" height="800" loading="eager" />
            </div>
          </div>
        </div>
      </section>

      <section class="border-b border-slate-200 bg-white" id="about">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal pcare-prose">
            ${body}
          </div>
          <div class="mt-10 pcare-reveal">
            <p class="text-sm font-medium text-slate-500 mb-3">Personal Caring</p>
            ${crosslinks(current)}
          </div>
        </div>
      </section>
`;
}

buildPage({
  file: "salvation.html",
  meta: {
    title:
      "Salvation | Follow Jesus | River of Life Christian Church, Bangalore",
    description:
      "Learn what salvation means and how to begin a relationship with Jesus. Prayer, next steps, baptism, and community at River of Life Christian Church in Bangalore.",
    keywords: "salvation, follow Jesus, gospel, baptism, ROLCC Bangalore",
    url: "https://www.rolcc.in/salvation",
  },
  mainHtml: salvationMain,
});

const prayerMain = `
      <section class="pcare-hero pcare-hero--banner pcare-hero--banner-dark" id="hero" aria-label="Prayer Request">
        <div class="pcare-hero__media" aria-hidden="true">
          <img src="assets/prayer-cover.png" alt="" width="1920" height="400" loading="eager" decoding="async" />
        </div>
        <div class="pcare-hero__content">
          <p class="pcare-hero__eyebrow">Personal Caring</p>
          <h1 class="pcare-hero__title">Prayer Request</h1>
          <p class="pcare-hero__lead">You do not have to carry it alone. We will pray with you.</p>
          <p class="pcare-hero__verse">Philippians 4:6-7</p>
          <div class="pcare-hero__actions">
            <a href="/contact" class="btn-primary inline-flex rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-accent/70 hover:bg-accentSoft">Send a prayer request</a>
            <a href="#about" class="btn-outline inline-flex rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-800 hover:border-accent hover:text-accentSoft">Learn more</a>
          </div>
        </div>
      </section>

      <nav class="pcare-section-rail" aria-label="Page sections">
        <ul class="pcare-section-rail__list" role="list">
          <li><a href="#about">About</a></li>
          <li><a href="#how-we-help">How we help</a></li>
          <li><a href="#next">Next steps</a></li>
          <li><a href="#resources">Resources</a></li>
          <li><a href="#faqs">FAQs</a></li>
        </ul>
      </nav>

      <section class="border-b border-slate-200 bg-white" id="about">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal pcare-prose">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Bring your need to God with us</h2>
            <p class="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">Whether you are facing a personal challenge, caring for family, walking through illness, anxiety, grief, or simply need someone to stand with you in faith, our church family is here. You do not need perfect words. Share what is on your heart, and we will pray.</p>
            <blockquote class="pcare-scripture">
              &ldquo;Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.&rdquo;
              <cite>Philippians 4:6-7 (NIV)</cite>
            </blockquote>
            <p class="mt-6 text-sm leading-relaxed text-slate-600 sm:text-base">At River of Life, prayer is part of how we care for one another. Reach out through Contact, speak with a pastor after service, or share your need so someone can follow up with you.</p>
          </div>
        </div>
      </section>

      <section class="border-b border-slate-200 bg-slate-50" id="how-we-help">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal max-w-2xl">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">How we pray with you</h2>
            <p class="mt-3 text-sm leading-relaxed text-slate-600">Simple ways to ask for prayer and receive care.</p>
          </div>
          <div class="pcare-steps mt-10">
            <article class="pcare-step">
              <span class="pcare-step__index" aria-hidden="true">01</span>
              <h3>Share</h3>
              <p>Send a prayer request through Contact. Tell us as much or as little as you are comfortable sharing. Confidentiality is treated with care.</p>
            </article>
            <article class="pcare-step">
              <span class="pcare-step__index" aria-hidden="true">02</span>
              <h3>Pray</h3>
              <p>Our team and prayer partners will lift your need to God. Where appropriate, a pastor or care lead may follow up with you.</p>
            </article>
            <article class="pcare-step">
              <span class="pcare-step__index" aria-hidden="true">03</span>
              <h3>Walk together</h3>
              <p>If you need ongoing support, we can connect you with Cell Fellowship, pastoral conversation, or counselling.</p>
            </article>
          </div>

          <div class="pcare-prayer mt-12 md:mt-16">
            <h3 class="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">A short prayer you can use</h3>
            <p class="mt-3 text-sm text-slate-600">If you are unsure what to say, start here. Make the words your own.</p>
            <div class="pcare-prayer__body">
              <p>Heavenly Father,</p>
              <p>I bring this need to You. You see what I cannot fix and You know what I carry. Give me Your peace, guide my steps, and help me trust You today. Thank You that I am not alone.</p>
              <p>In Jesus&apos; name, Amen.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="border-b border-slate-200 bg-white" id="next">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal max-w-2xl">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Take the next step</h2>
            <p class="mt-3 text-sm leading-relaxed text-slate-600">Ask for prayer, or find deeper care if you need someone to walk with you.</p>
          </div>
          <div class="pcare-next mt-10">
            <div class="pcare-next__item pcare-reveal">
              <h3>Send a prayer request</h3>
              <p>Share your request through Contact. Choose &ldquo;Prayer Request&rdquo; as the topic so our team can respond with care.</p>
              <a href="/contact">Contact us <span aria-hidden="true">→</span></a>
            </div>
            <div class="pcare-next__item pcare-next__item--alt pcare-reveal">
              <h3>Need pastoral counselling?</h3>
              <p>If you need a confidential conversation beyond a prayer request, our counselling team is here to help.</p>
              <a href="/counselling">Explore counselling <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </div>
      </section>

      <section class="border-b border-slate-200 bg-slate-50" id="resources">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Resources</h2>
            <p class="mt-3 max-w-xl text-sm text-slate-600">Other ways to find support and grow in faith at ROLCC.</p>
          </div>
          <div class="pcare-resources mt-8 pcare-reveal">
            <a href="/counselling">
              <span>
                <span class="pcare-resources__title">Counselling</span>
                <span class="pcare-resources__desc">Confidential pastoral support for crisis, family, and spiritual needs.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
            <a href="/fellowship">
              <span>
                <span class="pcare-resources__title">Cell Fellowship</span>
                <span class="pcare-resources__desc">A safe place to be known, encouraged, and prayed for over time.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
            <a href="/salvation">
              <span>
                <span class="pcare-resources__title">Salvation</span>
                <span class="pcare-resources__desc">If you are seeking hope in Jesus, start here.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
            <a href="/membership">
              <span>
                <span class="pcare-resources__title">Membership &amp; Church Care</span>
                <span class="pcare-resources__desc">Pastoral care through life&apos;s milestones.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
            <a href="/contact">
              <span>
                <span class="pcare-resources__title">Contact ROLCC</span>
                <span class="pcare-resources__desc">Reach our team in HSR Layout, Bangalore.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

${renderPcareFaqs("prayer-request", "/prayer-request")}
`;

buildPage({
  file: "prayer-request.html",
  meta: {
    title:
      "Prayer Request | We Will Pray With You | River of Life Christian Church, Bangalore",
    description:
      "Share a prayer request with River of Life Christian Church. We would be honoured to pray with you and walk alongside you in Bangalore.",
    keywords: "prayer request Bangalore, church prayer, pastoral care, ROLCC",
    url: "https://www.rolcc.in/prayer-request",
  },
  mainHtml: prayerMain,
});

const baptismMain = `
      <section class="pcare-hero pcare-hero--banner" id="hero" aria-label="Baptism">
        <div class="pcare-hero__media" aria-hidden="true">
          <img src="assets/baptism-cover.png" alt="" width="1920" height="400" loading="eager" decoding="async" />
        </div>
        <div class="pcare-hero__content">
          <p class="pcare-hero__eyebrow">Personal Caring</p>
          <h1 class="pcare-hero__title">Baptism</h1>
          <p class="pcare-hero__lead">An outward declaration of your inward decision to follow Christ.</p>
          <div class="pcare-hero__actions">
            <a href="/contact" class="btn-primary inline-flex rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-accent/70 hover:bg-accentSoft">Arrange baptism</a>
            <a href="#about" class="btn-outline inline-flex rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-800 hover:border-accent hover:text-accentSoft">Learn more</a>
          </div>
        </div>
      </section>

      <nav class="pcare-section-rail" aria-label="Page sections">
        <ul class="pcare-section-rail__list" role="list">
          <li><a href="#about">About</a></li>
          <li><a href="#how-we-help">How we help</a></li>
          <li><a href="#next">Next steps</a></li>
          <li><a href="#resources">Resources</a></li>
          <li><a href="#faqs">FAQs</a></li>
        </ul>
      </nav>

      <section class="border-b border-slate-200 bg-white" id="about">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal pcare-prose">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Why baptism matters</h2>
            <p class="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">Baptism is not the source of salvation. It is a step of obedience that follows Jesus&apos; example and publicly aligns your life with God&apos;s Word. When you have decided to follow Christ, baptism is how you declare that decision before God and His people.</p>
            <blockquote class="pcare-scripture">
              &ldquo;We were therefore buried with him through baptism into death in order that, just as Christ was raised from the dead through the glory of the Father, we too may live a new life.&rdquo;
              <cite>Romans 6:4 (NIV)</cite>
            </blockquote>
            <p class="mt-6 text-sm leading-relaxed text-slate-600 sm:text-base">At River of Life, we would love to walk with you through baptism preparation and the ceremony. Whether you are new to faith or ready to take this public step after years of walking with Jesus, you are welcome.</p>
          </div>
        </div>
      </section>

      <section class="border-b border-slate-200 bg-slate-50" id="how-we-help">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal max-w-2xl">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">How baptism works at ROLCC</h2>
            <p class="mt-3 text-sm leading-relaxed text-slate-600">Simple next steps so you can prepare with clarity and confidence.</p>
          </div>
          <div class="pcare-steps mt-10">
            <article class="pcare-step">
              <span class="pcare-step__index" aria-hidden="true">01</span>
              <h3>Believe</h3>
              <p>Baptism follows faith in Jesus. If you have received Him as Lord and Savior, baptism is the natural next step of obedience.</p>
            </article>
            <article class="pcare-step">
              <span class="pcare-step__index" aria-hidden="true">02</span>
              <h3>Prepare</h3>
              <p>Our pastoral team will help you understand what baptism means, answer questions, and walk with you through preparation for the day.</p>
            </article>
            <article class="pcare-step">
              <span class="pcare-step__index" aria-hidden="true">03</span>
              <h3>Declare</h3>
              <p>In the ceremony, you publicly declare your faith. Your church family celebrates with you as you begin this new chapter of obedience.</p>
            </article>
          </div>

          <div class="pcare-prayer mt-12 md:mt-16">
            <h3 class="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">A prayer before baptism</h3>
            <p class="mt-3 text-sm text-slate-600">You can pray this as you prepare, or use your own words.</p>
            <div class="pcare-prayer__body">
              <p>Heavenly Father,</p>
              <p>Thank You for the gift of salvation through Jesus. As I prepare for baptism, help me follow You with a sincere heart. Let this step honour You, strengthen my faith, and remind me that I belong to Christ. Give me courage to declare what You have done in my life.</p>
              <p>In Jesus&apos; name, Amen.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="border-b border-slate-200 bg-white" id="next">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal max-w-2xl">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Take the next step</h2>
            <p class="mt-3 text-sm leading-relaxed text-slate-600">Ready to be baptised, or still exploring faith? We are here for both.</p>
          </div>
          <div class="pcare-next mt-10">
            <div class="pcare-next__item pcare-reveal">
              <h3>Arrange your baptism</h3>
              <p>Contact our team to begin baptism preparation. We will guide you through dates, pastoral conversation, and the ceremony.</p>
              <a href="/contact">Contact us <span aria-hidden="true">→</span></a>
            </div>
            <div class="pcare-next__item pcare-next__item--alt pcare-reveal">
              <h3>Still deciding about Jesus?</h3>
              <p>Baptism follows a decision to follow Christ. If you are still exploring salvation, start there first.</p>
              <a href="/salvation">About salvation <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </div>
      </section>

      <section class="border-b border-slate-200 bg-slate-50" id="resources">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Resources</h2>
            <p class="mt-3 max-w-xl text-sm text-slate-600">Helpful next steps as you grow in faith at ROLCC.</p>
          </div>
          <div class="pcare-resources mt-8 pcare-reveal">
            <a href="/salvation">
              <span>
                <span class="pcare-resources__title">Salvation</span>
                <span class="pcare-resources__desc">Understand the decision to follow Jesus before baptism.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
            <a href="/membership">
              <span>
                <span class="pcare-resources__title">Membership &amp; Church Care</span>
                <span class="pcare-resources__desc">Baptism and other milestones we walk through with you.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
            <a href="/fellowship">
              <span>
                <span class="pcare-resources__title">Cell Fellowship</span>
                <span class="pcare-resources__desc">Grow with believers who will encourage your walk with Christ.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
            <a href="/bible-study">
              <span>
                <span class="pcare-resources__title">Bible Study</span>
                <span class="pcare-resources__desc">Keep growing in Scripture after your baptism.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
            <a href="/contact">
              <span>
                <span class="pcare-resources__title">Contact ROLCC</span>
                <span class="pcare-resources__desc">Reach our team in HSR Layout, Bangalore.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

${renderPcareFaqs("baptism", "/baptism")}
`;

buildPage({
  file: "baptism.html",
  meta: {
    title:
      "Baptism | Follow Jesus Publicly | River of Life Christian Church, Bangalore",
    description:
      "Baptism at River of Life Christian Church is a public declaration of faith in Jesus. Learn why it matters and how to arrange baptism in Bangalore.",
    keywords: "baptism Bangalore, church baptism, ROLCC, believer baptism",
    url: "https://www.rolcc.in/baptism",
  },
  mainHtml: baptismMain,
});

const marriageMain = `
      <section class="pcare-hero pcare-hero--banner" id="hero" aria-label="Marriage">
        <div class="pcare-hero__media" aria-hidden="true">
          <img src="assets/marriage-cover.png" alt="" width="1920" height="400" loading="eager" decoding="async" />
        </div>
        <div class="pcare-hero__content">
          <p class="pcare-hero__eyebrow">Personal Caring</p>
          <h1 class="pcare-hero__title">Marriage</h1>
          <p class="pcare-hero__lead">A three-strand cord is not quickly broken.</p>
          <p class="pcare-hero__verse">Ecclesiastes 4:12</p>
          <div class="pcare-hero__actions">
            <a href="/contact" class="btn-primary inline-flex rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-accent/70 hover:bg-accentSoft">Talk with us</a>
            <a href="#about" class="btn-outline inline-flex rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-800 hover:border-accent hover:text-accentSoft">Learn more</a>
          </div>
        </div>
      </section>

      <nav class="pcare-section-rail" aria-label="Page sections">
        <ul class="pcare-section-rail__list" role="list">
          <li><a href="#about">About</a></li>
          <li><a href="#how-we-help">How we help</a></li>
          <li><a href="#next">Next steps</a></li>
          <li><a href="#resources">Resources</a></li>
          <li><a href="#faqs">FAQs</a></li>
        </ul>
      </nav>

      <section class="border-b border-slate-200 bg-white" id="about">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal pcare-prose">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Built to last with God at the centre</h2>
            <p class="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">Marriage is a covenant, not only a ceremony. Scripture paints a simple picture: two people walking together are stronger than one, and with God as the third strand, the bond holds when life pulls hard.</p>
            <blockquote class="pcare-scripture">
              &ldquo;A three-strand cord is not quickly broken.&rdquo;
              <cite>Ecclesiastes 4:12</cite>
            </blockquote>
            <p class="mt-6 text-sm leading-relaxed text-slate-600 sm:text-base">At River of Life, we want couples to begin and grow marriage with Christ, community, and clear pastoral care. Whether you are preparing for a wedding, seeking guidance for your betrothal, or needing support in your marriage today, we are here to walk with you.</p>
          </div>
        </div>
      </section>

      <section class="border-b border-slate-200 bg-slate-50" id="how-we-help">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal max-w-2xl">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">How we support couples</h2>
            <p class="mt-3 text-sm leading-relaxed text-slate-600">Practical care rooted in Scripture, from preparation through the years that follow.</p>
          </div>
          <div class="pcare-steps mt-10">
            <article class="pcare-step">
              <span class="pcare-step__index" aria-hidden="true">01</span>
              <h3>Prepare</h3>
              <p>Pre-marital counselling and pastoral conversations help you build foundations of faith, communication, and shared commitment before the wedding day.</p>
            </article>
            <article class="pcare-step">
              <span class="pcare-step__index" aria-hidden="true">02</span>
              <h3>Celebrate</h3>
              <p>We are honoured to support church weddings and ceremonies. Reach out early so we can walk with you through dates, preparation, and pastoral arrangements.</p>
            </article>
            <article class="pcare-step">
              <span class="pcare-step__index" aria-hidden="true">03</span>
              <h3>Grow</h3>
              <p>Marriage continues after the altar. Through fellowship, prayer, and counselling when needed, we want your home to grow stronger in Christ.</p>
            </article>
          </div>

          <div class="pcare-prayer mt-12 md:mt-16">
            <h3 class="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">A prayer for your marriage</h3>
            <p class="mt-3 text-sm text-slate-600">You can pray this together, or make the words your own.</p>
            <div class="pcare-prayer__body">
              <p>Heavenly Father,</p>
              <p>Thank You for the gift of marriage. Be the third strand in our covenant. Teach us to love one another as Christ loves the church, to forgive quickly, to speak with kindness, and to seek You first in every season. Strengthen what is weak, heal what is hurting, and help our home honour You.</p>
              <p>In Jesus&apos; name, Amen.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="border-b border-slate-200 bg-white" id="next">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal max-w-2xl">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Take the next step</h2>
            <p class="mt-3 text-sm leading-relaxed text-slate-600">Tell us where you are in the journey. We will help you find the right support.</p>
          </div>
          <div class="pcare-next mt-10">
            <div class="pcare-next__item pcare-reveal">
              <h3>Arrange a wedding conversation</h3>
              <p>Planning a ceremony or need pastoral guidance for your wedding? Contact our team and we will follow up with care.</p>
              <a href="/contact">Contact us <span aria-hidden="true">→</span></a>
            </div>
            <div class="pcare-next__item pcare-next__item--alt pcare-reveal">
              <h3>Pre-marital counselling</h3>
              <p>Prepare well with confidential pastoral counselling before marriage. A safe space to grow in unity and faith.</p>
              <a href="/counselling">Explore counselling <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </div>
      </section>

      <section class="border-b border-slate-200 bg-slate-50" id="resources">
        <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div class="pcare-reveal">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Resources</h2>
            <p class="mt-3 max-w-xl text-sm text-slate-600">Helpful next steps for couples and families at ROLCC.</p>
          </div>
          <div class="pcare-resources mt-8 pcare-reveal">
            <a href="/counselling">
              <span>
                <span class="pcare-resources__title">Counselling</span>
                <span class="pcare-resources__desc">Pre-marital, marriage, and pastoral support in a confidential setting.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
            <a href="/membership">
              <span>
                <span class="pcare-resources__title">Membership &amp; Church Care</span>
                <span class="pcare-resources__desc">Weddings, anniversaries, and care through life&apos;s milestones.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
            <a href="/fellowship">
              <span>
                <span class="pcare-resources__title">Cell Fellowship</span>
                <span class="pcare-resources__desc">Grow with other believers who will encourage your home and faith.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
            <a href="/prayer-request">
              <span>
                <span class="pcare-resources__title">Prayer Request</span>
                <span class="pcare-resources__desc">Ask our church family to pray with you for your relationship or marriage.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
            <a href="/contact">
              <span>
                <span class="pcare-resources__title">Contact ROLCC</span>
                <span class="pcare-resources__desc">Reach our team in HSR Layout, Bangalore.</span>
              </span>
              <span class="pcare-resources__arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

${renderPcareFaqs("marriage", "/marriage")}
`;

buildPage({
  file: "marriage.html",
  meta: {
    title:
      "Marriage | A Three-Strand Cord | River of Life Christian Church, Bangalore",
    description:
      "A three-strand cord is not quickly broken (Ecclesiastes 4:12). Church wedding support, pre-marital counselling, and marriage care at River of Life Christian Church, Bangalore.",
    keywords:
      "Christian marriage Bangalore, church wedding, Ecclesiastes 4:12, pre-marital counselling, ROLCC",
    url: "https://www.rolcc.in/marriage",
  },
  mainHtml: marriageMain,
});
