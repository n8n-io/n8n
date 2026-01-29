import { describe, it, expect, beforeAll } from 'vitest';

// Set up environment variables before importing modules
beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters-long';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters-long';
  process.env.JWT_ACCESS_EXPIRATION = '15m';
  process.env.JWT_REFRESH_EXPIRATION = '7d';
});

describe('JWT Utilities', () => {
  it('should generate valid access token', async () => {
    const { generateAccessToken } = await import('../utils/jwt.js');

    const token = generateAccessToken('user-123', 'test@example.com');

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
  });

  it('should generate valid refresh token', async () => {
    const { generateRefreshToken } = await import('../utils/jwt.js');

    const token = generateRefreshToken('user-123', 'test@example.com');

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('should verify valid refresh token', async () => {
    const { generateRefreshToken, verifyRefreshToken } = await import('../utils/jwt.js');

    const token = generateRefreshToken('user-123', 'test@example.com');
    const payload = verifyRefreshToken(token);

    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe('user-123');
    expect(payload?.email).toBe('test@example.com');
    expect(payload?.type).toBe('refresh');
  });

  it('should reject invalid refresh token', async () => {
    const { verifyRefreshToken } = await import('../utils/jwt.js');

    const payload = verifyRefreshToken('invalid-token');

    expect(payload).toBeNull();
  });

  it('should reject access token when verifying as refresh token', async () => {
    const { generateAccessToken, verifyRefreshToken } = await import('../utils/jwt.js');

    const accessToken = generateAccessToken('user-123', 'test@example.com');
    const payload = verifyRefreshToken(accessToken);

    // Should fail because access tokens use different secret
    expect(payload).toBeNull();
  });

  it('should hash token consistently', async () => {
    const { hashToken } = await import('../utils/jwt.js');

    const token = 'test-token-12345';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA256 hex
  });

  it('should generate different hashes for different tokens', async () => {
    const { hashToken } = await import('../utils/jwt.js');

    const hash1 = hashToken('token-1');
    const hash2 = hashToken('token-2');

    expect(hash1).not.toBe(hash2);
  });

  it('should parse expiration strings correctly', async () => {
    const { parseExpirationToMs } = await import('../utils/jwt.js');

    expect(parseExpirationToMs('15m')).toBe(15 * 60 * 1000);
    expect(parseExpirationToMs('1h')).toBe(60 * 60 * 1000);
    expect(parseExpirationToMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
    expect(parseExpirationToMs('30s')).toBe(30 * 1000);
  });

  it('should throw on invalid expiration format', async () => {
    const { parseExpirationToMs } = await import('../utils/jwt.js');

    expect(() => parseExpirationToMs('invalid')).toThrow();
    expect(() => parseExpirationToMs('15')).toThrow();
    expect(() => parseExpirationToMs('m15')).toThrow();
  });
});
