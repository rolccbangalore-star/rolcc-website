# Gallery — YouTube setup

The gallery page auto-syncs YouTube videos **at build time** (each deploy on Vercel). Visitors get fast static HTML — no API calls in the browser.

Instagram is optional and disabled by default. See [Instagram (phase 2)](#instagram-phase-2).

---

## YouTube auto-sync (recommended)

### How it works

1. Create a **YouTube playlist** on [@rolccindia](https://www.youtube.com/@rolccindia) with the sermons/events you want featured
2. Add the playlist ID to `data/gallery-config.json`
3. Set `YOUTUBE_API_KEY` in `.env` (local) and Vercel env vars (production)
4. Run `npm run build:gallery` — or push to `main` and let Vercel rebuild

When you add a video to the playlist on YouTube, the next deploy automatically picks it up. No manual ID editing.

### Step 1 — Create a Google Cloud API key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable **YouTube Data API v3** (APIs & Services → Library)
4. Create an API key (APIs & Services → Credentials → Create credentials → API key)
5. Restrict the key (recommended):
   - **API restrictions** → YouTube Data API v3 only
   - **Application restrictions** → HTTP referrers → add `https://www.rolcc.in/*` and `http://127.0.0.1:*` for local testing

### Step 2 — Get your playlist ID

Open your playlist on YouTube. The URL looks like:

`https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxx`

Copy the part after `list=` (starts with `PL`).

### Step 3 — Configure

Edit `data/gallery-config.json`:

```json
{
  "youtube": {
    "enabled": true,
    "mode": "playlist",
    "playlistId": "PLxxxxxxxxxxxxxxxx",
    "limit": 0,
    "perPage": 12,
    "videos": []
  }
}
```

- **`mode: "playlist"`** — sync from your curated playlist (recommended)
- **`limit`** — max videos to fetch from YouTube (`0` = entire playlist, up to 200)
- **`perPage`** — sermons shown per page on `/sermons` (FAQ-style pagination)
- **`videos`** — leave empty for auto-sync; if you add manual entries here, they override the playlist fetch

### Step 4 — Add API key locally

```powershell
copy .env.example .env
```

Edit `.env`:

```
YOUTUBE_API_KEY=your_api_key_here
```

### Step 5 — Test and build

```powershell
npm run test:youtube
npm run build:gallery
npm run preview
```

Open [http://127.0.0.1:3000/gallery](http://127.0.0.1:3000/gallery)

### Step 6 — Vercel

In your Vercel project → **Settings → Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `YOUTUBE_API_KEY` | Your Google Cloud API key |

Redeploy. Each new deploy refreshes the playlist.

---

## Alternative modes

### Channel uploads (all new videos)

Sync the latest uploads from the channel automatically — no curated playlist:

```json
{
  "youtube": {
    "enabled": true,
    "mode": "channel",
    "channelHandle": "rolccindia",
    "limit": 12,
    "videos": []
  }
}
```

This uses the channel’s implicit “uploads” playlist, so every new public upload can appear after redeploy.

### Manual video list (no API key)

```json
{
  "youtube": {
    "enabled": true,
    "mode": "manual",
    "videos": [
      { "id": "IULyeiqndDg", "title": "A Call to Stand Firm" }
    ]
  }
}
```

No API key needed. You edit IDs yourself when you want to change the gallery.

---

## Fallback behavior

If the API key is missing or the fetch fails at build time, the script:

1. Uses manual `videos` from config (if any)
2. Falls back to the last committed `data/gallery.json`
3. Still generates `gallery.html` so the page never breaks

---

## Instagram (phase 2)

Instagram pulls reels and posts at build time via the Meta Graph API. Keep `instagram.enabled: false` until credentials are ready.

### Enable Instagram later

1. Set `instagram.enabled` to `true` in `data/gallery-config.json`
2. Add env vars (see `.env.example`):
   - `INSTAGRAM_ACCESS_TOKEN`
   - `INSTAGRAM_USER_ID` — run `npm run test:instagram` to discover
3. Rebuild: `npm run build:gallery`

When both sections are enabled, YouTube appears first; Instagram appears below.

### Token setup (summary)

1. Create a Meta **Business** app and add **Instagram Graph API**
2. Generate a token in [Graph API Explorer](https://developers.facebook.com/tools/explorer) with `instagram_basic`, `pages_show_list`, and `pages_read_engagement`
3. Exchange for a long-lived token (~60 days) and add to `.env` and Vercel env vars
4. Test: `npm run test:instagram`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `missing YOUTUBE_API_KEY` | Add key to `.env` locally or Vercel env vars |
| `missing playlistId` | Paste playlist ID into `gallery-config.json` |
| `Playlist not found` | Playlist must be **public**; double-check the ID |
| `HTTP 403` from YouTube API | Enable YouTube Data API v3; check API key restrictions |
| Gallery shows old videos | Run `npm run build:gallery` or redeploy on Vercel |
| Empty gallery | Check `youtube.enabled`, playlist has videos, and API key works (`npm run test:youtube`) |
