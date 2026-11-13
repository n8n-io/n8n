import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath, requestUrl } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { posthogApiRequest } from '../GenericFunctions';

describe('posthogApiRequest', () => {
	it('should append the path to the URL from the credentials', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			url: 'https://posthog.example.com/eu/',
			apiKey: 'key',
		});
		context.helpers.request.mockResolvedValue({});

		await posthogApiRequest.call(context, 'POST', requestPath`/batch`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({ url: requestUrl`https://posthog.example.com/eu/batch` }),
		);
	});
});
