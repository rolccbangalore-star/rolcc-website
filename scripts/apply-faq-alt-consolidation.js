/**
 * Second-pass alt consolidation: demote near-duplicate canonical FAQs to alt phrasing on keepers.
 * Usage: node scripts/apply-faq-alt-consolidation.js [--medium]
 */
const fs = require("fs");
const path = require("path");
const { parseCsv } = require("./csv-parse");
const {
  DATA,
  loadV2Rows,
  writeV2Rows,
  appendAltQuestions,
  joinMergeGroups,
  updateDedupSummary,
} = require("./faq-v2-utils");

const HIGH_CONFIDENCE = [
  { keeper: "Q0217", demote: ["Q0203", "Q0206", "Q0207"], group: "rolcc-identity" },
  { keeper: "Q0223", demote: ["Q0225"], group: "languages-services" },
  { keeper: "Q0396", demote: ["Q0398", "Q0405"], group: "international-welcome" },
  { keeper: "Q0016", demote: ["Q0301"], group: "non-christian-welcome" },
  {
    keeper: "Q0362",
    demote: ["Q0368", "Q0369", "Q0386", "Q0438", "Q0440"],
    group: "serve-while-working",
  },
  { keeper: "Q0122", demote: ["Q0283", "Q0285", "Q0287"], group: "explore-own-pace" },
];

const MEDIUM_CONFIDENCE = [
  { keeper: "Q0298", demote: ["Q0284"], group: "quiet-visit" },
  { keeper: "Q0288", demote: ["Q0293", "Q0462"], group: "settle-bangalore" },
];

function updateMergeMap(demotions) {
  const mapPath = path.join(DATA, "faqs-merge-map.csv");
  if (!fs.existsSync(mapPath)) {
    console.warn("faqs-merge-map.csv not found; skipping merge-map update");
    return;
  }

  const mapRows = parseCsv(fs.readFileSync(mapPath, "utf8"));
  const demoteSet = new Set();
  const demoteMeta = {};

  demotions.forEach(({ keeper, demote, group }) => {
    demote.forEach((id) => {
      demoteSet.add(id);
      demoteMeta[id] = { keeper, group };
    });
  });

  mapRows.forEach((row) => {
    const id = row.ID.trim();
    if (demoteMeta[id]) {
      row.CanonicalID = demoteMeta[id].keeper;
      row.MergeGroup = demoteMeta[id].group;
      row.IsCanonical = "No";
    }
  });

  // Ensure demoted canonical IDs that exist only in v2 are represented
  demotions.forEach(({ keeper, demote, group }) => {
    demote.forEach((id) => {
      const exists = mapRows.some((r) => r.ID.trim() === id);
      if (!exists) {
        console.warn(`Merge map has no row for ${id}; v2-only demotion`);
      }
    });
  });

  const headers = Object.keys(mapRows[0] || {});
  const { stringifyCsv } = require("./faq-v2-utils");
  fs.writeFileSync(mapPath, stringifyCsv(mapRows, headers));
}

function applyConsolidations(consolidations) {
  const rows = loadV2Rows();
  const byId = Object.fromEntries(rows.map((r) => [r.ID.trim(), r]));
  const demoted = [];

  consolidations.forEach(({ keeper, demote, group }) => {
    const keeperRow = byId[keeper];
    if (!keeperRow) {
      console.error(`Keeper not found: ${keeper}`);
      process.exit(1);
    }

    if (keeperRow.Publish !== "Yes") {
      console.warn(`Keeper ${keeper} is not published; skipping demotions for this cluster`);
      return;
    }

    demote.forEach((demoteId) => {
      const demoteRow = byId[demoteId];
      if (!demoteRow) {
        console.error(`Demote target not found: ${demoteId}`);
        process.exit(1);
      }

      const question = demoteRow.Question.trim();
      if (question) {
        keeperRow.AltQuestions = appendAltQuestions(keeperRow.AltQuestions, question);
      }

      demoteRow.Publish = "No";
      demoteRow.CanonicalID = keeper;
      demoteRow.MergeGroup = joinMergeGroups(keeperRow.MergeGroup, demoteRow.MergeGroup, group);

      keeperRow.MergeGroup = joinMergeGroups(keeperRow.MergeGroup, group);

      demoted.push({ keeper, demoteId, question });
    });
  });

  writeV2Rows(rows);
  updateMergeMap(consolidations);
  return { rows, demoted };
}

function main() {
  const includeMedium = process.argv.includes("--medium") || process.argv.includes("--all");

  const before = loadV2Rows();
  const publishedBefore = before.filter((r) => r.Publish === "Yes").length;

  const { rows, demoted } = applyConsolidations(HIGH_CONFIDENCE);

  let mediumDemoted = [];
  let finalRows = rows;
  if (includeMedium) {
    const mediumResult = applyConsolidations(MEDIUM_CONFIDENCE);
    mediumDemoted = mediumResult.demoted;
    finalRows = mediumResult.rows;
  }

  const summary = updateDedupSummary(finalRows);
  const publishedAfter = summary.publishedFaqs;

  console.log(`Alt consolidation complete (${includeMedium ? "high + medium" : "high confidence only"})`);
  console.log(`Demoted ${demoted.length + mediumDemoted.length} FAQs to alt phrasing`);
  console.log(`Published: ${publishedBefore} → ${publishedAfter}`);

  console.log("\nHigh-confidence demotions:");
  demoted.forEach(({ keeper, demoteId, question }) => {
    console.log(`  ${demoteId} → ${keeper}: ${question.slice(0, 60)}${question.length > 60 ? "…" : ""}`);
  });

  if (mediumDemoted.length) {
    console.log("\nMedium-confidence demotions:");
    mediumDemoted.forEach(({ keeper, demoteId, question }) => {
      console.log(`  ${demoteId} → ${keeper}: ${question.slice(0, 60)}${question.length > 60 ? "…" : ""}`);
    });
  }

  console.log(
    `\nSummary: ${summary.canonicalFaqs} canonical, ${summary.answeredCanonical} with answers, ${summary.publishedFaqs} published, ${summary.altQuestionPhrasings} alt phrasings`
  );
}

main();
