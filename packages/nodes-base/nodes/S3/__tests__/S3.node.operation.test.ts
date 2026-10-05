import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { S3 } from '../S3.node';
import type { MockInstance } from 'vitest';

describe('S3 Node - Bucket Delete', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	let s3ApiRequestSOAPSpy: MockInstance;
	let node: S3;

	beforeEach(() => {
		vi.resetAllMocks();
		s3ApiRequestSOAPSpy = vi.spyOn(GenericFunctions, 's3ApiRequestSOAP');
		node = new S3();

		executeFunctionsMock.getCredentials.mockResolvedValue({
			endpoint: 'https://s3.amazonaws.com',
			accessKeyId: 'test-key',
			secretAccessKey: 'test-secret',
			region: 'us-east-1',
		});

		executeFunctionsMock.getNode.mockReturnValue({ typeVersion: 1 } as INode);
		executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctionsMock.continueOnFail.mockReturnValue(false);

		executeFunctionsMock.helpers.returnJsonArray.mockImplementation((data) =>
			Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }],
		);
		executeFunctionsMock.helpers.constructExecutionMetaData.mockImplementation(
			(data) => data as any,
		);
	});

	it('should issue a DELETE request to the bucket and return success', async () => {
		executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
			switch (paramName) {
				case 'resource':
					return 'bucket';
				case 'operation':
					return 'delete';
				case 'name':
					return 'test-bucket';
				default:
					return undefined;
			}
		});

		s3ApiRequestSOAPSpy.mockResolvedValueOnce({});

		const result = await node.execute.call(executeFunctionsMock);

		expect(s3ApiRequestSOAPSpy).toHaveBeenCalledTimes(1);
		expect(s3ApiRequestSOAPSpy).toHaveBeenCalledWith('test-bucket', 'DELETE', '', '', {}, {});

		expect(result).toEqual([[{ json: { success: true } }]]);
	});

	it('should propagate API errors when continueOnFail is false', async () => {
		executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
			switch (paramName) {
				case 'resource':
					return 'bucket';
				case 'operation':
					return 'delete';
				case 'name':
					return 'test-bucket';
				default:
					return undefined;
			}
		});

		s3ApiRequestSOAPSpy.mockRejectedValueOnce(new Error('BucketNotEmpty'));

		await expect(node.execute.call(executeFunctionsMock)).rejects.toThrow('BucketNotEmpty');
	});

	it('should return error item when continueOnFail is true', async () => {
		executeFunctionsMock.continueOnFail.mockReturnValue(true);
		executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
			switch (paramName) {
				case 'resource':
					return 'bucket';
				case 'operation':
					return 'delete';
				case 'name':
					return 'test-bucket';
				default:
					return undefined;
			}
		});

		s3ApiRequestSOAPSpy.mockRejectedValueOnce(new Error('BucketNotEmpty'));

		const result = await node.execute.call(executeFunctionsMock);

		expect(result).toEqual([[{ json: { error: 'BucketNotEmpty' } }]]);
	});
});

describe('S3 Node - File Copy', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	let s3ApiRequestSOAPSpy: MockInstance;
	let node: S3;

	const copyWithSource = (sourcePath: string) => {
		executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
			switch (paramName) {
				case 'resource':
					return 'file';
				case 'operation':
					return 'copy';
				case 'sourcePath':
					return sourcePath;
				case 'destinationPath':
					return '/test-bucket/backup/index.txt';
				case 'additionalFields':
					return {};
				default:
					return undefined;
			}
		});
	};

	const copySourceHeader = () =>
		s3ApiRequestSOAPSpy.mock.calls[1][5]['x-amz-copy-source'] as string;

	beforeEach(() => {
		vi.resetAllMocks();
		s3ApiRequestSOAPSpy = vi.spyOn(GenericFunctions, 's3ApiRequestSOAP');
		node = new S3();

		executeFunctionsMock.getCredentials.mockResolvedValue({
			endpoint: 'https://s3.amazonaws.com',
			accessKeyId: 'test-key',
			secretAccessKey: 'test-secret',
			region: 'us-east-1',
		});
		executeFunctionsMock.getNode.mockReturnValue({ typeVersion: 1 } as INode);
		executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctionsMock.continueOnFail.mockReturnValue(false);
		executeFunctionsMock.helpers.returnJsonArray.mockImplementation((data) =>
			Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }],
		);
		executeFunctionsMock.helpers.constructExecutionMetaData.mockImplementation(
			(data) => data as any,
		);

		s3ApiRequestSOAPSpy
			.mockResolvedValueOnce({ LocationConstraint: { _: 'us-east-1' } })
			.mockResolvedValueOnce({ CopyObjectResult: {} });
	});

	// An HTTP header cannot carry a non-ASCII byte. The signature is computed over
	// the value we set, so if the client rewrites it on the way out, S3 sees a
	// different path and answers SignatureDoesNotMatch.
	it.each([
		[
			'Chinese characters',
			'/test-bucket/workflow/同程商旅/index.txt',
			'/test-bucket/workflow/%E5%90%8C%E7%A8%8B%E5%95%86%E6%97%85/index.txt',
		],
		['an accented name', '/test-bucket/résumé.pdf', '/test-bucket/r%C3%A9sum%C3%A9.pdf'],
		['a space', '/test-bucket/my report.pdf', '/test-bucket/my%20report.pdf'],
	])('percent-encodes the copy source for %s', async (_name, sourcePath, expected) => {
		copyWithSource(sourcePath);

		await node.execute.call(executeFunctionsMock);

		expect(copySourceHeader()).toBe(expected);
	});

	it('leaves an all-ASCII source path byte-identical', async () => {
		copyWithSource('/test-bucket/workflow/index.txt');

		await node.execute.call(executeFunctionsMock);

		expect(copySourceHeader()).toBe('/test-bucket/workflow/index.txt');
	});

	it('does not double-encode a source path the user already encoded', async () => {
		copyWithSource('/test-bucket/my%20report.pdf');

		await node.execute.call(executeFunctionsMock);

		expect(copySourceHeader()).toBe('/test-bucket/my%20report.pdf');
	});
});
