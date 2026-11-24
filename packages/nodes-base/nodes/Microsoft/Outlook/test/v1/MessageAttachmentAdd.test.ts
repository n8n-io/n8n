import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { MicrosoftOutlookV1 } from '../../v1/MicrosoftOutlookV1.node';

describe('Microsoft Outlook V1 - messageAttachment:add', () => {
	it('should read the binary property name from the current item', async () => {
		const node = new MicrosoftOutlookV1({
			displayName: 'Microsoft Outlook',
			name: 'microsoftOutlook',
			group: ['transform'],
			description: 'Consume Microsoft Outlook API',
		});
		const items: INodeExecutionData[] = [
			{
				json: {},
				binary: { data: { data: 'SGVsbG8=', mimeType: 'text/plain', fileName: 'first.txt' } },
			},
			{
				json: {},
				binary: {
					attachment: { data: 'V29ybGQ=', mimeType: 'text/plain', fileName: 'second.txt' },
				},
			},
		];
		const binaryPropertyNames = ['data', 'attachment'];
		const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((name: string, itemIndex: number) => {
			const params: Record<string, string | object> = {
				resource: 'messageAttachment',
				operation: 'add',
				messageId: 'AAMkAGI2TG93AAA=',
				binaryPropertyName: binaryPropertyNames[itemIndex],
				additionalFields: {},
			};
			return params[name];
		});
		mockExecuteFunctions.getCredentials.mockResolvedValue({});
		mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(Buffer.from('content'));
		mockExecuteFunctions.helpers.requestOAuth2.mockResolvedValue({});
		mockExecuteFunctions.helpers.returnJsonArray.mockReturnValue([]);

		await expect(node.execute.call(mockExecuteFunctions)).resolves.not.toThrow();

		expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledTimes(2);
		expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenNthCalledWith(1, 0, 'data');
		expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenNthCalledWith(
			2,
			1,
			'attachment',
		);
	});
});
