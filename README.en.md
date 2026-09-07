# 🗺️ 找地方 (amap-search)

[简体中文](README.md) | English

Search Amap POIs right inside TREK — find restaurants, sights & hidden gems, copy details or add them to your current trip with coordinates, map link & phone in one click.

在 TREK 里直接搜遍高德地图——餐厅、景点、宝藏小店都能找，一键复制详情或添加进当前行程，坐标/地图链接/电话自动带上。

![找地方 / Amap Search — cover](docs/cover.jpg)

## ✨ What's new in v1.4.0

- 🛠️ **Batch coordinate repair**: places added before the plugin existed (coords ~500m off or missing) — scan → preview → confirm & fix in one go, so pins sit exactly right
- 🏷️ **Auto category matching on add**: new POIs are filed under your TREK category automatically from Amap type + name — name signals win (e.g. 百益桑拿鸡, tagged by Amap as "shopping", still lands under Restaurants); keeps working after you rename/add/remove categories
- 🔼 Now compatible with **TREK 4.x** (range widened to `<5.0.0`)

> Full version history: [CHANGELOG.en.md](./CHANGELOG.en.md).

## What it does

**找地方** mounts as a tab **inside the trip planner** (a `trip-page`, TREK 3.4+), always scoped to the trip you are viewing. Search any POI on Amap — China's Gaode Maps — then copy the details or drop the place straight into the trip.

- 🗺️ **Amap POI keyword search** (optionally scoped to a city; auto-detects the trip city, falls back to nationwide)
- 🏙️ **Auto city detection** (v1.1.5): three-tier inference — trip title → first geocoded place reverse-lookup → address parsing
- 📐 **Auto coordinate conversion** (v1.1.5): Amap returns GCJ-02 (Mars coordinates) → auto-converted to WGS-84 on save, so places no longer sit ~500m off on the map
- 📋 **Copy address**: one tap copies name / full address (China · province · city · district · street) / coordinates / map link / type / phone
- ➕ **Add to trip**: writes into the current trip, automatically filling:
  - **coordinates** (lat/lng, already converted to WGS-84)
  - **address**
  - **type → description**
  - **Amap map link → Website field** (tap "Open link" on the place card to jump to Amap)
  - **phone → Notes field** (on its own line)
- 🔀 **Result sorting** (v1.1.0): rating / avg cost / default — pure client-side (distance sort disabled: SDK has no "selected place" event, since v1.3.2; distance removed from cards in v1.3.17)
- 🖥️ **Responsive action buttons** (v1.1.6): on mobile, Copy/Add sit side-by-side with labels; on desktop (≥641px) they stack vertically on the card's right edge as icon-only buttons (Lucide Copy / Plus, with hover tooltips)
- 🔑 **Per-user API key** (Settings → Plugins, encrypted storage, never in code)
- 💡 **Smart key hint**: shows a sign-up hint when no key is set, auto-hides once a key is saved or a search succeeds
- 🏷️ **Auto category matching on add** (v1.3.30): when a POI is added, it's filed under your TREK category automatically based on Amap type + name — name signals win (Amap may tag restaurants as "shopping/other", e.g. "百益桑拿鸡" is filed under Restaurants by name); category names are resolved dynamically, so renaming/adding/removing your categories keeps matching working
- 🛠️ **Batch coordinate repair for existing places** (v1.4.0): one-click scan & fix for places added/imported before the plugin was installed (GCJ-02 offset or missing coords) — preview candidates → confirm → batch write, so map pins stop sitting ~500m off

## Traveling in China? This plugin helps.

Planning a trip to China? TREK's built-in search uses OpenStreetMap — great for landmarks, but weak for the small local spots that make a trip special (hidden cafés, food stalls, boutique shops). Amap is China's most detailed map, and this plugin gives you access to it right inside TREK:

- Search Chinese POIs by keyword (try 故宫 / 长城 / 西湖, or any local spot name)
- One tap copies the full address — street, district, city, country — plus coordinates and an Amap map link
- One tap adds the place to your open trip with coordinates, address and map link filled in automatically

The only requirement is an Amap Web Service API key from [console.amap.com](https://console.amap.com/). The personal-developer quota is 500,000 calls/day — you may need a Chinese phone number to register, but once you have a key, searching Chinese places becomes dramatically easier than with OSM alone.

## Relationship to TREK's official China map plans

TREK has open discussions about a China map mode ([#1636](https://github.com/liketrek/TREK/discussions/1636), [#1673](https://github.com/liketrek/TREK/discussions/1673)) aiming to make Amap a built-in place search provider, possibly with Amap tiles and routing. **That proposal is still in discussion — no code yet** — and its core challenge is the coordinate system (GCJ-02 vs WGS-84 conversion is a legal grey area).

This plugin is positioned differently:

- **Pure search enhancement**: it only searches Amap POIs and shows results — no map rendering, no routing
- **Coordinates handled** (v1.1.5+): the plugin converts GCJ-02 → WGS-84 (eviltransform algorithm) before saving, so places land exactly where they should — no more ~500m offset
- **Ready to use now**: until the official work lands, this plugin is the immediately usable Amap search option for TREK; once it does, its search capability remains complementary
- **Independent**: the plugin does not depend on the official roadmap or its timeline

> ⚠️ **Compliance note**: The coordinate conversion in this plugin only corrects the display offset between Amap's GCJ-02 and OpenStreetMap's WGS-84, so places appear at their true location on the trip map. Please review and comply with the laws and regulations of your jurisdiction before use.

## Screenshots

![Light theme](docs/screenshot.png)

![Dark theme](docs/screenshot-dark.png)

![Light & dark Bento UI](docs/screenshot-bento-dual.jpg)

The plugin UI follows TREK's light/dark theme automatically.

## Permissions

TREK shows this list to the admin at activation — exactly four permissions, and the only network call is to Amap's search endpoint.

| Permission | Why |
|---|---|
| `db:read:trips` | Read the current trip context |
| `db:write:places` | Create places in the trip |
| `db:read:categories` | Read your trip category list — matches categories by name when adding places (your categories can be renamed/added/removed; resolved dynamically by name) |
| `http:outbound:restapi.amap.com` | Call the Amap POI search / coord-repair API (server-side, the only network request) |

## Setup

### 1. Install

1. Pack: `npx trek-plugin-sdk pack` → `plugin.zip`
2. TREK → Admin → Plugins → **Upload** → choose the zip
3. Activate and approve the permissions

### 2. Get an Amap key

- Amap open platform: <https://console.amap.com/>
- Register (Alipay / phone) → Console → Application Management → Create app → Add key
- Choose the **Web 服务 (Web Service)** type — *not* Web 端 JS API!
- Personal-developer quota: 500,000 calls/day — searching places won't come close to using it up

### 3. Use it

1. Open any trip → the **找地方** tab appears in the planner bar
2. Type a keyword (e.g. 故宫 / 长城 / 西湖) + optional city → Search
3. **📋 Copy address** → copies full address / coordinates / map link
4. **➕ Add to trip** → writes into the open trip (coordinates / address / type / website / phone notes in one step)

### Links

- **Amap map link** is stored in the place's **Website** field automatically — tap "Open link" on the place card to jump to Amap.
- **Other links** (official site / Xiaohongshu / Douyin…): add them to the place's **Notes**, one per line (links in notes are clickable). Example: `小红书: http://xhslink.cn/xxx`

## Compatibility

- Requires **TREK >=3.4.0** (`>=3.4.0 <5.0.0`, incl. TREK 4.x)
- No native modules, no paid API beyond Amap's API quota (personal-developer: 500,000 calls/day)

## Support

- Issues & questions: <https://github.com/imusic-487/Trek-Amap-search/issues>
- Source & changelog: <https://github.com/imusic-487/Trek-Amap-search>


## Roadmap

- [ ] Search history (recent 10, tag shortcuts under the input, clear button)
- [ ] "View on Amap" button (card corner → amap.com/place/{id}; QR code on mobile)
- [ ] Copy options (address only / full details / name+address)
- [ ] Distance sort (auto-enable when a trip anchor exists; greyed out + hint otherwise) — blocked on TREK SDK support
- [ ] Batch add (select multiple POIs, add at once)
- [ ] Map preview of results (mini map above the list)
- [ ] Favorites (local persistence + export/import)
- [x] ~~Empty-state copy + retry button + key-hint link~~ (v1.3.15 empty state + retry; v1.3.25 key-hint link)

## Changelog

### v1.4.0 (2026-09-07) — Batch coord repair + category auto-matching

**🛠️ Batch coordinate repair (headline)**
- Places added/imported before the plugin was installed may sit ~500m off (no GCJ-02→WGS-84 conversion at the time) or have no coordinates at all
- New "Fix coordinates": batch-scan all places in the trip → verify each against Amap → **preview candidates** (new coords / offset in meters / name-match level) → check & batch-write
- Anti-mismatch: with old coords it defaults to **searching around the original coordinates** (so a same-name chain store or same-name place in another district is not matched); radius & concurrency are configurable
- Places within ≤50m are skipped quietly; Amap no-result / API failure skips safely
- 3 new user settings: scan concurrency (1-5, default 3), proximity-search toggle, search radius (default 5000m)

**🏷️ Category auto-matching (v1.3.30-32, first shipped in this version)**
- v1.3.30: adding a POI auto-matches a TREK category — Amap type/typecode maps to a semantic category (Restaurants / Bar-Coffee / Hotels / Sights / Shopping / Transport / Activities / Beach / Nature / Other), then the category **name** is resolved against your real category list for a dynamic id (categories can be renamed/added/removed — no hardcoded-id breakage)
- v1.3.31: name signals win — Amap may tag food places as "shopping/other" (e.g. 百益桑拿鸡大良店); if the POI name contains food hints it is filed under Restaurants by user intent; also fixed the category dropdown being covered by the next card (host select overlay z-index)
- v1.3.32: wrap-up

> Full history (v1.0.1 → v1.3.29, incl. early install-test iterations) lives in [CHANGELOG.en.md](./CHANGELOG.en.md).


MIT — see [LICENSE](./LICENSE).

## Credits

- **Batch coordinate repair** (v1.4.0) design draws on [chondaen12/Trek-Amap-search](https://github.com/chondaen12/Trek-Amap-search) (MIT) — the two-phase "scan preview → confirm write" flow comes from the coord-scan implementation in that fork; attribution is kept in the code comments.

<sub>This is a community plugin, not maintained or endorsed by the TREK core team.</sub>
