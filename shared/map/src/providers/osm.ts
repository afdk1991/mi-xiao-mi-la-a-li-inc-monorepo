// OSM provider：免 Key 兜底实现（WGS-84）。
// 地理编码走 Nominatim，路径/矩阵走 OSRM 公共实例。
// 用途：未配置任何 Key 时自动降级，保证坐标系一致（WGS-84 底图 + WGS-84 结果），无偏移。

import type {
  DistanceMatrixResult,
  GeoPoint,
  MapProvider,
  MapService,
  MapSettings,
  PoiItem,
  RouteResult,
  RouteStep,
} from '../types'
import { requestJson, OSRM_BASE } from '../request'
import { haversine } from '../geo'

interface NominatimItem {
  lat?: string
  lon?: string
  display_name?: string
  place_id?: number
}
interface OsrmRoute {
  routes?: Array<{
    distance?: number
    duration?: number
    geometry?: { coordinates?: Array<[number, number]> }
  }>
}
interface OsrmTable {
  distances?: Array<Array<number>>
  durations?: Array<Array<number>>
}

export function createOsmProvider(settings: MapSettings): MapProvider {
  const service: MapService = 'osm'

  return {
    service,

    async geocode(address: string): Promise<GeoPoint | null> {
      const list = await requestJson<NominatimItem[]>(settings, service, '/search', {
        q: address,
        format: 'json',
        limit: 1,
      })
      const first = Array.isArray(list) ? list[0] : undefined
      const lat = Number(first?.lat)
      const lng = Number(first?.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      return { lat, lng }
    },

    async reverseGeocode(point: GeoPoint): Promise<string | null> {
      const json = await requestJson<{ display_name?: string }>(settings, service, '/reverse', {
        lat: point.lat,
        lon: point.lng,
        format: 'json',
      })
      return json?.display_name ?? null
    },

    async searchPoi(keyword: string, center?: GeoPoint): Promise<PoiItem[]> {
      const list = await requestJson<NominatimItem[]>(settings, service, '/search', {
        q: keyword,
        format: 'json',
        limit: 20,
        ...(center ? { viewbox: `${center.lng - 0.1},${center.lat + 0.1},${center.lng + 0.1},${center.lat - 0.1}` } : {}),
      })
      if (!Array.isArray(list)) return []
      return list
        .map((p): PoiItem | null => {
          const lat = Number(p.lat)
          const lng = Number(p.lon)
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
          return {
            id: String(p.place_id ?? ''),
            name: (p.display_name ?? '').split(',')[0] ?? '',
            address: p.display_name ?? '',
            location: { lat, lng },
            provider: service,
          }
        })
        .filter((x): x is PoiItem => x !== null)
    },

    async route(from: GeoPoint, to: GeoPoint): Promise<RouteResult | null> {
      // OSRM 基址与 Nominatim 不同，直接请求
      const url = `${OSRM_BASE}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
      try {
        const res = await fetch(url)
        if (!res.ok) return null
        const json = (await res.json()) as OsrmRoute
        const r = json?.routes?.[0]
        if (!r) return null
        // OSRM geojson 坐标为 [lng, lat]，统一翻转为 [lat, lng]
        const geometry: Array<[number, number]> = (r.geometry?.coordinates ?? []).map(
          (c) => [c[1], c[0]] as [number, number]
        )
        const steps: RouteStep[] = []
        return {
          distance: Number(r.distance ?? 0),
          duration: Number(r.duration ?? 0),
          steps,
          geometry,
          provider: service,
        }
      } catch {
        return null
      }
    },

    async distanceMatrix(
      origins: GeoPoint[],
      destinations: GeoPoint[]
    ): Promise<DistanceMatrixResult | null> {
      const coords = [...origins, ...destinations]
        .map((p) => `${p.lng},${p.lat}`)
        .join(';')
      const url = `${OSRM_BASE}/table/v1/driving/${coords}?sources=${origins
        .map((_, i) => i)
        .join(';')}&destinations=${destinations.map((_, i) => origins.length + i).join(';')}`
      try {
        const res = await fetch(url)
        if (!res.ok) return null
        const json = (await res.json()) as OsrmTable
        const dists = json?.distances ?? []
        const durs = json?.durations ?? []
        if (dists.length === 0) return null
        return {
          rows: dists.map((row, i) =>
            row.map((d, j) => ({
              distance: Number(d ?? haversine(origins[i], destinations[j])),
              duration: Number(durs[i]?.[j] ?? 0),
              ok: d !== null && d !== undefined,
            }))
          ),
          provider: service,
        }
      } catch {
        return null
      }
    },
  }
}
