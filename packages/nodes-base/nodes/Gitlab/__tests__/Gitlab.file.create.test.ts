import type { IExecuteFunctions } from 'n8n-workflow';
import { Gitlab } from '../Gitlab.node';
import * as GenericFunctions from '../GenericFunctions';

jest.mock('../GenericFunctions', () => ({
	...jest.requireActual('../GenericFunctions'),
	gitlabApiRequest: jest.fn(),
	gitlabApiRequestAllItems: jest.fn(),
}));

describe('Gitlab Node - File Create Operations', () => {
	let gitlab: Gitlab;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		gitlab = new Gitlab();
		jest.clearAllMocks();

		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNode: jest.fn().mockReturnValue({
				id: 'test-node-id',
				name: 'GitLab',
				type: 'n8n-nodes-base.gitlab',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			}),
			helpers: {
				prepareBinaryData: jest.fn(),
				getBinaryDataBuffer: jest.fn(),
				returnJsonArray: jest.fn((data) => (Array.isArray(data) ? data : [data])),
				constructExecutionMetaData: jest.fn((data) => data),
			},
			continueOnFail: jest.fn().mockReturnValue(false),
		} as unknown as jest.Mocked<IExecuteFunctions>;
	});

	it('should create file with binary data from filesystem', async () => {
		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
			(paramName: string, _itemIndex: number, fallback?: any) => {
				const params: Record<string, any> = {
					resource: 'file',
					operation: 'create',
					owner: 'test-owner',
					repository: 'test-repo',
					filePath: 'test-file.txt',
					commitMessage: 'Test commit',
					binaryData: true,
					binaryPropertyName: 'data',
					additionalParameters: {},
				};
				return params[paramName] ?? fallback;
			},
		);

		const expectedBuffer = Buffer.from('test content');
		(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
			expectedBuffer,
		);

		(GenericFunctions.gitlabApiRequest as jest.Mock).mockResolvedValue({
			file_path: 'test.txt',
			branch: 'main',
		});

		const result = await gitlab.execute.call(mockExecuteFunctions);

		expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');
		expect(GenericFunctions.gitlabApiRequest).toHaveBeenCalledWith(
			'POST',
			'/projects/test-owner%2Ftest-repo/repository/files/test-file.txt',
			expect.objectContaining({
				content: expectedBuffer.toString('base64'),
				encoding: 'base64',
				commit_message: 'Test commit',
			}),
			{},
		);
		expect(result).toBeDefined();
	});

	it('should create file with text content and base64 encoding', async () => {
		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
			(paramName: string, _itemIndex: number, fallback?: any) => {
				const params: Record<string, any> = {
					resource: 'file',
					operation: 'create',
					owner: 'test-owner',
					repository: 'test-repo',
					filePath: 'test-text.txt',
					commitMessage: 'Test commit',
					binaryData: false,
					fileContent: 'Hello World',
					additionalParameters: {
						encoding: 'base64',
					},
				};
				return params[paramName] ?? fallback;
			},
		);

		(GenericFunctions.gitlabApiRequest as jest.Mock).mockResolvedValue({
			file_path: 'test.txt',
			branch: 'main',
		});

		const result = await gitlab.execute.call(mockExecuteFunctions);

		expect(GenericFunctions.gitlabApiRequest).toHaveBeenCalledWith(
			'POST',
			'/projects/test-owner%2Ftest-repo/repository/files/test-text.txt',
			expect.objectContaining({
				content: Buffer.from('Hello World').toString('base64'),
				encoding: 'base64',
			}),
			{},
		);
		expect(result).toBeDefined();
	});

	it('should create file with plain text content', async () => {
		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
			(paramName: string, _itemIndex: number, fallback?: any) => {
				const params: Record<string, any> = {
					resource: 'file',
					operation: 'create',
					owner: 'test-owner',
					repository: 'test-repo',
					filePath: 'test-plain.txt',
					commitMessage: 'Test commit',
					binaryData: false,
					fileContent: 'Plain text content',
					additionalParameters: {
						encoding: 'text',
					},
				};
				return params[paramName] ?? fallback;
			},
		);

		(GenericFunctions.gitlabApiRequest as jest.Mock).mockResolvedValue({
			file_path: 'test.txt',
			branch: 'main',
		});

		const result = await gitlab.execute.call(mockExecuteFunctions);

		expect(GenericFunctions.gitlabApiRequest).toHaveBeenCalledWith(
			'POST',
			'/projects/test-owner%2Ftest-repo/repository/files/test-plain.txt',
			expect.objectContaining({
				content: 'Plain text content',
				encoding: 'text',
			}),
			{},
		);
		expect(result).toBeDefined();
	});

	it('should throw error when fileContent is not a string', async () => {
		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
			(paramName: string, _itemIndex: number, fallback?: any) => {
				const params: Record<string, any> = {
					resource: 'file',
					operation: 'create',
					owner: 'test-owner',
					repository: 'test-repo',
					filePath: 'test-error.txt',
					commitMessage: 'Test commit',
					binaryData: false,
					fileContent: 12345, // Invalid non-string input
					additionalParameters: {
						encoding: 'text',
					},
				};
				return params[paramName] ?? fallback;
			},
		);

		await expect(gitlab.execute.call(mockExecuteFunctions)).rejects.toThrow(
			'The parameter "fileContent" should be a string.',
		);
	});
});
