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

describe('S3 Node - Get Presigned URL', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	let node: S3;

	beforeEach(() => {
		vi.resetAllMocks();
		node = new S3();

		executeFunctionsMock.getCredentials.mockResolvedValue({
			endpoint: 'https://s3.amazonaws.com',
			accessKeyId: 'test-access-key',
			secretAccessKey: 'test-secret-key',
			region: 'us-east-1',
			forcePathStyle: false,
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

	it('should generate a presigned URL with default expiry', async () => {
		executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
			switch (paramName) {
				case 'resource':
					return 'file';
				case 'operation':
					return 'getPresignedUrl';
				case 'bucketName':
					return 'my-bucket';
				case 'fileKey':
					return 'my-file.txt';
				case 'additionalFields':
					return { expires: 3600 };
				default:
					return undefined;
			}
		});

		const result = await node.execute.call(executeFunctionsMock);

		expect(result[0][0].json).toHaveProperty('url');
		expect(result[0][0].json.url).toContain('my-bucket.s3.amazonaws.com/my-file.txt');
		expect(result[0][0].json.url).toContain('X-Amz-Expires=3600');
		expect(result[0][0].json.url).toContain('X-Amz-Signature=');
	});

	it('should generate a presigned URL with custom expiry', async () => {
		executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
			switch (paramName) {
				case 'resource':
					return 'file';
				case 'operation':
					return 'getPresignedUrl';
				case 'bucketName':
					return 'my-bucket';
				case 'fileKey':
					return 'my-file.txt';
				case 'additionalFields':
					return { expires: 86400 };
				default:
					return undefined;
			}
		});

		const result = await node.execute.call(executeFunctionsMock);

		expect(result[0][0].json.url).toContain('X-Amz-Expires=86400');
	});

	it('should handle forcePathStyle correctly', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({
			endpoint: 'https://minio.local',
			accessKeyId: 'test-access-key',
			secretAccessKey: 'test-secret-key',
			region: 'us-east-1',
			forcePathStyle: true,
		});

		executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
			switch (paramName) {
				case 'resource':
					return 'file';
				case 'operation':
					return 'getPresignedUrl';
				case 'bucketName':
					return 'my-bucket';
				case 'fileKey':
					return 'my-file.txt';
				case 'additionalFields':
					return { expires: 3600 };
				default:
					return undefined;
			}
		});

		const result = await node.execute.call(executeFunctionsMock);

		expect(result[0][0].json.url).toContain('minio.local/my-bucket/my-file.txt');
	});

	it('should correctly format bucket with dots', async () => {
		executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
			switch (paramName) {
				case 'resource':
					return 'file';
				case 'operation':
					return 'getPresignedUrl';
				case 'bucketName':
					return 'my.test.bucket';
				case 'fileKey':
					return 'my-file.txt';
				case 'additionalFields':
					return { expires: 3600 };
				default:
					return undefined;
			}
		});
		const result = await node.execute.call(executeFunctionsMock);
		console.log(result);
		expect(result[0][0].json.url).toContain('my.test.bucket.s3.amazonaws.com');
	});

	it('should throw an error if credentials are missing', async () => {
		executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
			switch (paramName) {
				case 'resource':
					return 'file';
				case 'operation':
					return 'getPresignedUrl';
				case 'bucketName':
					return 'my-bucket';
				case 'fileKey':
					return 'my-file.txt';
				case 'additionalFields':
					return { expires: 3600 };
				default:
					return undefined;
			}
		});
		executeFunctionsMock.getCredentials.mockRejectedValue(new Error('Credentials missing'));
		await expect(node.execute.call(executeFunctionsMock)).rejects.toThrow('Credentials missing');
	});
});
