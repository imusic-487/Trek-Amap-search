# Changelog

Full version history for 找地方 (amap-search). Short version lives in [README.en.md](./README.en.md#changelog).

### v1.4.0 (2026-09-07) — Batch coord repair + category auto-matching

**🛠️ Batch coordinate repair (headline feature)**
- Places added/imported before the plugin was installed may sit ~500m off (no GCJ-02→WGS-84 conversion at the time) or have no coords at all
- New "Fix coordinates": scan all places in a trip → verify each against Amap → **preview candidates** (new coords / offset meters / name-match level) → check & batch-write
- Anti-mismatch: when old coords exist, defaults to **searching around the original coordinates** (prevents a same-name chain store / same-name place in another district from being matched); radius & concurrency are configurable
- Places within ≤50m are skipped quietly; Amap no-result / API failure skips safely
- 3 new user settings: scan concurrency (1-5, default 3), proximity-search toggle, search radius (default 5000m)

**🏷️ Category auto-matching (v1.3.30-32, first released in this version)**
- v1.3.30: adding a POI auto-matches a TREK category — Amap type/typecode maps to a semantic category (Restaurants / Bar-Coffee / Hotels / Sights / Shopping / Transport / Activities / Beaches / Nature / Other), then the category **name** is resolved against your real category list for a dynamic id (your categories can be renamed/added/removed — no more hardcoded-id breakage)
- v1.3.31: name signals win — Amap may tag food places as "shopping/other" (e.g. "百益桑拿鸡大良店"), so a POI whose name contains food hints is filed under Restaurants by user intent; also fixed the category dropdown being covered by the next card (host select overlay z-index)
- v1.3.32: version wrap-up

### v1.3.29 (2026-08-16) — Key step added to first-open guide
- Users said the 3-step guide didn't say where to get/enter the key: the guide now opens with a highlighted 🔑 block — **TREK Settings → Plugins → 找地方 → enter your Amap Web Service key**, with the free console.amap.com signup link (choose "Web Service" type)
- Why: new users were stuck at step 0 (no key = can't search) while the guide only covered search→add; the key hint lived at the page bottom where nobody looks. Now the loop is closed.

### v1.3.28 (2026-08-16) — Renamed to 找地方
- Display name (trip tab & store card) changed from 高德搜索 to **找地方**, matching the README title and the store description's "Find Places tab" guidance. The id `amap-search` is unchanged — display name only.
- Why: the store description already told users to look for a "找地方" tab, but the plugin was still named 高德搜索 — users couldn't find it. Rename closes the loop.

### v1.3.27 (2026-08-15) — First-open 3-step guide
- Users reported not knowing how to use it after install: the initial empty state now shows a "3 steps to get started" guide (1. open a trip → the "Find Places" tab → 2. type a keyword & search → 3. copy details or add to trip), auto-covered once you search
- Complements the key hint (v1.3.25): that answers "no key yet?", this answers "where do I even start?" — first-run loop closed

### v1.3.26 (2026-08-14) — Unified 40px search row
- Host `.trek-input` has no fixed height (~36px) vs the 40px button → `.search-row .trek-input, .search-row .trek-btn { height: 40px }` aligns all three controls (web + mobile)

### v1.3.25 (2026-08-14) — Correctness batch (qwen3.8-max UX review)
- **loadMore uses a `lastQuery` snapshot** — editing the keyword without searching no longer mixes queries when paging
- **Empty-state copy fixed** (now keyed on `filterActive`, not the city value)
- **Pager hidden inside `showEmptyState()`** — no more "loaded 20/50 + load more" under a "no results" screen after filtering
- Rating color `#f59e0b` → **`#d97706`** (amber-600, contrast 2.1→3.3:1 on light theme)
- aria-labels on desktop icon buttons (synced across loading/done states), real link on the key hint, Enter submits from the city field
- `esc()` HTML escaping on all POI fields, 16px more-button loader (no height jump), removed dead `.poi-meta` CSS

### v1.3.24 (2026-08-14) — Lucide icons for info rows
- 📍/☎/🕐 → **map-pin / phone-call / clock-arrow-right** (official lucide paths), unified 14px via `.poi-info-icon svg`

### v1.3.23 (2026-08-14) — Hide ✨ auto-tag on mobile
- In the 100px city box the tag collided with the search button → hidden on mobile (the detected city is visible in the input anyway)

### v1.3.22 (2026-08-14) — Fix literal `${ICON_SEARCH}` in the button
- Static HTML doesn't evaluate JS template syntax → inlined the lucide search SVG (lesson: no `${}` in static HTML, only inside `<script>`)

### v1.3.21 (2026-08-14) — Global icon+label search button
- Mobile no longer hides the button label — same 🔍+搜索 on both ends

### v1.3.20 (2026-08-14) — One-line mobile search row
- Icon search button + 100px city field + flex:1 keyword → three stacked rows (~120px) became one (~40px)

### v1.3.19 (2026-08-14) — Desktop action buttons top-aligned
- `justify-content: center → flex-start` so the button column lines up with the name row (rating/cost), fixing the "not level" look

### v1.3.18 (2026-08-14) — 12px rating/cost + full opening hours
- Rating/cost down to 12px secondary; opening hours show first segment + "…N more" to avoid overflow

### v1.3.17 (2026-08-14) — Card info hierarchy (user-approved)
- **Distance removed** (anchor depends on trip places that often don't exist); rating/cost moved to the right of the name row; opening hours on their own line

### v1.3.16 (2026-08-14) — Root fix for the filter dropdown width
- SDK kit `enhanceSelect()` wraps the native select in `.trek-select-wrap` and hides it — the panel (`left:0;right:0`) follows the **wrap**, not the select → `.filter-sort-row .trek-select-wrap { flex:1; min-width:150px }` is the one that works

### v1.3.15 (2026-08-14) — 6 UX improvements
- Guide text under the search box; fixed select widths; trimmed bottom hint; **incremental loadMore** (insertAdjacentHTML) + **event delegation** (bindPoiEvents once); prettier empty state (🔍 + clear-filter / new-keyword / pick-city buttons); retry button on errors

### v1.3.0–v1.3.14 (2026-08-14) — Feature & polish series (see the Chinese README for details)
- v1.3.0 initial UX rework (P0+P1 + city hint) → v1.3.9 feature-logic layer (persistent filters/sort, city ✨ tag, direction labels) → v1.3.10 pager crash fix → v1.3.14 final scrollbar styling (official 6px track + theme-aware colors, full expansion both ends)

### v1.2.0 (2026-08-13)
- Add button now shows icon feedback: spinner loader (lucide `loader` + rotation animation) while adding, check mark (lucide `check`) when added — replacing the plain text "Adding… / ✅ Added"

### v1.1.9 (2026-08-12)
- Fix mobile icon/text baseline alignment in action buttons (SVG sizing/centering was desktop-only)

### v1.1.8 (2026-08-12)
- Button icons switched to inline Lucide SVGs (Copy / Plus), aligned with TREK's design language

### v1.1.7 (2026-08-12)
- Copy icon fix (emoji was ambiguous)

### v1.1.6 (2026-08-12)
- Desktop (≥641px): Copy/Add buttons become a vertical icon column on the card's right edge; mobile keeps side-by-side labeled buttons

### v1.1.5 (2026-08-12)
- Auto city detection (trip title → coordinate reverse-lookup → address parsing)
- GCJ-02 → WGS-84 automatic coordinate conversion (eviltransform), fixing the ~500m map offset

### v1.1.3 / v1.1.4 (2026-08-12)
- Hide distance-sort entry that depends on trip anchor; highlight active sort; inline type tags
- Fix crash on empty tel array from Amap

### v1.1.2 (2026-08-12)
- Fix sort cache bug: empty search results no longer render stale data

### v1.1.1 (2026-08-12)
- Fix crash on multi-session opening hours (opentime2 as array)

### v1.1.0 (2026-08-12)
- Richer cards: thumbnail / type tags / rating / avg cost / opening hours / distance
- Client-side sorting: rating / cost / distance / default
- Mobile layout (<640px)

### v1.0.1 (2026-08-11)
- First registry release

---
MIT — see [LICENSE](./LICENSE).
