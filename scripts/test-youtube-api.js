const https = require("https");
const path = require("path");
const { loadProjectEnv } = require("./load-env");

const ROOT = path.join(__dirname, "..");
loadProjectEnv(ROOT);

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
            reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
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

function parsePlaylistId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("PL") && !raw.includes("/")) return raw;
  const match = raw.match(/[?&]list=([^&]+)/);
  return match ? match[1] : "";
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("Missing YOUTUBE_API_KEY in .env or environment.");
    console.error("See docs/gallery-setup.md for setup steps.");
    process.exit(1);
  }

  const configPath = path.join(ROOT, "data", "gallery-config.json");
  const config = JSON.parse(require("fs").readFileSync(configPath, "utf8"));
  const youtube = config.youtube || {};
  const mode = String(youtube.mode || "playlist").toLowerCase();
  const limit = Number(youtube.limit) || 6;

  console.log("YouTube API key found.");
  console.log("Mode:", mode);

  if (mode === "channel") {
    const handle = String(youtube.channelHandle || "rolccindia").replace(/^@/, "");
    const channelUrl =
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails" +
      `&forHandle=${encodeURIComponent(handle)}` +
      `&key=${encodeURIComponent(apiKey)}`;
    const channelPayload = await httpsGetJson(channelUrl);
    const channel = channelPayload.items && channelPayload.items[0];
    if (!channel) {
      throw new Error(`Channel @${handle} not found.`);
    }
    const uploadsId = channel.contentDetails.relatedPlaylists.uploads;
    console.log("Channel:", channel.snippet.title);
    console.log("Uploads playlist ID:", uploadsId);
    await listPlaylistVideos(uploadsId, limit, apiKey);
    return;
  }

  const playlistId = parsePlaylistId(youtube.playlistId);
  if (!playlistId) {
    console.error("Missing playlistId in data/gallery-config.json.");
    console.error("Paste a playlist URL or ID (starts with PL...) into youtube.playlistId.");
    process.exit(1);
  }

  const playlistUrl =
    "https://www.googleapis.com/youtube/v3/playlists?part=snippet" +
    `&id=${encodeURIComponent(playlistId)}` +
    `&key=${encodeURIComponent(apiKey)}`;
  const playlistPayload = await httpsGetJson(playlistUrl);
  const playlist = playlistPayload.items && playlistPayload.items[0];
  if (!playlist) {
    throw new Error(`Playlist ${playlistId} not found or not public.`);
  }

  console.log("Playlist:", playlist.snippet.title);
  await listPlaylistVideos(playlistId, limit, apiKey);
}

async function listPlaylistVideos(playlistId, limit, apiKey) {
  const url =
    "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet" +
    `&playlistId=${encodeURIComponent(playlistId)}` +
    `&maxResults=${Math.min(limit, 12)}` +
    `&key=${encodeURIComponent(apiKey)}`;
  const payload = await httpsGetJson(url);
  const items = payload.items || [];
  if (!items.length) {
    console.log("No videos found in playlist.");
    return;
  }

  console.log(`\nFirst ${items.length} video(s):`);
  items.forEach((item, index) => {
    const snippet = item.snippet || {};
    const id = snippet.resourceId && snippet.resourceId.videoId;
    console.log(`${index + 1}. ${snippet.title} (${id})`);
  });
  console.log("\nOK — run npm run build:gallery to refresh the gallery page.");
}

main().catch((error) => {
  console.error("YouTube API test failed:", error.message);
  process.exit(1);
});
