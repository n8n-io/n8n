import { NodeApiError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import * as GenericFunctions from '../GenericFunctions';
import type * as _importType0 from '../GenericFunctions';
import { Gitlab } from '../Gitlab.node';

vi.mock('../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../GenericFunctions')),
	gitlabApiRequest: vi.fn(),
}));

function createMockExecuteFunction(params: Record<string, any>) {
	const merged: Record<string, any> = {
		authentication: 'accessToken',
		resource: 'file',
		owner: 'test-owner',
		repository: 'test-repo',
		...params,
	};

	return {
		getNodeParameter: vi.fn((paramName: string, _itemIndex?: number, fallback?: any) => {
			return paramName in merged ? merged[paramName] : fallback;
		}),
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
			requestWithAuthentication: vi.fn(),
			returnJsonArray: vi.fn((data: any) => {
				if (Array.isArray(data)) {
					return data.map((item) => ({ json: item }));
				}
				return [{ json: data }];
			}),
			constructExecutionMetaData: vi.fn((data: any) => data),
			getBinaryDataBuffer: vi.fn(),
		},
		getCredentials: vi.fn().mockResolvedValue({
			accessToken: 'test-token',
			server: 'https://gitlab.example.com',
		}),
		continueOnFail: vi.fn().mockReturnValue(false),
	} as any;
}

function makeGitlabError(statusCode: number, message: string) {
	return {
		statusCode,
		response: { body: { message } },
		message,
	};
}

/**
 * Focused tests for the binary-data branch of file:create / file:edit.
 * Text content is covered by Gitlab.file.test.ts.
 */
describe('Gitlab Node - File Operations (binary data)', () => {
	let gitlab: Gitlab;

	beforeEach(() => {
		gitlab = new Gitlab();
		vi.clearAllMocks();
	});

	describe('file:create (binary content)', () => {
		it('should call getBinaryDataBuffer and base64-encode the resulting buffer', async () => {
			const mock = createMockExecuteFunction({
				operation: 'create',
				filePath: 'images/logo.png',
				branch: 'main',
				commitMessage: 'Add logo',
				binaryData: true,
				binaryPropertyName: 'data',
				additionalParameters: {},
			});

			const expectedBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
			(mock.helpers.getBinaryDataBuffer as Mock).mockResolvedValue(expectedBuffer);
			(GenericFunctions.gitlabApiRequest as Mock).mockResolvedValue({
				file_path: 'images/logo.png',
				branch: 'main',
			});

			const result = await gitlab.execute.call(mock);

			expect(mock.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');
			expect(GenericFunctions.gitlabApiRequest).toHaveBeenCalledWith(
				'POST',
				'/projects/test-owner%2Ftest-repo/repository/files/images%2Flogo.png',
				{
					branch: 'main',
					commit_message: 'Add logo',
					content: expectedBuffer.toString('base64'),
					encoding: 'base64',
				},
				{},
			);
			expect(result[0][0].json).toMatchObject({ file_path: 'images/logo.png' });
		});

		it('should respect the custom binaryPropertyName when reading the buffer', async () => {
			const mock = createMockExecuteFunction({
				operation: 'create',
				filePath: 'data.bin',
				branch: 'main',
				commitMessage: 'Add data',
				binaryData: true,
				binaryPropertyName: 'attachment',
				additionalParameters: {},
			});

			const buf = Buffer.from('hello');
			(mock.helpers.getBinaryDataBuffer as Mock).mockResolvedValue(buf);
			(GenericFunctions.gitlabApiRequest as Mock).mockResolvedValue({ file_path: 'data.bin' });

			await gitlab.execute.call(mock);

			expect(mock.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'attachment');
		});

		it('should throw NodeApiError on 404 (project not found)', async () => {
			const mock = createMockExecuteFunction({
				operation: 'create',
				owner: 'missing',
				repository: 'nope',
				filePath: 'data.bin',
				branch: 'main',
				commitMessage: 'x',
				binaryData: true,
				binaryPropertyName: 'data',
				additionalParameters: {},
			});
			(mock.helpers.getBinaryDataBuffer as Mock).mockResolvedValue(Buffer.from('x'));
			(GenericFunctions.gitlabApiRequest as Mock).mockRejectedValue(
				new NodeApiError(
					mock.getNode() as any,
					makeGitlabError(404, '404 Project Not Found') as any,
				),
			);

			await expect(gitlab.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});

		it('should attach an error item to the result when continueOnFail=true', async () => {
			const mock = createMockExecuteFunction({
				operation: 'create',
				filePath: 'data.bin',
				branch: 'main',
				commitMessage: 'x',
				binaryData: true,
				binaryPropertyName: 'data',
				additionalParameters: {},
			});
			mock.continueOnFail = vi.fn().mockReturnValue(true);
			(mock.helpers.getBinaryDataBuffer as Mock).mockResolvedValue(Buffer.from('x'));
			(GenericFunctions.gitlabApiRequest as Mock).mockRejectedValue(
				makeGitlabError(500, '500 Internal Server Error'),
			);

			const result = await gitlab.execute.call(mock);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ error: expect.any(String) });
		});
	});

	describe('file:edit (binary content)', () => {
		it('should PUT the base64-encoded buffer content to /repository/files', async () => {
			const mock = createMockExecuteFunction({
				operation: 'edit',
				filePath: 'images/logo.png',
				branch: 'main',
				commitMessage: 'Update logo',
				binaryData: true,
				binaryPropertyName: 'data',
				additionalParameters: {},
			});

			const updatedBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0xff]);
			(mock.helpers.getBinaryDataBuffer as Mock).mockResolvedValue(updatedBuffer);
			(GenericFunctions.gitlabApiRequest as Mock).mockResolvedValue({
				file_path: 'images/logo.png',
				branch: 'main',
			});

			await gitlab.execute.call(mock);

			expect(GenericFunctions.gitlabApiRequest).toHaveBeenCalledWith(
				'PUT',
				'/projects/test-owner%2Ftest-repo/repository/files/images%2Flogo.png',
				{
					branch: 'main',
					commit_message: 'Update logo',
					content: updatedBuffer.toString('base64'),
					encoding: 'base64',
				},
				{},
			);
		});

		it('should throw NodeApiError on 404 (file not found)', async () => {
			const mock = createMockExecuteFunction({
				operation: 'edit',
				filePath: 'images/missing.png',
				branch: 'main',
				commitMessage: 'x',
				binaryData: true,
				binaryPropertyName: 'data',
				additionalParameters: {},
			});
			(mock.helpers.getBinaryDataBuffer as Mock).mockResolvedValue(Buffer.from('x'));
			(GenericFunctions.gitlabApiRequest as Mock).mockRejectedValue(
				new NodeApiError(mock.getNode() as any, makeGitlabError(404, '404 File Not Found') as any),
			);

			await expect(gitlab.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});
	});
});
