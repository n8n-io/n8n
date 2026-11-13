import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { hunterApiRequest } from '../GenericFunctions';

describe('hunterApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key' });
		context.helpers.request.mockResolvedValue({});

		await hunterApiRequest.call(context, 'GET', requestPath`/leads/${'42/x?y=1'}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({ value: 'https://api.hunter.io/v2/leads/42%2Fx%3Fy=1' }),
			}),
		);
	});
});
