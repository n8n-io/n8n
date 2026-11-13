import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { philipsHueApiRequest } from '../GenericFunctions';

describe('philipsHueApiRequest', () => {
	it('should encode path values in the request URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestOAuth2.mockResolvedValue({});

		const lightId = '1/state?x=1';
		await philipsHueApiRequest.call(
			context,
			'GET',
			requestPath`/api/pAtwdCV8NZId25Gk/lights/${lightId}`,
		);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'philipsHueOAuth2Api',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.meethue.com/route/api/pAtwdCV8NZId25Gk/lights/1%2Fstate%3Fx=1',
				}),
			}),
			{ tokenType: 'Bearer' },
		);
	});
});
