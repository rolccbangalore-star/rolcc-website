/**
 * Part 4: Build faqs-source-v2.csv with merge groups, canonical IDs, alt questions,
 * and recategorized unanswered FAQs from the Notion export.
 */
const fs = require("fs");
const path = require("path");
const { parseCsv } = require("./csv-parse");

const ROOT = path.join(__dirname, "..");
const EXPORT_PATH = path.join(
  ROOT,
  "..",
  "Downloads",
  "a573dacb-d1d9-4cdb-963b-f11122cab69b_ExportBlock-6d00124a-de56-4fc3-9b6e-e1bb6718b7d6",
  "ExportBlock-6d00124a-de56-4fc3-9b6e-e1bb6718b7d6-Part-1",
  "ROLCC_Question_Repository_Answered_Batch1 38fd10d0175a8046ba65d2dab368ef4a_all.csv"
);
const FALLBACK_EXPORT = path.join(
  ROOT,
  "..",
  "Downloads",
  "ROLCC_Question_Repository_Answered_Batch1 38fd10d0175a8046ba65d2dab368ef4a_all.csv"
);

/** @type {Record<string, { canonical: string, group: string }>} */
const MERGE_MAP = {};

function addMerge(group, canonical, ids) {
  ids.forEach((id) => {
    if (id === canonical) return;
    MERGE_MAP[id] = { canonical, group };
  });
}

// Part 1 — Q0001–Q0150
addMerge("visitor-quiet", "Q0084", ["Q0085", "Q0087", "Q0097", "Q0173"]);
addMerge("visitor-quiet", "Q0086", ["Q0093"]);
addMerge("visitor-no-spotlight", "Q0089", ["Q0014", "Q0090", "Q0157"]);
addMerge("visitor-leave-after", "Q0091", ["Q0098"]);
addMerge("visitor-no-chase", "Q0092", ["Q0099"]);
addMerge("visitor-no-membership", "Q0088", ["Q0040"]);
addMerge("non-christian-welcome", "Q0016", [
  "Q0017", "Q0019", "Q0039", "Q0121", "Q0166", "Q0167", "Q0168", "Q0172", "Q0227",
]);
addMerge("explore-own-pace", "Q0122", ["Q0096", "Q0160", "Q0164"]);
addMerge("find-church-bangalore", "Q0001", ["Q0004"]);
addMerge("bible-church-bangalore", "Q0053", ["Q0006"]);
addMerge("church-right-fit", "Q0007", ["Q0008", "Q0199"]);
addMerge("belonging-church", "Q0105", ["Q0158"]);
addMerge("how-long-decide", "Q0100", ["Q0009", "Q0198", "Q0200"]);
addMerge("young-professionals", "Q0054", ["Q0069"]);
addMerge("lonely-bangalore", "Q0065", ["Q0047", "Q0051"]);
addMerge("friends-bangalore", "Q0066", ["Q0049", "Q0070"]);
addMerge("disconnected-church", "Q0149", ["Q0076"]);
addMerge("friends-at-church", "Q0111", ["Q0077", "Q0104"]);
addMerge("need-community", "Q0110", ["Q0052", "Q0117"]);
addMerge("work-schedule", "Q0002", ["Q0003", "Q0035"]);
addMerge("kids-ministry", "Q0055", ["Q0057"]);
addMerge("child-music", "Q0060", ["Q0058", "Q0127"]);
addMerge("child-faith", "Q0126", ["Q0061"]);
addMerge("where-serve", "Q0082", ["Q0074", "Q0136", "Q0162", "Q0163"]);
addMerge("worship-team", "Q0072", ["Q0071", "Q0140"]);
addMerge("purpose-gifts", "Q0081", ["Q0050", "Q0080", "Q0137"]);
addMerge("disconnected-god", "Q0147", [
  "Q0078", "Q0156", "Q0186", "Q0188", "Q0190",
]);
addMerge("prayer-restart", "Q0146", ["Q0148", "Q0152"]);
addMerge("community-path", "Q0010", ["Q0159", "Q0165", "Q0155"]);
addMerge("struggling-welcome", "Q0021", ["Q0151", "Q0153"]);
addMerge("worship-participation", "Q0015", ["Q0154"]);
addMerge("gifts-discover", "Q0139", ["Q0161"]);
addMerge("explore-christianity", "Q0119", ["Q0169", "Q0197"]);
addMerge("difficult-questions", "Q0120", ["Q0170", "Q0189", "Q0194"]);
addMerge("disagree-welcome", "Q0124", ["Q0171", "Q0195"]);
addMerge("no-convert-pressure", "Q0018", ["Q0174", "Q0175", "Q0191"]);
addMerge("observe-listen", "Q0125", ["Q0193"]);
addMerge("questions-pressure", "Q0020", ["Q0192"]);
addMerge("lost-hope", "Q0114", ["Q0187"]);

// Part 3 — unanswered merge clusters
addMerge("rolcc-identity", "Q0217", ["Q0202", "Q0219", "Q0221"]);
addMerge("denomination-tradition", "Q0203", ["Q0204", "Q0205", "Q0220"]);
addMerge("bible-believing", "Q0206", ["Q0408"]);
addMerge("church-beliefs", "Q0207", ["Q0218"]);
addMerge("church-audience", "Q0208", ["Q0209", "Q0210", "Q0222"]);
addMerge("languages-services", "Q0223", ["Q0211", "Q0212", "Q0213", "Q0224", "Q0397"]);
addMerge("international-welcome", "Q0396", [
  "Q0401", "Q0403", "Q0407", "Q0459", "Q0460",
]);
addMerge("international-short-stay", "Q0398", ["Q0402", "Q0400", "Q0399"]);
addMerge("international-business", "Q0405", ["Q0458", "Q0457"]);
addMerge("international-relocate", "Q0462", ["Q0216", "Q0395"]);
addMerge("international-cell", "Q0404", ["Q0461"]);
addMerge("visit-no-member", "Q0228", ["Q0229"]);
addMerge("young-couples-church", "Q0230", ["Q0231"]);
addMerge("couples-serve", "Q0232", ["Q0451", "Q0452", "Q0453"]);
addMerge("student-church", "Q0233", ["Q0234", "Q0235", "Q0240"]);
addMerge("returning-faith", "Q0344", ["Q0236", "Q0348", "Q0237"]);
addMerge("reconnect-god", "Q0345", ["Q0350", "Q0238"]);
addMerge("drifted-from-god", "Q0346", ["Q0347"]);
addMerge("charity-meaningful", "Q0243", ["Q0244", "Q0248"]);
addMerge("company-partnership", "Q0249", ["Q0418", "Q0419", "Q0420", "Q0421"]);
addMerge("child-sponsorship", "Q0246", ["Q0247", "Q0252", "Q0241", "Q0245"]);
addMerge("donate-in-kind", "Q0257", ["Q0253", "Q0254", "Q0255", "Q0258"]);
addMerge("volunteer-weekend", "Q0242", ["Q0274", "Q0389", "Q0275", "Q0276", "Q0277", "Q0278", "Q0256"]);
addMerge("volunteer-skills", "Q0259", [
  "Q0260", "Q0262", "Q0264", "Q0266", "Q0267", "Q0268",
  "Q0391", "Q0392", "Q0393", "Q0441", "Q0442", "Q0443", "Q0444",
]);
addMerge("family-volunteer", "Q0269", ["Q0272", "Q0270", "Q0273", "Q0456"]);
addMerge("belonging-core", "Q0279", ["Q0280", "Q0281", "Q0282", "Q0309", "Q0319"]);
addMerge("settle-bangalore", "Q0288", ["Q0289", "Q0291", "Q0292", "Q0359"]);
addMerge("adult-friendship", "Q0306", ["Q0307", "Q0308"]);
addMerge("quiet-visit", "Q0298", ["Q0294", "Q0296", "Q0297", "Q0300", "Q0299"]);
addMerge("faith-nonbeliever", "Q0301", ["Q0302", "Q0305", "Q0303", "Q0304"]);
addMerge("burnout", "Q0339", ["Q0336", "Q0342"]);
addMerge("anxiety-prayer", "Q0343", ["Q0340", "Q0341"]);
addMerge("rest-peace", "Q0337", ["Q0338"]);
addMerge("language-culture", "Q0225", [
  "Q0214", "Q0215", "Q0226", "Q0328", "Q0329", "Q0330", "Q0331", "Q0332", "Q0333", "Q0334", "Q0335",
]);
addMerge("ministry-calling", "Q0361", [
  "Q0312", "Q0313", "Q0314", "Q0315", "Q0316", "Q0317", "Q0363", "Q0370", "Q0373", "Q0387",
]);
addMerge("serve-while-working", "Q0362", [
  "Q0371", "Q0437", "Q0439", "Q0385", "Q0394", "Q0454", "Q0455",
]);
addMerge("ministry-intern", "Q0366", [
  "Q0375", "Q0376", "Q0377", "Q0378", "Q0381", "Q0382", "Q0422", "Q0424", "Q0425", "Q0426", "Q0427",
]);
addMerge("ministry-training", "Q0417", ["Q0416", "Q0383", "Q0384", "Q0367", "Q0374", "Q0379"]);
addMerge("mentorship", "Q0310", [
  "Q0412", "Q0413", "Q0414", "Q0428", "Q0429", "Q0430", "Q0431", "Q0432", "Q0433", "Q0434", "Q0435", "Q0436",
]);
addMerge("worship-ministry", "Q0325", [
  "Q0321", "Q0322", "Q0323", "Q0324", "Q0326", "Q0327", "Q0448", "Q0449", "Q0450",
]);
addMerge("young-families", "Q0354", ["Q0352", "Q0357", "Q0358"]);
addMerge("parenting-values", "Q0355", ["Q0356"]);
addMerge("couple-serve", "Q0353", []);
addMerge("faith-discipleship", "Q0409", ["Q0410", "Q0411", "Q0415"]);
addMerge("service-unfamiliar", "Q0239", []);

const CATEGORY_MAP = {
  Q0176: "Faith & Exploring Christianity",
  Q0177: "Faith & Exploring Christianity",
  Q0178: "Faith & Exploring Christianity",
  Q0179: "Faith & Exploring Christianity",
  Q0180: "Faith & Exploring Christianity",
  Q0181: "Faith & Exploring Christianity",
  Q0182: "Faith & Exploring Christianity",
  Q0183: "Faith & Exploring Christianity",
  Q0185: "Faith & Exploring Christianity",
  Q0184: "About ROLCC",
  Q0196: "Finding & Visiting Church",
  Q0203: "About ROLCC",
  Q0206: "About ROLCC",
  Q0207: "About ROLCC",
  Q0208: "About ROLCC",
  Q0217: "About ROLCC",
  Q0223: "About ROLCC",
  Q0225: "Language & Culture",
  Q0230: "Young Families & Couples",
  Q0232: "Young Families & Couples",
  Q0233: "Belonging & Loneliness",
  Q0242: "Volunteering & Skills",
  Q0243: "Giving & CSR",
  Q0246: "Giving & CSR",
  Q0249: "Giving & CSR",
  Q0250: "Giving & CSR",
  Q0257: "Giving & CSR",
  Q0259: "Volunteering & Skills",
  Q0269: "Volunteering & Skills",
  Q0279: "Belonging & Loneliness",
  Q0288: "Belonging & Loneliness",
  Q0298: "Finding & Visiting Church",
  Q0301: "Faith & Exploring Christianity",
  Q0306: "Belonging & Loneliness",
  Q0310: "Mentorship & Leadership",
  Q0320: "Worship & Music",
  Q0325: "Worship & Music",
  Q0337: "Burnout & Mental Health",
  Q0339: "Burnout & Mental Health",
  Q0343: "Burnout & Mental Health",
  Q0344: "Returning to Faith",
  Q0345: "Returning to Faith",
  Q0346: "Returning to Faith",
  Q0349: "Returning to Faith",
  Q0353: "Young Families & Couples",
  Q0354: "Young Families & Couples",
  Q0355: "Families & Children",
  Q0360: "Work & Calling",
  Q0361: "Work & Calling",
  Q0362: "Work & Calling",
  Q0366: "Ministry Training & Internships",
  Q0396: "International & Visitors",
  Q0398: "International & Visitors",
  Q0405: "International & Visitors",
  Q0406: "Finding & Visiting Church",
  Q0409: "Faith & Exploring Christianity",
  Q0417: "Ministry Training & Internships",
  Q0423: "Serving & Ministry",
  Q0445: "Serving & Ministry",
  Q0446: "Serving & Ministry",
  Q0447: "Serving & Ministry",
  Q0462: "International & Visitors",
};

function faqNum(id) {
  const m = /^Q(\d+)$/i.exec(id);
  return m ? parseInt(m[1], 10) : 0;
}

function resolveCanonical(id) {
  const seen = new Set();
  let current = id;
  while (MERGE_MAP[current] && !seen.has(current)) {
    seen.add(current);
    current = MERGE_MAP[current].canonical;
  }
  return current;
}

function escapeCsv(value) {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function stringifyCsv(rows, headers) {
  const lines = [headers.map(escapeCsv).join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((h) => escapeCsv(row[h] ?? "")).join(","));
  });
  return lines.join("\r\n") + "\r\n";
}

function loadExport() {
  const p = fs.existsSync(EXPORT_PATH) ? EXPORT_PATH : FALLBACK_EXPORT;
  if (!fs.existsSync(p)) throw new Error(`Export CSV not found: ${p}`);
  return parseCsv(fs.readFileSync(p, "utf8"));
}

function main() {
  const records = loadExport();
  const byId = Object.fromEntries(records.map((r) => [r.ID.trim(), { ...r }]));

  if (byId.Q0395 && byId.Q0395.Question.startsWith("'m")) {
    byId.Q0395.Question = "I'm new to Bangalore. Can I attend your church?";
  }

  const altByCanonical = {};
  const groupsByCanonical = {};

  records.forEach((r) => {
    const id = r.ID.trim();
    const canonical = resolveCanonical(id);
    if (id !== canonical) {
      if (!altByCanonical[canonical]) altByCanonical[canonical] = [];
      altByCanonical[canonical].push(r.Question.trim());
      const g = MERGE_MAP[id]?.group || "merged";
      if (!groupsByCanonical[canonical]) groupsByCanonical[canonical] = new Set();
      groupsByCanonical[canonical].add(g);
    }
  });

  const allCanonicalIds = new Set();
  records.forEach((r) => allCanonicalIds.add(resolveCanonical(r.ID.trim())));

  const v2Rows = [];
  const mapRows = [];

  [...allCanonicalIds].sort((a, b) => faqNum(a) - faqNum(b)).forEach((canonicalId) => {
    const source = byId[canonicalId];
    if (!source) return;

    let answer = (source.Answer || "").trim();
    if (!answer) {
      records.forEach((r) => {
        if (resolveCanonical(r.ID.trim()) === canonicalId && (r.Answer || "").trim()) {
          answer = (r.Answer || "").trim();
        }
      });
    }

    const category = CATEGORY_MAP[canonicalId] || source.Category || "General";
    const mergeGroups = [...(groupsByCanonical[canonicalId] || [])].sort().join("; ");
    const altQuestions = (altByCanonical[canonicalId] || []).join(" | ");

    v2Rows.push({
      ID: canonicalId,
      Answer: answer,
      Category: category,
      Confidence: source.Confidence || "",
      "Needs Review": source["Needs Review"] || "",
      Question: source.Question.trim(),
      "Review Question": source["Review Question"] || "",
      Scripture: source.Scripture || "",
      Status: answer ? "Approved" : "Draft",
      "Suggested Page": source["Suggested Page"] || "",
      MergeGroup: mergeGroups,
      CanonicalID: canonicalId,
      AltQuestions: altQuestions,
      Publish: answer ? "Yes" : "No",
    });
  });

  records.forEach((r) => {
    const id = r.ID.trim();
    const canonical = resolveCanonical(id);
    mapRows.push({
      ID: id,
      Question: r.Question.trim(),
      CanonicalID: canonical,
      MergeGroup: MERGE_MAP[id]?.group || "",
      IsCanonical: id === canonical ? "Yes" : "No",
      HasAnswer: (r.Answer || "").trim() ? "Yes" : "No",
      Category: r.Category || "",
      ProposedCategory: id === canonical ? CATEGORY_MAP[id] || r.Category || "" : "",
    });
  });

  const headers = [
    "ID", "Answer", "Category", "Confidence", "Needs Review", "Question",
    "Review Question", "Scripture", "Status", "Suggested Page",
    "MergeGroup", "CanonicalID", "AltQuestions", "Publish",
  ];
  const mapHeaders = [
    "ID", "Question", "CanonicalID", "MergeGroup", "IsCanonical",
    "HasAnswer", "Category", "ProposedCategory",
  ];

  fs.writeFileSync(path.join(ROOT, "data", "faqs-source-v2.csv"), stringifyCsv(v2Rows, headers));
  fs.writeFileSync(path.join(ROOT, "data", "faqs-merge-map.csv"), stringifyCsv(mapRows, mapHeaders));

  const answered = v2Rows.filter((r) => r.Publish === "Yes");
  const unanswered = v2Rows.filter((r) => r.Publish === "No");
  const mergedCount = mapRows.filter((r) => r.IsCanonical === "No").length;
  const altCount = v2Rows.reduce(
    (n, r) => n + (r.AltQuestions ? r.AltQuestions.split(" | ").filter(Boolean).length : 0),
    0
  );

  const unansweredByCategory = {};
  unanswered.forEach((r) => {
    unansweredByCategory[r.Category] = (unansweredByCategory[r.Category] || 0) + 1;
  });

  const answeredByCategory = {};
  answered.forEach((r) => {
    answeredByCategory[r.Category] = (answeredByCategory[r.Category] || 0) + 1;
  });

  const mergeGroupsSummary = {};
  Object.entries(MERGE_MAP).forEach(([, v]) => {
    mergeGroupsSummary[v.group] = (mergeGroupsSummary[v.group] || 0) + 1;
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceRows: records.length,
    canonicalFaqs: v2Rows.length,
    answeredCanonical: answered.length,
    unansweredCanonical: unanswered.length,
    mergedIntoOthers: mergedCount,
    altQuestionPhrasings: altCount,
    netNewFromPart2: [
      "Q0176", "Q0177", "Q0178", "Q0179", "Q0180", "Q0181", "Q0182",
      "Q0183", "Q0184", "Q0185", "Q0196",
    ],
    answeredByCategory,
    unansweredByCategory,
    mergeGroupsByCount: mergeGroupsSummary,
    answeredIds: answered.map((r) => r.ID),
    unansweredIds: unanswered.map((r) => r.ID),
    topAltQuestions: v2Rows
      .filter((r) => r.AltQuestions)
      .sort((a, b) => b.AltQuestions.split(" | ").length - a.AltQuestions.split(" | ").length)
      .slice(0, 15)
      .map((r) => ({
        id: r.ID,
        question: r.Question,
        altCount: r.AltQuestions.split(" | ").length,
        mergeGroup: r.MergeGroup,
      })),
  };

  fs.writeFileSync(
    path.join(ROOT, "data", "faqs-dedup-summary.json"),
    JSON.stringify(summary, null, 2)
  );

  console.log(JSON.stringify(summary, null, 2));
}

main();
