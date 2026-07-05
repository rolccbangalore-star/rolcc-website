/** Articles build/runtime configuration */

const ARTICLES_PER_PAGE = 12;
const LATEST_COUNT = 6;
const FEATURED_MAX = 3;
const RELATED_COUNT = 3;
const WORDS_PER_MINUTE = 200;
const SITE_ORIGIN = "https://www.rolcc.in";
const DEFAULT_THUMBNAIL = "/images/og-image.jpg";

const ARTICLE_CATEGORIES = [
  "Faith & Peace",
  "Work & Calling",
  "Relationships",
  "Prayer",
  "Family",
  "General",
];

const TYPE_LABELS = {
  "everyday-faith": "Everyday Faith",
  "back-to-bible": "Back to the Bible",
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function computeReadTime(text) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function articleUrl(article) {
  return `/articles/${article.type}/${article.slug}`;
}

function articleCanonical(article) {
  return `${SITE_ORIGIN}${articleUrl(article)}`;
}

function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) return { meta: {}, body: raw.trim() };

  const meta = {};
  match[1].split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf(":");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val === "true") meta[key] = true;
    else if (val === "false") meta[key] = false;
    else meta[key] = val;
  });
  return { meta, body: match[2].trim() };
}

function markdownToHtml(md) {
  const lines = String(md || "").split(/\r?\n/);
  const out = [];
  let inList = false;

  function closeList() {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  }

  function inline(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      closeList();
      continue;
    }
    if (trimmed === "---") {
      closeList();
      out.push('<hr class="article-prose__rule" />');
      continue;
    }
    if (trimmed.startsWith("> ")) {
      closeList();
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteLines.push(lines[i].trim().slice(2));
        i += 1;
      }
      i -= 1;
      out.push(`<blockquote class="article-prose__quote"><p>${inline(quoteLines.join(" "))}</p></blockquote>`);
      continue;
    }
    if (trimmed.startsWith("### ")) {
      closeList();
      out.push(`<h3>${inline(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      closeList();
      out.push(`<h2>${inline(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(trimmed.slice(2))}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(trimmed)}</p>`);
  }
  closeList();
  return out.join("\n");
}

function inlineMarkdown(text) {
  return escapeHtml(String(text || ""))
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function youtubeEmbedId(url) {
  const value = String(url || "").trim();
  if (!value) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function safeHref(url) {
  const value = String(url || "").trim();
  if (!value) return null;
  if (value.startsWith("/")) return value;
  if (value.startsWith("https://") || value.startsWith("http://")) return value;
  return null;
}

function normalizeBlock(block) {
  if (!block || typeof block !== "object") return null;
  if (block.type) return block;
  const keys = Object.keys(block).filter((k) => !k.startsWith("_"));
  if (keys.length === 1 && typeof block[keys[0]] === "object") {
    return { type: keys[0], ...block[keys[0]] };
  }
  return block;
}

function normalizeStringList(items) {
  return (items || [])
    .map((item) => (typeof item === "string" ? item : item.item || item.text || ""))
    .filter(Boolean);
}

function collectBlockText(blocks) {
  const parts = [];
  (blocks || []).forEach((raw) => {
    const block = normalizeBlock(raw);
    if (!block) return;
    switch (block.type) {
      case "paragraph":
      case "quote":
        parts.push(block.text);
        break;
      case "heading":
        parts.push(block.text);
        break;
      case "list":
        parts.push(...normalizeStringList(block.items));
        break;
      case "faq":
        (block.items || []).forEach((item) => {
          parts.push(item.question, item.answer);
        });
        if (block.question) parts.push(block.question, block.answer);
        break;
      case "image":
        parts.push(block.alt, block.caption);
        break;
      case "scripture":
        parts.push(block.reference, block.text);
        break;
      case "cta":
        parts.push(block.label, block.text);
        break;
      case "video":
        parts.push(block.title, block.caption);
        break;
      default:
        break;
    }
  });
  return parts.filter(Boolean).join(" ");
}

function renderBlocks(blocks) {
  const out = [];
  (blocks || []).forEach((raw) => {
    const block = normalizeBlock(raw);
    if (!block?.type) return;

    switch (block.type) {
      case "paragraph":
        out.push(`<p>${inlineMarkdown(block.text)}</p>`);
        break;
      case "heading": {
        const level = block.level === "3" || block.level === 3 ? 3 : 2;
        out.push(`<h${level}>${escapeHtml(block.text)}</h${level}>`);
        break;
      }
      case "quote":
        out.push(`<blockquote class="article-prose__quote">
          <p>${inlineMarkdown(block.text)}</p>
          ${block.attribution ? `<cite class="article-prose__quote-cite">${escapeHtml(block.attribution)}</cite>` : ""}
        </blockquote>`);
        break;
      case "image":
        out.push(`<figure class="article-figure">
          <img class="article-figure__img" src="${escapeHtml(block.src || "")}" alt="${escapeHtml(block.alt || "")}" loading="lazy" width="960" height="540" />
          ${block.caption ? `<figcaption class="article-figure__caption">${escapeHtml(block.caption)}</figcaption>` : ""}
        </figure>`);
        break;
      case "list":
        out.push(
          `<ul class="article-prose__list">${normalizeStringList(block.items)
            .map((item) => `<li>${inlineMarkdown(item)}</li>`)
            .join("")}</ul>`
        );
        break;
      case "faq": {
        const items = block.items?.length
          ? block.items
          : block.question
            ? [{ question: block.question, answer: block.answer }]
            : [];
        if (!items.length) break;
        out.push(`<div class="article-faq">
          ${items
            .map(
              (item) => `<div class="article-faq__item">
            <h3 class="article-faq__question">${escapeHtml(item.question)}</h3>
            <p class="article-faq__answer">${inlineMarkdown(item.answer)}</p>
          </div>`
            )
            .join("")}
        </div>`);
        break;
      }
      case "scripture":
        out.push(`<aside class="article-scripture" aria-label="Scripture">
          ${block.reference ? `<p class="article-scripture__ref">${escapeHtml(block.reference)}</p>` : ""}
          <p class="article-scripture__text">${inlineMarkdown(block.text)}</p>
        </aside>`);
        break;
      case "cta": {
        const href = safeHref(block.url);
        if (!href) break;
        const style = block.style === "secondary" ? "article-cta--secondary" : "";
        out.push(`<div class="article-cta ${style}">
          ${block.text ? `<p class="article-cta__text">${inlineMarkdown(block.text)}</p>` : ""}
          <a class="article-cta__btn" href="${escapeHtml(href)}">${escapeHtml(block.label || "Learn more")}</a>
        </div>`);
        break;
      }
      case "video": {
        const videoId = youtubeEmbedId(block.url);
        if (!videoId) break;
        const title = escapeHtml(block.title || "Video");
        out.push(`<figure class="article-video">
          <div class="article-video__frame">
            <iframe src="https://www.youtube-nocookie.com/embed/${videoId}" title="${title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>
          ${block.caption ? `<figcaption class="article-video__caption">${escapeHtml(block.caption)}</figcaption>` : ""}
        </figure>`);
        break;
      }
      default:
        break;
    }
  });
  return out.join("\n");
}

function renderArticleMetaBar(article) {
  return `<div class="article-meta">
    <span class="article-tag">${escapeHtml(article.category)}</span>
    <span class="article-meta__item">${escapeHtml(article.author)}</span>
    <span class="article-meta__item">${escapeHtml(article.dateFormatted)}</span>
    <span class="article-meta__item">${article.readTime} min read</span>
    ${article.scripture ? `<span class="article-meta__item article-meta__scripture">${escapeHtml(article.scripture)}</span>` : ""}
  </div>`;
}

function renderSummaryBox(summary) {
  if (!summary) return "";
  return `<div class="article-summary">
    <p class="article-summary__label">Summary</p>
    <p class="article-summary__text">${inlineMarkdown(summary)}</p>
  </div>`;
}

function renderKeyTakeaways(items) {
  const list = normalizeStringList(items);
  if (!list.length) return "";
  return `<aside class="article-takeaways" aria-label="Key takeaways">
    <p class="article-takeaways__label">Key takeaways</p>
    <ul class="article-takeaways__list">${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>
  </aside>`;
}

function selectRelatedArticles(articles, current) {
  const others = articles.filter((a) => !(a.type === current.type && a.slug === current.slug));
  const sameType = others.filter((a) => a.type === current.type);
  const sameCategory = sameType.filter((a) => a.category && a.category === current.category);
  const pool = [...sameCategory, ...sameType.filter((a) => !sameCategory.includes(a)), ...others];
  const picked = [];
  const seen = new Set();
  for (const a of pool) {
    const key = `${a.type}:${a.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(a);
    if (picked.length >= RELATED_COUNT) break;
  }
  return picked;
}

function getPrevNext(articles, current) {
  const sameType = articles
    .filter((a) => a.type === current.type)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const idx = sameType.findIndex((a) => a.slug === current.slug);
  return {
    prev: idx > 0 ? sameType[idx - 1] : null,
    next: idx >= 0 && idx < sameType.length - 1 ? sameType[idx + 1] : null,
  };
}

module.exports = {
  ARTICLES_PER_PAGE,
  LATEST_COUNT,
  FEATURED_MAX,
  RELATED_COUNT,
  SITE_ORIGIN,
  DEFAULT_THUMBNAIL,
  ARTICLE_CATEGORIES,
  TYPE_LABELS,
  escapeHtml,
  computeReadTime,
  formatDate,
  articleUrl,
  articleCanonical,
  parseFrontmatter,
  markdownToHtml,
  normalizeBlock,
  normalizeStringList,
  collectBlockText,
  renderBlocks,
  renderArticleMetaBar,
  renderSummaryBox,
  renderKeyTakeaways,
  selectRelatedArticles,
  getPrevNext,
};
