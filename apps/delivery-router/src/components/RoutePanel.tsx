import { useState } from 'react'
import { useStore } from '../store'
import { geocode, locateByIp } from '../geocode'
import { hasCredentials } from '../mapservice'
import { formatDistance, formatDuration } from '../geo'
import { exportCSV, printDeliverySheet } from '../export'
import { severeDays } from '../weather'
import type { RouteMode } from '../routing'
import type { Depot } from '../types'

const TRAVEL_LABEL: Record<RouteMode, string> = {
  driving: '驾车',
  walking: '步行',
  bicycling: '骑行',
}

export default function RoutePanel() {
  const depot = useStore((s) => s.depot)
  const customers = useStore((s) => s.customers)
  const result = useStore((s) => s.result)
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  const startNavigation = useStore((s) => s.startNavigation)
  const navActive = useStore((s) => s.navActive)
  const navError = useStore((s) => s.navError)
  const navRoute = useStore((s) => s.navRoute)
  const navLegIndex = useStore((s) => s.navLegIndex)
  const optimize = useStore((s) => s.optimize)
  const optimizing = useStore((s) => s.optimizing)
  const currentStop = useStore((s) => s.currentStop)
  const setCurrentStop = useStore((s) => s.setCurrentStop)
  const toggleVisited = useStore((s) => s.toggleVisited)
  const setDepot = useStore((s) => s.setDepot)
  const settings = useStore((s) => s.settings)
  const roadNetwork = useStore((s) => s.roadNetwork)
  const setRoadNetwork = useStore((s) => s.setRoadNetwork)
  const truckMode = useStore((s) => s.truckMode)
  const setTruckMode = useStore((s) => s.setTruckMode)
  const truck = useStore((s) => s.truck)
  const setTruck = useStore((s) => s.setTruck)
  const routeMode = useStore((s) => s.routeMode)
  const setRouteMode = useStore((s) => s.setRouteMode)
  const iso = useStore((s) => s.iso)
  const isoLoading = useStore((s) => s.isoLoading)
  const isoError = useStore((s) => s.isoError)
  const fetchIsochrone = useStore((s) => s.fetchIsochrone)
  const clearIso = useStore((s) => s.clearIso)
  const weather = useStore((s) => s.weather)
  const weatherLoading = useStore((s) => s.weatherLoading)
  const weatherError = useStore((s) => s.weatherError)
  const fetchWeatherNow = useStore((s) => s.fetchWeatherNow)

  const [depForm, setDepForm] = useState<Depot | null>(null)
  const [depBusy, setDepBusy] = useState(false)
  const [depMsg, setDepMsg] = useState('')
  const [showTruck, setShowTruck] = useState(false)
  const [isoMinutes, setIsoMinutes] = useState(30)

  // 代理模式下凭证在服务端，必须用 hasCredentials 判定（getKey 恒为空会误报）
  const truckNoKey = truckMode && (settings.service === 'osm' || !hasCredentials(settings))

  const locatedCount = customers.filter((c) => c.lat !== 0 || c.lng !== 0).length
  // 必须至少有 1 条**已定位**地址：未定位点不参与排序，全是未定位时算不出任何路线
  const canOptimize = !!depot && locatedCount > 0

  function openDepot() {
    setDepMsg('')
    setDepForm(depot ? { ...depot } : { name: '配送起点', address: '', lat: 39.9075, lng: 116.39723 })
  }

  /** IP 定位（城市级）：把起点粗略落到当前所在城市中心 */
  async function fillByIp() {
    if (!depForm) return
    setDepBusy(true)
    setDepMsg('')
    try {
      const loc = await locateByIp(useStore.getState().settings)
      if (!loc) {
        setDepMsg('IP 定位失败：当前服务不支持该能力或 Key 无权限（OSM 无此能力）。')
        return
      }
      const area = [loc.province, loc.city].filter(Boolean).join('')
      setDepForm({
        ...depForm,
        address: area || depForm.address,
        lat: loc.lat ?? depForm.lat,
        lng: loc.lng ?? depForm.lng,
      })
      if (loc.lat == null || loc.lng == null) {
        setDepMsg(`已定位到 ${area}，但该服务未返回城市坐标，请补充地址后自动地理编码。`)
      }
    } finally {
      setDepBusy(false)
    }
  }
  async function saveDepot() {
    if (!depForm) return
    let coords = depForm.lat || depForm.lng ? { lat: depForm.lat, lng: depForm.lng } : null
    setDepBusy(true)
    try {
      if (!coords && depForm.address.trim()) {
        const g = await geocode(depForm.address, useStore.getState().settings)
        if (g) coords = g
      }
      await setDepot({
        name: depForm.name.trim() || '配送起点',
        address: depForm.address.trim(),
        lat: coords?.lat ?? depForm.lat,
        lng: coords?.lng ?? depForm.lng,
      })
      setDepForm(null)
    } finally {
      setDepBusy(false)
    }
  }

  const stops = result ? result.order.map((i) => customers[i]) : []
  const curSeg = result?.segments[currentStop] ?? null

  return (
    <div className="panel route-panel">
      <div className="panel-head">
        <h3>路线规划与导航</h3>
        <div className="row">
          <span className="muted">起点：</span>
          <button className="btn sm" onClick={openDepot}>
            {depot ? depot.name : '设置起点'}
          </button>
        </div>
        <div className="row sub">
          <span className="seg-toggle">
            <button className={mode === 'route' ? 'active' : ''} onClick={() => setMode('route')}>
              路线最优
            </button>
            <button className={mode === 'distance' ? 'active' : ''} onClick={() => setMode('distance')}>
              按距离
            </button>
          </span>
          <button className="btn primary" disabled={!canOptimize || optimizing} onClick={optimize}>
            {optimizing ? '优化中…' : '开始优化'}
          </button>
        </div>

        <div className="row sub route-opts">
          <label className="chk">
            <input
              type="checkbox"
              checked={roadNetwork}
              disabled={mode !== 'route'}
              onChange={(e) => setRoadNetwork(e.target.checked)}
            />
            道路网排序
          </label>
          <label className="chk">
            <input
              type="checkbox"
              checked={truckMode}
              disabled={routeMode !== 'driving'}
              onChange={(e) => setTruckMode(e.target.checked)}
            />
            货车模式
          </label>
          {truckMode && (
            <button className="btn sm" onClick={() => setShowTruck((v) => !v)}>
              ⚙ 货车参数
            </button>
          )}
          <label className="chk mode-sel">
            出行
            <select
              value={routeMode}
              onChange={(e) => setRouteMode(e.target.value as RouteMode)}
              title="腾讯原生支持步行/骑行；OSM 自动切换 foot/bicycle 剖面；高德 JS API 仅驾车，其余走 OSM 兜底"
            >
              <option value="driving">驾车</option>
              <option value="walking">步行</option>
              <option value="bicycling">骑行</option>
            </select>
          </label>
        </div>

        {roadNetwork && mode !== 'route' && (
          <div className="hint">道路网排序仅在「路线最优」模式下生效，已自动忽略。</div>
        )}
        {truckNoKey && (
          <div className="hint warn">货车路线需配置腾讯/高德有效 Key，当前将退化为普通驾车/直线。</div>
        )}

        {truckMode && showTruck && (
          <div className="truck-opts">
            <div className="truck-grid">
              <label>
                车型
                <select
                  value={String(truck.size ?? 2)}
                  onChange={(e) => setTruck({ ...truck, size: Number(e.target.value) as 1 | 2 | 3 | 4 })}
                >
                  <option value="1">微型</option>
                  <option value="2">轻型</option>
                  <option value="3">中型</option>
                  <option value="4">重型</option>
                </select>
              </label>
              <label>
                总重(吨)
                <input
                  type="number"
                  step="0.1"
                  value={truck.weight ?? ''}
                  onChange={(e) => setTruck({ ...truck, weight: Number(e.target.value) || 0 })}
                />
              </label>
              <label>
                核定载重(吨)
                <input
                  type="number"
                  step="0.1"
                  value={truck.load ?? ''}
                  onChange={(e) => setTruck({ ...truck, load: Number(e.target.value) || 0 })}
                />
              </label>
              <label>
                车长(米)
                <input
                  type="number"
                  step="0.1"
                  value={truck.length ?? ''}
                  onChange={(e) => setTruck({ ...truck, length: Number(e.target.value) || 0 })}
                />
              </label>
              <label>
                车宽(米)
                <input
                  type="number"
                  step="0.1"
                  value={truck.width ?? ''}
                  onChange={(e) => setTruck({ ...truck, width: Number(e.target.value) || 0 })}
                />
              </label>
              <label>
                车高(米)
                <input
                  type="number"
                  step="0.1"
                  value={truck.height ?? ''}
                  onChange={(e) => setTruck({ ...truck, height: Number(e.target.value) || 0 })}
                />
              </label>
              <label className="span2">
                车牌号（可避让政策性限行）
                <input
                  value={truck.plateNumber ?? ''}
                  placeholder="如 京A12345"
                  onChange={(e) => setTruck({ ...truck, plateNumber: e.target.value.trim() || undefined })}
                />
              </label>
              <label className="span2">
                策略
                <select
                  value={String(truck.policy ?? 1)}
                  onChange={(e) => setTruck({ ...truck, policy: Number(e.target.value) })}
                >
                  <option value="1">最短时间</option>
                  <option value="2">避免拥堵</option>
                  <option value="3">距离优先</option>
                  <option value="4">少收费</option>
                  <option value="5">不走高速</option>
                </select>
              </label>
            </div>
          </div>
        )}

        <div className="row sub iso-row">
          <span className="muted">起点可达圈</span>
          <input
            className="iso-min"
            type="number"
            min={5}
            max={120}
            step={5}
            value={isoMinutes}
            onChange={(e) => setIsoMinutes(Math.max(5, Math.min(120, Number(e.target.value) || 30)))}
          />
          <span className="muted">分钟内</span>
          <button className="btn sm" disabled={isoLoading || !depot} onClick={() => fetchIsochrone(isoMinutes)}>
            {isoLoading ? '计算中…' : '生成'}
          </button>
          {iso && (
            <button className="btn sm" onClick={clearIso}>
              清除
            </button>
          )}
          {iso && (
            <span className={`tag ${iso.approx ? 'warn' : 'ok'}`}>
              {iso.approx ? '圆形近似' : '真实街区面'} · 半径 {formatDistance(iso.radius)}
            </span>
          )}
        </div>
        {isoError && <div className="hint warn">{isoError}</div>}
        {iso?.approx && (
          <div className="hint">
            当前服务（{settings.service === 'tencent' ? '腾讯' : settings.service === 'amap' ? '高德' : 'OSM'}）
            未返回真实街区轮廓，已按 {TRAVEL_LABEL[routeMode]}均速换算为圆形范围；切到腾讯服务可得真实可达面。
          </div>
        )}

        {!canOptimize && <div className="hint">需先设置起点并导入至少 1 条地址。</div>}
        {customers.length > 0 && locatedCount < customers.length && (
          <div className="hint warn">有 {customers.length - locatedCount} 条地址未定位，不参与计算。</div>
        )}

        <div className="row sub">
          <button className="btn sm" onClick={fetchWeatherNow} disabled={weatherLoading}>
            {weatherLoading ? '查询中…' : '查询起点天气'}
          </button>
          {weather?.now && (
            <span className="tag">
              {weather.cityName} {weather.now.weather} {weather.now.temperature}℃
            </span>
          )}
        </div>
        {weather && severeDays(weather).length > 0 && (
          <div className="hint warn">
            ⚠️ 恶劣天气：{severeDays(weather).join(' / ')} —— 建议调整派单、预留缓冲或延后配送。
          </div>
        )}
        {weatherError && <div className="hint warn">{weatherError}</div>}
      </div>

      {result && (
        <>
          <div className="route-summary">
            <div>
              <b>{result.order.length}</b> 个站点
            </div>
            <div>
              总里程 <b>{formatDistance(result.totalDistance)}</b>
            </div>
            <div>
              预计 <b>{formatDuration(result.totalDuration)}</b>
            </div>
          </div>

          {(truckMode || roadNetwork) && (
            <div className="route-tags">
              {truckMode && <span className="tag warn">货车路线</span>}
              {roadNetwork && <span className="tag ok">道路网排序</span>}
            </div>
          )}

          <div className="export-ops">
            <button
              className="btn sm"
              onClick={() => exportCSV(result, customers, depot)}
              title="导出为 Excel 可打开的 CSV 文件"
            >
              导出 Excel(CSV)
            </button>
            <button
              className="btn sm"
              onClick={() => printDeliverySheet(result, customers, depot)}
              title="在新窗口打印配送单 / 另存为 PDF"
            >
              打印配送单
            </button>
          </div>

          <div className="nav-launch">
            <button
              className="btn primary"
              disabled={!curSeg}
              onClick={() => startNavigation(false)}
              title="在本应用内开始实时导航（GPS 定位 + 地图匹配 + 语音引导），不跳转第三方 App"
            >
              ▶ 开始导航
            </button>
            <button
              className="btn sm"
              disabled={!curSeg}
              onClick={() => startNavigation(true)}
              title="桌面或无 GPS 环境下，沿路线模拟推进以演示完整引导流程"
            >
              模拟导航
            </button>
            <span className="muted nav-launch-tip">
              算路聚合高德 / 腾讯 / 百度，导航引擎自建
            </span>
          </div>

          {navActive && (
            <div className="hint ok-text">
              正在导航前往第 {navLegIndex + 1} 站
              {navRoute?.providerLabel ? ` · 算路：${navRoute.providerLabel}` : ''}
            </div>
          )}
          {navError && <div className="hint warn">{navError}</div>}

          <div className="nav-controls">
            <button className="btn sm" disabled={currentStop <= 0} onClick={() => setCurrentStop(currentStop - 1)}>
              ← 上一站
            </button>
            <span className="muted">
              当前：{currentStop === 0 ? '起点' : `第 ${currentStop} 站`}
            </span>
            <button
              className="btn sm"
              disabled={currentStop >= result.order.length}
              onClick={() => setCurrentStop(currentStop + 1)}
            >
              下一站 →
            </button>
          </div>

          {curSeg && (
            <div className="nav-steps">
              <div className="nav-title">
                从「{curSeg.fromName}」→「{curSeg.toName}」
                <span className="muted">
                  （{formatDistance(curSeg.distance)} · {formatDuration(curSeg.duration)}）
                </span>
              </div>
              <ol>
                {curSeg.steps.map((s, i) => (
                  <li key={i}>
                    <span className="step-ins">{s.instruction}</span>
                    <span className="muted">
                      {formatDistance(s.distance)} · {formatDuration(s.duration)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="stop-list">
            {currentStop === 0 && (
              <div className="stop-item dep">
                <span className="stop-no">起</span>
                <div className="stop-main">
                  <div className="stop-name">{depot?.name}</div>
                  <div className="muted">{depot?.address}</div>
                </div>
              </div>
            )}
            {stops.map((c, idx) => {
              const no = idx + 1
              const seg = result.segments[idx]
              const isCur = currentStop === no
              return (
                <div
                  key={c.id}
                  className={`stop-item ${isCur ? 'cur' : ''} ${c.visited ? 'visited' : ''}`}
                  onClick={() => setCurrentStop(no)}
                >
                  <span className="stop-no">{no}</span>
                  <div className="stop-main">
                    <div className="stop-name">
                      {c.name}
                      {c.visited && <span className="tag ok">已送达</span>}
                    </div>
                    <div className="muted">{c.address}</div>
                    {seg && (
                      <div className="stop-meta">
                        {formatDistance(seg.distance)} · {formatDuration(seg.duration)}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleVisited(no)
                    }}
                  >
                    {c.visited ? '撤销' : '送达'}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {depForm && (
        <div className="modal-mask" onClick={() => !depBusy && setDepForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>设置配送起点</h3>
            <label>
              名称
              <input value={depForm.name} onChange={(e) => setDepForm({ ...depForm, name: e.target.value })} />
            </label>
            <label>
              地址（留空经纬度时自动定位）
              <input
                value={depForm.address}
                onChange={(e) => setDepForm({ ...depForm, address: e.target.value })}
              />
            </label>
            <div className="row sub">
              <button className="btn sm" disabled={depBusy} onClick={fillByIp}>
                {depBusy ? '定位中…' : '📍 用我的城市（IP 定位）'}
              </button>
              <span className="muted">仅到城市级精度，随后可在上方地址精确定位</span>
            </div>
            {depMsg && <div className="hint warn">{depMsg}</div>}
            <div className="row">
              <label className="half">
                纬度
                <input
                  value={String(depForm.lat)}
                  onChange={(e) => setDepForm({ ...depForm, lat: Number(e.target.value) || 0 })}
                />
              </label>
              <label className="half">
                经度
                <input
                  value={String(depForm.lng)}
                  onChange={(e) => setDepForm({ ...depForm, lng: Number(e.target.value) || 0 })}
                />
              </label>
            </div>
            <div className="modal-ops">
              <button className="btn" disabled={depBusy} onClick={() => setDepForm(null)}>
                取消
              </button>
              <button className="btn primary" disabled={depBusy} onClick={saveDepot}>
                {depBusy ? '定位中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
