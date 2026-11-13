import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { goToWebinarApiRequest } from '../GenericFunctions';

describe('goToWebinarApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('get');
		context.helpers.requestOAuth2.mockResolvedValue('{}');

		const webinarKey = '2913487560192837/registrants?x=1';
		await goToWebinarApiRequest.call(
			context,
			'GET',
			requestPath`organizers/7023481655/webinars/${webinarKey}`,
			{},
			{},
		);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'goToWebinarOAuth2Api',
			expect.objectContaining({
				uri: expect.objectContaining({
					value:
						'https://api.getgo.com/G2W/rest/v2/organizers/7023481655/webinars/2913487560192837%2Fregistrants%3Fx=1',
				}),
			}),
			{ tokenExpiredStatusCode: 403 },
		);
	});
});
