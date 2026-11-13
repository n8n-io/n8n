import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { humanticAiApiRequest } from '../GenericFunctions';

describe('humanticAiApiRequest', () => {
	it('should encode path values in the request URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key' });
		context.helpers.request.mockResolvedValue({});

		const segment = 'create/x?y=1';
		await humanticAiApiRequest.call(context, 'GET', requestPath`/user-profile/${segment}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.humantic.ai/v1/user-profile/create%2Fx%3Fy=1',
				}),
			}),
		);
	});
});
