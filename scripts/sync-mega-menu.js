/**
 * Sync mega-menu panel + always-visible hamburger across site HTML pages
 * and generated header templates in build scripts.
 */
const fs = require("fs");
const path = require("path");
const { getMegaMenuPanelHtml, getHamburgerButtonHtml } = require("./mega-menu-template");

const ROOT = path.join(__dirname, "..");

const HAMBURGER_RE =
  /<button id="nav-toggle"[\s\S]*?<\/button>/;

const OLD_MENU_RE =
  /<!-- Mobile menu -->\s*<div id="nav-menu"[\s\S]*?<\/div>\s*(?=<\/header>)/;

const MARKER_MENU_RE =
  /<!-- @mega-menu:start -->[\s\S]*?<!-- @mega-menu:end -->/;

const LEGACY_MENU_RE =
  /<div id="nav-menu" class="header-top__menu[\s\S]*?<\/div>\s*(?=<\/header>)/;

function replaceHamburger(html) {
  if (!HAMBURGER_RE.test(html)) return html;
  return html.replace(HAMBURGER_RE, getHamburgerButtonHtml().trim());
}

function replaceMenu(html) {
  const panel = getMegaMenuPanelHtml().trim() + "\n";
  if (MARKER_MENU_RE.test(html)) {
    return html.replace(MARKER_MENU_RE, panel);
  }
  if (OLD_MENU_RE.test(html)) {
    return html.replace(OLD_MENU_RE, panel);
  }
  if (LEGACY_MENU_RE.test(html)) {
    return html.replace(LEGACY_MENU_RE, panel);
  }
  return html;
}

function processHtml(filePath) {
  let html = fs.readFileSync(filePath, "utf8");
  if (!html.includes('id="nav-toggle"') && !html.includes('id="nav-menu"')) return false;
  const before = html;
  html = replaceHamburger(html);
  html = replaceMenu(html);
  if (html === before) return false;
  fs.writeFileSync(filePath, html, "utf8");
  return true;
}

function walkHtmlFiles(dir, out = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "admin") return;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtmlFiles(full, out);
    else if (entry.name.endsWith(".html")) out.push(full);
  });
  return out;
}

function patchBuildScript(filePath, patterns) {
  if (!fs.existsSync(filePath)) return;
  let src = fs.readFileSync(filePath, "utf8");
  let changed = false;
  patterns.forEach(({ find, replace }) => {
    if (find.test(src)) {
      src = src.replace(find, replace);
      changed = true;
    }
  });
  if (changed) {
    fs.writeFileSync(filePath, src, "utf8");
    console.log(`Patched ${path.relative(ROOT, filePath)}`);
  }
}

function main() {
  const files = walkHtmlFiles(ROOT);
  let count = 0;
  files.forEach((file) => {
    if (processHtml(file)) {
      count += 1;
      console.log(`Updated ${path.relative(ROOT, file)}`);
    }
  });
  console.log(`Mega menu synced on ${count} HTML files.`);
}

main();
