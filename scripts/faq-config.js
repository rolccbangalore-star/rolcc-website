/** FAQ build/runtime configuration */

const PER_PAGE = 20;
const RELATED_COUNT = 8;
const MAX_PUBLISHED_ID = 150;

const CONFIDENCE_WEIGHT = {
  High: 3,
  Medium: 2,
  Low: 1,
};

/** Maps site page slugs to FAQ categories for related FAQs */
const PAGE_CATEGORY_MAP = {
  index: ["General", "Finding & Visiting Church"],
  about: ["Finding & Visiting Church", "General"],
  services: ["Finding & Visiting Church", "Serving & Ministry", "General"],
  "river-kids": ["Families & Children", "General"],
  fellowship: ["Finding & Visiting Church", "General"],
  pmd: ["Serving & Ministry", "General"],
  counselling: ["Care & Hope", "General"],
  rolf: ["Care & Hope", "Serving & Ministry"],
  giving: ["General", "Serving & Ministry"],
  events: ["General", "Finding & Visiting Church"],
  membership: ["Finding & Visiting Church", "General"],
  contact: ["General", "Care & Hope", "Finding & Visiting Church"],
};

const HTML_PAGE_SLUGS = {
  "index.html": "index",
  "about.html": "about",
  "services.html": "services",
  "river-kids.html": "river-kids",
  "fellowship.html": "fellowship",
  "pmd.html": "pmd",
  "counselling.html": "counselling",
  "rolf.html": "rolf",
  "giving.html": "giving",
  "events.html": "events",
  "membership.html": "membership",
  "contact.html": "contact",
};

function faqNumber(id) {
  const match = /^Q(\d+)$/i.exec(String(id || "").trim());
  return match ? parseInt(match[1], 10) : Infinity;
}

function isApprovedFaq(record) {
  const status = (record.Status || "").trim().toLowerCase();
  if (status === "approved") return true;
  const num = faqNumber(record.ID);
  return num <= MAX_PUBLISHED_ID && (record.Answer || "").trim().length > 0;
}

function confidenceScore(record) {
  return CONFIDENCE_WEIGHT[record.Confidence] || 0;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatAnswerHtml(text) {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

module.exports = {
  PER_PAGE,
  RELATED_COUNT,
  PAGE_CATEGORY_MAP,
  HTML_PAGE_SLUGS,
  faqNumber,
  isApprovedFaq,
  confidenceScore,
  escapeHtml,
  formatAnswerHtml,
};
