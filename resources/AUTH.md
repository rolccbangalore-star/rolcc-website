# ROLCC Resources — Authentication Setup & Operations

This document describes the Google OAuth + GitHub App installation token auth flow for the ROLCC Article Composer (Decap CMS) hosted at `/resources`.

---

## Overview

```
Editor → Open /resources → Sign in with Google → /api/callback
                                                 ↓
                                 Verify OAuth state cookie (CSRF)
                                                 ↓
                                 Check email_verified + ALLOWED_EDITOR_EMAILS
                                                 ↓
                                 Mint short-lived GitHub App installation token (~1h)
                                                 ↓
                                 Post message token to Decap CMS (github backend, origin-only)
```

1. Staff members open `https://www.rolcc.in/resources` and click **Sign in with Google**.
2. `/api/auth` sets an httpOnly `rolcc_oauth_state` cookie and redirects the editor to Google OAuth (`scope=openid email profile`).
3. Google redirects back to `/api/callback` with an authorization code and `state`.
4. The server verifies `state` against the cookie, then exchanges the code for the user's identity.
5. The server requires `email_verified === true` and checks the email against `ALLOWED_EDITOR_EMAILS`.
   - **If not allowlisted:** Returns HTTP 403 Forbidden with a clear notification page.
   - **If allowlisted:** Generates a RS256 JWT using `GITHUB_APP_PRIVATE_KEY` and calls GitHub API (`POST /app/installations/{GITHUB_APP_INSTALLATION_ID}/access_tokens`) to mint a short-lived (~1 hour) GitHub App installation token.
6. The token is sent back to Decap CMS via `postMessage(..., allowedOrigin)` only (never `"*"`).
7. Decap CMS uses this token to read and write content/media directly via GitHub Contents API.

On first load after cutover, `/resources` wipes Decap/GitHub auth keys in browser storage when `rolcc.auth.version !== "2"`, then sets the version. Collection/view prefs are left alone. Returning users with old GitHub OAuth tokens must sign in again through Google + allowlist.

---

## Required Environment Variables (Vercel)

Set these in the **Vercel Project Settings → Environment Variables** (Production at minimum):

| Variable | Description | Example / Format |
|----------|-------------|------------------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID (Web application) | `123456789-abc...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-...` |
| `ALLOWED_EDITOR_EMAILS` | Comma-separated allowlist of editor Gmails (lowercase) | `editor1@gmail.com,editor2@gmail.com` |
| `GITHUB_APP_ID` | GitHub App ID (numeric) | `123456` |
| `GITHUB_APP_INSTALLATION_ID` | Installation ID on the website repo | `87654321` |
| `GITHUB_APP_PRIVATE_KEY` | PEM private key from the GitHub App | `-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----` |
| `OAUTH_ORIGIN` | *(Optional)* Override site origin for preview deployments | `https://your-preview.vercel.app` |

**PEM newlines:** In Vercel you can paste the PEM with literal newlines, or a single line using `\n` escape sequences — the server normalizes both.

> [!NOTE]
> `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` (old GitHub User OAuth app credentials) are obsolete and can be removed once production Google cutover is confirmed.

---

## Google Cloud Console Setup

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Create (or select) an **OAuth 2.0 Client ID** of type **Web application**.
3. Under **Authorized redirect URIs**, add exactly:
   - `https://www.rolcc.in/api/callback`
4. *(Optional)* Add preview callback URIs if you set `OAUTH_ORIGIN` for non-production deploys (must match that origin + `/api/callback`).
5. Copy **Client ID** → `GOOGLE_CLIENT_ID` and **Client Secret** → `GOOGLE_CLIENT_SECRET`.

---

## GitHub App Setup & Permissions

1. GitHub → **Settings** → **Developer settings** → **GitHub Apps** → **New GitHub App** (or configure an existing one).
2. **Repository permissions:**
   - **Contents:** Read and write (required for Decap commits/media)
3. **Where can this GitHub App be installed?** Only on this account.
4. Create the app, then **Install** it on `rolccbangalore-star/rolcc-website` (or the org/account that owns the repo).
5. Copy:
   - **App ID** from the app’s settings page → `GITHUB_APP_ID`
   - **Installation ID** from the install URL (`.../settings/installations/<id>`) or the install API → `GITHUB_APP_INSTALLATION_ID`
6. **Generate a private key**, download the `.pem`, and paste full contents into `GITHUB_APP_PRIVATE_KEY` on Vercel.

---

## Adding or Revoking Editors

### Grant access
1. Add their Gmail to `ALLOWED_EDITOR_EMAILS` (comma-separated, lowercase).
2. Save in Vercel; redeploy or wait for the next serverless cold start so the env is picked up.
3. They open `/resources` and **Sign in with Google**.

### Revoke access
1. **Remove** their email from `ALLOWED_EDITOR_EMAILS` in Vercel and save/redeploy.
2. Wait ~**1 hour** for any outstanding GitHub App installation token TTL to expire (tokens are short-lived ~1h).
3. They must **re-login** to get a new token; after revoke, Google callback will return 403 for that email.
4. Optionally ask them to log out of `/resources` (or clear site data) so the browser drops a cached Decap token immediately.

### Residual risks (honest)
- **Browser token:** Until TTL expires or they log out / storage wipe, a previously minted installation token in `localStorage` can still talk to GitHub as the App.
- **Phishing / XSS:** A malicious page on the same origin, or XSS on `www.rolcc.in`, could read Decap’s stored token. Keep the CMS origin locked down (`noindex`, trusted scripts only).
- **Shared allowlisted Gmail:** Anyone who can sign into that Google account can enter the composer.
- **GitHub App blast radius:** Contents R/W on the installed repo — protect the PEM and App credentials like production secrets.

---

## Staff URL & Access

Staff should visit:

`https://www.rolcc.in/resources`

Legacy `/admin` requests permanently redirect to `/resources`.

### Quick test checklist
1. Allowlisted Gmail → Sign in with Google → composer loads; can open/edit a draft.
2. Non-allowlisted Gmail → 403 error page; no token.
3. `/admin` → redirects to `/resources`.
4. After env changes → redeploy Production on Vercel, then retest.
