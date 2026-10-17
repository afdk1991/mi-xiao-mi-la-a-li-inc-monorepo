// 数据访问层：users / addresses / routes / attractions 的增删改查。

import { db } from './db.ts'
import type { AddressItem, AttractionItem, RouteItem } from './types.ts'

// ---- users ----
interface UserRow {
  id: number
  username: string
  email: string
  password_hash: string
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined
}

export function findUserByLogin(identifier: string): UserRow | undefined {
  // 登录标识既可以是邮箱也可以是用户名
  return db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(identifier, identifier) as UserRow | undefined
}

export function findUserById(id: number): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
}

export function createUser(username: string, email: string, passwordHash: string): number {
  const r = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run(username, email, passwordHash)
  return Number(r.lastInsertRowid)
}

// ---- addresses ----
interface AddressRow {
  id: number
  user_id: number
  name: string
  address: string
  latitude: number
  longitude: number
  city: string | null
  is_start: number
  is_end: number
  order_index: number
  created_at: string
}

function toAddress(row: AddressRow): AddressItem {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    city: row.city ?? undefined,
    isStart: !!row.is_start,
    isEnd: !!row.is_end,
    orderIndex: row.order_index,
    createdAt: row.created_at,
  }
}

export function listAddresses(userId: number): AddressItem[] {
  const rows = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY order_index, id').all(userId) as AddressRow[]
  return rows.map(toAddress)
}

export function getAddress(userId: number, id: number): AddressItem | undefined {
  const row = db.prepare('SELECT * FROM addresses WHERE user_id = ? AND id = ?').get(userId, id) as AddressRow | undefined
  return row ? toAddress(row) : undefined
}

export function getAddressesByIds(userId: number, ids: number[]): AddressItem[] {
  const out: AddressItem[] = []
  for (const id of ids) {
    const a = getAddress(userId, id)
    if (a) out.push(a)
  }
  return out
}

export function insertAddress(userId: number, a: Omit<AddressItem, 'id' | 'createdAt'>): AddressItem {
  const r = db
    .prepare(
      `INSERT INTO addresses (user_id, name, address, latitude, longitude, city, is_start, is_end, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(userId, a.name, a.address, a.latitude, a.longitude, a.city ?? null, a.isStart ? 1 : 0, a.isEnd ? 1 : 0, a.orderIndex ?? 0)
  return getAddress(userId, Number(r.lastInsertRowid))!
}

export function updateAddress(userId: number, id: number, patch: Partial<AddressItem>): AddressItem | undefined {
  const current = getAddress(userId, id)
  if (!current) return undefined
  const next: AddressItem = {
    ...current,
    name: patch.name ?? current.name,
    address: patch.address ?? current.address,
    latitude: patch.latitude ?? current.latitude,
    longitude: patch.longitude ?? current.longitude,
    city: patch.city !== undefined ? patch.city : current.city,
    isStart: patch.isStart ?? current.isStart,
    isEnd: patch.isEnd ?? current.isEnd,
    orderIndex: patch.orderIndex ?? current.orderIndex,
  }
  db.prepare(
    `UPDATE addresses SET name = ?, address = ?, latitude = ?, longitude = ?, city = ?, is_start = ?, is_end = ?, order_index = ?
     WHERE user_id = ? AND id = ?`,
  ).run(next.name, next.address, next.latitude, next.longitude, next.city ?? null, next.isStart ? 1 : 0, next.isEnd ? 1 : 0, next.orderIndex, userId, id)
  return getAddress(userId, id)
}

export function deleteAddress(userId: number, id: number): boolean {
  const r = db.prepare('DELETE FROM addresses WHERE user_id = ? AND id = ?').run(userId, id)
  return r.changes > 0
}

// ---- routes ----
interface RouteRow {
  id: number
  user_id: number
  name: string
  optimization_mode: string
  total_distance: number
  address_ids: string
  ordered_addresses: string
  created_at: string
}

function toRoute(row: RouteRow): RouteItem {
  return {
    id: row.id,
    name: row.name,
    optimizationMode: (row.optimization_mode as RouteItem['optimizationMode']) ?? 'shortest',
    totalDistance: row.total_distance,
    addressIds: safeParseArray(row.address_ids),
    orderedAddresses: safeParseArray(row.ordered_addresses),
    createdAt: row.created_at,
  }
}

function safeParseArray<T>(s: string): T[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? (v as T[]) : []
  } catch {
    return []
  }
}

export function listRoutes(userId: number): RouteItem[] {
  const rows = db.prepare('SELECT * FROM routes WHERE user_id = ? ORDER BY id DESC').all(userId) as RouteRow[]
  return rows.map(toRoute)
}

export function getRoute(userId: number, id: number): RouteItem | undefined {
  const row = db.prepare('SELECT * FROM routes WHERE user_id = ? AND id = ?').get(userId, id) as RouteRow | undefined
  return row ? toRoute(row) : undefined
}

export function insertRoute(userId: number, r: Omit<RouteItem, 'id' | 'createdAt'>): RouteItem {
  const res = db
    .prepare(
      `INSERT INTO routes (user_id, name, optimization_mode, total_distance, address_ids, ordered_addresses)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(userId, r.name, r.optimizationMode, r.totalDistance, JSON.stringify(r.addressIds), JSON.stringify(r.orderedAddresses))
  return getRoute(userId, Number(res.lastInsertRowid))!
}

export function deleteRoute(userId: number, id: number): boolean {
  const r = db.prepare('DELETE FROM routes WHERE user_id = ? AND id = ?').run(userId, id)
  return r.changes > 0
}

// ---- attractions ----
export function queryAttractions(params: { city?: string; category?: string; region?: string; search?: string; limit: number; offset: number }): { items: AttractionItem[]; total: number } {
  const where: string[] = []
  const args: (string | number)[] = []
  if (params.city) {
    where.push('city = ?')
    args.push(params.city)
  }
  if (params.category) {
    where.push('category = ?')
    args.push(params.category)
  }
  if (params.region) {
    where.push('region = ?')
    args.push(params.region)
  }
  if (params.search) {
    where.push('(name LIKE ? OR address LIKE ?)')
    args.push(`%${params.search}%`, `%${params.search}%`)
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM attractions${whereSql}`).get(...args) as { n: number }).n
  const rows = db
    .prepare(`SELECT * FROM attractions${whereSql} ORDER BY id LIMIT ? OFFSET ?`)
    .all(...args, params.limit, params.offset) as Array<{
    id: number
    name: string
    address: string
    latitude: number
    longitude: number
    city: string
    category: string
    region: string
  }>
  return { items: rows, total }
}

export function getAttraction(id: number): AttractionItem | undefined {
  return db.prepare('SELECT * FROM attractions WHERE id = ?').get(id) as AttractionItem | undefined
}

export function listCities(): Array<{ city: string; count: number }> {
  return db.prepare('SELECT city, COUNT(*) AS count FROM attractions GROUP BY city ORDER BY count DESC, city').all() as Array<{ city: string; count: number }>
}
