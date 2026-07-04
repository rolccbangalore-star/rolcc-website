const fs = require("fs");
const path = require("path");
const { parseCsv } = require("./csv-parse");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");
const V2_PATH = path.join(DATA, "faqs-source-v2.csv");

const V2_HEADERS = [
  "ID", "Answer", "Category", "Confidence", "Needs Review", "Question",
  "Review Question", "Scripture", "Status", "Suggested Page",
  "MergeGroup", "CanonicalID", "AltQuestions", "Publish",
];

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

function loadV2Rows() {
  return parseCsv(fs.readFileSync(V2_PATH, "utf8"));
}

function writeV2Rows(rows) {
  fs.writeFileSync(V2_PATH, stringifyCsv(rows, V2_HEADERS));
}

function parseAltQuestions(value) {
  return (value || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinAltQuestions(alts) {
  return [...new Set(alts.map((s) => s.trim()).filter(Boolean))].join(" | ");
}

function appendAltQuestions(existing, ...questions) {
  const alts = parseAltQuestions(existing);
  questions.forEach((q) => {
    const trimmed = (q || "").trim();
    if (trimmed && !alts.includes(trimmed)) alts.push(trimmed);
  });
  return joinAltQuestions(alts);
}

function mergeGroupTokens(value) {
  return (value || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinMergeGroups(...values) {
  const groups = new Set();
  values.forEach((v) => mergeGroupTokens(v).forEach((g) => groups.add(g)));
  return [...groups].sort().join("; ");
}

function updateDedupSummary(rows) {
  const answered = rows.filter((r) => (r.Answer || "").trim());
  const published = rows.filter((r) => r.Publish === "Yes");
  const unanswered = rows.filter((r) => !(r.Answer || "").trim());
  const unpublished = rows.filter((r) => (r.Answer || "").trim() && r.Publish !== "Yes");

  const answeredByCategory = {};
  answered.forEach((r) => {
    answeredByCategory[r.Category] = (answeredByCategory[r.Category] || 0) + 1;
  });

  const unansweredByCategory = {};
  unanswered.forEach((r) => {
    unansweredByCategory[r.Category] = (unansweredByCategory[r.Category] || 0) + 1;
  });

  const demotedIds = unpublished.map((r) => r.ID);

  const altCount = rows.reduce(
    (n, r) => n + parseAltQuestions(r.AltQuestions).length,
    0
  );

  const mergeMapPath = path.join(DATA, "faqs-merge-map.csv");
  let mergedIntoOthers = 0;
  if (fs.existsSync(mergeMapPath)) {
    const mapRows = parseCsv(fs.readFileSync(mergeMapPath, "utf8"));
    mergedIntoOthers = mapRows.filter((r) => r.IsCanonical === "No").length;
  }

  const answeredByCategoryPublished = {};
  published.forEach((r) => {
    answeredByCategoryPublished[r.Category] =
      (answeredByCategoryPublished[r.Category] || 0) + 1;
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    canonicalFaqs: rows.length,
    answeredCanonical: answered.length,
    unansweredCanonical: unanswered.length,
    publishedFaqs: published.length,
    unpublishedWithAnswers: unpublished.length,
    mergedIntoOthers,
    altQuestionPhrasings: altCount,
    answeredByCategory,
    publishedByCategory: answeredByCategoryPublished,
    unansweredByCategory,
    answeredIds: answered.map((r) => r.ID),
    publishedIds: published.map((r) => r.ID),
    unpublishedIds: unpublished.map((r) => r.ID),
    demotedIds,
    topAltQuestions: rows
      .filter((r) => r.AltQuestions)
      .sort(
        (a, b) =>
          parseAltQuestions(b.AltQuestions).length -
          parseAltQuestions(a.AltQuestions).length
      )
      .slice(0, 15)
      .map((r) => ({
        id: r.ID,
        question: r.Question,
        altCount: parseAltQuestions(r.AltQuestions).length,
        mergeGroup: r.MergeGroup,
      })),
  };

  fs.writeFileSync(
    path.join(DATA, "faqs-dedup-summary.json"),
    JSON.stringify(summary, null, 2) + "\n"
  );

  return summary;
}

module.exports = {
  DATA,
  V2_PATH,
  V2_HEADERS,
  escapeCsv,
  stringifyCsv,
  loadV2Rows,
  writeV2Rows,
  parseAltQuestions,
  joinAltQuestions,
  appendAltQuestions,
  mergeGroupTokens,
  joinMergeGroups,
  updateDedupSummary,
};
