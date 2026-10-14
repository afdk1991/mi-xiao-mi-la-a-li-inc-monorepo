import { getDb } from './index'
import { generateId } from '../utils/response'
import { encrypt, decrypt } from '../utils/encrypt'

// 地址接口
interface Address {
  id: string
  user_id: string
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  is_default: number
  tag?: string
  created_at: string
  updated_at: string
}

// 创建地址数据
interface CreateAddressData {
  name?: string
  phone?: string
  province?: string
  city?: string
  district?: string
  detail?: string
  is_default?: boolean
  tag?: string
}

// 更新地址数据
interface UpdateAddressData {
  name?: string
  phone?: string
  province?: string
  city?: string
  district?: string
  detail?: string
  is_default?: boolean
  tag?: string
}

/** 解密地址中的手机号 */
function decryptAddress(address: Address | undefined): Address | null {
  if (!address) return null
  return { ...address, phone: decrypt(address.phone) }
}

function decryptAddresses(addresses: Address[]): Address[] {
  return addresses.map(decryptAddress) as Address[]
}

const addressModel = {
  findByUserId(userId: string): Address[] {
    const db = getDb()
    const results = db
      .prepare(
        `
        SELECT * FROM addresses 
        WHERE user_id = ? 
        ORDER BY is_default DESC, created_at DESC
      `
      )
      .all(userId) as Address[]
    return decryptAddresses(results)
  },

  findById(id: string): Address | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM addresses WHERE id = ?').get(id) as Address | undefined
    return decryptAddress(result)
  },

  findDefault(userId: string): Address | null {
    const db = getDb()
    const result = db
      .prepare('SELECT * FROM addresses WHERE user_id = ? AND is_default = 1')
      .get(userId) as Address | undefined
    return decryptAddress(result)
  },

  countByUserId(userId: string): number {
    const db = getDb()
    const result = db
      .prepare('SELECT COUNT(*) as count FROM addresses WHERE user_id = ?')
      .get(userId) as { count: number }
    return result.count
  },

  create(userId: string, addressData: CreateAddressData): Address | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()
    const isFirst = this.countByUserId(userId) === 0
    const isDefault = addressData.is_default || isFirst ? 1 : 0

    const tx = db.transaction(() => {
      if (isDefault) {
        db.prepare('UPDATE addresses SET is_default = 0, updated_at = ? WHERE user_id = ?').run(
          now,
          userId
        )
      }

      db.prepare(
        `
        INSERT INTO addresses (id, user_id, name, phone, province, city, district, detail, is_default, tag, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        id,
        userId,
        addressData.name || '',
        encrypt(addressData.phone || ''),
        addressData.province || '',
        addressData.city || '',
        addressData.district || '',
        addressData.detail || '',
        isDefault,
        addressData.tag || '',
        now,
        now
      )
    })

    tx()
    return this.findById(id)
  },

  update(id: string, userId: string, addressData: UpdateAddressData): Address | null {
    const db = getDb()
    const now = new Date().toISOString()

    const fields: string[] = []
    const values: (string | number | null)[] = []

    const allowedFields: (keyof UpdateAddressData)[] = [
      'name',
      'phone',
      'province',
      'city',
      'district',
      'detail',
      'tag',
    ]
    for (const field of allowedFields) {
      if (addressData[field] !== undefined) {
        fields.push(`${field} = ?`)
        const value = addressData[field] as string
        values.push(field === 'phone' ? encrypt(value) : value)
      }
    }

    if (addressData.is_default !== undefined) {
      const tx = db.transaction(() => {
        if (addressData.is_default) {
          db.prepare(
            'UPDATE addresses SET is_default = 0, updated_at = ? WHERE user_id = ? AND id != ?'
          ).run(now, userId, id)
        }
        fields.push('is_default = ?')
        values.push(addressData.is_default ? 1 : 0)
        fields.push('updated_at = ?')
        values.push(now)
        values.push(id)
        values.push(userId)
        db.prepare(`UPDATE addresses SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(
          ...values
        )
      })
      tx()
    } else {
      fields.push('updated_at = ?')
      values.push(now)
      values.push(id)
      values.push(userId)
      db.prepare(`UPDATE addresses SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(
        ...values
      )
    }

    return this.findById(id)
  },

  setDefault(id: string, userId: string): Address | null {
    const db = getDb()
    const now = new Date().toISOString()

    const tx = db.transaction(() => {
      db.prepare('UPDATE addresses SET is_default = 0, updated_at = ? WHERE user_id = ?').run(
        now,
        userId
      )
      db.prepare(
        'UPDATE addresses SET is_default = 1, updated_at = ? WHERE id = ? AND user_id = ?'
      ).run(now, id, userId)
    })

    tx()
    return this.findById(id)
  },

  delete(id: string, userId: string): boolean {
    const db = getDb()
    const address = this.findById(id)

    const result = db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(id, userId)

    if (result.changes > 0 && address && address.is_default === 1) {
      const remaining = this.findByUserId(userId)
      if (remaining.length > 0) {
        const now = new Date().toISOString()
        db.prepare('UPDATE addresses SET is_default = 1, updated_at = ? WHERE id = ?').run(
          now,
          remaining[0].id
        )
      }
    }

    return result.changes > 0
  },
}

export default addressModel
