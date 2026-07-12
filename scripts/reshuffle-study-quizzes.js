const fs = require("fs");
const path = require("path");
const { shuffleQuizItem, hashSeed } = require("./article-config");

const dir = path.join(__dirname, "..", "data", "articles", "back-to-bible");
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith(".json")) continue;
  const full = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(full, "utf8"));
  if (!data.quiz || !data.quiz.length) continue;
  const slug = file.replace(/\.json$/, "");
  data.quiz = data.quiz.map((item) =>
    shuffleQuizItem(item, hashSeed(slug + "|" + (item.question || "")))
  );
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("Reshuffled quiz:", file);
}
