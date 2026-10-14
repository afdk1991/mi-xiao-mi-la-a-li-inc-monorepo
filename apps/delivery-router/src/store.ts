import { create } from 'zustand'
import {
  clearCustomers,
  deleteCustomers,
  deleteCustomer,
  getAllCustomers,
  getDepot,
  putCustomers,
  putCustomer,
  saveDepot,
} from './db'
import { geocodeBatch, translateCoords, type CoordSource } from './geocode'
import { bearing, isValidCoord } from './geo'
import { buildRoute, computeOrder } from './optimize'
import { DEFAULT_SETTINGS, hasCredentials, type MapSettings } from './mapservice'
import { probeProxy, usingProxy, type ProxyProbe } from './proxy'
import { getIsochrone, type IsochroneResult, type RouteMode, type TruckOptions } from './routing'
import { planRouteAggregated } from './navroute'
import {
  NavigationEngine,
  type NavRoute,
  type NavSnapshot,
  type NavStatus,
} from './navigation'
import { primeVoices, speak, stopSpeaking } from './speech'
import { serviceLabel } from './mapservice'
import { searchPoi, type Poi } from './poisearch'
import { fetchWeatherByLocation, type WeatherInfo } from './weather'
import type { Customer, Depot, NavStep, OptimizeMode, OptimizeResult } from './types'

const SETTINGS_KEY = 'delivery.mapSettings'
const ROUTE_OPTS_KEY = 'delivery.routeOptions'

/**
 * 导航引擎实例放在模块作用域而非 store state。
 * 它是带 watchPosition / setInterval 的有状态对象，放进 state 会被 React 的
 * 引用比较牵连，且序列化无意义。
 */
let navEngine: NavigationEngine | null = null

/** 实时定位 watchPosition 的句柄，stop 时用于 clearWatch */
let liveWatchId: number | null = null
/** 上一次实时位置（用于设备不返回 heading 时推算朝向） */
let lastLivePos: { lat: number; lng: number } | null = null

/** 货车参数默认值（轻卡：长 4.2m / 高 2m / 宽 2m / 总重 5t / 载重 2.5t / 最短时间策略） */
export const DEFAULT_TRUCK: TruckOptions = {
  size: 2,
  length: 4.2,
  height: 2,
  width: 2,
  weight: 5,
  load: 2.5,
  policy: 1,
}

interface RouteOpts {
  roadNetwork: boolean
  truckMode: boolean
  truck: TruckOptions
  /** 出行方式：驾车 / 步行 / 骑行 */
  routeMode: RouteMode
}

const DEFAULT_ROUTE_OPTS: RouteOpts = {
  roadNetwork: false,
  truckMode: false,
  truck: { ...DEFAULT_TRUCK },
  routeMode: 'driving',
}

function loadRouteOpts(): RouteOpts {
  try {
    const raw = localStorage.getItem(ROUTE_OPTS_KEY)
    if (!raw) return { ...DEFAULT_ROUTE_OPTS, truck: { ...DEFAULT_TRUCK } }
    const p = JSON.parse(raw) as Partial<RouteOpts>
    const rm = p.routeMode
    return {
      roadNetwork: !!p.roadNetwork,
      truckMode: !!p.truckMode,
      truck: { ...DEFAULT_TRUCK, ...(p.truck || {}) },
      routeMode: rm === 'walking' || rm === 'bicycling' ? rm : 'driving',
    }
  } catch {
    return { ...DEFAULT_ROUTE_OPTS, truck: { ...DEFAULT_TRUCK } }
  }
}

function saveRouteOpts(o: RouteOpts): void {
  try {
    localStorage.setItem(ROUTE_OPTS_KEY, JSON.stringify(o))
  } catch {
    /* ignore */
  }
}

/**
 * 一次性清洗：把历史上保存到 localStorage 的地图 Key 全部抹掉。
 * 这些 Key 是早前「前端预填凭证」时期留下的，等同于已泄露（见 DEFAULT_SETTINGS 注释）。
 * 清洗只做一次（用 delivery.keysPurged 打标记），之后用户若主动改为直连并自填 Key，不再被清空。
 */
const PURGE_KEY = 'delivery.keysPurged'
function purgeLegacyKeys(): boolean {
  try {
    if (localStorage.getItem(PURGE_KEY) === '1') return false
    localStorage.setItem(PURGE_KEY, '1')
    return true
  } catch {
    return false
  }
}

function loadSettings(): MapSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as {
      service?: MapSettings['service']
      amapPref?: MapSettings['amapPref']
      proxy?: string
      keys?: Partial<MapSettings['keys']>
    }
    const service = parsed.service ?? DEFAULT_SETTINGS.service
    const amapPref: MapSettings['amapPref'] =
      parsed.amapPref === 'web' || parsed.amapPref === 'js' ? parsed.amapPref : 'auto'
    const legacy = parsed as unknown as { key?: string }
    let keys = parsed.keys
    if (!keys || typeof keys !== 'object') {
      // 兼容旧版 { service, key } 结构：把旧 key 视作高德 key
      keys = { amap: legacy.key ?? '', tencent: '' }
    }
    const purged = purgeLegacyKeys()
    const settings: MapSettings = {
      service,
      amapPref,
      // 旧版本没有 proxy 字段 → 默认启用服务端代理（前端零凭证）
      proxy:
        typeof parsed.proxy === 'string'
          ? parsed.proxy
          : DEFAULT_SETTINGS.proxy,
      // 逐字段与默认值合并，避免新增凭证（amapSecret / amapWeb / amapSig）在读取时被丢弃
      keys: purged
        ? { ...DEFAULT_SETTINGS.keys }
        : {
            amap: keys.amap ?? DEFAULT_SETTINGS.keys.amap,
            amapSecret: keys.amapSecret ?? DEFAULT_SETTINGS.keys.amapSecret,
            amapWeb: keys.amapWeb ?? DEFAULT_SETTINGS.keys.amapWeb,
            amapSig: keys.amapSig ?? DEFAULT_SETTINGS.keys.amapSig,
            tencent: keys.tencent ?? DEFAULT_SETTINGS.keys.tencent,
            baidu: keys.baidu ?? DEFAULT_SETTINGS.keys.baidu,
          },
    }
    // 立刻回写，确保本机 localStorage 里不再残留任何 Key
    if (purged) saveSettings(settings)
    return settings
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function saveSettings(s: MapSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function uid(): string {
  return crypto.randomUUID()
}

/** 坐标可用性判定（实现在 geo.ts，此处仅转发，避免 optimize 等模块反向依赖 store） */
export { isValidCoord }

export interface ImportProgress {
  done: number
  total: number
  geocoded: number
  failed: number
}

/** 实时定位返回的位置点（浏览器 Geolocation 坐标系与当前地图服务一致时直接可用） */
export interface LivePosition {
  lat: number
  lng: number
  /** 行进方向（度，正北为 0）；设备不提供时由前后两点推算 */
  heading: number
  /** 定位精度半径（米） */
  accuracy: number
  /** 速度（米/秒） */
  speed: number
}

interface State {
  customers: Customer[]
  depot: Depot | null
  mode: OptimizeMode
  result: OptimizeResult | null
  currentStop: number // 导航当前聚焦的站点序号（1-based，0 表示起点）
  optimizing: boolean
  importing: boolean
  importProgress: ImportProgress | null
  mapVersion: number // 递增以触发地图刷新

  // 高级路线选项（持久化于 localStorage）
  roadNetwork: boolean // 道路网排序：route 模式用真实路面距离矩阵做 TSP
  truckMode: boolean // 货车模式：各段改用货车路线规划
  truck: TruckOptions // 货车参数
  routeMode: RouteMode // 出行方式：驾车 / 步行 / 骑行
  setRoadNetwork: (v: boolean) => void
  setTruckMode: (v: boolean) => void
  setTruck: (t: TruckOptions) => void
  setRouteMode: (m: RouteMode) => void

  // ---- 实时导航（自建引擎，不跳转第三方 App）----
  navActive: boolean
  navStatus: NavStatus
  navSnap: NavSnapshot | null
  navRoute: NavRoute | null
  /** 正在导航前往的站号（1-based）；0 表示正在前往第 1 站（即当前段 fromIndex=0） */
  navLegIndex: number
  navSimulate: boolean
  navMuted: boolean
  navError: string | null
  startNavigation: (simulate: boolean) => Promise<void>
  stopNavigation: () => void
  setNavSimulate: (v: boolean) => void
  toggleNavMute: () => void
  navReroute: () => void
  /** 内部：到达当前站后的推进逻辑（标记送达 + 进入下一站） */
  onNavArrive: () => Promise<void>

  // 起点可达圈（等时圈 / 等距圈）
  iso: IsochroneResult | null
  isoLoading: boolean
  isoError: string | null
  fetchIsochrone: (minutes: number) => Promise<void>
  clearIso: () => void

  load: () => Promise<void>
  setDepot: (d: Depot) => Promise<void>
  setMode: (m: OptimizeMode) => void
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt' | 'visited' | 'geocoded'> & { geocoded?: boolean }) => Promise<void>
  updateCustomer: (id: string, patch: Partial<Customer>) => Promise<void>
  removeCustomer: (id: string) => Promise<void>
  removeMany: (ids: string[]) => Promise<void>
  clearAll: () => Promise<void>
  /**
   * 批量导入。coordSource 指明 rows 中 lat/lng 的坐标系：
   * 非当前服务坐标系时自动调用官方坐标转换接口校正（失败则原样保留，绝不丢点）。
   */
  importRows: (
    rows: Array<{ name: string; phone?: string; address: string; lat?: number; lng?: number; note?: string }>,
    coordSource?: CoordSource,
  ) => Promise<{ added: number; failed: number }>
  optimize: () => Promise<void>
  setCurrentStop: (i: number) => void
  toggleVisited: (i: number) => Promise<void>
  clearRoute: () => void

  // POI 商户搜索
  poiResults: Poi[]
  poiSearching: boolean
  selectedPoiId: string | null
  /** 每次「定位」某 POI 时自增，用于触发地图一次性飞行聚焦 */
  poiFocusTick: number
  /** 实时搜索：传入当前实时位置作为搜索中心；signal 用于取消上一次在途请求 */
  searchPoi: (q: string, city?: string, location?: [number, number] | null, signal?: AbortSignal) => Promise<void>
  selectPoi: (id: string | null) => void
  clearPoi: () => void

  // ---- 实时位置（独立的高频定位，区别于导航中的定位）----
  /** 当前实时位置（watchPosition 持续刷新）；未开启定位时为 null */
  livePosition: LivePosition | null
  /** 是否正在持续跟踪实时位置 */
  liveTracking: boolean
  /** 是否让地图自动跟随实时位置 */
  liveFollow: boolean
  /** 定位错误信息（不支持 / 失败） */
  liveError: string | null
  /** 每次「定位到我 / 重新居中」自增，用于触发地图一次性飞行聚焦 */
  liveVersion: number
  startLiveTracking: () => void
  stopLiveTracking: () => void
  setLiveFollow: (v: boolean) => void
  /** 一次性定位（不持续跟踪），用于「定位到我」 */
  locateMe: () => void

  settings: MapSettings
  setSettings: (s: MapSettings) => void
  /** 服务端代理健康探测结果（直连模式下为 null） */
  proxyProbe: ProxyProbe | null
  proxyProbing: boolean
  checkProxy: () => Promise<void>

  // 天气（配送调度提示）
  weather: WeatherInfo | null
  weatherLoading: boolean
  weatherError: string | null
  fetchWeatherNow: () => Promise<void>

  // 轨迹纠偏结果（配送员回传轨迹）
  trajectory: { original: [number, number][]; corrected: [number, number][] } | null
  trajectoryMeta: { originalCount: number; correctedDistance: number } | null
  setTrajectory: (
    t: { original: [number, number][]; corrected: [number, number][] } | null,
    meta?: { originalCount: number; correctedDistance: number } | null,
  ) => void
  clearTrajectory: () => void
}

const DEFAULT_DEPOT: Depot = {
  name: '配送起点',
  address: '',
  lat: 39.9075,
  lng: 116.39723,
}

export const useStore = create<State>((set, get) => ({
  customers: [],
  depot: null,
  mode: 'route',
  result: null,
  currentStop: 0,
  optimizing: false,
  importing: false,
  importProgress: null,
  mapVersion: 0,
  poiResults: [],
  poiSearching: false,
  selectedPoiId: null,
  poiFocusTick: 0,
  // 实时位置
  livePosition: null,
  liveTracking: false,
  liveFollow: false,
  liveError: null,
  liveVersion: 0,
  settings: loadSettings(),
  ...loadRouteOpts(),

  weather: null,
  weatherLoading: false,
  weatherError: null,
  trajectory: null,
  trajectoryMeta: null,
  iso: null,
  isoLoading: false,
  isoError: null,
  proxyProbe: null,
  proxyProbing: false,

  // 实时导航
  navActive: false,
  navStatus: 'idle',
  navSnap: null,
  navRoute: null,
  navLegIndex: 0,
  navSimulate: false,
  navMuted: false,
  navError: null,

  /**
   * 代理健康探测。失败时自动清空 proxy 字段，让前端立即走直连/OSM，
   * 避免每个地理编码/算路请求都先白跑一次失败往返。
   */
  async checkProxy() {
    const { settings } = get()
    if (!usingProxy(settings)) {
      set({ proxyProbe: null, proxyProbing: false })
      return
    }
    set({ proxyProbing: true })
    const r = await probeProxy(settings)
    if (r.ok) {
      set({ proxyProbe: r, proxyProbing: false })
      return
    }
    // 路由可达（函数已部署）但返回业务错误（多为没配 Key）→ 保持代理待命，
    // 只更新探测提示，不把 proxy 清空回落 OSM（否则会掩盖「只差环境变量」的事实）。
    if (r.reachable) {
      set({ proxyProbe: r, proxyProbing: false })
      return
    }
    // 代理路由确实不可达（函数没部署）→ 回直连（若本机填过 Key 则直连生效，否则自动落 OSM）
    const next: MapSettings = { ...settings, proxy: '' }
    saveSettings(next)
    set((st) => ({ proxyProbe: r, proxyProbing: false, settings: next, result: null, currentStop: 0, mapVersion: st.mapVersion + 1 }))
  },

  async load() {
    const [customers, depot] = await Promise.all([getAllCustomers(), getDepot()])
    set({ customers, depot: depot ?? DEFAULT_DEPOT, settings: loadSettings(), ...loadRouteOpts() })
    void get().checkProxy()
  },

  async setDepot(d) {
    await saveDepot(d)
    set((s) => ({ depot: d, mapVersion: s.mapVersion + 1, result: null, currentStop: 0 }))
  },

  setMode(m) {
    set({ mode: m })
  },

  setRoadNetwork(v) {
    set({ roadNetwork: v })
    saveRouteOpts({ roadNetwork: v, truckMode: get().truckMode, truck: get().truck, routeMode: get().routeMode })
  },

  setTruckMode(v) {
    set({ truckMode: v })
    saveRouteOpts({ roadNetwork: get().roadNetwork, truckMode: v, truck: get().truck, routeMode: get().routeMode })
  },

  setTruck(t) {
    set({ truck: t })
    saveRouteOpts({ roadNetwork: get().roadNetwork, truckMode: get().truckMode, truck: t, routeMode: get().routeMode })
  },

  setRouteMode(m) {
    // 货车路线只有驾车口径：切到步行/骑行时必须一并关闭货车模式。
    // 否则勾选框虽被禁用，truckMode 仍为 true，优化时会被 getTruckRoute 覆盖掉出行方式。
    const truckMode = m === 'driving' ? get().truckMode : false
    // 出行方式影响既有路线几何与可达圈，一并清空
    set((s) => ({
      routeMode: m,
      truckMode,
      result: null,
      currentStop: 0,
      iso: null,
      isoError: null,
      mapVersion: s.mapVersion + 1,
    }))
    saveRouteOpts({
      roadNetwork: get().roadNetwork,
      truckMode,
      truck: get().truck,
      routeMode: m,
    })
  },

  // ---- 实时导航：自建引擎，全程在本 App 内完成，不跳转第三方导航 App ----

  async startNavigation(simulate: boolean) {
    const { result, currentStop, settings } = get()
    if (!result || !result.segments.length) {
      set({ navError: '请先生成配送路线再开始导航。' })
      return
    }
    const legIdx = Math.min(Math.max(currentStop, 0), result.segments.length - 1)
    const seg = result.segments[legIdx]
    if (!seg || !seg.geometry.length) {
      set({ navError: '当前路段没有可用的路线几何。' })
      return
    }

    // 切段/重开时先彻底停掉上一个引擎，否则会有两个 watchPosition 同时回调
    if (navEngine) {
      navEngine.stop()
      navEngine = null
    }
    primeVoices()

    const route: NavRoute = {
      fromName: seg.fromName,
      toName: seg.toName,
      destination: seg.geometry[seg.geometry.length - 1],
      distance: seg.distance,
      duration: seg.duration,
      geometry: seg.geometry,
      steps: seg.steps,
      providerLabel: serviceLabel(settings.service),
    }

    set({
      navActive: true,
      navStatus: 'waiting',
      navSnap: null,
      navRoute: route,
      navLegIndex: legIdx,
      navSimulate: simulate,
      navError: null,
    })

    navEngine = new NavigationEngine({
      simulate,
      onUpdate: (s) => set({ navSnap: s, navStatus: s.status }),
      onArrive: () => {
        void get().onNavArrive()
      },
      // 偏航重算走「多源聚合」：并发问高德/腾讯/百度，取最先返回的一家，
      // 这样某一家配额耗尽或超时也不会让导航断掉
      onReroute: async (_reason, from) => {
        const dest = get().navRoute?.destination
        if (!dest) return null
        const agg = await planRouteAggregated(from, dest, get().settings, {
          mode: get().routeMode,
          strategy: 'fastest',
        })
        if (!agg || !agg.geometry.length) return null
        const next: NavRoute = {
          fromName: '当前位置',
          toName: get().navRoute?.toName ?? '',
          destination: dest,
          distance: agg.distance,
          duration: agg.duration,
          geometry: agg.geometry,
          steps: agg.steps as NavStep[],
          providerLabel: agg.providerLabel,
        }
        set({ navRoute: next })
        return next
      },
      speak: (t) => {
        if (!get().navMuted) speak(t)
      },
    })
    navEngine.start(route)
  },

  stopNavigation() {
    if (navEngine) {
      navEngine.stop()
      navEngine = null
    }
    set({ navActive: false, navStatus: 'idle', navSnap: null, navRoute: null })
  },

  setNavSimulate(v) {
    set({ navSimulate: v })
    // 立刻按新模式重启，避免「改了开关但当前导航还是旧模式」
    if (get().navActive) void get().startNavigation(v)
  },

  toggleNavMute() {
    const muted = !get().navMuted
    set({ navMuted: muted })
    if (muted) stopSpeaking()
  },

  navReroute() {
    navEngine?.manualReroute()
  },

  /** 到达当前站：标记送达 → 自动推进到下一站（还有段就继续导航） */
  async onNavArrive() {
    const { result, navLegIndex, customers } = get()
    if (!result) return
    const ci = result.order[navLegIndex]
    const c = customers[ci]
    if (c && !c.visited) await get().updateCustomer(c.id, { visited: true })

    const nextLeg = navLegIndex + 1
    if (nextLeg < result.segments.length) {
      set((s) => ({ currentStop: nextLeg, mapVersion: s.mapVersion + 1 }))
      await get().startNavigation(get().navSimulate)
    } else {
      if (navEngine) {
        navEngine.stop()
        navEngine = null
      }
      set((s) => ({
        navActive: false,
        navStatus: 'arrived',
        navRoute: null,
        currentStop: result.order.length,
        mapVersion: s.mapVersion + 1,
      }))
    }
  },

  async fetchIsochrone(minutes: number) {
    const { depot, settings, routeMode } = get()
    if (!depot) {
      set({ isoError: '请先设置配送起点。' })
      return
    }
    if (settings.service === 'osm' || !hasCredentials(settings)) {
      set({ isoError: '可达圈需高德/腾讯服务（OSM 无此能力）。' })
      return
    }
    set({ isoLoading: true, isoError: null })
    try {
      const r = await getIsochrone([depot.lat, depot.lng], { seconds: minutes * 60, mode: routeMode }, settings)
      if (!r) {
        set({ iso: null, isoLoading: false, isoError: '可达圈计算失败。' })
        return
      }
      set((s) => ({ iso: r, isoLoading: false, isoError: null, mapVersion: s.mapVersion + 1 }))
    } catch {
      set({ isoLoading: false, isoError: '可达圈请求异常。' })
    }
  },

  clearIso() {
    set((s) => ({ iso: null, isoError: null, mapVersion: s.mapVersion + 1 }))
  },

  async addCustomer(c) {
    const full: Customer = {
      id: uid(),
      createdAt: Date.now(),
      visited: false,
      geocoded: c.geocoded ?? false,
      ...c,
    }
    await putCustomer(full)
    set((s) => ({ customers: [...s.customers, full], mapVersion: s.mapVersion + 1 }))
  },

  async updateCustomer(id, patch) {
    const next = get().customers.map((c) => (c.id === id ? { ...c, ...patch } : c))
    const target = next.find((c) => c.id === id)
    if (target) await putCustomer(target)
    set({ customers: next, mapVersion: get().mapVersion + 1, result: null, currentStop: 0 })
  },

  async removeCustomer(id) {
    await deleteCustomer(id)
    set((s) => ({
      customers: s.customers.filter((c) => c.id !== id),
      mapVersion: s.mapVersion + 1,
      result: null,
      currentStop: 0,
    }))
  },

  async removeMany(ids) {
    await deleteCustomers(ids)
    set((s) => ({
      customers: s.customers.filter((c) => !ids.includes(c.id)),
      mapVersion: s.mapVersion + 1,
      result: null,
      currentStop: 0,
    }))
  },

  async clearAll() {
    await clearCustomers()
    set({ customers: [], mapVersion: get().mapVersion + 1, result: null, currentStop: 0 })
  },

  async importRows(rows, coordSource) {
    set({ importing: true, importProgress: { done: 0, total: rows.length, geocoded: 0, failed: 0 } })
    const toGeocode: { idx: number; q: string }[] = []
    const prepared: Customer[] = rows.map((r, i) => {
      const hasCoord = isValidCoord(r.lat ?? NaN, r.lng ?? NaN)
      if (!hasCoord) toGeocode.push({ idx: i, q: r.address })
      return {
        id: uid(),
        name: r.name || `客户${i + 1}`,
        phone: r.phone,
        address: r.address,
        lat: hasCoord ? (r.lat as number) : 0,
        lng: hasCoord ? (r.lng as number) : 0,
        note: r.note,
        geocoded: hasCoord,
        visited: false,
        createdAt: Date.now() + i,
      }
    })

    // 坐标来源非当前服务坐标系时，先批量转换（任一批次失败都原样保留，绝不丢点）
    // 恒等场景直接跳过：高德/腾讯同为 GCJ-02（源为 amap 即可免转）；OSM 即 WGS-84（源为 gps 免转）
    const coordIdentical = get().settings.service === 'osm' ? coordSource === 'gps' : coordSource === 'amap'
    if (coordSource && !coordIdentical) {
      const withCoord: { idx: number }[] = []
      prepared.forEach((c, i) => {
        if (isValidCoord(c.lat, c.lng)) withCoord.push({ idx: i })
      })
      if (withCoord.length) {
        const converted = await translateCoords(
          withCoord.map((x) => [prepared[x.idx].lat, prepared[x.idx].lng] as [number, number]),
          coordSource,
          get().settings,
        )
        withCoord.forEach((x, k) => {
          const c = converted[k]
          if (c && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
            prepared[x.idx].lat = c[0]
            prepared[x.idx].lng = c[1]
          }
        })
      }
    }

    if (toGeocode.length) {
      const results = await geocodeBatch(
        toGeocode.map((t) => t.q),
        get().settings,
        (done, total) =>
          set((s) => ({
            importProgress: s.importProgress
              ? { ...s.importProgress, done: done + (rows.length - total), total: rows.length }
              : null,
          })),
      )
      let geocoded = 0
      let failed = 0
      toGeocode.forEach((t, k) => {
        const res = results[k]
        if (res) {
          prepared[t.idx].lat = res.lat
          prepared[t.idx].lng = res.lng
          prepared[t.idx].geocoded = true
          geocoded++
        } else {
          failed++
        }
      })
      set((s) => ({ importProgress: { ...(s.importProgress as ImportProgress), geocoded, failed } }))
    }

    await putCustomers(prepared)
    set((s) => ({
      customers: [...s.customers, ...prepared],
      importing: false,
      mapVersion: s.mapVersion + 1,
    }))
    const failed = prepared.filter((p) => !isValidCoord(p.lat, p.lng)).length
    return { added: prepared.length - failed, failed }
  },

  async optimize() {
    const { customers, depot, mode, settings, roadNetwork, truckMode, truck, routeMode } = get()
    if (!depot || customers.length === 0) return
    set({ optimizing: true, result: null, currentStop: 0 })
    try {
      const result = await buildRoute(customers, depot, mode, settings, undefined, {
        roadNetwork,
        travelMode: routeMode,
        truck: truckMode ? truck : undefined,
      })
      // 把顺序写回客户对象以便持久化展示
      const next = customers.map((c) => ({ ...c }))
      result.order.forEach((ci, pos) => {
        next[ci].order = pos + 1
      })
      await putCustomers(next)
      set((s) => ({ customers: next, result, optimizing: false, currentStop: 0, mapVersion: s.mapVersion + 1 }))
    } catch {
      set({ optimizing: false })
    }
  },

  setCurrentStop(i) {
    set({ currentStop: i })
  },

  async toggleVisited(i) {
    const { customers, result } = get()
    if (!result) return
    const ci = result.order[i - 1]
    if (ci === undefined) return
    const target = customers[ci]
    const next = customers.map((c) => (c.id === target.id ? { ...c, visited: !c.visited } : c))
    await putCustomer(next[ci])
    set({ customers: next, mapVersion: get().mapVersion + 1 })
  },

  clearRoute() {
    set({ result: null, currentStop: 0 })
  },

  setSettings(s) {
    saveSettings(s)
    // 切换服务会改变坐标系，旧路线几何不再适用，清空并触发地图换底图
    set((st) => ({ settings: s, result: null, currentStop: 0, mapVersion: st.mapVersion + 1 }))
  },

  async fetchWeatherNow() {
    const { depot, settings } = get()
    if (!depot) {
      set({ weatherError: '请先设置配送起点。' })
      return
    }
    // 代理模式下凭证在服务端，必须用 hasCredentials 判定（getKey 恒为空会误报）
    if (settings.service === 'osm' || !hasCredentials(settings)) {
      set({ weatherError: '天气需配置高德/腾讯 Web 服务 Key（OSM 无天气服务）。' })
      return
    }
    set({ weatherLoading: true, weatherError: null })
    try {
      const w = await fetchWeatherByLocation(depot.lat, depot.lng, settings)
      if (!w) set({ weatherLoading: false, weatherError: '未获取到天气（逆地理取 adcode 失败或 Key 无权限）。' })
      else set({ weather: w, weatherLoading: false, weatherError: null })
    } catch {
      set({ weatherLoading: false, weatherError: '天气查询失败。' })
    }
  },

  setTrajectory(t, meta = null) {
    set((s) => ({ trajectory: t, trajectoryMeta: meta ?? null, mapVersion: s.mapVersion + 1 }))
  },

  clearTrajectory() {
    set((s) => ({ trajectory: null, trajectoryMeta: null, mapVersion: s.mapVersion + 1 }))
  },

  async searchPoi(q, city, location, signal) {
    set({ poiSearching: true, selectedPoiId: null })
    try {
      const results = await searchPoi(q, get().settings, city, location, signal)
      set((s) => ({ poiResults: results, poiSearching: false, mapVersion: s.mapVersion + 1 }))
    } catch (e) {
      // 取消在途请求（AbortError）时静默退出，不要清空已有结果
      if ((e as { name?: string })?.name === 'AbortError') return
      set({ poiSearching: false, poiResults: [] })
    }
  },

  selectPoi(id) {
    set((s) => ({ selectedPoiId: id, poiFocusTick: s.poiFocusTick + 1, mapVersion: s.mapVersion + 1 }))
  },

  clearPoi() {
    set((s) => ({ poiResults: [], selectedPoiId: null, mapVersion: s.mapVersion + 1 }))
  },

  // ---- 实时位置（高频 watchPosition，与导航定位相互独立）----
  startLiveTracking() {
    if (!('geolocation' in navigator)) {
      set({ liveError: '当前环境不支持定位（需 HTTPS 或 localhost 访问）。' })
      return
    }
    // 已在跟踪则忽略
    if (liveWatchId !== null) return
    set({ liveTracking: true, liveFollow: true, liveError: null })
    let firstFix = true
    liveWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        let heading = Number.isFinite(pos.coords.heading as number) ? (pos.coords.heading as number) : 0
        if (!heading && lastLivePos) heading = bearing(lastLivePos.lat, lastLivePos.lng, lat, lng)
        lastLivePos = { lat, lng }
        const lp: LivePosition = {
          lat,
          lng,
          heading,
          accuracy: pos.coords.accuracy ?? 0,
          speed: Number.isFinite(pos.coords.speed as number) ? (pos.coords.speed as number) : 0,
        }
        set((s) => ({
          livePosition: lp,
          // 首个定位点做一次居中；之后靠 liveFollow 平移，避免每帧 flyTo 抖动
          liveVersion: firstFix ? s.liveVersion + 1 : s.liveVersion,
        }))
        firstFix = false
      },
      (err) => {
        set({ liveError: `定位失败：${err.message}`, liveTracking: false })
        liveWatchId = null
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 },
    )
  },

  stopLiveTracking() {
    if (liveWatchId !== null) {
      navigator.geolocation.clearWatch(liveWatchId)
      liveWatchId = null
    }
    lastLivePos = null
    set({ liveTracking: false, liveFollow: false, livePosition: null })
  },

  setLiveFollow(v) {
    set({ liveFollow: v })
  },

  locateMe() {
    if (!('geolocation' in navigator)) {
      set({ liveError: '当前环境不支持定位（需 HTTPS 或 localhost 访问）。' })
      return
    }
    set({ liveError: null })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        let heading = Number.isFinite(pos.coords.heading as number) ? (pos.coords.heading as number) : 0
        if (!heading && lastLivePos) heading = bearing(lastLivePos.lat, lastLivePos.lng, lat, lng)
        lastLivePos = { lat, lng }
        const lp: LivePosition = {
          lat,
          lng,
          heading,
          accuracy: pos.coords.accuracy ?? 0,
          speed: Number.isFinite(pos.coords.speed as number) ? (pos.coords.speed as number) : 0,
        }
        set((s) => ({ livePosition: lp, liveVersion: s.liveVersion + 1, liveFollow: true }))
      },
      (err) => set({ liveError: `定位失败：${err.message}` }),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  },

}))

// 供组件在需要时直接计算顺序（无需等待地图段落）
export function previewOrder(customers: Customer[], depot: Depot | null, mode: OptimizeMode): number[] {
  if (!depot) return []
  return computeOrder(customers, depot, mode)
}
