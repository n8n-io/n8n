import { createHmac } from 'node:crypto';

import { generateOidcFormAuthToken, validateOidcFormAuthToken } from '../oidcAuthFlow';
import type { OidcSession } from '../oidc.typeguards';

describe('OIDC Form Auth Token', () => {
	const sessionSecret = 'test-secret-key-at-least-32-characters-long';
	const webhookPath = '/form/test-form';

	const validSession: OidcSession = {
		sub: 'user-123',
		exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
		iat: Math.floor(Date.now() / 1000),
	};

	describe('generateOidcFormAuthToken', () => {
		it('should generate a token with payload and signature', () => {
			const token = generateOidcFormAuthToken(validSession, webhookPath, sessionSecret);

			expect(token).toBeDefined();
			expect(typeof token).toBe('string');
			expect(token.split('.').length).toBe(2);
		});

		it('should generate different tokens for different sessions', () => {
			const session1: OidcSession = { ...validSession, sub: 'user-1' };
			const session2: OidcSession = { ...validSession, sub: 'user-2' };

			const token1 = generateOidcFormAuthToken(session1, webhookPath, sessionSecret);
			const token2 = generateOidcFormAuthToken(session2, webhookPath, sessionSecret);

			expect(token1).not.toBe(token2);
		});

		it('should generate different tokens for different paths', () => {
			const token1 = generateOidcFormAuthToken(validSession, '/form/path1', sessionSecret);
			const token2 = generateOidcFormAuthToken(validSession, '/form/path2', sessionSecret);

			expect(token1).not.toBe(token2);
		});

		it('should generate different tokens for different secrets', () => {
			const token1 = generateOidcFormAuthToken(validSession, webhookPath, 'secret1');
			const token2 = generateOidcFormAuthToken(validSession, webhookPath, 'secret2');

			expect(token1).not.toBe(token2);
		});

		it('should normalize test and production paths to same token', () => {
			const testToken = generateOidcFormAuthToken(validSession, '/form-test/myform', sessionSecret);
			const prodToken = generateOidcFormAuthToken(validSession, '/form/myform', sessionSecret);

			// The tokens should be the same because paths are normalized
			expect(testToken).toBe(prodToken);
		});
	});

	describe('validateOidcFormAuthToken', () => {
		it('should validate a valid token', () => {
			const token = generateOidcFormAuthToken(validSession, webhookPath, sessionSecret);
			const result = validateOidcFormAuthToken(token, webhookPath, sessionSecret);

			expect(result).not.toBeNull();
			expect(result?.sub).toBe(validSession.sub);
			expect(result?.exp).toBe(validSession.exp);
		});

		it('should return null for undefined token', () => {
			const result = validateOidcFormAuthToken(undefined, webhookPath, sessionSecret);
			expect(result).toBeNull();
		});

		it('should return null for empty string token', () => {
			const result = validateOidcFormAuthToken('', webhookPath, sessionSecret);
			expect(result).toBeNull();
		});

		it('should return null for invalid token format (no dot)', () => {
			const result = validateOidcFormAuthToken('invalidtoken', webhookPath, sessionSecret);
			expect(result).toBeNull();
		});

		it('should return null for invalid token format (multiple dots)', () => {
			const result = validateOidcFormAuthToken('a.b.c', webhookPath, sessionSecret);
			expect(result).toBeNull();
		});

		it('should return null for invalid signature', () => {
			const token = generateOidcFormAuthToken(validSession, webhookPath, sessionSecret);
			const [payload] = token.split('.');
			const tamperedToken = `${payload}.invalidsignature`;

			const result = validateOidcFormAuthToken(tamperedToken, webhookPath, sessionSecret);
			expect(result).toBeNull();
		});

		it('should return null for wrong secret', () => {
			const token = generateOidcFormAuthToken(validSession, webhookPath, sessionSecret);
			const result = validateOidcFormAuthToken(token, webhookPath, 'wrong-secret');

			expect(result).toBeNull();
		});

		it('should return null for wrong path', () => {
			const token = generateOidcFormAuthToken(validSession, webhookPath, sessionSecret);
			const result = validateOidcFormAuthToken(token, '/form/different-path', sessionSecret);

			expect(result).toBeNull();
		});

		it('should return null for expired token', () => {
			const expiredSession: OidcSession = {
				...validSession,
				exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
			};
			const token = generateOidcFormAuthToken(expiredSession, webhookPath, sessionSecret);
			const result = validateOidcFormAuthToken(token, webhookPath, sessionSecret);

			expect(result).toBeNull();
		});

		it('should validate token with normalized test path', () => {
			// Generate token with test path
			const token = generateOidcFormAuthToken(validSession, '/form-test/myform', sessionSecret);
			// Validate with production path (should work because paths are normalized)
			const result = validateOidcFormAuthToken(token, '/form/myform', sessionSecret);

			expect(result).not.toBeNull();
			expect(result?.sub).toBe(validSession.sub);
		});

		it('should return null for malformed JSON payload', () => {
			// Create a valid signature for invalid JSON to test parsing logic
			const invalidPayload = Buffer.from('not-json').toString('base64url');
			const validSignature = createHmac('sha256', sessionSecret)
				.update(invalidPayload)
				.digest('base64url');
			const token = `${invalidPayload}.${validSignature}`;

			const result = validateOidcFormAuthToken(token, webhookPath, sessionSecret);
			expect(result).toBeNull();
		});

		it('should return null for payload missing required fields', () => {
			// Create a valid signature for incomplete payload to test field validation
			const incompletePayload = Buffer.from(JSON.stringify({ sub: 'user' })).toString('base64url');
			const validSignature = createHmac('sha256', sessionSecret)
				.update(incompletePayload)
				.digest('base64url');
			const token = `${incompletePayload}.${validSignature}`;

			const result = validateOidcFormAuthToken(token, webhookPath, sessionSecret);
			expect(result).toBeNull();
		});

		it('should return null for payload with wrong types', () => {
			// Create payload with wrong field types to test type validation
			// Use normalized webhookPath so the path check passes and we reach type validation
			const wrongTypesPayload = Buffer.from(
				JSON.stringify({ sub: 123, exp: 'not-a-number', path: '/form/test-form' }),
			).toString('base64url');
			const validSignature = createHmac('sha256', sessionSecret)
				.update(wrongTypesPayload)
				.digest('base64url');
			const token = `${wrongTypesPayload}.${validSignature}`;

			const result = validateOidcFormAuthToken(token, webhookPath, sessionSecret);
			expect(result).toBeNull();
		});
	});
});
