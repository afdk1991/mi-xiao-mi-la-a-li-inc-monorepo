// IndexedDB 持久化层（支持大量客户地址数据）
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Customer, Depot } from './types'

/** 轨迹记录（自建数据服务：本地 IndexedDB 轨迹库，替代已下线的高德云图） */
export interface TrackRecord {
  id: string
  name: string
  createdAt: number
  /** 来源：local=本地生成/导入；falcon=已同步至高德猎鹰 */
  source: 'local' | 'falcon'
  /** 原始轨迹 [lat,lng][] */
  original: [number, number][]
  /** 纠偏后轨迹 [lat,lng][]（未纠偏时为空数组） */
  corrected: [number, number][]
  /** 纠偏后里程（米） */
  distance: number
  /** 原始里程（米） */
  rawDistance: number
  pointCount: number
  /** 已同步猎鹰时的服务端标识 */
  falcon?: { sid: string; tid: string; trid?: string }
}

interface DeliveryDB extends DBSchema {
  customers: {
    key: string
    value: Customer
    indexes: { 'by-order': number; 'by-created': number }
  }
  tracks: {
    key: string
    value: TrackRecord
    indexes: { 'by-time': number }
  }
  meta: {
    key: string
    value: unknown
  }
}

const DB_NAME = 'delivery-router'
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase<DeliveryDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<DeliveryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('customers')) {
          const store = db.createObjectStore('customers', { keyPath: 'id' })
          store.createIndex('by-order', 'order')
          store.createIndex('by-created', 'createdAt')
        }
        if (!db.objectStoreNames.contains('tracks')) {
          const t = db.createObjectStore('tracks', { keyPath: 'id' })
          t.createIndex('by-time', 'createdAt')
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta')
        }
      },
    })
  }
  return dbPromise
}

export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDB()
  const list = await db.getAll('customers')
  return list.sort((a, b) => a.createdAt - b.createdAt)
}

export async function putCustomer(c: Customer): Promise<void> {
  const db = await getDB()
  await db.put('customers', c)
}

export async function putCustomers(list: Customer[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('customers', 'readwrite')
  await Promise.all(list.map((c) => tx.store.put(c)))
  await tx.done
}

export async function deleteCustomer(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('customers', id)
}

export async function deleteCustomers(ids: string[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('customers', 'readwrite')
  await Promise.all(ids.map((id) => tx.store.delete(id)))
  await tx.done
}

export async function clearCustomers(): Promise<void> {
  const db = await getDB()
  await db.clear('customers')
}

export async function getDepot(): Promise<Depot | null> {
  const db = await getDB()
  return ((await db.get('meta', 'depot')) as Depot) ?? null
}

export async function saveDepot(d: Depot): Promise<void> {
  const db = await getDB()
  await db.put('meta', d, 'depot')
}

/* ---------- 通用键值（meta）：用于备份快照等小体积数据 ---------- */

export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDB()
  return (await db.get('meta', key)) as T | undefined
}

export async function putMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  await db.put('meta', value, key)
}

export async function deleteMeta(key: string): Promise<void> {
  const db = await getDB()
  await db.delete('meta', key)
}

export async function listMetaKeys(): Promise<string[]> {
  const db = await getDB()
  return (await db.getAllKeys('meta')) as string[]
}

/* ---------- 自建轨迹库（tracks） ---------- */

export async function getAllTracks(): Promise<TrackRecord[]> {
  const db = await getDB()
  const list = await db.getAll('tracks')
  return list.sort((a, b) => b.createdAt - a.createdAt)
}

export async function putTrack(t: TrackRecord): Promise<void> {
  const db = await getDB()
  await db.put('tracks', t)
}

export async function deleteTrack(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('tracks', id)
}

export async function clearTracks(): Promise<void> {
  const db = await getDB()
  await db.clear('tracks')
}
