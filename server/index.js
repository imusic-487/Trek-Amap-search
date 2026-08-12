// 高德搜索插件 - server entry
// 文档依据:
// - TREK Plugin-Development wiki: https://github.com/liketrek/TREK/wiki/Plugin-Development
// - trek-plugin-sdk manifest.ts (权限/校验规则)
// - 高德 Web服务API 搜索文档: https://lbs.amap.com/api/webservice/guide/api/search
const { definePlugin } = require('trek-plugin-sdk')

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

    // 高德 POI 搜索
    // GET /api/plugins/amap-search/search?q=关键词&city=城市&tripId=可选
    {
      method: 'GET',
      path: '/search',
      auth: true,
      async handler(req, ctx) {
        const q = (req.query && req.query.q || '').trim()
        const city = (req.query && req.query.city || '').trim()
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
        const pois = (data.pois || []).map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          address: p.address || '',
          location: p.location || '',
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
        }))
        return json({ ok: true, count: data.count, pois })
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
          const places = await ctx.places.list(Number(tripId))
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
        const [lng, lat] = String(place.location || '').split(',').map(Number)
        // 自动生成高德地图链接（POI id 直链，2026-08-11 实测可用）
        const amapLink = place.id
          ? `https://www.amap.com/place/${place.id}`
          : (Number.isFinite(lng) && Number.isFinite(lat)
              ? `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(place.name)}`
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
