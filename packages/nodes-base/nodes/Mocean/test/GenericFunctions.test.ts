import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { moceanApiRequest } from '../GenericFunctions';

describe('moceanApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			'mocean-api-key': 'fake-key',
			'mocean-api-secret': 'fake-secret',
		});
		context.helpers.request.mockResolvedValue({ messages: [] });

		const resource = 'sms/report?x=1';
		await moceanApiRequest.call(context, 'POST', requestPath`/rest/2/${resource}`, {});

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://rest.moceanapi.com/rest/2/sms%2Freport%3Fx=1',
				}),
			}),
		);
	});
});
