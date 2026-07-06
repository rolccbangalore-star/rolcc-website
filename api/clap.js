const { Redis } = require("@upstash/redis");

const MAX_INCREMENT = 50;

function clapKey(slug) {
  return `clap:${slug}`;
}

function getRedis() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.STORAGE_REDIS_REST_URL ||
    process.env.STORAGE_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.STORAGE_REDIS_REST_TOKEN ||
    process.env.STORAGE_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function parseAmount(req) {
  let amount = 1;
  if (req.body && typeof req.body === "object" && req.body.amount != null) {
    amount = Number(req.body.amount);
  } else if (req.query.amount != null) {
    amount = Number(req.query.amount);
  }
  if (!Number.isFinite(amount) || amount < 1) return 1;
  return Math.min(Math.floor(amount), MAX_INCREMENT);
}

module.exports = async function handler(req, res) {
  const slug = String(req.query.slug || "").trim();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: "Invalid slug" });
  }

  const redis = getRedis();
  if (!redis) {
    return res.status(503).json({
      error: "Clap storage not configured",
      hint: "Connect a free Upstash Redis database in Vercel → Storage → Upstash.",
    });
  }

  const key = clapKey(slug);

  try {
    if (req.method === "GET") {
      const count = (await redis.get(key)) || 0;
      return res.status(200).json({ count: Number(count) || 0 });
    }

    if (req.method === "POST") {
      const amount = parseAmount(req);
      const count = await redis.incrby(key, amount);
      return res.status(200).json({ count: Number(count) || 0, added: amount });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Clap API error:", err);
    return res.status(503).json({ error: "Clap service unavailable" });
  }
};
