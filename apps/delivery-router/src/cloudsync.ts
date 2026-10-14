// 云同步：凭「同步码」把备份存到 EdgeOne Makers 边缘 KV（端点 /api/sync）。
// 解决换设备/卸载丢数据的问题；无需自建服务器，也无需登录账号。
// 云端未开通 KV 时端点返回 501（KV_NOT_ENABLED），此模块返回 enabled=false 供 UI 降级。
import { buildBackup, parseBackup, type BackupPayload } from './backup'
import type { MapSettings } from './mapservice'

const CODE_KEY = 'delivery.syncCode'
const LAST_SYNC_KEY = 'delivery.lastSync'

/** 同步码规范：6-16 位字母或数字 */
export function isValidCode(code: string): boolean {
  return /^[A-Za-z0-9]{6,16}$/.test(code.trim())
}

/** 生成 8 位易读同步码（去掉易混淆的 0/O/1/I） */
export function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  const buf = new Uint32Array(8)
  crypto.getRandomValues(buf)
  for (let i = 0; i < 8; i++) out += chars[buf[i] % chars.length]
  return out
}

/** 由地图代理地址推导 API 基址（/api/map → /api），缺省 /api */
export function apiBase(settings: MapSettings): string {
  const proxy = (settings.proxy || '/api/map').trim()
  const base = proxy.replace(/\/map\/?$/, '') || '/api'
  return base.replace(/\/$/, '')
}

export function savedCode(): string {
  return localStorage.getItem(CODE_KEY) || ''
}

export function saveCode(code: string): void {
  localStorage.setItem(CODE_KEY, code.trim())
}

export function lastSyncAt(): number | null {
  const v = localStorage.getItem(LAST_SYNC_KEY)
  const n = v ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
}

function setLastSyncAt(ts: number): void {
  localStorage.setItem(LAST_SYNC_KEY, String(ts))
}

export interface CloudStatus {
  /** 云端功能是否可用（未开通 KV 为 false） */
  enabled: boolean
  exists: boolean
  updatedAt: number | null
  customers: number
  tracks: number
  message?: string
}

/** 解析响应 JSON；非 JSON（如纯静态站点回落首页）返回 null */
async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  const text = await res.text()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}

/** 查询云端是否有该同步码的数据 */
export async function cloudStatus(code: string, settings: MapSettings): Promise<CloudStatus> {
  const res = await fetch(`${apiBase(settings)}/sync?code=${encodeURIComponent(code.trim())}`)
  const j = await readJson(res)
  if (res.status === 501 || j === null) {
    // 501=KV 未开通；null=返回的不是 JSON（纯静态部署下 /api/sync 会回落首页）
    return {
      enabled: false,
      exists: false,
      updatedAt: null,
      customers: 0,
      tracks: 0,
      message:
        j === null
          ? '云端接口未部署（当前站点未包含边缘函数）'
          : String((j as { message?: string }).message ?? '云同步未开通'),
    }
  }
  if (!res.ok) throw new Error(String((j as { message?: string }).message ?? `云端查询失败（HTTP ${res.status}）`))
  return {
    enabled: true,
    exists: !!j.exists,
    updatedAt: typeof j.updatedAt === 'number' ? j.updatedAt : null,
    customers: typeof j.customers === 'number' ? j.customers : 0,
    tracks: typeof j.tracks === 'number' ? j.tracks : 0,
  }
}

export interface UploadResult {
  updatedAt: number
  bytes: number
  customers: number
  tracks: number
}

/** 上传当前本机数据到云端（覆盖） */
export async function cloudUpload(code: string, settings: MapSettings): Promise<UploadResult> {
  if (!isValidCode(code)) throw new Error('同步码需为 6-16 位字母或数字')
  const payload = await buildBackup()
  const res = await fetch(`${apiBase(settings)}/sync?code=${encodeURIComponent(code.trim())}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const j = (await readJson(res)) ?? ({} as Record<string, unknown>)
  if (!res.ok || j.ok === false) {
    throw new Error(String(j.message ?? `上传失败（HTTP ${res.status}）`))
  }
  const updatedAt = typeof j.updatedAt === 'number' ? j.updatedAt : Date.now()
  setLastSyncAt(updatedAt)
  saveCode(code)
  return {
    updatedAt,
    bytes: typeof j.bytes === 'number' ? j.bytes : 0,
    customers: payload.customers.length,
    tracks: payload.tracks.length,
  }
}

/** 从云端取回备份（不落库，交给 applyBackup 决定合并/覆盖） */
export async function cloudDownload(code: string, settings: MapSettings): Promise<BackupPayload> {
  if (!isValidCode(code)) throw new Error('同步码需为 6-16 位字母或数字')
  const res = await fetch(`${apiBase(settings)}/sync?code=${encodeURIComponent(code.trim())}`)
  const j = (await readJson(res)) ?? ({} as Record<string, unknown>)
  if (!res.ok) throw new Error(String(j.message ?? `下载失败（HTTP ${res.status}）`))
  if (!j.exists) throw new Error('该同步码下暂无云端数据')
  saveCode(code)
  return parseBackup(JSON.stringify(j.data ?? {}))
}

/** 删除云端数据 */
export async function cloudDelete(code: string, settings: MapSettings): Promise<void> {
  const res = await fetch(`${apiBase(settings)}/sync?code=${encodeURIComponent(code.trim())}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const j = (await readJson(res)) ?? ({} as Record<string, unknown>)
    throw new Error(String(j.message ?? `删除失败（HTTP ${res.status}）`))
  }
}
