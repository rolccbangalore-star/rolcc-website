const fs = require("fs");
const path = require("path");
const { parseCsv } = require("./csv-parse");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");

/** Fixed 1–82 order (by category, same as shared in chat). */
const ORDERED_FAQ_IDS = [
  // About ROLCC (6)
  "Q0217", "Q0203", "Q0206", "Q0207", "Q0208", "Q0223",
  // Finding & Visiting Church (11)
  "Q0201", "Q0228", "Q0239", "Q0293", "Q0295", "Q0298", "Q0311", "Q0318", "Q0351", "Q0390", "Q0406",
  // International & Visitors (4)
  "Q0396", "Q0398", "Q0405", "Q0462",
  // Language & Culture (1)
  "Q0225",
  // Belonging & Loneliness (4)
  "Q0233", "Q0279", "Q0288", "Q0306",
  // Returning to Faith (4)
  "Q0344", "Q0345", "Q0346", "Q0349",
  // Faith & Exploring Christianity (2)
  "Q0301", "Q0409",
  // Burnout & Mental Health (3)
  "Q0337", "Q0339", "Q0343",
  // Young Families & Couples (4)
  "Q0230", "Q0232", "Q0353", "Q0354",
  // Families & Children (5)
  "Q0261", "Q0263", "Q0271", "Q0355", "Q0380",
  // Volunteering & Skills (3)
  "Q0242", "Q0259", "Q0269",
  // Giving & CSR (6)
  "Q0243", "Q0246", "Q0249", "Q0250", "Q0251", "Q0257",
  // Work & Calling (3)
  "Q0360", "Q0361", "Q0362",
  // Ministry Training & Internships (2)
  "Q0366", "Q0417",
  // Mentorship & Leadership (1)
  "Q0310",
  // Worship & Music (2)
  "Q0320", "Q0325",
  // Serving & Ministry (14)
  "Q0265", "Q0364", "Q0365", "Q0368", "Q0369", "Q0372", "Q0386", "Q0404", "Q0423", "Q0438", "Q0440", "Q0445", "Q0446", "Q0447",
  // General (7)
  "Q0283", "Q0284", "Q0285", "Q0286", "Q0287", "Q0290", "Q0388",
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

function main() {
  const rows = parseCsv(fs.readFileSync(path.join(DATA, "faqs-source-v2.csv"), "utf8"));
  const byId = Object.fromEntries(rows.map((r) => [r.ID.trim(), r]));
  const unansweredIds = new Set(rows.filter((r) => r.Publish === "No").map((r) => r.ID.trim()));

  const missing = ORDERED_FAQ_IDS.filter((id) => !unansweredIds.has(id));
  const extra = [...unansweredIds].filter((id) => !ORDERED_FAQ_IDS.includes(id));
  if (missing.length || extra.length || ORDERED_FAQ_IDS.length !== 82) {
    console.error("Order mismatch with faqs-source-v2.csv");
    if (missing.length) console.error("Missing from v2:", missing);
    if (extra.length) console.error("Not in ORDERED_FAQ_IDS:", extra);
    process.exit(1);
  }

  const simpleRows = [];
  const mapRows = [];
  const numberMap = {};

  ORDERED_FAQ_IDS.forEach((faqId, index) => {
    const no = index + 1;
    const source = byId[faqId];
    simpleRows.push({
      No: String(no),
      Category: source.Category,
      Question: source.Question,
      Answer: "",
    });
    mapRows.push({
      No: String(no),
      FAQ_ID: faqId,
      Category: source.Category,
      Question: source.Question,
    });
    numberMap[String(no)] = faqId;
  });

  fs.writeFileSync(
    path.join(DATA, "faqs-unanswered-simple.csv"),
    stringifyCsv(simpleRows, ["No", "Category", "Question", "Answer"])
  );
  fs.writeFileSync(
    path.join(DATA, "faqs-unanswered-number-map.csv"),
    stringifyCsv(mapRows, ["No", "FAQ_ID", "Category", "Question"])
  );
  fs.writeFileSync(
    path.join(DATA, "faqs-unanswered-number-map.json"),
    JSON.stringify(numberMap, null, 2) + "\n"
  );

  // Keep ID-sorted technical sheet for audit
  const idSorted = rows
    .filter((r) => r.Publish === "No")
    .sort((a, b) => a.ID.localeCompare(b.ID, undefined, { numeric: true }));
  fs.writeFileSync(
    path.join(DATA, "faqs-unanswered-to-fill.csv"),
    stringifyCsv(
      idSorted.map((r) => ({
        ID: r.ID,
        Category: r.Category,
        Question: r.Question,
        Answer: "",
        Status: "Draft",
        Notes: "",
      })),
      ["ID", "Category", "Question", "Answer", "Status", "Notes"]
    )
  );

  console.log(`Wrote faqs-unanswered-simple.csv (${simpleRows.length} rows)`);
  console.log(`Wrote faqs-unanswered-number-map.csv + .json`);
  console.log(`Wrote faqs-unanswered-to-fill.csv (${idSorted.length} rows, ID-sorted audit copy)`);
}

main();
