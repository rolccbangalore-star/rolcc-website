const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "data", "articles");
const OUT_FILE = path.join(ARTICLES_DIR, "composer-cards.json");

const COLLECTIONS = [
  { id: "articles", folder: "everyday-faith" },
  { id: "bible-study", folder: "back-to-bible" },
];

const CARD_FIELDS = [
  "title",
  "author",
  "category",
  "tags",
  "date",
  "modified",
  "thumbnail",
  "publish",
  "featured",
  "scheduleDate",
  "scheduleWindow",
];

function toDateOnly(value) {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

function cardPreviewFromArticle(data, filePath) {
  const preview = {};
  CARD_FIELDS.forEach((field) => {
    if (data[field] !== undefined && data[field] !== null && data[field] !== "") {
      preview[field] = data[field];
    }
  });
  if (filePath) {
    preview.modified = toDateOnly(fs.statSync(filePath).mtime);
  }
  if (preview.publish === undefined) preview.publish = true;
  if (!preview.author) {
    preview.author = data.passage ? "ROLCC Fellowship Team" : "ROLCC Pastoral Team";
  }
  if (!preview.category) preview.category = data.passage ? "Bible Study" : "General";
  if (Array.isArray(data.tags) && data.tags.length) {
    preview.tags = data.tags
      .map((item) => (typeof item === "string" ? item : item?.tag || ""))
      .map((tag) => String(tag).trim())
      .filter(Boolean);
    if (!preview.category && preview.tags[0]) preview.category = preview.tags[0];
  }
  return preview;
}

function buildManifest() {
  const manifest = {};

  COLLECTIONS.forEach((collection) => {
    const dir = path.join(ARTICLES_DIR, collection.folder);
    if (!fs.existsSync(dir)) return;

    manifest[collection.id] = {};

    fs.readdirSync(dir).forEach((fileName) => {
      if (!fileName.endsWith(".json") || fileName === "composer-cards.json") return;
      const slug = fileName.replace(/\.json$/, "");
      const filePath = path.join(dir, fileName);
      const raw = fs.readFileSync(filePath, "utf8");
      try {
        manifest[collection.id][slug] = cardPreviewFromArticle(JSON.parse(raw), filePath);
      } catch (err) {
        console.warn("Skipping invalid article JSON:", path.join(collection.folder, fileName), err.message);
      }
    });
  });

  return manifest;
}

function main() {
  const manifest = buildManifest();
  fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  const count = COLLECTIONS.reduce((sum, entry) => sum + Object.keys(manifest[entry.id] || {}).length, 0);
  console.log("Wrote " + count + " composer card previews to data/articles/composer-cards.json");
}

main();
