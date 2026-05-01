import { createHash, createHmac } from 'crypto';

import { buildStringToSign, computeSignature, verifySignature } from '../v2/helpers/signing';

describe('seven webhook signing', () => {
	describe('buildStringToSign', () => {
		it('joins the five components with newline separators in the documented order', () => {
			const rawBody = '{"to":"49170123456789","text":"hi"}';
			const result = buildStringToSign({
				timestamp: '1700000000',
				nonce: 'abcdef0123456789abcdef0123456789',
				method: 'POST',
				url: 'https://example.com/webhook',
				rawBody,
			});
			const expectedMd5 = createHash('md5').update(rawBody, 'utf8').digest('hex');
			expect(result).toBe(
				`1700000000\nabcdef0123456789abcdef0123456789\nPOST\nhttps://example.com/webhook\n${expectedMd5}`,
			);
		});

		it('uses md5 of the request body as the fifth component', () => {
			const body = 'arbitrary payload';
			const result = buildStringToSign({
				timestamp: '1',
				nonce: 'n',
				method: 'POST',
				url: 'https://example.com',
				rawBody: body,
			});
			expect(result.split('\n').pop()).toMatch(/^[a-f0-9]{32}$/);
		});
	});

	describe('computeSignature', () => {
		it('produces the same HMAC-SHA256 hex digest as the documented PHP/Bash example flow', () => {
			const signingKey = 'test-signing-key';
			const input = {
				timestamp: '1700000000',
				nonce: 'abcdef0123456789abcdef0123456789',
				method: 'POST',
				url: 'https://example.com/webhook',
				rawBody: '{"to":"49170123456789","text":"hi"}',
			};

			// reference computation following the docs algorithm
			const stringToSign = buildStringToSign(input);
			const reference = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

			expect(computeSignature(input, signingKey)).toBe(reference);
			expect(computeSignature(input, signingKey)).toMatch(/^[a-f0-9]{64}$/);
		});

		it('produces different signatures for different keys', () => {
			const input = {
				timestamp: '1',
				nonce: 'n',
				method: 'POST',
				url: 'https://example.com',
				rawBody: '',
			};
			expect(computeSignature(input, 'a')).not.toBe(computeSignature(input, 'b'));
		});
	});

	describe('verifySignature', () => {
		const signingKey = 'super-secret';
		const url = 'https://example.com/webhook';
		const rawBody = '{"event":"sms_mo","data":{}}';

		const buildContext = (
			overrides: {
				timestamp?: string;
				nonce?: string;
				signature?: string;
				method?: string;
				body?: string | Buffer;
				urlOverride?: string;
			} = {},
		) => {
			const timestamp = overrides.timestamp ?? Math.floor(Date.now() / 1000).toString();
			const nonce = overrides.nonce ?? 'abcdef0123456789abcdef0123456789';
			const method = overrides.method ?? 'POST';
			const validSignature = computeSignature(
				{ timestamp, nonce, method, url, rawBody },
				signingKey,
			);
			const signature = overrides.signature ?? validSignature;
			const body = overrides.body ?? rawBody;

			return {
				getHeaderData: () => ({
					'x-signature': signature,
					'x-timestamp': timestamp,
					'x-nonce': nonce,
				}),
				getRequestObject: () => ({
					rawBody: body,
					method,
				}),
				getNodeWebhookUrl: () => overrides.urlOverride ?? url,
			};
		};

		it('returns true when signature matches', () => {
			const ctx = buildContext();
			expect(verifySignature.call(ctx as any, signingKey)).toBe(true);
		});

		it('returns true when no signing key is configured (skips verification)', () => {
			const ctx = buildContext({ signature: 'invalid' });
			expect(verifySignature.call(ctx as any, '')).toBe(true);
		});

		it('returns false when signature does not match', () => {
			const ctx = buildContext({ signature: 'a'.repeat(64) });
			expect(verifySignature.call(ctx as any, signingKey)).toBe(false);
		});

		it('returns false when timestamp is too old (replay attack)', () => {
			const oldTimestamp = (Math.floor(Date.now() / 1000) - 3600).toString();
			const ctx = buildContext({ timestamp: oldTimestamp });
			expect(verifySignature.call(ctx as any, signingKey)).toBe(false);
		});

		it('returns false when required headers are missing', () => {
			const ctx = {
				getHeaderData: () => ({}),
				getRequestObject: () => ({ rawBody, method: 'POST' }),
				getNodeWebhookUrl: () => url,
			};
			expect(verifySignature.call(ctx as any, signingKey)).toBe(false);
		});

		it('handles raw body as Buffer', () => {
			const buffer = Buffer.from(rawBody, 'utf8');
			const ctx = buildContext({ body: buffer });
			expect(verifySignature.call(ctx as any, signingKey)).toBe(true);
		});

		it('returns false when URL was tampered with (signature was for a different URL)', () => {
			const ctx = buildContext({ urlOverride: 'https://attacker.example.com/webhook' });
			expect(verifySignature.call(ctx as any, signingKey)).toBe(false);
		});
	});
});
