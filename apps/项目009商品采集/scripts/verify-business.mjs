// 线上业务链路验证脚本（Node，模拟前端真实调用）
// 验证修复后的 OSM 兜底链路：Photon 地理编码 + OSRM 算路 + Photon POI + 逆地理编码
// 用法：node scripts/verify-business.mjs

const PHOTON = 'https://photon.komoot.io/api'
const PHOTON_REVERSE = 'https://photon.komoot.io/reverse'
const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const OSRM = 'https://router.project-osrm.org/route/v1/driving'

const UA = { Accept: 'application/json' }
const log = (...a) => console.log(...a)

async function timed(name, fn) {
  const t0 = Date.now()
  try {
    const r = await fn()
    log(`✅ ${name}  (${Date.now() - t0}ms)`)
    return r
  } catch (e) {
    log(`❌ ${name}  (${Date.now() - t0}ms) -> ${e.message}`)
    return null
  }
}

// ---------- 1. 正向地理编码 ----------
async function geocodePhoton(q) {
  const res = await fetch(`${PHOTON}?q=${encodeURIComponent(q)}&limit=1`, { headers: UA })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const j = await res.json()
  const c = j.features?.[0]?.geometry?.coordinates
  if (!c) throw new Error('无结果')
  return { lat: c[1], lng: c[0] }
}

async function geocodeNominatim(q) {
  const res = await fetch(`${NOMINATIM}?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`, { headers: UA })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const d = await res.json()
  if (!d.length) throw new Error('无结果')
  return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) }
}

// ---------- 2. 逆地理编码 ----------
async function reversePhoton(lat, lng) {
  const res = await fetch(`${PHOTON_REVERSE}?lat=${lat}&lon=${lng}`, { headers: UA })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const j = await res.json()
  const p = j.features?.[0]?.properties
  if (!p) throw new Error('无结果')
  const parts = [p.country, p.state, p.city, p.district, p.locality, p.street]
    .filter((s) => !!s && s.trim() !== '')
  const seen = new Set()
  return parts.filter((s) => (seen.has(s) ? false : (seen.add(s), true))).join(' ')
}

// ---------- 3. POI 商户搜索 ----------
async function searchPhoton(q) {
  const res = await fetch(`${PHOTON}?q=${encodeURIComponent(q)}&limit=5`, { headers: UA })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const j = await res.json()
  return (j.features ?? []).map((f) => ({
    name: f.properties?.name || f.properties?.street || '未命名',
    city: f.properties?.city || '',
    lat: f.geometry?.coordinates?.[1],
    lng: f.geometry?.coordinates?.[0],
  }))
}

// ---------- 4. 算路（OSRM）----------
async function route(a, b) {
  const url = `${OSRM}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const j = await res.json()
  if (j.code !== 'Ok' || !j.routes?.length) throw new Error(j.code || '无路线')
  return { meters: Math.round(j.routes[0].distance), seconds: Math.round(j.routes[0].duration) }
}

// ---------- 执行 ----------
log('===== 线上业务链路验证（OSM 兜底，无 Key 场景）=====\n')

log('--- 1. 正向地理编码（地址 → 坐标）---')
const addrA = await timed('Photon  「北京西站」', () => geocodePhoton('北京西站'))
if (addrA) log(`    坐标: ${addrA.lat.toFixed(5)}, ${addrA.lng.toFixed(5)}`)
const addrB = await timed('Photon  「上海外滩」', () => geocodePhoton('上海外滩'))
if (addrB) log(`    坐标: ${addrB.lat.toFixed(5)}, ${addrB.lng.toFixed(5)}`)
await timed('Nominatim「北京西站」(对照，预期失败)', () => geocodeNominatim('北京西站'))

log('\n--- 2. 逆地理编码（坐标 → 地址）---')
const rev = await timed('Photon reverse 天安门坐标', () => reversePhoton(39.9087, 116.3975))
if (rev) log(`    地址: ${rev}`)

log('\n--- 3. POI 商户搜索 ---')
const pois = await timed('Photon 搜索「咖啡厅」', () => searchPhoton('咖啡厅'))
if (pois) pois.slice(0, 3).forEach((p) => log(`    · ${p.name} @ ${p.city}`))

log('\n--- 4. 路径规划（算路）---')
if (addrA && addrB) {
  const r = await timed('OSRM 北京西站 → 上海外滩', () => route(addrA, addrB))
  if (r) log(`    距离: ${(r.meters / 1000).toFixed(1)} km，时长: ${(r.seconds / 60).toFixed(0)} 分钟`)
}

log('\n===== 验证结束 =====')
