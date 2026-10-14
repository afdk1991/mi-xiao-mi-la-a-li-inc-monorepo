import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { hasCredentials, needsKey, KEYLESS_HINT } from '../mapservice'
import type { Poi } from '../poisearch'

export default function PoiSearchPanel() {
  const settings = useStore((s) => s.settings)
  const searchPoi = useStore((s) => s.searchPoi)
  const poiResults = useStore((s) => s.poiResults)
  const poiSearching = useStore((s) => s.poiSearching)
  const selectedPoiId = useStore((s) => s.selectedPoiId)
  const selectPoi = useStore((s) => s.selectPoi)
  const clearPoi = useStore((s) => s.clearPoi)
  const addCustomer = useStore((s) => s.addCustomer)
  // 实时位置：用于"搜附近"偏置 + 移动时刷新结果
  const livePosition = useStore((s) => s.livePosition)
  const liveTracking = useStore((s) => s.liveTracking)

  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  // 是否以当前实时位置为中心搜索（有实时位置时默认开启）
  const [near, setNear] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const lastNearSearchRef = useRef(0)

  // 代理模式下凭证在服务端，必须用 hasCredentials 判定（getKey 恒为空会误报）
  const keyMissing = needsKey(settings.service) && !hasCredentials(settings)

  // 一旦拿到实时位置，自动开启"搜附近"
  useEffect(() => {
    if (livePosition) setNear(true)
  }, [livePosition])

  // 实时位置放进 ref：watchPosition 每秒都产生新对象，若作为 runSearch 的依赖，
  // 「输入防抖」的 effect 会被位置刷新反复重建、计时器永远重置 → 移动中搜索根本发不出去。
  const livePosRef = useRef(livePosition)
  useEffect(() => {
    livePosRef.current = livePosition
  }, [livePosition])

  const runSearch = useCallback(
    (query: string, useNear: boolean) => {
      const kw = query.trim()
      if (!kw) return
      // 取消上一次在途请求，避免输入更快时旧请求后到覆盖新结果
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      const lp = livePosRef.current
      const loc = useNear && lp ? ([lp.lat, lp.lng] as [number, number]) : null
      void searchPoi(kw, city.trim() || undefined, loc, ac.signal)
    },
    [searchPoi, city],
  )

  // 实时搜索：输入即搜（防抖 400ms）
  useEffect(() => {
    if (!q.trim()) return
    const t = setTimeout(() => runSearch(q, near), 400)
    return () => clearTimeout(t)
  }, [q, near, runSearch])

  // 移动时刷新"附近"结果（节流 5s，避免高频打车式请求）
  useEffect(() => {
    if (!near || !liveTracking || !livePosition || !q.trim()) return
    const now = Date.now()
    if (now - lastNearSearchRef.current < 5000) return
    lastNearSearchRef.current = now
    runSearch(q, true)
  }, [livePosition, near, liveTracking, q, runSearch])

  useEffect(() => () => abortRef.current?.abort(), [])

  async function addToDelivery(p: Poi) {
    await addCustomer({
      name: p.name,
      address: p.address || p.name,
      lat: p.lat,
      lng: p.lng,
      phone: p.tel,
      note: p.type ? `POI类别：${p.type}` : '来自商户搜索',
      geocoded: true,
    })
  }

  return (
    <div className="panel poi-panel">
      <div className="panel-head">
        <h3>搜索商户（地图直接显示）</h3>
        <div className="row">
          <input
            className="search"
            placeholder="商户名/关键词，如：鹏驰"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="btn primary"
            disabled={poiSearching || !q.trim()}
            onClick={() => runSearch(q, near)}
          >
            {poiSearching ? '搜索中…' : '搜索'}
          </button>
        </div>
        <div className="row sub">
          <input
            className="search"
            placeholder="城市（可选，如：上海）"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch(q, near)
            }}
          />
          {poiResults.length > 0 && (
            <button className="btn sm" onClick={clearPoi}>
              清除
            </button>
          )}
        </div>

        <label className="chk near-chk">
          <input
            type="checkbox"
            checked={near}
            disabled={!livePosition}
            onChange={(e) => setNear(e.target.checked)}
          />
          {livePosition ? '以我的实时位置为中心搜索附近（3km）' : '开启实时位置后可"搜附近"'}
        </label>
      </div>

      {keyMissing && <div className="keyless-banner mini">{KEYLESS_HINT}</div>}

      <div className="poi-list">
        {poiResults.length === 0 && !poiSearching && (
          <div className="empty">
            输入关键词搜索商户，结果将直接在地图标注。
            {livePosition && '已开启实时位置，将优先搜索您附近的地点。'}
          </div>
        )}
        {poiResults.map((p) => (
          <div key={p.id} className={`poi-item ${p.id === selectedPoiId ? 'active' : ''}`}>
            <div className="poi-main">
              <div className="poi-name">{p.name}</div>
              <div className="addr-sub">{p.address || p.type || ''}</div>
              {p.tel && <div className="muted">☎ {p.tel}</div>}
            </div>
            <div className="addr-ops">
              <button className="btn sm" onClick={() => selectPoi(p.id)}>
                定位
              </button>
              <button className="btn sm primary" onClick={() => addToDelivery(p)}>
                加配送
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
