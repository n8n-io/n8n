import { z } from 'zod';

// User registration schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  authHash: z.string().length(64, 'Invalid auth hash'), // SHA256 hex
  salt: z.string().min(20, 'Invalid salt'), // Base64 encoded 16 bytes
  encryptedRecoveryBlob: z.string().optional(),
});

// User login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  authHash: z.string().length(64, 'Invalid auth hash'),
});

// Salt request schema
export const saltRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

// Vault entry schemas
export const entryTypeSchema = z.enum([
  'password',
  'secure_note',
  'credit_card',
  'identity',
  'bank_account',
]);

export const createEntrySchema = z.object({
  type: entryTypeSchema,
  encryptedData: z.string().min(1, 'Encrypted data required'),
  folderId: z.string().uuid().nullable().optional(),
});

export const updateEntrySchema = z.object({
  encryptedData: z.string().min(1).optional(),
  folderId: z.string().uuid().nullable().optional(),
});

// Folder schemas
export const createFolderSchema = z.object({
  encryptedName: z.string().min(1, 'Encrypted name required'),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateFolderSchema = z.object({
  encryptedName: z.string().min(1).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

// Password recovery schema
export const recoverySchema = z.object({
  email: z.string().email('Invalid email address'),
  newAuthHash: z.string().length(64, 'Invalid auth hash'),
  newSalt: z.string().min(20, 'Invalid salt'),
  newEncryptedRecoveryBlob: z.string().optional(),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.string().optional().transform(val => parseInt(val || '1', 10)),
  pageSize: z.string().optional().transform(val => Math.min(parseInt(val || '50', 10), 100)),
});

// UUID param schema
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// Validation helper
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): { success: true; data: T } | { success: false; error: string } => {
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors.map(e => e.message).join(', ');
      return { success: false, error: errors };
    }

    return { success: true, data: result.data };
  };
}
