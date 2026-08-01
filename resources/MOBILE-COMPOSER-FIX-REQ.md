# Article Composer Mobile Fix — Requirements Handoff

Handoff for the AI developer working in `A:\Rolcc-website\admin` (or the repo `admin/` folder).

**Scope:** `/admin` (Article Composer) only. Do **not** change the public church website.

---

## Hard constraint

All of the following is **mobile-only** (`max-width: 640px` unless noted).

Desktop (`≥1024px`) must keep the current desktop shell:

- Left sidebar
- Create Article in sidebar
- Centered search
- Website + profile in topbar
- **No** floating create FAB
- **No** mobile drawer chrome

---

## Bugs visible in screenshots (must fix)

### 1. Dual chrome / “both menus” on mobile listing

**Wrong today:** With the hamburger drawer open, the topbar still shows Website, Sign out (profile), Search, and hamburger — so users see drawer actions **and** header actions at once.

**Required:**

- Mobile listing header = **logo + short brand text** on the left, **hamburger only** on the right.
- Hide on mobile listing header:
  - `.admin-website-link`
  - `#admin-search-wrap` / search field
  - `#admin-profile-slot` / Sign out
- Website + Sign out + Search live **only inside** the hamburger drawer:
  - Search at the top of the drawer
  - Sticky footer: **Go to website**, then **Sign out**
- When drawer is open: dim/scrim the page; tapping scrim or hamburger again closes it.
- Do not leave a second parallel “menu” of the same actions in the header.

**Files:** `admin/index.html`, `admin/admin.css`, `admin/admin-composer.js`

---

### 2. FAB create menu stays open

**Wrong today:** `#admin-mobile-fab-wrap` / `.admin-mobile-fab-menu` shows “Create a sermon summary” / “Create a back to bible” without an intentional tap (and stays open). Also appears on **desktop** in screenshots — must not.

**Required:**

- FAB visible **only** on mobile collection/list routes (not editor, not desktop).
- Default state: menu **`hidden`**, wrap **without** `.is-open`.
- Open **only** on FAB tap; toggle closed on second tap.
- Close on:
  - Outside click
  - Escape
  - Route change
  - Choosing a create option
  - Opening the hamburger drawer
- `mountMobileFab` in `admin-composer.js` must not leave menu open after remount/`enhance()`; always re-assert closed after create/navigate.
- CSS: hide `.admin-mobile-fab-wrap` by default; show only inside `@media (max-width: 640px)` on collection view.

---

### 3. Logo + title not optimised (mobile listing)

**Wrong today:** Brand truncates to a single letter (“R” / “c.”).

**Required mobile listing header:**

- Logo visible, not clipped.
- Title: **ROLCC church** (short).
- Subtitle: **article composer**.
- Hide long desktop name (“River of Life Christian Church”) on mobile.
- Ensure topbar grid does not squeeze brand to ~1 character (fix `grid-template-columns` / min-widths on `.admin-shell-topbar` for ≤640px).

---

### 4. Header still shows actions that should be removed (mobile)

Remove from **mobile listing** topbar entirely:

- Go to Website / Website
- Search
- Sign out

Keep them only in the hamburger drawer (footer + search slot).

---

## Article create/edit page (mobile)

**Wrong today:** Crowded topbar: Back + logo + truncated “R” + Import + Save + Publish + Sign out.

**Required mobile editor** (`body.admin-page--editor`, ≤640px):

| Keep in top bar | Remove from top bar |
|-----------------|---------------------|
| Back | Logo / brand text |
| | Sign out / profile |
| | Website |
| | Search |
| | Import, Save draft, Publish (move to FAB) |

### Editor FAB (mobile only)

- Bottom FAB that expands on tap with: **Import**, **Save**, **Publish** (same actions as current `#admin-import-btn`, `#admin-save-draft-btn`, `#admin-publish-btn`).
- Closed by default; same open/close rules as create FAB.
- Hide those three controls from the topbar on mobile (CSS and/or `syncEditorTopbar`).
- Article **title** input belongs in the page body under the top bar (not jammed into the action bar). Do not leave title missing entirely.

Desktop editor unchanged: Import / Save / Publish stay in topbar; no editor FAB.

---

## Sort & filter (mobile listing) — still unfinished

**Wrong today:** Still shows text like “Sort by” / long labels; not icon-first; no reliable active badges.

**Required (mobile listing toolbar):**

- One horizontal row under page title:
  - **View toggle left** (grid/list)
  - **Sort + filter right**
- Sort/filter triggers are **icon-only**
  - Hide `.admin-composer-menu__prefix` and `.admin-composer-menu__value` on ≤640px
  - Keep `aria-label` / tooltip
- Target real classes: `.admin-composer-menu--sort`, `.admin-composer-menu--filter` (not only `.admin-sort-wrap`).
- Red dot badge when non-default sort or filter ≠ “all”; toggle classes in JS when value changes (e.g. `admin-has-active-sort` / `admin-has-active-filter` on the menu wrap).

---

## Acceptance checklist

- [ ] Desktop listing/editor looks as before (no mobile FAB, no missing search/Website).
- [ ] Mobile listing header: brand + hamburger only; no Website / Search / Sign out in header.
- [ ] Drawer open = one menu; scrim closes it; header does not duplicate drawer actions.
- [ ] Create FAB closed until tap; closes after select / outside / Escape; hidden on desktop + editor.
- [ ] Brand text readable (“ROLCC church” / “article composer”), not single-letter clip.
- [ ] Mobile editor: Back only in topbar; Import/Save/Publish via FAB; no logo/logout.
- [ ] Sort/filter icon-only with working active badges on mobile.
- [ ] Bump `?v=` on `admin.css` / `admin-composer.js` / `index.html` scripts before deploy.

---

## Primary files

| File | Role |
|------|------|
| `admin/index.html` | Shell markup, topbar, drawer |
| `admin/admin.css` | Mobile breakpoints, FAB, header |
| `admin/admin-composer.js` | Drawer, FAB, topbar sync, sort/filter |
| `admin/admin-import.js` | Import modal (editor FAB Import should trigger existing import flow) |

---

## Out of scope

- Public site pages, mega menu, footer
- Changing Decap auth backend
- Desktop redesign

---

## One-line brief

> Fix `/admin` mobile-only: listing header = brand + hamburger; remove Website/Search/Sign out from header into drawer; create FAB closed until tap and hidden on desktop; editor = Back only + Import/Save/Publish FAB, no logo/logout; sort/filter icon-only with active badges. Do not change desktop.
