# Article Composer — Mobile Listing Polish (Requirements Handoff)

Handoff for the AI developer working in `A:\Rolcc-website\admin` (repo `admin/` folder).

**Scope:** `/admin` (Article Composer) only. Do **not** change the public church website (`index.html`, articles pages, mega menu, footer, sitemap, etc.).

**Related prior handoff:** `admin/MOBILE-COMPOSER-FIX-REQ.md` (shell / drawer / FAB foundation). This doc is the **next slice** — listing polish + login landing + drawer/FAB regressions from live phone screenshots (Jul 2026).

---

## Product intent

Staff open `/admin` on a phone mainly to browse collections and create/import articles. After login they must land on a real collection (not a blank internal page). The listing must read clearly: **collection title**, then **view + sort/filter**, then cards/list — without black tap chrome, without FAB fighting the drawer, and without redundant “Collection” columns when they are already inside that category.

---

## Hard constraints (non-negotiable)

### Platform

- Changes are **mobile-first for ≤640px** unless a bug is route/logic (e.g. Tags redirect) and must also work on desktop.
- Desktop (`≥641px`, especially ≥1024px) must keep the current shell:
  - Left sidebar always visible
  - Create Article in sidebar
  - Centered search + Website + profile in topbar
  - **No** floating create FAB
  - **No** mobile drawer / scrim chrome

### Design system (ROLCC admin)

- Calm, trustworthy, restrained — one accent (existing `--rolcc-accent`), neutral surfaces, clear hierarchy.
- No new experimental UI; no purple glow / multi-layer shadows beyond what already ships.
- Touch targets ≥ ~2.5rem for icon buttons; icons centered in their boxes.
- Buttons must look clickable; avoid black OS focus rings on tap (use `:focus-visible` only for keyboard).
- White space: drawer should sit flush under the topbar (no large empty band under the header).

### Engineering

- Static site + Decap; no new runtime services.
- Prefer fixing existing classes/ids (`#admin-mobile-fab-wrap`, `.admin-shell-sidebar`, `.admin-collection-head`, `.admin-composer-menu--sort`, etc.) over new frameworks.
- After CSS/JS edits, **bump `?v=`** on assets in `admin/index.html` (cache bust).
- Commit **admin files only**; do not mix unrelated public HTML/sitemap dirty files.
- Push to `main` only when the product owner asks.

### Testing later (acceptance owner)

Phone or Chrome device mode ≤640px + desktop ≥1024px smoke. See checklist at bottom.

---

## Observations → requirements

### 1. Blank “Tags” page after Decap login

**Wrong today:** After login, users land on a page titled **Tags** with empty content. Tags is an internal Decap collection (`article-tags` in `config.yml`), not a staff content library.

**Required:**

- After auth / on `#/collections/article-tags`, redirect to a real content collection:
  - Prefer last remembered collection (`sessionStorage` / existing remember helpers), else **Sermon Summary** (`articles` / `DEFAULT_COLLECTION`).
- `getPreferredCollection()` must **not** treat `article-tags` (or other `INTERNAL_COLLECTIONS`) as a valid preferred collection.
- Users should never need to know Tags exists for day-to-day composing.

**Files:** `admin/admin-composer.js` (and only touch `config.yml` if needed for ordering — logic fix is required either way).

**Acceptance:** Fresh login → Sermon Summary (or last collection) with cards/list visible. No blank Tags shell.

---

### 2. Black border behind grid / list / sort / filter

**Wrong today:** Controls show a dark/black border or ring that looks like a base component focus/outline (and/or `.btn-primary` ring).

**Required:**

- On mobile, view toggle, sort, and filter triggers: no black tap outline; no unintended dark border.
- Use transparent `-webkit-tap-highlight-color`.
- Keep accessible keyboard focus via `:focus-visible` (accent outline), not `:focus` on every tap.
- Align borders with existing soft slate borders only (match current design tokens).

**Files:** `admin/admin.css` (primarily `@media (max-width: 640px)`).

---

### 3. Collection title on its own line; controls on line 2

**Wrong today:** “Sermon Summary” / “Back to the Bible” shares one row with filter, sort, list, grid — cramped and hard to scan.

**Required (mobile listing only):**

| Row | Content |
|-----|---------|
| **1** | Collection title only (`h1`) — full width |
| **2** | **Left:** list + grid toggle · **Right:** sort + filter |

- Desktop layout (title + toolbar on one row) unchanged.
- Do not rely on `flex-direction: row !important` from desktop winning over mobile — mobile rules must actually apply (`!important` where the cascade fights).
- Prefer DOM order: view toggle group, then sort/filter group with `margin-left: auto` (avoid fragile `row-reverse` on mobile).

**Files:** `admin/admin.css`, `admin/admin-composer.js` (`ensureComposerToolbar` / collection head).

---

### 4. Black outline on “Create an article” FAB tap

**Wrong today:** Tapping the FAB shows a harsh black outline.

**Required:**

- Same tap/outline rules as §2 for `.admin-mobile-fab-btn` / editor FAB.
- Soft purple FAB shadow only — remove competing `btn-primary` 1px ring if that is the source.
- Keyboard `:focus-visible` still allowed.

**Files:** `admin/admin.css`, optionally `admin/admin-composer.js` (class list on FAB).

---

### 5. Create article FAB works inconsistently

**Wrong today:** Sometimes tap opens the create menu, sometimes it doesn’t / closes immediately / fights remounts.

**Required:**

- Open **only** on intentional FAB tap; second tap closes.
- Close on: outside tap, Escape, route change, choosing a create option, opening the drawer.
- `enhance()` / MutationObserver remount must **not** reset an open menu on every Decap DOM twitch — only reset on route/view change or explicit close.
- Document click / scroll handlers must not race the FAB closed mid-gesture.
- Still hidden on desktop and on editor routes.

**Files:** `admin/admin-composer.js` (`mountMobileFab`, `closeAllDropdowns*`, `watch` listeners).

---

### 6. FAB stays visible over open hamburger drawer

**Wrong today:** Drawer opens; “+ Create an article” still floats on top of Sign out / footer.

**Required:**

- While drawer is open (`.admin-shell-sidebar--open` / scrim visible), hide create FAB (and editor Actions FAB if present).
- Restore FAB when drawer closes.
- Prefer explicit hide in `openMobileDrawer` / `closeMobileDrawer` and/or body class + CSS — do not rely on z-index alone.

**Files:** `admin/admin-composer.js`, `admin/admin.css`.

---

### 7. Unnecessary gap at top of drawer

**Wrong today:** Large empty white band above search / Contents inside the drawer.

**Required:**

- Drawer panel starts flush under the fixed topbar (`top: var(--rolcc-header-height)`).
- Reduce excess padding/margin above search and Contents.
- No dark “strip” between header and drawer from mismatched `top` values (e.g. hardcoded `6.5rem` vs real header height).

**Files:** `admin/admin.css`.

---

### 8. “Contents” dropdown in drawer not clickable

**Wrong today:** Tapping Contents / view switcher does nothing useful (drawer may close).

**Required:**

- Tapping the Contents trigger **opens** the Contents/Media menu **without** closing the drawer.
- Selecting Contents or Media then navigates and may close the drawer (expected).
- Root cause to avoid: trigger must not call `closeAllDropdowns()` if that also calls `closeMobileDrawer()`.
- Menu must not be clipped by drawer overflow; usable tap targets.

**Files:** `admin/admin-composer.js` (`bindShellDropdowns` / view switcher), `admin/admin.css` if overflow/z-index needed.

---

### 9. Filter / sort icon alignment and clarity

**Wrong today:** Filter icon sits off-center; sort icon is tiny/unclear and not centered in its box.

**Required:**

- Square icon-only controls (~2.5rem), icon perfectly centered (flex).
- Filter: keep funnel; ensure vertical/horizontal centering.
- Sort: replace with a **more recognizable** sort glyph (clearer arrow-up-down or A–Z style) — still icon-only on mobile with `aria-label` / tooltip.
- Match height with list/grid toggle buttons; active red dots unchanged when non-default.

**Files:** `admin/admin-composer.js` (`MENU_ICONS`), `admin/admin.css`.

---

### 10. List view: better columns (no redundant Collection)

**Wrong today:** List shows **Title + Collection** (and other columns clipped). Collection repeats “Back to the Bible” / “Sermon Summary” on every row even though the user already selected that category.

**Required (mobile list view):**

| Column | Show |
|--------|------|
| Title | Yes |
| Date | Yes |
| Status | Yes (Draft / Published — existing status cell) |
| Collection | **No** (redundant on collection routes) |
| Author | **No** on ≤640px (saves space) |

- Implement in list builders (`buildListHeader` / `renderListRow`) + matching `grid-template-columns` — do not only `display:none` leftover 5-column tracks.
- Desktop list may keep richer columns if already designed that way.

**Files:** `admin/admin-composer.js`, `admin/admin.css`.

---

## Primary files

| File | Role |
|------|------|
| `admin/admin-composer.js` | Routing, toolbar DOM, FAB, drawer, list rows |
| `admin/admin.css` | Mobile layout, outlines, drawer, list grid |
| `admin/index.html` | Asset `?v=` bump only (unless markup slot needed) |
| `admin/config.yml` | Only if reordering collections; logic fix still required |

---

## Out of scope

- Public site pages, mega menu, footer, counselling/fellowship HTML.
- Redesigning Decap Tags as a product feature (keep internal; just don’t land users there).
- Desktop shell redesign.
- New npm dependencies.

---

## Acceptance checklist

- [ ] Login never lands on blank Tags; lands on Sermon Summary or last content collection.
- [ ] Mobile: collection title alone on row 1; row 2 = list/grid left, sort/filter right.
- [ ] No black tap rings on view / sort / filter / Create FAB.
- [ ] Create FAB opens/closes reliably; menu closed by default.
- [ ] Drawer open → FAB hidden; drawer closed → FAB returns.
- [ ] Drawer top flush under header; no large empty gap.
- [ ] Contents dropdown opens inside drawer without closing it; choosing a view navigates correctly.
- [ ] Sort/filter icons centered and recognizable; active badges still work.
- [ ] Mobile list = Title / Date / Status; no Collection column.
- [ ] Desktop ≥641px: no FAB, sidebar intact, listing toolbar not broken.
- [ ] `?v=` bumped; admin-only commit; ready to push `main` when asked.

---

## Work split recommendation (PM)

Use this when assigning tickets. Prefer **one owner for the whole package** if possible — items share `enhance()`, drawer, and FAB state and conflict easily if two agents edit the same files in parallel.

### Assign to Cursor / lead agent (complex, high coupling) — recommended for me

| # | Item | Why complex |
|---|------|-------------|
| **1** | Tags → preferred collection redirect | Easy to break login/hash migration; needs correct `getPreferredCollection` semantics |
| **3** | Two-row title + toolbar layout | CSS `!important` cascade + toolbar DOM order |
| **5** | FAB inconsistent behavior | MutationObserver / enhance remount / scroll / click races |
| **6** | Hide FAB when drawer open | Must ship with #5 (same open/close state machine) |
| **8** | Contents dropdown in drawer | `closeAllDropdowns` vs drawer; overflow/z-index |
| **10** | List columns Title/Date/Status | List header/row builders + grid templates |

### Assign to another AI / lighter pass (if splitting)

| # | Item | Why lighter |
|---|------|-------------|
| **2** | Black borders on view/sort/filter | Mostly CSS tap/outline resets |
| **4** | FAB black outline | Same CSS family as #2 |
| **7** | Drawer top gap | Spacing / `top` CSS |
| **9** | Icon alignment + clearer sort SVG | Icon asset + box centering CSS |

**If you assign only the complex set to Cursor:** still include **#6** with that set (do not leave FAB-over-drawer to a second agent). Optionally fold **#2/#4/#7/#9** into the same PR so one `?v=` bump and one phone QA pass covers everything.

### Suggested assignment message for Cursor

> Implement `admin/MOBILE-LISTING-POLISH-REQ.md` items **1, 3, 5, 6, 8, 10** (and 2, 4, 7, 9 if unassigned). Do not edit the public site. Bump `?v=`, commit admin only, push `main` when I say so. Desktop must remain unchanged.

---

## QA notes for later (lead agent / PM)

When verifying on device:

1. Incognito login → confirm **not** Tags.
2. Sermon Summary + Back to the Bible: title row / control row layout.
3. Tap every chrome control (list, grid, sort, filter, FAB) — no black ring.
4. Open drawer → FAB gone; Contents opens; pick Media then Contents; close drawer → FAB back.
5. List view columns readable without sideways scroll.
6. Desktop window ≥1024: sidebar + search + Create in sidebar; no FAB.
