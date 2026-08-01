# Admin auth — parked (superseded)

Auth cutover is **no longer parked for planning**. Implementation instructions for Google AG AI (or any coding agent) are here:

**[`docs/GOOGLE-AG-AI-RESOURCES-AUTH.md`](../docs/GOOGLE-AG-AI-RESOURCES-AUTH.md)**

That doc covers: `/admin` → `/resources`, Google OAuth + `ALLOWED_EDITOR_EMAILS`, and GitHub App bot tokens for Decap.

## Current production (until cutover ships)

- CMS still uses GitHub OAuth (`admin/config.yml` → `auth_endpoint: api/auth`).
- Env vars `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` must remain set on Vercel until the Google cutover is live.

## After cutover

Replace this file with `resources/AUTH.md` (see WP4 in the handoff doc) and remove this parked note.
