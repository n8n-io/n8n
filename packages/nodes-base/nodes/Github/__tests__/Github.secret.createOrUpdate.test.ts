import type { IExecuteFunctions } from 'n8n-workflow';

import { Github } from '../Github.node';
import * as GenericFunctions from '../GenericFunctions';

jest.mock('../GenericFunctions', () => ({
	...jest.requireActual('../GenericFunctions'),
	githubApiRequest: jest.fn(),
	getRepositoryPublicKey: jest.fn(),
	encryptSecret: jest.fn(),
}));

describe('Github Node - Secret CreateOrUpdate Operation', () => {
	let github: Github;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		github = new Github();
		jest.clearAllMocks();

		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNode: jest.fn().mockReturnValue({
				id: 'test-node-id',
				name: 'Github',
				type: 'n8n-nodes-base.github',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			}),
			helpers: {
				assertBinaryData: jest.fn(),
				getBinaryDataBuffer: jest.fn(),
				requestWithAuthentication: jest.fn(),
				returnJsonArray: jest.fn((data) => (Array.isArray(data) ? data : [data])),
				constructExecutionMetaData: jest.fn((data) => data),
			},
			getCredentials: jest.fn().mockResolvedValue({
				accessToken: 'test-token',
				server: 'https://api.github.com',
			}),
			continueOnFail: jest.fn().mockReturnValue(false),
		} as unknown as jest.Mocked<IExecuteFunctions>;
	});

	describe('Secret CreateOrUpdate - Basic Flow', () => {
		it('should create or update a repository secret successfully', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string, _itemIndex: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						resource: 'secret',
						operation: 'createOrUpdate',
						owner: 'test-owner',
						repository: 'test-repo',
						secretName: 'MY_SECRET',
						secretValue: 'super-secret-value',
					};
					return params[paramName] ?? fallback;
				},
			);

			// Mock the public key retrieval
			(GenericFunctions.getRepositoryPublicKey as jest.Mock).mockResolvedValue({
				key_id: 'test-key-id-123',
				key: 'base64-encoded-public-key',
			});

			// Mock the encryption function
			(GenericFunctions.encryptSecret as jest.Mock).mockResolvedValue('encrypted-secret-value');

			// Mock the API request (GitHub returns empty for success)
			(GenericFunctions.githubApiRequest as jest.Mock).mockResolvedValue({});

			const result = await github.execute.call(mockExecuteFunctions);

			// Verify public key was fetched
			expect(GenericFunctions.getRepositoryPublicKey).toHaveBeenCalledWith(
				'test-owner',
				'test-repo',
			);

			// Verify secret was encrypted
			expect(GenericFunctions.encryptSecret).toHaveBeenCalledWith(
				'super-secret-value',
				'base64-encoded-public-key',
			);

			// Verify API was called with correct parameters
			expect(GenericFunctions.githubApiRequest).toHaveBeenCalledWith(
				'PUT',
				'/repos/test-owner/test-repo/actions/secrets/MY_SECRET',
				{
					encrypted_value: 'encrypted-secret-value',
					key_id: 'test-key-id-123',
				},
				{},
			);

			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);
			// The result structure from constructExecutionMetaData contains the success object
			expect(result[0]).toBeDefined();
			expect(result[0].length).toBeGreaterThan(0);
		});

		it('should handle special characters in secret name by URL encoding', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string, _itemIndex: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						resource: 'secret',
						operation: 'createOrUpdate',
						owner: 'test-owner',
						repository: 'test-repo',
						secretName: 'SECRET_WITH_SPECIAL',
						secretValue: 'value',
					};
					return params[paramName] ?? fallback;
				},
			);

			(GenericFunctions.getRepositoryPublicKey as jest.Mock).mockResolvedValue({
				key_id: 'key-id',
				key: 'public-key',
			});

			(GenericFunctions.encryptSecret as jest.Mock).mockResolvedValue('encrypted');
			(GenericFunctions.githubApiRequest as jest.Mock).mockResolvedValue({});

			await github.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.githubApiRequest).toHaveBeenCalledWith(
				'PUT',
				'/repos/test-owner/test-repo/actions/secrets/SECRET_WITH_SPECIAL',
				expect.any(Object),
				{},
			);
		});
	});

	describe('Secret CreateOrUpdate - Error Handling', () => {
		it('should handle API errors gracefully', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string, _itemIndex: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						resource: 'secret',
						operation: 'createOrUpdate',
						owner: 'test-owner',
						repository: 'test-repo',
						secretName: 'MY_SECRET',
						secretValue: 'secret-value',
					};
					return params[paramName] ?? fallback;
				},
			);

			(GenericFunctions.getRepositoryPublicKey as jest.Mock).mockResolvedValue({
				key_id: 'key-id',
				key: 'public-key',
			});

			(GenericFunctions.encryptSecret as jest.Mock).mockResolvedValue('encrypted');

			// Simulate API error
			(GenericFunctions.githubApiRequest as jest.Mock).mockRejectedValue(
				new Error('API Error: Unauthorized'),
			);

			await expect(github.execute.call(mockExecuteFunctions)).rejects.toThrow();
		});

		it('should handle public key retrieval failure', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string, _itemIndex: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						resource: 'secret',
						operation: 'createOrUpdate',
						owner: 'test-owner',
						repository: 'test-repo',
						secretName: 'MY_SECRET',
						secretValue: 'secret-value',
					};
					return params[paramName] ?? fallback;
				},
			);

			// Simulate public key retrieval failure
			(GenericFunctions.getRepositoryPublicKey as jest.Mock).mockRejectedValue(
				new Error('Failed to get public key'),
			);

			await expect(github.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Failed to get public key',
			);
		});
	});
});
