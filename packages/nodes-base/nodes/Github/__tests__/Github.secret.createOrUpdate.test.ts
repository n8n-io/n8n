import type { IExecuteFunctions } from 'n8n-workflow';
import type { Mock, MockedObject } from 'vitest';

import { Github } from '../Github.node';
import * as GenericFunctions from '../GenericFunctions';

vi.mock('../GenericFunctions', async () => ({
	...(await vi.importActual('../GenericFunctions')),
	githubApiRequest: vi.fn(),
	getRepositoryPublicKey: vi.fn(),
	encryptSecret: vi.fn(),
}));

describe('Github Node - Secret CreateOrUpdate Operation', () => {
	let github: Github;
	let mockExecuteFunctions: MockedObject<IExecuteFunctions>;

	beforeEach(() => {
		github = new Github();
		vi.clearAllMocks();

		mockExecuteFunctions = {
			getNodeParameter: vi.fn(),
			getInputData: vi.fn().mockReturnValue([{ json: {} }]),
			getNode: vi.fn().mockReturnValue({
				id: 'test-node-id',
				name: 'Github',
				type: 'n8n-nodes-base.github',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			}),
			helpers: {
				assertBinaryData: vi.fn(),
				getBinaryDataBuffer: vi.fn(),
				requestWithAuthentication: vi.fn(),
				returnJsonArray: vi.fn((data) => (Array.isArray(data) ? data : [data])),
				constructExecutionMetaData: vi.fn((data) => data),
			},
			getCredentials: vi.fn().mockResolvedValue({
				accessToken: 'test-token',
				server: 'https://api.github.com',
			}),
			continueOnFail: vi.fn().mockReturnValue(false),
		} as unknown as MockedObject<IExecuteFunctions>;
	});

	describe('Secret CreateOrUpdate - Basic Flow', () => {
		it('should create or update a repository secret successfully', async () => {
			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation(
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
			(GenericFunctions.getRepositoryPublicKey as Mock).mockResolvedValue({
				key_id: 'test-key-id-123',
				key: 'base64-encoded-public-key',
			});

			// Mock the encryption function
			(GenericFunctions.encryptSecret as Mock).mockResolvedValue('encrypted-secret-value');

			// Mock the API request (GitHub returns empty for success)
			(GenericFunctions.githubApiRequest as Mock).mockResolvedValue({});

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
	});

	describe('Secret CreateOrUpdate - Name Validation', () => {
		const mockSecretParams = (secretName: string) => {
			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation(
				(paramName: string, _itemIndex: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						resource: 'secret',
						operation: 'createOrUpdate',
						owner: 'test-owner',
						repository: 'test-repo',
						secretName,
						secretValue: 'value',
					};
					return params[paramName] ?? fallback;
				},
			);

			(GenericFunctions.getRepositoryPublicKey as Mock).mockResolvedValue({
				key_id: 'key-id',
				key: 'public-key',
			});
			(GenericFunctions.encryptSecret as Mock).mockResolvedValue('encrypted');
			(GenericFunctions.githubApiRequest as Mock).mockResolvedValue({});
		};

		it.each([
			['a name containing spaces', 'SECRET WITH SPACES'],
			['a name starting with a number', '1_SECRET'],
			['a name containing a hyphen', 'MY-SECRET'],
			['a name using the reserved GITHUB_ prefix', 'GITHUB_TOKEN'],
		])('should reject %s before contacting the API', async (_label, secretName) => {
			mockSecretParams(secretName);

			await expect(github.execute.call(mockExecuteFunctions)).rejects.toThrow(
				`Secret name "${secretName}" is invalid`,
			);

			// The name is rejected locally, so no key lookup or encryption happens
			expect(GenericFunctions.getRepositoryPublicKey).not.toHaveBeenCalled();
			expect(GenericFunctions.encryptSecret).not.toHaveBeenCalled();
			expect(GenericFunctions.githubApiRequest).not.toHaveBeenCalled();
		});

		it('should accept a valid secret name', async () => {
			mockSecretParams('MY_SECRET_2');

			await github.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.githubApiRequest).toHaveBeenCalledWith(
				'PUT',
				'/repos/test-owner/test-repo/actions/secrets/MY_SECRET_2',
				expect.any(Object),
				{},
			);
		});
	});

	describe('Secret CreateOrUpdate - Error Handling', () => {
		it('should handle API errors gracefully', async () => {
			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation(
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

			(GenericFunctions.getRepositoryPublicKey as Mock).mockResolvedValue({
				key_id: 'key-id',
				key: 'public-key',
			});

			(GenericFunctions.encryptSecret as Mock).mockResolvedValue('encrypted');

			// Simulate API error
			(GenericFunctions.githubApiRequest as Mock).mockRejectedValue(
				new Error('API Error: Unauthorized'),
			);

			await expect(github.execute.call(mockExecuteFunctions)).rejects.toThrow();
		});

		it('should handle public key retrieval failure', async () => {
			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation(
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
			(GenericFunctions.getRepositoryPublicKey as Mock).mockRejectedValue(
				new Error('Failed to get public key'),
			);

			await expect(github.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Failed to get public key',
			);
		});
	});
});
