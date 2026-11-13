import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { twistApiRequest } from '../GenericFunctions';

describe('twistApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestOAuth2.mockResolvedValue({});

		const name = 'channels/remove?x=1';
		await twistApiRequest.call(context, 'GET', requestPath`/${name}`);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'twistOAuth2Api',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.twist.com/api/v3/channels%2Fremove%3Fx=1',
				}),
			}),
		);
	});
});
