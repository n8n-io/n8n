import type { IExecuteFunctions, IHookFunctions } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	githubApiRequest,
	getFileSha,
	githubApiRequestAllItems,
	isBase64,
	validateJSON,
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
});
