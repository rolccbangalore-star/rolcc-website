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
const SCAN_EXT = new Set([".html", ".css", ".js", ".json", ".yml", ".yaml"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "admin", ".cursor"]);

const PAGE_LABELS = {
  "index.html": "Home",
  "about.html": "About Us",
  "services.html": "Services",
  "contact.html": "Contact",
  "giving.html": "Giving",
  "events.html": "Events",
  "membership.html": "Membership",
  "counselling.html": "Counselling",
  "fellowship.html": "Cell Fellowship",
  "river-kids.html": "River Kids",
  "rolf.html": "ROLF",
  "pmd.html": "PMD",
  "articles.html": "Articles",
};

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

function walkSiteFiles(dir, relBase, files) {
  if (!fs.existsSync(dir)) return;

  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    if (SKIP_DIRS.has(entry.name)) return;
    var fullPath = path.join(dir, entry.name);
    var relPath = relBase ? path.join(relBase, entry.name) : entry.name;

    if (entry.isDirectory()) {
      walkSiteFiles(fullPath, relPath, files);
      return;
    }

    if (!SCAN_EXT.has(path.extname(entry.name).toLowerCase())) return;
    files.push({
      abs: fullPath,
      rel: relPath.split(path.sep).join("/"),
    });
  });
}

function titleFromArticleJson(filePath) {
  try {
    var data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (data && data.title) return "Article: " + data.title;
  } catch (err) {
    /* ignore */
  }
  return null;
}

function labelForFile(relPath) {
  if (PAGE_LABELS[relPath]) return PAGE_LABELS[relPath];
  if (/^faq(-\d+)?\.html$/i.test(path.basename(relPath))) return "FAQ";
  if (relPath.indexOf("articles/") === 0 && relPath.endsWith(".html")) {
    var slug = path.basename(relPath, ".html");
    return (
      "Article: " +
      slug
        .split("-")
        .map(function (word) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ")
    );
  }
  if (relPath.indexOf("data/articles/") === 0 && relPath.endsWith(".json")) {
    return titleFromArticleJson(path.join(ROOT, relPath)) || relPath;
  }
  if (relPath === "data/articles.json") return "Articles index";
  var base = path.basename(relPath, path.extname(relPath));
  return base.replace(/-/g, " ").replace(/\b\w/g, function (c) {
    return c.toUpperCase();
  });
}

function pathVariants(publicPath) {
  var variants = [publicPath, publicPath.slice(1)];
  try {
    variants.push(encodeURI(publicPath), encodeURI(publicPath.slice(1)));
  } catch (err) {
    /* ignore */
  }
  return variants.filter(Boolean);
}

function contentReferencesPath(content, publicPath) {
  return pathVariants(publicPath).some(function (variant) {
    return content.indexOf(variant) !== -1;
  });
}

function collectUsages(manifest, siteFiles) {
  var usageMap = Object.create(null);

  siteFiles.forEach(function (file) {
    var content;
    try {
      content = fs.readFileSync(file.abs, "utf8");
    } catch (err) {
      return;
    }

    var label = labelForFile(file.rel);
    manifest.forEach(function (entry) {
      if (!contentReferencesPath(content, entry.path)) return;
      if (!usageMap[entry.path]) usageMap[entry.path] = [];
      if (usageMap[entry.path].indexOf(label) === -1) {
        usageMap[entry.path].push(label);
      }
    });
  });

  return usageMap;
}

function buildManifest() {
  var entries = [];

  SCAN_ROOTS.forEach(function (root) {
    walkImages(root.diskPath, root.publicPrefix, root.diskPath, entries);
  });

  entries.sort(function (a, b) {
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  var siteFiles = [];
  walkSiteFiles(ROOT, "", siteFiles);
  var usageMap = collectUsages(entries, siteFiles);

  return entries.map(function (entry) {
    var usedOn = usageMap[entry.path] || [];
    usedOn.sort(function (a, b) {
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
    if (!usedOn.length) return entry;
    return Object.assign({}, entry, { usedOn: usedOn });
  });
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
