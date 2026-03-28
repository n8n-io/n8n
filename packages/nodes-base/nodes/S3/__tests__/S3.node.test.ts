import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { S3 } from '../S3.node';
import * as GenericFunctions from '../GenericFunctions';

jest.mock('../GenericFunctions', () => ({
	s3ApiRequestSOAP: jest.fn(),
	s3ApiRequestSOAPAllItems: jest.fn(),
	s3ApiRequestREST: jest.fn(),
	s3ApiRequest: jest.fn(),
}));

function buildMockContext(overrides: {
	resource: string;
	operation: string;
	typeVersion?: number;
	params?: Record<string, unknown>;
}): IExecuteFunctions {
	const { resource, operation, typeVersion = 1.1, params = {} } = overrides;

	const paramMap: Record<string, unknown> = {
		resource,
		operation,
		...params,
	};

	return {
		getInputData: jest.fn().mockReturnValue([{ json: {} }]),
		getNode: jest.fn().mockReturnValue({ name: 'S3', typeVersion }),
		getNodeParameter: jest.fn().mockImplementation((name: string) => paramMap[name] ?? ''),
		getCredentials: jest.fn().mockResolvedValue({
			endpoint: 'https://s3.example.com',
			region: 'us-east-1',
		}),
		helpers: {
			constructExecutionMetaData: jest
				.fn()
				.mockImplementation((data: INodeExecutionData[], meta: unknown) => data),
			returnJsonArray: jest.fn().mockImplementation((data: unknown) => [{ json: data }]),
			request: jest.fn(),
		},
		continueOnFail: jest.fn().mockReturnValue(false),
	} as unknown as IExecuteFunctions;
}

describe('S3 Node', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('bucket > delete', () => {
		it('should call DELETE on the bucket and return success', async () => {
			const mockSOAP = jest
				.spyOn(GenericFunctions, 's3ApiRequestSOAP')
				.mockResolvedValue(undefined);

			const ctx = buildMockContext({
				resource: 'bucket',
				operation: 'delete',
				params: { name: 'my-bucket' },
			});

			const node = new S3();
			const result = await node.execute.call(ctx);

			expect(mockSOAP).toHaveBeenCalledWith('my-bucket', 'DELETE', '');
			expect(result[0][0].json).toEqual({ success: true });
		});
	});

	describe('file > copy — destinationPath normalization', () => {
		function setupCopyMock(ctx: IExecuteFunctions, locationRegion = '') {
			const mockSOAP = jest.spyOn(GenericFunctions, 's3ApiRequestSOAP');

			// First call: GET location
			mockSOAP.mockResolvedValueOnce({
				LocationConstraint: { _: locationRegion },
			});
			// Second call: PUT copy
			mockSOAP.mockResolvedValueOnce({
				CopyObjectResult: { ETag: '"abc"', LastModified: '2026-01-01' },
			});

			return mockSOAP;
		}

		it('v1 — destinationPath without leading slash is NOT normalized (legacy)', async () => {
			const ctx = buildMockContext({
				resource: 'file',
				operation: 'copy',
				typeVersion: 1,
				params: {
					sourcePath: '/source-bucket/file.txt',
					destinationPath: 'dest-bucket/file.txt',
					additionalFields: {},
				},
			});

			const mockSOAP = setupCopyMock(ctx);

			const node = new S3();
			await node.execute.call(ctx);

			// With v1, no leading slash means destinationParts[1] is 'dest-bucket'... but split('/')
			// on 'dest-bucket/file.txt' gives ['dest-bucket', 'file.txt'], so [1] is 'file.txt'.
			// The GET location call should receive the wrong bucket name.
			const getLocationCall = mockSOAP.mock.calls[0];
			expect(getLocationCall[0]).toBe('file.txt'); // wrong bucket — legacy bug
		});

		it('v1.1 — destinationPath without leading slash is normalized correctly', async () => {
			const ctx = buildMockContext({
				resource: 'file',
				operation: 'copy',
				typeVersion: 1.1,
				params: {
					sourcePath: '/source-bucket/file.txt',
					destinationPath: 'dest-bucket/file.txt',
					additionalFields: {},
				},
			});

			const mockSOAP = setupCopyMock(ctx);

			const node = new S3();
			await node.execute.call(ctx);

			const getLocationCall = mockSOAP.mock.calls[0];
			expect(getLocationCall[0]).toBe('dest-bucket'); // correct bucket after normalization
		});

		it('v1.1 — destinationPath with leading slash works unchanged', async () => {
			const ctx = buildMockContext({
				resource: 'file',
				operation: 'copy',
				typeVersion: 1.1,
				params: {
					sourcePath: '/source-bucket/file.txt',
					destinationPath: '/dest-bucket/file.txt',
					additionalFields: {},
				},
			});

			const mockSOAP = setupCopyMock(ctx);

			const node = new S3();
			await node.execute.call(ctx);

			const getLocationCall = mockSOAP.mock.calls[0];
			expect(getLocationCall[0]).toBe('dest-bucket');
		});
	});
});
