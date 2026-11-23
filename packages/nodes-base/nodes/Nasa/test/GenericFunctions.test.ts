import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { nasaApiRequest } from '../GenericFunctions';

describe('nasaApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ api_key: 'fake-api-key' });
		context.helpers.request.mockResolvedValue({});

		const asteroidId = '3542519/browse';
		await nasaApiRequest.call(context, 'GET', requestPath`/neo/rest/v1/neo/${asteroidId}`, {});

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.nasa.gov/neo/rest/v1/neo/3542519%2Fbrowse',
				}),
			}),
		);
	});
});
