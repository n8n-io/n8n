import type { IExecuteFunctions } from 'n8n-workflow';

import { Github } from '../Github.node';
import * as GenericFunctions from '../GenericFunctions';

jest.mock('../GenericFunctions', () => ({
	...jest.requireActual('../GenericFunctions'),
	githubApiRequest: jest.fn(),
	getFileSha: jest.fn(),
}));

describe('Github Node - File Create/Edit Operations', () => {
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

	describe('File Create - Binary Data', () => {
		it('should handle binary data by converting buffer to base64', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string, _itemIndex: number, fallback?: any) => {
					const params: Record<string, any> = {
						resource: 'file',
						operation: 'create',
						owner: 'test-owner',
						repository: 'test-repo',
						filePath: 'test/file.txt',
						commitMessage: 'Add test file',
						binaryData: true,
						binaryPropertyName: 'data',
						additionalParameters: {},
					};
					return params[paramName] ?? fallback;
				},
			);

			const mockBinaryData = {
				id: 'test-id',
				data: 'base64data',
				mimeType: 'text/plain',
				fileName: 'test.txt',
			};
			const expectedBuffer = Buffer.from('test content');
			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);
			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				expectedBuffer,
			);

			(GenericFunctions.githubApiRequest as jest.Mock).mockResolvedValue({
				content: {
					name: 'file.txt',
					path: 'test/file.txt',
					sha: 'abc123',
				},
			});

			const result = await github.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');

			expect(GenericFunctions.githubApiRequest).toHaveBeenCalledWith(
				'PUT',
				'/repos/test-owner/test-repo/contents/test%2Ffile.txt',
				expect.objectContaining({
					content: expectedBuffer.toString('base64'),
					message: 'Add test file',
				}),
				{},
			);

			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe('File Create - Text Content', () => {
		it('should use base64 content as-is when fileContent is already base64', async () => {
			const base64Content = 'dGVzdCBjb250ZW50';
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string, _itemIndex: number, fallback?: any) => {
					const params: Record<string, any> = {
						resource: 'file',
						operation: 'create',
						owner: 'test-owner',
						repository: 'test-repo',
						filePath: 'test/file.txt',
						commitMessage: 'Add test file',
						binaryData: false,
						fileContent: base64Content,
						additionalParameters: {},
					};
					return params[paramName] ?? fallback;
				},
			);

			(GenericFunctions.githubApiRequest as jest.Mock).mockResolvedValue({
				content: {
					name: 'file.txt',
					path: 'test/file.txt',
					sha: 'abc123',
				},
			});

			const result = await github.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.githubApiRequest).toHaveBeenCalledWith(
				'PUT',
				'/repos/test-owner/test-repo/contents/test%2Ffile.txt',
				expect.objectContaining({
					content: base64Content,
					message: 'Add test file',
				}),
				{},
			);

			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);
		});

		it('should convert plain text to base64 when fileContent is not base64', async () => {
			const plainTextContent = 'Hello, World! This is plain text.';
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string, _itemIndex: number, fallback?: any) => {
					const params: Record<string, any> = {
						resource: 'file',
						operation: 'create',
						owner: 'test-owner',
						repository: 'test-repo',
						filePath: 'test/file.txt',
						commitMessage: 'Add test file',
						binaryData: false,
						fileContent: plainTextContent,
						additionalParameters: {},
					};
					return params[paramName] ?? fallback;
				},
			);

			(GenericFunctions.githubApiRequest as jest.Mock).mockResolvedValue({
				content: {
					name: 'file.txt',
					path: 'test/file.txt',
					sha: 'abc123',
				},
			});

			const result = await github.execute.call(mockExecuteFunctions);

			const expectedBase64 = Buffer.from(plainTextContent).toString('base64');

			expect(GenericFunctions.githubApiRequest).toHaveBeenCalledWith(
				'PUT',
				'/repos/test-owner/test-repo/contents/test%2Ffile.txt',
				expect.objectContaining({
					content: expectedBase64,
					message: 'Add test file',
				}),
				{},
			);

			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe('File Edit - Binary Data', () => {
		it('should get file SHA and convert buffer to base64 for edit operation', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string, _itemIndex: number, fallback?: any) => {
					const params: Record<string, any> = {
						resource: 'file',
						operation: 'edit',
						owner: 'test-owner',
						repository: 'test-repo',
						filePath: 'test/file.txt',
						commitMessage: 'Update test file',
						binaryData: true,
						binaryPropertyName: 'data',
						additionalParameters: {},
					};
					return params[paramName] ?? fallback;
				},
			);

			const mockBinaryData = {
				id: 'test-id',
				data: 'old-base64-data',
				mimeType: 'text/plain',
				fileName: 'test.txt',
			};
			const expectedBuffer = Buffer.from('updated content');
			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);
			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				expectedBuffer,
			);

			(GenericFunctions.getFileSha as jest.Mock).mockResolvedValue('existing-sha-123');

			(GenericFunctions.githubApiRequest as jest.Mock).mockResolvedValue({
				content: {
					name: 'file.txt',
					path: 'test/file.txt',
					sha: 'new-sha-456',
				},
			});

			const result = await github.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.getFileSha).toHaveBeenCalledWith(
				'test-owner',
				'test-repo',
				'test/file.txt',
				undefined,
			);

			expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');

			expect(GenericFunctions.githubApiRequest).toHaveBeenCalledWith(
				'PUT',
				'/repos/test-owner/test-repo/contents/test%2Ffile.txt',
				expect.objectContaining({
					content: expectedBuffer.toString('base64'),
					message: 'Update test file',
					sha: 'existing-sha-123',
				}),
				{},
			);

			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);
		});
	});
});
