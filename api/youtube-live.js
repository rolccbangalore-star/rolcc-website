const https = require("https");

const CHANNEL_HANDLE = String(process.env.YOUTUBE_CHANNEL_HANDLE || "rolccindia").replace(/^@/, "");
let cachedChannelId = "";

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

async function getChannelId(apiKey) {
  if (cachedChannelId) return cachedChannelId;

  const url =
    "https://www.googleapis.com/youtube/v3/channels?part=id" +
    `&forHandle=${encodeURIComponent(CHANNEL_HANDLE)}` +
    `&key=${encodeURIComponent(apiKey)}`;
  const payload = await httpsGetJson(url);
  const channel = payload.items && payload.items[0];
  if (!channel || !channel.id) {
    throw new Error(`Channel @${CHANNEL_HANDLE} not found`);
  }

  cachedChannelId = channel.id;
  return cachedChannelId;
}

async function getLiveStream(apiKey, channelId) {
  const url =
    "https://www.googleapis.com/youtube/v3/search?part=snippet" +
    `&channelId=${encodeURIComponent(channelId)}` +
    "&eventType=live&type=video&maxResults=1" +
    `&key=${encodeURIComponent(apiKey)}`;
  const payload = await httpsGetJson(url);
  const item = payload.items && payload.items[0];
  if (!item || !item.id || !item.id.videoId) return null;

  const snippet = item.snippet || {};
  const videoId = item.id.videoId;
  const thumbs = snippet.thumbnails || {};

  return {
    live: true,
    videoId,
    title: snippet.title || "Live now",
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail:
      (thumbs.high && thumbs.high.url) ||
      (thumbs.medium && thumbs.medium.url) ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ live: false, reason: "not_configured" });
  }

  try {
    const channelId = await getChannelId(apiKey);
    const live = await getLiveStream(apiKey, channelId);
    if (!live) {
      return res.status(200).json({ live: false });
    }
    return res.status(200).json(live);
  } catch (error) {
    console.error("YouTube live check failed:", error.message);
    return res.status(200).json({ live: false, reason: "error" });
  }
};
