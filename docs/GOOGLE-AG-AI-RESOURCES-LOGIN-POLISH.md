# Google AG AI — Resources login polish + team allowlist

## Purpose

This document is a **work package for Google AG AI** (a coding agent). Implement login-page polish for the ROLCC Article Composer at `/resources`, and a **GitHub-only Team page** so church web owners can add/remove editor Gmails without editing Vercel env vars every time.

Do **not** wait for a separate Cursor plan file. Everything needed for WP-A, WP-B, and WP-C is in this document and the current repo.

| Item | Value |
|------|--------|
| Repo (local) | `A:\Rolcc-website` |
| Repo (GitHub) | `rolccbangalore-star/rolcc-website` |
| Live site | `https://www.rolcc.in` (Vercel) |
| Composer | `https://www.rolcc.in/resources` (Decap CMS 3.3.0) |
| Deploy | Static site + Vercel serverless `api/*.js` |

### Locked product decisions (do not reopen)

1. **Google login** stays the path for **content editors** (allowlist + GitHub App installation token → Decap `backend: github`). Already live — do not break it.
2. **Team allowlist manager** (new): **GitHub OAuth only** for repo collaborators/owners with push access. Separate from Google editor login. Used to add/remove editor Gmails.
3. Allowlist sources (either grants access):
   - Repo file [`data/resources-editors.json`](../data/resources-editors.json) (array of emails)
   - Vercel env `ALLOWED_EDITOR_EMAILS` (comma-separated bootstrap / emergency)
4. Login UI: calm church tone; **no Decap marketing brand**; Google-style sign-in button; support mailto; header chrome **only when authenticated**; quiet `rolcc.in` site link; mobile/tablet friendly.
5. Keep CSS/JS `admin-*` class prefixes and `rolcc.admin.*` storage keys unless a login-specific class is required.

### Current state (read before coding)

- Google OAuth: [`api/auth.js`](../api/auth.js), [`api/callback.js`](../api/callback.js), [`api/oauth-config.js`](../api/oauth-config.js)
- Composer shell: [`resources/index.html`](../resources/index.html), [`resources/admin.css`](../resources/admin.css), [`resources/admin-composer.js`](../resources/admin-composer.js)
- Login detection: `isLoginView()` / `ensureLoginButtonCopy()` in `admin-composer.js`; body class `admin-page--authed` when logged in
- Auth docs: [`resources/AUTH.md`](../resources/AUTH.md)
- Sr Cursor may already have seeded `data/resources-editors.json` and merged file+env in `isEmailAllowed` — **extend**, do not regress

---

## Human vs AG split

### Humans (Vercel / ops)

- Keep `ALLOWED_EDITOR_EMAILS` as bootstrap (include known admins).
- After Team page ships, prefer adding editors via Team page; env remains fallback.
- GitHub App + Google OAuth env vars already required (see `resources/AUTH.md`).

### AG AI (this document)

- WP-A login polish
- WP-B Team page + API + allowlist file wiring (if not fully done by Cursor)
- WP-C docs update

### Escalate to Cursor (hard)

1. Login header gating with `:not(.admin-page--authed)` without breaking editor/collection toolbars.
2. Merging filesystem editors JSON + env inside `isEmailAllowed` on Vercel cold starts.
3. Team-page auth that does not weaken Google editor allowlist.

---

## What you SHOULD pick up

Implement **WP-A → WP-B → WP-C** in order. Prefer one feature branch and a small commit stack.

---

### WP-A — Login page polish (Google editors)

**Goal:** Login screen feels like ROLCC Resources, not Decap marketing. Header actions appear only after Google sign-in.

**Files:** `resources/index.html`, `resources/admin.css`, `resources/admin-composer.js`

| # | Requirement | Implementation notes |
|---|-------------|----------------------|
| 1 | Remove Decap branding | Hide Decap logo/wordmark on login (`#nc-root` login / `.admin-view--login`). Keep CMS functional. Prefer CSS `display: none` on Decap auth header logo/title nodes; re-run on enhance if Decap remounts. |
| 2 | Google-looking button | Style `button[class*="LoginButton"]` like Google Identity: white/light fill, 1px slate border, multi-color **G** SVG (inline via JS in `ensureLoginButtonCopy` or CSS background), label **Sign in with Google** (already set). Min height ~40px; full-width on small screens. |
| 3 | Contact admin support | Login view only: “Need help? Contact admin team” → `mailto:rolccbangalore@gmail.com`. Place below the Google button (composer enhance or static slot in `index.html` shown only when `isLoginView`). |
| 4 | Header actions only when logged in | `body:not(.admin-page--authed)` hide: search, Schedule, Publish, import/preview/save/delete, profile/sign-out. Keep minimal brand mark. Do **not** hide those controls when `admin-page--authed`. |
| 5 | Quiet site link as `rolcc.in` | Topbar “Website” → label **`rolcc.in`**, quieter style (text link / lower contrast). Login “Go back to site” → **`rolcc.in`** (same href `https://www.rolcc.in/`), low emphasis. |
| 6 | Responsive | Login + thin header work at ~375px and tablet; no horizontal scroll; Google button finger-friendly (≥44px touch target). |

#### WP-A checks

- Logged-out: brand + Google button + support mailto + quiet `rolcc.in`; **no** Schedule/Publish/search.
- Logged-in: existing composer chrome restored.
- Phone width usable.

---

### WP-B — GitHub-only Team allowlist manager

**Goal:** Owners with GitHub push access manage editor emails in git without Vercel for each person.

#### Data file

Create/maintain:

```json
{
  "emails": [
    "rolccbangalore@gmail.com",
    "jsamjosh@gmail.com",
    "mercy.07.john@gmail.com"
  ]
}
```

Path: **`data/resources-editors.json`**

Normalize emails lowercase when writing.

#### Allowlist merge (server)

In `api/oauth-config.js` `isEmailAllowed(email)`:

1. Normalize email lowercase/trim.
2. Build set from:
   - `process.env.ALLOWED_EDITOR_EMAILS` (split commas)
   - `data/resources-editors.json` → `emails` array via `fs.readFileSync` from project root (path join `__dirname/../data/resources-editors.json` or `process.cwd()/data/...`). Fail open to env-only if file missing; never throw on missing file.
3. Allow if email is in either source.

Cache file contents in module scope with short TTL (e.g. 30–60s) optional; simple read-each-time is OK for low traffic.

#### Team page

- **URL:** `https://www.rolcc.in/resources/team.html` (also rewrite `/resources/team` → that file in `vercel.json` if needed)
- **`noindex`**, not linked from public site nav
- Calm ROLCC styling (reuse admin tokens / shared CSS sparingly)
- States: signed out (GitHub sign-in CTA) → signed in (email list, add field, remove, save status)

#### Auth for Team page (locked approach)

1. Separate lightweight GitHub OAuth for **team admins** (or reuse App user-to-server if you already have GitHub OAuth client; if only Google+App install tokens exist, add minimal GitHub OAuth app **or**):
   - **Preferred locked path:** Team API uses **GitHub App installation token** to commit JSON, but **session** is established by verifying a GitHub user access token from a small GitHub OAuth login dedicated to team admins.
2. After GitHub login, call GitHub API: user must have **push** (or admin) on `rolccbangalore-star/rolcc-website`.
3. Set httpOnly session cookie (signed with a new env `TEAM_SESSION_SECRET` or derive carefully from existing secrets — document env in AUTH.md). Reject if not collaborator.
4. **Do not** grant Team access via Google editor allowlist alone.

If introducing GitHub OAuth for Team requires new `GITHUB_TEAM_CLIENT_ID` / `SECRET`, document them; alternatively implement Team login via redirect to GitHub with the existing App’s **user authorization** if the App has “Request user authorization during installation” — only if already enabled; otherwise document new OAuth app env vars for humans.

**Minimum viable locked path if OAuth app addition is blocked:** protect `api/editors.js` with a shared secret header `TEAM_ADMIN_SECRET` for v1 **and** still require commits as App — **not preferred**. Prefer real GitHub user collaborator check.

#### API

`api/editors.js` (or split get/put):

| Method | Behavior |
|--------|----------|
| `GET` | If team session valid → return `{ emails: [...] }` from file (or Contents API). Else 401. |
| `PUT` | Body `{ emails: string[] }`. Validate emails. Commit `data/resources-editors.json` to `main` via GitHub App installation token (same mint helper as composer). Message e.g. `Update Resources editor allowlist.` Return updated list. |

Never expose App PEM or installation token to the browser.

#### vercel.json

- Ensure `/resources/team.html` is served; optional pretty `/resources/team`.

#### WP-B checks

- Collaborator can add/remove email; commit appears on `main`; after deploy/cold read, Google login for that email works.
- Non-collaborator cannot mutate allowlist.
- Google editor flow unchanged for existing allowlisted users.
- Env-only emails still work if omitted from JSON.

---

### WP-C — Docs

Update [`resources/AUTH.md`](../resources/AUTH.md):

1. How editors sign in (Google + allowlist).
2. How to add editors: **Team page** (preferred) + Vercel `ALLOWED_EDITOR_EMAILS` fallback.
3. Example onboarding (e.g. Mercy): add email → they use `/resources` → Sign in with Google.
4. Team page URL and who may use it (GitHub push access).
5. Residual risks unchanged (browser token, phishing, etc.).

Do **not** put secrets in docs.

---

## Files likely touched

| Path | Why |
|------|-----|
| `resources/index.html` | Login support link; `rolcc.in` labels; optional login-only slots |
| `resources/admin.css` | Decap hide; Google button; unauthed header; responsive |
| `resources/admin-composer.js` | Login enhance; button icon; support link mount |
| `data/resources-editors.json` | Allowlist file |
| `api/oauth-config.js` | `isEmailAllowed` merge |
| `api/editors.js` | Team API (new) |
| `resources/team.html` | Team UI (new) |
| `api/team-auth.js` / callback pieces | Team GitHub session (as needed) |
| `vercel.json` | Team routes |
| `resources/AUTH.md` | Ops docs |

---

## Acceptance criteria

- [ ] Login: no Decap logo/wordmark; Google-style button; support mailto to `rolccbangalore@gmail.com`
- [ ] Logged-out: no Schedule / Publish / search / editor action icons
- [ ] Quiet `rolcc.in` link present; works on ~375px width
- [ ] Existing Google login + publish still works
- [ ] Non-allowlisted Google still 403
- [ ] `data/resources-editors.json` + env both honored by `isEmailAllowed`
- [ ] Team page: collaborator can edit allowlist; others cannot
- [ ] `resources/AUTH.md` updated

---

## Suggested commits

1. `Polish Resources login: Google button, hide Decap brand, gate header until auth.`
2. `Add GitHub Team allowlist page and editors.json merge for Google login.`
3. `Document Resources editor onboarding and Team allowlist in AUTH.md.`

---

## Report back when done

1. Commit hashes + branch
2. Files changed (bullets)
3. Env vars humans must set (if any new for Team auth)
4. How to add Mercy / next editor (exact steps)
5. Residual risks / follow-ups
6. What you escalated to Cursor (if anything)

---

## Out of scope

- Per-user roles beyond editor vs team admin
- Removing Vercel env allowlist entirely
- Full authenticated composer redesign beyond login/header visibility
- Public nav link to `/resources` or `/resources/team.html`
