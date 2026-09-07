// 高德搜索插件 - server entry
// 文档依据:
// - TREK Plugin-Development wiki: https://github.com/liketrek/TREK/wiki/Plugin-Development
// - trek-plugin-sdk manifest.ts (权限/校验规则)
// - 高德 Web服务API 搜索文档: https://lbs.amap.com/api/webservice/guide/api/search
const { definePlugin } = require('trek-plugin-sdk')

// ===== GCJ-02 ↔ WGS-84 坐标转换（eviltransform 算法，精度 ~1-2m） =====
// 高德返回 GCJ-02（火星坐标），TREK 地图用 WGS-84，直接存储会偏移数百米
const PI = Math.PI
const A = 6378245.0
const EE = 0.00669342162296594323

function outOfChina(lat, lng) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}
function transformLat(x, y) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0
  return ret
}
function transformLng(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0
  return ret
}
// WGS-84 → GCJ-02
function wgs84ToGcj02(lng, lat) {
  if (outOfChina(lat, lng)) return { lng, lat }
  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = lat / 180.0 * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI)
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI)
  return { lng: lng + dLng, lat: lat + dLat }
}
// GCJ-02 → WGS-84
function gcj02ToWgs84(lng, lat) {
  if (outOfChina(lat, lng)) return { lng, lat }
  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = lat / 180.0 * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI)
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI)
  return { lng: lng - dLng, lat: lat - dLat }
}

// ===== 城市名列表（标题/地址匹配用，覆盖主要城市） =====
const CITY_NAMES = [
  '北京','上海','天津','重庆',
  '广州','深圳','珠海','汕头','佛山','韶关','湛江','肇庆','江门','茂名','惠州','梅州','汕尾','河源','阳江','清远','东莞','中山','潮州','揭阳','云浮',
  '南京','无锡','徐州','常州','苏州','南通','连云港','淮安','盐城','扬州','镇江','泰州','宿迁',
  '杭州','宁波','温州','嘉兴','湖州','绍兴','金华','衢州','舟山','台州','丽水',
  '福州','厦门','莆田','三明','泉州','漳州','南平','龙岩','宁德',
  '济南','青岛','淄博','枣庄','东营','烟台','潍坊','济宁','泰安','威海','日照','临沂','德州','聊城','滨州','菏泽',
  '郑州','开封','洛阳','平顶山','安阳','鹤壁','新乡','焦作','濮阳','许昌','漯河','三门峡','南阳','商丘','信阳','周口','驻马店',
  '武汉','黄石','十堰','宜昌','襄阳','鄂州','荆门','孝感','荆州','黄冈','咸宁','随州',
  '长沙','株洲','湘潭','衡阳','邵阳','岳阳','常德','张家界','益阳','郴州','永州','怀化','娄底',
  '成都','自贡','攀枝花','泸州','德阳','绵阳','广元','遂宁','内江','乐山','南充','眉山','宜宾','广安','达州','雅安','巴中','资阳',
  '贵阳','六盘水','遵义','安顺','毕节','铜仁',
  '昆明','曲靖','玉溪','保山','昭通','丽江','普洱','临沧',
  '拉萨','日喀则','昌都','林芝','山南','那曲','阿里',
  '西安','铜川','宝鸡','咸阳','渭南','延安','汉中','榆林','安康','商洛',
  '兰州','嘉峪关','金昌','白银','天水','武威','张掖','平凉','酒泉','庆阳','定西','陇南',
  '西宁','海东','海北','黄南','海南州','果洛','玉树','海西',
  '银川','石嘴山','吴忠','固原','中卫',
  '乌鲁木齐','克拉玛依','吐鲁番','哈密','昌吉','博尔塔拉','巴音郭楞','阿克苏','喀什','和田','伊犁','塔城','阿勒泰',
  '石家庄','唐山','秦皇岛','邯郸','邢台','保定','张家口','承德','沧州','廊坊','衡水',
  '太原','大同','阳泉','长治','晋城','朔州','晋中','运城','忻州','临汾','吕梁',
  '呼和浩特','包头','乌海','赤峰','通辽','鄂尔多斯','呼伦贝尔','巴彦淖尔','乌兰察布',
  '沈阳','大连','鞍山','抚顺','本溪','丹东','锦州','营口','阜新','辽阳','盘锦','铁岭','朝阳','葫芦岛',
  '长春','吉林','四平','辽源','通化','白山','松原','白城','延边',
  '哈尔滨','齐齐哈尔','鸡西','鹤岗','双鸭山','大庆','伊春','佳木斯','七台河','牡丹江','黑河','绥化','大兴安岭',
  '海口','三亚','三沙','儋州',
  '南宁','柳州','桂林','梧州','北海','防城港','钦州','贵港','玉林','百色','贺州','河池','来宾','崇左',
  '南昌','景德镇','萍乡','九江','新余','鹰潭','赣州','吉安','宜春','抚州','上饶',
  '合肥','芜湖','蚌埠','淮南','马鞍山','淮北','铜陵','安庆','黄山','滁州','阜阳','宿州','六安','亳州','池州','宣城',
]

// 从文本中匹配城市名（先精确“XX市”，再宽匹配）
function matchCity(text) {
  if (!text) return null
  for (const c of CITY_NAMES) {
    if (text.includes(c + '市')) return c
  }
  for (const c of CITY_NAMES) {
    if (text.includes(c)) return c
  }
  return null
}

// 用高德逆地理反查城市（地点坐标→城市名）
async function regeoCity(lng, lat, ctx) {
  const key = await ctx.settings.get('amap_key')
  if (!key) return null
  try {
    // 存储坐标按 WGS-84 处理，转回 GCJ-02 再查高德（高德用火星坐标）
    const gcj = wgs84ToGcj02(Number(lng), Number(lat))
    const url = `https://restapi.amap.com/v3/geocode/regeo?location=${gcj.lng},${gcj.lat}&key=${key}`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    const d = await res.json()
    if (String(d.status) !== '1' || !d.regeocode) return null
    const ac = d.regeocode.addressComponent || {}
    let city = Array.isArray(ac.city) ? (ac.city[0] || '') : (ac.city || '')
    if (!city && ac.province) city = ac.province  // 直辖市 city 为空，用省
    return city || null
  } catch {
    return null
  }
}

// ===== 分类映射（高德 type/typecode → TREK 分类【名称】） =====
// ⚠️ 设计要点：只返回分类名称，不返回 id！
// 用户的 TREK 分类列表是自定义的（可改名/增删/重建），硬编码 id 会因列表变化而失效。
// 调用方必须用 ctx.categories.list() 按名称动态解析出真实 id（见 resolveCategoryId）。

// 语义分类 → 别名表（中英文 + 口语叫法，匹配用户自定义分类名时按别名展开）
const CATEGORY_ALIASES = {
  '餐厅': ['餐厅', '美食', '吃的', '餐饮', '饭馆', 'restaurant', 'canteen', 'dining', 'food', 'eat', 'eatery'],
  '酒吧/咖啡': ['酒吧', '咖啡', '茶', '饮品', 'bar', 'cafe', 'coffee', 'tea', 'drink'],
  '酒店': ['酒店', '住宿', '宾馆', '旅馆', '民宿', 'hotel', 'inn', 'lodge', 'stay', 'accommodation'],
  '景点': ['景点', '景区', '风景', '名胜', '公园', '游玩', 'attraction', 'sight', 'scenic', 'sightseeing', 'tourist'],
  '购物': ['购物', '商场', '超市', '市场', 'shopping', 'mall', 'market', 'store'],
  '交通': ['交通', '地铁', '公交', '机场', '车站', '码头', 'transport', 'station', 'airport', 'transit'],
  '活动': ['活动', '娱乐', '体育', '休闲', '运动', 'activity', 'entertainment', 'sport', 'fun'],
  '沙滩': ['沙滩', '海滩', '海滨', 'beach', 'seaside'],
  '自然': ['自然', '山', '森林', '湖泊', '河流', '瀑布', 'nature', 'mountain', 'forest', 'lake', 'outdoor'],
  '其他': ['其他', '其它', 'other', 'misc', 'miscellaneous'],
}

function matchCategory(type, typecode, name) {
  // v1.3.31: 名称信号优先——高德 type 可能把餐饮标成购物/其他（如“百益桑拿鸡大良店” type=购物服务）
  // 但 POI 名称含明显餐饮特征词时，用户意图就是“吃”，优先归入餐厅语义
  const n = (name || '').toLowerCase()
  const FOOD_NAME_HINTS = ['桑拿鸡', '餐厅', '食府', '饭馆', '饭店', '酒楼', '火锅', '烧烤', '菜馆', '食堂', '面馆', '小吃', '茶餐厅', '料理', 'restaurant', 'canteen', '餐']
  if (n && FOOD_NAME_HINTS.some(h => n.includes(h))) {
    // 咖啡/酒吧仍单独判断（名称含咖啡/酒吧 → 酒吧/咖啡）
    if (n.includes('咖啡') || n.includes('酒吧') || n.includes('茶')) {
      return '酒吧/咖啡'
    }
    return '餐厅'
  }
  if (!type && !typecode) return null
  const t = (type || '').toLowerCase()
  const tc = (typecode || '').substring(0, 2)  // typecode 前两位是大类

  // 餐饮类 → 餐厅 或 酒吧/咖啡
  if (t.includes('餐饮') || tc === '05') {
    if (t.includes('咖啡') || t.includes('酒吧') || t.includes('茶')) {
      return '酒吧/咖啡'
    }
    return '餐厅'
  }
  // 咖啡单独判断
  if (t.includes('咖啡')) return '酒吧/咖啡'

  // 住宿类 → 酒店
  if (t.includes('住宿') || t.includes('酒店') || t.includes('宾馆') || t.includes('旅馆') || t.includes('民宿') || tc === '10') {
    return '酒店'
  }

  // 风景名胜/景点类 → 景点（优先）或 Attraction
  if (t.includes('风景名胜') || t.includes('公园') || t.includes('广场') || t.includes('名胜') || t.includes('景点') || t.includes('旅游景点') || tc === '11') {
    return '景点'
  }
  // 科教文化类 → 景点（博物馆、展馆等）
  if (t.includes('科教文化') || t.includes('博物馆') || t.includes('展馆') || t.includes('图书馆') || t.includes('文化宫')) {
    return '景点'
  }

  // 购物类 → 购物
  if (t.includes('购物') || t.includes('商场') || t.includes('超市') || t.includes('市场') || t.includes('专卖') || tc === '06') {
    return '购物'
  }

  // 交通类 → 交通
  if (t.includes('交通') || t.includes('地铁') || t.includes('公交') || t.includes('机场') || t.includes('火车站') || t.includes('汽车站') || t.includes('码头') || tc === '15') {
    return '交通'
  }

  // 体育/娱乐/活动类 → 活动
  if (t.includes('体育') || t.includes('娱乐') || t.includes('休闲') || t.includes('运动场馆') || t.includes('ktv') || t.includes('电影院') || t.includes('剧院') || tc.startsWith('07') || tc.startsWith('08')) {
    return '活动'
  }

  // 沙滩类 → 沙滩
  if (t.includes('沙滩') || t.includes('海滩') || t.includes('海湾') || t.includes('海滨')) {
    return '沙滩'
  }

  // 自然类 → 自然
  if (t.includes('自然') || t.includes('山') || t.includes('森林') || t.includes('湖泊') || t.includes('河流') || t.includes('瀑布') || t.includes('自然保护区')) {
    return '自然'
  }

  // 其他 → 其他
  return '其他'
}

// 按名称在用户的真实分类列表里解析 id（语义名精确优先 → 别名展开 → 模糊包含兜底）
function resolveCategoryId(categories, name) {
  if (!categories || !name) return null
  const list = Array.isArray(categories) ? categories : (categories.categories || [])
  // 1) 语义名本身精确匹配（最高优先：用户分类就叫“景点”，应优先于别名“Attraction”)
  let hit = list.find(c => c && c.name && String(c.name).trim() === name)
  if (hit) return hit.id
  // 2) 别名展开精确匹配（用户分类名 == 任一别名，大小写不敏感）
  const aliases = (CATEGORY_ALIASES[name] || [name]).map(a => String(a).toLowerCase())
  hit = list.find(c => c && c.name && aliases.includes(String(c.name).trim().toLowerCase()))
  if (hit) return hit.id
  // 3) 模糊包含匹配（用户可能改名，如“美食餐厅”含“餐厅”/“restaurant”)
  hit = list.find(c => {
    if (!c || !c.name) return false
    const cn = String(c.name).trim().toLowerCase()
    return aliases.some(a => cn.includes(a) || a.includes(cn))
  })
  return hit ? hit.id : null
}

// 识别行程城市（三级推断：标题→坐标 regeo→地址解析，供 /trip-city 与 /coord-scan 复用）
async function detectTripCity(tripId, ctx) {
  let trips = []
  try { trips = await ctx.trips.listMine() } catch {}
  const trip = (trips || []).find(t => String(t.id) === String(tripId))
  if (trip && trip.title) {
    const c = matchCity(trip.title)
    if (c) return { city: c, source: 'title' }
  }
  const places = await ctx.trips.getPlaces(Number(tripId))
  const anchor = (places || []).find(p =>
    Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
  )
  if (anchor) {
    const city = await regeoCity(anchor.lng, anchor.lat, ctx)
    if (city) return { city, source: 'regeo' }
  }
  const addrAnchor = (places || []).find(p => p.address)
  if (addrAnchor && addrAnchor.address) {
    const c = matchCity(addrAnchor.address)
    if (c) return { city: c, source: 'address' }
  }
  return { city: null, source: null }
}

// ===== 存量坐标修复（v1.4.0）=====
// 设计来源：chondaen12 的 fork（MIT）——两段式「扫描预览 → 用户确认写入」，
// 修复装插件前已添加/导入的存量地点坐标（GCJ-02 偏移或缺失）。

// 两点距离（米，Haversine）——供坐标修复对比新旧坐标偏移量
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// 取地点名中最长的中文片段——高德库以中文为主，中英混排/音译名直接搜命中率低，
// 没有中文片段（纯英文名）时才退回用完整 place.name 搜索
function extractChineseName(name) {
  const matches = String(name || '').match(/[\u4e00-\u9fff]+/g)
  if (!matches || !matches.length) return null
  return matches.reduce((a, b) => (b.length > a.length ? b : a))
}

// 用地点名重新搜索高德，判断该地点坐标是否需要修复（供 /coord-scan 分批调用）
// 返回 null 表示该地点无需提醒（搜不到 / 无坐标结果 / 新旧坐标相差 <=50m）
// 重名地点（连锁店、同名景点分布在不同城市/城区）纯关键字搜索经常把结果排到别的分店，
// "修复坐标"却把地点换到了不相关的地方。已有旧坐标时改用"周边搜索"（围绕旧坐标按距离排序），
// 并在候选列表里优先挑名称对得上的那条，而不是盲目相信排第一的结果
// proximityRadius: 围绕旧坐标搜索的半径（米）；传 0/false 关闭周边搜索、始终用关键字搜索
async function scanPlaceCoord(place, key, city, proximityRadius) {
  const hasOld = Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng))
  const useProximity = hasOld && proximityRadius > 0
  const keywords = extractChineseName(place.name) || place.name
  let data
  try {
    if (useProximity) {
      const gcj = wgs84ToGcj02(Number(place.lng), Number(place.lat))
      const params = new URLSearchParams({
        key,
        keywords,
        location: `${gcj.lng},${gcj.lat}`,
        radius: String(proximityRadius),
        sortrule: 'distance',
        offset: '10',
        page: '1',
      })
      const res = await fetch(`https://restapi.amap.com/v3/place/around?${params}`, { signal: AbortSignal.timeout(4000) })
      data = await res.json()
    } else {
      const params = new URLSearchParams({ key, keywords, offset: '10', page: '1' })
      if (city) params.set('city', city)
      const res = await fetch(`https://restapi.amap.com/v3/place/text?${params}`, { signal: AbortSignal.timeout(4000) })
      data = await res.json()
    }
  } catch {
    return null
  }
  if (String(data.status) !== '1' || !data.pois || !data.pois.length) return null
  // 候选列表按名称匹配优先排序（around 按距离排、text 按相关度排，两者都可能把重名的别处结果排最前）
  const candidate = data.pois.find(p => p.name === place.name)
    || data.pois.find(p => p.name && (p.name.includes(place.name) || place.name.includes(p.name)))
    || data.pois[0]
  const [gLng, gLat] = String(candidate.location || '').split(',').map(Number)
  if (!Number.isFinite(gLng) || !Number.isFinite(gLat)) return null
  const wgs = gcj02ToWgs84(gLng, gLat)

  const distanceM = hasOld
    ? Math.round(distanceMeters(Number(place.lat), Number(place.lng), wgs.lat, wgs.lng))
    : null
  // 无旧坐标，或新旧坐标相差 >50m 才值得提醒；候选名与原名完全一致时置信度更高
  if (hasOld && distanceM <= 50) return null
  const nameMatch = candidate.name === place.name
    ? 'exact'
    : (candidate.name && (candidate.name.includes(place.name) || place.name.includes(candidate.name)) ? 'partial' : 'low')

  return {
    id: place.id,
    name: place.name,
    oldLat: hasOld ? Number(place.lat) : null,
    oldLng: hasOld ? Number(place.lng) : null,
    newLat: wgs.lat,
    newLng: wgs.lng,
    distanceM,
    candidateName: candidate.name,
    candidateAddress: candidate.address || '',
    nameMatch,
  }
}


module.exports = definePlugin({
  async onLoad(ctx) {
    ctx.log.info('amap-search loaded')
  },

  async onUnload(ctx) {
    ctx.log.info('amap-search unloaded')
  },

  routes: [
    // 检测当前用户是否已配置高德 Key（client 据此显隐引导语）
    {
      method: 'GET',
      path: '/key-status',
      auth: true,
      async handler(req, ctx) {
        const key = await ctx.settings.get('amap_key')
        return json({ ok: true, hasKey: !!key })
      },
    },

    // 高德 POI 搜索（v1.2: 支持分页）
    // GET /api/plugins/amap-search/search?q=关键词&city=城市&page=页码&tripId=可选
    {
      method: 'GET',
      path: '/search',
      auth: true,
      async handler(req, ctx) {
        const q = (req.query && req.query.q || '').trim()
        const city = (req.query && req.query.city || '').trim()
        const page = Math.max(1, parseInt(req.query && req.query.page, 10) || 1)
        if (!q) {
          return json({ ok: false, error: '请输入搜索关键词' })
        }
        const key = await ctx.settings.get('amap_key')
        if (!key) {
          return json({ ok: false, error: '请先在 设置→插件→高德搜索 里填写高德 Web 服务 Key' })
        }
        const params = new URLSearchParams({
          key,
          keywords: q,
          offset: '10',
          page: String(page),
          extensions: 'all',
        })
        if (city) params.set('city', city)
        const url = `https://restapi.amap.com/v3/place/text?${params}`
        ctx.log.info(`[amap] GET ${url.replace(key, '***')}`)
        let data
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
          data = await res.json()
        } catch (e) {
          return json({ ok: false, error: `高德请求失败: ${e.message}` })
        }
        if (String(data.status) !== '1') {
          return json({ ok: false, error: `高德返回错误: ${data.info || data.infocode}` })
        }
        const pois = (data.pois || []).map(p => {
          // 坐标转换：高德返回 GCJ-02，转成 WGS-84 供 TREK 存储/显示（否则偏移数百米）
          // 同时保留原始 GCJ-02（gcj_location）供高德地图链接使用（高德链接需火星坐标）
          let location = p.location || ''
          let gcj_location = p.location || ''
          const [lng, lat] = String(p.location || '').split(',').map(Number)
          if (Number.isFinite(lng) && Number.isFinite(lat)) {
            const wgs = gcj02ToWgs84(lng, lat)
            location = `${wgs.lng.toFixed(6)},${wgs.lat.toFixed(6)}`
          }
          return {
            id: p.id,
            name: p.name,
            type: p.type,
            address: p.address || '',
            location,                       // WGS-84（存 TREK 用）
            gcj_location,                   // GCJ-02（高德链接用）
            tel: Array.isArray(p.tel) ? (p.tel[0] || '') : (p.tel || ''),
            pname: p.pname || '',
            cityname: p.cityname || '',
            adname: p.adname || '',
            // v1.1 扩展字段（extensions=all 实测全有）
            keytag: p.keytag || '',
            typecode: p.typecode || '',
            entr_location: p.entr_location || '',
            business_area: p.business_area || '',
            website: p.website || '',
            rating: (p.biz_ext && p.biz_ext.rating) || '',
            cost: (p.biz_ext && p.biz_ext.cost) || '',
            opentime: (p.biz_ext && (p.biz_ext.opentime2 || p.biz_ext.open_time)) || '',
            photos: (p.photos || []).map(ph => ph.url).filter(Boolean).slice(0, 3),
          }
        })
        return json({ ok: true, count: data.count, page, pois })
      },
    },

    // 行程已有地点列表（v1.2: 添加状态持久化——前端按名称匹配标记"已在行程"）
    // GET /api/plugins/amap-search/trip-places?tripId=123
    {
      method: 'GET',
      path: '/trip-places',
      auth: true,
      async handler(req, ctx) {
        const tripId = req.query && req.query.tripId
        if (!tripId) {
          return json({ ok: false, error: '缺少 tripId' })
        }
        try {
          const places = await ctx.trips.getPlaces(Number(tripId))
          return json({
            ok: true,
            places: (places || [])
              .filter(p => p && p.name)
              .map(p => ({ name: p.name, lat: p.lat, lng: p.lng })),
          })
        } catch (e) {
          return json({ ok: false, error: `读取行程地点失败: ${e.message}` })
        }
      },
    },

    // 行程地点锚点（供客户端距离排序）：返回行程内第一个有坐标的地点
    // GET /api/plugins/amap-search/trip-anchor?tripId=123
    {
      method: 'GET',
      path: '/trip-anchor',
      auth: true,
      async handler(req, ctx) {
        const tripId = req.query && req.query.tripId
        if (!tripId) {
          return json({ ok: false, error: '缺少 tripId' })
        }
        try {
          const places = await ctx.trips.getPlaces(Number(tripId))
          const anchor = (places || []).find(p =>
            Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
          )
          return json({
            ok: true,
            anchor: anchor ? { name: anchor.name, lat: Number(anchor.lat), lng: Number(anchor.lng) } : null,
          })
        } catch (e) {
          return json({ ok: false, error: `读取行程地点失败: ${e.message}` })
        }
      },
    },

    // TREK 分类列表（供前端下拉选择）
    // GET /api/plugins/amap-search/categories
    {
      method: 'GET',
      path: '/categories',
      auth: true,
      async handler(req, ctx) {
        try {
          const categories = await ctx.categories.list()
          return json({ ok: true, categories: categories || [] })
        } catch (e) {
          return json({ ok: false, error: `读取分类失败: ${e.message}` })
        }
      },
    },

    // 识别行程城市（三级推断）：标题匹配 → 地点坐标 regeo → 地址解析
    // GET /api/plugins/amap-search/trip-city?tripId=123
    {
      method: 'GET',
      path: '/trip-city',
      auth: true,
      async handler(req, ctx) {
        const tripId = req.query && req.query.tripId
        if (!tripId) {
          return json({ ok: false, error: '缺少 tripId' })
        }
        try {
          const { city, source } = await detectTripCity(tripId, ctx)
          return json({ ok: true, city, source })
        } catch (e) {
          return json({ ok: false, error: `识别城市失败: ${e.message}` })
        }
      },
    },

    // 坐标体检（v1.4.0）：用地点名重新搜索高德，比对现有坐标与搜索结果换算出的 WGS-84 坐标
    // 只返回偏移明显（或原本缺坐标）的地点，交由前端预览确认后再调用 /coord-fix 写入
    // 按 offset 分批扫描 + 批内并发（并发数由设置 coord_scan_concurrency 决定，服务端夹紧 1-5），
    // 避免一次请求扫全部地点在行程多时超过客户端超时窗口
    // 城市只在第一批（offset=0）探测一次，后续批次由前端把第一批返回的 city 原样带回
    // GET /api/plugins/amap-search/coord-scan?tripId=123&offset=0[&city=广州]
    {
      method: 'GET',
      path: '/coord-scan',
      auth: true,
      async handler(req, ctx) {
        const tripId = req.query && req.query.tripId
        if (!tripId) {
          return json({ ok: false, error: '缺少 tripId' })
        }
        const offset = Math.max(0, parseInt(req.query && req.query.offset, 10) || 0)
        const concurrency = Math.min(5, Math.max(1, parseInt(await ctx.settings.get('coord_scan_concurrency'), 10) || 3))
        // 已有坐标时是否改用"周边搜索"（而非纯关键字搜索），以及周边搜索的半径——可在设置里调整
        const proximityEnabled = (await ctx.settings.get('coord_scan_proximity')) !== 'off'
        const proximityRadius = proximityEnabled
          ? Math.min(20000, Math.max(200, parseInt(await ctx.settings.get('coord_scan_radius'), 10) || 5000))
          : 0
        const key = await ctx.settings.get('amap_key')
        if (!key) {
          return json({ ok: false, error: '请先在 设置→插件→高德搜索 里填写高德 Web 服务 Key' })
        }
        let places
        try {
          places = await ctx.trips.getPlaces(Number(tripId))
        } catch (e) {
          return json({ ok: false, error: `读取行程地点失败: ${e.message}` })
        }
        places = (places || []).filter(p => p && p.name)
        let city = null
        if ('city' in (req.query || {})) {
          city = req.query.city || null
        } else {
          try { city = (await detectTripCity(tripId, ctx)).city } catch {}
        }

        const batch = places.slice(offset, offset + concurrency)
        const hits = await Promise.all(batch.map(place => scanPlaceCoord(place, key, city, proximityRadius)))
        const results = hits.filter(Boolean)
        const nextOffset = offset + concurrency < places.length ? offset + concurrency : null
        return json({ ok: true, city, total: places.length, offset, nextOffset, results })
      },
    },

    // 按 /coord-scan 给出的预览结果，写入用户确认要修复的坐标
    // POST /api/plugins/amap-search/coord-fix  body: { tripId, fixes: [{ id, lat, lng }] }
    {
      method: 'POST',
      path: '/coord-fix',
      auth: true,
      async handler(req, ctx) {
        const tripId = req.body && req.body.tripId
        const fixes = req.body && req.body.fixes
        if (!tripId || !Array.isArray(fixes) || !fixes.length) {
          return json({ ok: false, error: '缺少 tripId 或 fixes' })
        }
        let updated = 0
        const errors = []
        for (const fix of fixes) {
          const lat = Number(fix && fix.lat)
          const lng = Number(fix && fix.lng)
          if (!fix || !fix.id || !Number.isFinite(lat) || !Number.isFinite(lng)) {
            errors.push({ id: fix && fix.id, error: '无效的修复条目' })
            continue
          }
          try {
            await ctx.places.update(tripId, fix.id, { lat, lng })
            updated++
          } catch (e) {
            errors.push({ id: fix.id, error: e.message })
          }
        }
        return json({ ok: true, updated, errors })
      },
    },

    // 把 POI 写入行程
    // POST /api/plugins/amap-search/add  body: { tripId, place: { name, address, location, type, typecode }, category_id?: number }
    {
      method: 'POST',
      path: '/add',
      auth: true,
      async handler(req, ctx) {
        const tripId = req.body && req.body.tripId
        const place = req.body && req.body.place
        if (!tripId || !place || !place.name) {
          return json({ ok: false, error: '缺少 tripId 或 place' })
        }
        const [lng, lat] = String(place.location || '').split(',').map(Number)  // WGS-84，存 TREK 用
        const [gLng, gLat] = String(place.gcj_location || place.location || '').split(',').map(Number)  // GCJ-02，高德链接用
        // 自动生成高德地图链接（POI id 直链优先；marker 需 GCJ-02 坐标）
        const amapLink = place.id
          ? `https://www.amap.com/place/${place.id}`
          : (Number.isFinite(gLng) && Number.isFinite(gLat)
              ? `https://uri.amap.com/marker?position=${gLng},${gLat}&name=${encodeURIComponent(place.name)}`
              : undefined)
        // 分类处理：前端传 category_id 则用前端值，否则按名称自动匹配（动态解析 id）
        let categoryId = req.body && req.body.category_id
        if (categoryId === undefined || categoryId === null || categoryId === '') {
          // v1.3.30: 不再硬编码 id——matchCategory 返回分类名，再从用户真实分类列表解析 id
          try {
            const cats = await ctx.categories.list()
            const catName = matchCategory(place.type, place.typecode, place.name)
            categoryId = resolveCategoryId(cats, catName)
          } catch (e) {
            ctx.log.warn(`[amap] 分类解析失败，使用默认分类: ${e.message}`)
            categoryId = null
          }
        }
        try {
          const notes = place.tel ? `📞 电话：${place.tel}` : undefined
          const placeData = {
            name: place.name,
            description: place.type || '',
            address: place.address || '',
            lat: Number.isFinite(lat) ? lat : undefined,
            lng: Number.isFinite(lng) ? lng : undefined,
            website: amapLink,
            notes,
          }
          // 只有成功匹配到分类才传 category_id，否则让 TREK 用默认
          if (categoryId && Number.isFinite(Number(categoryId))) {
            placeData.category_id = Number(categoryId)
          }
          const created = await ctx.places.create(tripId, placeData)
          return json({ ok: true, place: created })
        } catch (e) {
          return json({ ok: false, error: `写入失败: ${e.message}` })
        }
      },
    },

    // 列出可访问行程
    // GET /api/plugins/amap-search/trips
    {
      method: 'GET',
      path: '/trips',
      auth: true,
      async handler(req, ctx) {
        try {
          const trips = await ctx.trips.listMine()
          const list = (trips || []).map(t => ({
            id: t.id,
            title: t.title,
            start_date: t.start_date,
            end_date: t.end_date,
          }))
          return json({ ok: true, trips: list })
        } catch (e) {
          return json({ ok: false, error: `读取行程失败: ${e.message}` })
        }
      },
    },
  ],
})

function json(obj) {
  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(obj),
  }
}
