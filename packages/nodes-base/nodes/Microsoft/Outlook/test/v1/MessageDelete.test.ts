import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

import { MicrosoftOutlookV1 } from '../../v1/MicrosoftOutlookV1.node';

describe('Microsoft Outlook V1 - message:delete', () => {
	it('should encode the message ID as one path segment', async () => {
		const node = new MicrosoftOutlookV1({
			displayName: 'Microsoft Outlook',
			name: 'microsoftOutlook',
			group: ['transform'],
			description: 'Consume Microsoft Outlook API',
		});
		const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => {
			const params: Record<string, string> = {
				resource: 'message',
				operation: 'delete',
				messageId: 'AAMkAGI2/mailFolders?x=1',
			};
			return params[name];
		});
		mockExecuteFunctions.getCredentials.mockResolvedValue({});
		mockExecuteFunctions.helpers.requestOAuth2.mockResolvedValue({});
		mockExecuteFunctions.helpers.returnJsonArray.mockReturnValue([]);

		await node.execute.call(mockExecuteFunctions);

		expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
			'microsoftOutlookOAuth2Api',
			expect.objectContaining({
				method: 'DELETE',
				uri: requestUrl`https://graph.microsoft.com/v1.0/me/messages/AAMkAGI2%2FmailFolders%3Fx=1`,
			}),
		);
	});
});
