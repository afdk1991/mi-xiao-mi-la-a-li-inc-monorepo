// 高德 provider：实现统一 MapProvider 接口（GCJ-02）。
// 整合自 apps/MIXMLAAL/mixmlaal-apps/mixmlaal-api-node/src/services/mapService.js
// 与 apps/项目009商品采集/src/amap.ts、geocode.ts、poisearch.ts、navroute.ts。

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
import { decodeGCJPolyline, fmtLngLat } from '../geo'

/** 高德 REST 响应最小化类型（仅取用到的字段） */
interface AmapGeocode {
  geocodes?: Array<{ location?: string }>
}
interface AmapRegeo {
  regeocode?: { formatted_address?: string }
}
interface AmapPoi {
  pois?: Array<{ id?: string; name?: string; address?: string; location?: string }>
}
interface AmapRoute {
  route?: { paths?: Array<{ distance?: string; duration?: string; steps?: Array<AmapStepRaw> }> }
}
interface AmapStepRaw {
  instruction?: string
  distance?: string
  duration?: string
  polyline?: string
}
interface AmapDistance {
  results?: Array<{ distance?: string; duration?: string }>
}

function parseLocation(loc?: string): GeoPoint | null {
  if (!loc) return null
  const [lng, lat] = loc.split(',').map(Number)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

export function createAmapProvider(settings: MapSettings): MapProvider {
  const service: MapService = 'amap'

  return {
    service,

    async geocode(address: string): Promise<GeoPoint | null> {
      const json = await requestJson<AmapGeocode>(settings, service, '/geocode/geo', {
        address,
      })
      return parseLocation(json?.geocodes?.[0]?.location)
    },

    async reverseGeocode(point: GeoPoint): Promise<string | null> {
      const json = await requestJson<AmapRegeo>(settings, service, '/geocode/regeo', {
        location: fmtLngLat(point),
      })
      return json?.regeocode?.formatted_address ?? null
    },

    async searchPoi(keyword: string, center?: GeoPoint): Promise<PoiItem[]> {
      const json = await requestJson<AmapPoi>(settings, service, '/place/text', {
        keywords: keyword,
        location: center ? fmtLngLat(center) : undefined,
        city: center ? undefined : '全国',
        offset: 20,
        page: 1,
      })
      const pois = json?.pois ?? []
      return pois
        .map((p): PoiItem | null => {
          const loc = parseLocation(p.location)
          if (!loc) return null
          return {
            id: p.id ?? '',
            name: p.name ?? '',
            address: p.address ?? '',
            location: loc,
            provider: service,
          }
        })
        .filter((x): x is PoiItem => x !== null)
    },

    async route(from: GeoPoint, to: GeoPoint, options?: RouteOptions): Promise<RouteResult | null> {
      const strategy = options?.strategy === 'duration' ? 5 : 2
      const json = await requestJson<AmapRoute>(settings, service, '/direction/driving', {
        origin: fmtLngLat(from),
        destination: fmtLngLat(to),
        strategy,
        // 货车模式：高德货车路径需 size/weight 等参数，此处仅置位，缺省按普通驾车
        ferry: options?.truck ? 1 : undefined,
      })
      const path = json?.route?.paths?.[0]
      if (!path) return null

      const steps: RouteStep[] = (path.steps ?? []).map((s) => ({
        instruction: s.instruction ?? '',
        distance: Number(s.distance ?? 0),
        duration: Number(s.duration ?? 0),
        geometry: s.polyline ? decodeGCJPolyline(s.polyline) : undefined,
      }))

      const geometry = steps.flatMap((s) => s.geometry ?? [])
      return {
        distance: Number(path.distance ?? 0),
        duration: Number(path.duration ?? 0),
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
      const json = await requestJson<AmapDistance>(settings, service, '/distance', {
        origins: origins.map(fmtLngLat).join('|'),
        destination: destinations.map(fmtLngLat).join('|'),
        type: options?.strategy === 'duration' ? 1 : 0,
      })
      const results = json?.results ?? []
      return {
        rows: [
          results.map((r) => ({
            distance: Number(r.distance ?? 0),
            duration: Number(r.duration ?? 0),
            ok: r.distance !== undefined,
          })),
        ],
        provider: service,
      }
    },
  }
}
