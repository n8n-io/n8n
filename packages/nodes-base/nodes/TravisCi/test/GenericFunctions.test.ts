import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { travisciApiRequest } from '../GenericFunctions';

describe('travisciApiRequest', () => {
	it('should encode path values as one segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ apiToken: 'fake-api-token' });
		context.helpers.request.mockResolvedValue({});

		const buildId = '86549912/restart?x=1';
		await travisciApiRequest.call(context, 'GET', requestPath`/build/${buildId}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.travis-ci.com/build/86549912%2Frestart%3Fx=1',
				}),
			}),
		);
	});
});
