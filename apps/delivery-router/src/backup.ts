// 数据备份与恢复：全量 JSON 导出/导入 + 本地自动快照
//
// 设计要点：
// 1. 备份文件**绝不携带任何地图凭证**（Key / 安全密钥 / 签名私钥），可安全离线归档或分享；
// 2. 导入分「合并」与「覆盖」两种模式，覆盖前由 UI 二次确认；
// 3. 自动快照写入 IndexedDB（meta 库），只保留最近 N 份，防止误删/误改后可一键回滚。
import {
  clearCustomers,
  clearTracks,
  getAllCustomers,
  getAllTracks,
  getDepot,
  getMeta,
  deleteMeta,
  listMetaKeys,
  putCustomers,
  putMeta,
  putTrack,
  saveDepot,
  type TrackRecord,
} from './db'
import { DEFAULT_SETTINGS, EMPTY_KEYS, type MapSettings } from './mapservice'
import type { Customer, Depot } from './types'

export const BACKUP_SCHEMA = 1

/** 随备份迁移的 localStorage 键白名单（全部为非凭证配置） */
const LS_KEYS = ['delivery.mapSettings', 'delivery.routeOptions'] as const

/** 写入备份的「地图设置」键名：其中的 keys 必须被剔除 */
const SETTINGS_LS_KEY = 'delivery.mapSettings'

/**
 * 剔除 localStorage 值里的地图凭证。
 *
 * 这是**安全兜底**而非可选优化：`delivery.mapSettings` 里存着完整的 MapSettings，
 * 其中 keys 在「直连模式」下就是用户手填的高德/腾讯/百度 Key。早前把该键整段塞进备份，
 * 等于把凭证写进了可任意传阅的备份文件与云端 KV——与「备份绝不含 Key」的设计约束直接冲突。
 * 解析失败时返回空串（宁可不迁移，也不能带出无法校验的内容）。
 */
export function sanitizeLsValue(key: string, value: string): string {
  if (key !== SETTINGS_LS_KEY) return value
  try {
    const p = JSON.parse(value) as Partial<MapSettings> & { keys?: unknown }
    if (!p || typeof p !== 'object') return ''
    return JSON.stringify({ ...p, keys: { ...EMPTY_KEYS } })
  } catch {
    return ''
  }
}

/** 快照键前缀与最大保留份数 */
const SNAP_PREFIX = 'snapshot:'
const SNAP_SIG = 'snapshot.sig'
export const MAX_SNAPSHOTS = 5

export interface BackupPayload {
  schema: number
  app: 'delivery-router'
  appVersion: string
  createdAt: number
  customers: Customer[]
  tracks: TrackRecord[]
  depot: Depot | null
  /** 已剔除所有凭证字段的地图设置（service / amapPref / proxy） */
  settings: Pick<MapSettings, 'service' | 'amapPref' | 'proxy'> | null
  /** 恒为 true：备份中不含任何 Key，导入后如需国内精准服务请重新填写 */
  keysExcluded: true
  /** 其他非凭证配置（路线选项等）原样保存，键为白名单内的 localStorage 键 */
  localStorage: Record<string, string>
}

export interface ApplyResult {
  customers: number
  tracks: number
  settings: boolean
}

export interface SnapshotMeta {
  key: string
  createdAt: number
  label: string
  customers: number
  tracks: number
}

/* ------------------------------ 构建备份 ------------------------------ */

/** 读取当前全部业务数据，组装为备份对象（不含任何凭证） */
export async function buildBackup(): Promise<BackupPayload> {
  const [customers, tracks, depot, settings] = await Promise.all([
    getAllCustomers(),
    getAllTracks(),
    getDepot(),
    readSettings(),
  ])
  const ls: Record<string, string> = {}
  for (const k of LS_KEYS) {
    const v = localStorage.getItem(k)
    // 地图设置键整段带有 keys，必须先剔除再入备份
    const safe = v ? sanitizeLsValue(k, v) : ''
    if (safe) ls[k] = safe
  }
  return {
    schema: BACKUP_SCHEMA,
    app: 'delivery-router',
    appVersion: '1.0.0',
    createdAt: Date.now(),
    customers,
    tracks,
    depot,
    settings,
    keysExcluded: true,
    localStorage: ls,
  }
}

/** 读取地图设置并剔除凭证字段 */
function readSettings(): BackupPayload['settings'] {
  try {
    const raw = localStorage.getItem('delivery.mapSettings')
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<MapSettings>
    return {
      service: p.service ?? DEFAULT_SETTINGS.service,
      amapPref: p.amapPref === 'web' || p.amapPref === 'js' ? p.amapPref : 'auto',
      proxy: typeof p.proxy === 'string' ? p.proxy : DEFAULT_SETTINGS.proxy,
    }
  } catch {
    return null
  }
}

/** 触发浏览器下载备份文件（文件名带日期） */
export function downloadBackup(payload: BackupPayload): void {
  const stamp = new Date(payload.createdAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  const name = `配送数据备份_${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(
    stamp.getDate(),
  )}_${pad(stamp.getHours())}${pad(stamp.getMinutes())}.json`
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 延迟撤销：Firefox/Safari 在 click 后立刻 revoke 有可能把尚未开始的下载取消掉
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/* ------------------------------ 解析与校验 ------------------------------ */

/** 解析备份文本；结构不合法时抛出可直接展示给用户的中文错误 */
export function parseBackup(text: string): BackupPayload {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('文件不是合法 JSON，请确认选择的是本应用导出的备份文件')
  }
  if (!raw || typeof raw !== 'object') throw new Error('备份内容为空或格式不正确')
  const o = raw as Record<string, unknown>
  if (o.app && o.app !== 'delivery-router') {
    throw new Error('这不是配送定位系统的备份文件')
  }
  const customers = Array.isArray(o.customers) ? (o.customers as Customer[]) : null
  if (!customers) throw new Error('备份文件缺少客户数据（customers）')
  const tracks = Array.isArray(o.tracks) ? (o.tracks as TrackRecord[]) : []
  const depot = (o.depot as Depot | null) ?? null
  const settings = (o.settings as BackupPayload['settings']) ?? null
  const ls: Record<string, string> = {}
  const rawLs = o.localStorage
  if (rawLs && typeof rawLs === 'object') {
    for (const k of LS_KEYS) {
      const v = (rawLs as Record<string, unknown>)[k]
      if (typeof v !== 'string') continue
      // 外部文件同样不可信：即便它塞了带 Key 的地图设置，也在这里被剔干净
      const safe = sanitizeLsValue(k, v)
      if (safe) ls[k] = safe
    }
  }
  return {
    schema: typeof o.schema === 'number' ? o.schema : BACKUP_SCHEMA,
    app: 'delivery-router',
    appVersion: typeof o.appVersion === 'string' ? o.appVersion : '未知',
    createdAt: typeof o.createdAt === 'number' ? o.createdAt : Date.now(),
    customers: customers.filter(isCustomer),
    tracks: tracks.filter(isTrack),
    depot: depot && typeof depot.name === 'string' ? depot : null,
    settings,
    keysExcluded: true,
    localStorage: ls,
  }
}

function isCustomer(c: unknown): c is Customer {
  if (!c || typeof c !== 'object') return false
  const o = c as Record<string, unknown>
  return typeof o.id === 'string' && typeof o.address === 'string'
}

function isTrack(t: unknown): t is TrackRecord {
  if (!t || typeof t !== 'object') return false
  const o = t as Record<string, unknown>
  return typeof o.id === 'string' && Array.isArray(o.original)
}

/* ------------------------------ 应用备份 ------------------------------ */

/**
 * 把备份写入本地库。
 * - replace：清空后写入（覆盖模式，调用方需二次确认）
 * - merge：按 id 增量合并，已存在记录跳过
 */
export async function applyBackup(
  payload: BackupPayload,
  mode: 'merge' | 'replace',
): Promise<ApplyResult> {
  let customers = payload.customers
  let tracks = payload.tracks
  if (mode === 'replace') {
    await clearCustomers()
    await clearTracks()
  } else {
    const exist = new Set((await getAllCustomers()).map((c) => c.id))
    customers = customers.filter((c) => !exist.has(c.id))
    const existT = new Set((await getAllTracks()).map((t) => t.id))
    tracks = tracks.filter((t) => !existT.has(t.id))
  }
  if (customers.length) await putCustomers(customers)
  for (const t of tracks) await putTrack(t)
  if (payload.depot) await saveDepot(payload.depot)

  let settingsApplied = false
  if (payload.settings) {
    const cur = readSettings() ?? {
      service: DEFAULT_SETTINGS.service,
      amapPref: DEFAULT_SETTINGS.amapPref,
      proxy: DEFAULT_SETTINGS.proxy,
    }
    const merged: MapSettings = {
      ...DEFAULT_SETTINGS,
      ...cur,
      service: payload.settings.service ?? cur.service,
      amapPref: payload.settings.amapPref ?? cur.amapPref,
      proxy: payload.settings.proxy ?? cur.proxy,
      // 凭证永不从备份恢复
      keys: { ...DEFAULT_SETTINGS.keys },
    }
    localStorage.setItem('delivery.mapSettings', JSON.stringify(merged))
    settingsApplied = true
  }
  for (const [k, v] of Object.entries(payload.localStorage)) {
    if (k === SETTINGS_LS_KEY) continue // 上面已单独处理（且不会带 Key）
    if (!LS_KEYS.includes(k as (typeof LS_KEYS)[number])) continue // 只认白名单键
    const safe = sanitizeLsValue(k, v)
    if (safe) localStorage.setItem(k, safe)
  }
  return { customers: customers.length, tracks: tracks.length, settings: settingsApplied }
}

/* ------------------------------ 本地快照 ------------------------------ */

/** 列出全部快照（按时间倒序） */
export async function listSnapshots(): Promise<SnapshotMeta[]> {
  const keys = (await listMetaKeys()).filter((k) => k.startsWith(SNAP_PREFIX))
  const out: SnapshotMeta[] = []
  for (const key of keys) {
    const snap = await getMeta<{ meta: SnapshotMeta; payload: BackupPayload }>(key)
    if (snap?.meta) out.push(snap.meta)
  }
  return out.sort((a, b) => b.createdAt - a.createdAt)
}

/** 保存一份快照（默认「自动」，用户可传自定义标签），超出上限自动清理最旧的 */
export async function saveSnapshot(label = '自动'): Promise<SnapshotMeta> {
  const payload = await buildBackup()
  const key = `${SNAP_PREFIX}${Date.now()}`
  const meta: SnapshotMeta = {
    key,
    createdAt: payload.createdAt,
    label,
    customers: payload.customers.length,
    tracks: payload.tracks.length,
  }
  await putMeta(key, { meta, payload })
  await pruneSnapshots()
  return meta
}

/** 只保留最近 MAX_SNAPSHOTS 份快照 */
export async function pruneSnapshots(max = MAX_SNAPSHOTS): Promise<void> {
  const all = await listSnapshots()
  for (const s of all.slice(max)) await deleteMeta(s.key)
}

/** 把某份快照恢复到当前数据库（覆盖模式） */
export async function restoreSnapshot(key: string): Promise<ApplyResult> {
  const snap = await getMeta<{ payload: BackupPayload }>(key)
  if (!snap?.payload) throw new Error('快照不存在或已损坏')
  return applyBackup(parseBackup(JSON.stringify(snap.payload)), 'replace')
}

export async function removeSnapshot(key: string): Promise<void> {
  await deleteMeta(key)
}

/** 数据指纹：用于在自动快照前判断数据是否真的变化过 */
export function dataSignature(customers: Customer[], depot: Depot | null): string {
  const ids = customers.map((c) => c.id).join(',')
  const flags = customers.map((c) => (c.visited ? '1' : '0')).join('')
  return `${customers.length}|${ids}|${flags}|${depot?.lat ?? 0},${depot?.lng ?? 0}`
}

/**
 * 自动快照：数据指纹变化时才写入，避免频繁操作产生大量重复快照。
 * 返回是否新建了快照。
 */
export async function maybeAutoSnapshot(
  customers: Customer[],
  depot: Depot | null,
): Promise<boolean> {
  const sig = dataSignature(customers, depot)
  try {
    const last = await getMeta<string>(SNAP_SIG)
    if (last === sig) return false
  } catch {
    /* ignore */
  }
  await saveSnapshot('自动')
  await putMeta(SNAP_SIG, sig)
  return true
}

/** 备份摘要：用于 UI 展示「将导入 X 条客户 / Y 条轨迹」 */
export function summarize(payload: BackupPayload): string {
  const d = new Date(payload.createdAt)
  const when = Number.isFinite(d.getTime())
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    : '未知时间'
  return `${when} · ${payload.customers.length} 条客户 · ${payload.tracks.length} 条轨迹`
}
