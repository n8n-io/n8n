import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath, requestUrl } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { profitWellApiRequest } from '../GenericFunctions';

describe('profitWellApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ accessToken: 'token' });
		context.helpers.request.mockResolvedValue({});

		await profitWellApiRequest.call(context, 'GET', requestPath`/metrics/${'daily/plans'}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: requestUrl`https://api.profitwell.com/v2/metrics/daily%2Fplans`,
			}),
		);
	});
});
