import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature } from '../WebflowTriggerHelpers';

describe('WebflowTriggerHelpers', () => {
	const clientSecret = 'oauth-client-secret';
	const rawBody = Buffer.from('{"triggerType":"form_submission"}');

	function createSignature(secret: string, timestamp: string, body: Buffer | string = rawBody) {
		const hmac = createHmac('sha256', secret);
		hmac.update(`${timestamp}:`);
		hmac.update(body);
		return hmac.digest('hex');
	}

	function createContext(options: {
		credentialSecret?: string;
		timestamp?: string | null;
		signature?: string | null;
		body?: Buffer | string;
	}): IWebhookFunctions {
		const headers: Record<string, string | null> = {
			'x-webflow-timestamp': options.timestamp ?? null,
			'x-webflow-signature': options.signature ?? null,
		};

		return {
			getCredentials: vi.fn().mockResolvedValue({ clientSecret: options.credentialSecret }),
			getRequestObject: vi.fn().mockReturnValue({
				header: (name: string) => headers[name] ?? null,
				rawBody: options.body ?? rawBody,
			}),
		} as unknown as IWebhookFunctions;
	}

	it('accepts a valid OAuth delivery', async () => {
		const timestamp = Date.now().toString();
		const context = createContext({
			credentialSecret: clientSecret,
			timestamp,
			signature: createSignature(clientSecret, timestamp),
		});

		await expect(verifySignature.call(context)).resolves.toBe(true);
	});

	it('accepts a valid delivery with a string raw body', async () => {
		const timestamp = Date.now().toString();
		const body = rawBody.toString();
		const context = createContext({
			credentialSecret: clientSecret,
			timestamp,
			signature: createSignature(clientSecret, timestamp, body),
			body,
		});

		await expect(verifySignature.call(context)).resolves.toBe(true);
	});

	it('rejects a delivery with a missing signature', async () => {
		const context = createContext({
			credentialSecret: clientSecret,
			timestamp: Date.now().toString(),
		});

		await expect(verifySignature.call(context)).resolves.toBe(false);
	});

	it('rejects a delivery with an invalid signature', async () => {
		const context = createContext({
			credentialSecret: clientSecret,
			timestamp: Date.now().toString(),
			signature: 'invalid',
		});

		await expect(verifySignature.call(context)).resolves.toBe(false);
	});

	it('rejects a delivery with an expired timestamp', async () => {
		const timestamp = (Date.now() - 301_000).toString();
		const context = createContext({
			credentialSecret: clientSecret,
			timestamp,
			signature: createSignature(clientSecret, timestamp),
		});

		await expect(verifySignature.call(context)).resolves.toBe(false);
	});

	it('rejects a delivery with a malformed timestamp', async () => {
		const timestamp = `${Date.now()}invalid`;
		const context = createContext({
			credentialSecret: clientSecret,
			timestamp,
			signature: createSignature(clientSecret, timestamp),
		});

		await expect(verifySignature.call(context)).resolves.toBe(false);
	});

	it('rejects an OAuth delivery when the client secret is unavailable', async () => {
		const context = createContext({
			timestamp: Date.now().toString(),
			signature: 'signature',
		});

		await expect(verifySignature.call(context)).resolves.toBe(false);
	});
});
