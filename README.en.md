# 🗺️ 找地方 (amap-search)

[简体中文](README.md) | English

Search Amap (Gaode) POIs right inside your TREK trip planner — copy a full address or add a place to the open trip with coordinates, map link and phone, in one tap.

![找地方 / Amap Search — cover](docs/cover.jpg)

## What it does

**找地方** mounts as a tab **inside the trip planner** (a `trip-page`, TREK 3.4+), always scoped to the trip you are viewing. Search any POI on Amap — China's Gaode Maps — then copy the details or drop the place straight into the trip.

- 🗺️ **Amap POI keyword search** (optionally scoped to a city; nationwide if empty)
- 📋 **Copy address**: one tap copies name / full address (China · province · city · district · street) / coordinates / map link / type / phone
- ➕ **Add to trip**: writes into the current trip, automatically filling:
  - **coordinates** (lat/lng)
  - **address**
  - **type → description**
  - **Amap map link → Website field** (tap "Open link" on the place card to jump to Amap)
  - **phone → Notes field** (on its own line)
- 🔑 **Per-user API key** (Settings → Plugins, encrypted storage, never in code)
- 💡 **Smart key hint**: shows a sign-up hint when no key is set, auto-hides once a key is saved or a search succeeds

## Traveling in China? This plugin helps.

Planning a trip to China? TREK's built-in search uses OpenStreetMap — great for landmarks, but weak for the small local spots that make a trip special (hidden cafés, food stalls, boutique shops). Amap is China's most detailed map, and this plugin gives you access to it right inside TREK:

- Search Chinese POIs by keyword (try 故宫 / 长城 / 西湖, or any local spot name)
- One tap copies the full address — street, district, city, country — plus coordinates and an Amap map link
- One tap adds the place to your open trip with coordinates, address and map link filled in automatically

The only requirement is an Amap Web Service API key from [console.amap.com](https://console.amap.com/). The personal-developer quota is 500,000 calls/day — you may need a Chinese phone number to register, but once you have a key, searching Chinese places becomes dramatically easier than with OSM alone.

## Relationship to TREK's official China map plans

TREK has open discussions about a China map mode ([#1636](https://github.com/liketrek/TREK/discussions/1636), [#1673](https://github.com/liketrek/TREK/discussions/1673)) aiming to make Amap a built-in place search provider, possibly with Amap tiles and routing. **That proposal is still in discussion — no code yet** — and its core challenge is the coordinate system (GCJ-02 vs WGS-84 conversion is a legal grey area).

This plugin is positioned differently:

- **Pure search enhancement**: it only searches Amap POIs and shows results — no map rendering, no routing, no coordinate conversion, so the coordinate-system issue simply does not apply
- **Ready to use now**: until the official work lands, this plugin is the immediately usable Amap search option for TREK; once it does, its search capability remains complementary
- **Independent**: the plugin does not depend on the official roadmap or its timeline

## Screenshots

![Light theme](docs/screenshot.png)

![Dark theme](docs/screenshot-dark.png)

![Light & dark Bento UI](docs/screenshot-bento-dual.jpg)

The plugin UI follows TREK's light/dark theme automatically.

## Permissions

TREK shows this list to the admin at activation — exactly three permissions, and the only network call is to Amap's search endpoint.

| Permission | Why |
|---|---|
| `db:read:trips` | Read the current trip context |
| `db:write:places` | Create places in the trip |
| `http:outbound:restapi.amap.com` | Call the Amap POI search API (server-side, the only network request) |

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

- Requires **TREK >=3.4.0** (`>=3.4.0 <4.0.0`)
- No native modules, no paid API beyond Amap's API quota (personal-developer: 500,000 calls/day)

## Support

- Issues & questions: <https://github.com/imusic-487/Trek-Amap-search/issues>
- Source & changelog: <https://github.com/imusic-487/Trek-Amap-search>

## License

MIT — see [LICENSE](./LICENSE).

<sub>This is a community plugin, not maintained or endorsed by the TREK core team.</sub>
