# Admin auth — parked

GitHub OAuth for the article composer is **paused** while we focus on other features (e.g. article appreciation).

## Current state

- Production CMS still uses GitHub OAuth (`admin/config.yml` → `auth_endpoint: api/auth`).
- Env vars `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` must remain set on Vercel for editors who already log in.

## Parked work (do not pursue until resumed)

- GitHub collaborator invites for church staff
- Post-OAuth email allowlist (`ALLOWED_EDITOR_EMAILS`)
- Google Sign-In proxy

## To resume

1. Finish collaborator access on `rolccbangalore-star/rolcc-website`.
2. Optionally add allowlist in `api/callback.js`.
3. Remove or archive this file when auth work restarts.
