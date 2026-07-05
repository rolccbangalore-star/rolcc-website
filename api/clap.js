const { kv } = require("@vercel/kv");

function clapKey(slug) {
  return `clap:${slug}`;
}

module.exports = async function handler(req, res) {
  const slug = String(req.query.slug || "").trim();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: "Invalid slug" });
  }

  const key = clapKey(slug);

  try {
    if (req.method === "GET") {
      const count = (await kv.get(key)) || 0;
      return res.status(200).json({ count: Number(count) || 0 });
    }

    if (req.method === "POST") {
      const count = await kv.incr(key);
      return res.status(200).json({ count: Number(count) || 0 });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Clap API error:", err);
    return res.status(503).json({ error: "Clap service unavailable" });
  }
};
