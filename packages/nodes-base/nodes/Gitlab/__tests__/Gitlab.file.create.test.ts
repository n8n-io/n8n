import type { IExecuteFunctions } from 'n8n-workflow';

import { Gitlab } from '../Gitlab.node';
import * as GenericFunctions from '../GenericFunctions';
import type { Mock, Mocked } from 'vitest';
import type * as _importType0 from '../GenericFunctions';

vi.mock('../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../GenericFunctions')),
	gitlabApiRequest: vi.fn(),
}));

describe('Gitlab Node - File Create/Edit Operations', () => {
	let gitlab: Gitlab;
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;

	beforeEach(() => {
		gitlab = new Gitlab();
		vi.clearAllMocks();

		mockExecuteFunctions = {
			getNodeParameter: vi.fn(),
			getInputData: vi.fn().mockReturnValue([{ json: {} }]),
			getNode: vi.fn().mockReturnValue({
				id: 'test-node-id',
				name: 'Gitlab',
				type: 'n8n-nodes-base.gitlab',
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
				server: 'https://gitlab.example.com',
			}),
			continueOnFail: vi.fn().mockReturnValue(false),
		} as unknown as Mocked<IExecuteFunctions>;
	});

	describe('File Create - Binary Data', () => {
		it('should use getBinaryDataBuffer to correctly resolve binary content', async () => {
			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation(
				(paramName: string, _itemIndex: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						authentication: 'accessToken',
						resource: 'file',
						operation: 'create',
						owner: 'test-owner',
						repository: 'test-repo',
						filePath: 'test/file.txt',
						branch: 'main',
						commitMessage: 'Add test file',
						binaryData: true,
						binaryPropertyName: 'data',
						additionalParameters: {},
					};
					return params[paramName] ?? fallback;
				},
			);

			const expectedBuffer = Buffer.from('test binary content');
			(mockExecuteFunctions.helpers.getBinaryDataBuffer as Mock).mockResolvedValue(expectedBuffer);

			(GenericFunctions.gitlabApiRequest as Mock).mockResolvedValue({
				file_path: 'test/file.txt',
				branch: 'main',
			});

			const result = await gitlab.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');

			expect(GenericFunctions.gitlabApiRequest).toHaveBeenCalledWith(
				'POST',
				expect.stringContaining('/repository/files/'),
				expect.objectContaining({
					content: expectedBuffer.toString('base64'),
					encoding: 'base64',
					commit_message: 'Add test file',
					branch: 'main',
				}),
				{},
			);

			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe('File Edit - Binary Data', () => {
		it('should use getBinaryDataBuffer for edit operations with binary data', async () => {
			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation(
				(paramName: string, _itemIndex: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						authentication: 'accessToken',
						resource: 'file',
						operation: 'edit',
						owner: 'test-owner',
						repository: 'test-repo',
						filePath: 'test/file.txt',
						branch: 'main',
						commitMessage: 'Update test file',
						binaryData: true,
						binaryPropertyName: 'data',
						additionalParameters: {},
					};
					return params[paramName] ?? fallback;
				},
			);

			const expectedBuffer = Buffer.from('updated binary content');
			(mockExecuteFunctions.helpers.getBinaryDataBuffer as Mock).mockResolvedValue(expectedBuffer);

			(GenericFunctions.gitlabApiRequest as Mock).mockResolvedValue({
				file_path: 'test/file.txt',
				branch: 'main',
			});

			const result = await gitlab.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');

			expect(GenericFunctions.gitlabApiRequest).toHaveBeenCalledWith(
				'PUT',
				expect.stringContaining('/repository/files/'),
				expect.objectContaining({
					content: expectedBuffer.toString('base64'),
					encoding: 'base64',
					commit_message: 'Update test file',
					branch: 'main',
				}),
				{},
			);

			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe('File Create - Text Content', () => {
		it('should encode text content as base64 when encoding is set to base64', async () => {
			const fileContent = 'Hello, World!';
			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation(
				(paramName: string, _itemIndex: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						authentication: 'accessToken',
						resource: 'file',
						operation: 'create',
						owner: 'test-owner',
						repository: 'test-repo',
						filePath: 'test/file.txt',
						branch: 'main',
						commitMessage: 'Add text file',
						binaryData: false,
						fileContent,
						additionalParameters: { encoding: 'base64' },
					};
					return params[paramName] ?? fallback;
				},
			);

			(GenericFunctions.gitlabApiRequest as Mock).mockResolvedValue({
				file_path: 'test/file.txt',
				branch: 'main',
			});

			const result = await gitlab.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.gitlabApiRequest).toHaveBeenCalledWith(
				'POST',
				expect.stringContaining('/repository/files/'),
				expect.objectContaining({
					content: Buffer.from(fileContent).toString('base64'),
					commit_message: 'Add text file',
					branch: 'main',
				}),
				{},
			);

			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);
		});

		it('should send text content as-is when encoding is not base64', async () => {
			const fileContent = 'Hello, World!';
			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation(
				(paramName: string, _itemIndex: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						authentication: 'accessToken',
						resource: 'file',
						operation: 'create',
						owner: 'test-owner',
						repository: 'test-repo',
						filePath: 'test/file.txt',
						branch: 'main',
						commitMessage: 'Add text file',
						binaryData: false,
						fileContent,
						additionalParameters: {},
					};
					return params[paramName] ?? fallback;
				},
			);

			(GenericFunctions.gitlabApiRequest as Mock).mockResolvedValue({
				file_path: 'test/file.txt',
				branch: 'main',
			});

			const result = await gitlab.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.gitlabApiRequest).toHaveBeenCalledWith(
				'POST',
				expect.stringContaining('/repository/files/'),
				expect.objectContaining({
					content: fileContent,
					commit_message: 'Add text file',
					branch: 'main',
				}),
				{},
			);

			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);
		});
	});
});
