# Gallery setup — Instagram + YouTube

The site has two media pages:

| Page | URL | Source |
|------|-----|--------|
| **Gallery** | `/gallery` | Instagram posts (Meta Graph API) |
| **Sermons** | `/sermons` | YouTube playlist (Google API) |

Both sync **at build time** on Vercel. Visitors get fast static HTML — no API calls in the browser.

---

## Instagram gallery (`/gallery`)

Instagram posts are fetched during `npm run build:gallery` and baked into `gallery.html` as native Instagram embeds.

### Prerequisites (do these first)

1. **Instagram account** — [@rolccindia](https://www.instagram.com/rolccindia) must be a **Business** or **Creator** account (not a personal account).
2. **Facebook Page** — The Instagram account must be connected to a Facebook Page you manage.
   - In Instagram app: **Settings → Account → Sharing to other apps → Facebook** → link your Page.
   - Or in [Meta Business Suite](https://business.facebook.com/): connect the Instagram account to your church Page.
3. **Facebook account** with admin access to that Page (you'll use this to generate the token).

---

### Step 1 — Create a Meta Developer app

1. Go to [developers.facebook.com](https://developers.facebook.com/) and log in.
2. **My Apps → Create App**.
3. Choose **Other** → **Business** (or **Create an app without a use case** if shown).
4. App name: e.g. `ROLCC Website Gallery`.
5. Connect your Business Portfolio if prompted (you can skip if optional).
6. Once created, open the app dashboard.

### Step 2 — Add Instagram product

1. In the app dashboard, click **Add Product**.
2. Find **Instagram** (Instagram Graph API) and click **Set Up**.
3. You do **not** need to submit the app for App Review for your own church Page — a User access token from an admin is enough for build-time fetches.

### Step 3 — Get a short-lived User access token

1. Open [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. **Meta App**: select your new app (`ROLCC Website Gallery`).
3. **User or Page**: choose **User Token**.
4. Click **Add a Permission** and add:
   - `instagram_basic`
   - `pages_show_list`
   - `pages_read_engagement`
5. Click **Generate Access Token** and approve the prompts (log in as the Facebook admin for your church Page).
6. Copy the token — it expires in about **1 hour**.

### Step 4 — Exchange for a long-lived token (~60 days)

In PowerShell (replace placeholders):

```powershell
$APP_ID = "your_meta_app_id"
$APP_SECRET = "your_meta_app_secret"
$SHORT_TOKEN = "token_from_graph_explorer"

Invoke-RestMethod "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=$APP_ID&client_secret=$APP_SECRET&fb_exchange_token=$SHORT_TOKEN"
```

Copy the `access_token` from the response. This is your **`INSTAGRAM_ACCESS_TOKEN`**.

> **App ID & Secret**: App Dashboard → **App settings → Basic**.

### Step 5 — Discover your Instagram Business account ID

```powershell
copy .env.example .env
```

Edit `.env`:

```
INSTAGRAM_ACCESS_TOKEN=your_long_lived_token_here
```

Run:

```powershell
npm run test:instagram
```

The script will:
- Verify the token works
- Find the Instagram Business account linked to your Facebook Page
- Print `INSTAGRAM_USER_ID=...` — add that line to `.env`
- Show 3 sample posts

### Step 6 — Enable Instagram in config

Edit `data/gallery-config.json`:

```json
"instagram": {
  "enabled": true,
  "limit": 12,
  "types": ["REEL", "IMAGE", "CAROUSEL_ALBUM", "VIDEO"]
}
```

- **`limit`** — max posts to fetch (12 is a good default)
- **`types`** — filter by media type; remove any type you don't want shown

### Step 7 — Build locally

```powershell
npm run build:gallery
npm run preview
```

Open [http://127.0.0.1:3000/gallery](http://127.0.0.1:3000/gallery)

### Step 8 — Deploy to Vercel

In Vercel → **Settings → Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `INSTAGRAM_ACCESS_TOKEN` | Long-lived token from Step 4 |
| `INSTAGRAM_USER_ID` | ID from `npm run test:instagram` |

Redeploy. Each deploy refreshes the Instagram grid.

### Token renewal (every ~60 days)

Long-lived User tokens expire. Before expiry:

1. Generate a new short-lived token in Graph API Explorer (Step 3).
2. Exchange it for a new long-lived token (Step 4).
3. Update `.env` and Vercel env vars.
4. Redeploy (or run `npm run build:gallery` locally and commit `data/gallery.json`).

Set a calendar reminder for 50 days out.

---

## YouTube sermons (`/sermons`)

Sermons sync from a curated YouTube playlist. See the YouTube section below if you haven't set that up yet.

---

## YouTube auto-sync

### How it works

1. Create a **YouTube playlist** on [@rolccindia](https://www.youtube.com/@rolccindia)
2. Playlist ID is already in `data/gallery-config.json`
3. Set `YOUTUBE_API_KEY` in `.env` and Vercel
4. Run `npm run build:gallery` — or push to `main` and let Vercel rebuild

### Step 1 — Create a Google Cloud API key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable **YouTube Data API v3**
4. Create an API key
5. Restrict the key (recommended):
   - **API restrictions** → YouTube Data API v3 only

### Step 2 — Configure

`data/gallery-config.json` already has playlist mode enabled. Add to `.env`:

```
YOUTUBE_API_KEY=your_api_key_here
```

### Step 3 — Test

```powershell
npm run test:youtube
npm run build:gallery
```

---

## Live stream banner (automatic)

When [@rolccindia](https://www.youtube.com/@rolccindia) is **actually live** on YouTube:

1. The top site banner appears with **Watch on YouTube**
2. On the **homepage hero carousel**, slide 1 plays the live stream automatically (replacing the usual banner video)

No manual embed is needed each week.

### How it works

1. Visitor loads any page
2. Browser calls `/api/youtube-live` (Vercel serverless function)
3. Function checks YouTube Data API for a live video on `@rolccindia`
4. If live → banner shows with the real video link; if not → banner stays hidden

Uses the same `YOUTUBE_API_KEY` as sermons sync. Responses are cached for 2 minutes to protect API quota.

### Optional env var

```
YOUTUBE_CHANNEL_HANDLE=rolccindia
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Missing INSTAGRAM_ACCESS_TOKEN` | Add token to `.env` or Vercel env vars |
| `No Instagram Business account found` | Connect @rolccindia to a Facebook Page; account must be Business/Creator |
| `HTTP 190` / token expired | Regenerate long-lived token (Step 4) |
| `HTTP 403` / permission error | Add `instagram_basic`, `pages_show_list`, `pages_read_engagement` in Graph API Explorer |
| Gallery shows empty state | Set `instagram.enabled: true`, verify token with `npm run test:instagram`, rebuild |
| `/gallery` redirects to sermons | Redeploy after pulling latest `vercel.json` changes |
| `missing YOUTUBE_API_KEY` | Add key to `.env` or Vercel env vars |
| Live banner never appears | Confirm channel is live on YouTube; check `YOUTUBE_API_KEY` on Vercel; open `/api/youtube-live` in browser |
| Sermons show old videos | Redeploy on Vercel to refresh playlist |

---

## Architecture notes

- **`data/gallery.json`** — cached API output committed to the repo; used as fallback if a fetch fails at build time.
- **`gallery.html`** — generated static page; do not edit by hand.
- **`sermons.html`** — YouTube only; Instagram lives on `/gallery`.
- Instagram posts render as native embeds via `embed.js`, loaded lazily when the gallery scrolls into view.
