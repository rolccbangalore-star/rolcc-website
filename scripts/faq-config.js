/** FAQ build/runtime configuration */

const PER_PAGE = 20;
const RELATED_COUNT = 8;
const MAX_PUBLISHED_ID = 150;

const CONFIDENCE_WEIGHT = {
  High: 3,
  Medium: 2,
  Low: 1,
};

/** User-facing filter chips (SEO + search intent) */
const FAQ_CHIP_TOPICS = [
  { id: "visiting", label: "Visiting & First Time" },
  { id: "about-church", label: "About ROLCC" },
  { id: "belonging-community", label: "Belonging & Community" },
  { id: "faith-questions", label: "Faith & Questions" },
  { id: "families-kids", label: "Families & Kids" },
  { id: "serving-ministry", label: "Serving & Ministry" },
  { id: "giving-generosity", label: "Giving & Generosity" },
  { id: "prayer-support", label: "Prayer & Support" },
  { id: "general", label: "General" },
];

/** Keyword rules — first match wins (most specific first) */
const TOPIC_RULES = [
  { id: "families-kids", re: /\b(child|children|kids|parent|parents|baby|babies|river kids|children'?s program|bring my child)\b/i },
  { id: "serving-ministry", re: /\b(serve|serving|volunteer|ministr|worship team|usher|media team|calling|purpose|guitar|platform|join a team)\b/i },
  {
    id: "prayer-support",
    re: /\b(pray(?:er)?|counsell|crisis|grief|hope|hurt|heavy|support|pastor privately|talk to a pastor|ask someone to pray|carrying loneliness)\b/i,
  },
  {
    id: "faith-questions",
    re: /\b(not a christian|not christian|explore christian|curious about christian|believe before|understand christian|religious people|faith at my own pace|disagree with some christian)\b/i,
  },
  {
    id: "belonging-community",
    re: /\b(belong|make friends|friendship|community|feel connected|get connected|invisible|introduce myself|don't like attention|member|lonely|homesick|don't know anyone|new to bangalore|involved in church|church family)\b/i,
  },
  {
    id: "visiting",
    re: /\b(visit|first.?time|first visit|attend|walk.?in|what to wear|what to expect|welcome kit|sunday service|find a church|visitor|plan your visit|service time|just walk in|register)\b/i,
  },
];

const CATEGORY_DEFAULT_TOPIC = {
  "About ROLCC": "about-church",
  "International & Visitors": "visiting",
  "Language & Culture": "about-church",
  "Belonging & Loneliness": "belonging-community",
  "Returning to Faith": "faith-questions",
  "Faith & Exploring Christianity": "faith-questions",
  "Burnout & Mental Health": "prayer-support",
  "Young Families & Couples": "families-kids",
  "Families & Children": "families-kids",
  "Volunteering & Skills": "serving-ministry",
  "Giving & CSR": "giving-generosity",
  "Work & Calling": "serving-ministry",
  "Ministry Training & Internships": "serving-ministry",
  "Mentorship & Leadership": "serving-ministry",
  "Worship & Music": "serving-ministry",
  "Serving & Ministry": "serving-ministry",
  "Care & Hope": "prayer-support",
  "Finding & Visiting Church": "visiting",
  General: "general",
};

/** Curated FAQ IDs per page — contextual, SEO-aligned (order = display order) */
const PAGE_FAQ_MAP = {
  index: ["Q0011", "Q0012", "Q0013", "Q0016", "Q0239", "Q0295", "Q0001", "Q0406"],
  about: ["Q0217", "Q0208", "Q0223", "Q0184", "Q0396", "Q0056", "Q0105", "Q0201"],
  giving: ["Q0463", "Q0250", "Q0251", "Q0257", "Q0243", "Q0246", "Q0249"],
  contact: ["Q0012", "Q0406", "Q0022", "Q0023", "Q0024", "Q0239", "Q0088", "Q0115"],
  services: ["Q0011", "Q0013", "Q0015", "Q0239", "Q0298", "Q0038", "Q0086", "Q0016"],
  "river-kids": ["Q0026", "Q0027", "Q0028", "Q0029", "Q0030", "Q0354", "Q0055", "Q0380"],
  fellowship: ["Q0010", "Q0033", "Q0041", "Q0311", "Q0105", "Q0279", "Q0288", "Q0306"],
  pmd: ["Q0361", "Q0362", "Q0417", "Q0310", "Q0366", "Q0360", "Q0388", "Q0138"],
  counselling: ["Q0024", "Q0022", "Q0023", "Q0339", "Q0343", "Q0337", "Q0286", "Q0046"],
  rolf: ["Q0243", "Q0246", "Q0249", "Q0257", "Q0250", "Q0251", "Q0463", "Q0261"],
  events: ["Q0034", "Q0131", "Q0108", "Q0064", "Q0290", "Q0144", "Q0095", "Q0079"],
  membership: ["Q0088", "Q0228", "Q0100", "Q0201", "Q0043", "Q0105", "Q0311", "Q0079"],
  articles: ["Q0155", "Q0206", "Q0010", "Q0217", "Q0408", "Q0311", "Q0016", "Q0053"],
};

/** Section copy for page-specific FAQ blocks */
const PAGE_FAQ_META = {
  index: {
    heading: "Common questions before your first visit",
    description: "Practical answers if you're planning to visit ROLCC for the first time.",
  },
  about: {
    heading: "About our church — what we believe and who we are",
    description: "Learn what kind of church ROLCC is, who we welcome, and how we worship and grow together.",
  },
  giving: {
    heading: "Questions about giving & generosity",
    description: "Answers about donations, tax benefits, transparency, and partnering through ROLF.",
  },
  contact: {
    heading: "Before you visit or reach out",
    description: "Location, visiting, prayer requests, and how to connect with our pastors.",
  },
  services: {
    heading: "Questions about Sunday worship",
    description: "What to expect in our services — songs, participation, and visiting at your own pace.",
  },
  "river-kids": {
    heading: "Families & River Kids",
    description: "Bringing children, safety, programs, and how families worship together at ROLCC.",
  },
  fellowship: {
    heading: "Community & Cell Fellowship",
    description: "Building friendships, accountability, and belonging beyond Sunday mornings.",
  },
  pmd: {
    heading: "Calling, training & everyday ministry",
    description: "Growing in purpose, mentorship, and serving God while working or studying.",
  },
  counselling: {
    heading: "Pastoral care, prayer & support",
    description: "Help for difficult seasons, burnout, anxiety, and connecting with pastoral care.",
  },
  rolf: {
    heading: "Giving, outreach & community impact",
    description: "Charity, education, CSR partnerships, and serving through ROLF.",
  },
  events: {
    heading: "Events, community & getting involved",
    description: "Weekday gatherings, special programs, and finding purpose beyond Sunday.",
  },
  membership: {
    heading: "Membership & next steps",
    description: "Attending without pressure, deciding at your pace, and what membership means at ROLCC.",
  },
  articles: {
    heading: "Questions about sermons & Bible study",
    description: "How our articles connect to Sunday messages, cell fellowship, and growing in Scripture.",
  },
};

/** Maps site page slugs to FAQ topics (fallback when PAGE_FAQ_MAP entry is missing) */
const PAGE_TOPIC_MAP = {
  index: ["visiting", "belonging-community"],
  about: ["visiting", "faith-questions"],
  services: ["visiting", "belonging-community"],
  "river-kids": ["families-kids"],
  fellowship: ["belonging-community", "visiting"],
  pmd: ["serving-ministry", "faith-questions"],
  counselling: ["prayer-support"],
  rolf: ["giving-generosity", "serving-ministry"],
  giving: ["giving-generosity", "serving-ministry"],
  events: ["belonging-community", "visiting"],
  membership: ["belonging-community", "visiting"],
  contact: ["visiting", "prayer-support"],
  articles: ["faith-questions", "belonging-community"],
};

/** @deprecated use PAGE_TOPIC_MAP */
const PAGE_CATEGORY_MAP = PAGE_TOPIC_MAP;

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
  const answer = (record.Answer || "").trim();
  if (!answer) return false;

  const publish = (record.Publish || "").trim();
  if (publish === "Yes") return true;
  if (publish === "No") return false;

  const status = (record.Status || "").trim().toLowerCase();
  if (status === "approved") return true;
  return faqNumber(record.ID) <= MAX_PUBLISHED_ID;
}

function confidenceScore(record) {
  return CONFIDENCE_WEIGHT[record.Confidence] || 0;
}

function assignTopic(faq) {
  const category = faq.category || faq.Category || "General";
  const q = (faq.question || faq.Question || "").toLowerCase();

  switch (category) {
    case "Families & Children":
      return "families-kids";
    case "Serving & Ministry":
      return "serving-ministry";
    case "Care & Hope":
      return "prayer-support";
    case "Finding & Visiting Church":
      if (/not a christian|not christian|believe before|explore christian|curious about christian|faith at my own pace/i.test(q)) {
        return "faith-questions";
      }
      if (/belong|make friends|feel lonely|feel invisible|don't know anyone|homesick|feel connected|get connected/i.test(q)) {
        return "belonging-community";
      }
      return "visiting";
    case "General":
      if (/child|children|kids|parent|river kids|bring my child/i.test(q)) return "families-kids";
      if (/volunteer|worship team|usher|media team|how can i serve|want to serve|join a team|ministr/i.test(q)) {
        return "serving-ministry";
      }
      if (/pray(?:er)?|counsell|crisis|grief|pastor privately|ask someone to pray/i.test(q)) return "prayer-support";
      if (/not a christian|explore|curious about|believe before|disagree with/i.test(q)) return "faith-questions";
      if (/visit|first time|walk in|what to expect|what to wear|find a church|new to bangalore|hsr layout/i.test(q)) {
        return "visiting";
      }
      if (/belong|friend|lonely|connect|community|member|invisible/i.test(q)) return "belonging-community";
      return "general";
    case "About ROLCC":
    case "Language & Culture":
      return "about-church";
    case "Belonging & Loneliness":
      return "belonging-community";
    case "Returning to Faith":
    case "Faith & Exploring Christianity":
      return "faith-questions";
    case "Burnout & Mental Health":
      return "prayer-support";
    case "Young Families & Couples":
      return "families-kids";
    case "Giving & CSR":
      return "giving-generosity";
    case "International & Visitors":
      return "visiting";
    case "Volunteering & Skills":
    case "Work & Calling":
    case "Ministry Training & Internships":
    case "Mentorship & Leadership":
    case "Worship & Music":
      return "serving-ministry";
    default:
      return CATEGORY_DEFAULT_TOPIC[category] || "general";
  }
}

function selectRelatedFaqs(faqs, pageSlug) {
  const byId = Object.fromEntries(faqs.map((f) => [f.id, f]));
  const curatedIds = PAGE_FAQ_MAP[pageSlug];
  const picked = [];
  const used = new Set();

  if (curatedIds) {
    curatedIds.forEach((id) => {
      const faq = byId[id];
      if (faq && !used.has(faq.id)) {
        used.add(faq.id);
        picked.push(faq);
      }
    });
    if (picked.length) return picked.slice(0, RELATED_COUNT);
  }

  const topics = PAGE_TOPIC_MAP[pageSlug] || ["visiting"];

  function takeFrom(list) {
    for (const faq of list) {
      if (picked.length >= RELATED_COUNT) break;
      if (used.has(faq.id)) continue;
      used.add(faq.id);
      picked.push(faq);
    }
  }

  topics.forEach((topic) => {
    takeFrom(
      faqs.filter((f) => f.topic === topic).sort((a, b) => b.priority - a.priority || a.sortOrder - b.sortOrder)
    );
  });

  if (picked.length < RELATED_COUNT) {
    takeFrom(faqs.sort((a, b) => b.priority - a.priority || a.sortOrder - b.sortOrder));
  }

  return picked.slice(0, RELATED_COUNT);
}

function getPageFaqMeta(pageSlug) {
  return (
    PAGE_FAQ_META[pageSlug] || {
      heading: "Related FAQs",
      description: "Quick answers related to this part of our church life.",
    }
  );
}

function normalizeQuestionText(question) {
  return String(question || "")
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\b(i'm|i am|can i|do i|how do i|what|where|when|why|should|would|could|the|and|for|with|from|that|this|have|has|are|was|were|be|been|being|our|your|my|me|we|you|it|is|in|at|on|to|of|a|an|or|if|not|just|still|also|about|without|feel|feeling|get|make|know|want|need|like|good|part|church|rolcc|bangalore)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function questionSimilarity(a, b) {
  const tokensA = new Set(normalizeQuestionText(a).split(" ").filter((w) => w.length > 2));
  const tokensB = new Set(normalizeQuestionText(b).split(" ").filter((w) => w.length > 2));
  if (!tokensA.size || !tokensB.size) return 0;
  let shared = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) shared += 1;
  });
  return shared / (tokensA.size + tokensB.size - shared);
}

function questionIntentKey(question) {
  const q = String(question || "").toLowerCase();
  if (/what happens when|what to expect|what should i expect|first time/i.test(q)) return "first-visit";
  if (/walk in|need to register|just listen/i.test(q)) return "walk-in";
  if (/not a christian|believe before|explore christianity|curious about christianity/i.test(q)) return "faith-explore";
  if (/new to bangalore|moved to bangalore|recently moved|staying in hsr|moved to hsr/i.test(q)) return "bangalore-new";
  if (/find a church|church community|church that feels|recommend.*church|bible-believing church/i.test(q)) return "find-church";
  if (/make friends|meaningful friendship|don't know anyone|feel lonely|miss having a community|build a new community/i.test(q)) {
    return "lonely-connect";
  }
  if (/join a worship team|worship team/i.test(q)) return "worship-team";
  if (/children'?s ministry|river kids|bring my child/i.test(q)) return "kids-ministry";
  return "";
}

function visitorRelevanceScore(faq) {
  const q = (faq.question || "").toLowerCase();
  let score = (faq.priority || 0) * 10;

  if (/what happens when|what to expect|what should i expect|first time you visit|when i visit a church/i.test(q)) {
    score += 200;
  }
  if (/walk in|need to register|just listen|just observe/i.test(q)) score += 190;
  if (/not a christian|non.?christian|believe before|explore christianity at my own pace/i.test(q)) score += 180;
  if (/curious about christianity|ask questions about christianity/i.test(q)) score += 170;
  if (/find a church|new to bangalore|hsr layout|moved to bangalore/i.test(q)) score += 120;
  if (/belong|make friends|feel connected|lonely|don't know anyone|community/i.test(q)) score += 90;
  if (/child|children|kids|parent|river kids|family/i.test(q)) score += 80;
  if (/pray|counsell|crisis|grief|hope|support|pastor/i.test(q)) score += 70;
  if (/volunteer|serve|ministr|worship team|calling|purpose/i.test(q)) score += 60;

  if (faq.category === "Finding & Visiting Church") score += 20;
  if (faq.category === "Care & Hope") score += 10;
  if (faq.topic === "general") score -= 15;

  return score;
}

/** Order FAQs for visitors: high-intent first, near-duplicates later. */
function sortFaqsForDisplay(faqs) {
  const duplicateIds = new Set();
  const canonical = [];
  const seenIntents = new Set();

  const ranked = [...faqs].sort(
    (a, b) => visitorRelevanceScore(b) - visitorRelevanceScore(a) || a.sortOrder - b.sortOrder
  );

  ranked.forEach((faq) => {
    const intent = questionIntentKey(faq.question);
    const isSimilarDuplicate = canonical.some((keeper) => {
      if (faq.topic !== keeper.topic && questionSimilarity(faq.question, keeper.question) < 0.58) {
        return false;
      }
      return questionSimilarity(faq.question, keeper.question) >= 0.42;
    });
    const isIntentDuplicate = intent ? seenIntents.has(intent) : false;

    if (isSimilarDuplicate || isIntentDuplicate) {
      duplicateIds.add(faq.id);
    } else {
      if (intent) seenIntents.add(intent);
      canonical.push(faq);
    }
  });

  return [...faqs].sort((a, b) => {
    const aDup = duplicateIds.has(a.id) ? 1 : 0;
    const bDup = duplicateIds.has(b.id) ? 1 : 0;
    if (aDup !== bDup) return aDup - bDup;

    const scoreDiff = visitorRelevanceScore(b) - visitorRelevanceScore(a);
    if (scoreDiff !== 0) return scoreDiff;

    return a.sortOrder - b.sortOrder;
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatAnswerHtml(text) {
  const escaped = escapeHtml(text);
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return withBold
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

module.exports = {
  PER_PAGE,
  RELATED_COUNT,
  FAQ_CHIP_TOPICS,
  PAGE_FAQ_MAP,
  PAGE_FAQ_META,
  PAGE_TOPIC_MAP,
  PAGE_CATEGORY_MAP,
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
};
