import { mockDeep } from 'vitest-mock-extended';
import type { IHookFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { surveyMonkeyApiRequest } from '../GenericFunctions';

describe('surveyMonkeyApiRequest', () => {
	it('should encode a path value as one segment', async () => {
		const context = mockDeep<IHookFunctions>();
		context.getNodeParameter.mockReturnValue('accessToken');
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-access-token' });
		context.helpers.request.mockResolvedValue({});

		const webhookId = '7230712/surveys?x=1';
		await surveyMonkeyApiRequest.call(context, 'DELETE', requestPath`/webhooks/${webhookId}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.surveymonkey.com/v3/webhooks/7230712%2Fsurveys%3Fx=1',
				}),
			}),
		);
	});
});
