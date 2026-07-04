/**
 * Import answers from the simple 1–82 sheet into faqs-source-v2.csv.
 * Usage: node scripts/import-unanswered-answers.js [path-to-answered-csv]
 */
const fs = require("fs");
const path = require("path");
const { parseCsv } = require("./csv-parse");
const {
  DATA,
  loadV2Rows,
  writeV2Rows,
  updateDedupSummary,
} = require("./faq-v2-utils");

const DEFAULT_ANSWERED = path.join(
  DATA,
  "faqs-answered-simple - faqs-answered-simple.csv"
);

function main() {
  const answeredPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT_ANSWERED;

  if (!fs.existsSync(answeredPath)) {
    console.error(`Answered CSV not found: ${answeredPath}`);
    process.exit(1);
  }

  const numberMap = JSON.parse(
    fs.readFileSync(path.join(DATA, "faqs-unanswered-number-map.json"), "utf8")
  );

  const answeredRows = parseCsv(fs.readFileSync(answeredPath, "utf8"));
  const byNo = Object.fromEntries(
    answeredRows.map((r) => [String(r.No).trim(), r])
  );

  const errors = [];
  for (let no = 1; no <= 82; no++) {
    const key = String(no);
    const row = byNo[key];
    if (!row) {
      errors.push(`Missing row No ${no}`);
      continue;
    }
    if (!(row.Answer || "").trim()) {
      errors.push(`Empty answer for No ${no}`);
    }
    if (!numberMap[key]) {
      errors.push(`No mapping for No ${no}`);
    }
  }

  if (answeredRows.length !== 82) {
    errors.push(`Expected 82 rows, got ${answeredRows.length}`);
  }

  if (errors.length) {
    console.error("Validation failed:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  const v2Rows = loadV2Rows();
  const byId = Object.fromEntries(v2Rows.map((r) => [r.ID.trim(), r]));
  let updated = 0;

  for (let no = 1; no <= 82; no++) {
    const faqId = numberMap[String(no)];
    const source = byNo[String(no)];
    const target = byId[faqId];

    if (!target) {
      console.error(`FAQ ID not in v2: ${faqId} (No ${no})`);
      process.exit(1);
    }

    target.Question = source.Question.trim();
    target.Answer = source.Answer.trim();
    target.Category = source.Category.trim() || target.Category;
    target.Status = "Approved";
    target.Publish = "Yes";
    target["Needs Review"] = "";
    target.Confidence = target.Confidence || "High";
    updated++;
  }

  writeV2Rows(v2Rows);
  const summary = updateDedupSummary(v2Rows);

  console.log(`Imported ${updated} answers from ${path.basename(answeredPath)}`);
  console.log(
    `faqs-source-v2.csv: ${summary.canonicalFaqs} canonical, ${summary.answeredCanonical} answered, ${summary.unansweredCanonical} unanswered`
  );
}

main();
