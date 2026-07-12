const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");

async function main() {
  const folder = "A:/Church Blog/Back to Bible";
  const outDir = path.join(__dirname, "..", "data");
  for (const name of fs.readdirSync(folder)) {
    if (!name.toLowerCase().endsWith(".pdf")) continue;
    const full = path.join(folder, name);
    const buf = fs.readFileSync(full);
    const parser = new PDFParse({ data: buf });
    const data = await parser.getText();
    const outName = "_source-" + name.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().replace(/^-+|-+$/g, "") + ".txt";
    fs.writeFileSync(path.join(outDir, outName), data.text, "utf8");
    console.log(name, "->", outName, data.text.length, "chars");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
