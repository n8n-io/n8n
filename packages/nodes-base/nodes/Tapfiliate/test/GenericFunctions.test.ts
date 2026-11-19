import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { tapfiliateApiRequest } from '../GenericFunctions';

describe('tapfiliateApiRequest', () => {
	it('should encode a path value as one segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key' });
		context.helpers.request.mockResolvedValue({});

		const affiliateId = 'nathan/programs?x=1';
		await tapfiliateApiRequest.call(context, 'GET', requestPath`/affiliates/${affiliateId}/`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.tapfiliate.com/1.6/affiliates/nathan%2Fprograms%3Fx=1/',
				}),
			}),
		);
	});
});
