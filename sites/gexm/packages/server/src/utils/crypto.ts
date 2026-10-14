import crypto from 'crypto'
import config from '../config'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const secret = config.security.piiKey
  if (!secret || secret.length < 32) {
    throw new Error('PII_ENCRYPTION_KEY must be at least 32 characters')
  }
  return Buffer.from(secret.slice(0, 32), 'utf-8')
}

export function encrypt(text: string): string {
  if (!text) {
    return ''
  }
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  let encrypted = cipher.update(text, 'utf-8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    return ''
  }
  const [ivHex, authTagHex, data] = encryptedText.split(':')
  if (!ivHex || !authTagHex || !data) {
    return encryptedText
  }
  try {
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(data, 'hex', 'utf-8')
    decrypted += decipher.final('utf-8')
    return decrypted
  } catch {
    return encryptedText
  }
}
