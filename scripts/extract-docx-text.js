const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function docxText(filePath) {
  const escaped = filePath.replace(/'/g, "''");
  const ps = [
    "Add-Type -AssemblyName System.IO.Compression.FileSystem",
    `$z = [IO.Compression.ZipFile]::OpenRead('${escaped}')`,
    "$e = $z.GetEntry('word/document.xml')",
    "$r = New-Object IO.StreamReader($e.Open())",
    "$xml = $r.ReadToEnd()",
    "$r.Close()",
    "$z.Dispose()",
    "$xml",
  ].join("; ");
  const xml = execFileSync("powershell", ["-NoProfile", "-Command", ps], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return xml
    .replace(/<w:tab[^/]*\/>/g, "\t")
    .replace(/<w:br[^/]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/extract-docx-text.js <path>");
  process.exit(1);
}
console.log(docxText(path.resolve(target)));
