import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { S3 } from '../S3.node';

describe('S3 Node - Bucket Delete', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	const s3ApiRequestSOAPSpy = jest.spyOn(GenericFunctions, 's3ApiRequestSOAP');
	let node: S3;

	beforeEach(() => {
		jest.resetAllMocks();
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
