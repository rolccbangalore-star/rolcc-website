const fs = require("fs");
const path = require("path");
const https = require("https");
const { writeSitemap } = require("./build-sitemap");
const { loadProjectEnv } = require("./load-env");
const { renderSiteSortMenu, SERMONS_SORT_OPTIONS } = require("./sort-menu-template");
const { renderSermonsPageSections } = require("./sermons-page-sections");

const ROOT = path.join(__dirname, "..");
loadProjectEnv(ROOT);
const SITE_ORIGIN = "https://www.rolcc.in";
const GALLERY_ASSET_VERSION = "sermons-spacing-v1";
const SERMONS_PATH = "/sermons";
const GALLERY_PATH = "/gallery";
const DEFAULT_SERMONS_PER_PAGE = 12;
const MAX_PLAYLIST_FETCH = 200;
const CONFIG_PATH = path.join(ROOT, "data", "gallery-config.json");
const DATA_PATH = path.join(ROOT, "data", "gallery.json");

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const YOUTUBE_CHANNEL_ICON =
  '<svg class="gallery-channel-link__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.8 8.001a2.5 2.5 0 0 0-1.76-1.77C18.36 6 12 6 12 6s-6.36 0-8.04.23A2.5 2.5 0 0 0 2.2 8.001 26.4 26.4 0 0 0 2 12c0 1.33.07 2.66.2 3.999a2.5 2.5 0 0 0 1.76 1.77C5.64 18 12 18 12 18s6.36 0 8.04-.23a2.5 2.5 0 0 0 1.76-1.77c.13-1.34.2-2.67.2-4.001 0-1.33-.07-2.66-.2-3.999zM10 15V9l5 3-5 3z"/></svg>';

function renderYoutubeChannelLink(extraClass) {
  const className = extraClass ? `gallery-section__link ${extraClass}` : "gallery-section__link";
  return `<a href="https://www.youtube.com/@rolccindia" class="${className}" target="_blank" rel="noopener noreferrer">${YOUTUBE_CHANNEL_ICON}<span>Visit our channel</span></a>`;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

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
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
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

function parseVideoId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^[a-zA-Z0-9_-]{6,}$/.test(raw) && !raw.includes("/")) return raw;
  const match = raw.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{6,})/);
  return match ? match[1] : "";
}

function buildYoutubeFromConfig(config) {
  const videos = (config.youtube && config.youtube.videos) || [];
  return videos
    .map((video) => {
      const id = parseVideoId(video.id || video.url);
      if (!id) return null;
      return {
        id,
        title: String(video.title || "River of Life Christian Church").trim(),
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    })
    .filter(Boolean);
}

function parsePlaylistId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("PL") && !raw.includes("/")) return raw;
  const match = raw.match(/[?&]list=([^&]+)/);
  return match ? match[1] : "";
}

function normalizeYoutubeItem(snippet) {
  const resource = snippet && snippet.resourceId;
  const id = resource && resource.videoId;
  if (!id || (resource.kind && resource.kind !== "youtube#video")) return null;
  const title = String(snippet.title || "").trim();
  if (/^deleted video$/i.test(title) || /^private video$/i.test(title)) return null;
  const thumbs = snippet.thumbnails || {};
  return {
    id,
    title: title || "River of Life Christian Church",
    thumbnail:
      (thumbs.high && thumbs.high.url) ||
      (thumbs.medium && thumbs.medium.url) ||
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    publishedAt: String(snippet.publishedAt || ""),
    viewCount: 0,
  };
}

function httpsHeadOk(url) {
  return new Promise((resolve) => {
    https
      .request(url, { method: "HEAD" }, (res) => {
        resolve(Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 400));
      })
      .on("error", () => resolve(false))
      .end();
  });
}

async function buildPreviewFrames(videoId, fallbackThumb) {
  const candidates = [
    fallbackThumb,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/1.jpg`,
    `https://i.ytimg.com/vi/${videoId}/2.jpg`,
    `https://i.ytimg.com/vi/${videoId}/3.jpg`,
  ];

  const frames = [];
  for (const url of candidates) {
    if (!url || frames.includes(url)) continue;
    if (await httpsHeadOk(url)) frames.push(url);
  }

  return frames.length ? frames : [fallbackThumb || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`];
}

async function enrichPreviewFrames(videos) {
  const enriched = [];
  for (const video of videos) {
    const previewFrames = await buildPreviewFrames(
      video.id,
      video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
    );
    enriched.push({ ...video, previewFrames });
  }
  return enriched;
}

async function validateYoutubeVideos(videos) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || !videos.length) return videos;

  const ids = videos.map((video) => video.id).join(",");
  const url =
    "https://www.googleapis.com/youtube/v3/videos?part=status,snippet,statistics&id=" +
    encodeURIComponent(ids) +
    "&key=" +
    encodeURIComponent(apiKey);

  try {
    const payload = await httpsGetJson(url);
    const valid = new Map(
      (payload.items || [])
        .filter(
          (item) =>
            item.status &&
            item.status.embeddable &&
            item.status.privacyStatus === "public"
        )
        .map((item) => [
          item.id,
          {
            id: item.id,
            title: (item.snippet && item.snippet.title) || "River of Life Christian Church",
            thumbnail:
              (item.snippet &&
                item.snippet.thumbnails &&
                item.snippet.thumbnails.high &&
                item.snippet.thumbnails.high.url) ||
              `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            publishedAt: (item.snippet && item.snippet.publishedAt) || "",
            viewCount: Number(item.statistics && item.statistics.viewCount) || 0,
          },
        ])
    );

    const filtered = videos.filter((video) => valid.has(video.id)).map((video) => valid.get(video.id) || video);
    if (filtered.length < videos.length) {
      console.warn(
        `Gallery: removed ${videos.length - filtered.length} unavailable or non-embeddable YouTube video(s).`
      );
    }
    return filtered;
  } catch (error) {
    console.warn("Gallery: YouTube validation skipped —", error.message);
    return videos;
  }
}

async function fetchYoutubePlaylistItems(playlistId, limit) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("Gallery: YouTube fetch skipped — missing YOUTUBE_API_KEY.");
    return null;
  }
  if (!playlistId) {
    console.warn("Gallery: YouTube fetch skipped — missing playlistId in gallery-config.json.");
    return null;
  }

  const fetchAll = limit == null || limit <= 0;
  const videos = [];
  let pageToken = "";

  try {
    while (fetchAll || videos.length < limit) {
      const maxResults = fetchAll ? 50 : Math.min(50, limit - videos.length);
      const url =
        "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet" +
        `&playlistId=${encodeURIComponent(playlistId)}` +
        `&maxResults=${maxResults}` +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "") +
        `&key=${encodeURIComponent(apiKey)}`;

      const payload = await httpsGetJson(url);
      for (const item of payload.items || []) {
        const video = normalizeYoutubeItem(item.snippet);
        if (!video) continue;
        videos.push(video);
        if (!fetchAll && videos.length >= limit) break;
        if (fetchAll && videos.length >= MAX_PLAYLIST_FETCH) break;
      }

      pageToken = payload.nextPageToken || "";
      if (!pageToken) break;
      if (!fetchAll && videos.length >= limit) break;
      if (fetchAll && videos.length >= MAX_PLAYLIST_FETCH) break;
    }

    if (fetchAll) {
      console.log(`Gallery: fetched ${videos.length} video(s) from playlist.`);
    }

    return videos;
  } catch (error) {
    console.warn("Gallery: YouTube playlist fetch failed —", error.message);
    return null;
  }
}

async function fetchYoutubeFromConfig(config) {
  const youtube = config.youtube || {};
  const mode = String(youtube.mode || "manual").trim().toLowerCase();
  const rawLimit = youtube.limit;
  const limit =
    rawLimit === 0 || rawLimit === null || rawLimit === undefined || rawLimit === ""
      ? null
      : Number(rawLimit) || DEFAULT_SERMONS_PER_PAGE;

  if (mode === "playlist") {
    const playlistId = parsePlaylistId(youtube.playlistId);
    return fetchYoutubePlaylistItems(playlistId, limit);
  }

  if (mode === "channel") {
    const handle = String(youtube.channelHandle || "rolccindia").replace(/^@/, "");
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.warn("Gallery: YouTube channel fetch skipped — missing YOUTUBE_API_KEY.");
      return null;
    }

    try {
      const channelUrl =
        "https://www.googleapis.com/youtube/v3/channels?part=contentDetails" +
        `&forHandle=${encodeURIComponent(handle)}` +
        `&key=${encodeURIComponent(apiKey)}`;
      const channelPayload = await httpsGetJson(channelUrl);
      const uploadsPlaylistId =
        channelPayload.items &&
        channelPayload.items[0] &&
        channelPayload.items[0].contentDetails &&
        channelPayload.items[0].contentDetails.relatedPlaylists &&
        channelPayload.items[0].contentDetails.relatedPlaylists.uploads;

      if (!uploadsPlaylistId) {
        throw new Error(`Could not find uploads playlist for @${handle}.`);
      }

      const fetchLabel = limit ? `latest ${limit}` : "all";
      console.log(`Gallery: fetching ${fetchLabel} uploads from @${handle}.`);
      return fetchYoutubePlaylistItems(uploadsPlaylistId, limit);
    } catch (error) {
      console.warn("Gallery: YouTube channel fetch failed —", error.message);
      return null;
    }
  }

  return null;
}

function getSermonsPerPage(config) {
  return Math.max(1, Number(config.youtube && config.youtube.perPage) || DEFAULT_SERMONS_PER_PAGE);
}

function sermonsHref(pageNum) {
  return pageNum === 1 ? SERMONS_PATH : `${SERMONS_PATH}/${pageNum}`;
}

function sermonsFileName(pageNum) {
  return pageNum === 1 ? "sermons.html" : `sermons-${pageNum}.html`;
}

function renderSermonsPagination(pageNum, totalPages, extraClass) {
  if (totalPages <= 1) return "";

  const mkLink = (num, label, current) => {
    const href = sermonsHref(num);
    if (num === current) {
      return `<span class="faq-pagination__page is-current" aria-current="page">${label}</span>`;
    }
    return `<a class="faq-pagination__page" href="${href}" data-sermons-page="${num}">${label}</a>`;
  };

  let pages = "";
  for (let i = 1; i <= totalPages; i++) {
    pages += mkLink(i, String(i), pageNum);
  }

  const prev =
    pageNum > 1
      ? `<a class="faq-pagination__nav" href="${sermonsHref(pageNum - 1)}" rel="prev" data-sermons-page="${pageNum - 1}">Previous</a>`
      : `<span class="faq-pagination__nav is-disabled">Previous</span>`;
  const next =
    pageNum < totalPages
      ? `<a class="faq-pagination__nav" href="${sermonsHref(pageNum + 1)}" rel="next" data-sermons-page="${pageNum + 1}">Next</a>`
      : `<span class="faq-pagination__nav is-disabled">Next</span>`;

  const modifier = extraClass ? ` ${extraClass}` : "";
  return `<nav class="faq-pagination${modifier}" aria-label="Sermon pages" data-sermons-pagination>${prev}<div class="faq-pagination__pages">${pages}</div>${next}</nav>`;
}

async function buildYoutubeVideos(config, cached) {
  if (config.youtube && config.youtube.enabled === false) return [];

  const manualVideos = buildYoutubeFromConfig(config);
  const mode = String((config.youtube && config.youtube.mode) || "manual")
    .trim()
    .toLowerCase();

  let videos = [];

  if (manualVideos.length) {
    videos = await enrichYoutubeTitles(manualVideos);
  } else if (mode !== "manual") {
    const fetched = await fetchYoutubeFromConfig(config);
    if (fetched !== null && fetched.length) {
      videos = fetched;
    } else if (Array.isArray(cached.youtube) && cached.youtube.length) {
      console.warn("Gallery: using cached YouTube videos from data/gallery.json.");
      videos = cached.youtube;
    }
  }

  if (!videos.length) return [];

  const validated = await validateYoutubeVideos(videos);
  return enrichPreviewFrames(validated);
}

async function enrichYoutubeTitles(videos) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || !videos.length) return videos;

  const ids = videos.map((video) => video.id).join(",");
  const url =
    "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=" +
    encodeURIComponent(ids) +
    "&key=" +
    encodeURIComponent(apiKey);

  try {
    const payload = await httpsGetJson(url);
    const titleMap = new Map(
      (payload.items || []).map((item) => [item.id, item.snippet && item.snippet.title])
    );
    return videos.map((video) => ({
      ...video,
      title: titleMap.get(video.id) || video.title,
    }));
  } catch (error) {
    console.warn("Gallery: YouTube metadata fetch skipped —", error.message);
    return videos;
  }
}

async function discoverInstagramUserId(token) {
  const payload = await httpsGetJson(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,instagram_business_account&access_token=${encodeURIComponent(token)}`
  );
  const accounts = payload.data || [];
  for (const page of accounts) {
    if (page.instagram_business_account && page.instagram_business_account.id) {
      return page.instagram_business_account.id;
    }
  }
  throw new Error("No Instagram Business account linked to your Facebook Pages.");
}

async function fetchInstagramMedia(config) {
  const instagram = config.instagram || {};
  if (!instagram.enabled) return [];

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  let userId = process.env.INSTAGRAM_USER_ID;
  if (!token) {
    console.warn("Gallery: Instagram fetch skipped — missing INSTAGRAM_ACCESS_TOKEN.");
    return null;
  }

  if (!userId) {
    try {
      userId = await discoverInstagramUserId(token);
      console.log("Gallery: discovered INSTAGRAM_USER_ID =", userId);
      console.log("Gallery: add INSTAGRAM_USER_ID to .env or Vercel env vars to skip discovery.");
    } catch (error) {
      console.warn("Gallery: Instagram fetch skipped —", error.message);
      return null;
    }
  }

  const limit = Number(instagram.limit) || 12;
  const allowedTypes = new Set(instagram.types || ["REEL", "IMAGE", "CAROUSEL_ALBUM", "VIDEO"]);
  const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
  const url =
    `https://graph.facebook.com/v19.0/${encodeURIComponent(userId)}/media` +
    `?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}`;

  try {
    const payload = await httpsGetJson(url);
    return (payload.data || [])
      .filter((item) => allowedTypes.has(item.media_type))
      .map((item) => ({
        id: item.id,
        caption: item.caption || "",
        mediaType: item.media_type,
        permalink: item.permalink,
        thumbnail: item.thumbnail_url || item.media_url || "",
        timestamp: item.timestamp || "",
      }));
  } catch (error) {
    console.warn("Gallery: Instagram fetch failed —", error.message);
    return null;
  }
}

async function buildGalleryData(config, cached) {
  const youtube = await buildYoutubeVideos(config, cached);

  const instagramEnabled = config.instagram && config.instagram.enabled !== false;
  let instagram = [];
  if (instagramEnabled) {
    const fetchedInstagram = await fetchInstagramMedia(config);
    if (fetchedInstagram !== null) {
      instagram = fetchedInstagram;
    } else if (Array.isArray(cached.instagram)) {
      instagram = cached.instagram;
    }
  }

  return {
    fetchedAt: new Date().toISOString(),
    instagram,
    youtube,
  };
}

function truncateCaption(value, maxLength) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "…";
}

function renderInstagramItem(item) {
  const permalink = escapeHtml(item.permalink);
  return `<div class="gallery-instagram-item">
      <blockquote class="instagram-media" data-instgrm-permalink="${permalink}" data-instgrm-version="14" style="background:#FFF; border:0; border-radius:12px; margin:0; max-width:100%; min-width:0; width:100%; padding:0;">
        <a href="${permalink}" target="_blank" rel="noopener noreferrer">View this post on Instagram</a>
      </blockquote>
    </div>`;
}

function renderInstagramGalleryContent(items) {
  if (!items.length) {
    return `<section class="gallery-section" data-gallery-instagram aria-label="Instagram gallery">
        <p class="gallery-empty">Instagram posts will appear here once Meta API credentials are configured. Follow the setup guide in <code>docs/gallery-setup.md</code>, then run <code>npm run test:instagram</code> and <code>npm run build:gallery</code>.</p>
        <p class="gallery-empty gallery-empty--cta"><a href="https://www.instagram.com/rolccindia" target="_blank" rel="noopener noreferrer">Follow @rolccindia on Instagram</a> in the meantime.</p>
      </section>`;
  }

  return `<section class="gallery-section" data-gallery-instagram aria-label="Instagram gallery">
      <div class="gallery-section__head">
        <div>
          <h2 class="gallery-section__title">Instagram</h2>
          <p class="gallery-section__intro">Recent reels and posts from our community.</p>
        </div>
        <a href="https://www.instagram.com/rolccindia" class="gallery-section__link" target="_blank" rel="noopener noreferrer">Follow on Instagram</a>
      </div>
      <div class="gallery-instagram-grid">${items.map(renderInstagramItem).join("")}</div>
    </section>`;
}

function renderSermonsToolbar() {
  return `<div class="gallery-toolbar">
    <div class="gallery-toolbar__row">
      ${renderSiteSortMenu({
        dataPrefix: "gallery",
        ariaLabel: "Sort sermons",
        options: SERMONS_SORT_OPTIONS,
        defaultValue: "newest",
      })}
      ${renderYoutubeChannelLink("gallery-toolbar__channel")}
    </div>
  </div>`;
}

function renderYoutubeCard(video) {
  const id = escapeHtml(video.id);
  const title = escapeHtml(video.title);
  const sortTitle = escapeHtml(String(video.title || "").toLowerCase());
  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  const thumb = escapeHtml(video.thumbnail) || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const publishedAt = escapeHtml(video.publishedAt || "");
  const viewCount = Number(video.viewCount) || 0;

  const previewFrames = Array.isArray(video.previewFrames) && video.previewFrames.length
    ? video.previewFrames
    : [thumb];
  const previewAttr = escapeHtml(JSON.stringify(previewFrames));

  return `<article class="gallery-youtube-card" data-sort-published="${publishedAt}" data-sort-views="${viewCount}" data-sort-title="${sortTitle}">
          <button
            type="button"
            class="gallery-youtube-card__frame"
            data-gallery-youtube-play
            data-gallery-youtube-preview
            data-video-id="${id}"
            data-preview-frames="${previewAttr}"
            aria-label="Play ${title}"
          >
            <img
              class="gallery-youtube-card__thumb"
              src="${thumb}"
              alt=""
              loading="lazy"
              width="480"
              height="360"
            />
            <span class="gallery-youtube-card__play" aria-hidden="true"></span>
          </button>
          <h3 class="gallery-youtube-card__title">
            <a href="${watchUrl}" target="_blank" rel="noopener noreferrer">${title}</a>
          </h3>
        </article>`;
}

function renderYoutubeSection(items, pageMeta) {
  if (!items.length) {
    return `<section class="gallery-section" aria-label="Selected YouTube videos">
        <div class="gallery-section__head">
          <div>
            <h2 class="gallery-section__title">YouTube</h2>
            <p class="gallery-section__intro">Selected messages from River of Life Christian Church.</p>
          </div>
          ${renderYoutubeChannelLink()}
        </div>
        <p class="gallery-empty">Set a YouTube playlist in <code>data/gallery-config.json</code> and add <code>YOUTUBE_API_KEY</code> to your build env. See <code>docs/gallery-setup.md</code>.</p>
      </section>`;
  }

  const cards = items.map((video) => renderYoutubeCard(video)).join("");
  const paginationHtml =
    pageMeta && pageMeta.totalPages > 1
      ? (() => {
          const bufferHtml =
            pageMeta.pageNum > 1
              ? `<div class="gallery-sermons-pagination-buffer" aria-hidden="true"></div>`
              : "";
          return `<div class="gallery-sermons-pagination-wrap">
      ${renderSermonsPagination(pageMeta.pageNum, pageMeta.totalPages, "gallery-sermons-pagination__nav")}
      ${bufferHtml}
    </div>`;
        })()
      : "";

  return `<section class="gallery-section" aria-label="Sermons">
      ${renderSermonsToolbar()}
      <div class="gallery-youtube-grid" data-gallery-youtube-grid>${cards}</div>
      ${paginationHtml}
    </section>`;
}

function readHeaderNavTemplate() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{TITLE}}</title>
    <meta name="description" content="{{DESCRIPTION}}" />
    <meta property="og:title" content="{{TITLE}}" />
    <meta property="og:description" content="{{DESCRIPTION}}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{{CANONICAL}}" />
    <meta property="og:image" content="https://www.rolcc.in/images/og-image.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{{TITLE}}" />
    <meta name="twitter:description" content="{{DESCRIPTION}}" />
    <meta name="twitter:image" content="https://www.rolcc.in/images/og-image.jpg" />
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" type="image/png" sizes="48x48" href="/images/favicon-48x48.png" />
    <link rel="icon" type="image/png" sizes="96x96" href="/images/favicon-96x96.png" />
    <link rel="apple-touch-icon" href="/images/apple-touch-icon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = { theme: { extend: { colors: { primary: "#ffffff", primaryDark: "#f6f9fc", accent: "#635bff", accentSoft: "#818cf8" } } } };
    </script>
    <link rel="stylesheet" href="/css/styles.css" />
    {{HEAD_EXTRA}}
  </head>
  <body class="bg-slate-50 text-slate-900">
    <div id="announce-banner" class="announce-banner" role="banner" aria-label="Announcement">
      <div class="announce-banner__inner">
        <p class="announce-banner__title">Join with us Online <a href="#" id="announce-watch-live" class="announce-banner__btn" aria-label="Watch Live"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg></a></p>
        <button type="button" id="announce-banner-close" class="announce-banner__close" aria-label="Dismiss announcement"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </div>
    </div>
    <header class="header-top" id="header">
      <nav class="header-top__bar mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between">
        <a href="/" class="header-top__brand flex items-center gap-3">
          <img src="/assets/logo.svg" alt="River of Life Christian Church" class="header-top__logo-img" width="36" height="44" />
          <div class="leading-tight"><p class="text-sm font-semibold tracking-wide">River of Life</p><p class="text-[11px] text-slate-500">Christian Church · Bangalore</p></div>
        </a>
        <div class="hidden lg:flex items-center gap-6 text-sm font-medium">
          <a href="/" class="header-top__link hidden xl:inline-flex" data-nav="index">Home</a>
          <a href="/about" class="header-top__link" data-nav="about">About Us</a>
          <div class="header-top__dropdown relative" id="ministries-dropdown">
            <button type="button" class="header-top__link flex items-center gap-0.5" aria-expanded="false" aria-haspopup="true" aria-controls="ministries-menu" id="ministries-trigger">Ministries <span class="text-[10px] ml-0.5" aria-hidden="true">▾</span></button>
            <div class="header-top__dropdown-panel absolute top-full left-0 mt-1 py-2 min-w-[10rem] rounded-lg border border-slate-200 bg-white shadow-lg z-50 hidden" id="ministries-menu" role="menu">
              <a href="/services" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-t-lg" role="menuitem" data-nav="services">Worship Services</a>
              <a href="/river-kids" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50" role="menuitem" data-nav="river-kids">River Kids</a>
              <a href="/fellowship" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50" role="menuitem" data-nav="fellowship">Cell Fellowship</a>
              <a href="/pmd" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50" role="menuitem" data-nav="pmd">PMD</a>
              <a href="/counselling" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50" role="menuitem" data-nav="counselling">Counselling</a>
              <a href="/rolf" class="header-top__dropdown-link block px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-b-lg" role="menuitem" data-nav="rolf">ROLF</a>
            </div>
          </div>
          <a href="/giving" class="header-top__link hidden xl:inline-flex" data-nav="giving">Giving</a>
          <a href="/contact" class="header-top__link" data-nav="contact">Contact Us</a>
        </div>
        <div class="hidden lg:block">
          <a href="/contact#location" class="header-top__cta inline-flex items-center rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-accent/70 hover:bg-accentSoft transition">Join Us This Sunday</a></div>
        <button id="nav-toggle" type="button" class="header-top__hamburger lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100" aria-label="Open menu" aria-expanded="false" aria-controls="nav-menu"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
      </nav>
      <div id="nav-menu" class="header-top__menu hidden lg:hidden border-t border-slate-200 bg-white" aria-hidden="true">
        <div class="mx-auto max-w-6xl px-4 py-3 space-y-1 sm:px-6 lg:px-8">
          <a href="/" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" data-nav="index">Home</a>
          <a href="/about" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" data-nav="about">About Us</a>
          <p class="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mt-2">Ministries</p>
          <a href="/services" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="services">Worship Services</a>
          <a href="/river-kids" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="river-kids">River Kids</a>
          <a href="/fellowship" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="fellowship">Cell Fellowship</a>
          <a href="/pmd" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="pmd">PMD</a>
          <a href="/counselling" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="counselling">Counselling</a>
          <a href="/rolf" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="rolf">ROLF</a>
          <a href="/events" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="events">Events</a>
          <a href="/membership" class="header-top__menu-link block rounded-md px-3 py-2 pl-5 text-slate-700 hover:bg-slate-100" data-nav="membership">Membership</a>
          <a href="/giving" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" data-nav="giving">Giving</a>
          <a href="/contact" class="header-top__menu-link block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" data-nav="contact">Contact Us</a>
          <a href="contact.html#location" class="header-top__menu-cta mt-3 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">Join Us This Sunday</a>
        </div>
      </div>
    </header>`;
}

function readFooterTemplate() {
  const contactPath = path.join(ROOT, "contact.html");
  const contactHtml = fs.readFileSync(contactPath, "utf8");
  const footerMatch = contactHtml.match(
    /<!-- Footer: fixed at bottom[\s\S]*?<\/button>/
  );
  if (!footerMatch) {
    throw new Error("Could not read footer template from contact.html");
  }
  return `\n    ${footerMatch[0].trim()}\n`;
}

function renderGallerySchema(videos, canonical) {
  const items = [];
  (videos || []).forEach((video) => {
    items.push({
      "@type": "ListItem",
      position: items.length + 1,
      item: {
        "@type": "VideoObject",
        name: video.title,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        thumbnailUrl: video.thumbnail,
        embedUrl: `https://www.youtube.com/embed/${video.id}`,
      },
    });
  });

  if (!items.length) return "";

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Sermons | River of Life Christian Church",
    url: canonical,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items,
    },
  };

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function buildGalleryHtml(config, data, pageOptions = {}) {
  const page = config.page || {};
  const pageNum = pageOptions.pageNum || 1;
  const totalPages = pageOptions.totalPages || 1;
  const pageVideos = pageOptions.pageVideos || data.youtube || [];
  const totalVideos = pageOptions.totalVideos != null ? pageOptions.totalVideos : pageVideos.length;
  const perPage = pageOptions.perPage || getSermonsPerPage(config);
  const start = totalVideos ? (pageNum - 1) * perPage + 1 : 0;
  const end = Math.min(pageNum * perPage, totalVideos);

  const title =
    pageNum === 1
      ? "Sermons | River of Life Christian Church, Bangalore"
      : `Sermons — Page ${pageNum} | River of Life Christian Church, Bangalore`;
  const description =
    page.description ||
    "Watch Sunday sermons and messages from River of Life Christian Church in Bangalore.";
  const canonical = `${SITE_ORIGIN}${sermonsHref(pageNum)}`;
  const eyebrow = escapeHtml(page.eyebrow || "Sermons");
  const heading = escapeHtml(page.title || "Messages from River of Life");
  const intro = escapeHtml(page.description || description);
  const youtubeEnabled = config.youtube && config.youtube.enabled !== false;
  const pageMeta = {
    pageNum,
    totalPages,
    total: totalVideos,
    start,
    end,
  };
  const youtubeSection = youtubeEnabled ? renderYoutubeSection(pageVideos, pageMeta) : "";
  const pageSections = pageNum === 1 ? renderSermonsPageSections() : "";

  const headExtra = `<link rel="stylesheet" href="/css/articles.css?v=${GALLERY_ASSET_VERSION}" />
    <link rel="stylesheet" href="/css/gallery.css?v=${GALLERY_ASSET_VERSION}" />
    <link rel="stylesheet" href="/css/faq.css" />
    <link rel="canonical" href="${canonical}" />
    ${renderGallerySchema(pageVideos, canonical)}`;

  const header = readHeaderNavTemplate()
    .replaceAll("{{TITLE}}", title)
    .replaceAll("{{DESCRIPTION}}", description)
    .replace("{{CANONICAL}}", canonical)
    .replace("{{HEAD_EXTRA}}", headExtra);

  return `${header}
    <main class="main-no-top-gap relative z-10">
      <div class="articles-hub-page">
      <div class="articles-hub-top">
      <section class="articles-hero contact-hero relative">
        <div class="relative z-10 mx-auto max-w-6xl px-4 pt-6 pb-12 sm:px-6 sm:pt-24 sm:pb-16 md:pt-28 md:pb-20 lg:px-8 lg:pt-32 lg:pb-24">
          <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">${eyebrow}</p>
          <h1 class="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">${heading}</h1>
          <p class="mt-5 max-w-2xl text-sm text-slate-600 sm:text-base leading-relaxed">${intro}</p>
        </div>
      </section>

      <section class="articles-list-section border-b border-slate-200" aria-label="Sermons content">
        <div class="mx-auto max-w-6xl px-4 pb-10 sm:px-6 md:pb-14 lg:px-8">
          ${youtubeSection}
        </div>
      </section>
      </div>
      </div>

      ${pageSections}

      <div class="serve-unveil-spacer min-h-screen" aria-hidden="true"></div>
    </main>
${readFooterTemplate()}
    <button
      id="scroll-top-btn"
      class="scroll-to-top hidden fixed bottom-5 right-4 z-40 rounded-full bg-slate-900/90 p-2 text-xs text-slate-100 shadow-lg ring-1 ring-slate-600 hover:bg-slate-800 sm:bottom-6 sm:right-6"
      aria-label="Scroll to top"
      type="button"
    >↑</button>
    <script src="/js/main.js"></script>
    <script src="/js/site-sort-menu.js?v=${GALLERY_ASSET_VERSION}"></script>
    <script src="/js/gallery.js?v=${GALLERY_ASSET_VERSION}"></script>${pageNum === 1 ? `
    <script src="/js/faq/core.js"></script>
    <script src="/js/faq/accordion.js"></script>` : ""}
  </body>
</html>`;
}

function renderGalleryPageSchema(items, canonical) {
  const listItems = (items || []).map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "ImageObject",
      name: truncateCaption(item.caption, 80) || "River of Life Christian Church on Instagram",
      url: item.permalink,
      contentUrl: item.thumbnail,
    },
  }));

  if (!listItems.length) return "";

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Gallery | River of Life Christian Church",
    url: canonical,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: listItems,
    },
  };

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function buildGalleryPageHtml(config, data) {
  const galleryPage = config.galleryPage || {};
  const title = "Gallery | River of Life Christian Church, Bangalore";
  const description =
    galleryPage.description ||
    "Photos, reels, and highlights from River of Life Christian Church on Instagram.";
  const canonical = `${SITE_ORIGIN}${GALLERY_PATH}`;
  const eyebrow = escapeHtml(galleryPage.eyebrow || "Gallery");
  const heading = escapeHtml(galleryPage.title || "Life at River of Life");
  const intro = escapeHtml(description);
  const instagramItems =
    config.instagram && config.instagram.enabled !== false ? data.instagram || [] : [];
  const instagramSection = renderInstagramGalleryContent(instagramItems);

  const headExtra = `<link rel="stylesheet" href="/css/articles.css?v=${GALLERY_ASSET_VERSION}" />
    <link rel="stylesheet" href="/css/gallery.css?v=${GALLERY_ASSET_VERSION}" />
    <link rel="canonical" href="${canonical}" />
    ${renderGalleryPageSchema(instagramItems, canonical)}`;

  const header = readHeaderNavTemplate()
    .replaceAll("{{TITLE}}", title)
    .replaceAll("{{DESCRIPTION}}", description)
    .replace("{{CANONICAL}}", canonical)
    .replace("{{HEAD_EXTRA}}", headExtra);

  return `${header}
    <main class="main-no-top-gap relative z-10">
      <div class="articles-hub-page">
      <div class="articles-hub-top">
      <section class="articles-hero contact-hero relative">
        <div class="relative z-10 mx-auto max-w-6xl px-4 pt-6 pb-12 sm:px-6 sm:pt-24 sm:pb-16 md:pt-28 md:pb-20 lg:px-8 lg:pt-32 lg:pb-24">
          <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">${eyebrow}</p>
          <h1 class="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">${heading}</h1>
          <p class="mt-5 max-w-2xl text-sm text-slate-600 sm:text-base leading-relaxed">${intro}</p>
          <p class="mt-6">
            <a href="https://www.instagram.com/rolccindia" class="gallery-section__link" target="_blank" rel="noopener noreferrer">Follow @rolccindia on Instagram</a>
          </p>
        </div>
      </section>

      <section class="articles-list-section border-b border-slate-200" aria-label="Gallery content">
        <div class="mx-auto max-w-6xl px-4 pb-10 sm:px-6 md:pb-14 lg:px-8">
          ${instagramSection}
        </div>
      </section>
      </div>
      </div>

      <div class="serve-unveil-spacer min-h-screen" aria-hidden="true"></div>
    </main>
${readFooterTemplate()}
    <button
      id="scroll-top-btn"
      class="scroll-to-top hidden fixed bottom-5 right-4 z-40 rounded-full bg-slate-900/90 p-2 text-xs text-slate-100 shadow-lg ring-1 ring-slate-600 hover:bg-slate-800 sm:bottom-6 sm:right-6"
      aria-label="Scroll to top"
      type="button"
    >↑</button>
    <script src="/js/main.js"></script>
    <script src="/js/gallery-instagram.js?v=${GALLERY_ASSET_VERSION}"></script>
  </body>
</html>`;
}

function syncGalleryFooterLink() {
  const galleryMarker = '<a href="/gallery" class="footer-link hover:text-white">Gallery</a>';
  const latestSermonFrom = 'href="/#latest-sermon" class="footer-link hover:text-white">Latest Sermon';
  const latestSermonTo = 'href="/sermons" class="footer-link hover:text-white">Latest Sermon';
  const latestSermonGallery = 'href="/gallery" class="footer-link hover:text-white">Latest Sermon';
  const files = [];

  function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "admin" || entry.name === ".git") return;
        walk(fullPath);
        return;
      }
      if (entry.isFile() && entry.name.endsWith(".html")) files.push(fullPath);
    });
  }

  walk(ROOT);

  files.forEach((filePath) => {
    let html = fs.readFileSync(filePath, "utf8");
    let changed = false;

    if (!html.includes(galleryMarker)) {
      const oldBlock =
        /<li><a href="\/faq" class="footer-link hover:text-white">FAQ<\/a><\/li>\s*<li><a href="\/articles" class="footer-link hover:text-white">Articles<\/a><\/li>\s*<li><a href="\/#latest-sermon" class="footer-link hover:text-white">Latest Sermon<\/a><\/li>/;
      if (oldBlock.test(html)) {
        html = html.replace(
          oldBlock,
          `<li><a href="/faq" class="footer-link hover:text-white">FAQ</a></li>
                  <li><a href="/articles" class="footer-link hover:text-white">Articles</a></li>
                  <li><a href="/gallery" class="footer-link hover:text-white">Gallery</a></li>
                  <li><a href="/sermons" class="footer-link hover:text-white">Latest Sermon</a></li>`
        );
        changed = true;
      }
    }

    if (html.includes(latestSermonFrom)) {
      html = html.replaceAll(latestSermonFrom, latestSermonTo);
      changed = true;
    }

    if (html.includes(latestSermonGallery)) {
      html = html.replaceAll(latestSermonGallery, latestSermonTo);
      changed = true;
    }

    if (changed) fs.writeFileSync(filePath, html, "utf8");
  });
}

async function main() {
  const config = readJson(CONFIG_PATH, {});
  const cached = readJson(DATA_PATH, { instagram: [], youtube: [] });
  if (process.env.YOUTUBE_API_KEY) {
    console.log("Gallery: YouTube API key found.");
  } else {
    console.warn("Gallery: YouTube API key missing — using cached/config videos.");
  }
  const data = await buildGalleryData(config, cached);
  writeJson(DATA_PATH, data);

  const perPage = getSermonsPerPage(config);
  const allVideos = data.youtube || [];
  const totalPages = Math.max(1, Math.ceil(allVideos.length / perPage));

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const start = (pageNum - 1) * perPage;
    const pageVideos = allVideos.slice(start, start + perPage);
    const html = buildGalleryHtml(config, data, {
      pageNum,
      totalPages,
      pageVideos,
      totalVideos: allVideos.length,
      perPage,
    });
    const fileName = sermonsFileName(pageNum);
    fs.writeFileSync(path.join(ROOT, fileName), html, "utf8");
    console.log(`Wrote ${fileName} (${pageVideos.length} sermons)`);
  }

  fs.readdirSync(ROOT)
    .filter((name) => /^sermons-\d+\.html$/.test(name))
    .forEach((name) => {
      const pageNum = Number(name.match(/^sermons-(\d+)\.html$/)[1]);
      if (pageNum > totalPages) {
        fs.unlinkSync(path.join(ROOT, name));
        console.log(`Removed stale ${name}`);
      }
    });

  const legacyGalleryPath = path.join(ROOT, "gallery.html");
  const galleryHtml = buildGalleryPageHtml(config, data);
  fs.writeFileSync(legacyGalleryPath, galleryHtml, "utf8");
  console.log(`Wrote gallery.html (${data.instagram.length} Instagram item(s))`);

  syncGalleryFooterLink();

  try {
    const articlesIndex = readJson(path.join(ROOT, "data", "articles.json"), { articles: [] });
    writeSitemap({
      articles: articlesIndex.articles || [],
      faqTotalPages: 10,
      sermonsTotalPages: totalPages,
      includeGallery: true,
      today: new Date().toISOString().slice(0, 10),
    });
  } catch (error) {
    console.warn("Gallery: sitemap update skipped —", error.message);
  }

  console.log(
    `Built sermons across ${totalPages} page(s) (${data.instagram.length} Instagram, ${allVideos.length} YouTube videos).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
