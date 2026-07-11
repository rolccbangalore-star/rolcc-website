const fs = require("fs");
const path = require("path");
const { SITE_ORIGIN, articleCanonical } = require("./article-config");

const ROOT = path.join(__dirname, "..");

function writeSitemap({ articles = [], faqTotalPages = 1, sermonsTotalPages = 1, today } = {}) {
  const TODAY = today || new Date().toISOString().slice(0, 10);
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

  for (let i = 1; i <= sermonsTotalPages; i++) {
    const loc = i === 1 ? "/sermons" : `/sermons/${i}`;
    urls.push(
      `  <url>\n    <loc>${SITE_ORIGIN}${loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${i === 1 ? "0.8" : "0.6"}</priority>\n  </url>`
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

function loadArticlesFromManifest() {
  const manifestPath = path.join(ROOT, "data", "articles.json");
  if (!fs.existsSync(manifestPath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return data.articles || [];
  } catch {
    return [];
  }
}

module.exports = { writeSitemap, loadArticlesFromManifest };
