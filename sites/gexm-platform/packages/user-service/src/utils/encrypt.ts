import crypto from 'crypto'
import config from '../config'

const ENCRYPTION_ALGORITHM = 'aes-256-gcm'

// 密钥必须来自配置注入（config.cryptoKey ← 环境变量 CRYPTO_KEY），不得硬编码。
// 这里做两件防护：
//   1) 缺失/过短时直接抛错——原实现用 padEnd(32,'0') 静默补零，
//      未配置时密钥会退化成 32 个 '0'，等于用一把人尽皆知的钥匙加密 PII。
//   2) 用 SHA-256 派生定长密钥，避免截断/补零弱化强度。
function resolveEncryptionKey(): Buffer {
  const raw = config.cryptoKey
  if (!raw || raw.length < 16) {
    throw new Error(
      '[encrypt] CRYPTO_KEY 未配置或过短（至少 16 字符）。' +
        '拒绝以弱密钥启动，请检查环境变量配置。'
    )
  }
  return crypto.createHash('sha256').update(raw, 'utf-8').digest()
}

const ENCRYPTION_KEY = resolveEncryptionKey()

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
