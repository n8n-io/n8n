/**
 * Personal Vault - Client-Side Cryptography
 *
 * This module implements the zero-knowledge encryption system.
 * All encryption/decryption happens on the client - the server never sees plaintext data.
 *
 * Key Hierarchy:
 * Master Password -> Argon2id -> Master Key -> HKDF -> Auth Key + Encryption Key
 */

import argon2 from 'argon2-browser';

// Constants
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 128; // bits

const ARGON2_CONFIG = {
  type: argon2.ArgonType.Argon2id,
  mem: 65536, // 64 MB
  time: 3,
  parallelism: 4,
  hashLen: KEY_LENGTH,
};

const HKDF_AUTH_INFO = new TextEncoder().encode('personal-vault-auth-key');
const HKDF_ENC_INFO = new TextEncoder().encode('personal-vault-encryption-key');

// ============================================
// Utility Functions
// ============================================

export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

// ============================================
// Key Derivation
// ============================================

/**
 * Derives the master key from the master password using Argon2id
 */
export async function deriveMasterKey(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  const result = await argon2.hash({
    pass: password,
    salt: salt,
    ...ARGON2_CONFIG,
  });

  return new Uint8Array(result.hash);
}

/**
 * Derives auth and encryption keys from the master key using HKDF
 */
export async function deriveKeys(masterKey: Uint8Array): Promise<{
  authKey: Uint8Array;
  encryptionKey: CryptoKey;
}> {
  // Import master key for HKDF
  const baseKey = await crypto.subtle.importKey(
    'raw',
    masterKey,
    'HKDF',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive auth key (for server authentication)
  const authKeyBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      salt: new Uint8Array(KEY_LENGTH), // Zero salt for HKDF
      info: HKDF_AUTH_INFO,
      hash: 'SHA-256',
    },
    baseKey,
    KEY_LENGTH * 8
  );

  // Derive encryption key (for data encryption)
  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: new Uint8Array(KEY_LENGTH),
      info: HKDF_ENC_INFO,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable for export
    ['encrypt', 'decrypt']
  );

  return {
    authKey: new Uint8Array(authKeyBits),
    encryptionKey,
  };
}

/**
 * Computes SHA-256 hash of the auth key (sent to server)
 */
export async function hashAuthKey(authKey: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', authKey);
  return uint8ArrayToHex(new Uint8Array(hashBuffer));
}

// ============================================
// Encryption / Decryption
// ============================================

/**
 * Encrypts data using AES-256-GCM
 * Returns: Base64(IV || ciphertext || authTag)
 */
export async function encrypt(
  data: string,
  key: CryptoKey
): Promise<string> {
  const iv = generateRandomBytes(IV_LENGTH);
  const encodedData = new TextEncoder().encode(data);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: AUTH_TAG_LENGTH,
    },
    key,
    encodedData
  );

  // Combine IV + ciphertext (auth tag is appended by WebCrypto)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypts data encrypted with AES-256-GCM
 * Input: Base64(IV || ciphertext || authTag)
 */
export async function decrypt(
  encryptedData: string,
  key: CryptoKey
): Promise<string> {
  const combined = new Uint8Array(base64ToArrayBuffer(encryptedData));

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: AUTH_TAG_LENGTH,
    },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Encrypts an object (converts to JSON first)
 */
export async function encryptObject<T>(
  data: T,
  key: CryptoKey
): Promise<string> {
  return encrypt(JSON.stringify(data), key);
}

/**
 * Decrypts to an object (parses JSON)
 */
export async function decryptObject<T>(
  encryptedData: string,
  key: CryptoKey
): Promise<T> {
  const jsonString = await decrypt(encryptedData, key);
  return JSON.parse(jsonString) as T;
}

// ============================================
// Recovery Key
// ============================================

/**
 * Generates a random recovery key (256 bits)
 * Returns as a hex string for easy storage
 */
export function generateRecoveryKey(): string {
  const bytes = generateRandomBytes(32);
  return uint8ArrayToHex(bytes);
}

/**
 * Encrypts the encryption key with the recovery key
 * This blob is stored on the server for account recovery
 */
export async function createRecoveryBlob(
  encryptionKey: CryptoKey,
  recoveryKey: string
): Promise<string> {
  // Export encryption key
  const exportedKey = await crypto.subtle.exportKey('raw', encryptionKey);

  // Import recovery key for encryption
  const recoveryKeyBytes = hexToUint8Array(recoveryKey);
  const recoveryKeyHandle = await crypto.subtle.importKey(
    'raw',
    recoveryKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Encrypt the exported key
  const iv = generateRandomBytes(IV_LENGTH);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: AUTH_TAG_LENGTH,
    },
    recoveryKeyHandle,
    exportedKey
  );

  // Combine IV + encrypted key
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Recovers the encryption key using the recovery key
 */
export async function recoverEncryptionKey(
  recoveryBlob: string,
  recoveryKey: string
): Promise<CryptoKey> {
  const combined = new Uint8Array(base64ToArrayBuffer(recoveryBlob));

  const iv = combined.slice(0, IV_LENGTH);
  const encryptedKey = combined.slice(IV_LENGTH);

  // Import recovery key
  const recoveryKeyBytes = hexToUint8Array(recoveryKey);
  const recoveryKeyHandle = await crypto.subtle.importKey(
    'raw',
    recoveryKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // Decrypt the encryption key
  const decryptedKey = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: AUTH_TAG_LENGTH,
    },
    recoveryKeyHandle,
    encryptedKey
  );

  // Import as CryptoKey
  return crypto.subtle.importKey(
    'raw',
    decryptedKey,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
}

// ============================================
// Password Generator
// ============================================

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = 'l1IO0';

export interface PasswordOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
}

export function generatePassword(options: PasswordOptions): string {
  let charset = '';

  if (options.includeLowercase) {
    charset += LOWERCASE;
  }
  if (options.includeUppercase) {
    charset += UPPERCASE;
  }
  if (options.includeNumbers) {
    charset += NUMBERS;
  }
  if (options.includeSymbols) {
    charset += SYMBOLS;
  }

  if (options.excludeAmbiguous) {
    charset = charset
      .split('')
      .filter(c => !AMBIGUOUS.includes(c))
      .join('');
  }

  if (charset.length === 0) {
    charset = LOWERCASE + UPPERCASE + NUMBERS;
  }

  const randomValues = generateRandomBytes(options.length);
  let password = '';

  for (let i = 0; i < options.length; i++) {
    password += charset[randomValues[i] % charset.length];
  }

  return password;
}

/**
 * Calculates password strength score (0-100)
 */
export function calculatePasswordStrength(password: string): number {
  let score = 0;

  // Length score
  score += Math.min(password.length * 4, 40);

  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;

  // Bonus for mixing
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const variety = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;

  if (variety >= 3) score += 10;
  if (variety === 4) score += 5;

  return Math.min(score, 100);
}

// ============================================
// Salt Generation
// ============================================

export function generateSalt(): string {
  const salt = generateRandomBytes(SALT_LENGTH);
  return arrayBufferToBase64(salt.buffer);
}

export function saltFromBase64(base64: string): Uint8Array {
  return new Uint8Array(base64ToArrayBuffer(base64));
}

// ============================================
// Secure Memory Clear (best effort)
// ============================================

export function clearSensitiveData(data: Uint8Array): void {
  // Overwrite with zeros
  data.fill(0);
}

export function clearString(str: string): string {
  // Strings are immutable in JS, so we can only return empty
  // The original string will be garbage collected
  return '';
}
