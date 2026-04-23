import { generateKeyPairSync, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
	modulusLength: 2048,
	publicKeyEncoding: { type: 'spki', format: 'pem' },
	privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

export const TEST_ISSUER = 'https://e2e-issuer.test';
export const TEST_KID = 'e2e-test-kid';
export const TEST_AUDIENCE = 'n8n';

export function getPublicKeyPem(): string {
	return publicKey;
}

/** Returns JSON string for N8N_TOKEN_EXCHANGE_TRUSTED_KEYS env var */
export function getTrustedKeysConfig(): string {
	return JSON.stringify([
		{
			type: 'static',
			kid: TEST_KID,
			algorithms: ['RS256'],
			key: publicKey,
			issuer: TEST_ISSUER,
			expectedAudience: TEST_AUDIENCE,
		},
	]);
}

interface ExternalJwtClaims {
	sub: string;
	iss: string;
	aud: string | string[];
	iat: number;
	exp: number;
	jti: string;
	email: string;
	given_name: string;
	family_name: string;
	role: string;
}

/** Mint an external JWT signed with the test private key */
export function mintExternalJwt(overrides: Partial<ExternalJwtClaims> = {}): string {
	const now = Math.floor(Date.now() / 1000);
	const id = randomUUID().slice(0, 8);
	return jwt.sign(
		{
			sub: `ext-${id}`,
			iss: TEST_ISSUER,
			aud: TEST_AUDIENCE,
			iat: now,
			exp: now + 300,
			jti: randomUUID(),
			email: `e2e-${id}@test.example`,
			given_name: 'E2E',
			family_name: `User-${id}`,
			role: 'global:member',
			...overrides,
		},
		privateKey,
		{ algorithm: 'RS256', keyid: TEST_KID },
	);
}

/** Mint a JWT signed with a custom private key (for untrusted-key tests) */
export function mintExternalJwtWithKey(
	signingKey: string,
	overrides: Partial<ExternalJwtClaims> = {},
): string {
	const now = Math.floor(Date.now() / 1000);
	const id = randomUUID().slice(0, 8);
	return jwt.sign(
		{
			sub: `ext-${id}`,
			iss: TEST_ISSUER,
			aud: TEST_AUDIENCE,
			iat: now,
			exp: now + 300,
			jti: randomUUID(),
			email: `e2e-${id}@test.example`,
			given_name: 'E2E',
			family_name: `User-${id}`,
			role: 'global:member',
			...overrides,
		},
		signingKey,
		{ algorithm: 'RS256', keyid: TEST_KID },
	);
}
