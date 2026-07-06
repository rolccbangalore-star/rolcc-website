#!/usr/bin/env node
/**
 * Write a ChatGPT/export JSON file into data/articles/ for Decap CMS.
 * Usage: node scripts/import-article-to-repo.js path/to/article.json [slug]
 */
const fs = require("fs");
const path = require("path");

function trim(value) {
  return String(value || "").trim();
}

function stripInternalKeys(entry) {
  var out = Object.assign({}, entry || {});
  Object.keys(out).forEach(function (key) {
    if (key.charAt(0) === "_") delete out[key];
  });
  return out;
}

function normalizeBlocks(blocks) {
  return (blocks || [])
    .map(function (block) {
      if (!block || typeof block !== "object") return null;
      if (block.type === "list" && block.items) {
        return { type: "bulletList", items: block.items };
      }
      return block;
    })
    .filter(Boolean);
}

function normalizeBlockForDisk(block) {
  if (!block || typeof block !== "object") return null;
  var out = Object.assign({}, block);
  if (out.type === "bulletList") out.type = "list";
  if (out.type === "scriptureCallout") out.type = "scripture";
  if (out.type === "list" && Array.isArray(out.items)) {
    out.items = out.items
      .map(function (item) {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") return trim(item.item || item.text || "");
        return "";
      })
      .filter(Boolean);
  }
  return out;
}

function slugifyTitle(title) {
  return (
    trim(title || "untitled")
      .toLowerCase()
      .replace(/['']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

function normalizeQuizItem(item) {
  if (!item || typeof item !== "object") return null;
  return {
    question: trim(item.question),
    options: (item.options || []).map(function (opt) {
      return typeof opt === "string" ? opt : trim(opt.option || opt.text || "");
    }),
    correctIndex: typeof item.correctIndex === "number" ? item.correctIndex : 0,
    explanation: trim(item.explanation || ""),
  };
}

function normalizeEntryForDisk(entry, collection) {
  var out = stripInternalKeys(Object.assign({}, entry || {}));
  if ((out.quiz || []).length && out.includeQuiz !== true) {
    out.includeQuiz = true;
  }
  if (out.quiz && out.quiz.length) {
    out.quiz = out.quiz.map(normalizeQuizItem).filter(Boolean);
  }

  if (collection === "bible-study") {
    out.sections = out.sections || [];
    out.discussionQuestions = (out.discussionQuestions || [])
      .map(function (q) {
        return typeof q === "string" ? q : trim(q.question || "");
      })
      .filter(Boolean);
  } else {
    out.blocks = normalizeBlocks(out.blocks || []).map(normalizeBlockForDisk).filter(Boolean);
    out.keyTakeaways = (out.keyTakeaways || [])
      .map(function (k) {
        return typeof k === "string" ? k : trim(k.item || k.text || "");
      })
      .filter(Boolean);
  }

  if (!out.thumbnail) out.thumbnail = "/images/og-image.jpg";
  if (out.publish === undefined) out.publish = false;
  if (out.featured === undefined) out.featured = false;

  return out;
}

function detectCollection(data, inputPath) {
  if (data.sections || data.passage) return "bible-study";
  var lower = inputPath.toLowerCase();
  if (lower.includes("back-to-bible") || lower.includes("bible-study")) return "bible-study";
  return "articles";
}

function main() {
  var inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node scripts/import-article-to-repo.js <article.json> [slug]");
    process.exit(1);
  }

  var resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) {
    console.error("File not found:", resolved);
    process.exit(1);
  }

  var raw = JSON.parse(fs.readFileSync(resolved, "utf8"));
  var collection = detectCollection(raw, resolved);
  var entry = normalizeEntryForDisk(raw, collection);
  var slug = process.argv[3] || slugifyTitle(entry.title);
  var folder =
    collection === "bible-study"
      ? path.join(__dirname, "..", "data", "articles", "back-to-bible")
      : path.join(__dirname, "..", "data", "articles", "everyday-faith");
  var outPath = path.join(folder, slug + ".json");

  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(entry, null, 2) + "\n", "utf8");
  console.log("Wrote", outPath);
  console.log("Open it in the CMS, then set tag, date, featured, and published.");
}

main();
