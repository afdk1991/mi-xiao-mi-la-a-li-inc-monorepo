import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useStore } from '../store'
import type { Customer, Depot, OptimizeResult } from '../types'
import { isValidCoord } from '../store'
import { tileUrlFor, effectiveTileService } from '../mapservice'

interface Props {
  customers: Customer[]
  depot: Depot | null
  result: OptimizeResult | null
  currentStop: number
  onSelectStop: (i: number) => void
}

function numIcon(html: string, cls: string): L.DivIcon {
  return L.divIcon({
    className: 'mk',
    html: `<div class="mk-pin ${cls}">${html}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

export default function MapView({ customers, depot, result, currentStop, onSelectStop }: Props) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const tileRef = useRef<L.TileLayer | null>(null)
  const version = useStore((s) => s.mapVersion)
  const settings = useStore((s) => s.settings)
  const poiResults = useStore((s) => s.poiResults)
  const selectedPoiId = useStore((s) => s.selectedPoiId)
  const poiFocusTick = useStore((s) => s.poiFocusTick)
  const selectPoi = useStore((s) => s.selectPoi)
  const poiFocusRef = useRef(0)
  const trajectory = useStore((s) => s.trajectory)
  const iso = useStore((s) => s.iso)
  // 实时导航（自建引擎）：单独一个图层，避免每次定位刷新都重建全部客户/POI 标记
  const navActive = useStore((s) => s.navActive)
  const navSnap = useStore((s) => s.navSnap)
  const navRoute = useStore((s) => s.navRoute)
  const navLayerRef = useRef<L.LayerGroup | null>(null)
  const navFollowRef = useRef(0)

  // 实时位置（独立高频定位）图层
  const livePosition = useStore((s) => s.livePosition)
  const liveTracking = useStore((s) => s.liveTracking)
  const liveFollow = useStore((s) => s.liveFollow)
  const liveVersion = useStore((s) => s.liveVersion)
  const liveLayerRef = useRef<L.LayerGroup | null>(null)
  const liveFollowRef = useRef(0)
  const liveCenterRef = useRef(0)

  // 初始化地图（仅一次）
  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const center: [number, number] = depot ? [depot.lat, depot.lng] : [39.9075, 116.39723]
    const map = L.map(elRef.current, { zoomControl: true }).setView(center, 12)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * 容器尺寸变化后必须 invalidateSize。
   *
   * Leaflet 只在初始化时读取一次容器尺寸；本项目是响应式布局（三栏 / 收窄 / 移动端抽屉），
   * 侧栏折叠、抽屉上滑、窗口缩放都会改变 .map-area 的实际宽高，
   * 此时瓦片层仍按旧尺寸计算 → 表现为地图空白一块、拖动后点位偏移、fitBounds 框错。
   */
  useEffect(() => {
    const el = elRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      // 尺寸变化事件是连续触发的，放到下一帧再刷新，避免布局抖动期间反复重排
      requestAnimationFrame(() => mapRef.current?.invalidateSize({ animate: false }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 底图：随"有效服务"切换（无可用凭证时回落 OSM，与地理编码兜底同坐标系，避免偏移）
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const spec = tileUrlFor(effectiveTileService(settings))
    if (tileRef.current) map.removeLayer(tileRef.current)
    tileRef.current = L.tileLayer(spec.url, {
      maxZoom: 19,
      subdomains: spec.subdomains,
      attribution: spec.attribution,
    }).addTo(map)
    tileRef.current.bringToBack()
  }, [settings])

  // 数据变化时重绘图层
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    const bounds: L.LatLngExpression[] = []

    // 起点可达圈（等时/等距范围）：先画，保证标记与路线压在其上层
    if (iso && iso.polygon.length > 2) {
      const ring = iso.polygon as L.LatLngExpression[]
      L.polygon(ring, {
        color: iso.approx ? '#f5a623' : '#13a8a8',
        weight: 2,
        opacity: 0.9,
        fillColor: iso.approx ? '#f5a623' : '#13a8a8',
        fillOpacity: 0.15,
        dashArray: iso.approx ? '6 6' : undefined,
      })
        .addTo(layer)
        .bindPopup(
          iso.approx
            ? `<b>可达范围（圆形近似）</b><br/>半径约 ${Math.round(iso.radius)} 米`
            : `<b>可达范围（真实街区面）</b><br/>等效半径约 ${Math.round(iso.radius)} 米`,
        )
      iso.polygon.forEach((p) => bounds.push(p as L.LatLngExpression))
    }

    if (depot && isValidCoord(depot.lat, depot.lng)) {
      L.marker([depot.lat, depot.lng], { icon: numIcon('起', 'dep') })
        .addTo(layer)
        .bindPopup(`<b>${depot.name}</b><br/>${depot.address || ''}`)
      bounds.push([depot.lat, depot.lng])
    }

    // 路线分段绘制（当前段高亮）
    if (result) {
      result.segments.forEach((seg) => {
        const isCurrent = currentStop === seg.fromIndex
        L.polyline(seg.geometry as L.LatLngExpression[], {
          color: isCurrent ? '#ff4d4f' : '#2f6bff',
          weight: isCurrent ? 5 : 3,
          opacity: isCurrent ? 1 : 0.6,
          dashArray: isCurrent ? undefined : '6 6',
        }).addTo(layer)
      })
    }

    // 客户标记
    // 预建「客户下标 → 配送序号」映射：原先在循环里 result.order.indexOf(i) 是 O(n²)，
    // 站点数上百时每次重绘都要做上万次比较。
    const rank = new Map<number, number>()
    if (result) result.order.forEach((ci, idx) => rank.set(ci, idx + 1))
    customers.forEach((c, i) => {
      if (!isValidCoord(c.lat, c.lng)) return
      const orderNo = rank.get(i) ?? 0
      const isCurrent = result ? currentStop === orderNo : false
      const cls = c.visited ? 'done' : isCurrent ? 'cur' : 'todo'
      const label = orderNo > 0 ? String(orderNo) : '?'
      const marker = L.marker([c.lat, c.lng], { icon: numIcon(label, cls) }).addTo(layer)
      marker.bindPopup(
        `<b>${c.name}</b>${c.phone ? `<br/>${c.phone}` : ''}<br/>${c.address}` +
          (orderNo > 0 ? `<br/>配送顺序：第 ${orderNo} 站` : '') +
          (c.visited ? '<br/>✅ 已送达' : ''),
      )
      marker.on('click', () => {
        if (orderNo > 0) onSelectStop(orderNo)
      })
      bounds.push([c.lat, c.lng])
    })

    // POI 搜索结果标记（商户直接在地图标注）
    const selMarkers: L.Marker[] = []
    poiResults.forEach((p) => {
      if (!isValidCoord(p.lat, p.lng)) return
      const isSel = p.id === selectedPoiId
      const marker = L.marker([p.lat, p.lng], { icon: numIcon('商', isSel ? 'poi-sel' : 'poi') }).addTo(layer)
      marker.bindPopup(
        `<b>${p.name}</b>${p.tel ? `<br/>☎ ${p.tel}` : ''}<br/>${p.address}` +
          (p.type ? `<br/><span class="muted">${p.type}</span>` : ''),
      )
      marker.on('click', () => selectPoi(p.id))
      bounds.push([p.lat, p.lng])
      if (isSel) selMarkers.push(marker)
    })

    // 配送员轨迹：原始飘点（灰虚线）+ 纠偏后（青色实线）
    if (trajectory) {
      if (trajectory.original.length > 1) {
        L.polyline(trajectory.original as L.LatLngExpression[], {
          color: '#8a8a8a',
          weight: 2,
          opacity: 0.75,
          dashArray: '3 5',
        }).addTo(layer)
      }
      if (trajectory.corrected.length > 1) {
        L.polyline(trajectory.corrected as L.LatLngExpression[], {
          color: '#13a8a8',
          weight: 4,
          opacity: 0.95,
        }).addTo(layer)
        trajectory.corrected.forEach((p) => bounds.push(p as L.LatLngExpression))
      } else {
        trajectory.original.forEach((p) => bounds.push(p as L.LatLngExpression))
      }
    }

    // 导航进行中不要再做 fitBounds：否则每次定位刷新都会把视野拉回整条路线，
    // 用户手动拖动的视角会被不断抢走
    if (navActive) return

    const selPoi =
      selectedPoiId ? poiResults.find((p) => p.id === selectedPoiId) ?? null : null
    if (selPoi && poiFocusRef.current !== poiFocusTick) {
      // 仅当用户点击「定位」时，一次性飞行聚焦到该商户
      map.flyTo([selPoi.lat, selPoi.lng], Math.max(map.getZoom(), 16))
      selMarkers[0]?.openPopup()
      poiFocusRef.current = poiFocusTick
    } else if (bounds.length) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 15 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, currentStop, selectedPoiId, poiResults, poiFocusTick, trajectory, iso, navActive])

  // ---- 实时导航图层：只画导航相关要素，定位刷新时不重建其它标记 ----
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!navLayerRef.current) navLayerRef.current = L.layerGroup().addTo(map)
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = navLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    if (!navActive || !navSnap) return

    // 完整路线铺底
    if (navRoute && navRoute.geometry.length > 1) {
      L.polyline(navRoute.geometry as L.LatLngExpression[], {
        color: '#2f6bff',
        weight: 6,
        opacity: 0.35,
      }).addTo(layer)
    }
    // 已行驶部分压灰盖在上面
    if (navSnap.traveled.length > 1) {
      L.polyline(navSnap.traveled as L.LatLngExpression[], {
        color: '#9aa0a6',
        weight: 7,
        opacity: 0.9,
      }).addTo(layer)
    }
    // 当前位置（带朝向箭头）
    const pos = navSnap.position
    if (pos) {
      L.marker([pos.lat, pos.lng], {
        icon: L.divIcon({
          className: 'mk-nav',
          html: `<div class="nav-me"><i style="transform: rotate(${pos.heading}deg)">➤</i></div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
        zIndexOffset: 1000,
      }).addTo(layer)

      // 跟随：节流到 1 秒一次，避免每帧 panTo 导致地图抖动
      const now = Date.now()
      if (now - navFollowRef.current > 1000) {
        navFollowRef.current = now
        map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.8 })
      }
    }
    // 偏离路线时画一条当前位置到匹配点的提示线
    if (navSnap.snapped && pos && navSnap.offRouteDistance > 30) {
      L.polyline(
        [
          [pos.lat, pos.lng],
          [navSnap.snapped[0], navSnap.snapped[1]],
        ] as L.LatLngExpression[],
        { color: '#ff4d4f', weight: 2, dashArray: '4 6' },
      ).addTo(layer)
    }
  }, [navActive, navSnap, navRoute])

  // ---- 实时位置图层：独立于导航的"我在哪"标记 ----
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!liveLayerRef.current) liveLayerRef.current = L.layerGroup().addTo(map)
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = liveLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    if (!livePosition) return

    const { lat, lng } = livePosition
    // 精度圈
    if (livePosition.accuracy > 0 && livePosition.accuracy < 5000) {
      L.circle([lat, lng], {
        radius: livePosition.accuracy,
        color: '#2f6bff',
        weight: 1,
        opacity: 0.45,
        fillColor: '#2f6bff',
        fillOpacity: 0.12,
      }).addTo(layer)
    }
    // 中心蓝点（带朝向）
    L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'mk-live',
        html: `<div class="live-dot"><i style="transform: rotate(${livePosition.heading}deg)">➤</i></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
      zIndexOffset: 1500,
    }).addTo(layer)

    // 跟随：开启跟踪时平移（节流 800ms，避免每帧抖动）
    const now = Date.now()
    if (liveFollow && liveTracking && now - liveFollowRef.current > 800) {
      liveFollowRef.current = now
      map.panTo([lat, lng], { animate: true, duration: 0.6 })
    }
    // 一次性居中（定位到我 / 重新居中）
    if (liveVersion !== liveCenterRef.current) {
      liveCenterRef.current = liveVersion
      map.flyTo([lat, lng], Math.max(map.getZoom(), 16))
    }
  }, [livePosition, liveTracking, liveFollow, liveVersion])

  return <div ref={elRef} className="map-canvas" />
}
