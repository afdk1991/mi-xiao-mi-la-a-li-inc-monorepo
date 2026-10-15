// 统一配置加载。
// 消除各项目「各自读取 Key / env」的分散实现，收敛为统一入口：
// 环境变量 → MapSettings 一次装配，且源码零硬编码凭证。

import type { MapSettings } from '@afdk1991/shared-map'

// 地图配置的单一真源仍在 @afdk1991/shared-map，此处 re-export 保证上层只记一个入口
export { getKey, hasCredentials, DEFAULT_SETTINGS, EMPTY_KEYS } from '@afdk1991/shared-map'

/** 地图相关环境变量名（部署端注入，前端不落盘） */
export const ENV_KEYS = {
  AMAP_WEB_KEY: 'AMAP_WEB_KEY',
  AMAP_SIG: 'AMAP_SIG',
  AMAP_KEY: 'AMAP_KEY',
  AMAP_SECRET: 'AMAP_SECRET',
  TENCENT_KEY: 'TENCENT_KEY',
  BAIDU_AK: 'BAIDU_AK',
  MAP_PROXY: 'MAP_PROXY',
} as const

export type EnvKeyAlias = keyof typeof ENV_KEYS

/**
 * 跨平台读取单个环境变量。
 * 依次尝试：import.meta.env（Vite）→ process.env（Node）→ globalThis（注入式运行时）。
 */
export function readEnv(name: string): string {
  // Vite / EdgeOne 构建期注入
  const metaEnv = (globalThis as unknown as { import?: { meta?: { env?: Record<string, string> } } })
    .import?.meta?.env
  if (metaEnv && typeof metaEnv[name] === 'string') return metaEnv[name] as string

  // Node 运行时
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
    .process
  const fromProcess = proc?.env?.[name]
  if (typeof fromProcess === 'string') return fromProcess

  // 全局注入（边缘函数 / 小程序）
  const globalBag = (globalThis as unknown as Record<string, unknown>)[name]
  if (typeof globalBag === 'string') return globalBag

  return ''
}

/** 批量读取环境变量 */
export function loadEnv(names: string[] = Object.keys(ENV_KEYS)): Record<string, string> {
  const out: Record<string, string> = {}
  for (const n of names) {
    const v = readEnv(n)
    if (v) out[n] = v
  }
  return out
}

/**
 * 由环境变量装配 MapSettings。
 * 约定：只要配置了 MAP_PROXY 或任一凭证，即视为「已注入」，
 * 否则保持默认代理地址 /api/map（由服务端注入 Key）。
 */
export function buildMapSettings(overrides?: Partial<MapSettings>): MapSettings {
  const proxy = overrides?.proxy ?? readEnv(ENV_KEYS.MAP_PROXY) ?? '/api/map'
  const service = overrides?.service ?? 'amap'

  return {
    service,
    amapPref: overrides?.amapPref ?? 'auto',
    proxy,
    keys: {
      amap: overrides?.keys?.amap ?? readEnv(ENV_KEYS.AMAP_KEY),
      amapSecret: overrides?.keys?.amapSecret ?? readEnv(ENV_KEYS.AMAP_SECRET),
      amapWeb: overrides?.keys?.amapWeb ?? readEnv(ENV_KEYS.AMAP_WEB_KEY),
      amapSig: overrides?.keys?.amapSig ?? readEnv(ENV_KEYS.AMAP_SIG),
      tencent: overrides?.keys?.tencent ?? readEnv(ENV_KEYS.TENCENT_KEY),
      baidu: overrides?.keys?.baidu ?? readEnv(ENV_KEYS.BAIDU_AK),
    },
  }
}
