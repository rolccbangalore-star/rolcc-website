const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "127.0.0.1";

if (!fs.existsSync(path.join(ROOT, "articles.html"))) {
  console.error("\nERROR: articles.html not found.");
  console.error("Run this first from the project folder:");
  console.error("  node scripts/build-articles.js");
  console.error("\nOr double-click: preview-local.bat\n");
  process.exit(1);
}

function parseRewrite({ source, destination }) {
  const paramNames = [];
  const regexSource = source
    .replace(/:([^/()]+)(\([^)]*\))?/g, (_, name, pattern) => {
      paramNames.push(name);
      if (pattern) return `(${pattern.slice(1, -1)})`;
      return "([^/]+)";
    })
    .replace(/\//g, "\\/");

  return {
    source: new RegExp("^" + regexSource + "$"),
    destination,
    paramNames,
  };
}

const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
const rewrites = (vercel.rewrites || []).map(parseRewrite);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function applyRewrite(urlPath, rewrite) {
  const match = urlPath.match(rewrite.source);
  if (!match) return null;

  let target = rewrite.destination;
  rewrite.paramNames.forEach((name, index) => {
    target = target.replace(new RegExp(`:${name}(?=[./]|$)`, "g"), match[index + 1]);
  });
  target = target.replace(/\$(\d+)/g, (_, n) => match[Number(n)] || "");
  return target;
}

function resolvePath(urlPath) {
  let target = urlPath.split("?")[0];
  if (target === "/") target = "/index.html";

  for (const rewrite of rewrites) {
    const rewritten = applyRewrite(target, rewrite);
    if (rewritten) {
      target = rewritten;
      break;
    }
  }

  if (!path.extname(target)) target += ".html";
  return path.join(ROOT, target.replace(/^\//, "").replace(/\//g, path.sep));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === "ENOENT" ? 404 : 500);
      res.end(err.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const filePath = resolvePath(req.url || "/");
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  sendFile(res, filePath);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\nERROR: Port ${PORT} is already in use.`);
    console.error("Either stop the other server, or run on a different port:");
    console.error(`  set PORT=3001 && node scripts/local-preview.js\n`);
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`ROLCC local preview running`);
  console.log(`  Home:     http://${HOST}:${PORT}/`);
  console.log(`  Articles: http://${HOST}:${PORT}/articles`);
  console.log(`  Sample:   http://${HOST}:${PORT}/articles/everyday-faith/how-to-stop-stressing-and-trust-god`);
  console.log(`\nPress Ctrl+C to stop.\n`);
});
