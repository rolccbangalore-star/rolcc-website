const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "data", "articles");
const OUT_FILE = path.join(ARTICLES_DIR, "composer-cards.json");

const COLLECTIONS = ["everyday-faith", "back-to-bible"];

const CARD_FIELDS = ["title", "author", "category", "date", "thumbnail", "publish"];

function cardPreviewFromArticle(data) {
  const preview = {};
  CARD_FIELDS.forEach((field) => {
    if (data[field] !== undefined && data[field] !== null && data[field] !== "") {
      preview[field] = data[field];
    }
  });
  if (preview.publish === undefined) preview.publish = true;
  if (!preview.author) {
    preview.author = data.passage ? "ROLCC Fellowship Team" : "ROLCC Pastoral Team";
  }
  if (!preview.category) preview.category = data.passage ? "Bible Study" : "General";
  return preview;
}

function buildManifest() {
  const manifest = {};

  COLLECTIONS.forEach((collection) => {
    const dir = path.join(ARTICLES_DIR, collection);
    if (!fs.existsSync(dir)) return;

    manifest[collection] = {};

    fs.readdirSync(dir).forEach((fileName) => {
      if (!fileName.endsWith(".json") || fileName === "composer-cards.json") return;
      const slug = fileName.replace(/\.json$/, "");
      const raw = fs.readFileSync(path.join(dir, fileName), "utf8");
      try {
        manifest[collection][slug] = cardPreviewFromArticle(JSON.parse(raw));
      } catch (err) {
        console.warn("Skipping invalid article JSON:", path.join(collection, fileName), err.message);
      }
    });
  });

  return manifest;
}

function main() {
  const manifest = buildManifest();
  fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  const count = COLLECTIONS.reduce((sum, name) => sum + Object.keys(manifest[name] || {}).length, 0);
  console.log("Wrote " + count + " composer card previews to data/articles/composer-cards.json");
}

main();
