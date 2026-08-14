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
    const res = await fetch(url)
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
          const res = await fetch(url)
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
          // L1: 行程标题匹配城市名（最快，零网络）
          let trips = []
          try { trips = await ctx.trips.listMine() } catch {}
          const trip = (trips || []).find(t => String(t.id) === String(tripId))
          if (trip && trip.title) {
            const c = matchCity(trip.title)
            if (c) return json({ ok: true, city: c, source: 'title' })
          }
          // L2: 行程第一个有坐标的地点 → 高德逆地理反查城市
          const places = await ctx.trips.getPlaces(Number(tripId))
          const anchor = (places || []).find(p =>
            Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
          )
          if (anchor) {
            const city = await regeoCity(anchor.lng, anchor.lat, ctx)
            if (city) return json({ ok: true, city, source: 'regeo' })
          }
          // L3: 地点地址解析（有 address 无坐标时）
          const addrAnchor = (places || []).find(p => p.address)
          if (addrAnchor && addrAnchor.address) {
            const c = matchCity(addrAnchor.address)
            if (c) return json({ ok: true, city: c, source: 'address' })
          }
          return json({ ok: true, city: null, source: null })
        } catch (e) {
          return json({ ok: false, error: `识别城市失败: ${e.message}` })
        }
      },
    },

    // 把 POI 写入行程
    // POST /api/plugins/amap-search/add  body: { tripId, place: { name, address, location, type } }
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
        try {
          const notes = place.tel ? `📞 电话：${place.tel}` : undefined
          const created = await ctx.places.create(tripId, {
            name: place.name,
            description: place.type || '',
            address: place.address || '',
            lat: Number.isFinite(lat) ? lat : undefined,
            lng: Number.isFinite(lng) ? lng : undefined,
            website: amapLink,
            notes,
          })
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
