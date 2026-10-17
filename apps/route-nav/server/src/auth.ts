// 认证：scrypt 密码哈希 + HMAC 无状态令牌。
// 令牌格式：base64url(JSON payload).base64url(hmac_sha256)，payload = { uid, exp }。
// 签名密钥优先取环境变量 AUTH_SECRET，否则首次生成随机密钥并持久化到 meta 表（重启不失效）。

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { metaGet, metaSet } from './db.ts'
import type { User } from './types.ts'

const SECRET_KEY_META = 'auth_secret'
const TOKEN_TTL_DAYS = 30

function getSecret(): string {
  const fromEnv = process.env.AUTH_SECRET
  if (fromEnv && fromEnv.length >= 16) return fromEnv
  let secret = metaGet(SECRET_KEY_META)
  if (!secret) {
    secret = randomBytes(32).toString('hex')
    metaSet(SECRET_KEY_META, secret)
  }
  return secret
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = parts[1]
  const expected = Buffer.from(parts[2], 'hex')
  const actual = scryptSync(password, salt, expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url')
}

export function issueToken(userId: number): string {
  const payload = b64url(Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + TOKEN_TTL_DAYS * 86400_000 })))
  const sig = b64url(createHmac('sha256', getSecret()).update(payload).digest())
  return `${payload}.${sig}`
}

export function verifyToken(token: string): number | null {
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expect = b64url(createHmac('sha256', getSecret()).update(payload).digest())
  // 长度一致才做常量时间比较
  if (sig.length !== expect.length) return null
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { uid?: number; exp?: number }
    if (!data.uid || !data.exp || data.exp < Date.now()) return null
    return data.uid
  } catch {
    return null
  }
}

/** 从 Authorization: Bearer <token> 头解析用户 id；无效返回 null */
export function userFromAuthHeader(header: string | undefined): number | null {
  if (!header) return null
  const m = /^Bearer\s+(.+)$/i.exec(header.trim())
  if (!m) return null
  return verifyToken(m[1].trim())
}

/** 脱敏后的用户对象（不含密码哈希） */
export function publicUser(row: { id: number; username: string; email: string }): User {
  return { id: row.id, username: row.username, email: row.email }
}
