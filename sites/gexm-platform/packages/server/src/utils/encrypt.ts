import crypto from 'crypto'
import config from '../config'

const ENCRYPTION_KEY = config.security.piiKey
const IV_LENGTH = 16

function getKey(): Buffer {
  const key = ENCRYPTION_KEY.padEnd(32, '\0').slice(0, 32)
  return Buffer.from(key, 'utf8')
}

export function encrypt(text: string): string {
  if (!text) {
    return ''
  }

  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    return ''
  }

  try {
    const [ivHex, encrypted] = encryptedText.split(':')
    if (!ivHex || !encrypted) {
      return encryptedText
    }

    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return encryptedText
  }
}

export function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}

export function maskPhone(phone: string): string {
  if (!phone) {
    return ''
  }
  if (phone.length === 11) {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }
  return phone.replace(/(\d{3})\d+(\d{2})$/, '$1****$2')
}

export function maskIdCard(idCard: string): string {
  if (!idCard) {
    return ''
  }
  if (idCard.length === 18) {
    return idCard.replace(/(\d{4})\d{10}(\d{4})/, '$1**********$2')
  }
  return idCard.replace(/(\d{4})\d+(\d{4})$/, '$1****$2')
}

export function maskEmail(email: string): string {
  if (!email) {
    return ''
  }
  const [name, domain] = email.split('@')
  if (!name || !domain) {
    return email
  }
  if (name.length <= 2) {
    return `${name}***@${domain}`
  }
  return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`
}

export default { encrypt, decrypt, hashEmail, maskPhone, maskIdCard, maskEmail }
