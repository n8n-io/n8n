import type { IExecuteFunctions, IHookFunctions } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	githubApiRequest,
	getFileSha,
	githubApiRequestAllItems,
	isBase64,
	validateJSON,
} from '../GenericFunctions';

const mockExecuteHookFunctions = {
	getNodeParameter: jest.fn().mockImplementation((param: string) => {
		if (param === 'authentication') return 'accessToken';
		return undefined;
	}),
	getCredentials: jest.fn().mockResolvedValue({
		server: 'https://api.github.com',
	}),
	helpers: {
		requestWithAuthentication: jest.fn(),
		httpRequestWithAuthentication: jest.fn(),
		httpRequest: jest.fn(),
	},
	getCurrentNodeParameter: jest.fn(),
	getWebhookName: jest.fn(),
	getWebhookDescription: jest.fn(),
	getNodeWebhookUrl: jest.fn(),
	getNode: jest.fn().mockReturnValue({
		id: 'test-node-id',
		name: 'test-node',
	}),
} as unknown as IExecuteFunctions | IHookFunctions;

describe('GenericFunctions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('githubApiRequest', () => {
		it('should make a successful API request', async () => {
			const method = 'GET';
			const endpoint = '/repos/test-owner/test-repo';
			const body = {};
			const responseData = { id: 123, name: 'test-repo' };

			(
				mockExecuteHookFunctions.helpers.httpRequestWithAuthentication as jest.Mock
			).mockResolvedValue(responseData);

			const result = await githubApiRequest.call(mockExecuteHookFunctions, method, endpoint, body);

			expect(result).toEqual(responseData);
			expect(mockExecuteHookFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				expect.objectContaining({
					method: 'GET',
					headers: { 'User-Agent': 'n8n' },
					url: '/repos/test-owner/test-repo',
					baseURL: 'https://api.github.com',
				}),
			);
		});

		it('should throw a NodeApiError on API failure', async () => {
			const method = 'GET';
			const endpoint = '/repos/test-owner/test-repo';
			const body = {};
			const error = new Error('API Error');

			(
				mockExecuteHookFunctions.helpers.httpRequestWithAuthentication as jest.Mock
			).mockRejectedValue(error);

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

			(
				mockExecuteHookFunctions.helpers.httpRequestWithAuthentication as jest.Mock
			).mockResolvedValue(responseData);

			const result = await getFileSha.call(
				mockExecuteHookFunctions,
				owner,
				repository,
				filePath,
				branch,
			);

			expect(result).toBe('abc123');
			expect(mockExecuteHookFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				expect.objectContaining({
					method: 'GET',
					headers: { 'User-Agent': 'n8n' },
					url: `/repos/test-owner/test-repo/contents/README.md`,
					baseURL: 'https://api.github.com',
					qs: { ref: 'main' },
				}),
			);
		});

		it('should throw a NodeOperationError if SHA is missing', async () => {
			const owner = 'test-owner';
			const repository = 'test-repo';
			const filePath = 'README.md';
			const responseData = {};

			(
				mockExecuteHookFunctions.helpers.httpRequestWithAuthentication as jest.Mock
			).mockResolvedValue(responseData);

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

			(mockExecuteHookFunctions.helpers.httpRequestWithAuthentication as jest.Mock)
				.mockResolvedValueOnce({
					headers: { link: '<url>; rel="next"' },
					body: responseData1,
					statusCode: 200,
				})
				.mockResolvedValueOnce({ headers: {}, body: responseData2, statusCode: 200 });

			const result = await githubApiRequestAllItems.call(
				mockExecuteHookFunctions,
				method,
				endpoint,
				body,
				query,
			);

			expect(result).toEqual([...responseData1, ...responseData2]);
			expect(mockExecuteHookFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(
				2,
			);
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
