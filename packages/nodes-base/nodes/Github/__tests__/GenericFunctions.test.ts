import type { IExecuteFunctions, IHookFunctions } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	githubApiRequest,
	getFileSha,
	githubApiRequestAllItems,
	isBase64,
	validateJSON,
	validateSecretName,
	encryptSecret,
	getRepositoryPublicKey,
} from '../GenericFunctions';
import type { Mock } from 'vitest';

const mockExecuteHookFunctions = {
	getNodeParameter: vi.fn().mockImplementation((param: string) => {
		if (param === 'authentication') return 'accessToken';
		return undefined;
	}),
	getCredentials: vi.fn().mockResolvedValue({
		server: 'https://api.github.com',
	}),
	helpers: {
		requestWithAuthentication: vi.fn(),
	},
	getCurrentNodeParameter: vi.fn(),
	getWebhookName: vi.fn(),
	getWebhookDescription: vi.fn(),
	getNodeWebhookUrl: vi.fn(),
	getWorkflowStaticData: vi.fn().mockReturnValue({}),
	getNode: vi.fn().mockReturnValue({
		id: 'test-node-id',
		name: 'test-node',
	}),
} as unknown as IExecuteFunctions | IHookFunctions;

describe('GenericFunctions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Fresh conditional-request cache per test.
		(mockExecuteHookFunctions.getWorkflowStaticData as Mock).mockReturnValue({});
	});

	describe('githubApiRequest', () => {
		it('should make a successful API request', async () => {
			const method = 'GET';
			const endpoint = '/repos/test-owner/test-repo';
			const body = {};
			const responseData = { id: 123, name: 'test-repo' };

			(mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock).mockResolvedValue(
				responseData,
			);

			const result = await githubApiRequest.call(mockExecuteHookFunctions, method, endpoint, body);

			expect(result).toEqual(responseData);
			expect(mockExecuteHookFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				{
					method: 'GET',
					body: {},
					qs: undefined,
					uri: 'https://api.github.com/repos/test-owner/test-repo',
					json: true,
				},
			);
		});

		it('should send a conditional request and cache the ETag when opted in', async () => {
			const method = 'GET';
			const endpoint = '/repos/test-owner/test-repo/pulls/1';
			const body = {};
			const staticData: Record<string, unknown> = {};
			(mockExecuteHookFunctions.getWorkflowStaticData as Mock).mockReturnValue(staticData);

			const pullRequest = { number: 1, title: 'Example' };
			(mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock).mockResolvedValue({
				statusCode: 200,
				headers: { etag: '"abc123"' },
				body: pullRequest,
			});

			const result = await githubApiRequest.call(
				mockExecuteHookFunctions,
				method,
				endpoint,
				body,
				undefined,
				{ conditionalRequest: true },
			);

			expect(result).toEqual(pullRequest);
			const call = (mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock).mock
				.calls[0][1];
			// The conditionalRequest flag must not leak into the HTTP options.
			expect(call.conditionalRequest).toBeUndefined();
			expect(call.resolveWithFullResponse).toBe(true);
			expect(call.simple).toBe(false);
			// First request must not carry a conditional header.
			expect(call.headers?.['If-None-Match']).toBeUndefined();
		});

		it('should reuse the cached response on a 304 Not Modified', async () => {
			const method = 'GET';
			const endpoint = '/repos/test-owner/test-repo/pulls/1';
			const body = {};
			const staticData: Record<string, unknown> = {};
			(mockExecuteHookFunctions.getWorkflowStaticData as Mock).mockReturnValue(staticData);

			const pullRequest = { number: 1, title: 'Example' };
			(mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock)
				.mockResolvedValueOnce({
					statusCode: 200,
					headers: { etag: '"abc123"' },
					body: pullRequest,
				})
				.mockResolvedValueOnce({ statusCode: 304, headers: {}, body: '' });

			const first = await githubApiRequest.call(
				mockExecuteHookFunctions,
				method,
				endpoint,
				body,
				undefined,
				{ conditionalRequest: true },
			);
			const second = await githubApiRequest.call(
				mockExecuteHookFunctions,
				method,
				endpoint,
				body,
				undefined,
				{ conditionalRequest: true },
			);

			expect(first).toEqual(pullRequest);
			// The cached body is served on a 304 instead of the empty response body.
			expect(second).toEqual(pullRequest);

			const calls = (mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock).mock.calls;
			expect(calls[0][1].headers?.['If-None-Match']).toBeUndefined();
			expect(calls[1][1].headers?.['If-None-Match']).toBe('"abc123"');
		});

		it('should not cache a response body that exceeds the per-entry byte budget', async () => {
			const method = 'GET';
			const endpoint = '/repos/test-owner/test-repo/pulls/1';
			const body = {};
			const staticData: Record<string, unknown> = {};
			(mockExecuteHookFunctions.getWorkflowStaticData as Mock).mockReturnValue(staticData);

			// A body larger than the 1 MiB per-entry budget must not be cached, so a
			// following request cannot revalidate it and re-fetches in full.
			const largeBody = { data: 'x'.repeat(1024 * 1024 + 1) };
			(mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock).mockResolvedValue({
				statusCode: 200,
				headers: { etag: '"big"' },
				body: largeBody,
			});

			await githubApiRequest.call(mockExecuteHookFunctions, method, endpoint, body, undefined, {
				conditionalRequest: true,
			});
			await githubApiRequest.call(mockExecuteHookFunctions, method, endpoint, body, undefined, {
				conditionalRequest: true,
			});

			const calls = (mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock).mock.calls;
			expect(calls[1][1].headers?.['If-None-Match']).toBeUndefined();
			expect(staticData.githubEtagCache).toEqual({});
		});

		it('should evict the oldest entry when the total byte budget is exceeded', async () => {
			const method = 'GET';
			const body = {};
			const staticData: Record<string, unknown> = {};
			(mockExecuteHookFunctions.getWorkflowStaticData as Mock).mockReturnValue(staticData);

			// Each body is just under the 1 MiB per-entry budget; caching nine of them
			// exceeds the 8 MiB total budget and evicts the oldest (first) entry.
			const chunk = 'y'.repeat(1000 * 1024);
			(mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock).mockImplementation(
				async (_type: string, options: { uri: string }) => ({
					statusCode: 200,
					headers: { etag: `"${options.uri}"` },
					body: { uri: options.uri, data: chunk },
				}),
			);

			for (let i = 0; i < 9; i++) {
				await githubApiRequest.call(
					mockExecuteHookFunctions,
					method,
					`/repos/test-owner/test-repo/pulls/${i}`,
					body,
					undefined,
					{ conditionalRequest: true },
				);
			}

			// The oldest endpoint (0) was evicted, so revalidating it sends no
			// conditional header; the newest (8) is still cached and does.
			await githubApiRequest.call(
				mockExecuteHookFunctions,
				method,
				'/repos/test-owner/test-repo/pulls/0',
				body,
				undefined,
				{ conditionalRequest: true },
			);
			await githubApiRequest.call(
				mockExecuteHookFunctions,
				method,
				'/repos/test-owner/test-repo/pulls/8',
				body,
				undefined,
				{ conditionalRequest: true },
			);

			const calls = (mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock).mock.calls;
			const reqZero = calls[9][1];
			const reqEight = calls[10][1];
			expect(reqZero.uri).toBe('https://api.github.com/repos/test-owner/test-repo/pulls/0');
			expect(reqZero.headers?.['If-None-Match']).toBeUndefined();
			expect(reqEight.uri).toBe('https://api.github.com/repos/test-owner/test-repo/pulls/8');
			expect(reqEight.headers?.['If-None-Match']).toBe(
				'"https://api.github.com/repos/test-owner/test-repo/pulls/8"',
			);
		});

		it('should enforce the byte budget over entries persisted without a byte count', async () => {
			const method = 'GET';
			const body = {};

			// Construct entries that lack the per-entry `bytes` field (the fallback
			// path in entryBytes): ten large entries with `bytes` absent, keyed the
			// same way githubApiRequest keys them.
			const chunk = 'z'.repeat(1000 * 1024);
			const cache: Record<string, unknown> = {};
			for (let i = 0; i < 10; i++) {
				const uri = `https://api.github.com/repos/test-owner/test-repo/pulls/legacy-${i}`;
				cache[`githubApi ${uri} {}`] = { etag: `"legacy-${i}"`, body: chunk };
			}
			const oldestLegacyKey = Object.keys(cache)[0];
			const staticData: Record<string, unknown> = { githubEtagCache: cache };
			(mockExecuteHookFunctions.getWorkflowStaticData as Mock).mockReturnValue(staticData);

			(mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock).mockResolvedValue({
				statusCode: 200,
				headers: { etag: '"fresh"' },
				body: { number: 1 },
			});

			// Writing one fresh entry runs eviction. If the entries' missing
			// `bytes` poisoned the running total to NaN, the byte budget would be
			// silently skipped and every entry would survive.
			await githubApiRequest.call(
				mockExecuteHookFunctions,
				method,
				'/repos/test-owner/test-repo/pulls/fresh',
				body,
				undefined,
				{ conditionalRequest: true },
			);

			// The byte budget must still apply: the oldest entries are evicted
			// down to within the 8 MiB total, rather than all eleven surviving.
			expect(Object.keys(cache).length).toBeLessThanOrEqual(9);
			expect(cache[oldestLegacyKey]).toBeUndefined();
		});

		it('should throw a NodeApiError on a non-success conditional response', async () => {
			const method = 'GET';
			const endpoint = '/repos/test-owner/test-repo/pulls/1';
			(mockExecuteHookFunctions.getWorkflowStaticData as Mock).mockReturnValue({});

			(mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock).mockResolvedValue({
				statusCode: 404,
				headers: {},
				body: { message: 'Not Found' },
			});

			await expect(
				githubApiRequest.call(mockExecuteHookFunctions, method, endpoint, {}, undefined, {
					conditionalRequest: true,
				}),
			).rejects.toThrow(NodeApiError);
		});

		it('should throw a NodeApiError on API failure', async () => {
			const method = 'GET';
			const endpoint = '/repos/test-owner/test-repo';
			const body = {};
			const error = new Error('API Error');

			(mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock).mockRejectedValue(error);

			await expect(
				githubApiRequest.call(mockExecuteHookFunctions, method, endpoint, body),
			).rejects.toThrow(NodeApiError);
		});
	});

	describe('getFileSha', () => {
		it('should return the SHA of a file', async () => {
			const owner = 'test-owner';
			const repository = 'test-repo';
			const filePath = 'README.md';
			const branch = 'main';
			const responseData = { sha: 'abc123' };

			(mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock).mockResolvedValue(
				responseData,
			);

			const result = await getFileSha.call(
				mockExecuteHookFunctions,
				owner,
				repository,
				filePath,
				branch,
			);

			expect(result).toBe('abc123');
			expect(mockExecuteHookFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				{
					method: 'GET',
					body: {},
					qs: { ref: 'main' },
					uri: 'https://api.github.com/repos/test-owner/test-repo/contents/README.md',
					json: true,
				},
			);
		});

		it('should throw a NodeOperationError if SHA is missing', async () => {
			const owner = 'test-owner';
			const repository = 'test-repo';
			const filePath = 'README.md';
			const responseData = {};

			(mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock).mockResolvedValue(
				responseData,
			);

			await expect(
				getFileSha.call(mockExecuteHookFunctions, owner, repository, filePath),
			).rejects.toThrow(NodeOperationError);
		});
	});

	describe('githubApiRequestAllItems', () => {
		it('should fetch all items with pagination', async () => {
			const method = 'GET';
			const endpoint = '/repos/test-owner/test-repo/issues';
			const body = {};
			const query = { state: 'open' };
			const responseData1 = [{ id: 1, title: 'Issue 1' }];
			const responseData2 = [{ id: 2, title: 'Issue 2' }];

			(mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock)
				.mockResolvedValueOnce({ headers: { link: 'next' }, body: responseData1 })
				.mockResolvedValueOnce({ headers: {}, body: responseData2 });

			const result = await githubApiRequestAllItems.call(
				mockExecuteHookFunctions,
				method,
				endpoint,
				body,
				query,
			);

			expect(result).toEqual([...responseData1, ...responseData2]);
			expect(mockExecuteHookFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);
		});
	});

	describe('isBase64', () => {
		it('should return true for valid Base64 strings', () => {
			expect(isBase64('aGVsbG8gd29ybGQ=')).toBe(true);
			expect(isBase64('Zm9vYmFy')).toBe(true);
		});

		it('should return false for invalid Base64 strings', () => {
			expect(isBase64('not base64')).toBe(false);
			expect(isBase64('123!@#')).toBe(false);
		});
	});

	describe('validateJSON', () => {
		it('should return parsed JSON for valid JSON strings', () => {
			const jsonString = '{"key": "value"}';
			const result = validateJSON(jsonString);

			expect(result).toEqual({ key: 'value' });
		});

		it('should return undefined for invalid JSON strings', () => {
			const invalidJsonString = 'not json';
			const result = validateJSON(invalidJsonString);

			expect(result).toBeUndefined();
		});
	});

	describe('validateSecretName', () => {
		it.each(['MY_SECRET', 'my_secret', 'Secret2', '_LEADING_UNDERSCORE', 'GITHUBBER'])(
			'should accept %s',
			(secretName) => {
				expect(validateSecretName(secretName)).toBeUndefined();
			},
		);

		it.each([
			['spaces', 'MY SECRET'],
			['a leading digit', '1SECRET'],
			['hyphens', 'MY-SECRET'],
			['dots', 'MY.SECRET'],
			['non-ASCII characters', 'SECRÈT'],
		])('should reject a name with %s', (_label, secretName) => {
			expect(validateSecretName(secretName)).toContain('is invalid');
		});

		it('should reject an empty name', () => {
			expect(validateSecretName('')).toBe('Secret name is required.');
		});

		it.each(['GITHUB_TOKEN', 'github_token', 'GitHub_Anything'])(
			'should reject the reserved prefix in %s',
			(secretName) => {
				expect(validateSecretName(secretName)).toContain('GITHUB_');
			},
		);
	});

	describe('encryptSecret', () => {
		// crypto_box_SEALBYTES: a 32-byte ephemeral public key plus a 16-byte MAC
		const SEALED_BOX_OVERHEAD = 48;
		const testPublicKey = Buffer.from(new Uint8Array(32).fill(1)).toString('base64');

		it('should seal to the given public key so the matching secret key opens it', async () => {
			const { default: naclFactory } = await import('js-nacl');
			const nacl = await naclFactory.instantiate(() => {});
			const keyPair = nacl.crypto_box_keypair();
			const secretValue = 'my-secret-value';

			const encrypted = await encryptSecret(
				secretValue,
				Buffer.from(keyPair.boxPk).toString('base64'),
			);

			const opened = nacl.crypto_box_seal_open(
				new Uint8Array(Buffer.from(encrypted, 'base64')),
				keyPair.boxPk,
				keyPair.boxSk,
			);
			expect(nacl.decode_utf8(opened)).toBe(secretValue);
		});

		it('should return canonical base64 with the sealed-box overhead', async () => {
			const secretValue = 'my-secret-value';

			const encrypted = await encryptSecret(secretValue, testPublicKey);

			expect(encrypted).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
			expect(Buffer.from(encrypted, 'base64').toString('base64')).toBe(encrypted);
			expect(Buffer.from(encrypted, 'base64')).toHaveLength(
				Buffer.byteLength(secretValue, 'utf8') + SEALED_BOX_OVERHEAD,
			);
		});

		it('should produce different encrypted values for the same input', async () => {
			const encrypted1 = await encryptSecret('my-secret-value', testPublicKey);
			const encrypted2 = await encryptSecret('my-secret-value', testPublicKey);

			// The sealed box uses an ephemeral key pair, so the output is never repeated
			expect(encrypted1).not.toBe(encrypted2);
		});

		it.each([
			['an empty value', ''],
			['unicode characters', 'secret-with-unicode-🔐-chars'],
			['special characters', '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~'],
			['a long value', 'a'.repeat(10000)],
		])('should encrypt %s', async (_label, secretValue) => {
			const encrypted = await encryptSecret(secretValue, testPublicKey);

			// Length is derived from the UTF-8 byte count, not the JS string length
			expect(Buffer.from(encrypted, 'base64')).toHaveLength(
				Buffer.byteLength(secretValue, 'utf8') + SEALED_BOX_OVERHEAD,
			);
		});
	});

	describe('getRepositoryPublicKey', () => {
		it('should fetch the public key of the repository', async () => {
			(mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock).mockResolvedValueOnce({
				key_id: '012345678912345678',
				key: 'base64-public-key',
			});

			const result = await getRepositoryPublicKey.call(mockExecuteHookFunctions, 'owner', 'repo');

			expect(result).toEqual({ key_id: '012345678912345678', key: 'base64-public-key' });
			expect(mockExecuteHookFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				expect.objectContaining({
					method: 'GET',
					uri: 'https://api.github.com/repos/owner/repo/actions/secrets/public-key',
				}),
			);
		});

		it.each([
			['key_id', { key: 'base64-public-key' }],
			['key', { key_id: '012345678912345678' }],
		])('should throw when the response has no %s', async (_field, response) => {
			(mockExecuteHookFunctions.helpers.requestWithAuthentication as Mock).mockResolvedValueOnce(
				response,
			);

			await expect(
				getRepositoryPublicKey.call(mockExecuteHookFunctions, 'owner', 'repo'),
			).rejects.toThrow(NodeOperationError);
		});
	});
});
