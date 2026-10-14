// 腾讯 provider：实现统一 MapProvider 接口（GCJ-02）。
// 整合自项目009 已封装的距离矩阵 / 货车路线 / 逆地址解析三类腾讯 API。

import type {
  DistanceMatrixResult,
  GeoPoint,
  MapProvider,
  MapService,
  MapSettings,
  PoiItem,
  RouteOptions,
  RouteResult,
  RouteStep,
} from '../types'
import { requestJson } from '../request'
import { decodeGCJPolyline, fmtLatLng } from '../geo'

interface TencentGeocode {
  result?: { location?: { lat?: number; lng?: number }; address?: string }
}
interface TencentPoi {
  data?: Array<{ id?: string; title?: string; address?: string; location?: { lat?: number; lng?: number } }>
}
interface TencentRoute {
  result?: {
    routes?: Array<{
      distance?: number
      duration?: number
      steps?: Array<{ instruction?: string; distance?: number; duration?: number; polyline?: Array<number> }>
      polyline?: Array<number>
    }>
  }
}
interface TencentMatrix {
  result?: {
    rows?: Array<{ elements?: Array<{ distance?: number; duration?: number }> }>
  }
}

function toPoint(v?: { lat?: number; lng?: number }): GeoPoint | null {
  if (!v || !Number.isFinite(v.lat) || !Number.isFinite(v.lng)) return null
  return { lat: v.lat as number, lng: v.lng as number }
}

/**
 * 腾讯 polyline 为压缩坐标数组：[lat,lng,lat,lng...]，数值已乘 1e6？
 * 实际 WebService 返回步长为「已解压的 [lat,lng] 序列」，此处按偶数位成对解析。
 */
function parsePolyline(arr?: Array<number>): Array<[number, number]> {
  if (!Array.isArray(arr) || arr.length < 2) return []
  const pts: Array<[number, number]> = []
  for (let i = 0; i + 1 < arr.length; i += 2) {
    pts.push([arr[i], arr[i + 1]])
  }
  return pts
}

export function createTencentProvider(settings: MapSettings): MapProvider {
  const service: MapService = 'tencent'

  return {
    service,

    async geocode(address: string): Promise<GeoPoint | null> {
      const json = await requestJson<TencentGeocode>(settings, service, '/geocoder/v1/', { address })
      return toPoint(json?.result?.location)
    },

    async reverseGeocode(point: GeoPoint): Promise<string | null> {
      const json = await requestJson<TencentGeocode>(settings, service, '/geocoder/v1/', {
        location: fmtLatLng(point),
      })
      return json?.result?.address ?? null
    },

    async searchPoi(keyword: string, center?: GeoPoint): Promise<PoiItem[]> {
      const json = await requestJson<TencentPoi>(settings, service, '/place/v1/search', {
        keyword,
        boundary: center ? `nearby(${fmtLatLng(center)},1000)` : 'region(全国,0)',
        page_size: 20,
      })
      const list = json?.data ?? []
      return list
        .map((p): PoiItem | null => {
          const loc = toPoint(p.location)
          if (!loc) return null
          return {
            id: p.id ?? '',
            name: p.title ?? '',
            address: p.address ?? '',
            location: loc,
            provider: service,
          }
        })
        .filter((x): x is PoiItem => x !== null)
    },

    async route(from: GeoPoint, to: GeoPoint, options?: RouteOptions): Promise<RouteResult | null> {
      // 货车模式走专用货车路线接口
      const path = options?.truck ? '/direction/v1/trucking' : '/direction/v1/driving'
      const json = await requestJson<TencentRoute>(settings, service, path, {
        from: fmtLatLng(from),
        to: fmtLatLng(to),
      })
      const r = json?.result?.routes?.[0]
      if (!r) return null

      const steps: RouteStep[] = (r.steps ?? []).map((s) => ({
        instruction: s.instruction ?? '',
        distance: Number(s.distance ?? 0),
        duration: Number(s.duration ?? 0),
        geometry: parsePolyline(s.polyline),
      }))

      // 路线整体几何优先用顶层 polyline（压缩串需解码），否则拼接各步
      const geometry = r.polyline ? decodeGCJPolyline(String(r.polyline)) : steps.flatMap((s) => s.geometry ?? [])

      return {
        distance: Number(r.distance ?? 0),
        duration: Number(r.duration ?? 0),
        steps,
        geometry,
        provider: service,
      }
    },

    async distanceMatrix(
      origins: GeoPoint[],
      destinations: GeoPoint[],
      options?: RouteOptions
    ): Promise<DistanceMatrixResult | null> {
      const json = await requestJson<TencentMatrix>(settings, service, '/distance/v1/matrix/', {
        mode: options?.truck ? 'trucking' : 'driving',
        from: origins.map(fmtLatLng).join(';'),
        to: destinations.map(fmtLatLng).join(';'),
      })
      const rows = json?.result?.rows ?? []
      return {
        rows: rows.map((row) =>
          (row.elements ?? []).map((e) => ({
            distance: Number(e.distance ?? 0),
            duration: Number(e.duration ?? 0),
            ok: e.distance !== undefined,
          }))
        ),
        provider: service,
      }
    },
  }
}
