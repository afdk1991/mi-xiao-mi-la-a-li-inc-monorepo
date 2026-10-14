// 天气查询：根据城市 adcode 拉取实况 + 多日预报，用于配送调度中的恶劣天气改派提示。
// 支持：amap（高德 weatherInfo）、tencent（腾讯 weather）。osm 无天气服务，返回 null。
// 仅当配置了对应 Web 服务 Key 时可用；缺 Key 时调用方应静默隐藏。

import { hasCredentials, type MapSettings } from './mapservice'
import { qqUrl } from './proxy'
import { amapWeather } from './amap'
import { reverseGeocodeAdcode } from './geocode'

export interface WeatherNow {
  province: string
  city: string
  weather: string
  temperature: number
  windDirection: string
  windPower: string
  humidity: string
}

export interface WeatherForecast {
  date: string
  week: string
  dayWeather: string
  nightWeather: string
  dayTemp: number
  nightTemp: number
  dayWind: string
  dayPower: string
}

export interface WeatherInfo {
  adcode: string
  cityName: string
  now: WeatherNow | null
  forecast: WeatherForecast[]
}

// 恶劣天气关键词：命中任一词即视为可能影响配送，给出改派/警示提示
const SEVERE_KEYWORDS = ['雨', '雪', '雷', '雾', '霾', '沙', '台', '暴', '冰', '霜', '高温', '大风', '大風']

/** 判断天气文本是否包含恶劣天气。空文本返回 false。 */
export function isSevereWeather(text: string): boolean {
  if (!text) return false
  return SEVERE_KEYWORDS.some((k) => text.includes(k))
}

/** 取天气整体严重度：返回命中的恶劣天气描述集合（用于前端高亮提示） */
export function severeDays(info: WeatherInfo): string[] {
  const out: string[] = []
  if (info.now && isSevereWeather(info.now.weather)) {
    out.push(`今日 ${info.now.weather} ${info.now.temperature}℃`)
  }
  for (const f of info.forecast) {
    const hit = isSevereWeather(f.dayWeather) || isSevereWeather(f.nightWeather)
    if (hit) {
      const w = isSevereWeather(f.dayWeather) ? f.dayWeather : f.nightWeather
      out.push(`${f.week ?? f.date} ${w}`)
    }
  }
  return out
}

/**
 * 按 adcode 查询天气。
 */
export async function fetchWeather(
  adcode: string,
  settings: MapSettings,
  signal?: AbortSignal,
): Promise<WeatherInfo | null> {
  if (settings.service === 'osm' || !hasCredentials(settings)) return null
  try {
    if (settings.service === 'amap') {
      // 高德：网关择优（Web 服务 weatherInfo → JS API AMap.Weather）
      const w = await amapWeather(adcode, settings, signal)
      return w ? { adcode, cityName: w.cityName, now: w.now, forecast: w.forecast } : null
    }
    return await weatherTencent(adcode, settings, signal)
  } catch {
    return null
  }
}

/**
 * 按经纬度查询天气：先逆地理编码拿到 adcode，再查天气。
 */
export async function fetchWeatherByLocation(
  lat: number,
  lng: number,
  settings: MapSettings,
  signal?: AbortSignal,
): Promise<WeatherInfo | null> {
  const adcode = await reverseGeocodeAdcode(lat, lng, settings, signal)
  if (!adcode) return null
  return fetchWeather(adcode, settings, signal)
}

async function weatherTencent(
  adcode: string,
  settings: MapSettings,
  signal?: AbortSignal,
): Promise<WeatherInfo | null> {
  const url = qqUrl('https://apis.map.qq.com/ws/weather/v1/', { city: adcode }, settings)
  const res = await fetch(url, { signal })
  if (!res.ok) return null
  const json = (await res.json()) as {
    status: number
    result?: {
      now?: {
        city?: string
        province?: string
        weather?: string
        temp?: number
        wind_direction?: string
        wind_power?: string
        humidity?: string
      }
      forecasts?: Array<{
        date?: string
        week?: string
        day_weather?: string
        night_weather?: string
        day_temp?: number
        night_temp?: number
        day_wind?: string
        day_power?: string
      }>
    }
  }
  if (json.status !== 0 || !json.result) return null
  const n = json.result.now
  const now: WeatherNow | null = n
    ? {
        province: n.province || '',
        city: n.city || '',
        weather: n.weather || '',
        temperature: Number(n.temp ?? 0),
        windDirection: n.wind_direction || '',
        windPower: n.wind_power || '',
        humidity: n.humidity || '',
      }
    : null
  const forecast: WeatherForecast[] = (json.result.forecasts ?? []).map((c) => ({
    date: c.date || '',
    week: c.week || '',
    dayWeather: c.day_weather || '',
    nightWeather: c.night_weather || '',
    dayTemp: Number(c.day_temp ?? 0),
    nightTemp: Number(c.night_temp ?? 0),
    dayWind: c.day_wind || '',
    dayPower: c.day_power || '',
  }))
  return { adcode, cityName: n?.city || '', now, forecast }
}
