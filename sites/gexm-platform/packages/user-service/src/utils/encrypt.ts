import crypto from 'crypto'
import config from '../config'

const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const ENCRYPTION_KEY = Buffer.from(config.cryptoKey.padEnd(32, '0').slice(0, 32), 'utf-8')

export function encrypt(text: string): string {
  if (!text) return ''
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag().toString('base64')
  return `${iv.toString('base64')}:${authTag}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return ''
  try {
    const [ivBase64, authTagBase64, encryptedBase64] = encryptedText.split(':')
    if (!ivBase64 || !authTagBase64 || !encryptedBase64) return encryptedText

    const iv = Buffer.from(ivBase64, 'base64')
    const authTag = Buffer.from(authTagBase64, 'base64')
    const encrypted = Buffer.from(encryptedBase64, 'base64')

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encrypted, undefined, 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return encryptedText
  }
}
