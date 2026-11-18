import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { IBinaryData, IExecuteFunctions, INode } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import type * as _importType0 from '../../GenericFunctions';
import { Pushbullet } from '../../Pushbullet.node';

vi.mock('../../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../../GenericFunctions')),
	pushbulletApiRequest: vi.fn(async () => ({
		upload_url: 'https://upload.example.test',
		file_name: 'uploaded.txt',
		file_type: 'text/plain',
		file_url: 'https://files.example.test/uploaded.txt',
	})),
}));

describe('Pushbullet node', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let pushbullet: Pushbullet;

	const items = [
		{
			json: { field: 'data' },
			binary: { data: {} as IBinaryData },
		},
		{
			json: { field: 'attachment' },
			binary: { attachment: {} as IBinaryData },
		},
	];

	const mockNode: INode = {
		id: 'test-node-id',
		name: 'Pushbullet Test',
		type: 'n8n-nodes-base.pushbullet',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockExecuteFunctions = mock<IExecuteFunctions>();
		pushbullet = new Pushbullet();

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(parameterName: string, itemIndex = 0) => {
				const parameters: Record<string, unknown> = {
					resource: 'push',
					operation: 'create',
					type: 'file',
					body: 'File upload',
					target: 'default',
				};

				if (parameterName === 'binaryPropertyName') {
					return itemIndex === 0 ? 'data' : 'attachment';
				}

				return parameters[parameterName];
			},
		);

		mockExecuteFunctions.helpers.assertBinaryData = vi.fn((itemIndex, binaryPropertyName) => {
			const expectedPropertyName = itemIndex === 0 ? 'data' : 'attachment';
			if (binaryPropertyName !== expectedPropertyName) {
				throw new Error(`Unexpected binary field ${binaryPropertyName} for item ${itemIndex}`);
			}

			return {
				data: 'base64data',
				mimeType: 'text/plain',
				fileName: `file-${itemIndex}.txt`,
			} as IBinaryData;
		});
		mockExecuteFunctions.helpers.getBinaryDataBuffer = vi.fn(async () => Buffer.from('file'));
		mockExecuteFunctions.helpers.returnJsonArray = vi.fn((data) => [data]) as any;
		mockExecuteFunctions.helpers.constructExecutionMetaData = vi.fn((data) => data) as any;
	});

	it('should read the binary field name from each input item when uploading files', async () => {
		await pushbullet.execute.call(mockExecuteFunctions);

		expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenNthCalledWith(1, 0, 'data');
		expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenNthCalledWith(
			2,
			1,
			'attachment',
		);
		expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenNthCalledWith(
			1,
			0,
			'data',
		);
		expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenNthCalledWith(
			2,
			1,
			'attachment',
		);
		expect(genericFunctions.pushbulletApiRequest).toHaveBeenCalledTimes(6);
	});
});
