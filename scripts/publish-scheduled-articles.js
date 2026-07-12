const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const COLLECTIONS = [
  { folder: "everyday-faith" },
  { folder: "back-to-bible" },
];

const VALID_WINDOWS = new Set(["morning", "evening"]);

function getIstToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function normalizeScheduleWindow(value) {
  const window = String(value || "").trim().toLowerCase();
  return VALID_WINDOWS.has(window) ? window : "";
}

function shouldPublishArticle(data, today, runWindow) {
  if (data.publish !== false) return false;

  const scheduleDate = String(data.scheduleDate || "").trim();
  const scheduleWindow = normalizeScheduleWindow(data.scheduleWindow);
  if (!scheduleDate || !scheduleWindow) return false;
  if (scheduleDate > today) return false;

  if (scheduleDate < today) return true;
  return scheduleWindow === runWindow;
}

function publishScheduledInFile(filePath, today, runWindow) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  if (!shouldPublishArticle(data, today, runWindow)) {
    return false;
  }

  data.publish = true;
  delete data.scheduleDate;
  delete data.scheduleWindow;
  if (!data.date) data.date = today;

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  return true;
}

function main() {
  const runWindow = normalizeScheduleWindow(process.argv[2] || process.env.SCHEDULE_WINDOW);
  if (!runWindow) {
    console.error("Usage: node scripts/publish-scheduled-articles.js <morning|evening>");
    process.exit(1);
  }

  const today = getIstToday();
  let published = 0;

  COLLECTIONS.forEach(({ folder }) => {
    const dir = path.join(ROOT, "data", "articles", folder);
    if (!fs.existsSync(dir)) return;

    fs.readdirSync(dir).forEach((fileName) => {
      if (!fileName.endsWith(".json")) return;
      const filePath = path.join(dir, fileName);
      if (publishScheduledInFile(filePath, today, runWindow)) {
        published += 1;
        console.log("Published " + path.join(folder, fileName));
      }
    });
  });

  console.log(
    "Schedule run (" +
      runWindow +
      ", " +
      today +
      " IST): published " +
      published +
      " article" +
      (published === 1 ? "" : "s")
  );
}

main();
