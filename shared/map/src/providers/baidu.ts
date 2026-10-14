// 百度 provider：实现统一 MapProvider 接口。
// 百度数据为 BD-09，接入层统一转换为 GCJ-02（与底图对齐），上层无需关心坐标系差异。

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
import { requestJson } from '../request'
import { bd09ToGcj02, gcj02ToBd09, haversine } from '../geo'

interface BaiduGeocode {
  result?: { location?: { lat?: number; lng?: number } }
  status?: number
}
interface BaiduRegeo {
  result?: { formatted_address?: string }
}
interface BaiduPoi {
  results?: Array<{ uid?: string; name?: string; address?: string; location?: { lat?: number; lng?: number } }>
}
interface BaiduRoute {
  result?: {
    routes?: Array<{
      distance?: number
      duration?: number
      steps?: Array<{ instruction?: string; distance?: number; duration?: number; path?: string }>
    }>
  }
}
interface BaiduMatrix {
  result?: Array<{ distance?: { value?: number }; duration?: { value?: number } }>
}

function toGcj(v?: { lat?: number; lng?: number }): GeoPoint | null {
  if (!v || !Number.isFinite(v.lat) || !Number.isFinite(v.lng)) return null
  const [lat, lng] = bd09ToGcj02(v.lat as number, v.lng as number)
  return { lat, lng }
}

/** 解析百度 path 串 "lng,lat;lng,lat" → GCJ-02 点序 */
function parsePath(path?: string): Array<[number, number]> {
  if (!path) return []
  return path
    .split(';')
    .map((seg) => {
      const [lng, lat] = seg.split(',').map(Number)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      const [gLat, gLng] = bd09ToGcj02(lat, lng)
      return [gLat, gLng] as [number, number]
    })
    .filter((x): x is [number, number] => x !== null)
}

export function createBaiduProvider(settings: MapSettings): MapProvider {
  const service: MapService = 'baidu'

  return {
    service,

    async geocode(address: string): Promise<GeoPoint | null> {
      const json = await requestJson<BaiduGeocode>(settings, service, '/geocoding/v3/', {
        address,
        output: 'json',
      })
      return toGcj(json?.result?.location)
    },

    async reverseGeocode(point: GeoPoint): Promise<string | null> {
      // 百度入库坐标需为 BD-09，先把 GCJ-02 输入转过去
      const [bLat, bLng] = gcj02ToBd09(point.lat, point.lng)
      const json = await requestJson<BaiduRegeo>(settings, service, '/reverse_geocoding/v3/', {
        location: `${bLat},${bLng}`,
        output: 'json',
      })
      return json?.result?.formatted_address ?? null
    },

    async searchPoi(keyword: string, center?: GeoPoint): Promise<PoiItem[]> {
      const json = await requestJson<BaiduPoi>(settings, service, '/place/v2/search', {
        query: keyword,
        location: center ? `${center.lat},${center.lng}` : undefined,
        radius: center ? 1000 : undefined,
        output: 'json',
      })
      const list = json?.results ?? []
      return list
        .map((p): PoiItem | null => {
          const loc = toGcj(p.location)
          if (!loc) return null
          return {
            id: p.uid ?? '',
            name: p.name ?? '',
            address: p.address ?? '',
            location: loc,
            provider: service,
          }
        })
        .filter((x): x is PoiItem => x !== null)
    },

    async route(from: GeoPoint, to: GeoPoint): Promise<RouteResult | null> {
      const json = await requestJson<BaiduRoute>(
        settings,
        service,
        '/directionlite/v1/driving',
        {
          origin: `${from.lat},${from.lng}`,
          destination: `${to.lat},${to.lng}`,
        }
      )
      const r = json?.result?.routes?.[0]
      if (!r) return null

      const steps: RouteStep[] = (r.steps ?? []).map((s) => ({
        instruction: s.instruction ?? '',
        distance: Number(s.distance ?? 0),
        duration: Number(s.duration ?? 0),
        geometry: parsePath(s.path),
      }))

      return {
        distance: Number(r.distance ?? 0),
        duration: Number(r.duration ?? 0),
        steps,
        geometry: steps.flatMap((s) => s.geometry ?? []),
        provider: service,
      }
    },

    async distanceMatrix(
      origins: GeoPoint[],
      destinations: GeoPoint[]
    ): Promise<DistanceMatrixResult | null> {
      const json = await requestJson<BaiduMatrix>(settings, service, '/routematrix/v1/driving', {
        origins: origins.map((p) => `${p.lat},${p.lng}`).join('|'),
        destinations: destinations.map((p) => `${p.lat},${p.lng}`).join('|'),
      })
      const flat = json?.result ?? []
      if (flat.length === 0) return null

      // 百度返回扁平数组，按 destinations 长度切分为矩阵行
      const cols = destinations.length
      const rows: DistanceMatrixResult['rows'] = []
      for (let i = 0; i < origins.length; i++) {
        const slice = flat.slice(i * cols, (i + 1) * cols)
        rows.push(
          slice.map((e, j) => ({
            distance: Number(e?.distance?.value ?? haversine(origins[i], destinations[j])),
            duration: Number(e?.duration?.value ?? 0),
            ok: e?.distance?.value !== undefined,
          }))
        )
      }
      return { rows, provider: service }
    },
  }
}
