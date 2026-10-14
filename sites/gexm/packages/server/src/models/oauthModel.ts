import { getDb } from './index'
import { generateId } from '../utils/response'
import { encrypt, decrypt } from '../utils/crypto'
import type { OAuthAccount } from '../services/oauth/interfaces'

function decryptAccount(account: OAuthAccount): OAuthAccount {
  return {
    ...account,
    accessToken: decrypt(account.accessToken),
    refreshToken: decrypt(account.refreshToken),
    providerEmail: account.providerEmail ? decrypt(account.providerEmail) : '',
  }
}

const oauthModel: {
  findByProviderAndUserId: (provider: string, providerUserId: string) => OAuthAccount | undefined
  findByUserId: (userId: string) => OAuthAccount[]
  findByProvider: (provider: string) => OAuthAccount[]
  create: (data: {
    userId: string
    provider: string
    providerUserId: string
    providerUsername?: string
    providerEmail?: string
    avatar?: string
    accessToken?: string
    refreshToken?: string
    expiresAt?: string
  }) => OAuthAccount
  update: (
    id: string,
    data: {
      providerUserId?: string
      accessToken?: string
      refreshToken?: string
      expiresAt?: string
      providerUsername?: string
      providerEmail?: string
      avatar?: string
    }
  ) => OAuthAccount | null
  delete: (id: string) => boolean
  deleteByProviderAndUserId: (provider: string, providerUserId: string) => boolean
  deleteByUserId: (userId: string) => boolean
} = {
  findByProviderAndUserId(provider, providerUserId) {
    const db = getDb()
    const result = db
      .prepare(
        'SELECT id, user_id as userId, provider, provider_user_id as providerUserId, provider_username as providerUsername, provider_email as providerEmail, avatar, access_token as accessToken, refresh_token as refreshToken, expires_at as expiresAt, created_at as createdAt, updated_at as updatedAt FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?'
      )
      .get(provider, providerUserId)
    return result ? decryptAccount(result as OAuthAccount) : undefined
  },

  findByUserId(userId) {
    const db = getDb()
    const results = db
      .prepare(
        'SELECT id, user_id as userId, provider, provider_user_id as providerUserId, provider_username as providerUsername, provider_email as providerEmail, avatar, access_token as accessToken, refresh_token as refreshToken, expires_at as expiresAt, created_at as createdAt, updated_at as updatedAt FROM oauth_accounts WHERE user_id = ? ORDER BY created_at DESC'
      )
      .all(userId)
    return (results as OAuthAccount[]).map(decryptAccount)
  },

  findByProvider(provider) {
    const db = getDb()
    const results = db
      .prepare(
        'SELECT id, user_id as userId, provider, provider_user_id as providerUserId, provider_username as providerUsername, provider_email as providerEmail, avatar, access_token as accessToken, refresh_token as refreshToken, expires_at as expiresAt, created_at as createdAt, updated_at as updatedAt FROM oauth_accounts WHERE provider = ?'
      )
      .all(provider)
    return (results as OAuthAccount[]).map(decryptAccount)
  },

  create(data) {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, provider_username, provider_email, avatar, access_token, refresh_token, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.userId,
      data.provider,
      data.providerUserId,
      data.providerUsername || '',
      encrypt(data.providerEmail || ''),
      data.avatar || '',
      encrypt(data.accessToken || ''),
      encrypt(data.refreshToken || ''),
      data.expiresAt || '',
      now,
      now
    )

    return this.findByProviderAndUserId(data.provider, data.providerUserId) as OAuthAccount
  },

  update(id, data) {
    const db = getDb()
    const now = new Date().toISOString()

    const fields = []
    const values: unknown[] = []

    const allowedFields = [
      'providerUserId',
      'accessToken',
      'refreshToken',
      'expiresAt',
      'providerUsername',
      'providerEmail',
      'avatar',
    ]
    const dbFields: Record<string, string> = {
      providerUserId: 'provider_user_id',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      expiresAt: 'expires_at',
      providerUsername: 'provider_username',
      providerEmail: 'provider_email',
      avatar: 'avatar',
    }

    for (const field of allowedFields) {
      if (data[field as keyof typeof data] !== undefined) {
        fields.push(`${dbFields[field]} = ?`)
        const value = data[field as keyof typeof data]
        if (field === 'accessToken' || field === 'refreshToken' || field === 'providerEmail') {
          values.push(encrypt(String(value)))
        } else {
          values.push(value)
        }
      }
    }

    if (fields.length === 0) {
      return this.findByProviderAndUserId('', '') || null
    }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    db.prepare(`UPDATE oauth_accounts SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    const account = db
      .prepare(
        'SELECT id, user_id as userId, provider, provider_user_id as providerUserId, provider_username as providerUsername, provider_email as providerEmail, avatar, access_token as accessToken, refresh_token as refreshToken, expires_at as expiresAt, created_at as createdAt, updated_at as updatedAt FROM oauth_accounts WHERE id = ?'
      )
      .get(id)
    return account ? decryptAccount(account as OAuthAccount) : null
  },

  delete(id) {
    const db = getDb()
    const result = db.prepare('DELETE FROM oauth_accounts WHERE id = ?').run(id)
    return result.changes > 0
  },

  deleteByProviderAndUserId(provider, providerUserId) {
    const db = getDb()
    const result = db
      .prepare('DELETE FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?')
      .run(provider, providerUserId)
    return result.changes > 0
  },

  deleteByUserId(userId) {
    const db = getDb()
    const result = db.prepare('DELETE FROM oauth_accounts WHERE user_id = ?').run(userId)
    return result.changes > 0
  },
}

export default oauthModel
