import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  createEntrySchema,
  validateBody,
} from '../utils/validation.js';

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const data = {
        email: 'test@example.com',
        authHash: 'a'.repeat(64), // 64 char hex string
        salt: 'AAAAAAAAAAAAAAAAAAAAAA==', // Base64 16 bytes
        encryptedRecoveryBlob: 'some-encrypted-blob',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const data = {
        email: 'not-an-email',
        authHash: 'a'.repeat(64),
        salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject short auth hash', () => {
      const data = {
        email: 'test@example.com',
        authHash: 'a'.repeat(32), // Too short
        salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject short salt', () => {
      const data = {
        email: 'test@example.com',
        authHash: 'a'.repeat(64),
        salt: 'short', // Too short
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const data = {
        email: 'test@example.com',
        authHash: 'a'.repeat(64),
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject missing fields', () => {
      const data = {
        email: 'test@example.com',
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('createEntrySchema', () => {
    it('should validate password entry', () => {
      const data = {
        type: 'password',
        encryptedData: 'some-encrypted-data',
        folderId: null,
      };

      const result = createEntrySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate all entry types', () => {
      const types = ['password', 'secure_note', 'credit_card', 'identity', 'bank_account'];

      for (const type of types) {
        const data = {
          type,
          encryptedData: 'encrypted',
        };

        const result = createEntrySchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid entry type', () => {
      const data = {
        type: 'invalid_type',
        encryptedData: 'encrypted',
      };

      const result = createEntrySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject empty encrypted data', () => {
      const data = {
        type: 'password',
        encryptedData: '',
      };

      const result = createEntrySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should validate with valid UUID folderId', () => {
      const data = {
        type: 'password',
        encryptedData: 'encrypted',
        folderId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = createEntrySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID folderId', () => {
      const data = {
        type: 'password',
        encryptedData: 'encrypted',
        folderId: 'not-a-uuid',
      };

      const result = createEntrySchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('validateBody helper', () => {
    it('should return success with valid data', () => {
      const validator = validateBody(loginSchema);
      const result = validator({
        email: 'test@example.com',
        authHash: 'a'.repeat(64),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should return error message on invalid data', () => {
      const validator = validateBody(loginSchema);
      const result = validator({
        email: 'invalid-email',
        authHash: 'short',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });
  });
});
