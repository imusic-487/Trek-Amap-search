# 🗺️ 找地方 (amap-search)

> Search Amap (Gaode) POIs right inside your TREK trip planner — copy a full address or add a place to the open trip with coordinates, map link and phone, in one tap.
> 在 TREK 行程里直接搜索高德 POI（地点），一键复制地址或添加进当前行程（自动带坐标、地图链接、电话）。

![找地方 / Amap Search — cover](docs/cover.jpg)

## What it does · 功能

**找地方** mounts as a tab **inside the trip planner** (a `trip-page`, TREK 3.4+), always scoped to the trip you are viewing. Search any POI on Amap (China's Gaode Maps), then copy the details or drop the place straight into the trip.

**找地方** 以 **trip-page** 类型挂在行程规划器内部（TREK 3.4+），始终跟随当前打开的行程。搜索高德上的任意地点，然后复制详情或直接写进行程。

- 🗺️ **Amap POI keyword search** · 高德 POI 关键字搜索（可指定城市，不填则全国搜索）
- 📋 **Copy address** · 复制地址：一键复制 名称 / 完整地址（中国·省·市·区·街道）/ 经纬度 / 地图链接 / 类型 / 电话
- ➕ **Add to trip** · 添加进行程：写入当前行程，自动带上：
  - **coordinates** · 坐标（经纬度）
  - **address** · 地址
  - **type → description** · 类型 → 描述
  - **Amap map link → Website field** · 高德地图链接 → 「网站」字段（点击地点卡片的"打开链接"跳转高德）
  - **phone → Notes field** · 电话 → 「备注」字段（另起一行）
- 🔑 **Per-user API key** · 每个用户自己在 **设置 → 插件** 填写高德 Web 服务 Key（加密存储，不进代码）
- 💡 **Smart key hint** · Key 引导语智能显隐：没填 Key 时显示申请引导，填好或搜索成功后自动隐藏

## Screenshots · 截图

![Light theme · 亮色主题](docs/screenshot.png)

![Dark theme · 暗色主题](docs/screenshot-dark.png)

![Light & dark — Bento UI · 亮暗双主题](docs/screenshot-bento-dual.jpg)

The plugin UI follows TREK's light/dark theme automatically.
插件界面自动跟随 TREK 的亮/暗主题。

## Permissions · 权限

TREK shows this list to the admin at activation. 找地方 requests exactly three permissions and only ever talks to Amap's search endpoint.
激活时 TREK 会向管理员展示此列表。本插件只申请三个权限，且仅与高德搜索接口通信。

| Permission · 权限 | Why · 用途 |
|---|---|
| `db:read:trips` | Read the current trip context · 读取当前行程上下文 |
| `db:write:places` | Create places in the trip · 在行程中创建地点 |
| `http:outbound:restapi.amap.com` | Call the Amap POI search API (server-side, the only network request) · 调用高德 POI 搜索接口（服务端，唯一网络请求） |

## Setup · 安装配置

### 1. Install · 安装

1. Pack: `npx trek-plugin-sdk pack` → `plugin.zip` · 打包
2. TREK → Admin → Plugins → **Upload** → choose the zip · 上传
3. Activate and approve the permissions · 激活并同意权限

### 2. Get an Amap key (free) · 申请高德 Key（免费）

- Amap open platform · 高德开放平台：[console.amap.com](https://console.amap.com/)
- Register (Alipay / phone) → Console → Application Management → Create app → Add key
  注册（支付宝/手机号即可）→ 控制台 → 应用管理 → 创建新应用 → 添加 Key
- Choose the **Web 服务 (Web Service)** type — *not* Web 端 JS API！
  类型选 **Web 服务**（不是 Web 端 JS API！）
- **Free**: personal-developer quota is 500,000 calls/day · **免费**：个人开发者配额 50 万次/天
- No payment, no real-name verification · 全程不用付费、不用实名认证（个人开发者）

### 3. Use it · 使用

1. Open any trip → the **找地方** tab appears in the planner bar · 打开任意行程 → 顶部 tab 栏出现「找地方」
2. Type a keyword (e.g. 故宫 / 长城 / 西湖) + optional city → Search · 输入关键词 + 城市（可选）→ 搜索
3. **📋 复制地址** → copies full address / coordinates / map link · 复制完整地址 / 经纬度 / 地图链接
4. **➕ 添加进行程** → writes into the open trip · 写入当前行程（坐标 / 地址 / 类型 / 网站链接 / 电话备注一步到位）

### Links · 链接说明

- **Amap map link** is stored in the place's **Website** field automatically — tap "Open link" on the place card to jump to Amap.
  高德地图链接自动存入地点的「网站」字段，点击地点卡片底部的"打开链接"即可跳转至高德地图。
- **Other links** (official site / Xiaohongshu / Douyin…): add them to the place's **Notes**, one per line (links in notes are clickable). Example: `小红书: http://xhslink.cn/xxx`
  其他链接（官网/小红书/抖音等）：编辑该地点的「备注」添加，一行一个（备注里链接可点击）。

## Compatibility · 兼容性

- Requires **TREK >=3.4.0** (`>=3.4.0 <4.0.0`).
- No native modules, no paid API beyond Amap's free tier. · 无原生模块，除高德免费额度外无任何付费 API。

## Support · 支持

- Issues & questions: https://github.com/imusic-487/Trek-Amap-search/issues
- Source & changelog: https://github.com/imusic-487/Trek-Amap-search

## License · 许可

MIT — see [LICENSE](./LICENSE).

<sub>This is a community plugin. It is not maintained or endorsed by the TREK core team. · 社区插件，非 TREK 核心团队维护。</sub>
