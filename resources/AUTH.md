# ROLCC Resources — Authentication Setup & Operations

This document describes the Google OAuth + GitHub App installation token auth flow for the ROLCC Article Composer (Decap CMS) hosted at `/resources`.

**Editors use Gmail only.** That is why Google OAuth exists. Editors do not need a GitHub account or repo invite. A church-owned GitHub App (admin-maintained secrets on Vercel) writes to the repo on their behalf.

Do **not** add editors as GitHub collaborators for CMS access — that is the old model and is not required when App tokens work. If Decap only works after inviting someone as a collaborator, the App-token handshake is broken; fix that, don’t invite every Gmail.

Decap may still say “GitHub” in technical errors — that refers to the App token plumbing, not a requirement that editors join GitHub.

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
5. The server requires `email_verified === true` and checks the email against the allowlist:
   - Vercel env `ALLOWED_EDITOR_EMAILS` (comma-separated), **and/or**
   - Repo file `data/resources-editors.json` (`emails` array)
   - **If not allowlisted:** Returns HTTP 403 Forbidden with a clear notification page.
   - **If allowlisted:** Generates a RS256 JWT using `GITHUB_APP_PRIVATE_KEY` and calls GitHub API (`POST /app/installations/{GITHUB_APP_INSTALLATION_ID}/access_tokens`) to mint a short-lived (~1 hour) GitHub App installation token.
6. The token is sent back to Decap CMS via `postMessage(..., allowedOrigin)` only (never `"*"`).
7. Decap CMS uses this token to read and write content/media directly via GitHub Contents API.

On first load after cutover, `/resources` wipes Decap/GitHub auth keys in browser storage when `rolcc.auth.version` mismatches, then sets the version. Collection/view prefs are left alone. Returning users with old GitHub OAuth tokens must sign in again through Google + allowlist.

---

## Adding editors

### Preferred (after Team page ships — see AG handoff)

1. Open `https://www.rolcc.in/resources/team.html` (GitHub login; repo push access required).
2. Add or remove Gmail addresses; save commits `data/resources-editors.json` on `main`.
3. After deploy (or next serverless read), the editor signs in at `/resources` with Google.

### Bootstrap / emergency (Vercel)

1. Edit `ALLOWED_EDITOR_EMAILS` (comma-separated, lowercase).
2. Redeploy Production.
3. Also keep `data/resources-editors.json` in sync when possible so deploys stay consistent.

### Example — Mercy

Add `mercy.07.john@gmail.com` to `data/resources-editors.json` **and/or** `ALLOWED_EDITOR_EMAILS`, redeploy if only env changed, then she uses **Sign in with Google** on `/resources`.

AG implementation details: [`docs/GOOGLE-AG-AI-RESOURCES-LOGIN-POLISH.md`](../docs/GOOGLE-AG-AI-RESOURCES-LOGIN-POLISH.md).

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

### Troubleshoot: “Repo … not found” after Google sign-in

This Decap toast means the **GitHub App installation token** cannot open `rolccbangalore-star/rolcc-website`. It does **not** mean the editor needs a personal GitHub account.

Check, in order:

1. GitHub → the App → **Install App** → installed on account `rolccbangalore-star` with access to **`rolcc-website`** (not “only select repos” missing this one).
2. App permissions include **Contents: Read and write**; after changing permissions, click **Review request** / accept new permissions on the install.
3. Vercel `GITHUB_APP_INSTALLATION_ID` is the number in the URL  
   `https://github.com/settings/installations/THIS_NUMBER`  
   (short digits — not the App ID, not the PEM).
4. `GITHUB_APP_ID` matches the App’s **App ID**; `GITHUB_APP_PRIVATE_KEY` is a current PEM for **that same** App.
5. Redeploy Production after any env change; editor clears site data and signs in with Google again.

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
