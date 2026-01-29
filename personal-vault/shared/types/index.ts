// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRegistrationRequest {
  email: string;
  authHash: string; // SHA256(auth_key) - never the actual password
  salt: string; // Base64 encoded salt for key derivation
  encryptedRecoveryBlob: string; // Encrypted encryption key for recovery
}

export interface UserLoginRequest {
  email: string;
  authHash: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface SaltResponse {
  salt: string;
}

// ============================================
// Vault Entry Types
// ============================================

export type EntryType = 'password' | 'secure_note' | 'credit_card' | 'identity' | 'bank_account';

export interface VaultEntry {
  id: string;
  userId: string;
  type: EntryType;
  encryptedData: string; // Base64 encoded: IV + ciphertext + authTag
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VaultEntryCreateRequest {
  type: EntryType;
  encryptedData: string;
  folderId?: string | null;
}

export interface VaultEntryUpdateRequest {
  encryptedData?: string;
  folderId?: string | null;
}

// ============================================
// Decrypted Entry Data Types (Client-side only)
// ============================================

export interface PasswordEntryData {
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  customFields?: Array<{ name: string; value: string; hidden: boolean }>;
}

export interface SecureNoteData {
  title: string;
  content: string;
}

export interface CreditCardData {
  title: string;
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  pin?: string;
  notes?: string;
}

export interface IdentityData {
  title: string;
  type: 'passport' | 'national_id' | 'driver_license' | 'other';
  fullName: string;
  idNumber: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  notes?: string;
}

export interface BankAccountData {
  title: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  routingNumber?: string;
  swiftCode?: string;
  iban?: string;
  pin?: string;
  notes?: string;
}

export type DecryptedEntryData =
  | PasswordEntryData
  | SecureNoteData
  | CreditCardData
  | IdentityData
  | BankAccountData;

// ============================================
// Folder Types
// ============================================

export interface Folder {
  id: string;
  userId: string;
  encryptedName: string; // Encrypted folder name
  parentId: string | null;
  createdAt: Date;
}

export interface FolderCreateRequest {
  encryptedName: string;
  parentId?: string | null;
}

// Decrypted folder (client-side)
export interface DecryptedFolder extends Omit<Folder, 'encryptedName'> {
  name: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// Token Types
// ============================================

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ============================================
// Recovery Types
// ============================================

export interface PasswordRecoveryRequest {
  email: string;
  recoveryKey: string; // User's recovery key
  newAuthHash: string;
  newSalt: string;
  newEncryptedRecoveryBlob: string;
}

// ============================================
// Password Generator Options
// ============================================

export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean; // Exclude l, 1, I, O, 0
  customSymbols?: string;
}

// ============================================
// Export/Import Types
// ============================================

export interface ExportData {
  version: string;
  exportedAt: string;
  entries: VaultEntry[];
  folders: Folder[];
}

// ============================================
// Crypto Constants
// ============================================

export const CRYPTO_CONSTANTS = {
  SALT_LENGTH: 16, // bytes
  IV_LENGTH: 12, // bytes for AES-GCM
  AUTH_TAG_LENGTH: 16, // bytes
  KEY_LENGTH: 32, // bytes (256 bits)
  ARGON2_MEMORY: 65536, // 64 MB
  ARGON2_ITERATIONS: 3,
  ARGON2_PARALLELISM: 4,
  HKDF_AUTH_INFO: 'personal-vault-auth-key',
  HKDF_ENC_INFO: 'personal-vault-encryption-key',
} as const;
