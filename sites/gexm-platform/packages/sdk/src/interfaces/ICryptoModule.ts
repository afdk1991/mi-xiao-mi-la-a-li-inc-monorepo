import type { EncryptionOptions } from './ITypes';

export interface ICryptoModule {
  encrypt(text: string, key: string, options?: EncryptionOptions): string;

  decrypt(ciphertext: string, key: string, options?: EncryptionOptions): string;

  md5(text: string): string;

  sha256(text: string): string;

  sha512(text: string): string;

  hmacSHA256(text: string, key: string): string;

  hmacSHA512(text: string, key: string): string;

  generateRandomKey(length?: number): string;

  generateIV(length?: number): string;

  base64Encode(text: string): string;

  base64Decode(encoded: string): string;

  uuid(): string;

  uuidv4(): string;
}