import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/message/delete.operation';

describe('Microsoft Outlook V2 - message:delete', () => {
	it('should encode the message ID as one path segment', async () => {
		const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) =>
			name === 'messageId' ? 'AAMkAGI2/mailFolders?x=1' : undefined,
		);
		mockExecuteFunctions.getCredentials.mockResolvedValue({});
		mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({});
		mockExecuteFunctions.helpers.returnJsonArray.mockReturnValue([]);

		await execute.call(mockExecuteFunctions, 0);

		expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'microsoftOutlookOAuth2Api',
			expect.objectContaining({
				method: 'DELETE',
				uri: requestUrl`https://graph.microsoft.com/v1.0/me/messages/AAMkAGI2%2FmailFolders%3Fx=1`,
			}),
		);
	});
});
