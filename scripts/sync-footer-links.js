/**
 * Sync footer link columns across site HTML pages.
 * Adds Personal Caring column; removes Membership from Navigation.
 * Uses depth counting so nested Connect icon wrappers are not truncated.
 * Normalizes wrapper closes after the grid (exactly two before mt-auto).
 */
const fs = require("fs");
const path = require("path");
const { getFooterLinksGridHtml } = require("./footer-links-template");

const ROOT = path.join(__dirname, "..");
const GRID_OPEN_RE =
  /<div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-\d[^"]*"[^>]*>/;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === "admin"
    )
      continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function findBalancedGridRange(html, fromIndex) {
  const slice = html.slice(fromIndex);
  const openMatch = slice.match(GRID_OPEN_RE);
  if (!openMatch) return null;

  const start = fromIndex + openMatch.index;
  let i = start + openMatch[0].length;
  let depth = 1;

  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", i);
    const nextClose = html.indexOf("</div>", i);
    if (nextClose < 0) return null;

    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
    } else {
      depth -= 1;
      i = nextClose + 6;
      if (depth === 0) {
        return { start, end: i };
      }
    }
  }
  return null;
}

function syncFile(filePath) {
  let html = fs.readFileSync(filePath, "utf8");
  if (!html.includes('id="footer-section"')) return false;

  const footerStart = html.indexOf('id="footer-section"');
  if (footerStart < 0) return false;

  const range = findBalancedGridRange(html, footerStart);
  if (!range) {
    console.warn("No footer grid:", path.relative(ROOT, filePath));
    return false;
  }

  const afterGrid = html.slice(range.end);
  const mtAuto = afterGrid.search(/<div class="mt-auto/);
  if (mtAuto < 0) {
    console.warn("No mt-auto after footer grid:", path.relative(ROOT, filePath));
    return false;
  }

  // Keep only whitespace + exactly two closing wrappers before copyright band
  const wrappers = "\n        </div>\n        </div>\n        ";
  const next =
    html.slice(0, range.start) +
    getFooterLinksGridHtml().trim() +
    wrappers +
    afterGrid.slice(mtAuto);

  if (next === html) return false;
  fs.writeFileSync(filePath, next, "utf8");
  return true;
}

const files = walk(ROOT);
let updated = 0;
for (const file of files) {
  try {
    if (syncFile(file)) {
      updated++;
      console.log("Updated", path.relative(ROOT, file));
    }
  } catch (err) {
    console.error("Failed", path.relative(ROOT, file), err.message);
  }
}
console.log(`Done. updated=${updated}`);
