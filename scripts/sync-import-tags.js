#!/usr/bin/env node
/**
 * Sync data/tags/index.json into ChatGPT import JSON templates.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TAGS_INDEX = path.join(ROOT, "data", "tags", "index.json");
const TEMPLATES = [
  {
    file: path.join(ROOT, "admin", "templates", "blog-content-import.json"),
    tagInstructions:
      "Read the full sermon article (title, summary, description, blocks, and takeaways). From _allowedTags only, pick the 1–2 tags that best match the content's main themes, emotional tone, and practical application. Use exact spelling. Prefer 2 tags when the sermon clearly spans two topics (e.g. anxiety at work → Anxiety & Stress and Work & Calling). Never invent tags outside _allowedTags.",
    tagInstruction:
      "REQUIRED: fill the tags array with 1–2 tags from _allowedTags based on content relevance (see _tagInstructions).",
  },
  {
    file: path.join(ROOT, "admin", "templates", "back-to-bible-content-import.json"),
    tagInstructions:
      "Read the full Bible study (title, description, passage, sections, and discussion questions). From _allowedTags only, pick the 1–2 tags that best match the study's themes and application. Always include Bible Study when appropriate. Add one topical tag when the passage clearly connects to everyday life (e.g. grief, family, prayer). Use exact spelling. Never invent tags outside _allowedTags.",
    tagInstruction:
      "REQUIRED: fill the tags array with 1–2 tags from _allowedTags based on content relevance (see _tagInstructions). Include Bible Study when it fits.",
  },
];

function loadTags() {
  const data = JSON.parse(fs.readFileSync(TAGS_INDEX, "utf8"));
  return Array.isArray(data.tags) ? data.tags.slice() : [];
}

function stripTagClauses(text) {
  return String(text || "")
    .replace(/\s*REQUIRED:\s*fill the tags array[\s\S]*?(?=\s*Do not include|\s*Omit|\s*$)/gi, " ")
    .replace(/\s*Include a tags array[\s\S]*?(?=\s*Do not include|\s*Omit|\s*$)/gi, " ")
    .replace(/\s*Do not include tag[^.]*\./gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildInstructions(current, tagInstruction) {
  var base = stripTagClauses(current);
  base = base.replace(/\s*Do not include date, hero image, featured, or published\.?/gi, " ").replace(/\s+/g, " ").trim();
  if (base && !/[.!?]$/.test(base)) base += ".";
  return (base + " " + tagInstruction + " Do not include date, hero image, featured, or published.").replace(/\s+/g, " ").trim();
}

function main() {
  const tags = loadTags();
  if (!tags.length) {
    console.error("No tags found in", TAGS_INDEX);
    process.exit(1);
  }

  TEMPLATES.forEach(function (template) {
    const raw = JSON.parse(fs.readFileSync(template.file, "utf8"));
    raw._instructions = buildInstructions(raw._instructions, template.tagInstruction);
    raw._tagInstructions = template.tagInstructions;
    raw._allowedTags = tags;
    raw.tags = [];
    fs.writeFileSync(template.file, JSON.stringify(raw, null, 2) + "\n", "utf8");
    console.log("Updated", path.relative(ROOT, template.file));
  });
}

main();
