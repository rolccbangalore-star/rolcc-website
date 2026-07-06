const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "data", "media");
const OUT_FILE = path.join(OUT_DIR, "manifest.json");
const PAGES_FILE = path.join(OUT_DIR, "pages.json");

const SCAN_ROOTS = [
  { diskPath: path.join(ROOT, "assets"), publicPrefix: "/assets" },
  { diskPath: path.join(ROOT, "images"), publicPrefix: "/images" },
];

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"]);
const SCAN_EXT = new Set([".html", ".css", ".js", ".json", ".yml", ".yaml"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "admin", ".cursor"]);

const HIDDEN_PAGE_LABELS = new Set([
  "Manifest",
  "Styles",
  "Build Articles",
  "Build Faq",
  "Articles index",
  "Article Config",
]);

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

function readPngSize(buf) {
  if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readGifSize(buf) {
  if (buf.length < 10 || buf.toString("ascii", 0, 3) !== "GIF") return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

function readJpegSize(buf) {
  var i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) break;
    var marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 9) };
    }
    var len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return null;
}

function readWebpSize(buf) {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF") return null;
  if (buf.toString("ascii", 8, 12) !== "WEBP") return null;
  var chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X" && buf.length >= 30) {
    return {
      width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
      height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
    };
  }
  if (chunk === "VP8 " && buf.length >= 30) {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  return null;
}

function readSvgSize(buf) {
  var text = buf.toString("utf8", 0, Math.min(buf.length, 8192));
  var widthMatch = text.match(/\bwidth=["']([\d.]+)/i);
  var heightMatch = text.match(/\bheight=["']([\d.]+)/i);
  if (widthMatch && heightMatch) {
    return { width: Math.round(parseFloat(widthMatch[1])), height: Math.round(parseFloat(heightMatch[1])) };
  }
  var viewBox = text.match(/viewBox=["'][\d.\s]+[\d.\s]+[\d.\s]+([\d.]+)\s+([\d.]+)/i);
  if (viewBox) {
    return { width: Math.round(parseFloat(viewBox[1])), height: Math.round(parseFloat(viewBox[2])) };
  }
  return null;
}

function readImageDimensions(filePath) {
  try {
    var buf = fs.readFileSync(filePath);
    var ext = path.extname(filePath).toLowerCase();
    var size = null;
    if (ext === ".png") size = readPngSize(buf);
    else if (ext === ".gif") size = readGifSize(buf);
    else if (ext === ".jpg" || ext === ".jpeg") size = readJpegSize(buf);
    else if (ext === ".webp") size = readWebpSize(buf);
    else if (ext === ".svg") size = readSvgSize(buf);
    if (!size || !size.width || !size.height) return null;
    return size;
  } catch (err) {
    return null;
  }
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
    var dims = readImageDimensions(fullPath);

    var item = {
      path: publicPath,
      name: entry.name,
      source: source,
      folder: folder,
    };
    if (dims) {
      item.width = dims.width;
      item.height = dims.height;
    }
    entries.push(item);
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

function isBrowsablePageLabel(label) {
  return label && !HIDDEN_PAGE_LABELS.has(label);
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

function countOccurrences(content, publicPath) {
  var total = 0;
  pathVariants(publicPath).forEach(function (variant) {
    var idx = 0;
    while ((idx = content.indexOf(variant, idx)) !== -1) {
      total += 1;
      idx += variant.length || 1;
    }
  });
  return total;
}

function collectUsages(manifest, siteFiles) {
  var usageMap = Object.create(null);
  var countMap = Object.create(null);

  siteFiles.forEach(function (file) {
    var content;
    try {
      content = fs.readFileSync(file.abs, "utf8");
    } catch (err) {
      return;
    }

    var label = labelForFile(file.rel);
    if (!isBrowsablePageLabel(label)) return;

    manifest.forEach(function (entry) {
      if (!contentReferencesPath(content, entry.path)) return;
      if (!usageMap[entry.path]) usageMap[entry.path] = [];
      if (usageMap[entry.path].indexOf(label) === -1) {
        usageMap[entry.path].push(label);
      }
      countMap[entry.path] = (countMap[entry.path] || 0) + countOccurrences(content, entry.path);
    });
  });

  return { usageMap: usageMap, countMap: countMap };
}

function contentReferencesPath(content, publicPath) {
  return pathVariants(publicPath).some(function (variant) {
    return content.indexOf(variant) !== -1;
  });
}

function pageIdFromLabel(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isWebsitePageLabel(label) {
  if (!isBrowsablePageLabel(label)) return false;
  if (label.indexOf("Article:") === 0) return false;
  if (label.indexOf("/") !== -1 || /\.json$/i.test(label)) return false;
  return true;
}

function buildPagesList(manifest) {
  var pageKeys = new Set();
  var usedIds = new Set(["all", "unassigned"]);
  var pages = [{ id: "all", label: "All pages" }];
  var hasUnassigned = manifest.some(function (entry) {
    return !entry.usageCount;
  });
  if (hasUnassigned) {
    pages.push({ id: "unassigned", label: "Unassigned" });
  }

  manifest.forEach(function (entry) {
    (entry.usedOn || []).forEach(function (label) {
      if (!isWebsitePageLabel(label)) return;
      var key = label.toLowerCase();
      if (pageKeys.has(key)) return;
      pageKeys.add(key);
      var id = pageIdFromLabel(label);
      var baseId = id;
      var suffix = 2;
      while (usedIds.has(id)) {
        id = baseId + "-" + suffix;
        suffix += 1;
      }
      usedIds.add(id);
      pages.push({ id: id, label: label });
    });
  });

  pages.sort(function (a, b) {
    if (a.id === "all") return -1;
    if (b.id === "all") return 1;
    if (a.id === "unassigned") return -1;
    if (b.id === "unassigned") return 1;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });

  return pages;
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
  var usage = collectUsages(entries, siteFiles);

  var manifest = entries.map(function (entry) {
    var usedOn = usage.usageMap[entry.path] || [];
    usedOn.sort(function (a, b) {
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
    var usageCount = usage.countMap[entry.path] || 0;
    var next = Object.assign({}, entry, { usageCount: usageCount });
    if (usedOn.length) next.usedOn = usedOn;
    return next;
  });

  return { manifest: manifest, pages: buildPagesList(manifest) };
}

function main() {
  var result = buildManifest();
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(result.manifest, null, 2) + "\n", "utf8");
  fs.writeFileSync(PAGES_FILE, JSON.stringify(result.pages, null, 2) + "\n", "utf8");
  console.log(
    "Wrote " + result.manifest.length + " media entries and " + result.pages.length + " pages to data/media/"
  );
}

main();
