const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "data", "media");
const OUT_FILE = path.join(OUT_DIR, "manifest.json");

const SCAN_ROOTS = [
  { diskPath: path.join(ROOT, "assets"), publicPrefix: "/assets" },
  { diskPath: path.join(ROOT, "images"), publicPrefix: "/images" },
];

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"]);

function isImageFile(fileName) {
  return IMAGE_EXT.has(path.extname(fileName).toLowerCase());
}

function walkImages(dir, publicPrefix, baseDiskPath, entries) {
  if (!fs.existsSync(dir)) return;

  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    var fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkImages(fullPath, publicPrefix, baseDiskPath, entries);
      return;
    }
    if (!entry.isFile() || !isImageFile(entry.name)) return;

    var relative = path.relative(baseDiskPath, fullPath);
    var publicPath = publicPrefix + "/" + relative.split(path.sep).join("/");
    var source = publicPath.indexOf("/assets/articles/") === 0 ? "articles" : "site";
    var folder = publicPrefix === "/assets" ? "assets" : "images";

    entries.push({
      path: publicPath,
      name: entry.name,
      source: source,
      folder: folder,
    });
  });
}

function buildManifest() {
  var entries = [];

  SCAN_ROOTS.forEach(function (root) {
    walkImages(root.diskPath, root.publicPrefix, root.diskPath, entries);
  });

  entries.sort(function (a, b) {
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return entries;
}

function main() {
  var manifest = buildManifest();
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log("Wrote " + manifest.length + " media entries to data/media/manifest.json");
}

main();
