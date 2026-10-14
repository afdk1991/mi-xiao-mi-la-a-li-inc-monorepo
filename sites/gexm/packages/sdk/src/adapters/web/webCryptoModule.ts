import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import type { ICryptoModule } from '@/interfaces/ICryptoModule';
import type { EncryptionOptions } from '@/interfaces/ITypes';

// 安全随机数生成器检测：优先使用 crypto API，不可用时回退到 Math.random()
const cryptoObj: Crypto | null =
  typeof globalThis !== 'undefined' && typeof globalThis.crypto !== 'undefined'
    ? globalThis.crypto
    : typeof window !== 'undefined' && typeof window.crypto !== 'undefined'
      ? window.crypto
      : null;

let _cryptoWarned = false;
function warnInsecureRandom(): void {
  if (!_cryptoWarned) {
    console.warn('[Security] crypto.getRandomValues is not available, falling back to Math.random() (insecure)');
    _cryptoWarned = true;
  }
}

export class WebCryptoModule implements ICryptoModule {
  encrypt(text: string, key: string, options?: EncryptionOptions): string {
    const algorithm = options?.algorithm || 'AES';
    const keySize = options?.keySize || 256;
    const iv = options?.iv || this.generateIV(16);

    try {
      if (algorithm === 'AES') {
        const keyHash = CryptoJS.SHA256(key).toString();
        const ivBytes = CryptoJS.enc.Hex.parse(iv);
        const encrypted = CryptoJS.AES.encrypt(text, keyHash, {
          iv: ivBytes,
          keySize: keySize / 32,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        });
        return `${iv}:${encrypted.toString()}`;
      }

      if (algorithm === 'DES') {
        const keyHash = CryptoJS.SHA256(key).toString().substring(0, 16);
        const ivBytes = CryptoJS.enc.Hex.parse(iv);
        const encrypted = CryptoJS.DES.encrypt(text, keyHash, {
          iv: ivBytes,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        });
        return `${iv}:${encrypted.toString()}`;
      }

      throw new Error('Unsupported algorithm');
    } catch {
      throw new Error('Encryption failed');
    }
  }

  decrypt(ciphertext: string, key: string, options?: EncryptionOptions): string {
    const algorithm = options?.algorithm || 'AES';

    try {
      const [iv, encrypted] = ciphertext.split(':');
      if (!iv || !encrypted) {
        throw new Error('Invalid ciphertext format');
      }

      if (algorithm === 'AES') {
        const keyHash = CryptoJS.SHA256(key).toString();
        const ivBytes = CryptoJS.enc.Hex.parse(iv);
        const decrypted = CryptoJS.AES.decrypt(encrypted, keyHash, {
          iv: ivBytes,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        });
        return decrypted.toString(CryptoJS.enc.Utf8);
      }

      if (algorithm === 'DES') {
        const keyHash = CryptoJS.SHA256(key).toString().substring(0, 16);
        const ivBytes = CryptoJS.enc.Hex.parse(iv);
        const decrypted = CryptoJS.DES.decrypt(encrypted, keyHash, {
          iv: ivBytes,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        });
        return decrypted.toString(CryptoJS.enc.Utf8);
      }

      throw new Error('Unsupported algorithm');
    } catch {
      throw new Error('Decryption failed');
    }
  }

  md5(text: string): string {
    return CryptoJS.MD5(text).toString();
  }

  sha256(text: string): string {
    return CryptoJS.SHA256(text).toString();
  }

  sha512(text: string): string {
    return CryptoJS.SHA512(text).toString();
  }

  hmacSHA256(text: string, key: string): string {
    return CryptoJS.HmacSHA256(text, key).toString();
  }

  hmacSHA512(text: string, key: string): string {
    return CryptoJS.HmacSHA512(text, key).toString();
  }

  generateRandomKey(length?: number): string {
    const len = length || 32;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    if (cryptoObj) {
      const array = new Uint32Array(len);
      cryptoObj.getRandomValues(array);
      let result = '';
      for (let i = 0; i < len; i++) {
        result += chars.charAt(array[i] % chars.length);
      }
      return result;
    }
    warnInsecureRandom();
    let result = '';
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateIV(length?: number): string {
    const len = length || 16;
    const chars = '0123456789abcdef';
    if (cryptoObj) {
      const array = new Uint32Array(len);
      cryptoObj.getRandomValues(array);
      let result = '';
      for (let i = 0; i < len; i++) {
        result += chars.charAt(array[i] % chars.length);
      }
      return result;
    }
    warnInsecureRandom();
    let result = '';
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  base64Encode(text: string): string {
    try {
      return btoa(text);
    } catch {
      return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(text));
    }
  }

  base64Decode(encoded: string): string {
    try {
      return atob(encoded);
    } catch {
      return CryptoJS.enc.Base64.parse(encoded).toString(CryptoJS.enc.Utf8);
    }
  }

  uuid(): string {
    return uuidv4();
  }

  uuidv4(): string {
    return uuidv4();
  }
}